from flask import redirect, request, session, jsonify, render_template
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.payments_model import PaymentModel
from flask_app.models.purchases_model import Purchase
from decimal import Decimal, InvalidOperation
from paypalrestsdk import Payment, configure
from flask_app.models.systems_model import System
from datetime import datetime



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
    """
    GET /execute-payment?paymentId=PAY-123&payerId=XYZ
    1) Find the purchase by purchase.paypal_payment_id
    2) Configure with correct system's PayPal creds
    3) Payment.find(paymentId), payment.execute({"payer_id": payerId})
    4) Mark purchase as Paid, create payment record
    """
    payment_id = request.args.get("paymentId")
    payer_id = request.args.get("payerId")

    if not payment_id or not payer_id:
        return jsonify({"status": "error", "message": "Missing paymentId or payerId"}), 400

    try:
        # 1) Find purchase row by that paymentId
        purchase_data = Purchase.get_by_paypal_payment_id(payment_id)
        if not purchase_data:
            return jsonify({"status": "error", "message": f"No purchase found for paymentId={payment_id}"}), 404
    

        # 2) Get the system credentials
        system_id = purchase_data['system_id']
        system_obj = System.get_system_by_id(system_id)
        if not system_obj:
            return jsonify({"status": "error", "message": f"System {system_id} not found"}), 400

        # 3) Configure with that system's credentials
        configure({
            "mode": "sandbox",
            "client_id": system_obj.paypal_client_id,
            "client_secret": system_obj.paypal_secret,
        })

        # 4) Payment.find(...) + execute
        payment = Payment.find(payment_id)
        if not payment:
            return jsonify({"status": "error", "message": "Could not find PayPal payment"}), 404

        if not payment.execute({"payer_id": payer_id}):
            err = payment.error or "Execution failed"
            return jsonify({"status": "error", "message": str(err)}), 400

        # Payment is captured
        # Mark purchase as 'Paid'
        Purchase.update_payment_status(purchase_data.id, "Paid")

        # Insert a row in 'payments' table if you want
        tx = payment.transactions[0]
        amount_paid = tx["amount"]["total"]  # e.g. "100.00"
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

