"""Schemas for `expected/*.json` files in eval cases.

The expected files describe ground truth for one or more pipeline steps.
A case is *not* required to have all of them — a case may e.g. only
score extraction by providing only `anfrage.json`.

All schemas are intentionally looser than the production Pydantic models
in `src/quoting/core/schema.py`:

- fields are `Optional` so partial ground truth is allowed
- there is no `confidence` field on positions (that's a model output,
  not something ground truth has an opinion on)
- the field set is the union of "things we want to evaluate", not a
  faithful mirror of the production schema
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class ExpectedPosition(BaseModel):
    """One expected line item.

    Any field set to None means "do not score this field for this case".
    """

    model_config = ConfigDict(extra="forbid")

    pos_nr: int
    artikelnummer: str | None = None
    bezeichnung: str | None = None
    menge: float | None = None
    einheit: str | None = None
    werkstoff: str | None = None
    abmessungen: str | None = None
    zeichnungsnummer: str | None = None
    ist_zertifikat: bool | None = None


class ExpectedAnfrage(BaseModel):
    """Ground truth for the extraction step."""

    model_config = ConfigDict(extra="forbid")

    belegnummer: str | None = None
    kunde_firma: str | None = None
    kunde_ansprechpartner: str | None = None
    kunde_email: str | None = None
    incoterms: str | None = None
    zahlungsbedingungen: str | None = None
    positionen: list[ExpectedPosition]


class ExpectedMatch(BaseModel):
    """One expected match. `matched_artikelnr=None` means we expect no match."""

    model_config = ConfigDict(extra="forbid")

    pos_nr: int
    matched_artikelnr: str | None = None
    # If set, also require the matching status to equal one of these.
    acceptable_status: list[str] | None = None


class ExpectedMatches(BaseModel):
    model_config = ConfigDict(extra="forbid")

    matches: list[ExpectedMatch]


class ExpectedQuotationItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pos_nr: int
    artikel_nr: str | None = None
    menge: float | None = None
    einzelpreis: float | None = None
    gesamtpreis: float | None = None
    # Tolerance for floating-point comparison on the price fields above.
    price_tolerance_eur: float = 0.01


class ExpectedQuotation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    gesamtsumme: float | None = None
    gesamtsumme_tolerance_eur: float = 0.01
    items: list[ExpectedQuotationItem] = Field(default_factory=list)


class CaseManifest(BaseModel):
    """Optional `case.json` at the case root, for metadata + score thresholds."""

    model_config = ConfigDict(extra="forbid")

    description: str = ""
    tags: list[str] = Field(default_factory=list)
    # If set, the eval harness will fail the case if any of these fall
    # below the configured threshold.
    min_extraction_f1: float | None = None
    min_match_accuracy: float | None = None
