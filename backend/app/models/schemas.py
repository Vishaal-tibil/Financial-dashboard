"""Pydantic request/response models for the API."""
from __future__ import annotations

from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------- Companies ----------
class CompanySummary(BaseModel):
    company_id: str
    company_name: str
    periods: list[str] = Field(default_factory=list)
    uploaded_at: Optional[str] = None


class UploadResponse(BaseModel):
    company_id: str
    company_name: str
    periods: list[str] = Field(default_factory=list)


# ---------- Benchmark ----------
class BenchmarkRequest(BaseModel):
    your_company_id: str
    competitor_ids: list[str] = Field(default_factory=list)
    fiscal_year: Optional[str] = None


class KpiTile(BaseModel):
    key: str
    label: str
    value: Optional[float] = None
    display: str
    unit: str = ""
    rank: Optional[int] = None
    of: Optional[int] = None
    trend: Optional[str] = None  # "up" | "down" | None
    direction: str = "higher"  # "higher" | "lower" — which is better
    is_na: bool = False
    note: Optional[str] = None


class BenchmarkResponse(BaseModel):
    your_company_id: str
    fiscal_year: Optional[str] = None
    cockpit: dict[str, Any]
    financial: dict[str, Any]
    operational: dict[str, Any]
    capitalEfficiency: list[dict[str, Any]]
    marginWaterfall: list[dict[str, Any]]
    allKpis: list[KpiTile] = Field(default_factory=list)


# ---------- Insights ----------
class InsightsRequest(BaseModel):
    your_company_id: str
    competitor_ids: list[str] = Field(default_factory=list)
    fiscal_year: Optional[str] = None


class Insight(BaseModel):
    icon: str = "lightbulb"
    title: str
    body: str
    severity: str = "info"  # info | positive | warning | negative


class InsightsResponse(BaseModel):
    insights: list[Insight] = Field(default_factory=list)
    capital_banner: Optional[str] = None
    margin_banner: Optional[str] = None
    generated: bool = True
    error: Optional[str] = None


# ---------- Feed ----------
class FeedRequest(BaseModel):
    competitor_ids: list[str] = Field(default_factory=list)


class FeedCard(BaseModel):
    company_id: str
    company_name: str
    title: str
    url: str
    summary: str
    published_date: Optional[str] = None
    sentiment: str = "Neutral"
    category: str = "General"
    impact_score: float = 0.0
    key_entities: list[str] = Field(default_factory=list)
    score: float = 0.0


class FeedResponse(BaseModel):
    cards: list[FeedCard] = Field(default_factory=list)
    cached: bool = False
    error: Optional[str] = None


# ---------- Chat ----------
class ChatRequest(BaseModel):
    question: str
    your_company_id: Optional[str] = None
    competitor_ids: list[str] = Field(default_factory=list)
    session_id: str = "default"


class ChatResetRequest(BaseModel):
    session_id: str = "default"
