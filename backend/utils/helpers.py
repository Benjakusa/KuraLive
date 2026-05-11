import hashlib
import os
import uuid
from werkzeug.security import generate_password_hash, check_password_hash


def hash_password(password):
    return generate_password_hash(password)


def verify_password(password, hashed):
    return check_password_hash(hashed, password)


def generate_uuid():
    return str(uuid.uuid4())


def generate_token():
    return hashlib.sha256(os.urandom(32)).hexdigest()
