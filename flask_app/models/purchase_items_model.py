from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.utils.session_helper import SessionHelper
from datetime import datetime, timedelta, timezone
import logging
import json
from decimal import Decimal
from flask_app.utils.session_helper import SessionHelper


class PurchaseItems:
    def __init__(self, data):
        self.id = data.get('id')
        self.purchase_id = data.get('purchase_id')
        self.product_id = data.get('product_id')
        self.size = data.get('size')
        self.quantity = data.get('quantity')
        self.price_per_item = data.get('price_per_item')
        self.created_at = data.get('created_at')
        self.updated_at = data.get('updated_at')
        self.product_name = data.get('product_name')  # Add this line

    
    def serialize(self):
        return {
            'id': self.id,
            'purchase_id': self.purchase_id,
            'product_id': self.product_id,
            'size': self.size,
            'quantity': self.quantity,
            'price_per_item': str(self.price_per_item),
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'product_name': self.product_name
        }
    

    @classmethod
    def save(cls, data):
        query = """
        INSERT INTO purchase_items 
        (purchase_id, product_id, size, quantity, price_per_item, created_at, updated_at) 
        VALUES (%(purchase_id)s, %(product_id)s, %(size)s, %(quantity)s, %(price_per_item)s, NOW(), NOW());
        """
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    
    @classmethod
    def update(cls, data):
        try:
            data['system_id'] = SessionHelper.get_system_id()
            query = """
                UPDATE purchase_items
                JOIN purchases ON purchase_items.purchase_id = purchases.id
                SET 
                    purchase_items.size = %(size)s,
                    purchase_items.quantity = %(quantity)s,
                    purchase_items.price_per_item = %(price_per_item)s,
                    purchase_items.updated_at = NOW()
                WHERE purchase_items.id = %(id)s
                AND purchases.system_id = %(system_id)s;
            """
            return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
        except Exception as e:
            logging.error(e)
            return False
    
    @classmethod
    def delete(cls, item_id):
        """Delete a purchase item record with system_id check."""
        query = """
        DELETE purchase_items 
        FROM purchase_items
        JOIN purchases ON purchase_items.purchase_id = purchases.id
        WHERE purchase_items.id = %(id)s AND purchases.system_id = %(system_id)s;
        """
        data = {'id': item_id, 'system_id': SessionHelper.get_system_id()}
        return connectToMySQL('maria_ortegas_project_schema').query_db(query, data)
    


    @classmethod
    def get_by_purchase_id(cls, purchase_id):
        """
        Fetch all purchase items for a given purchase_id.
        """
        try:
            query = """
            SELECT 
                pi.id, pi.purchase_id, pi.product_id, pi.size, pi.quantity, pi.price_per_item, 
                pi.created_at, pi.updated_at,
                p.name AS product_name
            FROM purchase_items pi
            JOIN products p ON pi.product_id = p.id
            WHERE pi.purchase_id = %(purchase_id)s;
            """
            data = {'purchase_id': purchase_id}
            results = connectToMySQL('maria_ortegas_project_schema').query_db(query, data)

            if not results:
                return []

            # Map results to PurchaseItems objects
            purchase_items = []
            for row in results:
                item_data = {
                    'id': row['id'],
                    'purchase_id': row['purchase_id'],
                    'product_id': row['product_id'],
                    'size': row['size'],
                    'quantity': row['quantity'],
                    'price_per_item': row['price_per_item'],
                    'created_at': row['created_at'],
                    'updated_at': row['updated_at'],
                    'product_name': row['product_name']
                }
                purchase_items.append(cls(item_data))
            
            return purchase_items

        except Exception as e:
            logging.error(f"Error fetching purchase items by purchase_id: {e}")
            return []