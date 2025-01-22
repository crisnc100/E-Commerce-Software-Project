from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper

class PaymentModel:
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
        SELECT 
            payments.*, 
            pi.product_id, 
            p.name AS product_name, 
            pi.size AS product_size,
            pi.quantity AS product_quantity,
            pi.price_per_item AS product_price
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        JOIN purchase_items pi ON purchases.id = pi.purchase_id
        JOIN products p ON pi.product_id = p.id
        WHERE payments.client_id = %(client_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'client_id': client_id, 'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        
        if not results or isinstance(results, bool):
            return []
        
        return [
            {
                **row,
                "product_name": row.get("product_name"),
                "product_size": row.get("product_size"),
                "product_quantity": row.get("product_quantity"),
                "product_price": float(row["product_price"]) if row.get("product_price") else None
            }
            for row in results
        ]





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
        # Query for recent payments
        payment_query = """
        SELECT 
            payments.id AS payment_id,
            purchases.id AS purchase_id,
            payments.amount_paid,
            clients.first_name,
            clients.last_name,
            payments.created_at
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        JOIN clients ON purchases.client_id = clients.id
        WHERE payments.created_at >= %s AND purchases.system_id = %s
        ORDER BY payments.created_at DESC;
        """
        payment_data = (since_date, SessionHelper.get_system_id())
        payments = connectToMySQL('maria_ortegas_project_schema').query_db(payment_query, payment_data)

        # Initialize result list
        recent_payments = []

        # Query for each purchase's items
        for payment in payments:
            item_query = """
            SELECT 
                p.name AS product_name,
                pi.quantity
            FROM purchase_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = %s;
            """
            items = connectToMySQL('maria_ortegas_project_schema').query_db(item_query, (payment['purchase_id'],))

            # Build the details message
            if len(items) == 1:
                # Single item purchase
                item_details = f"{items[0]['product_name']} (x{items[0]['quantity']})"
            else:
                # Multiple items
                item_details = f"{len(items)} items"

            # Append the formatted payment to the result list
            recent_payments.append({
                'action': 'Payment Made',
                'details': f"Payment of ${payment['amount_paid']} for order #{payment['purchase_id']} ({item_details}) by {payment['first_name']} {payment['last_name']}",
                'created_at': payment['created_at']
            })

        return recent_payments




    @classmethod
    def get_paginated_payments(cls, page=1, limit=10, method='PayPal'):
        offset = (page - 1) * limit
        base_params = {
            'system_id': SessionHelper.get_system_id(),
            'payment_method': method
        }

        # 1) Query distinct payment IDs
        query_ids = """
            SELECT payments.id AS payment_id
            FROM payments
            JOIN purchases ON payments.purchase_id = purchases.id
            JOIN clients ON purchases.client_id = clients.id
            WHERE clients.system_id = %(system_id)s
            {method_filter}
            ORDER BY payments.created_at DESC
            LIMIT %(limit)s OFFSET %(offset)s
        """.format(
            method_filter="AND payments.payment_method = %(payment_method)s" if method != 'all' else ""
        )

        ids_params = {
            'system_id': base_params['system_id'],
            'payment_method': method,
            'limit': limit,
            'offset': offset
        }
        id_results = connectToMySQL('maria_ortegas_project_schema').query_db(query_ids, ids_params)
        if not id_results:
            return {'items': [], 'total': 0}

        payment_ids = [str(row['payment_id']) for row in id_results]

        # 2) Query all details for these payment IDs
        query_details = f"""
            SELECT 
                payments.id AS payment_id, 
                payments.amount_paid, 
                payments.payment_date, 
                payments.payment_method,
                clients.id AS client_id, 
                CONCAT(clients.first_name, ' ', clients.last_name) AS client_name,
                purchases.id AS purchase_id,
                products.name AS product_name,
                products.screenshot_photo,
                pi.quantity,
                pi.price_per_item
            FROM payments
            JOIN purchases ON payments.purchase_id = purchases.id
            JOIN clients ON purchases.client_id = clients.id
            JOIN purchase_items pi ON purchases.id = pi.purchase_id
            JOIN products ON pi.product_id = products.id
            WHERE payments.id IN ({",".join(payment_ids)});
        """

        detail_results = connectToMySQL('maria_ortegas_project_schema').query_db(query_details)

        # Group by purchase_id (or payment_id) in Python
        payments_dict = {}
        for row in detail_results:
            p_id = row['purchase_id']
            if p_id not in payments_dict:
                payments_dict[p_id] = {
                    "payment_id": row["payment_id"],
                    "amount_paid": float(row["amount_paid"]),
                    "payment_date": row["payment_date"],
                    "payment_method": row["payment_method"],
                    "client_id": row["client_id"],
                    "client_name": row["client_name"],
                    "purchase_id": p_id,
                    "product_details": [],
                    "total_cost": 0.0,
                    "product_photos": []
                }
            product_str = f"{row['product_name']} (x{row['quantity']})"
            payments_dict[p_id]["product_details"].append(product_str)
            payments_dict[p_id]["total_cost"] += float(row['quantity']) * float(row['price_per_item'])
            if row['screenshot_photo']:
                payments_dict[p_id]["product_photos"].append(row['screenshot_photo'])

        # Convert to list
        formatted_results = []
        for payment_data in payments_dict.values():
            payment_data["product_details"] = ", ".join(payment_data["product_details"])
            payment_data["product_photos"] = list(set(payment_data["product_photos"]))
            formatted_results.append(payment_data)

        # 3) Count distinct payments total
        count_query = f"""
            SELECT COUNT(DISTINCT payments.id) AS total
            FROM payments
            JOIN purchases ON payments.purchase_id = purchases.id
            JOIN clients ON purchases.client_id = clients.id
            WHERE clients.system_id = %(system_id)s
            { "AND payments.payment_method = %(payment_method)s" if method != 'all' else "" }
        """

        count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query, base_params)
        total = count_result[0]['total'] if count_result else 0

        return {'items': formatted_results, 'total': total}







