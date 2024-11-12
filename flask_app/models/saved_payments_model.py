from flask_app.config.mysqlconnection import connectToMySQL
from cryptography.fernet import Fernet
from datetime import datetime
import os


# Assuming an environment variable or some secure way to handle encryption keys
encryption_key = os.getenv('ENCRYPTION_KEY')
cipher_suite = Fernet(encryption_key)

class SavedPayment:
    def __init__(self, data):
        self.id = data.get('id')
        self.client_id = data.get('client_id')
        self.encrypted_card_number = data.get('encrypted_card_number')
        self.card_last_four = data.get('card_last_four')
        self.card_type = data.get('card_type')
        self.expiration_date = data.get('expiration_date')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    def serialize(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'encrypted_card_number': self.encrypted_card_number,
            'card_last_four': self.card_last_four,
            'card_type': self.card_type,
            'expiration_date': self.expiration_date,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
        }
    
    @staticmethod
    def encrypt_card_number(card_number):
        """Encrypt the card number before storing."""
        return cipher_suite.encrypt(card_number.encode()).decode()

    @staticmethod
    def decrypt_card_number(encrypted_card_number):
        """Decrypt the card number when needed."""
        return cipher_suite.decrypt(encrypted_card_number.encode()).decode()

    ### CRUD Methods ###

    @classmethod
    def save(cls, data):
        """Save a new payment method with encrypted card number."""
        # Encrypt the card number
        encrypted_card = cls.encrypt_card_number(data['card_number'])
        
        # Prepare the data with encrypted card number and last four digits
        query_data = {
            'client_id': data['client_id'],
            'encrypted_card_number': encrypted_card,
            'card_last_four': data['card_number'][-4:],
            'card_type': data['card_type'],
            'expiration_date': data['expiration_date']
        }
        
        query = """
        INSERT INTO saved_payments (client_id, encrypted_card_number, card_last_four, 
        card_type, expiration_date, created_at, updated_at) 
        VALUES (%(client_id)s, %(encrypted_card_number)s, %(card_last_four)s, 
        %(card_type)s, %(expiration_date)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, query_data)

    @classmethod
    def get_by_id(cls, saved_payment_id):
        """Retrieve a saved payment by its ID."""
        query = "SELECT * FROM saved_payments WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': saved_payment_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls):
        """Retrieve all saved payment methods."""
        query = "SELECT * FROM saved_payments;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing saved payment record."""
        # Re-encrypt the card number if it's being updated
        encrypted_card = cls.encrypt_card_number(data['card_number']) if 'card_number' in data else None
        
        query_data = {
            'id': data['id'],
            'client_id': data['client_id'],
            'encrypted_card_number': encrypted_card,
            'card_last_four': data['card_number'][-4:] if 'card_number' in data else None,
            'card_type': data['card_type'],
            'expiration_date': data['expiration_date']
        }
        
        query = """
        UPDATE saved_payments 
        SET client_id = %(client_id)s, encrypted_card_number = COALESCE(%(encrypted_card_number)s, encrypted_card_number), 
        card_last_four = COALESCE(%(card_last_four)s, card_last_four), 
        card_type = %(card_type)s, expiration_date = %(expiration_date)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, query_data)

    @classmethod
    def delete(cls, saved_payment_id):
        """Delete a saved payment record."""
        query = "DELETE FROM saved_payments WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': saved_payment_id})

    ### Additional Methods ###

    @classmethod
    def get_saved_payments_by_client(cls, client_id):
        """Retrieve all saved payments for a specific client."""
        query = "SELECT * FROM saved_payments WHERE client_id = %(client_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'client_id': client_id})
        return [cls(row) for row in results]

    @classmethod
    def update_expiration_date(cls, saved_payment_id, new_expiration_date):
        """Update the expiration date for a specific saved payment."""
        query = """
        UPDATE saved_payments SET expiration_date = %(expiration_date)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db({
            'id': saved_payment_id, 'expiration_date': new_expiration_date
        })
    
