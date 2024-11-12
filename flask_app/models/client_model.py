from flask_app.config.mysqlconnection import connectToMySQL
import re
from datetime import datetime

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+$')
PHONE_REGEX = re.compile(r'^\d{3}-\d{3}-\d{4}$')


class Client:
    def __init__(self, data):
        self.id = data['id']
        self.first_name = data['first_name']
        self.last_name = data['last_name']
        self.contact_method = data['contact_method']
        self.contact_details = data['contact_details']
        self.preferred_payment_method = data['preferred_payment_method']
        self.additional_notes = data['additional_notes']
        self.created_at = data['created_at']
        self.updated_at = data['updated_at']
    
    def serialize(self):
        return{
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "contact_method": self.contact_method,
            "contact_details": self.contact_details,
            "preferred_payment_method": self.preferred_payment_method,
            "additional_notes": self.additional_notes,
            "created_at": str(self.created_at), 
            "updated_at": str(self.updated_at),
        }
    #SAVE
    @classmethod
    def save(cls, data):
        query = """INSERT INTO clients (first_name, last_name, contact_method, contact_details, 
        preferred_payment_method, additional_notes, created_at, updated_at) 
        VALUES (%(first_name)s, %(last_name)s, %(contact_method)s, %(contact_details)s, 
        %(preferred_payment_method)s, %(additional_notes)s, NOW(), NOW());"""
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @staticmethod
    def is_valid(data):
        is_valid = True
        if not EMAIL_REGEX.match(data['contact_details']):
            is_valid = False
        if not PHONE_REGEX.match(data['contact_details']):
            is_valid = False
        return is_valid


    @classmethod
    def get_by_id(cls, client_id):
        """Retrieve a client by ID."""
        query = "SELECT * FROM clients WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': client_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls):
        """Retrieve all clients."""
        query = "SELECT * FROM clients;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update a client's information."""
        query = """
        UPDATE clients 
        SET first_name = %(first_name)s, last_name = %(last_name)s, contact_method = %(contact_method)s, 
        contact_details = %(contact_details)s, preferred_payment_method = %(preferred_payment_method)s,
        additional_notes = %(additional_notes)s, 
        updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, client_id):
        """Delete a client record."""
        query = "DELETE FROM clients WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': client_id})

    ### Search and Validation Methods ###

    @classmethod
    def search_by_name(cls, name):
        """Search clients by name."""
        query = "SELECT * FROM clients WHERE first_name LIKE %(name)s OR last_name LIKE %(name)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'name': f"%{name}%"})
        return [cls(row) for row in results]

    @staticmethod
    def is_valid(data):
        """Validate client data before saving or updating."""
        is_valid = True
        if len(data['first_name']) < 2:
            is_valid = False
        if len(data['last_name']) < 2:
            is_valid = False
        if data['contact_method'] not in ['Instagram', 'Facebook', 'WhatsApp']:
            is_valid = False
        if not EMAIL_REGEX.match(data['contact_details']) and not PHONE_REGEX.match(data['contact_details']):
            is_valid = False
        return is_valid

    ### Additional Methods for Business Logic ###

    @classmethod
    def get_clients_with_purchases(cls):
        """Retrieve all clients with their purchase history."""
        query = """
        SELECT clients.*, purchases.*
        FROM clients
        JOIN purchases ON clients.id = purchases.client_id;
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        # Process results to return client with purchase details
        clients = {}
        for row in results:
            if row['id'] not in clients:
                clients[row['id']] = cls(row)  # Create client entry if not exists
            # Add purchase info (implement as needed)
        return clients

    @classmethod
    def update_contact_details(cls, client_id, new_contact_details):
        """Update only the contact details for a client."""
        query = """
        UPDATE clients SET contact_details = %(contact_details)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {
            'id': client_id, 'contact_details': new_contact_details
        })