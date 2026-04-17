"""Crawl4AI-based hotel website crawler.

Crawls an entire hotel website, following all internal links,
and returns clean markdown content from each page.
"""

import asyncio
import logging
from urllib.parse import urlparse, urljoin
from typing import Optional

from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig

from .config import settings

logger = logging.getLogger(__name__)


class CrawlResult:
    """Result from crawling a single page."""

    def __init__(self, url: str, title: str, markdown: str, links: list[str]):
        self.url = url
        self.title = title
        self.markdown = markdown
        self.links = links


class HotelCrawler:
    """Crawls an entire hotel website using Crawl4AI."""

    def __init__(self, max_pages: Optional[int] = None, timeout: Optional[int] = None):
        self.max_pages = max_pages or settings.max_crawl_pages
        self.timeout = timeout or settings.crawl_timeout_seconds
        self.visited: set[str] = set()
        self.results: list[CrawlResult] = []

    def _normalize_url(self, url: str) -> str:
        """Normalize URL by removing fragments and trailing slashes."""
        parsed = urlparse(url)
        # Remove fragment and normalize
        normalized = f"{parsed.scheme}://{parsed.netloc}{parsed.path.rstrip('/')}"
        if parsed.query:
            normalized += f"?{parsed.query}"
        return normalized

    def _is_same_domain(self, base_url: str, target_url: str) -> bool:
        """Check if target URL belongs to the same domain as base URL."""
        base_domain = urlparse(base_url).netloc.lower()
        target_domain = urlparse(target_url).netloc.lower()
        # Allow same domain and www variants
        base_clean = base_domain.replace("www.", "")
        target_clean = target_domain.replace("www.", "")
        return base_clean == target_clean

    def _should_skip_url(self, url: str) -> bool:
        """Skip non-content URLs (images, downloads, auth pages, etc.)."""
        skip_extensions = {
            ".pdf", ".jpg", ".jpeg", ".png", ".gif", ".svg", ".webp",
            ".mp4", ".mp3", ".zip", ".rar", ".doc", ".docx", ".xls",
        }
        skip_patterns = {
            "/login", "/signup", "/register", "/admin", "/wp-admin",
            "/cart", "/checkout", "/account", "/api/", "/feed",
            "javascript:", "mailto:", "tel:",
        }

        url_lower = url.lower()
        parsed = urlparse(url_lower)

        # Skip non-http
        if parsed.scheme not in ("http", "https", ""):
            return True

        # Skip file downloads
        if any(url_lower.endswith(ext) for ext in skip_extensions):
            return True

        # Skip auth/admin pages
        if any(pattern in url_lower for pattern in skip_patterns):
            return True

        return False

    def _extract_internal_links(self, base_url: str, links: dict) -> list[str]:
        """Extract and filter internal links from crawl result."""
        internal_links = []

        # Crawl4AI provides links as a dict with 'internal' and 'external'
        raw_links = []
        if isinstance(links, dict):
            raw_links = [
                link.get("href", "") if isinstance(link, dict) else str(link)
                for link in links.get("internal", [])
            ]
        elif isinstance(links, list):
            raw_links = [
                link.get("href", "") if isinstance(link, dict) else str(link)
                for link in links
            ]

        for link in raw_links:
            if not link:
                continue

            # Make absolute URL
            absolute_url = urljoin(base_url, link)
            normalized = self._normalize_url(absolute_url)

            if (
                self._is_same_domain(base_url, normalized)
                and not self._should_skip_url(normalized)
                and normalized not in self.visited
            ):
                internal_links.append(normalized)

        return list(set(internal_links))

    async def crawl_website(self, start_url: str) -> list[CrawlResult]:
        """Crawl the entire hotel website starting from the given URL.

        Performs breadth-first crawling, following all internal links
        until max_pages is reached or no more pages to visit.
        """
        start_url = self._normalize_url(start_url)
        queue = [start_url]
        self.visited = set()
        self.results = []

        browser_config = BrowserConfig(
            headless=True,
            verbose=False,
        )

        run_config = CrawlerRunConfig(
            word_count_threshold=30,
            remove_overlay_elements=True,
            process_iframes=False,
            excluded_tags=["nav", "footer", "header", "script", "style"],
        )

        logger.info(f"Starting crawl of {start_url} (max {self.max_pages} pages)")

        async with AsyncWebCrawler(config=browser_config) as crawler:
            while queue and len(self.results) < self.max_pages:
                url = queue.pop(0)
                normalized = self._normalize_url(url)

                if normalized in self.visited:
                    continue

                self.visited.add(normalized)

                try:
                    logger.info(f"Crawling ({len(self.results) + 1}/{self.max_pages}): {normalized}")

                    result = await asyncio.wait_for(
                        crawler.arun(url=normalized, config=run_config),
                        timeout=self.timeout,
                    )

                    if not result.success:
                        logger.warning(f"Failed to crawl {normalized}: {result.error_message}")
                        continue

                    # Skip pages with very little content
                    markdown = result.markdown_v2.raw_markdown if hasattr(result, 'markdown_v2') else result.markdown
                    if not markdown or len(markdown.strip()) < 100:
                        logger.info(f"Skipping {normalized} — too little content")
                        continue

                    # Extract internal links for further crawling
                    links_data = result.links if hasattr(result, 'links') else {}
                    internal_links = self._extract_internal_links(normalized, links_data)
                    queue.extend(internal_links)

                    # Store result
                    title = result.metadata.get("title", "") if hasattr(result, 'metadata') and result.metadata else ""
                    crawl_result = CrawlResult(
                        url=normalized,
                        title=title,
                        markdown=markdown,
                        links=internal_links,
                    )
                    self.results.append(crawl_result)

                    logger.info(f"Scraped {normalized} — {len(markdown)} chars, {len(internal_links)} new links")

                except asyncio.TimeoutError:
                    logger.warning(f"Timeout crawling {normalized}")
                except Exception as e:
                    logger.error(f"Error crawling {normalized}: {e}")

        logger.info(f"Crawl complete: {len(self.results)} pages scraped")
        return self.results

    def get_combined_content(self) -> str:
        """Combine all crawled pages into a single document for AI processing."""
        sections = []
        for result in self.results:
            header = f"# Page: {result.title or result.url}\n**URL:** {result.url}\n"
            sections.append(f"{header}\n{result.markdown}")

        return "\n\n---\n\n".join(sections)
