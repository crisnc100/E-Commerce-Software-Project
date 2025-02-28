from flask import redirect, request, session, jsonify, render_template
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.payments_model import PaymentModel
from flask_app.utils.session_helper import SessionHelper
from flask_app.models.purchases_model import Purchase
from decimal import Decimal, InvalidOperation
from paypalrestsdk import Payment, configure
from flask_app.models.systems_model import System
from datetime import datetime
import requests



# CREATE Payment
@app.route('/api/create_payment', methods=['POST'])
def create_payment():
    data = request.get_json()
    print(f"Incoming payload: {data}")


    # Optional validation here (e.g., amount > 0)
    if not PaymentModel.validate_payment(data):
        return jsonify({"error": "Invalid payment data"}), 400

    # Save the payment
    payment_id = PaymentModel.save(data)
    return jsonify({"message": "Payment created", "payment_id": payment_id}), 201



@app.route("/execute-payment", methods=["GET"])
def execute_payment():
    order_id = request.args.get("orderId")  # Use "orderId" instead of "paymentId"

    if not order_id:
        return jsonify({"status": "error", "message": "Missing order ID"}), 400

    try:
        # Fetch the purchase data
        purchase_data = Purchase.get_by_paypal_order_id(order_id)
        if not purchase_data:
            return jsonify({"status": "error", "message": f"No purchase found for order ID={order_id}"}), 404

        # Use the system_id from the purchase
        system_id = purchase_data.system_id
        if not system_id:
            return jsonify({"status": "error", "message": "System ID is missing in purchase data"}), 400

        # Temporarily set system_id in the session
        SessionHelper.set_system_id(system_id)

        # Fetch system credentials
        system_obj = System.get_system_by_id(system_id)
        if not system_obj:
            return jsonify({"status": "error", "message": f"System {system_id} not found"}), 400

        try:
            decrypted_client_id = System.decrypt_data(system_obj.paypal_client_id)
            decrypted_secret = System.decrypt_data(system_obj.paypal_secret)
            print(f"Decrypted Client ID: {decrypted_client_id}")
            print(f"Decrypted Secret: {decrypted_secret}")
        except Exception as decrypt_error:
            return jsonify({"status": "error", "message": f"Failed to decrypt PayPal credentials: {str(decrypt_error)}"}), 500

        # Get access token
        token_response = requests.post(
            'https://api-m.paypal.com/v1/oauth2/token',
            auth=(decrypted_client_id, decrypted_secret),
            headers={'Accept': 'application/json'},
            data={'grant_type': 'client_credentials'}
        )
        if token_response.status_code != 200:
            raise Exception(f"Failed to get PayPal access token: {token_response.json()}")

        access_token = token_response.json().get('access_token')
        if not access_token:
            raise Exception("Access token not found in PayPal response.")

        # Capture the order
        capture_response = requests.post(
            f'https://api-m.paypal.com/v2/checkout/orders/{order_id}/capture',
            headers={
                'Content-Type': 'application/json',
                'Authorization': f'Bearer {access_token}'
            }
        )
        if capture_response.status_code != 201:
            raise Exception(f"Failed to capture PayPal order: {capture_response.json()}")

        capture_data = capture_response.json()
        amount_paid = capture_data['purchase_units'][0]['payments']['captures'][0]['amount']['value']

        # Mark purchase as Paid
        Purchase.update_payment_status(purchase_data.id, "Paid")

        # Insert a payment record
        PaymentModel.save({
            "client_id": purchase_data.client_id,
            "purchase_id": purchase_data.id,
            "payment_date": datetime.now().strftime("%Y-%m-%d"),
            "amount_paid": amount_paid,
            "payment_method": "PayPal"
        })

        return jsonify({"status": "success"}), 200

    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500



@app.route("/payment-final", methods=["GET"])
def payment_final():
    return render_template("payment_final.html")




# READ All Payments
@app.route('/api/get_all_payments', methods=['GET'])
def get_all_payments():
    payments = PaymentModel.get_all()
    return jsonify([payment.serialize() for payment in payments]), 200


