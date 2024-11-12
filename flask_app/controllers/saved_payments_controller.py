from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.saved_payments_model import SavedPayment
from decorators import login_required   # Import the decorator




# CREATE Saved Payment
@app.route('/api/create_saved_payment', methods=['POST'])
def create_saved_payment():
    data = request.get_json()

    # Check for required fields
    required_fields = ['client_id', 'card_number', 'card_type', 'expiration_date']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Encrypt the card number
    data['encrypted_card_number'] = SavedPayment.encrypt_card_number(data['card_number'])
    data['card_last_four'] = data['card_number'][-4:]  # Store only the last four digits
    del data['card_number']  # Remove plain card number from data

    # Save the encrypted card information
    saved_payment_id = SavedPayment.save(data)
    return jsonify({"message": "Saved payment created", "saved_payment_id": saved_payment_id}), 201


# READ All Saved Payments
@app.route('/api/get_all_saved_payments', methods=['GET'])
def get_all_saved_payments():
    saved_payments = SavedPayment.get_all()
    return jsonify([payment.serialize() for payment in saved_payments]), 200


# READ Saved Payment by ID
@app.route('/api/get_saved_payment/<int:saved_payment_id>', methods=['GET'])
@login_required
def get_saved_payment(saved_payment_id):
    saved_payment = SavedPayment.get_by_id(saved_payment_id)
    if not saved_payment:
        return jsonify({"error": "Saved payment not found"}), 404
    return jsonify(saved_payment.serialize()), 200


# UPDATE Saved Payment
@app.route('/api/update_saved_payment/<int:saved_payment_id>', methods=['PUT'])
@login_required
def update_saved_payment(saved_payment_id):
    data = request.get_json()
    data['id'] = saved_payment_id

    # Check if saved payment exists
    saved_payment = SavedPayment.get_by_id(saved_payment_id)
    if not saved_payment:
        return jsonify({"error": "Saved payment not found"}), 404

    # Encrypt new card number if provided
    if 'card_number' in data:
        data['encrypted_card_number'] = SavedPayment.encrypt_card_number(data['card_number'])
        data['card_last_four'] = data['card_number'][-4:]
        del data['card_number']  # Remove plain card number from data

    # Update saved payment
    SavedPayment.update(data)
    return jsonify({"message": "Saved payment updated"}), 200


# DELETE Saved Payment
@app.route('/api/delete_saved_payment/<int:saved_payment_id>', methods=['DELETE'])
def delete_saved_payment(saved_payment_id):
    saved_payment = SavedPayment.get_by_id(saved_payment_id)
    if not saved_payment:
        return jsonify({"error": "Saved payment not found"}), 404

    SavedPayment.delete(saved_payment_id)
    return jsonify({"message": "Saved payment deleted"}), 200


# GET Saved Payments by Client ID
@app.route('/api/get_saved_payments_by_client/<int:client_id>', methods=['GET'])
@login_required
def get_saved_payments_by_client(client_id):
    saved_payments = SavedPayment.get_saved_payments_by_client(client_id)
    if not saved_payments:
        return jsonify({"message": "No saved payments found for this client"}), 404
    return jsonify([payment.serialize() for payment in saved_payments]), 200