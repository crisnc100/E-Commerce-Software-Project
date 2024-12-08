from flask_app.controllers import (client_controller, payments_controller, products_controller,
                                   purchases_controller, saved_payments_controller, admin_controller)
from flask_app import app
import os


if __name__ == "__main__":
    # Only import the scheduler if this is the main process
    if os.environ.get("WERKZEUG_RUN_MAIN") == "true":
        import flask_app.scheduler  # Import the scheduler module only once
    app.run(debug=True)