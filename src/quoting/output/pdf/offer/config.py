"""Static PDF configuration.

Prototype note:
All personal / company-specific production data is intentionally represented
as placeholders. Replace these values later with real ERP / CRM data.
"""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class OfferPdfConfig:
    # Brand / sender placeholders
    company_name: str = "[FIRMA]"
    company_address_html: str = "[STRASSE]<br/>[PLZ ORT]<br/>[LAND]"

    # Contact placeholders
    contact_person: str = "[KONTAKTPERSON]"
    contact_phone: str = "[TELEFON]"
    contact_email: str = "[E-MAIL]"

    # Header placeholders
    document_no_fallback: str = "ENTWURF"
    customer_no_fallback: str = "[KUNDEN-NR.]"

    # Commercial prototype defaults
    delivery_term: str = "[LIEFERBEDINGUNG]"
    payment_term: str = "[ZAHLUNGSBEDINGUNG]"
    delivery_time: str = "[LIEFERZEIT]"
    delivery_plant: str = "[LIEFERWERK]"
    validity_days: int = 28

    # Logo path relative to src/quoting/
    logo_relative_path: Path = Path("ui/assets/logo_elringklinger.png")

    # Prototype texts
    ai_notice: str = (
        "AI GENERATED DRAFT: Dieser Angebotsentwurf wurde automatisch erstellt "
        "und muss vor Versand fachlich und kaufmännisch geprüft werden."
    )

    intro_lines: tuple[str, ...] = (
        "Vielen Dank für Ihre Anfrage. Wir bieten Ihnen nachfolgend unverbindlich an:",
    )

    closing_lines: tuple[str, ...] = (
        "Dies ist ein Prototyp-Angebot und dient ausschließlich der internen Prüfung.",
        "Mit freundlichen Grüßen",
        "[NAME / SIGNATUR]",
    )

    footer_left: tuple[str, ...] = (
        "[GESCHÄFTSFÜHRUNG]",
        "[SITZ DER GESELLSCHAFT]",
        "[REGISTER / UST-ID]",
    )

    footer_bank: tuple[str, ...] = (
        "[BANKVERBINDUNG]",
        "[BANK 1]",
        "[BANK 2]",
    )

    footer_iban: tuple[str, ...] = (
        "IBAN",
        "[IBAN 1]",
        "[IBAN 2]",
    )

    footer_bic: tuple[str, ...] = (
        "BIC",
        "[BIC 1]",
        "[BIC 2]",
    )