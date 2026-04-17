"""Hotel Website Scraper — FastAPI Microservice.

Provides endpoints to scrape hotel websites using Crawl4AI,
enrich with Google Search data, and structure via Gemini API.
"""

import asyncio
import sys

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

import logging
import uuid
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware

from scraper.config import settings
from scraper.schemas import (
    ScrapeRequest,
    ScrapeResult,
    ScrapeStatus,
    ScrapeStatusResponse,
    HealthResponse,
    DiscoverRequest,
    DiscoveryResult,
)
from scraper.crawler import HotelCrawler
from scraper.google_search import GoogleSearchClient
from scraper.extractor import GeminiExtractor
from scraper.scheduler import setup_scheduler, shutdown_scheduler

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# In-memory job tracking (for simplicity; NestJS DB is the source of truth)
jobs: dict[str, ScrapeResult] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle handler."""
    logger.info("🚀 Hotel Scraper Service starting up...")
    setup_scheduler()
    yield
    logger.info("👋 Hotel Scraper Service shutting down...")
    shutdown_scheduler()


app = FastAPI(
    title="Hotel Website Scraper",
    description="Crawl4AI + Gemini powered hotel knowledge extraction service",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow NestJS API to call us
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ----- Background Scrape Task -----

async def run_scrape_job(job_id: str, request: ScrapeRequest):
    """Execute the full scraping pipeline in the background."""
    job = jobs[job_id]

    try:
        # Step 1: Crawl the hotel website
        job.status = ScrapeStatus.CRAWLING
        logger.info(f"[{job_id}] Step 1: Crawling {request.url}")

        crawler = HotelCrawler()
        crawl_results = await crawler.crawl_website(request.url)
        job.pages_scraped = len(crawl_results)

        if not crawl_results:
            raise RuntimeError("No pages could be scraped from the provided URL")

        combined_content = crawler.get_combined_content()
        logger.info(f"[{job_id}] Crawled {len(crawl_results)} pages, {len(combined_content)} chars")

        # Step 2: Google Search for supplementary data
        job.status = ScrapeStatus.SEARCHING
        logger.info(f"[{job_id}] Step 2: Searching Google for additional info")

        google_client = GoogleSearchClient()
        hotel_name = request.hotel_name or ""

        # If no hotel name provided, try to extract from first crawl result
        if not hotel_name and crawl_results:
            hotel_name = crawl_results[0].title or ""

        google_content = await google_client.search_hotel_info(
            hotel_name=hotel_name,
            hotel_url=request.url,
        )

        logger.info(f"[{job_id}] Google Search returned {len(google_content)} chars of supplementary data")

        # Step 3: Extract structured knowledge using Gemini
        job.status = ScrapeStatus.EXTRACTING
        logger.info(f"[{job_id}] Step 3: Extracting knowledge with Gemini")

        extractor = GeminiExtractor()
        entries = await extractor.extract_knowledge(
            website_content=combined_content,
            google_search_content=google_content if google_content else None,
            hotel_name=hotel_name if hotel_name else None,
        )

        job.entries = entries
        job.entries_found = len(entries)
        job.status = ScrapeStatus.COMPLETED

        logger.info(f"[{job_id}] ✅ Scrape complete: {len(entries)} knowledge entries extracted")

    except Exception as e:
        job.status = ScrapeStatus.FAILED
        job.error_message = str(e)
        logger.error(f"[{job_id}] ❌ Scrape failed: {e}")

def run_scrape_wrapper(job_id: str, request: ScrapeRequest):
    """Sync wrapper to run scrape job in a dedicated event loop thread.
    This bypasses Uvicorn's Windows SelectorEventLoop bug which crashes Playwright.
    """
    import asyncio
    import sys
    
    if sys.platform == "win32":
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(run_scrape_job(job_id, request))
    finally:
        loop.close()


# ----- API Endpoints -----

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse()


@app.post("/scrape", response_model=ScrapeResult)
async def start_scrape(request: ScrapeRequest, background_tasks: BackgroundTasks):
    """Start a new scrape job for a hotel website.

    The job runs in the background. Use /scrape/status/{job_id} to check progress,
    or poll this endpoint which returns immediately with the job_id.
    """
    job_id = str(uuid.uuid4())

    # Create initial job record
    job = ScrapeResult(
        job_id=job_id,
        status=ScrapeStatus.PENDING,
        hotel_id=request.hotel_id,
        url=request.url,
    )
    jobs[job_id] = job

    # Start scraping in the background using the wrapper (runs in thread pool)
    background_tasks.add_task(run_scrape_wrapper, job_id, request)

    logger.info(f"Scrape job {job_id} created for {request.url}")
    return job


@app.get("/scrape/status/{job_id}", response_model=ScrapeResult)
async def get_scrape_status(job_id: str):
    """Get the current status and results of a scrape job."""
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail=f"Job {job_id} not found")

    return jobs[job_id]


@app.post("/scrape/sync", response_model=ScrapeResult)
async def scrape_sync(request: ScrapeRequest):
    """Synchronous scrape — waits for completion and returns results directly.

    Use this when you want the results immediately (e.g., from NestJS API).
    Warning: This can take 1-5 minutes depending on site size.
    """
    job_id = str(uuid.uuid4())

    job = ScrapeResult(
        job_id=job_id,
        status=ScrapeStatus.PENDING,
        hotel_id=request.hotel_id,
        url=request.url,
    )
    jobs[job_id] = job

    from fastapi.concurrency import run_in_threadpool
    await run_in_threadpool(run_scrape_wrapper, job_id, request)

    return jobs[job_id]


@app.post("/discover", response_model=list[DiscoveryResult])
async def discover_hotels(request: DiscoverRequest):
    """Discover hotels via Google Search.

    Searches for the hotel across official and OTA platforms
    (Booking.com, TripAdvisor, Agoda, Google Maps).
    Returns structured results for the onboarding hotel selection step.
    """
    logger.info(f"Hotel discovery request: '{request.hotel_name}' in '{request.city}'")

    google_client = GoogleSearchClient()
    if not google_client.enabled:
        raise HTTPException(
            status_code=503,
            detail="Google Search API not configured. Set GOOGLE_SEARCH_API_KEY and GOOGLE_SEARCH_ENGINE_ID.",
        )

    results = await google_client.discover_hotels(
        hotel_name=request.hotel_name,
        city=request.city,
    )

    logger.info(f"Hotel discovery returned {len(results)} results")
    return results


if __name__ == "__main__":
    import uvicorn
    import sys

    if sys.platform == "win32":
        # Uvicorn explicitly forces SelectorEventLoop on Windows which breaks Playwright.
        # We monkeypatch it to use ProactorEventLoop instead.
        import uvicorn.loops.asyncio
        def proactor_setup(use_colors: bool = False):
            import asyncio
            asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
        uvicorn.loops.asyncio.asyncio_setup = proactor_setup

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=settings.scraper_port,
        reload=False,
    )
