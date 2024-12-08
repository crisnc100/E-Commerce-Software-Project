from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from datetime import datetime
from flask_app.models.purchases_model import Purchase
from flask_app import app

# Function to update overdue purchases
def update_overdue_purchases():
    with app.app_context():
        try:
            Purchase.update_overdue_purchases()
            print(f"[{datetime.utcnow()}] Overdue purchases updated successfully.")
        except Exception as e:
            print(f"Error updating overdue purchases: {e}")

# Function to notify for pending deliveries
def notify_pending_deliveries():
    with app.app_context():
        try:
            # Fetch all purchases that are "Paid" but not marked "Delivered" after 28 days
            pending_deliveries = Purchase.check_for_pending_deliveries()
            
            if not pending_deliveries:
                print(f"[{datetime.utcnow()}] No pending deliveries requiring action.")
                return
            
            print(f"[{datetime.utcnow()}] Notifying for {len(pending_deliveries)} pending deliveries.")
            
            for purchase in pending_deliveries:
                # Notification or logging
                print(f"Pending Delivery Notification: "
                      f"Purchase ID {purchase.id}, Product: {purchase.product_name}, "
                      f"Client: {purchase.client_first_name} {purchase.client_last_name}, "
                      f"Purchase Date: {purchase.purchase_date}")
            
        except Exception as e:
            print(f"Error notifying pending deliveries: {e}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=update_overdue_purchases, trigger='interval', hours=24)
    scheduler.add_job(func=notify_pending_deliveries, trigger='interval', hours=24)

    scheduler.start()
    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())

start_scheduler()
