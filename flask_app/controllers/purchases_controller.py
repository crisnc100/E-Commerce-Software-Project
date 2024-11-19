from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.purchases_model import Purchase

# CREATE Purchase
@app.route('/api/create_purchase', methods=['POST'])
def create_purchase():
    data = request.get_json()

    # Check for required fields
    required_fields = ['client_id', 'product_id', 'size', 'purchase_date', 'amount']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Missing required fields"}), 400

    # Save purchase
    purchase_id = Purchase.save(data)
    return jsonify({"message": "Purchase created", "purchase_id": purchase_id}), 201


# READ All Purchases
@app.route('/api/get_all_purchases', methods=['GET'])
def get_all_purchases():
    purchases = Purchase.get_all()
    return jsonify([purchase.serialize() for purchase in purchases]), 200


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
    data['id'] = purchase_id

    # Check if purchase exists
    purchase = Purchase.get_by_id(purchase_id)
    if not purchase:
        return jsonify({"error": "Purchase not found"}), 404

    # Update the purchase
    Purchase.update(data)
    return jsonify({"message": "Purchase updated"}), 200


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
    purchases = Purchase.get_purchases_by_client(client_id)
    if not purchases:
        return jsonify({"message": "No purchases found for this client"}), 404
    return jsonify([purchase.serialize() for purchase in purchases]), 200


# GET Purchases by Product ID
@app.route('/api/get_purchases_by_product/<int:product_id>', methods=['GET'])
def get_purchases_by_product(product_id):
    purchases = Purchase.get_purchases_by_product(product_id)
    if not purchases:
        return jsonify({"message": "No purchases found for this product"}), 404
    return jsonify([purchase.serialize() for purchase in purchases]), 200


# UPDATE Payment Status
@app.route('/api/update_payment_status/<int:purchase_id>', methods=['PUT'])
def update_payment_status(purchase_id):
    new_status = request.json.get('payment_status')
    if new_status not in ['Paid', 'Pending', 'Overdue']:
        return jsonify({"error": "Invalid payment status"}), 400

    # Update payment status
    Purchase.update_payment_status(purchase_id, new_status)
    return jsonify({"message": "Payment status updated"}), 200


# UPDATE Shipping Status
@app.route('/api/update_shipping_status/<int:purchase_id>', methods=['PUT'])
def update_shipping_status(purchase_id):
    new_status = request.json.get('shipping_status')
    if new_status not in ['Pending', 'Shipped', 'Delivered']:
        return jsonify({"error": "Invalid shipping status"}), 400

    # Update shipping status
    Purchase.update_shipping_status(purchase_id, new_status)
    return jsonify({"message": "Shipping status updated"}), 200