# READ Single Payment by ID
@app.route('/api/get_payment/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    payment = PaymentModel.get_by_id(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(payment.serialize()), 200


@app.route('/api/get_paginated_payments', methods=['GET'])
def get_paginated_payments():
    try:
        # Extract query parameters
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 12))
        method = request.args.get('method', 'PayPal')  # Default to 'PayPal'

        # Fetch payments
        payments_data = PaymentModel.get_paginated_payments(page=page, limit=limit, method=method)

        return jsonify({
            "items": payments_data['items'],
            "total": payments_data['total'],
            "current_page": page,
            "per_page": limit
        }), 200
    except Exception as e:
        print(f"Error fetching paginated payments: {str(e)}")
        return jsonify({"error": "Failed to fetch payments"}), 500



# UPDATE Payment


@app.route('/api/update_payment/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    try:
        data = request.get_json()

        # Convert amount_paid to Decimal
        if 'amount_paid' in data:
            try:
                data['amount_paid'] = Decimal(data['amount_paid'])
            except (InvalidOperation, TypeError):
                return jsonify({"error": "Invalid payment amount."}), 400

        # Fetch the payment
        payment = PaymentModel.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Fetch the purchase
        purchase = Purchase.get_by_id(payment.purchase_id)
        if not purchase:
            print(f"Purchase ID from payment: {payment.purchase_id}")
            return jsonify({"error": "Associated purchase not found"}), 404

        # Validate the new amount
        buffer_limit = Decimal('1.5')
        if data['amount_paid'] > purchase.amount * buffer_limit:
            return jsonify({"error": "Payment amount is unusually high. Please confirm manually."}), 400

        # Update payment
        data['id'] = payment_id
        data['client_id'] = payment.client_id
        data['purchase_id'] = payment.purchase_id

        try:
            PaymentModel.update(data)
        except Exception as e:
            print(f"SQL Update Failed: {str(e)}")
            return jsonify({"error": "Database update failed"}), 500

        # Recalculate purchase status
        total_paid = purchase.get_total_amount(purchase.id)
        if total_paid == purchase.amount:
            Purchase.update_payment_status(purchase.id, 'Paid')
        elif total_paid < purchase.amount:
            Purchase.update_payment_status(purchase.id, 'Partial')


        return jsonify({"message": "Payment updated successfully"}), 200

    except Exception as e:
        print(f"Error updating payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500







# DELETE Payment
@app.route('/api/delete_payment/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        # Check if the payment exists
        payment = PaymentModel.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Delete the payment
        PaymentModel.delete(payment_id)

        # Check associated purchase
        purchase = Purchase.get_by_id(payment.purchase_id)

        # Update purchase status if necessary
        total_paid = purchase.get_total_amount(purchase.id)
        if total_paid == 0:
            purchase.update_payment_status(purchase.id,'Pending')
        elif total_paid < purchase.amount:
            purchase.update_payment_status(purchase.id, 'Partial')
        else:
            purchase.update_payment_status(purchase.id, 'Paid')

        return jsonify({"message": "Payment deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500



# GET Payments by Client ID
@app.route('/api/get_payments_by_client/<int:client_id>', methods=['GET'])
def get_payments_by_client(client_id):
    try:
        payments = PaymentModel.get_payments_with_order_details_by_client(client_id)
        serialized_payments = [payment.serialize() for payment in payments]
        return jsonify(serialized_payments), 200
    except Exception as e:
        print(f"Something went wrong: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



# GET Payments by Purchase ID
@app.route('/api/get_payments_by_purchase/<int:purchase_id>', methods=['GET'])
def get_payments_by_purchase(purchase_id):
    payments = PaymentModel.get_payments_by_purchase(purchase_id)
    if not payments:
        return jsonify({"message": "No payments found for this purchase"}), 404
    return jsonify([payment.serialize() for payment in payments]), 200

