"""Configuration management for the scraper service."""

import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # Gemini API
    gemini_api_key: str = ""

    # Google Custom Search
    google_search_api_key: str = ""
    google_search_engine_id: str = ""

    # NestJS API
    nestjs_api_url: str = "http://localhost:3001"

    # Scraper Settings
    scraper_port: int = 3003
    max_crawl_pages: int = 50
    crawl_timeout_seconds: int = 120

    # Cron Settings
    cron_schedule: str = "0 2 * * 0"  # Every Sunday at 2 AM
    cron_enabled: bool = False

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


settings = Settings()
