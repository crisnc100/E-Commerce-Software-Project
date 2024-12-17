from flask import request, jsonify, session
from flask_app import app
from flask_app.models.users_model import User
from flask_app.models.systems_model import System
from flask_app.utils.session_helper import SessionHelper


# CHECK IF SYSTEM EXISTS
@app.route('/api/system_exists', methods=['GET'])
def system_exists():
    """
    Check if the system exists and return session status.
    """
    system = System.get_system()
    return jsonify({
        'exists': bool(system),
        'session_active': 'system_id' in session
    }), 200


# REGISTER ADMIN AND INITIAL SYSTEM SETUP
@app.route('/api/register_admin', methods=['POST'])
def register_admin():
    """
    Register the initial admin user for the system.
    """
    data = request.get_json()
    first_name, last_name, email, passcode = data.get('first_name'), data.get('last_name'), data.get('email'), data.get('passcode')

    if User.get_user():
        return jsonify({'error': 'System already initialized'}), 400

    if not User.validate_passcode(passcode):
        return jsonify({'error': 'Passcode must be at least 6 characters'}), 400

    passcode_hash = User.hash_passcode(passcode)
    user_id = User.create_user({'first_name': first_name, 'last_name': last_name, 'email': email, 'passcode_hash': passcode_hash, 'role': 'admin'})
    system_id = System.create_system(owner_id=user_id)
    User.update_system_id(user_id, system_id)
    
    SessionHelper.set_system_id(system_id)
    session.update({'user_id': user_id, 'email': email, 'role': 'admin'})

    return jsonify({'message': 'Admin account created', 'system_id': system_id}), 201


# LOGIN WITH EMAIL AND PASSCODE
@app.route('/api/login', methods=['POST'])
def login():
    """
    Verify email and passcode to log in.
    """
    data = request.get_json()
    email, passcode_input = data.get('email'), data.get('passcode')

    user = User.get_by_email(email)
    if not user or not User.verify_passcode(passcode_input, user.passcode_hash):
        return jsonify({'error': 'Invalid email or passcode'}), 401

    SessionHelper.set_system_id(user.system_id)
    session.update({'user_id': user.id, 'email': user.email, 'role': user.role})

    return jsonify({'message': 'Login successful'}), 200



# CHANGE PASSCODE
@app.route('/api/change_passcode', methods=['PUT'])
def change_passcode():
    """
    Change the current user's passcode.
    """
    data = request.get_json()
    current_passcode = data.get('current_passcode')
    new_passcode = data.get('new_passcode')

    # Retrieve the logged-in user
    user = User.get_user()
    if not user or not User.verify_passcode(current_passcode, user.passcode_hash):
        return jsonify({'error': 'Current passcode is incorrect'}), 401

    # Validate and update the new passcode
    if not User.validate_passcode(new_passcode):
        return jsonify({'error': 'New passcode must be at least 6 characters'}), 400

    new_passcode_hash = User.hash_passcode(new_passcode)
    User.update_passcode({'id': user.id, 'passcode_hash': new_passcode_hash})

    return jsonify({'message': 'Passcode changed successfully'}), 200


# RESET PASSCODE
@app.route('/api/reset_passcode', methods=['POST'])
def reset_passcode():
    """
    Reset the passcode for a user based on email.
    """
    data = request.get_json()
    email = data.get('email')
    new_passcode = data.get('new_passcode')

    user = User.get_by_email(email)
    if not user:
        return jsonify({'error': 'Email not found'}), 404

    # Validate and update the new passcode
    if not User.validate_passcode(new_passcode):
        return jsonify({'error': 'New passcode must be at least 6 characters'}), 400

    new_passcode_hash = User.hash_passcode(new_passcode)
    User.update_passcode({'id': user.id, 'passcode_hash': new_passcode_hash})

    return jsonify({'message': 'Passcode reset successfully'}), 200


# QUICK LOGIN (PASSCODE ONLY)
@app.route('/api/quick_login', methods=['POST'])
def quick_login():
    """
    Quick login using only the passcode if a session exists.
    """
    data = request.get_json()
    passcode_input = data.get('passcode')

    user = User.get_user()
    if not user or not User.verify_passcode(passcode_input, user.passcode_hash):
        return jsonify({'error': 'Invalid passcode'}), 401

    return jsonify({'message': 'Quick login successful'}), 200


# LOGOUT
@app.route('/api/logout', methods=['POST'])
def logout():
    """
    Log the user out and clear session data.
    """
    session.clear()
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/is_authenticated', methods=['GET'])
def is_authenticated():
    """
    Check if the user is authenticated by verifying session data.
    """
    if 'system_id' in session and 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'system_id': session['system_id'],
            'user': {
                'id': session['user_id'],
                'email': session.get('email'),
                'role': session.get('role')
            }
        }), 200
    else:
        return jsonify({'authenticated': False}), 401