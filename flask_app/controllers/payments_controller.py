from flask import redirect, request, session, jsonify
from flask_app import app
from flask_app.config.mysqlconnection import connectToMySQL
from flask_app.models.client_model import Client
from flask_app.models.payments_model import Payment
from flask_app.models.purchases_model import Purchase
from decimal import Decimal, InvalidOperation
from paypalrestsdk import WebhookEvent, configure
from flask_app.models.systems_model import System
from datetime import datetime



# CREATE Payment
@app.route('/api/create_payment', methods=['POST'])
def create_payment():
    data = request.get_json()
    print(f"Incoming payload: {data}")


    # Optional validation here (e.g., amount > 0)
    if not Payment.validate_payment(data):
        return jsonify({"error": "Invalid payment data"}), 400

    # Save the payment
    payment_id = Payment.save(data)
    return jsonify({"message": "Payment created", "payment_id": payment_id}), 201

@app.route("/api/paypal_webhook", methods=["POST"])
def paypal_webhook():
    """
    Receives PayPal webhook POST events. Verifies signature,
    then updates purchases & payments in DB.
    """
    payload = request.get_json() or {}
    headers = request.headers

    print("---- Incoming PayPal Webhook ----")
    print("Payload:", payload)
    print("Headers:", dict(headers))

    try:
        # 1) Extract resource object
        resource = payload.get("resource", {})

        # 2) Grab the 'custom' field (we put system_id here as a string)
        custom_str = resource.get("custom")
        if not custom_str:
            return jsonify({"error": "Invalid webhook: missing custom/system_id"}), 400

        system_id = custom_str  # If you stored just system_id as a string

        # 3) Load system to fetch correct PayPal creds
        system_obj = System.get_system_by_id(system_id)
        if not system_obj:
            return jsonify({"error": f"Unknown system_id: {system_id}"}), 400

        # 4) Reconfigure PayPal with this system's keys
        configure({
            "mode": "sandbox",  # "live" in production
            "client_id": system_obj.paypal_client_id,
            "client_secret": system_obj.paypal_secret,
        })

        # 5) Verify the signature
        verified = WebhookEvent.verify(
            transmission_id=headers.get("PayPal-Transmission-Id", ""),
            timestamp=headers.get("PayPal-Transmission-Time", ""),
            webhook_id="960375412A707243J",  # <--- Replace with your actual Webhook ID from PayPal
            event_body=payload,
            cert_url=headers.get("PayPal-Cert-Url", ""),
            actual_sig=headers.get("PayPal-Transmission-Sig", ""),
            auth_algo=headers.get("PayPal-Auth-Algo", ""),
        )
        if not verified:
            return jsonify({"error": "Invalid webhook signature"}), 400

        # 6) Check event type
        event_type = payload.get("event_type")
        print("PayPal Webhook event_type:", event_type)

        if event_type == "PAYMENT.SALE.COMPLETED":
            # a) The resource should contain 'invoice_number' = local purchase_id
            purchase_id = resource.get("invoice_number")
            if not purchase_id:
                return jsonify({"error": "No invoice_number in resource"}), 400

            # b) Look up local purchase
            purchase_data = Purchase.get_by_id(int(purchase_id))
            if not purchase_data:
                return jsonify({"error": f"Purchase {purchase_id} not found"}), 404

            # c) Get the local client_id from the purchase row
            local_client_id = purchase_data.client_id

            # d) Parse the amount paid
            amount_obj = resource.get("amount", {})
            amount_paid = float(amount_obj.get("total", "0.00"))

            # e) Mark purchase as Paid
            Purchase.update_payment_status(purchase_id, "Paid")

            # f) Create a payment record in DB
            Payment.save({
                "client_id": local_client_id,
                "purchase_id": purchase_id,
                "payment_date": datetime.now().strftime("%Y-%m-%d"),
                "amount_paid": amount_paid,
                "payment_method": "PayPal",
            })

            return jsonify({"status": "success"}), 200

        elif event_type == "PAYMENT.SALE.PENDING":
            # Optionally handle pending payments
            return jsonify({"status": "pending"}), 200

        else:
            # If you want to handle other events or ignore them:
            return jsonify({"status": "ignored-event"}), 200

    except Exception as e:
        print("Error handling webhook:", e)
        return jsonify({"error": "Webhook processing failed"}), 500



