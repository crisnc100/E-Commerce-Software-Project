from flask_app.config.mysqlconnection import connectToMySQL
import re
from datetime import datetime

EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9.+_-]+@[a-zA-Z0-9._-]+\.[a-zA-Z]+$')
PHONE_REGEX = re.compile(r'^\d{10}$')


class Client:
    def __init__(self, data):
        self.id = data.get('id')
        self.first_name = data.get('first_name')
        self.last_name = data.get('last_name')
        self.contact_method = data.get('contact_method')
        self.contact_details = data.get('contact_details')
        self.additional_notes = data.get('additional_notes')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def serialize(self):
        return{
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "contact_method": self.contact_method,
            "contact_details": self.contact_details,
            "additional_notes": self.additional_notes,
            "created_at": str(self.created_at), 
            "updated_at": str(self.updated_at),
        }
    #SAVE
    @classmethod
    def save(cls, data):
        query = """INSERT INTO clients (first_name, last_name, contact_method, contact_details, additional_notes, created_at, updated_at) 
        VALUES (%(first_name)s, %(last_name)s, %(contact_method)s, %(contact_details)s, %(additional_notes)s, NOW(), NOW());"""
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @staticmethod
    def is_valid(data):
        print("Entered is_valid method")
        try:
            contact_method = (data.get('contact_method', '') or '').strip().lower()
            contact_details = (data.get('contact_details', '') or '').strip()

            print(f"contact_method: '{contact_method}'")
            print(f"contact_details: '{contact_details}'")

            errors = []

            if not contact_details:
                errors.append("Contact details are required.")
                print("Validation error: Contact details are required.")

            if contact_method == 'email':
                if not EMAIL_REGEX.match(contact_details):
                    errors.append("Invalid email address.")
                    print("Validation error: Invalid email address.")
            elif contact_method == 'phone':
                if not PHONE_REGEX.match(contact_details):
                    errors.append("Invalid phone number. It must be exactly 10 digits.")
                    print("Validation error: Invalid phone number.")
            else:
                errors.append("Invalid contact method. Must be 'email' or 'phone'.")
                print("Validation error: Invalid contact method.")

            if errors:
                for error in errors:
                    print(f"Validation error: {error}")
                return False

            print("Validation passed")
            return True
        except Exception as e:
            print(f"Exception in is_valid method: {e}")
            return False



    @classmethod
    def get_by_id(cls, client_id):
        """Retrieve a client by ID."""
        query = "SELECT * FROM clients WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': client_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls, page=1):
        """Retrieve all clients."""
        limit = 20
        offset = (page - 1) * limit
        query = """
                SELECT SQL_CALC_FOUND_ROWS * FROM clients
                ORDER BY last_name, first_name
                LIMIT %(limit)s OFFSET %(offset)s;"""  # Changed per_page to limit

        params = {'limit': limit, 'offset': offset}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        # Check if query_db returns valid results
        if not results:
            return [], 0

        # Get the total count of clients
        count_query = "SELECT FOUND_ROWS() AS total;"
        total_count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query)
        total_count = total_count_result[0]['total'] if total_count_result else 0

        return [cls(row) for row in results], total_count


    @classmethod
    def update(cls, data):
        """Update a client's information."""
        query = """
        UPDATE clients 
        SET first_name = %(first_name)s, last_name = %(last_name)s, contact_method = %(contact_method)s, 
        contact_details = %(contact_details)s, additional_notes = %(additional_notes)s, 
        updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, client_id):
        # Check if the client exists
        select_query = "SELECT id FROM clients WHERE id = %(id)s;"
        data = {'id': client_id}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(select_query, data)
        
        if not result:
            # Client does not exist
            return False
        
        # Delete the client
        delete_query = "DELETE FROM clients WHERE id = %(id)s;"
        connectToMySQL('maria_ortegas_project_schema').query_db(delete_query, data)
        return True


    ### Search and Validation Methods ###

    @classmethod
    def get_all(cls, page=1, search=None):
        limit = 20
        offset = (page - 1) * limit

        base_query = "SELECT SQL_CALC_FOUND_ROWS * FROM clients"
        params = {'limit': limit, 'offset': offset}

        if search and search.strip():
            # Implement server-side search logic
            name_parts = search.strip().split()
            search_conditions = []
            for i, part in enumerate(name_parts):
                search_conditions.append(
                    f"(first_name LIKE %(part_{i})s OR last_name LIKE %(part_{i})s)"
                )
                params[f"part_{i}"] = f"%{part}%"
            where_clause = " WHERE " + " AND ".join(search_conditions)
            query = f"{base_query} {where_clause} ORDER BY last_name, first_name LIMIT %(limit)s OFFSET %(offset)s;"
        else:
            # No search, original logic
            query = f"{base_query} ORDER BY last_name, first_name LIMIT %(limit)s OFFSET %(offset)s;"

        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        if not results:
            return [], 0

        count_query = "SELECT FOUND_ROWS() AS total;"
        total_count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query)
        total_count = total_count_result[0]['total'] if total_count_result else 0

        return [cls(row) for row in results], total_count



    @staticmethod
    def is_valid(data):
        """Validate client data before saving or updating."""
        is_valid = True
        if len(data['first_name']) < 2:
            is_valid = False
        if len(data['last_name']) < 2:
            is_valid = False
        if data['contact_method'] not in ['email', 'phone']:
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
    