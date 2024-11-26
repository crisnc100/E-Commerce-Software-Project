from apscheduler.schedulers.background import BackgroundScheduler
import atexit
from datetime import datetime
from flask_app.models.purchases_model import Purchase
from flask_app import app

def update_overdue_purchases():
    with app.app_context():
        try:
            Purchase.update_overdue_purchases()
            print(f"[{datetime.utcnow()}] Overdue purchases updated successfully.")
        except Exception as e:
            print(f"Error updating overdue purchases: {e}")

def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(func=update_overdue_purchases, trigger='interval', hours=24)
    scheduler.start()
    # Shut down the scheduler when exiting the app
    atexit.register(lambda: scheduler.shutdown())

start_scheduler()
