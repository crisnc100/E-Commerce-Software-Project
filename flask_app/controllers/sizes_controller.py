from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.sizes_model import Size


# CREATE Size for Product
@app.route('/api/create_size', methods=['POST'])
def create_size():
    data = request.get_json()

    # Check for required fields in the data
    if 'product_id' not in data or 'size' not in data:
        return jsonify({"error": "Missing required fields"}), 400

    # Save the size
    size_id = Size.save(data)
    return jsonify({"message": "Size created", "size_id": size_id}), 201


# READ All Sizes
@app.route('/api/get_all_sizes', methods=['GET'])
def get_all_sizes():
    sizes = Size.get_all()
    return jsonify([size.serialize() for size in sizes]), 200


# READ Sizes by Product ID
@app.route('/api/get_sizes_by_product/<int:product_id>', methods=['GET'])
def get_sizes_by_product(product_id):
    sizes = Size.get_sizes_by_product(product_id)
    if not sizes:
        return jsonify({"message": "No sizes found for this product"}), 404
    return jsonify([size.serialize() for size in sizes]), 200


# UPDATE Size
@app.route('/api/update_size/<int:size_id>', methods=['PUT'])
def update_size(size_id):
    data = request.get_json()
    data['id'] = size_id

    # Validate that the size exists
    size = Size.get_by_id(size_id)
    if not size:
        return jsonify({"error": "Size not found"}), 404

    # Validate required field
    if 'size' not in data:
        return jsonify({"error": "Missing required size field"}), 400

    Size.update(data)
    return jsonify({"message": "Size updated"}), 200


# DELETE Size
@app.route('/api/delete_size/<int:size_id>', methods=['DELETE'])
def delete_size(size_id):
    # Check if size exists
    size = Size.get_by_id(size_id)
    if not size:
        return jsonify({"error": "Size not found"}), 404

    Size.delete(size_id)
    return jsonify({"message": "Size deleted"}), 200


# DELETE All Sizes by Product ID
@app.route('/api/delete_sizes_by_product/<int:product_id>', methods=['DELETE'])
def delete_sizes_by_product(product_id):
    # Check if there are sizes to delete
    sizes = Size.get_sizes_by_product(product_id)
    if not sizes:
        return jsonify({"message": "No sizes found for this product"}), 404

    Size.delete_sizes_by_product(product_id)
    return jsonify({"message": "All sizes for the product deleted"}), 200