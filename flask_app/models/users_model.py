from flask_app.config.mysqlconnection import connectToMySQL
from flask_bcrypt import Bcrypt
from flask_app import app
from flask_app.utils.session_helper import SessionHelper
from flask import g
import random
import string
import datetime
from datetime import datetime, timedelta

bcrypt = Bcrypt(app)  # Initialize bcrypt

class User:
    def __init__(self, data):
        self.id = data.get('id')
        self.first_name = data.get('first_name')
        self.last_name = data.get('last_name')
        self.email = data.get('email')
        self.passcode_hash = data.get('passcode_hash')
        self.system_id = data.get('system_id')
        self.role = data.get('role')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.is_temp_password = data.get('is_temp_password')
        self.temp_password_expiry = data.get('temp_password_expiry')
        self.last_login = data.get('last_login')

    ### Class Methods ###

    @classmethod
    def get_by_email(cls, email):
        """Retrieve a user record by email."""
        query = "SELECT * FROM users WHERE email = %(email)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'email': email})
        return cls(result[0]) if result else None
    

    @classmethod
    def create_admin(cls, data):
        """Create a new admin user and return the user ID."""
        query = """
        INSERT INTO users (first_name, last_name, email, passcode_hash, system_id, role, created_at, updated_at)
        VALUES (%(first_name)s, %(last_name)s, %(email)s, %(passcode_hash)s, %(system_id)s, 'admin', NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def generate_temporary_password(cls):
        """
        Generate a strong random temporary password.
        """
        characters = string.ascii_letters + string.digits + "!@#$%^&*()"
        temp_password = ''.join(random.choice(characters) for _ in range(12))
        return temp_password

    @classmethod
    def add_user_with_temp_password(cls, user_data):
        """
        Add a new user with a temporary password.
        """
        temp_password = cls.generate_temporary_password()
        hashed_password = bcrypt.generate_password_hash(temp_password).decode('utf-8')
        expiry_time = datetime.now() + timedelta(hours=48)

        query = """
            INSERT INTO users (first_name, last_name, email, passcode_hash, system_id, role, is_temp_password, temp_password_expiry)
            VALUES (%(first_name)s, %(last_name)s, %(email)s, %(passcode_hash)s, %(system_id)s, %(role)s, %(is_temp_password)s, %(temp_password_expiry)s)
        """
        data = {
            **user_data,
            'passcode_hash': hashed_password,
            'is_temp_password': True,
            'temp_password_expiry': expiry_time
        }
        user_id = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return {'id': user_id, 'temp_password': temp_password}

    @classmethod
    def update_system_id(cls, user_id, system_id):
        """Update the system_id for a user."""
        query = """
        UPDATE users SET system_id = %(system_id)s, updated_at = NOW()
        WHERE id = %(user_id)s;
        """
        data = {'system_id': system_id, 'user_id': user_id}
        connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_user(cls):
        """Retrieve the first user record (for system initialization check)."""
        query = "SELECT * FROM users LIMIT 1;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return cls(result[0]) if result else None
    
    @classmethod
    def get_by_id(cls, user_id):
        """Retrieve a user record by ID."""
        query = "SELECT * FROM users WHERE id = %(user_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'user_id': user_id})
        return cls(result[0]) if result else None
    


    @classmethod
    def update_temp_password(cls, user_id, new_password, temp_password_expiry=None, is_temp_password=False):
            hashed_password = bcrypt.generate_password_hash(new_password).decode('utf-8')

            query = """
                UPDATE users
                SET passcode_hash = %(passcode_hash)s,
                    is_temp_password = %(is_temp_password)s,
                    temp_password_expiry = %(temp_password_expiry)s
                WHERE id = %(id)s
            """
            data = {
                'passcode_hash': hashed_password,
                'is_temp_password': is_temp_password,
                'temp_password_expiry': temp_password_expiry,
                'id': user_id
            }
            connectToMySQL('maria_ortegas_project_schema').query_db(query, data)



    ### Validation and Authentication ###

    @staticmethod
    def validate_passcode(passcode):
        """Validate the passcode strength."""
        return len(passcode) >= 6

    @staticmethod
    def verify_passcode(passcode_input, passcode_hash):
        """Verify the passcode against the stored hash."""
        return bcrypt.check_password_hash(passcode_hash, passcode_input)



    @staticmethod
    def hash_passcode(passcode):
        """Hash the passcode before storing."""
        return bcrypt.generate_password_hash(passcode)
    
    @staticmethod
    def log_last_login(user_id):
        """
        Logs the last login time for a user in the database.
        """
        query = """
            UPDATE users
            SET last_login = %(last_login)s
            WHERE id = %(id)s;
        """
        data = {
            'last_login': datetime.now(),
            'id': user_id
        }
        connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    

    @classmethod
    def get_users_by_system(cls, system_id):
        """
        Fetch all users associated with a specific system from the database.
        """
        query = """
            SELECT id, first_name, last_name, email, role, is_temp_password, last_login
            FROM users
            WHERE system_id = %(system_id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'system_id': system_id})
    
    
    # User Model: flask_app/models/user.py
    @classmethod
    def delete_user(cls, user_id):
        """
        Delete a user by their ID.
        """
        query = "DELETE FROM users WHERE id = %(user_id)s;"
        connectToMySQL('maria_ortegas_project_schema').query_db(query, {'user_id': user_id})
        return True

