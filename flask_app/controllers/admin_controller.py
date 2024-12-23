from flask import request, jsonify, session
from flask_app import app
from flask_app.models.users_model import User
from flask_app.models.systems_model import System
from flask_app.utils.session_helper import SessionHelper
from flask_mail import Mail, Message
mail = Mail(app)




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


#Adding a User manually

@app.route('/api/add_user_manually', methods=['POST'])
def add_user_manually():
    """
    Add a new user to the system with a temporary password and send an email.
    """
    admin_id = session.get('user_id')
    role = session.get('role')

    # Debugging: Check session data
    print(f"Session data: admin_id={admin_id}, role={role}")

    if not admin_id or role != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        data = request.get_json()
        print(f"Received data: {data}")  # Debugging: Log received data

        email = data.get('email')
        if not email:
            raise ValueError("Email is missing in the request")

        # Check if the email already exists
        existing_user = User.get_by_email(email)
        if existing_user:
            return jsonify({'error': 'Email already exists in the system'}), 400

        user_data = {
            'first_name': data.get('first_name'),
            'last_name': data.get('last_name'),
            'email': data.get('email'),
            'role': data.get('role'),
            'system_id': session.get('system_id')
        }

        # Debugging: Log user data before adding
        print(f"User data to add: {user_data}")

        # Add user with temporary password
        user = User.add_user_with_temp_password(user_data)
        print(f"User added successfully: {user}")  # Debugging: Log added user


        # Prepare and send email
        # Send email
        msg = Message(
            subject="Welcome to Your System",
            recipients=[user_data['email']]
        )
        msg.html = f"""
        <p>Hi {user_data['first_name']},</p>
        <p>You have been added to the system. Below are your temporary credentials:</p>
        <ul>
            <li><strong>Email:</strong> {user_data['email']}</li>
            <li><strong>Temporary Password:</strong> {user['temp_password']}</li>
        </ul>
        <p>Please log in using these credentials and update your password within 48 hours.</p>
        <p>Best regards,<br>The System Team</p>
        """
        mail.send(msg)

        print("Email sent successfully")  # Debugging: Log email sent success

        return jsonify({'message': 'User added successfully and email sent.'}), 201

    except Exception as e:
        # Debugging: Log error details
        print(f"Error in add_user_manually: {str(e)}")
        return jsonify({'error': str(e)}), 500





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

    # Check if temporary password is being used
    if user.is_temp_password:
        print(f"User {user.id} is using a temporary password. Redirecting to change password.")
        session.update({'user_id': user.id})
        return jsonify({
            'message': 'Temporary password detected. Please change your password.',
            'force_password_change': True
        }), 403


    # Log the last login and update session
    SessionHelper.set_system_id(user.system_id)
    session.update({'user_id': user.id, 'email': user.email, 'role': user.role})
    User.log_last_login(user.id)

    return jsonify({'message': 'Login successful'}), 200



@app.route('/api/update_temp_password', methods=['POST', 'PUT'])
def update_temp_password():
    """
    Update user's password and mark it as non-temporary.
    """
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    data = request.get_json()

    # Validate new_password
    new_password = data.get('new_password')
    if not new_password:
        return jsonify({'error': 'New password is required'}), 400

    if len(new_password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters long'}), 400

    try:
        User.update_temp_password(user_id, new_password)
        return jsonify({'message': 'Password updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500




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

    # Check for temporary password
    if user.is_temp_password:
        return jsonify({
            'message': 'Temporary password detected. Please log in normally to change your password.',
            'force_password_change': True
        }), 403

    # Update session and log last login
    session.update({
        'session_active': True,
        'email': user.email,
        'role': user.role
    })
    User.log_last_login(user.id)

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
        user_id = session['user_id']

        # Fetch user details, including is_temp_password
        user = User.get_by_id(user_id)  # Assume this method fetches all user fields including `is_temp_password`
        
        if user:
            return jsonify({
                'authenticated': True,
                'system_id': session['system_id'],
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': user.role,
                    'is_temp_password': user.is_temp_password  # Add the temporary password flag
                }
            }), 200

    # If no session or user is not found, return unauthorized
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
                'last_name': user.last_name,
                'email': user.email,
                'role': user.role
            }), 200
    return jsonify({'error': 'No user logged in'}), 401


@app.route('/api/get_users_by_system', methods=['GET'])
def get_users_by_system():
    """
    Fetch all users in the current system along with their last login information.
    """
    system_id = session.get('system_id')
    role = session.get('role')

    if not system_id or role != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        # Get users in the system
        users = User.get_users_by_system(system_id)

        # Append last login information for each user
        for user in users:
            user['last_login'] = User.get_last_login(user['id'])

        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Controller: flask_app/controllers/admin_controller.py
@app.route('/api/delete_user/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    """
    Delete a user by their ID.
    """
    role = session.get('role')

    if role != 'admin':
        return jsonify({'error': 'Unauthorized action'}), 403

    try:
        User.delete_user(user_id)
        return jsonify({'message': 'User deleted successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500



