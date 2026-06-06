import hashlib
import os
import json
import re
import uuid
import secrets
from werkzeug.security import generate_password_hash, check_password_hash


E164_RE = re.compile(r"^\+?[1-9]\d{6,14}$")


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, hashed):
    return check_password_hash(hashed, password)


def generate_uuid():
    return str(uuid.uuid4())


def generate_token():
    return hashlib.sha256(os.urandom(32)).hexdigest()


def generate_secure_token(length=32):
    return secrets.token_urlsafe(length)


def safe_json_loads(value, default=None):
    if value is None:
        return default
    if isinstance(value, (dict, list)):
        return value
    try:
        return json.loads(value)
    except (json.JSONDecodeError, TypeError):
        return default


def normalize_phone(raw):
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


def sanitize_filename(filename):
    name, ext = os.path.splitext(filename)
    safe_name = hashlib.sha256(name.encode()).hexdigest()[:16]
    safe_ext = "".join(c for c in ext if c.isalnum() or c in ".")
    return f"{os.getpid()}_{safe_name}{safe_ext}".lower()


def generate_session_hash(request):
    ip = (
        request.headers.get("X-Forwarded-For", request.remote_addr or "unknown")
        .split(",")[0]
        .strip()
    )
    ua = request.headers.get("User-Agent", "")
    raw = f"{ip}|{ua}"
    return hashlib.sha256(raw.encode()).hexdigest()


def fill_template(message, name="", station="", county=""):
    msg = message
    msg = msg.replace("{{name}}", name or "Voter")
    msg = msg.replace("{{station}}", station or "your polling station")
    msg = msg.replace("{{county}}", county or "your county")
    return msg
