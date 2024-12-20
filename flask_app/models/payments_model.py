from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper

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
        self.product_id = data.get('product_id')  # New field
        self.product_name = data.get('product_name')  # New field
        self.purchase_payment_status = data.get('purchase_payment_status')
    
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
            'product_id': self.product_id,
            'product_name': self.product_name,
            'purchase_payment_status': self.purchase_payment_status
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
        query = """
            SELECT payments.* 
            FROM payments 
            JOIN purchases ON payments.purchase_id = purchases.id
            WHERE payments.id = %(id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'id': payment_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return cls(result[0]) if result else None


    @classmethod
    def get_all(cls):
        """Retrieve all payments."""
        query = """
                SELECT * FROM payments
                JOIN purchases on payments.purchase_id = purchases.id
                WHERE purchases.system_id = %(system_id)s;"""
        data = {'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing payment record with system_id check."""
        try:
            # Type conversion
            data['system_id'] = SessionHelper.get_system_id()

            # SQL Query
            query = """
            UPDATE payments 
            JOIN purchases ON payments.purchase_id = purchases.id
            SET payments.client_id = %(client_id)s, 
                payments.purchase_id = %(purchase_id)s, 
                payments.payment_date = %(payment_date)s, 
                payments.amount_paid = %(amount_paid)s, 
                payments.payment_method = %(payment_method)s, 
                payments.updated_at = NOW()
            WHERE payments.id = %(id)s AND purchases.system_id = %(system_id)s;
            """
            return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        except Exception as e:
            print(f"Error updating payment: {e}")
            return {"error": "An error occurred"}, 500




    @classmethod
    def delete(cls, payment_id):
        """Delete a payment record with system_id check."""
        query = """
        DELETE payments 
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        WHERE payments.id = %(id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'id': payment_id, 'system_id': SessionHelper.get_system_id()}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)


    ### Additional Methods ###

    @classmethod
    def get_payments_by_client(cls, client_id):
        """Retrieve all payments for a specific client."""
        query = """
        SELECT payments.* 
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        WHERE payments.client_id = %(client_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'client_id': client_id, 'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        
        if not results or isinstance(results, bool):
            return []  # Return an empty list if no results or query fails
        
        return [cls(row) for row in results]


    @classmethod
    def get_payments_by_purchase(cls, purchase_id):
        """Retrieve all payments for a specific purchase."""
        query = """
        SELECT payments.* 
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        WHERE payments.purchase_id = %(purchase_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'purchase_id': purchase_id, 'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        
        if not results or isinstance(results, bool):
            return []  # Return an empty list if no results or query fails

        return [cls(row) for row in results]


    @classmethod
    def get_payments_with_order_details_by_client(cls, client_id):
        """Retrieve all payments with product and order details for a specific client."""
        query = """
        SELECT payments.*, purchases.product_id, products.name AS product_name
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        JOIN products ON purchases.product_id = products.id
        WHERE payments.client_id = %(client_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'client_id': client_id, 'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        
        if not results or isinstance(results, bool):
            return []
        
        return [cls(row) for row in results]




    @classmethod
    def get_total_paid_for_purchase(cls, purchase_id):
        """Calculate the total amount paid for a specific purchase."""
        query = """
        SELECT SUM(payments.amount_paid) AS total_paid
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        WHERE payments.purchase_id = %(purchase_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'purchase_id': purchase_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return result[0]['total_paid'] if result and result[0]['total_paid'] is not None else 0.0

    ### Validation and Utility Methods ###

    @staticmethod
    def validate_payment(data):
        """Validate payment details before saving or updating."""
        is_valid = True
        errors = []

        # Validate amount_paid
        if data['amount_paid'] <= 0:
            is_valid = False
            errors.append("The payment amount must be greater than zero.")
        return is_valid, errors
    
    @classmethod
    def get_recent_payments(cls, since_date):
        query = """
        SELECT 
            'Payment Made' AS action,
            CONCAT('Payment of $', payments.amount_paid, ' for ', 
           '', products.name, ' by ', clients.first_name, ' ', clients.last_name) AS details,
            payments.created_at
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        JOIN products ON purchases.product_id = products.id
        JOIN clients ON purchases.client_id = clients.id
        WHERE payments.created_at >= %s AND purchases.system_id = %s
        ORDER BY payments.created_at DESC;
        """
        data = (since_date, SessionHelper.get_system_id())
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        if isinstance(result, tuple):
            result = list(result)
        return result

