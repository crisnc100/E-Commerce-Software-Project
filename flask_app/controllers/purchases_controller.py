from flask import redirect, request, session, jsonify, render_template
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.purchases_model import Purchase
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
import requests
from flask_app.utils.session_helper import SessionHelper
from paypalrestsdk import configure, Payment
from flask_app.models.products_model import Product
from flask_app.models.systems_model import System


from paypalrestsdk import configure, Payment


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

    # Check for required fields
    required_fields = ['client_id', 'product_id', 'size', 'amount']
    missing_fields = [f for f in required_fields if f not in data or not data[f]]
    if missing_fields:
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    # Validate amount
    try:
        data['amount'] = float(data['amount'])
        if data['amount'] <= 0:
            return jsonify({"error": "Amount must be greater than 0"}), 400
    except ValueError:
        return jsonify({"error": "Invalid amount format"}), 400

    # Default fields
    data['purchase_date'] = data.get('purchase_date', datetime.now().strftime('%Y-%m-%d'))
    data['payment_status'] = 'Pending'
    data['shipping_status'] = 'Pending'
    # Retrieve system_id from the session or data
    data['system_id'] = SessionHelper.get_system_id()

    # Save purchase row
    try:
        purchase_id = Purchase.save(data)
        return jsonify({
            "message": "Purchase created successfully",
            "purchase_id": purchase_id,
        }), 201
    except Exception as e:
        print(f"Error saving purchase: {str(e)}")
        return jsonify({"error": "Failed to save purchase"}), 500



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
        # Retrieve overdue purchases from the model
        purchases = Purchase.get_overdue_purchases()
        
        # Serialize the purchases for JSON response
        serialized_purchases = [purchase.serialize() for purchase in purchases]

        # Return the serialized data with a success response
        return jsonify(serialized_purchases), 200
    except Exception as e:
        # Handle errors gracefully
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







    







