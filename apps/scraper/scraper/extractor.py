"""Gemini API-powered knowledge extractor.

Takes raw crawled content (markdown) and uses Google Gemini to
structure it into categorized knowledge entries for the AI chatbot.
"""

import json
import logging
from typing import Optional

import google.generativeai as genai

from .config import settings
from .schemas import KnowledgeEntry, KnowledgeCategory

logger = logging.getLogger(__name__)

# System prompt for Gemini to extract and structure hotel knowledge
EXTRACTION_PROMPT = """You are a hotel information extraction specialist. Your job is to analyze
hotel website content and supplementary search data, then extract ALL useful information
structured into specific categories.

**CATEGORIES (use these exact values):**
- "general" — Hotel name, description, star rating, check-in/check-out times, contact info, overview
- "rooms" — Room types, descriptions, capacity, pricing, bed types, room features
- "policies" — Cancellation, payment methods, pet policy, smoking, children, deposit, refund
- "faqs" — Common questions & answers (create Q&A pairs from the content)
- "location" — Full address, directions, nearby attractions, transportation, neighborhood info
- "amenities" — Pool, gym, spa, WiFi, parking, restaurant, bar, business center details
- "services" — Room service, concierge, laundry, airport transfer, tours, breakfast, events

**RULES:**
1. Extract EVERY piece of useful information — be thorough, not minimal
2. Each entry needs a descriptive `key` (snake_case, e.g. "check_in_time", "deluxe_room", "pool")
3. Each `value` should be a complete, detailed answer a chatbot could give to a guest
4. For rooms: create separate entries per room type with full details
5. For FAQs: generate reasonable Q&A pairs even if not explicitly on the website
6. If pricing is mentioned, always include currency
7. Make values conversational and helpful — written for a hotel chatbot to use
8. Do NOT include internal/admin/technical info, only guest-facing knowledge

**OUTPUT FORMAT:**
Return a JSON array of objects, each with: { "category", "key", "value" }

Example:
[
  { "category": "general", "key": "hotel_overview", "value": "Welcome to The Grand Hotel, a 5-star luxury resort..." },
  { "category": "rooms", "key": "deluxe_king_room", "value": "Our Deluxe King Room features a king-size bed..." },
  { "category": "policies", "key": "cancellation_policy", "value": "Free cancellation up to 24 hours before check-in..." },
  { "category": "faqs", "key": "is_breakfast_included", "value": "Yes! Complimentary breakfast is served daily from 7 AM to 10 AM..." }
]

IMPORTANT: Return ONLY the JSON array. No markdown formatting, no code blocks, just raw JSON.
"""


class GeminiExtractor:
    """Uses Google Gemini to structure raw hotel content into knowledge entries."""

    def __init__(self):
        if settings.gemini_api_key:
            genai.configure(api_key=settings.gemini_api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash")

    async def extract_knowledge(
        self,
        website_content: str,
        google_search_content: Optional[str] = None,
        hotel_name: Optional[str] = None,
    ) -> list[KnowledgeEntry]:
        """Extract structured knowledge entries from raw content using Gemini.

        Args:
            website_content: Combined markdown from all crawled pages
            google_search_content: Optional supplementary data from Google Search
            hotel_name: Optional hotel name for context

        Returns:
            List of structured KnowledgeEntry objects
        """
        # Build the content to analyze
        content_parts = []

        if hotel_name:
            content_parts.append(f"# Hotel: {hotel_name}\n")

        content_parts.append("## Website Content\n")
        content_parts.append(self._truncate_content(website_content, max_chars=80000))

        if google_search_content:
            content_parts.append("\n\n## Additional Information from Google Search\n")
            content_parts.append(self._truncate_content(google_search_content, max_chars=20000))

        full_content = "\n".join(content_parts)

        logger.info(f"Sending {len(full_content)} chars to Gemini for extraction")

        try:
            response = self.model.generate_content(
                [EXTRACTION_PROMPT, f"\n\n---\n\nHere is the hotel content to analyze:\n\n{full_content}"],
                generation_config=genai.GenerationConfig(
                    temperature=0.2,  # Low temperature for consistent extraction
                    max_output_tokens=8192,
                    response_mime_type="application/json",
                ),
            )

            raw_text = response.text.strip()

            # Parse the JSON response
            entries = self._parse_response(raw_text)
            logger.info(f"Gemini extracted {len(entries)} knowledge entries")

            return entries

        except Exception as e:
            logger.error(f"Gemini extraction failed: {e}")
            raise RuntimeError(f"Failed to extract knowledge with Gemini: {e}")

    def _parse_response(self, raw_text: str) -> list[KnowledgeEntry]:
        """Parse Gemini's JSON response into KnowledgeEntry objects."""
        # Clean up potential markdown code block wrapping
        text = raw_text.strip()
        if text.startswith("```"):
            # Remove code block markers
            lines = text.split("\n")
            text = "\n".join(lines[1:-1]) if lines[-1].strip() == "```" else "\n".join(lines[1:])
            text = text.strip()

        try:
            data = json.loads(text)
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse Gemini response as JSON: {e}")
            logger.error(f"Raw response (first 500 chars): {text[:500]}")
            raise RuntimeError(f"Gemini returned invalid JSON: {e}")

        if not isinstance(data, list):
            raise RuntimeError(f"Expected JSON array, got {type(data).__name__}")

        entries = []
        valid_categories = {c.value for c in KnowledgeCategory}

        for item in data:
            if not isinstance(item, dict):
                continue

            category = item.get("category", "").lower().strip()
            key = item.get("key", "").strip()
            value = item.get("value", "").strip()

            # Validate
            if not category or not key or not value:
                logger.warning(f"Skipping incomplete entry: {item}")
                continue

            if category not in valid_categories:
                logger.warning(f"Skipping unknown category '{category}' for key '{key}'")
                continue

            entries.append(KnowledgeEntry(
                category=KnowledgeCategory(category),
                key=key,
                value=value,
            ))

        return entries

    def _truncate_content(self, content: str, max_chars: int) -> str:
        """Truncate content to fit within token limits while preserving structure."""
        if len(content) <= max_chars:
            return content

        # Truncate and add notice
        truncated = content[:max_chars]
        # Try to break at a paragraph boundary
        last_newline = truncated.rfind("\n\n")
        if last_newline > max_chars * 0.8:
            truncated = truncated[:last_newline]

        return truncated + "\n\n[... content truncated for processing ...]"
