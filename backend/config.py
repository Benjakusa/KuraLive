import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-this-in-production")
    DATABASE_URL = os.getenv(
        "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/kuralive"
    )
    DARAJA_CONSUMER_KEY = os.getenv("DARAJA_CONSUMER_KEY")
    DARAJA_CONSUMER_SECRET = os.getenv("DARAJA_CONSUMER_SECRET")
    DARAJA_PASSKEY = os.getenv(
        "DARAJA_PASSKEY",
        "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
    )
    DARAJA_SHORT_CODE = os.getenv("DARAJA_SHORT_CODE", "174379")
    DARAJA_ENV = os.getenv("DARAJA_ENV", "sandbox")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    UPLOAD_FOLDER = os.path.join(
        os.path.dirname(__file__), os.getenv("UPLOAD_FOLDER", "uploads")
    )
    MAX_CONTENT_LENGTH = 10 * 1024 * 1024
