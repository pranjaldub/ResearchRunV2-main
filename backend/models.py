"""Pydantic models for Research Run."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field
import uuid


def _uuid() -> str:
    return str(uuid.uuid4())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class Paper(BaseModel):
    id: str = Field(default_factory=_uuid)
    title: str = "Untitled"
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    venue: Optional[str] = None
    doi: Optional[str] = None
    abstract: Optional[str] = None
    pages: int = 0
    word_count: int = 0
    text: str = ""
    file_name: str = ""
    created_at: str = Field(default_factory=_now_iso)
    status: str = "uploaded"  # uploaded | analyzing | completed | failed
    pinned: bool = False


class Summary(BaseModel):
    tldr: str = ""
    abstract: str = ""
    key_contributions: List[str] = Field(default_factory=list)
    methodology: str = ""
    findings: List[str] = Field(default_factory=list)


class Keywords(BaseModel):
    keywords: List[str] = Field(default_factory=list)
    concepts: List[str] = Field(default_factory=list)
    equations: List[str] = Field(default_factory=list)
    datasets: List[str] = Field(default_factory=list)
    metrics: List[str] = Field(default_factory=list)


class ResearchGap(BaseModel):
    gaps: List[str] = Field(default_factory=list)
    open_problems: List[str] = Field(default_factory=list)
    limitations: List[str] = Field(default_factory=list)


class Novelty(BaseModel):
    novelty_score: float = 0.0
    reasoning: str = ""
    similar_work: List[str] = Field(default_factory=list)


class MethodologyReview(BaseModel):
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    reviewer_comments: str = ""


class PaperScore(BaseModel):
    paper_score: float = 0.0
    complexity_score: float = 0.0
    clarity_score: float = 0.0
    impact_score: float = 0.0
    justification: str = ""


class Questions(BaseModel):
    questions: List[str] = Field(default_factory=list)
    future_work: List[str] = Field(default_factory=list)
    thesis_topics: List[str] = Field(default_factory=list)
    improvements: List[str] = Field(default_factory=list)


class RelatedPaper(BaseModel):
    paper_id: Optional[str] = None
    title: str = ""
    authors: List[str] = Field(default_factory=list)
    year: Optional[int] = None
    citation_count: Optional[int] = 0
    abstract: Optional[str] = ""
    similarity_score: Optional[float] = None
    url: Optional[str] = None
    venue: Optional[str] = None


class AnalysisResult(BaseModel):
    id: str = Field(default_factory=_uuid)
    paper_id: str
    summary: Optional[Summary] = None
    keywords: Optional[Keywords] = None
    gaps: Optional[ResearchGap] = None
    novelty: Optional[Novelty] = None
    methodology: Optional[MethodologyReview] = None
    score: Optional[PaperScore] = None
    questions: Optional[Questions] = None
    related_papers: List[RelatedPaper] = Field(default_factory=list)
    final_report: str = ""
    execution_log: List[Dict[str, Any]] = Field(default_factory=list)
    total_time_ms: int = 0
    created_at: str = Field(default_factory=_now_iso)
    completed_at: Optional[str] = None
