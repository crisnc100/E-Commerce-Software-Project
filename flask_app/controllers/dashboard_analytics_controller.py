from flask import jsonify, session, request, make_response
from flask_app import app
from flask_app.models.client_model import Client
from flask_app.models.products_model import Product
from flask_app.models.purchases_model import Purchase
from flask_app.models.payments_model import PaymentModel
from datetime import datetime, timedelta
import pdfkit




#Recent Activites Section: 
@app.route('/api/get_recent_activities', methods=['GET'])
def get_recent_activities():
    try:
        # Calculate the time interval
        time_span = int(request.args.get('time_span', 3))  # Default to 72 hours

        since_date = datetime.now() - timedelta(days=time_span)
        # Fetch data from models
        recent_clients = Client.get_recent_clients(since_date)

        recent_products = Product.get_recent_products(since_date)

        recent_purchases = Purchase.get_recent_purchases(since_date)

        recent_payments = PaymentModel.get_recent_payments(since_date)

        recent_shipping_updates = Purchase.get_recent_shipping_updates(since_date)

        # Combine and sort
        all_activities = (
            recent_clients +
            recent_products +
            recent_purchases +
            recent_payments +
            recent_shipping_updates
        )

        # Sort by created_at
        sorted_activities = sorted(all_activities, key=lambda x: x['created_at'], reverse=True)

        return jsonify({'recent_activities': sorted_activities}), 200

    except Exception as e:
        print(f"Error fetching recent activities: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500


@app.route('/api/get_weekly_metrics', methods=['GET'])
def get_weekly_metrics():
    try:
        weekly_sales_metrics = Purchase.calculate_weekly_metrics()
        new_clients = Client.count_new_clients_last_week()

        response = {
            'weekly_metrics': weekly_sales_metrics,
            'new_clients': new_clients,
        }
        return jsonify(response), 200
    except Exception as e:
        print(f"Error fetching weekly metrics: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500
    
# For dashboard component page:
@app.route('/api/get_monthly_metrics', methods=['GET'])
def get_monthly_metrics():
    try:
        year = int(request.args.get('year', datetime.now().year))
        monthly_sales_metrics = Purchase.calculate_monthly_metrics(year)
        new_clients = Client.count_new_clients_monthly(year)

        response = {
            'monthly_metrics': monthly_sales_metrics,
            'new_clients_by_month': new_clients,
        }
        return jsonify(response), 200
    except Exception as e:
        print(f"Error fetching monthly metrics: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500
    


#Analytics Component:
@app.route('/api/get_single_month_metrics', methods=['GET'])
def get_month_metrics_for_month():
    try:
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        
        monthly_data = Purchase.calculate_single_monthly_metrics(year, month)
        new_clients = Client.count_single_monthly_new_clients(year, month)

        return jsonify({
            'monthly_metrics': monthly_data,
            'new_clients': new_clients
        }), 200
    except Exception as e:
        print(f"Error fetching monthly metrics for month: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500

@app.route('/api/get_yearly_metrics', methods=['GET'])
def get_yearly_metrics():
    try:
        # Optional year parameter; if not provided, fetch metrics for all years
        year = request.args.get('year')
        year = int(year) if year else None

        # Fetch yearly metrics
        yearly_metrics = Purchase.calculate_yearly_metrics(year)

        # Fetch yearly new clients data
        new_clients = [
            row for row in Client.count_new_clients_yearly()
            if row['year'] == year
        ]
        response = {
            'yearly_metrics': yearly_metrics,
            'new_clients_by_year': new_clients,
        }
        return jsonify(response), 200
    except Exception as e:
        print(f"Error fetching yearly metrics: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500

@app.route('/api/get_monthly_metrics_for_year', methods=['GET'])
def get_monthly_metrics_for_year():
    try:
        year = int(request.args.get('year', datetime.now().year))
        monthly_data = []
        for m in range(1, 13):
            metrics = Purchase.calculate_single_monthly_metrics(year, m)
            monthly_data.append({
                'month': m,
                'gross_sales': metrics['gross_sales'],
                'revenue_earned': metrics['revenue_earned'],
                'net_sales': metrics['net_sales']
            })

        return jsonify({'monthly_metrics': monthly_data}), 200
    except Exception as e:
        print(f"Error fetching monthly metrics for year: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500



@app.route('/api/get_top_products', methods=['GET'])
def get_top_products():
    """
    Endpoint to return top products based on 'metric' query param.
    - ?metric=clients => Top by distinct clients
    - ?metric=sales   => Top by total sales
    Default is 'clients'.
    """
    try:
        year = int(request.args.get('year', datetime.now().year))
        month = int(request.args.get('month', datetime.now().month))
        metric = request.args.get('metric', 'clients').lower()

        if metric == 'clients':
            # For example, use threshold=2 so only products with >=2 distinct clients appear
            result = Product.get_top_products_by_clients(year, month, threshold=2, top_n=3)
        elif metric == 'sales':
            # Show top 3 by total sales
            result = Product.get_top_products_by_sales(year, month, top_n=3)
        else:
            return jsonify({
                'message': f"Invalid 'metric' value '{metric}'. Use 'clients' or 'sales'."
            }), 400

        return jsonify({'top_products': result}), 200

    except Exception as e:
        print(f"Error fetching top products: {e}")
        return jsonify({'message': 'Internal Server Error'}), 500







