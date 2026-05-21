# Datenschutz-Folgenabschätzung (DSFA)

Stand: 2026-05-21

Diese Notiz dokumentiert die personenbezogene Datenverarbeitung in der RFQ-/Angebots-App. Sie ersetzt **keine** formale DSFA gemäß Art. 35 DSGVO, sondern ist Grundlage und Checkliste dafür.

## 1. Verarbeitungstätigkeit

Das System nimmt eingehende RFQ-E-Mails (Outlook), extrahiert mit Hilfe eines LLMs strukturierte Anfragedaten, gleicht Positionen gegen interne Stammdaten ab und erzeugt ein Angebot, das ein Sachbearbeiter prüft und freigibt.

## 2. Datenkategorien

| Kategorie | Beispiele | Quelle |
|---|---|---|
| Kontaktdaten Endkunde | Firma, Ansprechpartner, E-Mail, Telefon, Adresse | RFQ-Mail-Header + Anhänge |
| Geschäftsdaten | Angefragte Artikel, Mengen, Preise, Belegnummern | RFQ-Anhänge (PDF, Excel, CSV) |
| Mitarbeiterdaten | Name des Sachbearbeiters bei Freigabe | UI-Eingabe (`approval.approved_by`) |
| Mail-Inhalte | Vollständiger Mailbody + alle Anhänge | Outlook |

Es werden **keine besonderen Kategorien** (Art. 9 DSGVO) verarbeitet, soweit RFQs nur Geschäftsdaten enthalten.

## 3. Datenfluss

```
Outlook  ──┐
           │ (Mail + Anhänge, Base64)
           ▼
FastAPI Backend (lokal, :8000)
           │
           ├─► LLM-Provider (extern):
           │     - Google Gemini (LLM_PROVIDER=gemini), oder
           │     - Microsoft Azure OpenAI (LLM_PROVIDER=azure)
           │   Übertragen werden: Mailbody, alle Anhänge (PDF-Pages als Bilder,
           │   Excel/CSV als Markdown), Extraktions-Prompt.
           │
           ├─► SQLite (lokal, data/quoting.sqlite)
           │   Persistiert Reviews, Anfragen, Approvals.
           │
           └─► Dateisystem (lokal, data/artifacts/reviews/{id}/)
               Originale Anhänge + erzeugte PDFs.
```

**Wichtig:** Bei jeder Extraktion verlassen Kundendaten + Anhänge die lokale Infrastruktur und gehen an den konfigurierten LLM-Provider.

## 4. Externe Auftragsverarbeiter (Art. 28 DSGVO)

| Provider | Verwendung | AV-Vertrag erforderlich |
|---|---|---|
| Google Gemini (`generativelanguage.googleapis.com`) | Extraktion bei `LLM_PROVIDER=gemini` | **Ja** — AV mit Google Cloud / Google Ireland |
| Microsoft Azure OpenAI | Extraktion bei `LLM_PROVIDER=azure` | **Ja** — AV mit Microsoft Ireland |

**Bitte vor Produktiv-Einsatz prüfen:**
- AV-Vertrag liegt vor.
- Datenstandort des LLM-Endpunkts ist mit dem Datenschutzbeauftragten abgestimmt (EU vs. US).
- Modell wird nicht zum Training verwendet (bei Gemini: "Gemini API for Google AI Studio" mit Workspace-Account; bei Azure OpenAI: Standard-Setting).

## 5. Rechtsgrundlage

- **Art. 6 Abs. 1 lit. b DSGVO** (Vertragsanbahnung) für die Bearbeitung eingehender Anfragen.
- **Art. 6 Abs. 1 lit. f DSGVO** (berechtigtes Interesse) für die KI-gestützte Automation — Interessenabwägung dokumentieren.

## 6. Speicherdauer

| Datentyp | Speicherort | Aufbewahrung |
|---|---|---|
| Review-Datensätze, Anfragen, Angebote | SQLite | Solange Datenbank-Datei nicht gelöscht — kein automatisches Löschen implementiert. |
| Originale Anhänge, generierte PDFs | `data/artifacts/reviews/{id}/` | Wie oben. |
| LLM-Provider-seitige Logs | extern | Lt. Provider-Policy. |

**Lücke:** Aktuell gibt es **kein Löschkonzept**. Vor Produktiv-Einsatz: Aufbewahrungsfristen festlegen (handelsrechtlich ggf. 6 oder 10 Jahre, danach Löschung).

## 7. Technische und organisatorische Maßnahmen — Ist-Zustand

| Maßnahme | Status | Bemerkung |
|---|---|---|
| Authentifizierung der API | ❌ fehlt | `/api/*` ist ungesichert (`src/quoting/api/review_api.py`). |
| CORS-Lockdown | ❌ fehlt | `allow_origins=["*"]` (review_api.py:65-66). |
| TLS / HTTPS | ⚠️ Default ist HTTP | Reverse-Proxy mit TLS-Cert vor Backend nötig. |
| Verschlüsselung at rest | ❌ nicht implementiert | SQLite und Dateisystem unverschlüsselt. |
| Audit-Trail Edits | ❌ fehlt | Nur Approval-State-Übergänge werden geloggt. |
| Rate-Limit | ❌ fehlt | DoS-Risiko + Kosten-Drift bei LLM-Calls. |
| Zugangskontrolle Server | offen | Lt. Betriebshandbuch. |

**→ Diese Lücken sind in den Tier-0/1-Maßnahmen der App-Bewertung priorisiert.**

## 8. Betroffenenrechte

- **Auskunft (Art. 15):** Aktuell nur über manuellen Datenbank-Export.
- **Löschung (Art. 17):** Manuell durch Löschen des Review-Datensatzes + zugehöriger Artefakte. Keine UI.
- **Datenportabilität (Art. 20):** Anfrage liegt strukturiert in `review_payloads` (JSON) — Export per SQL-Query möglich.
- **Auskunft an LLM-Provider:** Lt. Provider-Policy.

## 9. Hinweise an Betroffene

- Sachbearbeiter sehen vor jedem Review-Start einen Hinweis "Daten werden zur Analyse an externen LLM-Provider übertragen" (Outlook-Add-in + Review UI).
- Endkunden müssen in der Datenschutzerklärung der Firma informiert werden, dass eingehende Anfragen KI-gestützt verarbeitet werden — Formulierung mit Datenschutzbeauftragtem abstimmen.

## 10. Restrisiken

1. **Halluzination im LLM:** Falsche Extraktion kann zu falschem Angebot führen → mitigiert durch obligatorische manuelle Prüfung + Quality-Gate vor Freigabe.
2. **Datenabfluss zum LLM-Provider:** Mitigiert durch AV-Vertrag; Restrisiko bei AGB-Änderung des Providers.
3. **Fehlende Auth:** Aktuell hohes Risiko — siehe Tier-0-Punkt #2 der App-Bewertung.
4. **Keine Audit-Trails auf Edit-Ebene:** Nachvollziehbarkeit bei Reklamationen eingeschränkt — Tier-1-Punkt #10.

## 11. Verantwortlichkeiten

- **Fachlich:** Vertriebsleitung
- **Technisch:** [TBD: IT / Entwickler]
- **Datenschutz:** [TBD: betrieblicher Datenschutzbeauftragter]

## 12. Freigabe

Diese DSFA-Notiz ist **Entwurf** und muss vor Produktiv-Einsatz mit dem Datenschutzbeauftragten abgestimmt und formal freigegeben werden.
