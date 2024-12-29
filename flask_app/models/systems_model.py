from flask_app.config.mysqlconnection import connectToMySQL

class System:
    def __init__(self, data):
        self.id = data.get('id')
        self.owner_id = data.get('owner_id')
        self.name = data.get('name')
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
