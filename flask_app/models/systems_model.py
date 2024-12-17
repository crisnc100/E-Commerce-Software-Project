from flask_app.config.mysqlconnection import connectToMySQL

class System:
    def __init__(self, data):
        self.id = data.get('id')
        self.owner_id = data.get('owner_id')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')

    # Create a new system
    @classmethod
    def create_system(cls, owner_id):
        """Create a new system and return the system ID."""
        query = """
        INSERT INTO systems (owner_id, created_at, updated_at)
        VALUES (%(owner_id)s, NOW(), NOW());
        """
        data = {'owner_id': owner_id}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
  
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
