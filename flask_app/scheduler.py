from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from datetime import datetime
from flask_app.models.purchases_model import Purchase
from flask_app.models.systems_model import System
from flask_app import app

# Function to update overdue purchases
# Function to update overdue purchases for all systems
def update_overdue_purchases():
    with app.app_context():
        try:
            # Fetch all system IDs dynamically
            all_system_ids = System.get_all_system_ids()
            if not all_system_ids:
                print(f"[{datetime.utcnow()}] No systems found. Skipping overdue purchases update.")
                return

            # Iterate over each system and update overdue purchases
            for system_id in all_system_ids:
                print(f"[{datetime.utcnow()}] Updating overdue purchases for system_id: {system_id}")
                Purchase.update_overdue_purchases(system_id)
                print(f"[{datetime.utcnow()}] Overdue purchases updated successfully for system_id: {system_id}")

        except Exception as e:
            print(f"[{datetime.utcnow()}] Error updating overdue purchases: {e}")

# Function to notify for pending deliveries
def notify_pending_deliveries():
    with app.app_context():
        try:
            # Dynamically fetch all system IDs
            all_system_ids = System.get_all_system_ids()
            if not all_system_ids:
                print(f"[{datetime.utcnow()}] No systems found. Skipping pending deliveries notification.")
                return

            # Iterate over each system and check for pending deliveries
            for system_id in all_system_ids:
                print(f"[{datetime.utcnow()}] Checking pending deliveries for system_id: {system_id}")
                pending_deliveries = Purchase.check_for_pending_deliveries(system_id)

                if not pending_deliveries:
                    print(f"[{datetime.utcnow()}] No pending deliveries found for system_id: {system_id}")
                    continue
                
        except Exception as e:
            print(f"[{datetime.utcnow()}] Error notifying pending deliveries: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()

    scheduler.add_job(func=update_overdue_purchases, trigger='interval', hours=24)
    scheduler.add_job(func=notify_pending_deliveries, trigger='interval', minutes=1)

    scheduler.start()

    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())

start_scheduler()
