from flask import redirect, request, session, jsonify, render_template
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.purchases_model import Purchase
from flask_app.models.purchase_items_model import PurchaseItems
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import requests
from flask_app.utils.session_helper import SessionHelper
from paypalrestsdk import configure, Payment
from flask_app.models.products_model import Product
from flask_app.models.systems_model import System


@app.route("/payment-success", methods=["GET"])
def payment_success():
    order_id = request.args.get("token")  # Use "token" for the PayPal order ID

    if not order_id:
        # If missing, show error or handle gracefully
        return render_template("payment_error.html", message="Missing PayPal order ID"), 400

    # Render the "please wait" page 
    # passing the order ID so the JavaScript can call /execute-payment
    return render_template("please_wait.html", order_id=order_id)



@app.route('/payment-cancel')
def payment_cancel():
    return render_template('payment_cancel.html')


def generate_paypal_link(client_id, product_id, amount, system_id, purchase_id_val):
    try:
        # (1) Fetch client, product, and system info
        client = Client.get_by_id(client_id)
        product = Product.get_by_id(product_id)
        system = System.get_system_by_id(system_id)
        if not system or not system.paypal_client_id or not system.paypal_secret:
            raise Exception("PayPal credentials are missing for this system.")

        paypal_client_id = System.decrypt_data(system.paypal_client_id)
        paypal_secret = System.decrypt_data(system.paypal_secret)

        # (2) Get access token from PayPal
        token_response = requests.post(
            'https://api-m.paypal.com/v1/oauth2/token',
            auth=(paypal_client_id, paypal_secret),
            headers={'Accept': 'application/json'},
            data={'grant_type': 'client_credentials'}
        )
        if token_response.status_code != 200:
            raise Exception(f"Failed to get PayPal access token: {token_response.json()}")

        access_token = token_response.json().get('access_token')
        if not access_token:
            raise Exception("Access token not found in PayPal response.")

        # (3) Create PayPal order
        order_payload = {
            "intent": "CAPTURE",
            "application_context": {
                "brand_name": "Sophie and Mollies",
                "landing_page": "BILLING",
                "shipping_preference": "NO_SHIPPING",
                "user_action": "PAY_NOW",
                "return_url": "https://mariaortegas-project.onrender.com/payment-success",
                "cancel_url": "https://mariaortegas-project.onrender.com/payment-cancel"
            },
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": "USD",
                        "value": f"{amount:.2f}"
                    },
                    "description": f"{product.name} - Purchased by {client.first_name} {client.last_name}",
                    "invoice_id": str(purchase_id_val)
                }
            ]
        }

        order_response = requests.post(
            'https://api-m.paypal.com/v2/checkout/orders',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            },
            json=order_payload
        )
        if order_response.status_code != 201:
            raise Exception(f"Failed to create PayPal order: {order_response.json()}")

        order_data = order_response.json()

        # (4) Extract approval URL and Order ID
        approval_url = next(
            (link['href'] for link in order_data.get('links', []) if link['rel'] == 'approve'),
            None
        )
        order_id = order_data.get('id')

        if not approval_url or not order_id:
            raise Exception("Approval URL or Order ID not found in PayPal response.")

        # (5) Return approval URL and Order ID
        return approval_url, order_id

    except Exception as e:
        print(f"Error generating PayPal link: {e}")
        raise




@app.route('/api/create_purchase', methods=['POST'])
def create_purchase():
    data = request.get_json() or {}

    # Check if this is a single or multiple-item order
    is_multiple = 'items' in data and isinstance(data['items'], list) and len(data['items']) > 0

    # Retrieve system_id from the session
    data['system_id'] = SessionHelper.get_system_id()

    if is_multiple:
        # Multiple-item order
        return create_multiple_items_purchase(data)
    else:
        # Single-item order
        return create_single_item_purchase(data)


