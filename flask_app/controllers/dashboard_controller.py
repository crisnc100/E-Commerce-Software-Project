from flask import jsonify, session, request
from flask_app import app
from flask_app.models.client_model import Client
from flask_app.models.products_model import Product
from flask_app.models.purchases_model import Purchase
from flask_app.models.payments_model import Payment
from datetime import datetime, timedelta


#Recent Activites Section: 
@app.route('/api/get_recent_activities', methods=['GET'])
def get_recent_activities():
    try:
        # Calculate 7-day interval
        time_span = int(request.args.get('time_span', 3))  # Default to 72 hours
        print(f"Received time_span: {time_span}")  # Add this for debugging

        since_date = datetime.now() - timedelta(days=time_span)
        print(f"Since Date: {since_date}")  # Add this for debugging


        # Fetch data from models
        recent_clients = Client.get_recent_clients(since_date)
        recent_products = Product.get_recent_products(since_date)
        recent_purchases = Purchase.get_recent_purchases(since_date)
        recent_payments = Payment.get_recent_payments(since_date)
        recent_shipping_updates = Purchase.get_recent_shipping_updates(since_date)

        # Combine and sort by created_at
        all_activities = (
            recent_clients +
            recent_products +
            recent_purchases +
            recent_payments +
            recent_shipping_updates
        )
        sorted_activities = sorted(all_activities, key=lambda x: x['created_at'], reverse=True)

        return jsonify({'recent_activities': sorted_activities}), 200

    except Exception as e:
        print(f"Error fetching recent activities: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500
