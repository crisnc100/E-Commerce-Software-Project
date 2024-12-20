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
    print(f"Session data during system check: {dict(session)}")  # Debug print
    system = System.get_system()
    session_active = 'system_id' in session and 'user_id' in session
    quick_login_available = 'system_id' in session  # Check only for system_id
    return jsonify({
        'exists': bool(system),
        'session_active': session_active,
        'quick_login_available': quick_login_available
    }), 200





# REGISTER ADMIN AND INITIAL SYSTEM SETUP
@app.route('/api/register_admin', methods=['POST'])
def register_admin():
    """
    Register the initial admin user for the system.
    """
    data = request.get_json()
    system_name = data.get('system_name')
    first_name = data.get('first_name')
    last_name = data.get('last_name')
    email = data.get('email')
    passcode = data.get('passcode')

    # Validate input fields
    if not all([system_name, first_name, last_name, email, passcode]):
        return jsonify({'error': 'All fields are required'}), 400

    # Validate system name
    if System.system_name_exists(system_name):
        return jsonify({'error': 'System name already exists'}), 400

    # Prevent duplicate email registration
    if User.get_by_email(email):
        return jsonify({'error': 'Email already registered'}), 400

    # Validate passcode strength
    if not User.validate_passcode(passcode):
        return jsonify({'error': 'Passcode must be at least 6 characters'}), 400

    # Hash the passcode
    passcode_hash = User.hash_passcode(passcode)

    try:
        # Create the system without an owner initially
        system_id = System.create_system(name=system_name, owner_id=None)

        # Create the admin user and link to the system
        admin_id = User.create_admin({
            'first_name': first_name,
            'last_name': last_name,
            'email': email,
            'passcode_hash': passcode_hash,
            'system_id': system_id
        })

        # Update the system with the owner's ID
        System.update_owner(system_id, admin_id)

        # Update session
        session.update({'system_id': system_id, 'user_id': admin_id, 'role': 'admin'})

        return jsonify({
            'message': 'System created successfully',
            'system_id': system_id,
            'admin_email': email,
            'system_name': system_name
        }), 201
    except Exception as e:
        app.logger.error(f"Error creating system: {str(e)}")  # Log the error for debugging
        return jsonify({'error': 'An unexpected error occurred'}), 500

    

@app.route('/api/validate_system_name', methods=['POST'])
def validate_system_name():
    """
    Check if a system name is available.
    """
    data = request.get_json()
    system_name = data.get('system_name')

    if System.system_name_exists(system_name):
        return jsonify({'available': False, 'error': 'System name already exists'}), 400

    return jsonify({'available': True}), 200



# LOGIN WITH EMAIL AND PASSCODE
@app.route('/api/login', methods=['POST'])
def login():
    """
    Verify email and passcode to log in.
    """
    data = request.get_json()
    email, passcode_input = data.get('email'), data.get('passcode')

    user = User.get_by_email(email)
    print(f"User fetched by email: {vars(user) if user else 'No user found'}")  # Debug print

    if not user or not User.verify_passcode(passcode_input, user.passcode_hash):
        return jsonify({'error': 'Invalid email or passcode'}), 401

    SessionHelper.set_system_id(user.system_id)
    session.update({'user_id': user.id, 'email': user.email, 'role': user.role})
    print(f"Session after login: {dict(session)}")  # Debug print


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

    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'No active session'}), 401

    user = User.get_by_id(user_id)
    if not user or not User.verify_passcode(passcode_input, user.passcode_hash):
        return jsonify({'error': 'Invalid passcode'}), 401

    # Add email and role to the session
    session.update({
        'session_active': True,
        'email': user.email,
        'role': user.role
    })

    return jsonify({
        'message': 'Quick login successful',
        'user': {
            'first_name': user.first_name,
            'last_name': user.last_name
        }
    }), 200







# LOGOUT
@app.route('/api/logout', methods=['POST'])
def logout():
    """
    Log the user out and clear session data, except for system_id and user_id (for quick login).
    """
    system_id = session.get('system_id')
    user_id = session.get('user_id')  # Preserve user_id for quick login
    session.clear()
    if system_id:
        session['system_id'] = system_id
    if user_id:  # Add this line
        session['user_id'] = user_id  # Preserve user_id for quick login
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
    

@app.route('/api/get_user', methods=['GET'])
def get_user():
    """
    Retrieve the logged-in user's details from the session.
    """
    if 'user_id' in session:
        user = User.get_by_id(session['user_id'])  # Create a `get_by_id` method in `User` model
        if user:
            return jsonify({
                'first_name': user.first_name,
                'last_name': user.last_name
            }), 200
    return jsonify({'error': 'No user logged in'}), 401
