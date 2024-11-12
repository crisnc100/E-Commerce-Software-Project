from flask_app.config.mysqlconnection import connectToMySQL

class Size:
    def __init__(self, data):
        self.id = data.get('id')
        self.product_id = data.get('product_id')
        self.size = data.get('size')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def serialize(self):
        return{
            'id': self.id,
            'product_id': self.product_id,
            'size': self.size,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
        }

    ### CRUD Methods ###

    @classmethod
    def save(cls, data):
        """Create a new size record for a product."""
        query = """
        INSERT INTO sizes (product_id, size, created_at, updated_at) 
        VALUES (%(product_id)s, %(size)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_by_id(cls, size_id):
        """Retrieve a size by its ID."""
        query = "SELECT * FROM sizes WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': size_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls):
        """Retrieve all sizes."""
        query = "SELECT * FROM sizes;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing size record."""
        query = """
        UPDATE sizes 
        SET size = %(size)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, size_id):
        """Delete a size record."""
        query = "DELETE FROM sizes WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': size_id})

    ### Additional Methods ###

    @classmethod
    def get_sizes_by_product(cls, product_id):
        """Retrieve all sizes for a specific product."""
        query = "SELECT * FROM sizes WHERE product_id = %(product_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'product_id': product_id})
        return [cls(row) for row in results]

    @classmethod
    def delete_sizes_by_product(cls, product_id):
        """Delete all sizes for a specific product."""
        query = "DELETE FROM sizes WHERE product_id = %(product_id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db({'product_id': product_id})