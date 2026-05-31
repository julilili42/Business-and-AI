"""Tests for the LLM-generated reply-body prompt builder."""
from __future__ import annotations

import pytest

from quoting.core import Anforderung, Anfrage
from quoting.extraction.llm.base import LLMResponse, TokenUsage
from quoting.output.reply_body_prompt import (
    build_reply_body_prompt,
    detect_language,
    generate_reply_body,
)
from quoting.pricing import Quotation, QuotationItem


def _quotation(items: list[QuotationItem], total: float = 0.0) -> Quotation:
    return Quotation(
        kunde_firma="Musterfirma GmbH",
        kunde_ansprechpartner="Erika Musterfrau",
        kunde_email=None,
        kundennummer=None,
        belegnummer="A-2026-0042",
        incoterms=None,
        zahlungsbedingungen=None,
        items=items,
        gesamtsumme=total,
        waehrung="EUR",
        warnungen=[],
    )


def _item(pos_nr: int = 1, bez: str = "Hydraulikpumpe XL-200") -> QuotationItem:
    return QuotationItem(
        pos_nr=pos_nr,
        artikel_nr="X-001",
        bezeichnung=bez,
        menge=3,
        einheit="Stk",
        einzelpreis=100.0,
        rabatt_prozent=0.0,
        gesamtpreis=300.0,
        bemerkung="",
    )


class _StubLLM:
    def __init__(self, text: str) -> None:
        self.text = text
        self.last_prompt: str | None = None

    def generate(self, prompt: str, images=None) -> LLMResponse:  # noqa: ARG002
        self.last_prompt = prompt
        return LLMResponse(text=self.text, usage=TokenUsage(0, 0, 0))


def test_detect_language_falls_back_to_de_when_unknown():
    assert detect_language("") == "de"
    assert detect_language("xyz") == "de"


def test_detect_language_picks_en_on_english_salutation():
    body = "Dear Sirs, please find attached our request for quotation. Best regards, Bob."
    assert detect_language(body) == "en"


def test_detect_language_picks_de_on_german_salutation():
    body = "Sehr geehrte Damen und Herren, bitte um Angebot. Mit freundlichen Grüßen."
    assert detect_language(body) == "de"


def test_detect_language_de_on_mixed_with_more_german_hints():
    body = "Sehr geehrte Damen, kindly send your quote. Mit freundlichen Grüßen."
    assert detect_language(body) == "de"


def test_prompt_contains_customer_and_position(sample_anfrage: Anfrage):
    quotation = _quotation([_item(bez="Spezialteil A"), _item(pos_nr=2, bez="Teil B")], 1234.5)
    prompt = build_reply_body_prompt(sample_anfrage, quotation, style_hint="", language="de")
    assert "Testkunde GmbH" in prompt
    assert "Spezialteil A" in prompt
    assert "Teil B" in prompt
    assert "Anzahl Positionen: 2" in prompt
    assert "Anrede" in prompt
    assert "Mit freundlichen Grüßen" in prompt
    assert "[Absender]" in prompt


def test_prompt_forbids_non_quotation_attachments_de(sample_anfrage: Anfrage):
    quotation = _quotation([_item(bez="Abnahmeprüfzeugnis 3.1")], 95.0)
    prompt = build_reply_body_prompt(sample_anfrage, quotation, style_hint="", language="de")
    assert "keine weiteren Anhänge außer dem Angebots-PDF" in prompt
    assert "Positionen (Angebotspositionen, keine E-Mail-Anhänge)" in prompt


