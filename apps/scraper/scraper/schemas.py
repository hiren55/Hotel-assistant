"""Pydantic schemas for scraper API request/response models."""

from __future__ import annotations
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field, HttpUrl


class KnowledgeCategory(str, Enum):
    """Knowledge categories matching the Prisma HotelKnowledge schema."""
    GENERAL = "general"
    ROOMS = "rooms"
    POLICIES = "policies"
    FAQS = "faqs"
    LOCATION = "location"
    AMENITIES = "amenities"
    SERVICES = "services"


class ScrapeStatus(str, Enum):
    """Scrape job status lifecycle."""
    PENDING = "pending"
    CRAWLING = "crawling"
    SEARCHING = "searching"
    EXTRACTING = "extracting"
    COMPLETED = "completed"
    FAILED = "failed"


# ---- Request Models ----

class ScrapeRequest(BaseModel):
    """Request to scrape a hotel website."""
    url: str = Field(..., description="Hotel website URL to scrape")
    hotel_id: str = Field(..., description="Hotel ID in the database")
    hotel_name: Optional[str] = Field(None, description="Hotel name for Google Search queries")


# ---- Response Models ----

class KnowledgeEntry(BaseModel):
    """A single extracted knowledge entry."""
    category: KnowledgeCategory
    key: str = Field(..., description="Short descriptive key, e.g. 'check_in_time'")
    value: str = Field(..., description="Detailed value/content")


class ScrapeResult(BaseModel):
    """Result of a scrape job."""
    job_id: str
    status: ScrapeStatus
    hotel_id: str
    url: str
    pages_scraped: int = 0
    entries_found: int = 0
    entries: list[KnowledgeEntry] = []
    error_message: Optional[str] = None


class ScrapeStatusResponse(BaseModel):
    """Status check response for a scrape job."""
    job_id: str
    status: ScrapeStatus
    pages_scraped: int = 0
    entries_found: int = 0
    error_message: Optional[str] = None


class HealthResponse(BaseModel):
    """Health check response."""
    status: str = "ok"
    service: str = "hotel-scraper"
    version: str = "1.0.0"


# ---- Discovery Models ----

class DiscoverRequest(BaseModel):
    """Request to discover hotels via Google Search."""
    hotel_name: str = Field(..., description="Hotel name to search for")
    city: str = Field(..., description="City where the hotel is located")


class DiscoveryResult(BaseModel):
    """A single hotel discovery result."""
    name: str = Field(..., description="Hotel name from search result")
    website: str = Field(..., description="Website URL")
    image: Optional[str] = Field(None, description="Hotel image URL if available")
    source: str = Field(..., description="Source: 'Official', 'Booking.com', 'TripAdvisor', 'Agoda', 'Google Maps', or 'OTA'")
    snippet: str = Field("", description="Description snippet from search")
