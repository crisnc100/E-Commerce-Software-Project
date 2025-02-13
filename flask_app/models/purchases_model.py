from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper
from datetime import datetime, timedelta, timezone
import logging
import json
from decimal import Decimal




class Purchase:
    def __init__(self, data):
        self.id = data.get('id')
        self.client_id = data.get('client_id')
        self.system_id = data.get('system_id')
        self.purchase_date = data.get('purchase_date')
        self.amount = data.get('amount')
        self.payment_status = data.get('payment_status')
        self.shipping_status = data.get('shipping_status')
        self.paypal_link = data.get('paypal_link')
        self.paypal_order_id = data.get('paypal_order_id')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.shipping_updated_at = data.get('shipping_updated_at')
        self.product_name = data.get('product_name')  # New field
        self.product_screenshot_photo = data.get('product_screenshot_photo')
        self.product_price = data.get('product_price')
        self.payments = data.get('payments', [])
        self.items = data.get('items', [])
        self.client_first_name = data.get('client_first_name')
        self.client_last_name = data.get('client_last_name'),

    

    
    def serialize(self):
        return {
            'id': self.id,
            'client_id': self.client_id,
            'system_id': self.system_id,
            'product_name': self.product_name,
            'purchase_date': self.purchase_date,
            'amount': self.amount,
            'payment_status': self.payment_status,
            'shipping_status': self.shipping_status,
            'paypal_link': self.paypal_link,
            'paypal_order_id': self.paypal_order_id,
            'created_at': str(self.created_at), 
            'updated_at': str(self.updated_at),
            'shipping_updated_at': str(self.shipping_updated_at),
            'product_name': self.product_name,
            'product_screenshot_photo': self.product_screenshot_photo,
            'product_price': self.product_price,
            'payments': self.payments,
            'items': self.items,
            'client_first_name': self.client_first_name,
            'client_last_name': self.client_last_name,

        }
    

    @classmethod
    def save(cls, data):
        """Create a new purchase record (parent-level)."""
        query = """
        INSERT INTO purchases (client_id, system_id, purchase_date, amount, payment_status, shipping_status, paypal_link, paypal_order_id, created_at, updated_at, shipping_updated_at) 
        VALUES (%(client_id)s, %(system_id)s, %(purchase_date)s, %(amount)s, %(payment_status)s, %(shipping_status)s, %(paypal_link)s, %(paypal_order_id)s, NOW(), NOW(), NOW());
        """
        data['system_id'] = SessionHelper.get_system_id()
        data['paypal_link'] = None  # Default to NULL
        data['paypal_order_id'] = None
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    


    @classmethod
    def get_by_id(cls, purchase_id):
        query = "SELECT * FROM purchases WHERE id = %(id)s AND system_id = %(system_id)s;"
        result = connectToMySQL('maria_ortegas_project_schema').query_db(
            query, {'id': purchase_id, 'system_id': SessionHelper.get_system_id()}
        )
        return cls(result[0]) if result else None
    @classmethod
    def get_all(cls):
        """Retrieve all purchases."""
        query = "SELECT * FROM purchases WHERE system_id = %(system_id)s;"
        data = {'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return [cls(row) for row in results]

    @classmethod
    def update(cls, data):
        """Update an existing purchase record."""
        query = """
        UPDATE purchases 
        SET client_id = %(client_id)s, 
        purchase_date = %(purchase_date)s, amount = %(amount)s, payment_status = %(payment_status)s, 
        shipping_status = %(shipping_status)s, updated_at = NOW() 
        WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data['system_id'] = SessionHelper.get_system_id()
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    @classmethod
    def delete(cls, purchase_id):
        """Delete a purchase record."""
        query = "DELETE FROM purchases WHERE id = %(id)s AND system_id = %(system_id)s;"
        data = {'id': purchase_id, 'system_id': SessionHelper.get_system_id()}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

    ### Additional Methods ###
    
    @classmethod
    def all_purchases_for_client(cls, client_id, page=1, limit=4):
        offset = (page - 1) * limit

        # Step 1: Fetch distinct purchase IDs with LIMIT and OFFSET
        purchase_ids_query = """
        SELECT purchases.id AS purchase_id
        FROM purchases
        WHERE purchases.client_id = %(client_id)s AND purchases.system_id = %(system_id)s
        ORDER BY purchases.purchase_date DESC
        LIMIT %(limit)s OFFSET %(offset)s;
        """
        params = {'client_id': client_id, 'system_id': SessionHelper.get_system_id(), 'limit': limit, 'offset': offset}
        purchase_ids_result = connectToMySQL('maria_ortegas_project_schema').query_db(purchase_ids_query, params)

        # Extract purchase IDs
        purchase_ids = [row['purchase_id'] for row in purchase_ids_result]
        if not purchase_ids:
            return {'items': [], 'total': 0}

        # Step 2: Fetch all data for the selected purchases
        query = """
        SELECT purchases.id AS purchase_id, purchases.purchase_date, purchases.amount, purchases.payment_status,
            clients.first_name AS client_first_name, clients.last_name AS client_last_name,
            purchase_items.product_id, purchase_items.size, purchase_items.quantity, purchase_items.price_per_item,
            products.name AS product_name, products.description AS product_description, 
            products.screenshot_photo AS product_screenshot_photo
        FROM purchases
        JOIN clients ON purchases.client_id = clients.id
        JOIN purchase_items ON purchases.id = purchase_items.purchase_id
        JOIN products ON purchase_items.product_id = products.id
        WHERE purchases.id IN %(purchase_ids)s
        ORDER BY purchases.purchase_date DESC;
        """
        params = {'purchase_ids': tuple(purchase_ids)}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        # Organize results by purchase_id
        purchases = {}
        for row in results:
            purchase_id = row['purchase_id']
            if purchase_id not in purchases:
                purchases[purchase_id] = {
                    'purchase_id': purchase_id,
                    'purchase_date': row['purchase_date'],
                    'amount': row['amount'],
                    'payment_status': row['payment_status'],
                    'client_name': f"{row['client_first_name']} {row['client_last_name']}",
                    'items': []
                }
            purchases[purchase_id]['items'].append({
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'product_description': row['product_description'],
                'product_screenshot_photo': row['product_screenshot_photo'],
                'size': row['size'],
                'quantity': row['quantity'],
                'price_per_item': row['price_per_item']
            })

        # Step 3: Fetch the total count of purchases for the client
        count_query = """
        SELECT COUNT(*) AS total
        FROM purchases
        WHERE client_id = %(client_id)s AND system_id = %(system_id)s;
        """
        data = {'client_id': client_id, 'system_id': SessionHelper.get_system_id()}
        count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query, data)
        total = count_result[0]['total'] if count_result else 0

        # Convert purchases dictionary to a list for easier handling
        grouped_purchases = list(purchases.values())

        return {'items': grouped_purchases, 'total': total}







    @classmethod
    def all_purchases_for_product(cls, product_id, page=1):
        limit = 4
        offset = (page - 1) * limit

        # Fetch the paginated results
        query = """
        SELECT clients.id AS client_id, clients.first_name, clients.last_name, purchases.id AS purchase_id,
            purchase_items.size, purchase_items.quantity, purchase_items.price_per_item, purchases.purchase_date,
            purchases.amount, purchases.payment_status, purchase_items.size, purchase_items.quantity
        FROM clients
        JOIN purchases ON clients.id = purchases.client_id
        JOIN purchase_items ON purchases.id = purchase_items.purchase_id
        WHERE purchase_items.product_id = %(product_id)s AND purchases.system_id = %(system_id)s
        LIMIT %(limit)s OFFSET %(offset)s;
        """
        params = {'product_id': product_id, 'system_id': SessionHelper.get_system_id(), 'limit': limit, 'offset': offset}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, params)

        # Fetch the total count
        count_query = """
        SELECT COUNT(*) AS total
        FROM purchase_items
        JOIN purchases ON purchase_items.purchase_id = purchases.id
        WHERE purchase_items.product_id = %(product_id)s AND purchases.system_id = %(system_id)s;
        """
        count_params = {'product_id': product_id, 'system_id': SessionHelper.get_system_id()}
        count_result = connectToMySQL('maria_ortegas_project_schema').query_db(count_query, count_params)
        total = count_result[0]['total'] if count_result else 0

        return {'items': results, 'total': total}



    @classmethod
    def get_clients_for_product(cls, product_id):
        """
        Fetch clients who purchased a specific product.
        :param product_id: The ID of the product.
        :return: List of clients who purchased the product.
        """
        query = """
        SELECT 
            clients.id AS client_id, 
            clients.first_name, 
            clients.last_name,
            purchases.id AS purchase_id,
            purchase_items.size, 
            purchase_items.quantity, 
            purchase_items.price_per_item, 
            purchases.purchase_date, 
            purchases.amount, 
            purchases.payment_status
        FROM clients
        JOIN purchases ON clients.id = purchases.client_id
        JOIN purchase_items ON purchases.id = purchase_items.purchase_id
        WHERE purchase_items.product_id = %(product_id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'product_id': product_id, 'system_id': SessionHelper.get_system_id()}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return results  # Return the raw results or serialize if needed


    @classmethod
    def get_purchases_by_client(cls, client_id):
        query = """
            SELECT
                p.id,
                p.client_id,
                p.payment_status,
                p.amount,
                p.purchase_date,
                p.shipping_status,
                p.created_at,
                p.updated_at,
                p.paypal_link,
                p.paypal_order_id,
                p.shipping_updated_at
            FROM purchases p
            WHERE p.client_id = %(client_id)s
            AND p.system_id = %(system_id)s
        """
        data = {
            "client_id": client_id,
            "system_id": SessionHelper.get_system_id()
        }
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        if not results or isinstance(results, bool):
            return []

        purchases = []
        for row in results:
            purchase = cls(row)  # or manually build a dict
            purchases.append(purchase)

        return purchases


    
    @staticmethod
    def get_items_for_purchases(purchase_ids):
        # Build a query to fetch items for all these purchase IDs
        query = f"""
            SELECT
                pi.id,
                pi.purchase_id,
                pi.product_id,
                pi.size,
                pi.quantity,
                pi.price_per_item,
                prod.name AS product_name,
                prod.screenshot_photo
            FROM purchase_items pi
            LEFT JOIN products prod ON pi.product_id = prod.id
            WHERE pi.purchase_id IN ({','.join(map(str, purchase_ids))})
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)

        items_by_purchase = {}
        for row in results:
            purchase_id = row['purchase_id']
            if purchase_id not in items_by_purchase:
                items_by_purchase[purchase_id] = []
            items_by_purchase[purchase_id].append({
                "id": row["id"],
                "product_id": row["product_id"],
                "size": row["size"],
                "quantity": row["quantity"],
                "price_per_item": row["price_per_item"],
                "product_name": row["product_name"],
                "screenshot_photo": row["screenshot_photo"],
            })
        return items_by_purchase
    
    @staticmethod
    def get_payments_for_purchases(purchase_ids):
        query = f"""
            SELECT
                p.id,
                p.purchase_id,
                p.amount_paid,
                p.payment_date,
                p.payment_method
            FROM payments p
            WHERE p.purchase_id IN ({','.join(map(str, purchase_ids))})
        """
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query)

        payments_by_purchase = {}
        for row in results:
            purchase_id = row['purchase_id']
            if purchase_id not in payments_by_purchase:
                payments_by_purchase[purchase_id] = []
            payments_by_purchase[purchase_id].append({
                "id": row["id"],
                "amount_paid": row["amount_paid"],
                "payment_date": row["payment_date"],
                "payment_method": row["payment_method"],
            })
        return payments_by_purchase

    @classmethod
    def get_purchases_with_payments_by_client(cls, client_id):
        # 1) Get purchases
        purchases = cls.get_purchases_by_client(client_id)
        if not purchases:
            return []

        # 2) Gather the IDs, then fetch items + payments in two queries
        purchase_ids = [p.id for p in purchases]
        items_by_purchase = cls.get_items_for_purchases(purchase_ids)
        payments_by_purchase = cls.get_payments_for_purchases(purchase_ids)

        # 3) Attach items and payments
        for purchase in purchases:
            pid = purchase.id
            purchase.items = items_by_purchase.get(pid, [])
            purchase.payments = payments_by_purchase.get(pid, [])

        return purchases


    @classmethod
    def update_payment_status(cls, purchase_id, payment_status):
        """Update the payment status for a specific purchase."""
        query = """
        UPDATE purchases 
        SET payment_status = %(payment_status)s, updated_at = NOW() 
        WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {
            'id': purchase_id,
            'system_id': SessionHelper.get_system_id(),
            'payment_status': payment_status,
        }
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @classmethod
    def update_purchase_amount(cls, purchase_id, new_amount):
        query = """
            UPDATE purchases 
            SET amount = %(amount)s, 
                updated_at = NOW() 
            WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {
            "id": purchase_id,
            "system_id": SessionHelper.get_system_id(),
            "amount": new_amount,
        }
        return connectToMySQL("maria_ortegas_project_schema").query_db(query, data)


    @classmethod
    def update_shipping_status(cls, purchase_id, new_status):
        query = """
        UPDATE purchases 
        SET shipping_status = %(shipping_status)s, shipping_updated_at = NOW() 
        WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {'id': purchase_id, 'system_id': SessionHelper.get_system_id(), 'shipping_status': new_status}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)


    @classmethod
    def get_total_amount_by_client(cls, client_id):
        """Calculate the total amount spent by a specific client."""
        query = """SELECT SUM(amount) AS total_spent FROM purchases 
        WHERE client_id = %(client_id)s AND system_id = %(system_id)s;"""
        data = {'client_id': client_id, 'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return result[0]['total_spent'] if result[0]['total_spent'] is not None else 0.0
    
    @classmethod
    def get_total_amount(cls, purchase_id):
        query = """
        SELECT SUM(payments.amount_paid) AS total_paid
        FROM payments
        JOIN purchases ON payments.purchase_id = purchases.id
        WHERE purchases.id = %(purchase_id)s
        AND purchases.system_id = %(system_id)s;
        """
        data = {
            'purchase_id': purchase_id,
            'system_id': SessionHelper.get_system_id()
        }
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        # result is expected to be a list of dicts
        if result and result[0]['total_paid'] is not None:
            return Decimal(result[0]['total_paid'])
        return Decimal('0.00')
    
    @classmethod
    def update_overdue_purchases(cls, system_id):
        query = """
        UPDATE purchases p
        SET p.payment_status = 'Overdue'
        WHERE p.payment_status = 'Pending'
        AND DATE(p.purchase_date) <= CURDATE() - INTERVAL 14 DAY
        AND p.system_id = %(system_id)s
        AND NOT EXISTS (
            SELECT 1
            FROM payments pay
            WHERE pay.purchase_id = p.id
                AND pay.amount_paid > 0
        );
        """
        data = {'system_id': system_id}
        try:
            result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
            print(f"Query executed successfully for system_id {system_id}. Rows affected: {result}")
        except Exception as e:
            print(f"Error executing query for system_id {system_id}: {e}")

    @classmethod
    def get_overdue_purchases(cls, system_id):
        query = """
        SELECT 
            purchases.id AS id,
            purchases.client_id,
            clients.first_name AS client_first_name,
            clients.last_name AS client_last_name,
            purchases.purchase_date,
            purchases.amount,
            purchases.payment_status,
            purchases.shipping_status
        FROM purchases
        JOIN clients ON purchases.client_id = clients.id
        WHERE purchases.payment_status = 'Overdue' AND purchases.system_id = %(system_id)s;
        """
        data = {'system_id': system_id}
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        
        # Ensure results is a list, not a boolean
        if not results:
            results = []
        
        return [cls(result) for result in results]

    @classmethod
    def get_overdue_purchases_with_items(cls, system_id):
        # Step 1: Fetch overdue purchases
        overdue_purchases = cls.get_overdue_purchases(system_id)
        if not overdue_purchases:
            return []

        # Step 2: Fetch items for these purchases
        purchase_ids = [purchase.id for purchase in overdue_purchases]  # Use 'id' instead of 'purchase_id'
        items_by_purchase = cls.get_items_for_purchases(purchase_ids)

        # Step 3: Attach items to the purchases
        for purchase in overdue_purchases:
            purchase.items = items_by_purchase.get(purchase.id, [])  # Use 'id' here as well

        return overdue_purchases

    @classmethod
    def check_for_pending_deliveries(cls, system_id):
        """
        Identifies purchases that are 'Paid' but have not been marked as delivered after 28 days.
        Groups items by purchase_id for easier handling in the frontend.
        """
        query = """
        SELECT 
            p.id AS purchase_id, 
            p.client_id, 
            c.first_name AS client_first_name, 
            c.last_name AS client_last_name, 
            p.purchase_date, 
            p.amount, 
            p.payment_status, 
            p.shipping_status, 
            pi.product_id, 
            pi.size, 
            pi.quantity, 
            pi.price_per_item, 
            pr.name AS product_name, 
            pr.screenshot_photo AS screenshot_photo
        FROM purchases p
        JOIN clients c ON p.client_id = c.id
        JOIN purchase_items pi ON p.id = pi.purchase_id
        JOIN products pr ON pi.product_id = pr.id
        WHERE p.payment_status = 'Paid'
        AND p.system_id = %(system_id)s
        AND p.shipping_status != 'Delivered'
        AND DATE(p.purchase_date) <= CURDATE() - INTERVAL 28 DAY;
        """
        data = {'system_id': system_id}
        try:
            results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
            # Group items by purchase_id
            grouped_deliveries = {}
            for row in results:
                purchase_id = row['purchase_id']
                if purchase_id not in grouped_deliveries:
                    grouped_deliveries[purchase_id] = {
                        "id": purchase_id,
                        "client_id": row["client_id"],
                        "client_first_name": row["client_first_name"],
                        "client_last_name": row["client_last_name"],
                        "purchase_date": row["purchase_date"],
                        "amount": row["amount"],
                        "payment_status": row["payment_status"],
                        "shipping_status": row["shipping_status"],
                        "items": [],
                    }
                grouped_deliveries[purchase_id]["items"].append({
                    "product_id": row.get("product_id"),  # May be None
                    "product_name": row.get("product_name", "Unknown"),  # Provide a fallback
                    "size": row.get("size"),
                    "quantity": row.get("quantity"),
                    "price_per_item": row.get("price_per_item"),
                    "screenshot_photo": row.get("screenshot_photo"),
                })
            return list(grouped_deliveries.values())
        except Exception as e:
            print(f"Error executing query for pending deliveries for system_id {system_id}: {e}")
            return []



    
    @classmethod
    def get_recent_purchases(cls, since_date):
        # Step 1: Fetch basic purchase data
        purchase_query = """
            SELECT 
                p.id AS purchase_id,
                'Create Purchase Order' AS action,
                CONCAT(c.first_name, ' ', c.last_name) AS client_name,
                p.created_at,
                COUNT(pi.id) AS item_count
            FROM purchases p
            JOIN clients c ON p.client_id = c.id
            JOIN purchase_items pi ON p.id = pi.purchase_id
            WHERE p.created_at >= %s AND p.system_id = %s
            GROUP BY p.id, c.first_name, c.last_name, p.created_at
            ORDER BY p.created_at DESC;
        """
        purchase_data = (since_date, SessionHelper.get_system_id())
        purchases = connectToMySQL('maria_ortegas_project_schema').query_db(purchase_query, purchase_data)

        if not purchases:
            return []

        # Step 2: Fetch product details for small orders
        small_order_ids = [row['purchase_id'] for row in purchases if row['item_count'] <= 2]

        if small_order_ids:
            product_query = """
                SELECT 
                    pi.purchase_id,
                    pr.name AS product_name,
                    pi.size
                FROM purchase_items pi
                JOIN products pr ON pi.product_id = pr.id
                WHERE pi.purchase_id IN (%s);
            """ % ', '.join(['%s'] * len(small_order_ids))
            product_data = connectToMySQL('maria_ortegas_project_schema').query_db(product_query, small_order_ids)
            
            # Organize product details by purchase_id
            product_details = {}
            for row in product_data:
                if row['purchase_id'] not in product_details:
                    product_details[row['purchase_id']] = []
                product_details[row['purchase_id']].append(f"{row['product_name']} ({row['size']})")
        else:
            product_details = {}

        # Step 3: Build the final result
        result = []
        for row in purchases:
            if row['item_count'] > 2:
                details_str = f"Order for {row['client_name']}: {row['item_count']} items"
            else:
                details_str = f"Order for {', '.join(product_details.get(row['purchase_id'], []))} by {row['client_name']}"
            
            result.append({
                "purchase_id": row["purchase_id"],
                "action": row["action"],
                "details": details_str,
                "created_at": row["created_at"],
            })

        return result


    
    @classmethod
    def get_recent_shipping_updates(cls, since_date):
        query = """
            SELECT 
                'Update Shipping' AS action,
                CONCAT(
                    'Shipping status changed to ', p.shipping_status, 
                    ' for order #', p.id, 
                    ' with ', COUNT(pi.product_id), ' item(s)', 
                    ' by ', c.first_name, ' ', c.last_name
                ) AS details,
                p.shipping_updated_at AS created_at
            FROM purchases p
            JOIN clients c ON p.client_id = c.id
            JOIN purchase_items pi ON p.id = pi.purchase_id
            WHERE p.shipping_updated_at >= %s 
            AND p.system_id = %s
            AND p.shipping_status IS NOT NULL
            GROUP BY p.id, p.shipping_status, c.first_name, c.last_name, p.shipping_updated_at
            ORDER BY p.shipping_updated_at DESC;
            """
        data = (since_date, SessionHelper.get_system_id())
        try:
            result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
            if isinstance(result, tuple):
                result = list(result)
            return result
        except Exception as e:
            logging.error(f"Error fetching recent shipping updates: {e}")
            return []


    
    @classmethod
    def calculate_weekly_metrics(cls):
        query = """
            SELECT 
                /* SUM of p.amount at the purchase level */
                SUM(p.amount) AS gross_sales,

                /* Revenue = sum of purchase amounts minus sum of all item costs */
                SUM(p.amount) - SUM(COALESCE(item_summary.total_cost, 0)) AS revenue_earned,

                /* Net sales = sum of all payments across these purchases */
                SUM(COALESCE(pay_summary.total_paid, 0)) AS net_sales

            FROM purchases p

            /* Subquery that aggregates the cost of items per purchase_id */
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(quantity * price_per_item) AS total_cost
                FROM purchase_items
                GROUP BY purchase_id
            ) AS item_summary ON p.id = item_summary.purchase_id

            /* Subquery that aggregates total payments per purchase_id */
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(amount_paid) AS total_paid
                FROM payments
                GROUP BY purchase_id
            ) AS pay_summary ON p.id = pay_summary.purchase_id

            /* Filter for the last 7 days and your system_id */
            WHERE p.purchase_date >= DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY)
                AND p.purchase_date < DATE_ADD(DATE_SUB(CURDATE(), INTERVAL WEEKDAY(CURDATE()) DAY), INTERVAL 7 DAY)
                AND p.system_id = %(system_id)s
        """
        data = {'system_id': SessionHelper.get_system_id()}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        # result[0] will contain gross_sales, revenue_earned, and net_sales (or all NULL if no data)
        return {
            'gross_sales': result[0]['gross_sales'] if result and result[0]['gross_sales'] else 0.0,
            'revenue_earned': result[0]['revenue_earned'] if result and result[0]['revenue_earned'] else 0.0,
            'net_sales': result[0]['net_sales'] if result and result[0]['net_sales'] else 0.0,
        }

    
    @classmethod
    def calculate_monthly_metrics(cls, year):
        query = """
            SELECT 
                MONTH(p.purchase_date) AS month,
                -- Sum of p.amount across each month
                SUM(p.amount) AS gross_sales,
                
                -- Revenue = sum of amounts minus sum of item costs
                SUM(p.amount) - SUM(COALESCE(item_summary.total_cost, 0)) AS revenue_earned,
                
                -- Net sales = sum of all payments
                SUM(COALESCE(pay_summary.total_paid, 0)) AS net_sales
            
            FROM purchases p
            
            -- Subquery #1: total item cost per purchase
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(quantity * price_per_item) AS total_cost
                FROM purchase_items
                GROUP BY purchase_id
            ) AS item_summary ON p.id = item_summary.purchase_id
            
            -- Subquery #2: total payments per purchase
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(amount_paid) AS total_paid
                FROM payments
                GROUP BY purchase_id
            ) AS pay_summary ON p.id = pay_summary.purchase_id
            
            WHERE YEAR(p.purchase_date) = %s
            AND p.system_id = %s
            
            GROUP BY MONTH(p.purchase_date)
            ORDER BY MONTH(p.purchase_date)
        """
        data = (year, SessionHelper.get_system_id())
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        return [
            {
                'month': row['month'],
                'gross_sales': row['gross_sales'] if row['gross_sales'] else 0.0,
                'revenue_earned': row['revenue_earned'] if row['revenue_earned'] else 0.0,
                'net_sales': row['net_sales'] if row['net_sales'] else 0.0,
            }
            for row in result
        ] if result else []


    

    @classmethod
    def calculate_single_monthly_metrics(cls, year, month):
        query = """
            SELECT
                SUM(p.amount) AS gross_sales,
                SUM(p.amount) - SUM(COALESCE(item_summary.total_cost, 0)) AS revenue_earned,
                SUM(COALESCE(pay_summary.total_paid, 0)) AS net_sales
            FROM purchases p
            
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(quantity * price_per_item) AS total_cost
                FROM purchase_items
                GROUP BY purchase_id
            ) AS item_summary ON p.id = item_summary.purchase_id
            
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(amount_paid) AS total_paid
                FROM payments
                GROUP BY purchase_id
            ) AS pay_summary ON p.id = pay_summary.purchase_id
            
            WHERE YEAR(p.purchase_date) = %s
            AND MONTH(p.purchase_date) = %s
            AND p.system_id = %s
        """
        data = (year, month, SessionHelper.get_system_id())
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        if not result or not result[0]:
            return {
                'gross_sales': 0.0,
                'revenue_earned': 0.0,
                'net_sales': 0.0
            }

        return {
            'gross_sales': float(result[0]['gross_sales']) if result[0]['gross_sales'] else 0.0,
            'revenue_earned': float(result[0]['revenue_earned']) if result[0]['revenue_earned'] else 0.0,
            'net_sales': float(result[0]['net_sales']) if result[0]['net_sales'] else 0.0
        }


 


    @classmethod
    def calculate_yearly_metrics(cls, year=None):
        # We’ll build the WHERE clause + parameters
        where_clause = "WHERE p.system_id = %s"
        data = [SessionHelper.get_system_id()]
        
        if year:
            where_clause = "WHERE YEAR(p.purchase_date) = %s AND p.system_id = %s"
            data = [year, SessionHelper.get_system_id()]
        
        query = f"""
            SELECT 
                YEAR(p.purchase_date) AS year,
                SUM(p.amount) AS gross_sales,
                SUM(p.amount) - SUM(COALESCE(item_summary.total_cost, 0)) AS revenue_earned,
                SUM(COALESCE(pay_summary.total_paid, 0)) AS net_sales
            FROM purchases p
            
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(quantity * price_per_item) AS total_cost
                FROM purchase_items
                GROUP BY purchase_id
            ) AS item_summary ON p.id = item_summary.purchase_id
            
            LEFT JOIN (
                SELECT 
                    purchase_id,
                    SUM(amount_paid) AS total_paid
                FROM payments
                GROUP BY purchase_id
            ) AS pay_summary ON p.id = pay_summary.purchase_id
            
            {where_clause}
            
            GROUP BY YEAR(p.purchase_date)
            ORDER BY YEAR(p.purchase_date);
        """
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, tuple(data))

        return [
            {
                'year': row['year'],
                'gross_sales': row['gross_sales'] if row['gross_sales'] else 0.0,
                'revenue_earned': row['revenue_earned'] if row['revenue_earned'] else 0.0,
                'net_sales': row['net_sales'] if row['net_sales'] else 0.0,
            }
            for row in result
        ] if result else []




    @classmethod
    def get_top_products_by_clients(cls, year, month, threshold=2, top_n=3):
        """
        Returns the top products (up to `top_n`) by number of DISTINCT clients
        who purchased them, with tie-breakers:
          1) total distinct clients (DESC)
          2) total quantity sold (DESC)
          3) product_name (ASC)
        
        Excludes products with fewer than `threshold` distinct clients.
        """
        # Get system_id directly from SessionHelper, not passed as parameter
        system_id = SessionHelper.get_system_id()

        query = """
            SELECT *
            FROM (
                SELECT 
                    product_id,
                    product_name,
                    product_screenshot_photo,
                    total_clients,
                    total_quantity,
                    RANK() OVER (
                        ORDER BY total_clients DESC,
                                 total_quantity DESC,
                                 product_name ASC
                    ) AS rnk
                FROM (
                    SELECT
                        pi.product_id           AS product_id,
                        p.name                  AS product_name,
                        p.screenshot_photo      AS product_screenshot_photo,
                        COUNT(DISTINCT pu.client_id) AS total_clients,
                        SUM(pi.quantity)        AS total_quantity
                    FROM purchase_items pi
                    JOIN products p   ON pi.product_id = p.id
                    JOIN purchases pu ON pi.purchase_id = pu.id
                    WHERE YEAR(pu.purchase_date)  = %s
                      AND MONTH(pu.purchase_date) = %s
                      AND pu.system_id            = %s
                    GROUP BY pi.product_id, p.name, p.screenshot_photo
                    HAVING COUNT(DISTINCT pu.client_id) >= %s
                ) AS ProductMetrics
            ) AS RankedMetrics
            WHERE rnk <= %s;
        """

        data = (year, month, system_id, threshold, top_n)
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        if not results:
            return []

        return [
            {
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'product_screenshot_photo': row['product_screenshot_photo'],
                'total_clients': row['total_clients'],
                'total_quantity': row['total_quantity'],
                'rank': row['rnk']
            }
            for row in results
        ]

    @classmethod
    def get_top_products_by_sales(cls, year, month, top_n=3):
        """
        Returns the top products (up to `top_n`) by total sales (DESC),
        breaking ties alphabetically by product name.

        This currently multiplies quantity * price_per_item.
        If you have a final or allocated price, replace `price_per_item`.
        """
        # Get system_id directly from SessionHelper
        system_id = SessionHelper.get_system_id()

        query = """
            SELECT * 
            FROM (
                SELECT
                    product_id,
                    product_name,
                    product_screenshot_photo,
                    total_sales,
                    RANK() OVER (
                        ORDER BY total_sales DESC,
                                 product_name ASC
                    ) AS rnk
                FROM (
                    SELECT 
                        pi.product_id      AS product_id,
                        p.name             AS product_name,
                        p.screenshot_photo AS product_screenshot_photo,
                        COALESCE(SUM(pi.quantity * pi.price_per_item), 0) AS total_sales
                    FROM purchase_items pi
                    JOIN products p   ON pi.product_id = p.id
                    JOIN purchases pu ON pi.purchase_id = pu.id
                    WHERE YEAR(pu.purchase_date)  = %s
                      AND MONTH(pu.purchase_date) = %s
                      AND pu.system_id            = %s
                    GROUP BY pi.product_id, p.name, p.screenshot_photo
                ) AS ProductMetrics
            ) AS RankedMetrics
            WHERE rnk <= %s;
        """

        data = (year, month, system_id, top_n)
        results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

        if not results:
            return []

        return [
            {
                'product_id': row['product_id'],
                'product_name': row['product_name'],
                'product_screenshot_photo': row['product_screenshot_photo'],
                'total_sales': float(row['total_sales']),
                'rank': row['rnk']
            }
            for row in results
        ]



    @classmethod
    def update_paypal_link(cls, purchase_id, paypal_link):
        query = """
            UPDATE purchases
            SET paypal_link = %(paypal_link)s
            WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {
            "id": purchase_id,
            "system_id": SessionHelper.get_system_id(),
            "paypal_link": paypal_link  # Ensure this key exists
        }
        try:
            result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
            print(f"PayPal link updated for purchase_id {purchase_id}: {result}")
        except Exception as e:
            print(f"Error updating PayPal link in database: {e}")
            raise
    
    
    @classmethod
    def get_paypal_link(cls, purchase_id):
        query = """
            SELECT paypal_link
            FROM purchases
            WHERE id = %(id)s AND system_id = %(system_id)s;
        """
        data = {
            "id": purchase_id,
            "system_id": SessionHelper.get_system_id()
        }
        result = connectToMySQL("maria_ortegas_project_schema").query_db(query, data)
        return result[0] if result else None

    

    @classmethod
    def get_system_id_from_parent_payment(cls, parent_payment_id):
        query = """
            SELECT system_id FROM purchases
            WHERE paypal_link LIKE %(paypal_link)s;
        """
        data = {'paypal_link': f"%{parent_payment_id}%"}
        result = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        return result[0]['system_id'] if result else None
    
    @classmethod
    def update_paypal_order_id(cls, purchase_id, paypal_order_id):
        """
        Store the PayPal payment.id in `paypal_order_id` column for this purchase.
        """
        query = """
            UPDATE purchases
            SET paypal_order_id = %(paypal_order_id)s,
                updated_at = NOW()
            WHERE id = %(id)s 
              AND system_id = %(system_id)s;
        """
        data = {
            "id": purchase_id,
            "system_id": SessionHelper.get_system_id(),
            "paypal_order_id": paypal_order_id
        }
        result = connectToMySQL("maria_ortegas_project_schema").query_db(query, data)
        print(f"PayPal payment_id updated for purchase_id {purchase_id}: {result}")

    

    @classmethod
    def get_by_paypal_order_id(cls, paypal_order_id):
        query = """
            SELECT * 
            FROM purchases
            WHERE paypal_order_id = %(paypal_order_id)s;
        """
        data = {"paypal_order_id": paypal_order_id}
        results = connectToMySQL("maria_ortegas_project_schema").query_db(query, data)

        # Debug logs to inspect what's being returned
        print(f"Query Results for paypal_order_id={paypal_order_id}: {results}")

        # Return None or a Purchase instance
        return cls(results[0]) if results else None









    




    
    


    
    



    

    




    
    




