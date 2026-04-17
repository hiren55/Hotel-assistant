"""Weekly cron scheduler for automatic hotel website re-scraping.

Uses APScheduler to trigger periodic re-scraping of all hotels
that have been previously scraped, to catch website updates.
"""

import logging
from datetime import datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

from .config import settings

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()


async def trigger_rescrape_all():
    """Callback: ask NestJS API for all hotels with scrape history, then re-scrape each."""
    logger.info(f"[CRON] Weekly re-scrape triggered at {datetime.utcnow().isoformat()}")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # Fetch hotels that have been scraped before from NestJS API
            response = await client.get(
                f"{settings.nestjs_api_url}/api/v1/scraper/rescrape-targets",
            )
            response.raise_for_status()
            hotels = response.json()

            logger.info(f"[CRON] Found {len(hotels)} hotels to re-scrape")

            for hotel in hotels:
                try:
                    # Trigger scrape via NestJS API (which will call back to us)
                    await client.post(
                        f"{settings.nestjs_api_url}/api/v1/hotels/{hotel['hotelId']}/scrape",
                        json={"url": hotel["url"]},
                        timeout=300.0,
                    )
                    logger.info(f"[CRON] Re-scrape triggered for hotel {hotel['hotelId']}")
                except Exception as e:
                    logger.error(f"[CRON] Failed to re-scrape hotel {hotel['hotelId']}: {e}")

    except Exception as e:
        logger.error(f"[CRON] Failed to fetch rescrape targets: {e}")


def setup_scheduler():
    """Initialize and start the weekly cron scheduler."""
    if not settings.cron_enabled:
        logger.info("Cron scheduler is disabled (CRON_ENABLED=false)")
        return

    # Parse cron expression: "minute hour day_of_month month day_of_week"
    parts = settings.cron_schedule.split()
    if len(parts) != 5:
        logger.error(f"Invalid cron schedule: {settings.cron_schedule}")
        return

    trigger = CronTrigger(
        minute=parts[0],
        hour=parts[1],
        day=parts[2],
        month=parts[3],
        day_of_week=parts[4],
    )

    scheduler.add_job(
        trigger_rescrape_all,
        trigger=trigger,
        id="weekly_rescrape",
        name="Weekly Hotel Website Re-Scrape",
        replace_existing=True,
    )

    scheduler.start()
    logger.info(f"Cron scheduler started with schedule: {settings.cron_schedule}")


def shutdown_scheduler():
    """Gracefully shutdown the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("Cron scheduler stopped")
