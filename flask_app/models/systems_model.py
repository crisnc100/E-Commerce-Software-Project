from flask_app.config.mysqlconnection import connectToMySQL
from cryptography.fernet import Fernet
import requests

from dotenv import load_dotenv
import os

load_dotenv()  # Load environment variables from .env file
PAYPAL_ENCRYPTION_KEY = os.getenv('PAYPAL_ENCRYPTION_KEY')

if not PAYPAL_ENCRYPTION_KEY:
    raise ValueError("Encryption key is missing. Please set PAYPAL_ENCRYPTION_KEY in the environment.")
cipher = Fernet(PAYPAL_ENCRYPTION_KEY.encode())



class System:
    def __init__(self, data):
        self.id = data.get('id')
        self.owner_id = data.get('owner_id')
        self.name = data.get('name')
        self.paypal_client_id = data.get('paypal_client_id')
        self.paypal_secret = data.get('paypal_secret')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    # Create a new system
    @classmethod
    def create_system(cls, name, owner_id):
        """Create a new system and return the ID."""
        query = """
        INSERT INTO systems (name, owner_id, created_at, updated_at)
        VALUES (%(name)s, %(owner_id)s, NOW(), NOW());
        """
        data = {'name': name, 'owner_id': owner_id}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @classmethod
    def system_name_exists(cls, name):
        """Check if a system name already exists."""
        query = "SELECT * FROM systems WHERE name = %(name)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'name': name})
        return bool(result)
    
  
    @classmethod
    def get_system(cls):
        """Fetch the system entry if it exists."""
        query = "SELECT * FROM systems LIMIT 1;"  # Assuming a single system setup
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return result[0] if result else None


    # Get a system by its ID
    @classmethod
    def get_system_by_id(cls, system_id):
        """Retrieve a system by its ID."""
        query = "SELECT * FROM systems WHERE id = %(system_id)s;"
        data = {'system_id': system_id}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return cls(results[0]) if results else None

    # Update system ownership (for creating an admin user)
    @classmethod
    def update_owner(cls, system_id, owner_id):
        """Update the owner of a system."""
        query = """
        UPDATE systems SET owner_id = %(owner_id)s, updated_at = NOW()
        WHERE id = %(system_id)s;
        """
        data = {'system_id': system_id, 'owner_id': owner_id}
        connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    


    @staticmethod
    def validate_paypal_credentials_format(client_id, secret):
        """
        Validates the basic format of PayPal client ID and secret.
        """
        if not client_id or not secret:
            raise ValueError("PayPal client ID and secret cannot be empty.")
        
        if len(client_id) < 40 or len(secret) < 40:
            raise ValueError("PayPal credentials appear to be invalid in length.")
        
        return True

    @staticmethod
    def encrypt_data(data):
        """
        Encrypts data using Fernet encryption.
        """
        return cipher.encrypt(data.encode())

    @staticmethod
    def decrypt_data(encrypted_data):
        """
        Decrypts data using Fernet encryption.
        """
        return cipher.decrypt(encrypted_data).decode()


    @staticmethod
    def validate_with_paypal_api(client_id, secret):
        """
        Validates PayPal credentials by attempting to obtain an OAuth token.
        """
        validation_url = "https://api-m.sandbox.paypal.com/v1/oauth2/token"
        headers = {
            "Accept": "application/json",
            "Accept-Language": "en_US"
        }
        try:
            response = requests.post(
                validation_url,
                headers=headers,
                auth=(client_id, secret),
                data={"grant_type": "client_credentials"}
            )
            if response.status_code != 200:
                raise ValueError(
                    f"Invalid PayPal credentials: {response.json().get('error_description', 'Unknown error')}"
                )
        except requests.RequestException as e:
            raise ValueError(f"Network error during PayPal validation: {str(e)}")


    @classmethod
    def update_paypal_credentials(cls, system_id, paypal_client_id, paypal_secret):
        # Step 1: Validate the format
        cls.validate_paypal_credentials_format(paypal_client_id, paypal_secret)

        # Step 2: Validate with PayPal API
        cls.validate_with_paypal_api(paypal_client_id, paypal_secret)

        # Step 3: Encrypt the credentials
        encrypted_client_id = cls.encrypt_data(paypal_client_id)
        encrypted_secret = cls.encrypt_data(paypal_secret)

        # Step 4: Update the database
        query = """
        UPDATE systems
        SET paypal_client_id = %(paypal_client_id)s, paypal_secret = %(paypal_secret)s
        WHERE id = %(system_id)s
        """
        data = {
            'system_id': system_id,
            'paypal_client_id': encrypted_client_id,
            'paypal_secret': encrypted_secret
        }
        connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def has_paypal_credentials(cls, system_id):
        """
        Check if the system has PayPal credentials stored.
        """
        query = """
        SELECT paypal_client_id, paypal_secret
        FROM systems
        WHERE id = %(system_id)s
        """
        data = {'system_id': system_id}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        if not result:
            return False  # System not found

        # Check if both client_id and secret are present
        record = result[0]
        return record['paypal_client_id'] and record['paypal_secret']

    

    @classmethod
    def delete_system(cls, system_id):
        """
        Delete a system by ID
        """
        query = "DELETE FROM systems WHERE id = %(system_id)s;"
        connectToMySQL('maria_ortegas_project_schema').query_db(query, {'system_id': system_id})
        return True


    @classmethod
    def get_all_system_ids(cls):
        """Fetch all system IDs from the database."""
        query = "SELECT id FROM systems;"
        try:
            results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
            return [row['id'] for row in results]
        except Exception as e:
            print(f"Error fetching system IDs: {e}")
            return []
