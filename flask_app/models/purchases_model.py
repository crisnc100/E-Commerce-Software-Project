from flask_app.config.mysqlconnection import connectToMySQL

class Purchase:
    def __init__(self, data):
        self.id = data.get('id')
        self.client_id = data.get('client_id')
        self.product_id = data.get('product_id')
        self.size = data.get('size')
        self.purchase_date = data.get('purchase_date')
        self.amount = data.get('amount')
        self.payment_status = data.get('payment_status')
        self.shipping_status = data.get('shipping_status')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def serialize(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'product_id': self.product_id,
            'size': self.size,
            'purchase_date': self.purchase_date,
            'amount': self.amount,
            'payment_status': self.payment_status,
            'shipping_status': self.shipping_status,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
        }
    

    @classmethod
    def save(cls, data):
        """Create a new purchase record."""
        query = """
        INSERT INTO purchases (client_id, product_id, size, purchase_date, amount, payment_status, shipping_status, created_at, updated_at) 
        VALUES (%(client_id)s, %(product_id)s, %(size)s, %(purchase_date)s, %(amount)s, %(payment_status)s, %(shipping_status)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_by_id(cls, purchase_id):
        """Retrieve a purchase by its ID."""
        query = "SELECT * FROM purchases WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': purchase_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls):
        """Retrieve all purchases."""
        query = "SELECT * FROM purchases;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing purchase record."""
        query = """
        UPDATE purchases 
        SET client_id = %(client_id)s, product_id = %(product_id)s, size = %(size)s, 
        purchase_date = %(purchase_date)s, amount = %(amount)s, payment_status = %(payment_status)s, 
        shipping_status = %(shipping_status)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, purchase_id):
        """Delete a purchase record."""
        query = "DELETE FROM purchases WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': purchase_id})

    ### Additional Methods ###

    @classmethod
    def get_purchases_by_client(cls, client_id):
        """Retrieve all purchases made by a specific client."""
        query = "SELECT * FROM purchases WHERE client_id = %(client_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'client_id': client_id})
        return [cls(row) for row in results]

    @classmethod
    def get_purchases_by_product(cls, product_id):
        """Retrieve all purchases of a specific product."""
        query = "SELECT * FROM purchases WHERE product_id = %(product_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'product_id': product_id})
        return [cls(row) for row in results]

    @classmethod
    def update_payment_status(cls, purchase_id, payment_status):
        """Update the payment status for a specific purchase."""
        query = """
        UPDATE purchases 
        SET payment_status = %(payment_status)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        data = {
            'id': purchase_id,
            'payment_status': payment_status,
        }
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)


    @classmethod
    def update_shipping_status(cls, purchase_id, new_status):
        """Update the shipping status for a specific purchase."""
        query = """
        UPDATE purchases SET shipping_status = %(shipping_status)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db({'id': purchase_id, 'shipping_status': new_status})

    @classmethod
    def get_total_amount_by_client(cls, client_id):
        """Calculate the total amount spent by a specific client."""
        query = "SELECT SUM(amount) AS total_spent FROM purchases WHERE client_id = %(client_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db({'client_id': client_id})
        return result[0]['total_spent'] if result[0]['total_spent'] is not None else 0.0