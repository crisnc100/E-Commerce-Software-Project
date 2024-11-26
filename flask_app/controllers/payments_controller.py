from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.payments_model import Payment
from flask_app.models.purchases_model import Purchase


# CREATE Payment
@app.route('/api/create_payment', methods=['POST'])
def create_payment():
    data = request.get_json()

    # Optional validation here (e.g., amount > 0)
    if not Payment.validate_payment(data):
        return jsonify({"error": "Invalid payment data"}), 400

    # Save the payment
    payment_id = Payment.save(data)
    return jsonify({"message": "Payment created", "payment_id": payment_id}), 201


# READ All Payments
@app.route('/api/get_all_payments', methods=['GET'])
def get_all_payments():
    payments = Payment.get_all()
    return jsonify([payment.serialize() for payment in payments]), 200


# READ Single Payment by ID
@app.route('/api/get_payment/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    payment = Payment.get_by_id(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(payment.serialize()), 200


# UPDATE Payment
@app.route('/api/update_payment/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    try:
        data = request.get_json()

        # Check if the payment exists
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Validate the new amount
        if data['amount_paid'] <= 0:
            return jsonify({"error": "Payment amount must be greater than 0"}), 400

        if data['amount_paid'] > payment.purchase.amount * 1.5:  # 50% buffer
            return jsonify({"error": "Payment amount is unusually high. Please confirm manually."}), 400

        # Update payment
        Payment.update(payment_id, data)

        # Recalculate purchase status
        purchase = Purchase.get_by_id(payment.purchase_id)
        total_paid = purchase.get_total_paid()
        if total_paid == purchase.amount:
            purchase.update_payment_status('Paid')
        elif total_paid < purchase.amount:
            purchase.update_payment_status('Partial')

        return jsonify({"message": "Payment updated successfully"}), 200
    except Exception as e:
        print(f"Error updating payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500



# DELETE Payment
@app.route('/api/delete_payment/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        # Check if the payment exists
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Delete the payment
        Payment.delete(payment_id)

        # Check associated purchase
        purchase = Purchase.get_by_id(payment.purchase_id)

        # Update purchase status if necessary
        total_paid = purchase.get_total_paid()
        if total_paid == 0:
            purchase.update_payment_status('Pending')
        elif total_paid < purchase.amount:
            purchase.update_payment_status('Partial')
        else:
            purchase.update_payment_status('Paid')

        return jsonify({"message": "Payment deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500



# GET Payments by Client ID
@app.route('/api/get_payments_by_client/<int:client_id>', methods=['GET'])
def get_payments_by_client(client_id):
    try:
        payments = Payment.get_payments_with_order_details_by_client(client_id)
        serialized_payments = [payment.serialize() for payment in payments]
        return jsonify(serialized_payments), 200
    except Exception as e:
        print(f"Something went wrong: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



# GET Payments by Purchase ID
@app.route('/api/get_payments_by_purchase/<int:purchase_id>', methods=['GET'])
def get_payments_by_purchase(purchase_id):
    payments = Payment.get_payments_by_purchase(purchase_id)
    if not payments:
        return jsonify({"message": "No payments found for this purchase"}), 404
    return jsonify([payment.serialize() for payment in payments]), 200

