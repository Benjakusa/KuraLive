from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import login_required
from utils.helpers import generate_uuid
import base64
import requests
from datetime import datetime
from config import Config

daraja_bp = Blueprint("daraja", __name__)


def get_daraja_token():
    auth = base64.b64encode(
        f"{Config.DARAJA_CONSUMER_KEY}:{Config.DARAJA_CONSUMER_SECRET}".encode()
    ).decode()
    base_url = (
        "https://sandbox.safaricom.co.ke"
        if Config.DARAJA_ENV == "sandbox"
        else "https://api.safaricom.co.ke"
    )
    resp = requests.get(
        f"{base_url}/oauth/v1/generate?grant_type=client_credentials",
        headers={"Authorization": f"Basic {auth}"},
    )
    if resp.ok:
        data = resp.json()
        return data.get("access_token")
    return None


def format_phone(phone):
    cleaned = phone.replace(" ", "").replace("-", "")
    if cleaned.startswith("+"):
        cleaned = cleaned[1:]
    if cleaned.startswith("0"):
        cleaned = "254" + cleaned[1:]
    if not cleaned.startswith("254"):
        cleaned = "254" + cleaned
    return cleaned


@daraja_bp.route("/stk-push", methods=["POST"])
@login_required
def stk_push():
    data = request.get_json()
    phone = data.get("phoneNumber")
    amount = data.get("amount")
    account_ref = data.get("accountReference", "KuraLive")
    trans_desc = data.get("transactionDesc", "Subscription Payment")
    manager_id = data.get("manager_id", g.current_user["id"])

    if not phone or not amount:
        return jsonify({"error": "Phone number and amount required"}), 400

    token = get_daraja_token()
    if not token:
        return jsonify({"error": "Failed to get Daraja token"}), 500

    formatted_phone = format_phone(phone)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{Config.DARAJA_SHORT_CODE}{Config.DARAJA_PASSKEY}{timestamp}".encode()
    ).decode()

    base_url = (
        "https://sandbox.safaricom.co.ke"
        if Config.DARAJA_ENV == "sandbox"
        else "https://api.safaricom.co.ke"
    )
    callback_url = request.host_url.rstrip("/") + "/api/daraja/callback"

    payload = {
        "BusinessShortCode": Config.DARAJA_SHORT_CODE,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": formatted_phone,
        "PartyB": Config.DARAJA_SHORT_CODE,
        "PhoneNumber": formatted_phone,
        "CallBackURL": callback_url,
        "AccountReference": account_ref,
        "TransactionDesc": trans_desc,
    }

    resp = requests.post(
        f"{base_url}/mpesa/stkpush/v1/processrequest",
        json=payload,
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.ok:
        result = resp.json()

        query(
            """UPDATE subscriptions SET pending_payment = true, pending_plan = %s,
               checkout_request_id = %s, payment_phone = %s, payment_confirmed = false
               WHERE manager_id = %s""",
            (data.get("planId"), result.get("CheckoutRequestID"), phone, manager_id),
        )

        return jsonify(result)
    else:
        return jsonify({"error": resp.text}), 500


@daraja_bp.route("/callback", methods=["POST"])
def daraja_callback():
    callback_data = request.json
    body = callback_data.get("Body", {})
    stk_callback = body.get("stkCallback", {})

    checkout_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    result_desc = stk_callback.get("ResultDesc")
    metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])

    sub = query(
        "SELECT * FROM subscriptions WHERE checkout_request_id = %s",
        (checkout_id,),
        fetchone=True,
    )
    if not sub:
        return jsonify({"ResultCode": 1, "ResultDesc": "Subscription not found"}), 404

    if result_code == 0:
        amount = next(
            (i.get("Value") for i in metadata if i.get("Name") == "Amount"), 0
        )
        receipt = next(
            (i.get("Value") for i in metadata if i.get("Name") == "MpesaReceiptNumber"),
            None,
        )
        phone = next(
            (i.get("Value") for i in metadata if i.get("Name") == "PhoneNumber"), None
        )

        query(
            """UPDATE subscriptions SET payment_confirmed = true, mpesa_receipt = %s, updated_at = NOW()
               WHERE id = %s""",
            (receipt, sub["id"]),
        )

        query(
            """INSERT INTO payment_history (id, manager_id, amount, plan, payment_method, mpesa_receipt, phone, status)
               VALUES (%s, %s, %s, %s, 'M-Pesa', %s, %s, 'Paid')""",
            (
                generate_uuid(),
                sub["manager_id"],
                amount,
                sub.get("pending_plan"),
                receipt,
                phone or sub.get("payment_phone"),
            ),
        )

    else:
        query(
            """UPDATE subscriptions SET pending_payment = false, pending_plan = NULL,
               checkout_request_id = NULL, payment_phone = NULL, updated_at = NOW()
               WHERE id = %s""",
            (sub["id"],),
        )

    return jsonify({"ResultCode": 0, "ResultDesc": "Success"})


@daraja_bp.route("/stk-status", methods=["POST"])
@login_required
def stk_status():
    data = request.get_json()
    checkout_id = data.get("checkoutRequestID")

    if not checkout_id:
        return jsonify({"error": "CheckoutRequestID required"}), 400

    token = get_daraja_token()
    if not token:
        return jsonify({"error": "Failed to get Daraja token"}), 500

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    password = base64.b64encode(
        f"{Config.DARAJA_SHORT_CODE}{Config.DARAJA_PASSKEY}{timestamp}".encode()
    ).decode()

    base_url = (
        "https://sandbox.safaricom.co.ke"
        if Config.DARAJA_ENV == "sandbox"
        else "https://api.safaricom.co.ke"
    )

    resp = requests.post(
        f"{base_url}/mpesa/stkpushquery/v1/query",
        json={
            "BusinessShortCode": Config.DARAJA_SHORT_CODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_id,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    if resp.ok:
        return jsonify(resp.json())
    return jsonify({"error": resp.text}), 500


@daraja_bp.route("/send-email", methods=["POST"])
@login_required
def send_agent_email():
    data = request.get_json()
    email = data.get("email")
    password = data.get("password")
    name = data.get("name", "Agent")

    if not email or not password:
        return jsonify({"error": "Missing email or password"}), 400

    if not Config.RESEND_API_KEY:
        return jsonify({"message": "Mock success (missing API key)"})

    html = f"""
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a202c;">
        <h2 style="color: #008080;">Welcome to KuraLive, {name}!</h2>
        <p>An administrator has created an agent account for you.</p>
        <div style="background-color: #f7fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; margin: 20px 0;">
            <p style="margin: 0 0 10px 0;"><strong>Login Details:</strong></p>
            <p style="margin: 0 0 5px 0;">Email: <strong>{email}</strong></p>
            <p style="margin: 0;">Temporary Password: <strong>{password}</strong></p>
        </div>
        <p style="color: #c53030; font-size: 0.9em;"><em>You will be required to change this temporary password upon first login.</em></p>
        <br>
        <a href="https://localhost:5173/login" style="background-color: #008080; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">Login to Secure Portal</a>
    </div>
    """

    try:
        resp = requests.post(
            "https://api.resend.com/emails",
            json={
                "from": "KuraLive Support <onboarding@resend.dev>",
                "to": email,
                "subject": "Your KuraLive Agent Security Credentials",
                "html": html,
            },
            headers={
                "Authorization": f"Bearer {Config.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
        )
        return jsonify(resp.json())
    except Exception as e:
        return jsonify({"error": str(e)}), 500
