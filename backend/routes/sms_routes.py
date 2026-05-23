import json
import re
import io
import hashlib
import time
import requests
from flask import Blueprint, request, jsonify, g
from database import query
from utils.decorators import manager_required
from utils.helpers import generate_uuid
from config import Config

sms_bp = Blueprint("sms", __name__)

E164_RE = re.compile(r"^\+?[1-9]\d{6,14}$")


def normalize_phone(raw):
    """Normalize to E.164-ish (keep + prefix if present, strip spaces/dashes)."""
    cleaned = re.sub(r"[\s\-\(\).]", "", str(raw).strip())
    
    if re.match(r"^0[17]\d{8}$", cleaned):
        cleaned = "+254" + cleaned[1:]
    elif re.match(r"^254[17]\d{8}$", cleaned):
        cleaned = "+" + cleaned
    elif re.match(r"^[17]\d{8}$", cleaned):
        cleaned = "+254" + cleaned
        
    if E164_RE.match(cleaned):
        return cleaned
    return None


def fill_template(message, name="", station="", county=""):
    """Replace {{name}}, {{station}}, {{county}} placeholders in a message."""
    msg = message
    msg = msg.replace("{{name}}", name or "Voter")
    msg = msg.replace("{{station}}", station or "your polling station")
    msg = msg.replace("{{county}}", county or "your county")
    return msg


def send_twilio_sms(recipients, message, campaign_id, manager_id):
    """
    Send SMS via Twilio to a list of recipient dicts:
      [{"phone": "+254...", "name": "", "station": "", "county": ""}, ...]
    Also accepts a plain list of phone-number strings (legacy).
    Returns (sent_count, failed_count).
    """
    from twilio.rest import Client

    account_sid = "PLACEHOLDER_ACCOUNT_SID"
    auth_token = "PLACEHOLDER_AUTH_TOKEN"
    twilio_number = "PLACEHOLDER_PHONE_NUMBER"

    client = Client(account_sid, auth_token)

    sent, failed = 0, 0
    has_variables = any(v in message for v in ["{{name}}", "{{station}}", "{{county}}"])

    for r in recipients:
        # Support both dict-style recipients and plain phone strings
        if isinstance(r, dict):
            number = r.get("phone", "")
            body = fill_template(
                message,
                name=r.get("name", ""),
                station=r.get("station", ""),
                county=r.get("county", ""),
            ) if has_variables else message
        else:
            number = r
            body = message

        if not number:
            failed += 1
            continue

        try:
            client.messages.create(body=body, from_=twilio_number, to=number)
            sent += 1
        except Exception as e:
            print(f"[Twilio SMS] Failed for {number}: {e}")
            failed += 1

    # Update campaign counts
    query(
        "UPDATE sms_campaigns SET sent_count = %s, failed_count = %s WHERE id = %s",
        (sent, failed, campaign_id),
    )
    return sent, failed


# ── CAMPAIGNS LIST ────────────────────────────────────


@sms_bp.route("/campaigns", methods=["GET"])
@manager_required
def list_campaigns():
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    search = request.args.get("search", "")
    offset = (page - 1) * per_page
    mid = g.current_user["id"]

    if search:
        rows = query(
            "SELECT * FROM sms_campaigns WHERE manager_id = %s AND message ILIKE %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (mid, f"%{search}%", per_page, offset),
            fetchall=True,
        )
        total = query(
            "SELECT COUNT(*) as c FROM sms_campaigns WHERE manager_id = %s AND message ILIKE %s",
            (mid, f"%{search}%"),
            fetchone=True,
        )["c"]
    else:
        rows = query(
            "SELECT * FROM sms_campaigns WHERE manager_id = %s "
            "ORDER BY created_at DESC LIMIT %s OFFSET %s",
            (mid, per_page, offset),
            fetchall=True,
        )
        total = query(
            "SELECT COUNT(*) as c FROM sms_campaigns WHERE manager_id = %s",
            (mid,),
            fetchone=True,
        )["c"]

    return jsonify({"data": rows or [], "total": total, "page": page, "per_page": per_page})


@sms_bp.route("/campaigns/<cid>", methods=["DELETE"])
@manager_required
def delete_campaign(cid):
    query("DELETE FROM sms_campaigns WHERE id = %s AND manager_id = %s", (cid, g.current_user["id"]))
    return jsonify({"message": "Campaign deleted"})


# ── BROADCAST ─────────────────────────────────────────


