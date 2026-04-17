"""Google Search integration for supplementary hotel information.

Uses Google Custom Search API to find additional hotel details
beyond what's available on the hotel's own website — such as
reviews, ratings, nearby attractions, and travel tips.
"""

import logging
from typing import Optional
from urllib.parse import urlparse

import httpx

from .config import settings

logger = logging.getLogger(__name__)

# Google Custom Search JSON API
GOOGLE_SEARCH_URL = "https://www.googleapis.com/customsearch/v1"


class GoogleSearchClient:
    """Fetches supplementary hotel information via Google Custom Search."""

    def __init__(self):
        self.api_key = settings.google_search_api_key
        self.engine_id = settings.google_search_engine_id
        self.enabled = bool(self.api_key and self.engine_id)

    async def search(self, query: str, num_results: int = 5) -> list[dict]:
        """Run a Google Custom Search query and return results."""
        if not self.enabled:
            logger.warning("Google Search API not configured — skipping")
            return []

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    GOOGLE_SEARCH_URL,
                    params={
                        "key": self.api_key,
                        "cx": self.engine_id,
                        "q": query,
                        "num": min(num_results, 10),
                    },
                )
                response.raise_for_status()
                data = response.json()

                results = []
                for item in data.get("items", []):
                    results.append({
                        "title": item.get("title", ""),
                        "snippet": item.get("snippet", ""),
                        "link": item.get("link", ""),
                        "pagemap": item.get("pagemap", {}),
                    })

                logger.info(f"Google Search returned {len(results)} results for: {query}")
                return results

        except httpx.HTTPError as e:
            logger.error(f"Google Search API error: {e}")
            return []
        except Exception as e:
            logger.error(f"Unexpected error in Google Search: {e}")
            return []

    async def search_hotel_info(self, hotel_name: str, hotel_url: Optional[str] = None) -> str:
        """Search for comprehensive hotel information and return as formatted text.

        Runs multiple targeted queries to gather different types of information.
        """
        if not self.enabled:
            return ""

        queries = [
            f'"{hotel_name}" hotel amenities facilities services',
            f'"{hotel_name}" hotel reviews ratings guest experience',
            f'"{hotel_name}" hotel location nearby attractions things to do',
            f'"{hotel_name}" hotel check-in check-out policies',
        ]

        all_results = []
        for query in queries:
            results = await self.search(query)
            all_results.extend(results)

        if not all_results:
            return ""

        # Format results as readable text for AI processing
        formatted_sections = ["## Additional Information from Google Search\n"]
        seen_snippets = set()

        for result in all_results:
            snippet = result["snippet"].strip()
            if snippet and snippet not in seen_snippets:
                seen_snippets.add(snippet)
                formatted_sections.append(
                    f"**{result['title']}**\n{snippet}\n_Source: {result['link']}_\n"
                )

        return "\n".join(formatted_sections)

    async def discover_hotels(
        self,
        hotel_name: str,
        city: str,
    ) -> list[dict]:
        """Search Google for hotel info across official site and OTA platforms.

        Returns structured results with source classification.
        """
        if not self.enabled:
            logger.warning("Google Search API not configured — returning empty discovery")
            return []

        # OTA domain mapping for source classification
        OTA_DOMAINS = {
            "booking.com": "Booking.com",
            "tripadvisor.com": "TripAdvisor",
            "tripadvisor.in": "TripAdvisor",
            "agoda.com": "Agoda",
            "expedia.com": "Expedia",
            "hotels.com": "Hotels.com",
            "makemytrip.com": "MakeMyTrip",
            "goibibo.com": "Goibibo",
            "maps.google.com": "Google Maps",
            "google.com/maps": "Google Maps",
            "google.com/travel": "Google Travel",
        }

        queries = [
            f'"{hotel_name}" {city} official website',
            f'"{hotel_name}" {city} booking.com',
            f'"{hotel_name}" {city} tripadvisor',
            f'"{hotel_name}" {city} agoda',
            f'"{hotel_name}" {city} google maps',
        ]

        all_results = []
        seen_links = set()

        for query in queries:
            results = await self.search(query, num_results=3)
            for result in results:
                link = result.get("link", "")
                if not link or link in seen_links:
                    continue
                seen_links.add(link)

                # Classify source based on domain
                parsed = urlparse(link)
                domain = parsed.netloc.lower().replace("www.", "")
                source = "Official"

                for ota_domain, ota_name in OTA_DOMAINS.items():
                    if ota_domain in domain or ota_domain in link.lower():
                        source = ota_name
                        break

                # Try to extract image from Google search result
                image = None
                if isinstance(result, dict):
                    # Google CSE sometimes returns pagemap with images
                    pagemap = result.get("pagemap", {})
                    if isinstance(pagemap, dict):
                        cse_images = pagemap.get("cse_image", [])
                        if cse_images and isinstance(cse_images, list):
                            image = cse_images[0].get("src")
                        if not image:
                            cse_thumbnails = pagemap.get("cse_thumbnail", [])
                            if cse_thumbnails and isinstance(cse_thumbnails, list):
                                image = cse_thumbnails[0].get("src")

                all_results.append({
                    "name": result.get("title", hotel_name),
                    "website": link,
                    "image": image,
                    "source": source,
                    "snippet": result.get("snippet", ""),
                })

        logger.info(f"Hotel discovery returned {len(all_results)} results for '{hotel_name}' in '{city}'")
        return all_results
