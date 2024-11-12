from flask import request, jsonify, session
from flask_app import app
from flask_app.models.admin_model import Admin

# CHECK IF PASSCODE EXISTS
@app.route('/api/passcode_exists', methods=['GET'])
def passcode_exists():
    admin = Admin.get_admin()
    return jsonify({'exists': bool(admin)}), 200

# SET PASSCODE (Initial Setup)
@app.route('/api/set_passcode', methods=['POST'])
def set_passcode():
    data = request.get_json()
    passcode = data.get('passcode')
    email = data.get('email')

    # Check if admin already exists
    if Admin.get_admin():
        return jsonify({'error': 'Passcode already set'}), 400

    # Validate passcode
    if not Admin.validate_passcode(passcode):
        return jsonify({'error': 'Passcode must be at least 6 characters'}), 400

    # Hash the passcode
    passcode_hash = Admin.hash_passcode(passcode)

    # Create admin record
    admin_data = {
        'email': email,
        'passcode_hash': passcode_hash
    }
    Admin.create_admin(admin_data)
    return jsonify({'message': 'Passcode set successfully'}), 201

# VERIFY PASSCODE (Login)
@app.route('/api/verify_passcode', methods=['POST'])
def verify_passcode():
    data = request.get_json()
    passcode_input = data.get('passcode')

    admin = Admin.get_admin()
    if not admin or not Admin.verify_passcode(passcode_input, admin.passcode_hash):
        return jsonify({'success': False, 'error': 'Invalid passcode'}), 401

    # Set session on successful login
    session['admin_id'] = admin.id
    session['email'] = admin.email  # Add additional necessary session data
    print("Session set:", session)
    return jsonify({'success': True}), 200

# CHANGE PASSCODE
@app.route('/api/change_passcode', methods=['PUT'])
def change_passcode():
    data = request.get_json()
    current_passcode = data.get('current_passcode')
    new_passcode = data.get('new_passcode')

    # Authenticate current passcode
    admin = Admin.get_admin()
    if not admin or not Admin.verify_passcode(current_passcode, admin.passcode_hash):
        return jsonify({'error': 'Current passcode is incorrect'}), 401

    # Validate new passcode
    if not Admin.validate_passcode(new_passcode):
        return jsonify({'error': 'New passcode must be at least 6 characters'}), 400

    # Hash new passcode and update
    new_passcode_hash = Admin.hash_passcode(new_passcode)
    Admin.update_passcode({'id': admin.id, 'passcode_hash': new_passcode_hash})

    return jsonify({'message': 'Passcode changed successfully'}), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    print("Session before clearing:", session)
    session.clear()  # Clear session data on the server

    # Create a response and delete the session cookie
    response = jsonify({'message': 'Logged out successfully'})
    response.delete_cookie(
        app.config['SESSION_COOKIE_NAME'],
        path='/',
        httponly=True,
        samesite='Lax'
    )

    print("Session after clearing:", session)
    return response








# In admin_controller.py

@app.route('/api/reset_passcode', methods=['POST'])
def reset_passcode():
    data = request.get_json()
    email = data.get('email')
    new_passcode = data.get('new_passcode')

    admin = Admin.get_admin()
    if not admin or admin.email != email:
        return jsonify({'error': 'Email does not match our records'}), 401

    # Validate new passcode
    if not Admin.validate_passcode(new_passcode):
        return jsonify({'error': 'New passcode must be at least 6 characters'}), 400

    # Hash new passcode and update
    new_passcode_hash = Admin.hash_passcode(new_passcode)
    Admin.update_passcode({'id': admin.id, 'passcode_hash': new_passcode_hash})

    return jsonify({'message': 'Passcode reset successfully'}), 200

@app.route('/api/is_authenticated', methods=['GET'])
def is_authenticated():
    print("Session data:", session)
    if 'admin_id' in session:
        return jsonify({'authenticated': True}), 200
    else:
        return jsonify({'authenticated': False}), 401

