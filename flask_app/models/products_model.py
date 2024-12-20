from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper

class Product:
    def __init__(self, data):
        self.id = data.get('id')
        self.name = data.get('name')
        self.screenshot_photo = data.get('screenshot_photo')
        self.description = data.get('description')
        self.price = data.get('price')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.system_id = data.get('system_id')
    
    def serialize(self):
        return{
            'id': self.id,
            'name': self.name,
            'screenshot_photo': self.screenshot_photo if self.screenshot_photo else None,
            'description': self.description,
            'price': self.price,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
            'system_id': self.system_id,
        }

    @classmethod
    def save(cls, data):
        """Create a new product record."""
        query = """
        INSERT INTO products (name, screenshot_photo, description, price, created_at, updated_at, system_id) 
        VALUES (%(name)s, %(screenshot_photo)s, %(description)s, %(price)s, NOW(), NOW(), %(system_id)s);
        """
        data['system_id'] = SessionHelper.get_system_id()
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_by_id(cls, product_id):
        """Retrieve a product by its ID."""
        query = "SELECT * FROM products WHERE id = %(id)s AND system_id = %(system_id)s;"
        data = {'id': product_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls, page=1, search=None):
        """Retrieve all products with optional search and pagination."""
        limit = 12
        offset = (page - 1) * limit
        base_query = "SELECT * FROM products WHERE system_id = %(system_id)s"
        count_query = "SELECT COUNT(*) AS total FROM products WHERE system_id = %(system_id)s"
        params = {'system_id': SessionHelper.get_system_id(), 'limit': limit, 'offset': offset}

        if search and search.strip():
            base_query += " AND name LIKE %(search)s"
            count_query += " AND name LIKE %(search)s"
            params['search'] = f"%{search.strip()}%"

        # Main query with LIMIT/OFFSET
        query = f"{base_query} LIMIT %(limit)s OFFSET %(offset)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        # Count query for pagination
        total_count = connectToMySQL('maria_ortegas_project_schema').query_db(count_query, params)[0]['total']

        if not results:
            return [], 0

        return [cls(row) for row in results], total_count




    @classmethod
    def update(cls, data):
        """Update an existing product's information."""
        try:
            data['system_id'] = SessionHelper.get_system_id()
            query = """
            UPDATE products 
            SET name = %(name)s, screenshot_photo = %(screenshot_photo)s, description = %(description)s, 
            price = %(price)s, updated_at = NOW() 
            WHERE products.id = %(id)s AND products.system_id = %(system_id)s;
            """
            return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        except Exception as e:
            print(f"Error updating payment: {e}")
            return {"error": "An error occurred"}, 500


    @classmethod
    def delete(cls, product_id):
        """Delete a product record."""
        query = "DELETE FROM products WHERE id = %(id)s AND system_id = %(system_id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': product_id, 'system_id': SessionHelper.get_system_id()})

    ### Search and Filtering Methods ###

    @classmethod
    def search_by_name(cls, name):
        """
        Search for products by name (partial matches allowed).
        :param name: The partial name to search.
        :return: List of matching products.
        """
        query = """
        SELECT id, name, description, screenshot_photo
        FROM products
        WHERE system_id = %s AND name LIKE %s;
        """
        data = (SessionHelper.get_system_id(), f"%{name}%")
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return results 

    @classmethod
    def is_duplicate_screenshot(cls, screenshot_photo_url):
        """Check if the screenshot photo URL already exists in the database."""
        query = "SELECT COUNT(*) AS count FROM products WHERE screenshot_photo = %(screenshot_photo)s AND system_id = %(system_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'screenshot_photo': screenshot_photo_url, 'system_id': SessionHelper.get_system_id()})
        return result[0]['count'] > 0  # Returns True if duplicate exists
    
    @classmethod
    def get_recent_products(cls, since_date):
        query = """
        SELECT 'Add Product' AS action, name AS details, created_at
        FROM products
        WHERE products.created_at >= %s AND products.system_id = %s
        ORDER BY created_at DESC;
        """
        data = (since_date, SessionHelper.get_system_id())
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        if isinstance(result, tuple):
            result = list(result)
        return result
    

    


