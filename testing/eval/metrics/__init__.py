"""Per-step scoring against ground truth.

Each module compares one pipeline step's actual output against the
expected schema and returns a typed Score object. Scores carry both
a headline number (F1, accuracy, ...) and enough detail for the
report to show what went wrong.
"""
from .extraction import ExtractionScore, score_extraction
from .matching import MatchingScore, score_matching
from .pricing import PricingScore, score_pricing
from .rendering import RenderingScore, score_rendering

__all__ = [
    "ExtractionScore",
    "MatchingScore",
    "PricingScore",
    "RenderingScore",
    "score_extraction",
    "score_matching",
    "score_pricing",
    "score_rendering",
]
