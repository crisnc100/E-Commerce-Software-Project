from flask_app.config.mysqlconnection import connectToMySQL
from flask_bcrypt import Bcrypt
from flask_app import app
from flask_app.utils.session_helper import SessionHelper
from flask import request, jsonify, session


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
    def create_user(cls, data):
        """Create a user record."""
        query = """
        INSERT INTO users (first_name, last_name, email, passcode_hash, system_id, role, created_at, updated_at)
        VALUES (%(first_name)s, %(last_name)s, %(email)s, %(passcode_hash)s, %(system_id)s, 'user', NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

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
    def update_passcode(cls, data):
        """Update the user's passcode."""
        query = """
        UPDATE users SET passcode_hash = %(passcode_hash)s, updated_at = NOW()
        WHERE id = %(id)s;
        """
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
