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
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024

    # TalkingAfrica SMS API
    TALKINGAFRICA_BASE_URL = os.getenv("TALKINGAFRICA_BASE_URL", "")
    TALKINGAFRICA_API_KEY = os.getenv("TALKINGAFRICA_API_KEY", "")
    TALKINGAFRICA_SENDER_ID = os.getenv("TALKINGAFRICA_SENDER_ID", "KuraLive")
    TALKINGAFRICA_SHORTCODE = os.getenv("TALKINGAFRICA_SHORTCODE", "")

    # Social Media OAuth
    FACEBOOK_APP_ID = os.getenv("FACEBOOK_APP_ID", "")
    FACEBOOK_APP_SECRET = os.getenv("FACEBOOK_APP_SECRET", "")
    TWITTER_CLIENT_ID = os.getenv("TWITTER_CLIENT_ID", "")
    TWITTER_CLIENT_SECRET = os.getenv("TWITTER_CLIENT_SECRET", "")
    INSTAGRAM_APP_ID = os.getenv("INSTAGRAM_APP_ID", "")
    INSTAGRAM_APP_SECRET = os.getenv("INSTAGRAM_APP_SECRET", "")