def test_prompt_includes_style_hint_when_provided(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    prompt = build_reply_body_prompt(
        sample_anfrage, quotation, style_hint="formell, kurz", language="de"
    )
    assert "formell, kurz" in prompt
    assert "Stilvorgabe" in prompt


def test_prompt_omits_style_block_when_hint_empty(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    prompt = build_reply_body_prompt(sample_anfrage, quotation, style_hint="   ", language="de")
    assert "Stilvorgabe" not in prompt


def test_prompt_english_variant(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    prompt = build_reply_body_prompt(sample_anfrage, quotation, style_hint="", language="en")
    assert "Customer:" in prompt
    assert "Response:" in prompt
    assert "Dear Sir or Madam" in prompt
    assert "Best regards" in prompt
    assert "Do not claim any attachments other than the quotation PDF" in prompt


def test_generate_reply_body_strips_response_artifact(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM('"Antwort: vielen Dank für Ihre Anfrage. Anbei das Angebot."')
    body, language = generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
    )
    assert body.startswith("vielen Dank")
    assert language == "de"
    assert llm.last_prompt is not None


def test_generate_reply_body_strips_code_fence_and_quotes(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM(
        "```text\n"
        "„Sehr geehrte Damen und Herren,\n\n"
        "vielen Dank für Ihre Anfrage.\n\n"
        "Mit freundlichen Grüßen\n"
        "[Absender]“\n"
        "```"
    )

    body, _ = generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
    )

    assert body.startswith("Sehr geehrte Damen und Herren,")
    assert body.endswith("[Absender]")


def test_generate_reply_body_unescapes_literal_newlines(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM(
        "Sehr geehrter Herr Hochstein,\\n\\n"
        "vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot als PDF.\\n\\n"
        "Mit freundlichen Grüßen\\n[Absender]"
    )

    body, _ = generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
    )

    assert "\\n" not in body
    assert "Hochstein,\n\nvielen Dank" in body
    assert body.endswith("Grüßen\n[Absender]")


def test_generate_reply_body_unwraps_json_email_body_and_formats_layout(
    sample_anfrage: Anfrage,
):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM(
        '{"email_body": "Sehr geehrter Herr Hochstein,\\n'
        'vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot als PDF.\\n'
        'Sollten Sie Fragen haben, melden Sie sich gern.\\n'
        'Mit freundlichen Grüßen\\nJulian Jurcevic"}'
    )

    body, _ = generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
    )

    assert not body.startswith("{")
    assert "email_body" not in body
    assert body.startswith("Sehr geehrter Herr Hochstein,\n\nvielen Dank")
    assert "gern.\n\nMit freundlichen Grüßen\nJulian Jurcevic" in body


def test_generate_reply_body_rejects_certificate_attachment_claim(
    sample_anfrage: Anfrage,
):
    quotation = _quotation([_item(bez="Abnahmeprüfzeugnis 3.1")], 95.0)
    llm = _StubLLM(
        "Sehr geehrter Herr Hochstein,\n\n"
        "vielen Dank für Ihre Anfrage. Anbei sende ich Ihnen das gewünschte Angebot "
        "für die Gleitstücke sowie das Abnahmeprüfzeugnis als PDF-Anhang.\n\n"
        "Mit freundlichen Grüßen\n[Absender]"
    )

    with pytest.raises(RuntimeError, match="unsupported attachment claim"):
        generate_reply_body(
            anfrage=sample_anfrage,
            quotation=quotation,
            mail_body="Sehr geehrte Damen, bitte um Angebot.",
            style_hint="",
            llm=llm,
        )


def test_generate_reply_body_rejects_drawing_follow_up_wording(
    sample_anfrage: Anfrage,
):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM(
        "Sehr geehrter Herr Hochstein,\n\n"
        "vielen Dank für Ihre Anfrage. Anbei erhalten Sie unser Angebot als PDF. "
        "Die aktuell gültigen Zeichnungen reichen wir separat nach.\n\n"
        "Mit freundlichen Grüßen\n[Absender]"
    )

    with pytest.raises(RuntimeError, match="drawing follow-up"):
        generate_reply_body(
            anfrage=sample_anfrage,
            quotation=quotation,
            mail_body="Sehr geehrte Damen, bitte um Angebot.",
            style_hint="",
            llm=llm,
        )


def test_prompt_includes_acknowledged_requirements_de(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    acks = [
        Anforderung(text="Zeichnung Pos 30 beilegen", kategorie="zeichnung", pos_nr=30),
        Anforderung(text="Material-Zertifikat 3.1", kategorie="zertifikat"),
    ]
    prompt = build_reply_body_prompt(
        sample_anfrage,
        quotation,
        style_hint="",
        language="de",
        acknowledged_requirements=acks,
        outgoing_attachment_names=["Zeichnung 01Z3.pdf"],
    )
    assert "bestätigte Aufgaben aus der Anfrage" in prompt
    assert "[Zeichnung, Pos. 30] Zeichnung Pos 30 beilegen" in prompt
    assert "[Zertifikat] Material-Zertifikat 3.1" in prompt
    assert "Mail-Body-Leitplanken" in prompt
    assert "Die aktuell gültigen Zeichnungen erhalten Sie ebenfalls mit dieser E-Mail" in prompt
    assert "nicht, dass Zeichnungen separat oder später nachgereicht werden" in prompt
    assert "niemals als angehängte oder beigelegte Datei" in prompt
    assert "Zeichnung 01Z3.pdf" in prompt


def test_prompt_omits_drawing_promise_without_extra_attachments(
    sample_anfrage: Anfrage,
):
    quotation = _quotation([_item()], 300.0)
    acks = [Anforderung(text="Zeichnung beilegen", kategorie="zeichnung")]
    prompt = build_reply_body_prompt(
        sample_anfrage,
        quotation,
        style_hint="",
        language="de",
        acknowledged_requirements=acks,
    )
    assert "Zusatzanhänge für diese Angebotsmail:\n- keine" in prompt
    assert "Nicht im Mailtext erwähnen" in prompt
    assert "erhalten Sie ebenfalls mit dieser E-Mail" not in prompt


def test_prompt_includes_acknowledged_requirements_en(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    acks = [Anforderung(text="Include drawing for pos 30", kategorie="zeichnung")]
    prompt = build_reply_body_prompt(
        sample_anfrage,
        quotation,
        style_hint="",
        language="en",
        acknowledged_requirements=acks,
        outgoing_attachment_names=["drawing.pdf"],
    )
    assert "Customer tasks confirmed by Sales" in prompt
    assert "[drawing] Include drawing for pos 30" in prompt
    assert "You will also receive the current drawings with this email" in prompt


def test_prompt_omits_ack_block_when_none(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    prompt = build_reply_body_prompt(
        sample_anfrage,
        quotation,
        style_hint="",
        language="de",
        acknowledged_requirements=[],
    )
    assert "Sonderwünsche" not in prompt


def test_generate_reply_body_passes_acks_through(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM("vielen Dank für Ihre Anfrage.")
    acks = [Anforderung(text="Zeichnung beilegen", kategorie="zeichnung")]
    generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
        acknowledged_requirements=acks,
    )
    assert llm.last_prompt is not None
    assert "Zeichnung beilegen" in llm.last_prompt


def test_generate_reply_body_reports_token_usage(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM("vielen Dank für Ihre Anfrage.")
    reported: list[TokenUsage] = []

    generate_reply_body(
        anfrage=sample_anfrage,
        quotation=quotation,
        mail_body="Sehr geehrte Damen, bitte um Angebot.",
        style_hint="",
        llm=llm,
        usage_callback=reported.append,
    )

    assert reported == [TokenUsage(0, 0, 0)]


def test_generate_reply_body_raises_on_empty_response(sample_anfrage: Anfrage):
    quotation = _quotation([_item()], 300.0)
    llm = _StubLLM("   ")
    with pytest.raises(RuntimeError, match="empty reply body"):
        generate_reply_body(
            anfrage=sample_anfrage,
            quotation=quotation,
            mail_body="",
            style_hint="",
            llm=llm,
        )
