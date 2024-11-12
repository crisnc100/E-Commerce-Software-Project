from flask_app.controllers import (client_controller, payments_controller, products_controller,
                                   purchases_controller, sizes_controller, saved_payments_controller, admin_controller)
from flask_app import app

if __name__ == "__main__":
    app.run(debug=True)