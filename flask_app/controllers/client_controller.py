from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client


@app.route('/api/add_client', methods=['POST'])
def create_client():
    data = request.get_json()
    # Ensure all required fields are present
    required_fields = ['first_name', 'last_name', 'contact_method', 'contact_details']
    missing_fields = [field for field in required_fields if field not in data or not data[field]]

    print(f"Missing fields: {missing_fields}")

    if missing_fields:
        print("Missing required fields:", missing_fields)
        return jsonify({"error": f"Missing required fields: {', '.join(missing_fields)}"}), 400

    print("Starting validation")
    if not Client.is_valid(data):
        print("Validation failed")
        return jsonify({"error": "Invalid contact details. Must be a valid email or phone number."}), 400
    print("Validation passed")

    # Proceed with saving the client
    try:
        client_id = Client.save(data)
        return jsonify({"message": "Client added", "client_id": client_id}), 201
    except Exception as e:
        print(f"Error saving client: {e}")
        return jsonify({"error": "Failed to save client"}), 500





@app.route('/api/all_clients/page/<int:page>')
def all_clients(page):
    # Get the search term from query parameters
    search = request.args.get('search', None)
    
    # Retrieve clients, with optional search
    clients, total_count = Client.get_all(page, search)

    response = {
        'clients': [client.serialize() for client in clients],
        'total_count': total_count
    }
    return jsonify(response), 200



@app.route('/api/get_one_client/<int:client_id>', methods=['GET'])
def get_one_client(client_id):
    client = Client.get_by_id(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404
    return jsonify(client.serialize()), 200


# UPDATE Client
@app.route('/api/update_client/<int:client_id>', methods=['PUT'])
def update_client(client_id):
    data = request.get_json()
    data['id'] = client_id
    
    print("Starting validation")
    if not Client.is_valid(data):
        print("Validation failed")
        return jsonify({"error": "Invalid contact details. Must be a valid email or phone number."}), 400
    print("Validation passed")

    # Proceed with updating the client
    try:
        Client.update(data)
        return jsonify({"message": "Updated Client Info", "client_id": client_id}), 201
    except Exception as e:
        print(f"Error updating client: {e}")
        return jsonify({"error": "Failed to upate client info"}), 500


#DELETE
@app.route('/api/delete_client/<int:client_id>', methods=['DELETE'])
def delete_client(client_id):
    print(f"Received DELETE request for client ID {client_id}")
    try:
        success = Client.delete(client_id)
        if success:
            print(f"Successfully deleted client {client_id}")
            return jsonify({"success": True}), 200
        else:
            print(f"No client found with ID {client_id}")
            return jsonify({"success": False, "message": "Client not found"}), 404
    except Exception as e:
        print(f"Exception during delete: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500



# SEARCH Client by Name
@app.route('/api/search_clients', methods=['GET'])
def search_clients():
    try:
        name = request.args.get('name', '')
        clients = Client.search_by_name(name)
        return jsonify(clients)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# GET Client with Purchases
@app.route('/api/get_clients_with_purchases/<int:client_id>', methods=['GET'])
def get_client_with_purchases(client_id):
    client = Client.get_by_id(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404

    client_with_purchases = Client.get_clients_with_purchases()
    return jsonify(client_with_purchases), 200