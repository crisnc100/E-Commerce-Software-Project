from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from decorators import login_required   # Import the decorator


@app.route('/api/add_client', methods=['POST'])
def create_client():
    data = request.get_json()
    if not data:
        return jsonify({'error': 'No data provided'}), 400
    
    # Validate data before saving
    if not Client.is_valid(data):
        return jsonify({"error": "Invalid data provided"}), 400
    
    # Save client
    client_id = Client.save(data)
    if client_id:
        return jsonify({'message': 'New client added successfully', 'client_id': client_id}), 200
    else:
        return jsonify({'error': 'Failed to add new client. Please try again.'}), 500


@app.route('/api/all_clients')
def all_clients():
    # Retrieve all clients associated with the specific trainer
    all_clients = Client.get_all()
    if all_clients:
        return jsonify({
            'all_clients': [client.serialize() for client in all_clients if isinstance(client, Client)]
        })
    else:
        return jsonify({'error': 'Data not found'}), 404


@app.route('/api/get_one_client/<int:client_id>', methods=['GET'])
@login_required
def get_one_client(client_id):
    client = Client.get_by_id(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404
    return jsonify(client.serialize()), 200


# UPDATE Client
@app.route('/api/update_client/<int:client_id>', methods=['PUT'])
@login_required
def update_client(client_id):
    data = request.get_json()
    data['id'] = client_id
    
    # Validate data
    if not Client.is_valid(data):
        return jsonify({"error": "Invalid data provided"}), 400

    # Update client
    Client.update(data)
    return jsonify({"message": "Client updated"}), 200


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
    name = request.args.get('name', '')
    if not name:
        return jsonify({"error": "Search term required"}), 400

    clients = Client.search_by_name(name)
    return jsonify([client.serialize() for client in clients]), 200


# GET Client with Purchases
@app.route('/api/get_clients_with_purchases/<int:client_id>', methods=['GET'])
def get_client_with_purchases(client_id):
    client = Client.get_by_id(client_id)
    if not client:
        return jsonify({"error": "Client not found"}), 404

    client_with_purchases = Client.get_clients_with_purchases()
    return jsonify(client_with_purchases), 200