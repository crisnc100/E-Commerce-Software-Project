from flask_app.config.mysqlconnection import connectToMySQL
from flask_bcrypt import Bcrypt
from flask_app import app

bcrypt = Bcrypt(app)  # Initialize bcrypt

class Admin:
    def __init__(self, data):
        self.id = data.get('id')
        self.email = data.get('email')
        self.passcode_hash = data.get('passcode_hash')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    ### Class Methods ###
    
    @classmethod
    def get_admin(cls):
        """Retrieve the admin record."""
        query = "SELECT * FROM admin LIMIT 1;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return cls(result[0]) if result else None

    @classmethod
    def create_admin(cls, data):
        """Create the admin record."""
        query = """
        INSERT INTO admin (email, passcode_hash, created_at, updated_at)
        VALUES (%(email)s, %(passcode_hash)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def update_passcode(cls, data):
        """Update the admin passcode."""
        query = """
        UPDATE admin SET passcode_hash = %(passcode_hash)s, updated_at = NOW()
        WHERE id = %(id)s;
        """
        connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    ### Validation and Authentication ###
    
    @staticmethod
    def validate_passcode(passcode):
        """Validate the passcode strength (if needed)."""
        is_valid = True
        if len(passcode) < 6:
            is_valid = False
        return is_valid

    @staticmethod
    def verify_passcode(passcode_input, passcode_hash):
        """Verify the passcode against the stored hash."""
        return bcrypt.check_password_hash(passcode_hash, passcode_input)

    @staticmethod
    def hash_passcode(passcode):
        """Hash the passcode before storing."""
        return bcrypt.generate_password_hash(passcode)
