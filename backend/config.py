import os
import sys
from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY")
    DATABASE_URL = os.getenv("DATABASE_URL")
    DARAJA_CONSUMER_KEY = os.getenv("DARAJA_CONSUMER_KEY")
    DARAJA_CONSUMER_SECRET = os.getenv("DARAJA_CONSUMER_SECRET")
    DARAJA_PASSKEY = os.getenv("DARAJA_PASSKEY")
    DARAJA_SHORT_CODE = os.getenv("DARAJA_SHORT_CODE", "174379")
    DARAJA_ENV = os.getenv("DARAJA_ENV", "sandbox")
    RESEND_API_KEY = os.getenv("RESEND_API_KEY")
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), os.getenv("UPLOAD_FOLDER", "uploads"))
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    TWILIO_ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID")
    TWILIO_AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN")
    TWILIO_PHONE_NUMBER = os.getenv("TWILIO_PHONE_NUMBER")

    TALKINGAFRICA_BASE_URL = os.getenv("TALKINGAFRICA_BASE_URL")
    TALKINGAFRICA_API_KEY = os.getenv("TALKINGAFRICA_API_KEY")
    TALKINGAFRICA_SENDER_ID = os.getenv("TALKINGAFRICA_SENDER_ID", "Uchaguzi360")
    TALKINGAFRICA_SHORTCODE = os.getenv("TALKINGAFRICA_SHORTCODE")

    FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID")
    FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET")
    TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID")
    TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET")
    INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID")
    INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET")

    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "false").lower() == "true"
    REDIS_URL = os.getenv("REDIS_URL", "")
    DISABLE_RATE_LIMIT = os.getenv("DISABLE_RATE_LIMIT", "false").lower() == "true"

    # Pagination hard limits — never serve more than this in a single request
    MAX_PAGE_SIZE = int(os.getenv("MAX_PAGE_SIZE", 200))
    DEFAULT_PAGE_SIZE = int(os.getenv("DEFAULT_PAGE_SIZE", 50))

    @classmethod
    def validate(cls):
        errors = []
        if not cls.SECRET_KEY:
            errors.append("SECRET_KEY is required")
        elif len(cls.SECRET_KEY) < 32:
            errors.append("SECRET_KEY must be at least 32 characters")
        if not cls.DATABASE_URL:
            errors.append("DATABASE_URL is required")
        # Warn loudly if sandbox credentials are used in production
        if cls.DARAJA_ENV not in ("sandbox", "production"):
            errors.append("DARAJA_ENV must be 'sandbox' or 'production'")
        if cls.DARAJA_ENV == "production":
            if not cls.DARAJA_CONSUMER_KEY:
                errors.append("DARAJA_CONSUMER_KEY is required in production")
            if not cls.DARAJA_CONSUMER_SECRET:
                errors.append("DARAJA_CONSUMER_SECRET is required in production")
            if not cls.DARAJA_PASSKEY:
                errors.append("DARAJA_PASSKEY is required in production")
            if cls.DARAJA_SHORT_CODE == "174379":
                errors.append(
                    "DARAJA_SHORT_CODE '174379' is the sandbox short code — "
                    "set the production short code via env var"
                )
        if errors:
            print("Configuration errors:", file=sys.stderr)
            for e in errors:
                print(f"  - {e}", file=sys.stderr)
            sys.exit(1)
