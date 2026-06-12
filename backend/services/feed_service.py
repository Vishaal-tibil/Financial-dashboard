"""
Competitor Intelligence Feed service.
For each competitor: Tavily news search → per-article Groq classification
→ rank by recency_weight × impact_score → cache with 6-hour TTL.
"""
from __future__ import annotations

import asyncio
import datetime as dt
import json
import re
from pathlib import Path
from typing import Any, AsyncIterator, Optional

from . import groq_client
from .tavily_client import search_news

import os as _os

DATA_DIR        = Path(__file__).parent.parent / "data"
FEED_CACHE_FILE = DATA_DIR / "feed_cache.json"

def _cache_ttl() -> int:
    return int(_os.environ.get("FEED_CACHE_TTL_HOURS", 6))

def _max_concurrent() -> int:
    return int(_os.environ.get("MAX_CONCURRENT_LLM", 5))

_ARTICLE_SYSTEM = (
    "You classify a single news article about a company. "
    "Return STRICT JSON only with keys: "
    'sentiment ("Positive"|"Neutral"|"Negative"), '
    "category (short string, e.g. Earnings/Expansion/Regulatory), "
    "impact_score (number 0-10), "
    "summary (1-2 sentences), "
    "key_entities (array of strings)."
)


def _search_query(company_name: str) -> str:
    """Convert 'CARBORUNDUM UNIVERSAL LTD' → 'Carborundum Universal' for cleaner news search."""
    clean = re.sub(r'\b(LTD|LIMITED|INDUSTRIES|INDIA)\b', '', company_name, flags=re.IGNORECASE)
    return clean.strip().title()


def _load_cache() -> dict:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not FEED_CACHE_FILE.exists():
        return {}
    try:
        return json.loads(FEED_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    FEED_CACHE_FILE.write_text(json.dumps(cache, indent=2, default=str), encoding="utf-8")


def _is_fresh(entry: dict) -> bool:
    ts = entry.get("fetched_at")
    if not ts:
        return False
    try:
        fetched = dt.datetime.fromisoformat(ts.replace("Z", ""))
        return (dt.datetime.utcnow() - fetched) < dt.timedelta(hours=_cache_ttl())
    except Exception:
        return False


def _recency_weight(published: Optional[str]) -> float:
    if not published:
        return 0.6
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d"):
        try:
            d = dt.datetime.strptime(published[:len(fmt)], fmt)
            age = max((dt.datetime.utcnow() - d).days, 0)
            return max(0.3, 1.0 - age / 30.0)
        except Exception:
            pass
    return 0.6


async def _classify(article: dict, company_name: str, sem: asyncio.Semaphore) -> Optional[dict]:
    title    = article.get("title", "")
    url      = article.get("url", "")
    content  = (article.get("raw_content") or article.get("content") or "")[:3000]
    published = article.get("published_date")

    classification = {
        "sentiment": "Neutral", "category": "General", "impact_score": 5.0,
        "summary": (article.get("content") or title)[:240], "key_entities": [],
    }

    if groq_client.has_groq():
        async with sem:
            try:
                raw = await groq_client.complete_json([
                    {"role": "system",  "content": _ARTICLE_SYSTEM},
                    {"role": "user",    "content": f"Company: {company_name}\nHeadline: {title}\nArticle:\n{content}"},
                ])
                if raw:
                    classification.update({
                        "sentiment":    raw.get("sentiment",    classification["sentiment"]),
                        "category":     raw.get("category",     classification["category"]),
                        "impact_score": float(raw.get("impact_score", 5) or 5),
                        "summary":      raw.get("summary",      classification["summary"]),
                        "key_entities": raw.get("key_entities", []) or [],
                    })
            except Exception:
                pass

    score = _recency_weight(published) * classification["impact_score"]
    return {
        "company_id":    company_name,
        "company_name":  company_name,
        "title":         title,
        "url":           url,
        "summary":       classification["summary"],
        "published_date": published,
        "sentiment":     classification["sentiment"],
        "category":      classification["category"],
        "impact_score":  classification["impact_score"],
        "key_entities":  classification["key_entities"],
        "score":         round(score, 2),
    }


async def _fetch_one(company_name: str, sem: asyncio.Semaphore) -> list[dict]:
    query    = _search_query(company_name)
    articles = await search_news(f"{query} news", days=30, max_results=8)
    tasks    = [_classify(a, company_name, sem) for a in articles]
    return [c for c in await asyncio.gather(*tasks) if c]


def get_cached_feed(competitor_names: list[str]) -> tuple[list[dict], bool]:
    cache = _load_cache()
    cards: list[dict] = []
    fully_cached = True
    for name in competitor_names:
        entry = cache.get(name)
        if entry and _is_fresh(entry):
            cards.extend(entry.get("cards", []))
        else:
            fully_cached = False
    cards.sort(key=lambda c: c["score"], reverse=True)
    return cards, fully_cached


async def stream_refresh(competitor_names: list[str]) -> AsyncIterator[dict]:
    """SSE generator: progress per company, then final cards event."""
    sem   = asyncio.Semaphore(_max_concurrent())
    cache = _load_cache()
    all_cards: list[dict] = []
    total = len(competitor_names)

    for idx, name in enumerate(competitor_names, start=1):
        yield {"type": "progress", "step": idx, "total": total,
               "message": f"Fetching news for {_search_query(name)}…"}
        cards = await _fetch_one(name, sem)
        all_cards.extend(cards)
        cache[name] = {
            "fetched_at": dt.datetime.utcnow().isoformat() + "Z",
            "cards":      cards,
        }
        yield {"type": "partial", "company": name, "count": len(cards)}

    _save_cache(cache)
    all_cards.sort(key=lambda c: c["score"], reverse=True)
    yield {"type": "done", "cards": all_cards}
