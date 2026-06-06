import base64
import hashlib
import hmac
import requests as http_requests
import logging
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import login_required
from utils.helpers import generate_uuid, normalize_phone
from datetime import datetime
from config import Config

logger = logging.getLogger(__name__)

daraja_bp = Blueprint("daraja", __name__)

# Known Safaricom production IP ranges for callback validation
SAFARICOM_CIDRS = [
    "196.201.214.0/24",
    "196.201.214.128/26",
    "196.201.213.0/24",
    "196.201.213.44/28",
    "196.201.213.60/28",
    "196.201.213.32/28",
    "196.201.212.0/24",
    "10.0.0.0/8",
]


def _ip_in_cidr(ip, cidr):
    import ipaddress

    try:
        return ipaddress.ip_address(ip) in ipaddress.ip_network(cidr, strict=False)
    except ValueError:
        return False


def _is_safaricom_request():
    ip = request.headers.get("X-Forwarded-For", request.remote_addr or "")
    client_ip = ip.split(",")[0].strip()
    if Config.DARAJA_ENV == "sandbox":
        return True
    return any(_ip_in_cidr(client_ip, cidr) for cidr in SAFARICOM_CIDRS)


def get_daraja_token():
    from extensions import cache
    token = cache.get("daraja_oauth_token")
    if token:
        return token

    auth = base64.b64encode(
        f"{Config.DARAJA_CONSUMER_KEY}:{Config.DARAJA_CONSUMER_SECRET}".encode()
    ).decode()
    base_url = (
        "https://sandbox.safaricom.co.ke"
        if Config.DARAJA_ENV == "sandbox"
        else "https://api.safaricom.co.ke"
    )
    try:
        resp = http_requests.get(
            f"{base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {auth}"},
            timeout=10,
        )
        if resp.ok:
            data = resp.json()
            token = data.get("access_token")
            # Usually expires in 3599 seconds, we cache for 50 minutes to be safe
            cache.set("daraja_oauth_token", token, timeout=3000)
            return token
    except Exception as e:
        logger.error(f"Failed to get Daraja token: {e}")
    return None


def format_phone(phone):
    return normalize_phone(phone) or phone


@daraja_bp.route("/stk-push", methods=["POST"])
@login_required
def stk_push():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    phone = data.get("phoneNumber")
    amount = data.get("amount")
    account_ref = data.get("accountReference", "Uchaguzi360")
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

    try:
        resp = http_requests.post(
            f"{base_url}/mpesa/stkpush/v1/processrequest",
            json=payload,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
    except Exception as e:
        logger.error(f"Daraja STK push failed: {e}")
        return jsonify({"error": "Payment service temporarily unavailable"}), 502

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
        logger.error(f"Daraja STK push error: {resp.text}")
        return jsonify({"error": "Payment initiation failed"}), 500


@daraja_bp.route("/callback", methods=["POST"])
def daraja_callback():
    if not _is_safaricom_request():
        logger.warning(f"Callback from non-Safaricom IP: {request.remote_addr}")
        return jsonify({"ResultCode": 1, "ResultDesc": "Forbidden"}), 403

    callback_data = request.json
    if not callback_data:
        return jsonify({"ResultCode": 1, "ResultDesc": "Invalid callback data"}), 400

    body = callback_data.get("Body", {})
    stk_callback = body.get("stkCallback", {})

    checkout_id = stk_callback.get("CheckoutRequestID")
    result_code = stk_callback.get("ResultCode")
    result_desc = stk_callback.get("ResultDesc")
    metadata = stk_callback.get("CallbackMetadata", {}).get("Item", [])

    if not checkout_id:
        logger.warning(f"Daraja callback missing checkout_id: {callback_data}")
        return jsonify(
            {"ResultCode": 1, "ResultDesc": "Missing CheckoutRequestID"}
        ), 400

    sub = query(
        "SELECT * FROM subscriptions WHERE checkout_request_id = %s",
        (checkout_id,),
        fetchone=True,
    )
    if not sub:
        logger.warning(f"Daraja callback for unknown checkout: {checkout_id}")
        return jsonify({"ResultCode": 1, "ResultDesc": "Subscription not found"}), 404

    if result_code == 0:
        try:
            metadata_dict = {
                item.get("Name"): item.get("Value")
                for item in metadata
                if item.get("Name")
            }
            amount = metadata_dict.get("Amount", 0)
            receipt = metadata_dict.get("MpesaReceiptNumber")
            phone = metadata_dict.get("PhoneNumber")

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
            logger.info(
                f"Payment confirmed for subscription {sub['id']}, receipt: {receipt}"
            )
        except Exception as e:
            logger.error(f"Error processing Daraja callback: {e}")
            return jsonify({"ResultCode": 1, "ResultDesc": "Processing error"}), 500
    else:
        query(
            """UPDATE subscriptions SET pending_payment = false, pending_plan = NULL,
               checkout_request_id = NULL, payment_phone = NULL, updated_at = NOW()
               WHERE id = %s""",
            (sub["id"],),
        )
        logger.info(f"Payment failed for subscription {sub['id']}: {result_desc}")

    return jsonify({"ResultCode": 0, "ResultDesc": "Success"})


@daraja_bp.route("/stk-status", methods=["POST"])
@login_required
def stk_status():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

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

    try:
        resp = http_requests.post(
            f"{base_url}/mpesa/stkpushquery/v1/query",
            json={
                "BusinessShortCode": Config.DARAJA_SHORT_CODE,
                "Password": password,
                "Timestamp": timestamp,
                "CheckoutRequestID": checkout_id,
            },
            headers={"Authorization": f"Bearer {token}"},
            timeout=10,
        )
        if resp.ok:
            return jsonify(resp.json())
        logger.error(f"STK status query error: {resp.text}")
        return jsonify({"error": "Status query failed"}), 500
    except Exception as e:
        logger.error(f"STK status query exception: {e}")
        return jsonify({"error": "Payment service unavailable"}), 502


@daraja_bp.route("/send-email", methods=["POST"])
@login_required
def send_agent_email():
    """
    Called after agent creation to send onboarding info.
    SECURITY FIX: This no longer accepts a password in the payload. Let the
    email_service send standard onboarding info without credentials.
    """
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required"}), 400

    email = data.get("email")
    name = data.get("name", "Agent")

    if not email:
        return jsonify({"error": "Missing email"}), 400

    from services.email_service import send_agent_welcome
    login_url = f"{Config.FRONTEND_URL}/login"
    
    success = send_agent_welcome(email, name, login_url)
    
    if success:
        return jsonify({"message": "Agent onboarding email sent successfully"})
    else:
        # We don't fail the request, we just acknowledge the email wasn't delivered.
        # This mirrors the tolerant nature of background delivery.
        return jsonify({"error": "Failed to send email or email not configured"}), 500
