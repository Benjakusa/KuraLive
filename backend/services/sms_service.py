import json
import logging
from database import query
from utils.helpers import fill_template
from config import Config

logger = logging.getLogger(__name__)


def send_twilio_sms(recipients, message, campaign_id, manager_id):
    from twilio.rest import Client

    account_sid = Config.TWILIO_ACCOUNT_SID
    auth_token = Config.TWILIO_AUTH_TOKEN
    twilio_number = Config.TWILIO_PHONE_NUMBER

    if not account_sid or not auth_token or not twilio_number:
        logger.error("Twilio credentials not configured")
        return 0, len(recipients)

    client = Client(account_sid, auth_token)
    sent, failed = 0, 0
    batch_size = 100

    for i in range(0, len(recipients), batch_size):
        batch = recipients[i : i + batch_size]
        for r in batch:
            if isinstance(r, dict):
                number = r.get("phone", "")
                if not number:
                    failed += 1
                    continue
                body = fill_template(
                    message,
                    name=r.get("name", ""),
                    station=r.get("station", ""),
                    county=r.get("county", ""),
                )
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
                logger.error(f"[Twilio SMS] Failed for {number}: {e}")
                failed += 1

    query(
        "UPDATE sms_campaigns SET sent_count = %s, failed_count = %s WHERE id = %s",
        (sent, failed, campaign_id),
    )
    return sent, failed


def process_queued_campaign(campaign):
    cid = campaign["id"]
    message = campaign["message"]
    manager_id = campaign["manager_id"]
    phone_list = json.loads(campaign["recipient_numbers"] or "[]")

    if not phone_list:
        query(
            "UPDATE sms_campaigns SET status = 'failed' WHERE id = %s",
            (cid,),
        )
        logger.warning(f"Campaign {cid} has no recipients, marking failed")
        return

    logger.info(f"Processing queued campaign {cid} ({len(phone_list)} recipients)")
    sent, failed = send_twilio_sms(phone_list, message, cid, manager_id)
    query(
        "UPDATE sms_campaigns SET status = 'sent', sent_at = NOW(), "
        "sent_count = %s, failed_count = %s WHERE id = %s",
        (sent, failed, cid),
    )
    logger.info(f"Campaign {cid} complete: {sent} sent, {failed} failed")
