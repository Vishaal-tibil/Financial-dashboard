"""Competitor Intelligence Feed (PLANNING §6.4).

Per competitor: Tavily news search -> per-article Groq JSON classification ->
rank by recency_weight * impact_score -> cache with TTL. Competitors run in
parallel; LLM calls are bounded by a semaphore.
"""
from __future__ import annotations

import asyncio
import datetime as _dt
import json
from typing import Any, AsyncIterator, Optional

from ..config import FEED_CACHE_FILE, ensure_data_dirs, get_settings
from . import groq_client
from .store import get_parsed
from .tavily_client import search_news

_ARTICLE_SYSTEM = (
    "You classify a single news article about a company. Return STRICT JSON only "
    'with keys: sentiment ("Positive"|"Neutral"|"Negative"), category (short string), '
    "impact_score (0-10 number), summary (1-2 sentences), key_entities (array of strings)."
)


def _company_name(company_id: str) -> str:
    rec = get_parsed(company_id)
    return (rec or {}).get("company_name") or company_id


def _load_cache() -> dict[str, Any]:
    ensure_data_dirs()
    if not FEED_CACHE_FILE.exists():
        return {}
    try:
        return json.loads(FEED_CACHE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_cache(cache: dict[str, Any]) -> None:
    ensure_data_dirs()
    FEED_CACHE_FILE.write_text(json.dumps(cache, indent=2, default=str), encoding="utf-8")


def _is_fresh(entry: dict[str, Any]) -> bool:
    ts = entry.get("fetched_at")
    if not ts:
        return False
    try:
        fetched = _dt.datetime.fromisoformat(ts.replace("Z", ""))
    except Exception:
        return False
    ttl = get_settings().feed_cache_ttl_hours
    return (_dt.datetime.utcnow() - fetched) < _dt.timedelta(hours=ttl)


def _recency_weight(published: Optional[str]) -> float:
    if not published:
        return 0.6
    for fmt in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d", "%a, %d %b %Y %H:%M:%S %Z"):
        try:
            dt = _dt.datetime.strptime(published[:19], fmt[:19] if "T" in fmt else fmt)
            break
        except Exception:
            dt = None
    if dt is None:
        return 0.6
    age_days = max((_dt.datetime.utcnow() - dt).days, 0)
    return max(0.3, 1.0 - age_days / 30.0)


async def _classify(article: dict[str, Any], company_id: str, company_name: str, sem: asyncio.Semaphore) -> Optional[dict[str, Any]]:
    title = article.get("title", "")
    url = article.get("url", "")
    content = (article.get("raw_content") or article.get("content") or "")[:3000]
    published = article.get("published_date")

    classification = {
        "sentiment": "Neutral", "category": "General", "impact_score": 5.0,
        "summary": (article.get("content") or title)[:240], "key_entities": [],
    }
    if get_settings().has_groq:
        async with sem:
            try:
                raw = await groq_client.complete_json([
                    {"role": "system", "content": _ARTICLE_SYSTEM},
                    {"role": "user", "content": f"Company: {company_name}\nHeadline: {title}\nArticle:\n{content}"},
                ])
                if raw:
                    classification.update({
                        "sentiment": raw.get("sentiment", "Neutral"),
                        "category": raw.get("category", "General"),
                        "impact_score": float(raw.get("impact_score", 5) or 5),
                        "summary": raw.get("summary", classification["summary"]),
                        "key_entities": raw.get("key_entities", []) or [],
                    })
            except Exception:
                pass

    score = _recency_weight(published) * classification["impact_score"]
    return {
        "company_id": company_id,
        "company_name": company_name,
        "title": title,
        "url": url,
        "summary": classification["summary"],
        "published_date": published,
        "sentiment": classification["sentiment"],
        "category": classification["category"],
        "impact_score": classification["impact_score"],
        "key_entities": classification["key_entities"],
        "score": round(score, 2),
    }


async def _fetch_competitor(company_id: str, sem: asyncio.Semaphore) -> list[dict[str, Any]]:
    name = _company_name(company_id)
    articles = await search_news(f"{name} news", days=30, max_results=8)
    tasks = [_classify(a, company_id, name, sem) for a in articles]
    cards = [c for c in await asyncio.gather(*tasks) if c]
    return cards


async def refresh_feed(competitor_ids: list[str]) -> list[dict[str, Any]]:
    sem = asyncio.Semaphore(get_settings().max_concurrent_llm)
    results = await asyncio.gather(*[_fetch_competitor(cid, sem) for cid in competitor_ids])
    all_cards = [c for sub in results for c in sub]
    all_cards.sort(key=lambda c: c["score"], reverse=True)

    cache = _load_cache()
    for cid in competitor_ids:
        cache[cid] = {
            "fetched_at": _dt.datetime.utcnow().isoformat() + "Z",
            "cards": [c for c in all_cards if c["company_id"] == cid],
        }
    _save_cache(cache)
    return all_cards


def get_cached_feed(competitor_ids: list[str]) -> tuple[list[dict[str, Any]], bool]:
    cache = _load_cache()
    cards: list[dict[str, Any]] = []
    fully_cached = True
    for cid in competitor_ids:
        entry = cache.get(cid)
        if entry and _is_fresh(entry):
            cards.extend(entry.get("cards", []))
        else:
            fully_cached = False
    cards.sort(key=lambda c: c["score"], reverse=True)
    return cards, fully_cached


async def stream_refresh(competitor_ids: list[str]) -> AsyncIterator[dict[str, Any]]:
    """SSE generator: progress events per competitor, then a final cards event."""
    sem = asyncio.Semaphore(get_settings().max_concurrent_llm)
    total = len(competitor_ids)
    all_cards: list[dict[str, Any]] = []
    cache = _load_cache()
    for idx, cid in enumerate(competitor_ids, start=1):
        name = _company_name(cid)
        yield {"type": "progress", "step": idx, "total": total, "company": name, "message": f"Searching news for {name}…"}
        cards = await _fetch_competitor(cid, sem)
        all_cards.extend(cards)
        cache[cid] = {"fetched_at": _dt.datetime.utcnow().isoformat() + "Z", "cards": cards}
        yield {"type": "partial", "company": name, "count": len(cards)}
    _save_cache(cache)
    all_cards.sort(key=lambda c: c["score"], reverse=True)
    yield {"type": "done", "cards": all_cards}
