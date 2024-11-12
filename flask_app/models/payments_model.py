from flask_app.config.mysqlconnection import connectToMySQL

class Payment:
    def __init__(self, data):
        self.id = data.get('id')
        self.client_id = data.get('client_id')
        self.purchase_id = data.get('purchase_id')
        self.payment_date = data.get('payment_date')
        self.amount_paid = data.get('amount_paid')
        self.payment_method = data.get('payment_method')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
    
    def serialize(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'purchase_id': self.purchase_id,
            'payment_date': self.payment_date,
            'amount_paid': self.amount_paid,
            'payment_method': self.payment_method,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
        }
    

    @classmethod
    def save(cls, data):
        """Create a new payment record."""
        query = """
        INSERT INTO payments (client_id, purchase_id, payment_date, amount_paid, payment_method, created_at, updated_at) 
        VALUES (%(client_id)s, %(purchase_id)s, %(payment_date)s, %(amount_paid)s, %(payment_method)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def get_by_id(cls, payment_id):
        """Retrieve a payment by its ID."""
        query = "SELECT * FROM payments WHERE id = %(id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': payment_id})
        return cls(result[0]) if result else None

    @classmethod
    def get_all(cls):
        """Retrieve all payments."""
        query = "SELECT * FROM payments;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing payment record."""
        query = """
        UPDATE payments 
        SET client_id = %(client_id)s, purchase_id = %(purchase_id)s, payment_date = %(payment_date)s, 
        amount_paid = %(amount_paid)s, payment_method = %(payment_method)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    

    @classmethod
    def delete(cls, payment_id):
        """Delete a payment record."""
        query = "DELETE FROM payments WHERE id = %(id)s;"
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, {'id': payment_id})

    ### Additional Methods ###

    @classmethod
    def get_payments_by_client(cls, client_id):
        """Retrieve all payments for a specific client."""
        query = "SELECT * FROM payments WHERE client_id = %(client_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'client_id': client_id})
        return [cls(row) for row in results]

    @classmethod
    def get_payments_by_purchase(cls, purchase_id):
        """Retrieve all payments associated with a specific purchase."""
        query = "SELECT * FROM payments WHERE purchase_id = %(purchase_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'purchase_id': purchase_id})
        return [cls(row) for row in results]

    @classmethod
    def get_total_paid_for_purchase(cls, purchase_id):
        """Calculate the total amount paid for a specific purchase."""
        query = "SELECT SUM(amount_paid) AS total_paid FROM payments WHERE purchase_id = %(purchase_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db({'purchase_id': purchase_id})
        return result[0]['total_paid'] if result[0]['total_paid'] is not None else 0.0

    ### Validation and Utility Methods ###

    @staticmethod
    def validate_payment(data):
        """Validate payment details before saving or updating."""
        is_valid = True
        if data['amount_paid'] <= 0:
            is_valid = False
        if data['payment_method'] not in ['Credit Card', 'Bank Transfer', 'PayPal', 'Venmo', 'Zelle']:
            is_valid = False
        return is_valid