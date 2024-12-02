from flask_app.config.mysqlconnection import connectToMySQL
from datetime import datetime, timedelta, timezone
import logging
import json



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
        self.product_name = data.get('product_name')  # New field
        self.product_description = data.get('product_description')  # New field
        self.product_screenshot_photo = data.get('product_screenshot_photo')
        self.payments = data.get('payments', [])
        self.client_first_name = data.get('client_first_name')
        self.client_last_name = data.get('client_last_name'),
    

    
    def serialize(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'product_id': self.product_id,
            'product_name': self.product_name,
            'size': self.size,
            'purchase_date': self.purchase_date,
            'amount': self.amount,
            'payment_status': self.payment_status,
            'shipping_status': self.shipping_status,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
            'product_name': self.product_name,
            'product_description': self.product_description,
            'product_screenshot_photo': self.product_screenshot_photo,
            'payments': self.payments,
            'client_first_name': self.client_first_name,
            'client_last_name': self.client_last_name,

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
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'client_id': client_id})
        
        # Check if results are valid
        if not results or isinstance(results, bool):
            return []  # Return an empty list if no results or query fails
        
        return [cls(row) for row in results]


    @classmethod
    def get_purchases_by_product(cls, product_id):
        """Retrieve all purchases of a specific product."""
        query = "SELECT * FROM purchases WHERE product_id = %(product_id)s;"
        results = connectToMySQL('maria_ortegas_project_schema').query_db({'product_id': product_id})
        return [cls(row) for row in results]
    
    @classmethod
    def get_purchases_with_product_by_client(cls, client_id):
        query = """
        SELECT purchases.*, products.name AS product_name, products.description AS product_description
        FROM purchases
        JOIN products ON purchases.product_id = products.id
        WHERE purchases.client_id = %(client_id)s;
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'client_id': client_id})
        if not results or isinstance(results, bool):
            return []
        return [cls(row) for row in results]

    @classmethod
    def get_clients_for_product(cls, product_id):
        """
        Fetch clients who purchased a specific product.
        :param product_id: The ID of the product.
        :return: List of clients who purchased the product.
        """
        query = """
        SELECT clients.id, clients.first_name, clients.last_name,
            purchases.size, purchases.purchase_date, purchases.amount
        FROM clients
        JOIN purchases ON clients.id = purchases.client_id
        WHERE purchases.product_id = %(product_id)s;
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'product_id': product_id})
        return results  # Return the raw results or serialize if needed

    
    @classmethod
    def get_purchases_with_payments_by_client(cls, client_id):
        query = """
        SELECT purchases.*, products.name AS product_name, products.screenshot_photo AS product_screenshot_photo,
        GROUP_CONCAT(JSON_OBJECT(
            'id', IFNULL(payments.id, 0),
            'amount_paid', payments.amount_paid,
            'payment_date', payments.payment_date,
            'payment_method', payments.payment_method
        )) AS payments
        FROM purchases
        JOIN products ON purchases.product_id = products.id
        LEFT JOIN payments ON purchases.id = payments.purchase_id
        WHERE purchases.client_id = %(client_id)s
        GROUP BY purchases.id;
        """

        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, {'client_id': client_id})
        if not results or isinstance(results, bool):
            return []
        purchases = []
        for row in results:
            purchase = cls(row)
            if row['payments']:
                payments_list = json.loads(f'[{row["payments"]}]')

                # Check if the payments are all NULL and convert to an empty list
                if all(
                    payment['amount_paid'] is None and
                    payment['payment_date'] is None and
                    payment['payment_method'] is None
                    for payment in payments_list
                ):
                    payments_list = []

                purchase.payments = payments_list
            else:
                purchase.payments = []

            purchases.append(purchase)
        return purchases



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
        query = """
        UPDATE purchases 
        SET shipping_status = %(shipping_status)s, updated_at = NOW() 
        WHERE id = %(id)s;
        """
        data = {'id': purchase_id, 'shipping_status': new_status}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)


    @classmethod
    def get_total_amount_by_client(cls, client_id):
        """Calculate the total amount spent by a specific client."""
        query = "SELECT SUM(amount) AS total_spent FROM purchases WHERE client_id = %(client_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db({'client_id': client_id})
        return result[0]['total_spent'] if result[0]['total_spent'] is not None else 0.0
    
    @classmethod
    def update_overdue_purchases(cls):
        query = """
        UPDATE purchases p
        SET p.payment_status = 'Overdue'
        WHERE p.payment_status = 'Pending'
        AND DATE(p.purchase_date) <= CURDATE() - INTERVAL 14 DAY
        AND NOT EXISTS (
            SELECT 1
            FROM payments pay
            WHERE pay.purchase_id = p.id
                AND pay.amount_paid > 0
        );
        """
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        print(f"Update query result: {result}")



    @classmethod
    def get_overdue_purchases(cls):
        query = """
        SELECT 
            purchases.id, 
            purchases.client_id, 
            clients.first_name AS client_first_name, 
            clients.last_name AS client_last_name,
            purchases.product_id, 
            products.name AS product_name,
            products.screenshot_photo as product_screenshot_photo,
            purchases.purchase_date, 
            purchases.amount, 
            purchases.payment_status, 
            purchases.shipping_status
        FROM purchases
        JOIN clients ON purchases.client_id = clients.id
        JOIN products ON purchases.product_id = products.id
        WHERE purchases.payment_status = 'Overdue'
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)
        print(f"Overdue purchases: {results}")
        return [cls(result) for result in results]

    

    




    
    




