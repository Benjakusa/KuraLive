import time
import logging
from database import query, transaction
from services.sms_service import process_queued_campaign

logger = logging.getLogger(__name__)

POLL_INTERVAL = 30


def sms_worker():
    logger.info("SMS background worker started")
    while True:
        try:
            _process_batch()
        except Exception as e:
            logger.error(f"SMS worker error: {e}")
        time.sleep(POLL_INTERVAL)


def _process_batch(batch_size=10):
    with transaction() as conn:
        from database import query_in_transaction

        campaigns = query_in_transaction(
            conn,
            "SELECT * FROM sms_campaigns WHERE status = 'queued' "
            "ORDER BY created_at ASC LIMIT %s FOR UPDATE SKIP LOCKED",
            (batch_size,),
            fetchall=True,
        )
        if not campaigns:
            return

        campaign_ids = [c["id"] for c in campaigns]
        query_in_transaction(
            conn,
            "UPDATE sms_campaigns SET status = 'sending' WHERE id = ANY(%s)",
            (campaign_ids,),
        )

    for c in campaigns:
        try:
            process_queued_campaign(c)
        except Exception as e:
            logger.error(f"Failed to process campaign {c['id']}: {e}")
            query(
                "UPDATE sms_campaigns SET status = 'failed' WHERE id = %s",
                (c["id"],),
            )


def start_worker():
    import threading

    t = threading.Thread(target=sms_worker, daemon=True)
    t.start()
    logger.info("SMS worker thread started")

if __name__ == "__main__":
    from database import init_pool
    # Initialize the database pool so queries can run
    init_pool()
    # Configure logging for the standalone script
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
    )
    logger.info("Starting STANDALONE SMS worker process...")
    # Run synchronously to block the process
    sms_worker()