# READ All Payments
@app.route('/api/get_all_payments', methods=['GET'])
def get_all_payments():
    payments = Payment.get_all()
    return jsonify([payment.serialize() for payment in payments]), 200


# READ Single Payment by ID
@app.route('/api/get_payment/<int:payment_id>', methods=['GET'])
def get_payment(payment_id):
    payment = Payment.get_by_id(payment_id)
    if not payment:
        return jsonify({"error": "Payment not found"}), 404
    return jsonify(payment.serialize()), 200


# UPDATE Payment


@app.route('/api/update_payment/<int:payment_id>', methods=['PUT'])
def update_payment(payment_id):
    try:
        data = request.get_json()

        # Convert amount_paid to Decimal
        if 'amount_paid' in data:
            try:
                data['amount_paid'] = Decimal(data['amount_paid'])
            except (InvalidOperation, TypeError):
                return jsonify({"error": "Invalid payment amount."}), 400

        # Fetch the payment
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Fetch the purchase
        purchase = Purchase.get_by_id(payment.purchase_id)
        if not purchase:
            print(f"Purchase ID from payment: {payment.purchase_id}")
            return jsonify({"error": "Associated purchase not found"}), 404

        # Validate the new amount
        buffer_limit = Decimal('1.5')
        if data['amount_paid'] > purchase.amount * buffer_limit:
            return jsonify({"error": "Payment amount is unusually high. Please confirm manually."}), 400

        # Update payment
        data['id'] = payment_id
        data['client_id'] = payment.client_id
        data['purchase_id'] = payment.purchase_id

        try:
            Payment.update(data)
        except Exception as e:
            print(f"SQL Update Failed: {str(e)}")
            return jsonify({"error": "Database update failed"}), 500

        # Recalculate purchase status
        total_paid = purchase.get_total_amount(purchase.id)
        if total_paid == purchase.amount:
            Purchase.update_payment_status(purchase.id, 'Paid')
        elif total_paid < purchase.amount:
            Purchase.update_payment_status(purchase.id, 'Partial')


        return jsonify({"message": "Payment updated successfully"}), 200

    except Exception as e:
        print(f"Error updating payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500







# DELETE Payment
@app.route('/api/delete_payment/<int:payment_id>', methods=['DELETE'])
def delete_payment(payment_id):
    try:
        # Check if the payment exists
        payment = Payment.get_by_id(payment_id)
        if not payment:
            return jsonify({"error": "Payment not found"}), 404

        # Delete the payment
        Payment.delete(payment_id)

        # Check associated purchase
        purchase = Purchase.get_by_id(payment.purchase_id)

        # Update purchase status if necessary
        total_paid = purchase.get_total_amount(purchase.id)
        if total_paid == 0:
            purchase.update_payment_status(purchase.id,'Pending')
        elif total_paid < purchase.amount:
            purchase.update_payment_status(purchase.id, 'Partial')
        else:
            purchase.update_payment_status(purchase.id, 'Paid')

        return jsonify({"message": "Payment deleted successfully"}), 200
    except Exception as e:
        print(f"Error deleting payment: {str(e)}")
        return jsonify({"error": "An error occurred"}), 500



# GET Payments by Client ID
@app.route('/api/get_payments_by_client/<int:client_id>', methods=['GET'])
def get_payments_by_client(client_id):
    try:
        payments = Payment.get_payments_with_order_details_by_client(client_id)
        serialized_payments = [payment.serialize() for payment in payments]
        return jsonify(serialized_payments), 200
    except Exception as e:
        print(f"Something went wrong: {str(e)}")
        return jsonify({"error": f"An error occurred: {str(e)}"}), 500



# GET Payments by Purchase ID
@app.route('/api/get_payments_by_purchase/<int:purchase_id>', methods=['GET'])
def get_payments_by_purchase(purchase_id):
    payments = Payment.get_payments_by_purchase(purchase_id)
    if not payments:
        return jsonify({"message": "No payments found for this purchase"}), 404
    return jsonify([payment.serialize() for payment in payments]), 200