def create_single_item_purchase(data):
    """Handles single-item purchase creation."""
    # Validate fields
    required_fields = ['client_id', 'product_id', 'size', 'amount']
    missing_fields = [f for f in required_fields if f not in data or not data[f]]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    # Create parent purchase
    purchase_data = {
        'client_id': data['client_id'],
        'system_id': SessionHelper.get_system_id(),
        'purchase_date': data.get('purchase_date', datetime.now().strftime('%Y-%m-%d')),
        'amount': float(data['amount']),
        'payment_status': 'Pending',
        'shipping_status': 'Pending',
    }
    try:
        purchase_id = Purchase.save(purchase_data)
    except Exception as e:
        print(f"Error saving single purchase: {str(e)}")
        return jsonify({"error": "Failed to save purchase"}), 500

    # Create purchase item
    item_data = {
        'purchase_id': purchase_id,
        'product_id': data['product_id'],
        'size': data['size'],
        'quantity': 1,  # Default for single order
        'price_per_item': data['amount'],
    }
    try:
        PurchaseItems.save(item_data)
        return jsonify({
            "message": "Single-item purchase created successfully",
            "purchase_id": purchase_id,
        }), 201
    except Exception as e:
        print(f"Error saving purchase item: {str(e)}")
        return jsonify({"error": "Failed to save purchase item"}), 500



def create_multiple_items_purchase(data):
    """Handles multiple-item purchase creation."""
    # Validate `items` array
    if not data['items'] or not isinstance(data['items'], list):
        return jsonify({"error": "Invalid items list"}), 400

    # Validate each item in the `items` array
    for item in data['items']:
        required_item_fields = ['product_id', 'size', 'quantity', 'price_per_item']
        missing_item_fields = [f for f in required_item_fields if f not in item or not item[f]]
        if missing_item_fields:
            return jsonify({
                "error": f"Missing required fields in an item: {', '.join(missing_item_fields)}"
            }), 400

    # Create a purchase in the `purchases` table
    purchase_data = {
        'client_id': data['client_id'],
        'system_id': data['system_id'],
        'purchase_date': data.get('purchase_date', datetime.now().strftime('%Y-%m-%d')),
        'payment_status': 'Pending',
        'shipping_status': 'Pending',
        'amount': float(data['amount']),  # <--- use user input
    }
    try:
        purchase_id = Purchase.save(purchase_data)
    except Exception as e:
        print(f"Error saving purchase for multiple items: {str(e)}")
        return jsonify({"error": "Failed to save purchase"}), 500

    # Add items to the `purchase_items` table
    try:
        for item in data['items']:
            item_data = {
                'purchase_id': purchase_id,
                'product_id': item['product_id'],
                'size': item['size'],
                'quantity': item['quantity'],
                'price_per_item': item['price_per_item'],
            }
            PurchaseItems.save(item_data)

        return jsonify({
            "message": "Multiple-item purchase created successfully",
            "purchase_id": purchase_id,
        }), 201
    except Exception as e:
        print(f"Error saving purchase items: {str(e)}")
        return jsonify({"error": "Failed to save purchase items"}), 500


@app.route('/api/add_purchase_item', methods=['POST'])
def add_purchase_item():
    data = request.json
    # Validate data fields
    required_fields = ['purchase_id', 'product_id', 'size', 'quantity', 'price_per_item']
    missing = [f for f in required_fields if f not in data or data[f] is None]
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    # 1) Insert a row in purchase_items
    new_item_id = PurchaseItems.save({
        'purchase_id': data['purchase_id'],
        'product_id': data['product_id'],
        'size': data['size'],
        'quantity': data['quantity'],
        'price_per_item': data['price_per_item'],
    })

    # 2) Fetch the existing purchase
    purchase = Purchase.get_by_id(data['purchase_id'])
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    # 3) Calculate the new total
    old_total = float(purchase.amount)  # assuming `purchase.amount` is numeric
    add_amount = float(data['quantity']) * float(data['price_per_item'])
    new_total = old_total + add_amount

    # 4) Update the purchase with the new total
    Purchase.update_purchase_amount(data['purchase_id'], new_total)

    # 5) Return success
    return jsonify({
        "message": "Item added and purchase amount updated.",
        "item_id": new_item_id,
        "new_total": new_total
    }), 201




