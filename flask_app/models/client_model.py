from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper
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
        self.system_id = data.get('system_id')
    
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
            "system_id": self.system_id
        }
    #SAVE
    @classmethod
    def save(cls, data):
        """Save a new client with system_id."""
        query = """
        INSERT INTO clients (first_name, last_name, contact_method, contact_details, additional_notes, created_at, updated_at, system_id) 
        VALUES (%(first_name)s, %(last_name)s, %(contact_method)s, %(contact_details)s, %(additional_notes)s, NOW(), NOW(), %(system_id)s);
        """
        # Add system_id from SessionHelper dynamically
        data['system_id'] = SessionHelper.get_system_id()
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @staticmethod
    def is_valid(data):
        """Validate client data before saving or updating."""
        errors = []
        contact_method = (data.get('contact_method', '') or '').strip().lower()
        contact_details = (data.get('contact_details', '') or '').strip()

        if not contact_details:
            errors.append("Contact details are required.")

        if contact_method == 'email':
            if not EMAIL_REGEX.match(contact_details):
                errors.append("Invalid email address.")
        elif contact_method == 'phone':
            # Allow any input for phone numbers
            if not contact_details:  # Only ensure it's not empty
                errors.append("Phone number is required.")
        else:
            errors.append("Invalid contact method. Must be 'email' or 'phone'.")

        if errors:
            print("Validation Errors:", errors)
            return False

        return True




    @classmethod
    def get_by_id(cls, client_id):
        """Retrieve a single client by ID for the current system."""
        query = """
        SELECT * FROM clients 
        WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {'id': client_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls, page=1, search=None):
        limit = 20
        offset = (page - 1) * limit

        base_query = "SELECT SQL_CALC_FOUND_ROWS * FROM clients WHERE system_id = %(system_id)s"
        params = {'system_id': SessionHelper.get_system_id(), 'limit': limit, 'offset': offset}

        if search and search.strip():
            # Add search logic
            name_parts = search.strip().split()
            search_conditions = []
            for i, part in enumerate(name_parts):
                search_conditions.append(
                    f"(first_name LIKE %(part_{i})s OR last_name LIKE %(part_{i})s)"
                )
                params[f"part_{i}"] = f"%{part}%"
            where_clause = " AND " + " AND ".join(search_conditions)
            query = f"{base_query} {where_clause} ORDER BY last_name, first_name LIMIT %(limit)s OFFSET %(offset)s;"
        else:
            query = f"{base_query} ORDER BY last_name, first_name LIMIT %(limit)s OFFSET %(offset)s;"

        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        if not results:
            return [], 0

        # Get total count
        count_query = "SELECT FOUND_ROWS() AS total;"
        total_count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query)
        total_count = total_count_result[0]['total'] if total_count_result else 0

        return [cls(row) for row in results], total_count


    @classmethod
    def update(cls, data):
        """Update a client's information with system validation."""
        query = """
        UPDATE clients 
        SET first_name = %(first_name)s, last_name = %(last_name)s, contact_method = %(contact_method)s, 
            contact_details = %(contact_details)s, additional_notes = %(additional_notes)s, updated_at = NOW()
        WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data['system_id'] = SessionHelper.get_system_id()
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, client_id):
        # Check if the client exists
        select_query = "SELECT id FROM clients WHERE id = %(id)s AND system_id = %(system_id)s;"
        data = {'id': client_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(select_query, data)
        
        if not result:
            # Client does not exist
            return False
        
        # Delete the client
        delete_query = "DELETE FROM clients WHERE id = %(id)s AND system_id = %(system_id)s;"
        connectToMySQL('maria_ortegas_project_schema').query_db(delete_query, data)
        return True


    ### Search and Validation Methods ###

    @classmethod
    def search_by_name(cls, name):
        name_parts = name.strip().split()
        query = """
        SELECT id, first_name, last_name
        FROM clients
        WHERE system_id = %s AND (first_name LIKE %s OR last_name LIKE %s)
        """
        params = [SessionHelper.get_system_id(), f"%{name_parts[0]}%", f"%{name_parts[0]}%"]
        for part in name_parts[1:]:
            query += " AND (first_name LIKE %s OR last_name LIKE %s)"
            params.extend([f"%{part}%", f"%{part}%"])
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)
        return results


    ### Additional Methods for Business Logic ###

    @classmethod
    def get_clients_with_purchases(cls):
        """Retrieve all clients with their purchase history."""
        query = """
        SELECT clients.*, purchases.*
        FROM clients
        JOIN purchases ON clients.id = purchases.client_id;
        WHERE clients.system_id = %(system_id)s;
        """
        data = {'system_id': SessionHelper.get_system_id()}

        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        # Process results to return client with purchase details
        clients = {}
        for row in results:
            if row['id'] not in clients:
                clients[row['id']] = cls(row)  # Create client entry if not exists
            # Add purchase info (implement as needed)
        return clients
    
    @classmethod
    def get_recent_clients(cls, since_date):
        query = """
        SELECT 'Add Client' AS action, CONCAT(first_name, ' ', last_name) AS details, created_at
        FROM clients
        WHERE clients.created_at >= %s AND clients.system_id = %s
        ORDER BY created_at DESC;
        """
        data = (since_date, SessionHelper.get_system_id())
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        if isinstance(result, tuple):
            result = list(result)
        return result

    

    @classmethod
    def count_new_clients_last_week(cls):
        query = """
        SELECT COUNT(*) AS new_clients
        FROM clients
        WHERE system_id = %(system_id)s AND created_at >= CURDATE() - INTERVAL 7 DAY;
        """
        data = {'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        print(f"Clients Metrics (weekly) Query Result: {result}")  # Debug print

        return result[0]['new_clients'] if result else 0
    

    @classmethod
    def count_new_clients_monthly(cls, year,):
        query = """
        SELECT MONTH(created_at) AS month, COUNT(*) AS new_clients
        FROM clients
        WHERE system_id = %s AND YEAR(created_at) = %s
        GROUP BY MONTH(created_at)
        ORDER BY MONTH(created_at);
        """
        data = (SessionHelper.get_system_id(), year)
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        print(f"New Clients (monthly) Query Result: {result}")  # Debug print

        return [
            {'month': row['month'], 'new_clients': row['new_clients']}
            for row in result
        ] if result else []
    

    @classmethod
    def count_single_monthly_new_clients(cls, year, month):
        query = """
        SELECT COUNT(*) AS new_clients
        FROM clients
        WHERE system_id = %s AND YEAR(created_at) = %s
        AND MONTH(created_at) = %s;
        """
        data = (SessionHelper.get_system_id(), year, month)
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return result[0]['new_clients'] if result else 0



    @classmethod
    def count_new_clients_yearly(cls, year=None):
        query = """
        SELECT YEAR(created_at) AS year, COUNT(*) AS new_clients
        FROM clients
        {}
        GROUP BY YEAR(created_at)
        ORDER BY YEAR(created_at);
        """
        where_clause = "WHERE system_id = %s"
        data = [SessionHelper.get_system_id()]
        if year:
            where_clause += "AND YEAR(created_at) = %s"
            data.append(year)
        
        query = query.format(where_clause)
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        print(f"New Clients (yearly) Query Result: {result}")  # Debug print

        return [
            {'year': row['year'], 'new_clients': row['new_clients']}
            for row in result
        ] if result else []






    