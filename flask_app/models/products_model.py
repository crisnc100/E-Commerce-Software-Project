from flask_app.config.mysqlconnection import connectToMySQL

class Product:
    def __init__(self, data):
        self.id = data.get('id')
        self.name = data.get('name')
        self.screenshot_photo = data.get('screenshot_photo')
        self.description = data.get('description')
        self.price = data.get('price')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def serialize(self):
        return{
            'id': self.id,
            'name': self.name,
            'screenshot_photo': self.screenshot_photo if self.screenshot_photo else None,
            'description': self.description,
            'price': self.price,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
        }

    @classmethod
    def save(cls, data):
        """Create a new product record."""
        query = """
        INSERT INTO products (name, screenshot_photo, description, price, created_at, updated_at) 
        VALUES (%(name)s, %(screenshot_photo)s, %(description)s, %(price)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_by_id(cls, product_id):
        """Retrieve a product by its ID."""
        query = "SELECT * FROM products WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': product_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls, page=1, search=None):
        limit = 12
        offset = (page - 1) * limit
        base_query = "SELECT * FROM products"
        params = {'limit': limit, 'offset': offset}

        if search and search.strip():
            base_query += " WHERE name LIKE %(search)s"
            params['search'] = f"%{search.strip()}%"

        # Main query with LIMIT/OFFSET
        query = f"{base_query} LIMIT %(limit)s OFFSET %(offset)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        # Count query
        if search and search.strip():
            count_query = "SELECT COUNT(*) AS total FROM products WHERE name LIKE %(search)s"
        else:
            count_query = "SELECT COUNT(*) AS total FROM products"
        total_count = connectToMySQL('maria_ortegas_project_schema').query_db(count_query, params)[0]['total']

        if not results:
            return [], 0

        return [cls(row) for row in results], total_count



    @classmethod
    def update(cls, data):
        """Update an existing product's information."""
        query = """
        UPDATE products 
        SET name = %(name)s, screenshot_photo = %(screenshot_photo)s, description = %(description)s, 
        price = %(price)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, product_id):
        """Delete a product record."""
        query = "DELETE FROM products WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': product_id})

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
        WHERE name LIKE %s;
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, [f"%{name}%"])
        return results

    @classmethod
    def filter_by_price_range(cls, min_price, max_price):
        """Filter products within a specified price range."""
        query = "SELECT * FROM products WHERE price BETWEEN %(min_price)s AND %(max_price)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'min_price': min_price, 'max_price': max_price})
        return [cls(row) for row in results]

    ### Additional Methods for Business Logic ###

    @classmethod
    def get_products_with_sizes(cls):
        """Retrieve all products along with their available sizes."""
        query = """
        SELECT products.*, sizes.size
        FROM products
        JOIN sizes ON products.id = sizes.product_id;
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        
        # Organize products with sizes
        products = {}
        for row in results:
            if row['id'] not in products:
                products[row['id']] = {
                    'product': cls(row),
                    'sizes': []
                }
            products[row['id']]['sizes'].append(row['size'])
        return products

    @classmethod
    def update_price(cls, product_id, new_price):
        """Update only the price of a specific product."""
        query = """
        UPDATE products SET price = %(price)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': product_id, 'price': new_price})

    @classmethod
    def update_description(cls, product_id, new_description):
        """Update only the description of a specific product."""
        query = """
        UPDATE products SET description = %(description)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': product_id, 'description': new_description})
    

    @classmethod
    def is_duplicate_screenshot(cls, screenshot_photo_url):
        """Check if the screenshot photo URL already exists in the database."""
        query = "SELECT COUNT(*) AS count FROM products WHERE screenshot_photo = %(screenshot_photo)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'screenshot_photo': screenshot_photo_url})
        return result[0]['count'] > 0  # Returns True if duplicate exists
