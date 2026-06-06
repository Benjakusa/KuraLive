"""
email_service.py — Centralised email sending via Resend API.

Previously, Resend HTTP calls were duplicated in auth_routes.py and
daraja_routes.py. All email sending now goes through this module.
"""
import logging
import requests

from config import Config

logger = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"
_FROM_ADDRESS = "Uchaguzi360 Support <onboarding@resend.dev>"


def _send(to: str, subject: str, html: str) -> bool:
    """
    Send an email via Resend. Returns True on success, False otherwise.
    Never raises — failures are logged and swallowed so callers don't fail.
    """
    if not Config.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not configured — email not sent to %s", to)
        return False
    try:
        resp = requests.post(
            _RESEND_URL,
            json={"from": _FROM_ADDRESS, "to": to, "subject": subject, "html": html},
            headers={
                "Authorization": f"Bearer {Config.RESEND_API_KEY}",
                "Content-Type": "application/json",
            },
            timeout=10,
        )
        if resp.ok:
            logger.info("Email sent to %s (subject: %s)", to, subject)
            return True
        logger.error("Resend error %s for %s: %s", resp.status_code, to, resp.text)
        return False
    except Exception as exc:
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_password_reset(to: str, name: str, reset_link: str) -> bool:
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;">
      <h2>Password Reset Request</h2>
      <p>Hi {name},</p>
      <p>Click the link below to reset your password. This link expires in 1 hour.</p>
      <a href="{reset_link}"
         style="background-color:#008080;color:white;padding:12px 24px;
                text-decoration:none;border-radius:6px;display:inline-block;">
        Reset Password
      </a>
      <p style="margin-top:20px;">If you did not request this, please ignore this email.</p>
    </div>
    """
    return _send(to, "Reset Your Uchaguzi360 Password", html)


def send_agent_welcome(to: str, name: str, login_url: str) -> bool:
    """
    Send a welcome email to a newly created agent.

    IMPORTANT: The temporary password is intentionally NOT included here.
    Managers must share credentials through a secure out-of-band channel,
    or use the password-reset flow to let the agent set their own password.
    """
    html = f"""
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#1a202c;">
      <h2 style="color:#008080;">Welcome to Uchaguzi360, {name}!</h2>
      <p>An administrator has created an agent account for you.</p>
      <p>
        Please use the <strong>Forgot Password</strong> flow on the login page
        to set your own secure password before your first login.
      </p>
      <br>
      <a href="{login_url}"
         style="background-color:#008080;color:white;padding:12px 24px;
                text-decoration:none;border-radius:6px;">
        Go to Login
      </a>
    </div>
    """
    return _send(to, "Your Uchaguzi360 Agent Account Has Been Created", html)