@app.route('/api/regenerate_paypal_link/<int:purchase_id>', methods=['PUT', 'POST'])
def regenerate_paypal_link(purchase_id):
    try:
        # Fetch purchase details
        purchase = Purchase.get_by_id(purchase_id)
        if not purchase:
            return jsonify({"error": "Purchase not found"}), 404

        # Debugging purchase object
        print(f"Purchase object: {purchase}")

        # Extract necessary details using attribute access
        client_id = purchase.client_id
        product_id = purchase.product_id
        amount = purchase.amount
        system_id = purchase.system_id

        # Regenerate PayPal link
        (paypal_approval_url, paypal_order_id) = generate_paypal_link(
            client_id=client_id,
            product_id=product_id,
            amount=amount,
            system_id=system_id,  # Pass the correct system_id here
            purchase_id_val=purchase_id
        )

        # Update database with new PayPal details
        Purchase.update_paypal_order_id(purchase_id, paypal_order_id)
        Purchase.update_paypal_link(purchase_id, paypal_approval_url)

        return jsonify({
            "message": "New PayPal link generated",
            "purchase_id": purchase_id,
            "paypal_link": paypal_approval_url,
            "paypal_order_id": paypal_order_id
        }), 200

    except Exception as e:
        print(f"Error regenerating PayPal link: {e}")
        return jsonify({"error": "Failed to regenerate PayPal link"}), 500



@app.route('/api/get_paypal_link/<int:purchase_id>', methods=['GET'])
def get_paypal_link(purchase_id):
    try:
        # Fetch PayPal link from database
        paypal_data = Purchase.get_paypal_link(purchase_id)
        if not paypal_data or not paypal_data['paypal_link']:
            return jsonify({"error": "No PayPal link found for the specified purchase"}), 404

        return jsonify({
            "paypal_link": paypal_data['paypal_link']
        }), 200

    except Exception as e:
        print(f"Error retrieving PayPal link: {str(e)}")
        return jsonify({"error": "Failed to retrieve PayPal link"}), 500





# READ All Purchases
@app.route('/api/get_all_purchases', methods=['GET'])
def get_all_purchases():
    purchases = Purchase.get_all()
    return jsonify([purchase.serialize() for purchase in purchases]), 200