@sms_bp.route("/broadcast", methods=["POST"])
@manager_required
def broadcast():
    data = request.get_json()
    message = (data.get("message") or "").strip()
    scheduled_at = data.get("scheduled_at")

    if not message:
        return jsonify({"error": "Message is required"}), 400

    mid = g.current_user["id"]
    campaign_id = generate_uuid()

    # Support rich recipients (list of dicts with phone/name/station/county)
    # or legacy plain numbers list
    raw_recipients = data.get("recipients") or []
    raw_numbers = data.get("numbers", [])

    if raw_recipients:
        # Validate & normalise phones within the dicts
        valid_recipients = []
        seen = set()
        for r in raw_recipients:
            phone = normalize_phone(r.get("phone", "") if isinstance(r, dict) else r)
            if phone and phone not in seen:
                seen.add(phone)
                if isinstance(r, dict):
                    valid_recipients.append({**r, "phone": phone})
                else:
                    valid_recipients.append(phone)
        invalid_count = len(raw_recipients) - len(valid_recipients)
        phone_list = [r["phone"] if isinstance(r, dict) else r for r in valid_recipients]
    else:
        # Legacy plain-number path
        valid_recipients = []
        seen = set()
        for raw in raw_numbers:
            phone = normalize_phone(raw)
            if phone and phone not in seen:
                seen.add(phone)
                valid_recipients.append(phone)
        invalid_count = len(raw_numbers) - len(valid_recipients)
        phone_list = valid_recipients

    if not valid_recipients:
        return jsonify({"error": "No valid recipient numbers provided"}), 400

    query(
        """INSERT INTO sms_campaigns
           (id, manager_id, message, recipient_count, status, recipient_numbers, scheduled_at)
           VALUES (%s, %s, %s, %s, %s, %s, %s)""",
        (
            campaign_id,
            mid,
            message,
            len(valid_recipients),
            "scheduled" if scheduled_at else "sending",
            json.dumps(phone_list),
            scheduled_at,
        ),
    )

    if not scheduled_at:
        sent, failed = send_twilio_sms(valid_recipients, message, campaign_id, mid)
        query(
            "UPDATE sms_campaigns SET status = 'sent', sent_at = NOW(), sent_count = %s, failed_count = %s WHERE id = %s",
            (sent, failed, campaign_id),
        )
    else:
        sent = failed = 0

    campaign = query("SELECT * FROM sms_campaigns WHERE id = %s", (campaign_id,), fetchone=True)
    return jsonify({
        "data": campaign,
        "invalid_numbers": invalid_count,
    }), 201


# ── UPLOAD NUMBERS ────────────────────────────────────


@sms_bp.route("/upload-numbers", methods=["POST"])
@manager_required
def upload_numbers():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    f = request.files["file"]
    filename = f.filename.lower()
    numbers_raw = []

    try:
        if filename.endswith(".csv"):
            content = f.read().decode("utf-8", errors="ignore")
            for line in content.splitlines():
                for cell in line.split(","):
                    cell = cell.strip().strip('"').strip("'")
                    if cell:
                        numbers_raw.append(cell)
        elif filename.endswith(".xlsx") or filename.endswith(".xls"):
            import openpyxl
            wb = openpyxl.load_workbook(io.BytesIO(f.read()), data_only=True)
            ws = wb.active
            for row in ws.iter_rows(values_only=True):
                for cell in row:
                    if cell is not None:
                        numbers_raw.append(str(cell))
        else:
            return jsonify({"error": "Only CSV and XLSX files are supported"}), 400
    except Exception as e:
        return jsonify({"error": f"Failed to parse file: {str(e)}"}), 422

    valid_set = {}
    invalid = []
    for raw in numbers_raw:
        normalized = normalize_phone(raw)
        if normalized and normalized not in valid_set:
            valid_set[normalized] = raw
        else:
            invalid.append(raw)

    valid_list = list(valid_set.keys())
    preview = valid_list[:10]

    return jsonify({
        "numbers": valid_list,
        "count": len(valid_list),
        "invalid_count": len(invalid),
        "preview": preview,
    })


# ── DELIVERY REPORT WEBHOOK ───────────────────────────


@sms_bp.route("/delivery-report", methods=["POST"])
def delivery_report():
    data = request.get_json() or request.form.to_dict()
    # TalkingAfrica sends: messageId, status, phoneNumber
    print(f"[SMS Delivery] {data}")
    # Update individual message status if tracked in future
    return jsonify({"ok": True})


# ── TEMPLATES ─────────────────────────────────────────


@sms_bp.route("/templates", methods=["GET"])
@manager_required
def list_templates():
    rows = query(
        "SELECT * FROM sms_templates WHERE manager_id = %s ORDER BY created_at DESC",
        (g.current_user["id"],),
        fetchall=True,
    )
    return jsonify({"data": rows or []})


@sms_bp.route("/templates", methods=["POST"])
@manager_required
def save_template():
    data = request.get_json()
    name = (data.get("name") or "").strip()
    content = (data.get("content") or "").strip()
    if not name or not content:
        return jsonify({"error": "Name and content required"}), 400
    tid = generate_uuid()
    query(
        "INSERT INTO sms_templates (id, manager_id, name, content) VALUES (%s, %s, %s, %s)",
        (tid, g.current_user["id"], name, content),
    )
    row = query("SELECT * FROM sms_templates WHERE id = %s", (tid,), fetchone=True)
    return jsonify({"data": row}), 201


@sms_bp.route("/templates/<tid>", methods=["DELETE"])
@manager_required
def delete_template(tid):
    query("DELETE FROM sms_templates WHERE id = %s AND manager_id = %s", (tid, g.current_user["id"]))
    return jsonify({"message": "Template deleted"})
