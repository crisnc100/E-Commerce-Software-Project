from flask import redirect, request, session, jsonify, render_template
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.purchases_model import Purchase
from datetime import datetime, timedelta
from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from flask_app.utils.session_helper import SessionHelper
from paypalrestsdk import configure, Payment
from flask_app.models.products_model import Product
from flask_app.models.systems_model import System


from paypalrestsdk import configure, Payment


@app.route("/payment-success", methods=["GET"])
def payment_success():
    payment_id = request.args.get("paymentId")
    payer_id = request.args.get("PayerID")

    if not payment_id or not payer_id:
        # If missing, show error or handle gracefully
        return render_template("payment_error.html", message="Could not execute payment"), 400

    # Render the "please wait" page 
    # passing these values so the JS can call /execute-payment
    return render_template("please_wait.html", payment_id=payment_id, payer_id=payer_id)


@app.route('/payment-cancel')
def payment_cancel():
    return render_template('payment_cancel.html')


def generate_paypal_link(client_id, product_id, amount, system_id, purchase_id_val):
    try:
        # (1) Fetch client, product
        client = Client.get_by_id(client_id)
        product = Product.get_by_id(product_id)

        # (2) Fetch system creds
        system = System.get_system_by_id(system_id)
        if not system or not system.paypal_client_id or not system.paypal_secret:
            raise Exception("PayPal credentials are missing for this system.")

        # (3) Configure
        configure({
            "mode": "sandbox",  # or "live"
            "client_id": system.paypal_client_id,
            "client_secret": system.paypal_secret,
        })

        # (4) Build Payment Payload
        payment_payload = {
            "intent": "sale",
            "payer": {"payment_method": "paypal"},
            "transactions": [
                {
                    "amount": {"total": f"{amount:.2f}", "currency": "USD"},
                    "description": f"{product.name} - Purchased by {client.first_name} {client.last_name}",
                    "item_list": {
                        "items": [
                            {
                                "name": product.name,
                                "sku": f"product_{product_id}",
                                "price": f"{amount:.2f}",
                                "currency": "USD",
                                "quantity": 1
                            }
                        ]
                    },
                    "invoice_number": str(purchase_id_val),
                    "custom": str(system_id)
                }
            ],
            "redirect_urls": {
                "return_url": "https://mariaortegas-project.onrender.com/payment-success",
                "cancel_url": "https://mariaortegas-project.onrender.com/payment-cancel"
            }
        }

        # (5) Create Payment
        payment = Payment(payment_payload)
        if not payment.create():
            raise Exception(f"PayPal API error: {payment.error}")

        # (6) Extract approval URL
        approval_url = next(link.href for link in payment.links if link.rel == "approval_url")

        # (7) Return approval_url plus the payment object if needed
        return (approval_url, payment.id)

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
    # system_id from your session or data?
    data['system_id'] = SessionHelper.get_system_id()

    # 1) Save purchase row
    try:
        purchase_id = Purchase.save(data)
    except Exception as e:
        print(f"Error saving purchase: {str(e)}")
        return jsonify({"error": "Failed to save purchase"}), 500

    # 2) Generate PayPal link
    try:
        (paypal_approval_url, paypal_payment_id) = generate_paypal_link(
            client_id=data['client_id'],
            product_id=data['product_id'],
            amount=data['amount'],
            system_id=data['system_id'],  
            purchase_id_val=purchase_id
        )

        # 3) Store that payment.id in DB
        Purchase.update_paypal_payment_id(purchase_id, paypal_payment_id)

        # 4) Also store the approval link in `paypal_link` if you want
        Purchase.update_paypal_link(purchase_id, paypal_approval_url)

        return jsonify({
            "message": "Purchase created and PayPal link generated",
            "purchase_id": purchase_id,
            "paypal_link": paypal_approval_url,
            "paypal_payment_id": paypal_payment_id
        }), 201

    except Exception as e:
        print(f"Error generating PayPal link: {str(e)}")
        return jsonify({"error": "Purchase created, but failed to generate PayPal link"}), 500


@app.route('/api/regenerate_paypal_link/<int:purchase_id>', methods=['PUT', 'POST'])
def regenerate_paypal_link(purchase_id):
    try:
        # Fetch purchase details
        purchase = Purchase.get_by_id(purchase_id)
        if not purchase:
            return jsonify({"error": "Purchase not found"}), 404

        # Extract necessary details from the purchase
        client_id = purchase['client_id']
        product_id = purchase['product_id']
        amount = purchase['amount']

        # Fetch system_id from the session
        system_id = SessionHelper.get_system_id()
        if not system_id:
            return jsonify({"error": "System ID not found in session"}), 400

        # Regenerate PayPal link
        (paypal_approval_url, paypal_payment_id) = generate_paypal_link(
            client_id=client_id,
            product_id=product_id,
            amount=amount,
            system_id=system_id,  # Pass the correct system_id here
            purchase_id_val=purchase_id
        )

        # Update database with new PayPal details
        Purchase.update_paypal_payment_id(purchase_id, paypal_payment_id)
        Purchase.update_paypal_link(purchase_id, paypal_approval_url)

        return jsonify({
            "message": "New PayPal link generated",
            "purchase_id": purchase_id,
            "paypal_link": paypal_approval_url,
            "paypal_payment_id": paypal_payment_id
        }), 200

    except Exception as e:
        print(f"Error regenerating PayPal link: {str(e)}")
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







    