@app.route('/api/get_overdue_purchases', methods=['GET'])
def get_overdue_purchases():
    try:
        # Retrieve the system_id from the session
        system_id = SessionHelper.get_system_id()
        if not system_id:
            return jsonify({"error": "system_id is required"}), 400
        
        # Fetch overdue purchases with items
        purchases = Purchase.get_overdue_purchases_with_items(system_id)
        
        # Serialize the purchases for JSON response
        serialized_purchases = [purchase.serialize() for purchase in purchases]

        return jsonify(serialized_purchases), 200
    except Exception as e:
        print(f"Error retrieving overdue purchases: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



# READ Single Purchase by ID
@app.route('/api/get_one_purchase/<int:purchase_id>', methods=['GET'])
def get_one_purchase(purchase_id):
    purchase = Purchase.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404
    return jsonify(purchase.serialize()), 200




# UPDATE Purchase
@app.route('/api/update_purchase/<int:purchase_id>', methods=['PUT'])
def update_purchase(purchase_id):
    data = request.get_json()

    # Check if purchase exists
    purchase = Purchase.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    # Validate and format the purchase_date if it exists
    if 'purchase_date' in data:
        try:
            # Parse and reformat the date to YYYY-MM-DD
            formatted_date = datetime.strptime(data['purchase_date'], '%a, %d %b %Y %H:%M:%S %Z').strftime('%Y-%m-%d')
            data['purchase_date'] = formatted_date
        except ValueError:
            return jsonify({"error": "Invalid date format for purchase_date. Expected format: 'Tue, 19 Nov 2024 00:00:00 GMT'"}), 400

    data['id'] = purchase_id  # Ensure 'id' is in data if required by Purchase.update
    Purchase.update(data)
    return jsonify({"message": "Purchase updated"}), 200

@app.route('/api/update_purchase_status/<int:purchase_id>', methods=['PUT'])
def update_purchase_status(purchase_id):
    data = request.get_json()

    # Check if purchase exists
    purchase = Purchase.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    # Check if payment_status is in the payload
    if 'payment_status' in data:
        try:
            Purchase.update_payment_status(purchase_id, data['payment_status'])
            return jsonify({"message": "Payment status updated successfully"}), 200
        except Exception as e:
            return jsonify({"error": f"Something went wrong: {str(e)}"}), 500

    # If other fields are intended to be updated (not currently in use), raise an error or handle appropriately
    return jsonify({"error": "Invalid fields provided for update"}), 400




# DELETE Purchase
@app.route('/api/delete_purchase/<int:purchase_id>', methods=['DELETE'])
def delete_purchase(purchase_id):
    # Check if purchase exists
    purchase = Purchase.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    Purchase.delete(purchase_id)
    return jsonify({"message": "Purchase deleted"}), 200

@app.route('/api/update_purchase_item/<int:item_id>', methods=['PUT'])
def update_purchase_item(item_id):
    try:
        data = request.json
        # Add the item ID to the data payload
        data['id'] = item_id
        result = PurchaseItems.update(data)

        if result is False:
            return jsonify({"error": "Failed to update the purchase item"}), 400

        return jsonify({"message": "Purchase item updated successfully"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/delete_purchase_item/<int:item_id>', methods=['DELETE'])
def delete_purchase_item(item_id):
    try:
        result = PurchaseItems.delete(item_id)
        if result is False:
            return jsonify({"error": "Failed to delete the purchase item"}), 400
        return jsonify({"message": "Purchase item deleted successfully"}), 200
    except Exception as e:
        # Print or log the full error
        print("Error in delete_purchase_item:", e)  # <-- add this
        return jsonify({"error": str(e)}), 500



# GET Purchases by Client ID
@app.route('/api/get_purchases_by_client/<int:client_id>', methods=['GET'])
def get_purchases_by_client(client_id):
    try:
        purchases = Purchase.get_purchases_with_payments_by_client(client_id)
        serialized_purchases = [purchase.serialize() for purchase in purchases]
        return jsonify(serialized_purchases), 200
    except Exception as e:
        print(f"Something went wrong: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500






@app.route('/api/get_total_amount_by_client/<int:client_id>', methods=['GET'])
def get_total_amount_by_client(client_id):
    total_spent = Purchase.get_total_amount_by_client(client_id)
    return jsonify({'total_spent': total_spent}), 200



# UPDATE Payment Status
@app.route('/api/update_payment_status/<int:purchase_id>', methods=['PUT'])
def update_payment_status(purchase_id):
    new_status = request.json.get('payment_status')
    if new_status not in ['Paid', 'Pending', 'Overdue']:
        return jsonify({"error": "Invalid payment status"}), 400

    # Update payment status
    Purchase.update_payment_status(purchase_id, new_status)
    return jsonify({"message": "Payment status updated"}), 200


@app.route('/api/update_shipping_status/<int:purchase_id>', methods=['PUT'])
def update_shipping_status(purchase_id):

    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No JSON data received"}), 400

        new_status = data.get('shipping_status')
        if new_status not in ['Pending', 'Shipped', 'Delivered']:
            return jsonify({"error": "Invalid shipping status"}), 400

        Purchase.update_shipping_status(purchase_id, new_status)
        return jsonify({"message": "Shipping status updated"}), 200
    except Exception as e:
        print(f"Error parsing request: {e}")
        return jsonify({"error": "Invalid request format"}), 400
    
#Search Feature for Navbar:
@app.route('/api/all_purchases_for_client/<int:client_id>/page/<int:page>', methods=['GET'])
def all_purchases_for_client(client_id, page):
    try:
        purchases = Purchase.all_purchases_for_client(client_id, page)
        return jsonify(purchases)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

    
#Search Feature for Navbar:
@app.route('/api/all_purchases_for_product/<int:product_id>/page/<int:page>', methods=['GET'])
def all_purchases_for_product(product_id, page):
    try:
        data = Purchase.all_purchases_for_product(product_id, page)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/get_late_pending_deliveries', methods=['GET'])
def get_late_pending_deliveries():
    try:
        # Retrieve the system_id from the session
        system_id = SessionHelper.get_system_id()

        # Pass the system_id to check_for_pending_deliveries
        pending_deliveries = Purchase.check_for_pending_deliveries(system_id)

        # Serialize the results
        serialized_purchases = [purchase.serialize() for purchase in pending_deliveries]
        
        return jsonify({'pending_deliveries': serialized_purchases}), 200
    except Exception as e:
        print(f"Error fetching pending deliveries: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500







    







