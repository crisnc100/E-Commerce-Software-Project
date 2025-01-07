from flask import request, jsonify, session
from flask_app import app
from flask_app.models.users_model import User
from flask_app.models.systems_model import System
from flask_app.utils.session_helper import SessionHelper
from flask_mail import Mail, Message
mail = Mail(app)
from datetime import datetime, timedelta
import re

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+$')




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


@app.route('/api/get_system_info', methods=['GET'])
def get_system_info():
    """
    Retrieves the current system info based on session['system_id'].
    """
    if 'system_id' not in session:
        return jsonify({'error': 'No system in session'}), 401

    try:
        system_id = session['system_id']
        system = System.get_system_by_id(system_id)

        if not system:
            return jsonify({'error': 'System not found'}), 404

        return jsonify({
            'id': system.id,
            'owner_id': system.owner_id,
            'name': system.name,
            'paypal_client_id': system.paypal_client_id,
            'paypal_secret': system.paypal_secret
        }), 200

    except Exception as e:
        app.logger.error(f"Error retrieving system: {str(e)}")
        return jsonify({'error': 'An error occurred while retrieving system data.'}), 500






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
    system_id = session.get('system_id')


    # Debugging: Check session data
    if not admin_id or role != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        data = request.get_json()

        email = data.get('email')
        if not email:
            raise ValueError("Email is missing in the request")

        # Check if the email already exists
        existing_user = User.get_by_email(email)
        if existing_user:
            return jsonify({'error': 'Email already exists in the system'}), 400
        
        system_data = System.get_system_by_id(system_id)
        if not system_data:
            raise ValueError(f"System with ID {system_id} not found")

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

        login_url = f"https://ortega-shop.vercel.app/"


        # Prepare and send email
        # Send email
        msg = Message(
            subject=f"Welcome to {system_data.name}",
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
            <p><a href="{login_url}" target="_blank">Click here to log in</a></p>
            <p>Best regards,<br>{system_data.name} Team</p>
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
    

      # Check if the password is temporary and expired
    if user.is_temp_password and user.temp_password_expiry < datetime.now():
        return jsonify({
            'error': 'Temporary password has expired. Please contact your admin for a new password.'
        }), 403

    # Check if temporary password is being used
    if user.is_temp_password:
        print(f"User {user.id} is using a temporary password. Redirecting to change password.")
        session.update({'user_id': user.id})
        return jsonify({
            'message': 'Temporary password detected. Please change your password.',
            'force_password_change': True
        }), 403

    User.log_last_login(user.id)

    # Log the last login and update session
    SessionHelper.set_system_id(user.system_id)
    session.update({'user_id': user.id, 'email': user.email, 'role': user.role})
    session['user_id'] = user.id
    session['system_id'] = user.system_id
    session['role'] = user.role
    session['session_active'] = True  # <--- Mark as fully logged in

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


@app.route('/api/update_user_info', methods=['POST','PUT'])
def update_user_info():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    data = request.get_json()
    email = data.get('email')

    if email and not EMAIL_REGEX.match(email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Prevent duplicate email registration
    existing_user = User.get_by_email(email)
    if existing_user and existing_user.id != user_id:
        return jsonify({'error': 'Email already registered'}), 400

    updated_data = {
        'id': user_id,
        'first_name': data.get('first_name'),
        'last_name': data.get('last_name'),
        'email': email
    }

    try:
        User.update_user_info(updated_data)
        return jsonify({'message': 'User information updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': f"Error updating user info: {str(e)}"}), 500


    

@app.route('/api/update_user_password', methods=['POST','PUT'])
def update_user_password():
    user_id = session.get('user_id')
    if not user_id:
        return jsonify({'error': 'Unauthorized access'}), 403

    data = request.get_json()
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    confirm_password = data.get('confirm_password')

    if new_password != confirm_password:
        return jsonify({'error': 'Passwords do not match'}), 400

    user = User.get_by_id(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not User.verify_passcode(current_password, user.passcode_hash):
        return jsonify({'error': 'Current password is incorrect'}), 401

    if not User.validate_passcode(new_password):
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    hashed_password = User.hash_passcode(new_password)
    try:
        User.update_passcode_hash(user_id, hashed_password)
        return jsonify({'message': 'Password updated successfully'}), 200
    except Exception as e:
        return jsonify({'error': f"Error updating password: {str(e)}"}), 500





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
    session['session_active'] = True  # <--- Now the user is "fully" active


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
    system_id = session.get('system_id')
    user_id = session.get('user_id')

    session.clear()  # This removes everything including 'session_active'

    if system_id:
        session['system_id'] = system_id
    if user_id:
        session['user_id'] = user_id
        # The user can still "quick login"
    
    # Notice we do NOT set session['session_active'] = True again

    return jsonify({'message': 'Logged out successfully'}), 200





# CHECK IF AUTHENTICATED
@app.route('/api/is_authenticated', methods=['GET'])
def is_authenticated():
    """
    Must have system_id, user_id, AND session_active == True 
    to be considered 'authenticated'
    """
    if (
        'system_id' in session 
        and 'user_id' in session 
        and session.get('session_active') is True
    ):
        user_id = session['user_id']
        user = User.get_by_id(user_id)
        if user:
            return jsonify({
                'authenticated': True,
                'system_id': session['system_id'],
                'user': {
                    'id': user.id,
                    'email': user.email,
                    'role': user.role,
                    'is_temp_password': user.is_temp_password
                }
            }), 200

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
                'id': user.id,
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



        return jsonify(users), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# Controller: flask_app/controllers/admin_controller.py
@app.route('/api/delete_user_by_admin/<int:user_id>', methods=['DELETE'])
def delete_user_by_admin(user_id):
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
    

@app.route('/api/delete_user_self/<int:user_id>', methods=['DELETE'])
def delete_user_self(user_id):
    """
    Delete a user by their own ID. Clears the session so they're logged out, 
    and sends a confirmation email to the user.
    """
    try:
        # Optional: Ensure the user can only delete their own account.
        if session.get('user_id') != user_id:
            return jsonify({'error': 'Unauthorized. You can only delete your own account.'}), 403

        user = User.get_by_id(user_id)  # So we can email them
        if not user:
            return jsonify({'error': 'User not found.'}), 404

        # 1) Delete the user
        User.delete_user(user_id)

        # 2) Mark session inactive & clear it
        session['session_active'] = False
        session.clear()
        
        # 3) Send a "Your account was deleted" email
        msg = Message(
            subject=f"Confirmation of Account Deletion",
            recipients=[user.email]
        )
        msg.html = f"""
        <p>Dear {user.first_name},</p>
        <p>This is to confirm that your account associated with <strong>{user.email}</strong>
        has been deleted off the system at your request.</p>
        <p>If you did not initiate this action or have any concerns,
        please contact admin immediately.</p>
        <p>Thank you,<br>System Ecommerce Team</p>
        """
        mail.send(msg)
        return jsonify({'message': 'User account deleted successfully. Session cleared, confirmation email sent.'}), 200

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/delete_system/<int:system_id>/<int:user_id>', methods=['DELETE'])
def delete_system(system_id, user_id):
    """
    Delete a system by its ID and send a confirmation email to the owner.
    """
    try:
        if session.get('user_id') != user_id:
            return jsonify({'error': 'Unauthorized. You can only delete your own account.'}), 403
        owner_user = User.get_by_id(user_id)
        if not owner_user:
            return jsonify({'error': 'Owner not found. Email not sent.'}), 404

        print(f"Owner User: {owner_user}")

        # Delete the system
        system_data = System.get_system_by_id(system_id)
        if not system_data:
            return jsonify({'error': 'System not found.'}), 404

        System.delete_system(system_id)
        print(f"System {system_id} deleted.")

        # Send confirmation email
        msg = Message(
            subject=f"System Deletion Confirmation: {system_data.name}",
            recipients=[owner_user.email]
        )
        msg.html =  f"""
            <p>Hi {owner_user.first_name},</p>
            <p>Your system <strong>{system_data.name}</strong> has been successfully 
            deleted along with all associated user data and products.</p>
            <p>If this was not your intention, please contact support immediately.</p>
            <p>Thank you,<br>System Ecommerce Team</p>
            """
        mail.send(msg)
        print(f"Email sent successfully to: {owner_user.email}")

        # Clear the session
        session['session_active'] = False
        session.clear()

        return jsonify({'message': 'System deleted successfully. Email sent.'}), 200

    except Exception as e:
        print(f"Error: {e}")
        return jsonify({'error': str(e)}), 500



    


@app.route('/api/resend_temp_password', methods=['POST'])
def resend_temp_password():
    """
    Resend a new temporary password to a user.
    """
    admin_id = session.get('user_id')
    role = session.get('role')
    system_id = session.get('system_id')

    if not admin_id or role != 'admin':
        return jsonify({'error': 'Unauthorized access'}), 403

    try:
        data = request.get_json()
        user_id = data.get('user_id')

        if not user_id:
            raise ValueError("User ID is missing in the request")

        # Fetch the user
        user = User.get_by_id(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Fetch system data
        system_data = System.get_system_by_id(system_id)
        if not system_data:
            raise ValueError(f"System with ID {system_id} not found")

        # Generate a new temporary password
        new_temp_password = User.generate_temporary_password()

        # Calculate new expiry time (48 hours from now)
        new_expiry_time = datetime.now() + timedelta(hours=48)

        # Update the user's password and expiry time
        User.update_temp_password(user_id, new_temp_password, temp_password_expiry=new_expiry_time, is_temp_password=True)

        # Send email with the new temporary password
        msg = Message(
            subject=f"New Temporary Password for {system_data.name}",
            recipients=[user.email]
        )
        msg.html = f"""
        <p>Hi {user.first_name},</p>
        <p>A new temporary password has been generated for your account:</p>
        <ul>
            <li><strong>Email:</strong> {user.email}</li>
            <li><strong>New Temporary Password:</strong> {new_temp_password}</li>
        </ul>
        <p>Please log in using these credentials and update your password within 48 hours.</p>
        <p>Best regards,<br>{system_data.name} Team</p>
        """
        mail.send(msg)

        return jsonify({'message': 'New temporary password sent successfully.'}), 200

    except Exception as e:
        print(f"Error in resend_temp_password: {str(e)}")
        return jsonify({'error': str(e)}), 500



@app.route('/api/forgot_password', methods=['POST'])
def forgot_password():
    """
    Process password reset requests.
    """
    try:
        data = request.get_json()
        email = data.get('email')

        if not email:
            return jsonify({'error': 'Email is required'}), 400

        # Fetch user by email
        user = User.get_by_email(email)
        if not user:
            return jsonify({'error': 'No user found with that email'}), 404

        # Generate and update temporary password
        temp_password = User.generate_temporary_password()
        User.update_temp_password(
            user.id, temp_password, 
            temp_password_expiry=datetime.now() + timedelta(hours=24), 
            is_temp_password=True
        )

        # Send email with temporary password
        msg = Message(
            subject="Password Reset Request",
            recipients=[user.email]
        )
        msg.html = f"""
        <p>Hi {user.first_name},</p>
        <p>We received a request to reset your password. Below is your temporary password:</p>
        <ul>
            <li><strong>Temporary Password:</strong> {temp_password}</li>
        </ul>
        <p>Please log in with this password and update it within 24 hours.</p>
        <p>If you did not request this, please ignore this email.</p>
        """
        mail.send(msg)

        return jsonify({'message': 'Temporary password sent to your email'}), 200
    except Exception as e:
        print(f"Error in forgot_password: {e}")
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/update_paypal_credentials', methods=['POST' , 'PUT'])
def update_paypal_credentials():
    try:
        data = request.get_json()
        system_id = data['system_id']
        paypal_client_id = data['paypal_client_id']
        paypal_secret = data['paypal_secret']

        # Save or update credentials
        System.update_paypal_credentials(system_id, paypal_client_id, paypal_secret)

        return jsonify({'message': 'PayPal credentials updated successfully'}), 200
    except Exception as e:
        print(f"Error updating PayPal credentials: {e}")
        return jsonify({'error': 'Internal Server Error'}), 500


    





