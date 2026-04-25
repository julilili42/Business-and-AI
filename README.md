# ElringKlinger Quoting Pipeline

KI-gestützter Generator für Angebotsentwürfe.
**RFQ (PDF / Mail / Excel) → strukturierte Extraktion → Stammdaten-Match → Draft-Angebot (PDF)**

```text
ingestion ─► extraction ─► matching ─► pricing ─► output
(eml/pdf/xlsx)  (LLM)       (fuzzy)    (rules)   (PDF + JSON)
```

Jede Stufe lebt in einem eigenen Sub-Package unter `src/quoting/`. Die Reihenfolge
ist nur in `pipeline.py` codiert.

---

## Voraussetzungen

- Python ≥ 3.11
- Node.js ≥ 20 (nur für das Outlook Add-in)
- [`cloudflared`](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/)
  (nur für das Outlook Add-in, damit die lokale API von außen erreichbar ist)
- API-Key für Gemini **oder** Azure OpenAI

---

## Setup

```bash
# 1. Projekt installieren (editable + dev tools)
pip install -e ".[dev]"

# 2. .env aus Vorlage erzeugen und API-Key eintragen
cp .env.example .env
# danach .env öffnen und GOOGLE_API_KEY (oder NEXUS_API_KEY) setzen
```

Die `.env` ist gitignored — sie enthält Secrets.

---

## Drei Wege, die Pipeline zu benutzen

### A) CLI — schnellste Variante zum Testen

```bash
# Eine Datei
python -m quoting.cli run path/to/rfq.pdf

# Ganzer Ordner
python -m quoting.cli batch ./inbox --output ./results
```

Akzeptierte Inputs: `.pdf`, `.eml`, `.msg`, `.xlsx`, `.xls`, `.csv`.

### B) Streamlit Review-UI — manueller Upload mit Reviewer-Chat

```bash
python run_ui.py
```

Browser öffnet sich auf `http://localhost:8501`. PDF/EML hochladen, extrahierte
Positionen reviewen, Draft-Angebot generieren, im Chat kommerziell anpassen
("Gib 5% Rabatt auf Pos 2", "Setze Pos 3 auf 10 EUR"), neu rendern lassen.

### C) Outlook Add-in — End-to-End aus dem Postfach

Drei Komponenten müssen parallel laufen:

```bash
# Terminal 1 — FastAPI + Cloudflare-Tunnel (publishes .tunnel_url)
python run_review_api.py

# Terminal 2 — Streamlit Review-UI
python run_ui.py

# Terminal 3 — Outlook Add-in (Vite Dev Server auf https://localhost:5173)
cd outlook-test-addin
npm install        # nur einmal
npm run dev
```

`run_review_api.py` startet uvicorn auf `127.0.0.1:8000` und parallel einen
cloudflared-Quick-Tunnel. Die aktuelle öffentliche Tunnel-URL wird live in
`.tunnel_url` (Projekt-Root) geschrieben — die FastAPI liest sie pro Request,
damit `draft_pdf_url` immer auf die *aktuelle* Tunnel-URL zeigt. Kein manuelles
`.env`-Editieren nötig.

**Add-in in Outlook laden** (einmalig):

1. In Outlook → "Add-Ins verwalten" → "Mein Add-In hinzufügen" → "Aus Datei"
2. `outlook-test-addin/manifest.xml` auswählen
3. Eine Mail öffnen → Button **TEST** in der Ribbon → Panel öffnet sich
4. **"Draft Quotation erstellen"** klickt durch:
   Mail-Snapshot → API → Pipeline → PDF → neue Outlook-Mail mit PDF-Anhang

Schneller Sanity-Check:

```bash
curl http://127.0.0.1:8000/health
# {"ok": true, "api_base_url": "https://...trycloudflare.com"}
```

Die zurückgegebene URL muss zur Live-Tunnel-URL passen, die `cloudflared`
beim Start in der Konsole anzeigt.

---

## Layout

```text
quoting-pipeline/
├── README.md
├── pyproject.toml
├── .env.example              # Vorlage — kopieren nach .env
├── .env                      # gitignored, lokale Secrets
├── .tunnel_url               # gitignored, von run_review_api.py geschrieben
│
├── run_review_api.py         # FastAPI + cloudflared-Launcher (für Add-in)
├── run_ui.py                 # Streamlit Review-UI Launcher
│
├── data/
│   ├── stammdaten_test.csv   # Beispiel-Stammdaten
│   └── reviews/              # Pro-Review-Artefakte (vom API-Flow)
│
├── docs/
│   ├── architecture.md
│   └── decisions/            # ADRs (no-LLM-in-matching, certs-flat, ...)
│
├── outlook-test-addin/       # Vite + React Outlook Add-in
│   ├── manifest.xml
│   └── src/
│
├── src/quoting/
│   ├── cli.py                # CLI entry point (run / batch)
│   ├── pipeline.py           # End-to-end orchestrator
│   ├── api/                  # FastAPI für Outlook Add-in
│   ├── core/                 # config, logging, schema
│   ├── ingestion/            # .eml / .msg / loose file parsing
│   ├── extraction/           # LLM extraction (Gemini / Azure)
│   ├── matching/             # deterministisches Stammdaten-Matching
│   ├── pricing/              # deterministisches Pricing
│   ├── output/               # PDF + JSON writer
│   └── ui/                   # Streamlit Review-App
│
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

---

## Architektur-Prinzipien

- **Extraktion** ist der einzige LLM-Schritt. Provider wählbar via `LLM_PROVIDER`
  (`gemini` oder `azure`).
- **Matching** und **Pricing** sind komplett deterministisch — kein LLM, voll
  auditierbar (siehe `docs/decisions/001-no-llm-in-matching-or-pricing.md`).
- Die `Mail`-Datenstruktur ist der einzige Input der Pipeline. CLI, API und
  Tests bauen alle ein `Mail` und übergeben es an `QuotingPipeline.run()`.
- Zertifikate (`Abnahmeprüfzeugnis 3.1` etc.) sind Pauschal-Aufschläge, kein
  Stückpreis × Menge (siehe ADR 002).

---

## Tests

```bash
pytest                  # alle
pytest tests/unit       # nur Unit
pytest tests/integration
```

---

## Troubleshooting

**Add-in zeigt "PDF URL check failed: Failed to fetch"**
Der cloudflared-Tunnel ist nicht erreichbar oder `.tunnel_url` enthält eine
veraltete URL. Lösung: `run_review_api.py` neu starten — die Datei wird beim
Start gelöscht und mit der neuen URL überschrieben.

**Add-in: "Draft Quotation erstellen" → kein neues Mail-Fenster öffnet sich**
Das passiert auf dem "neuen" Outlook für Mac und manchen Web-Versionen. Das
Compose-Fenster geht oft im Hintergrund auf — Dock / Taskleiste prüfen.
Alternativ Outlook Classic verwenden.

**Cloudflared Quick-Tunnel-URL ändert sich bei jedem Neustart**
Das ist Designentscheidung von Cloudflare für Quick Tunnels. `.tunnel_url`
hält die jeweils aktuelle URL aktuell — die API liest sie pro Request.
Für eine permanente URL einen *Named Tunnel* einrichten und den Pfad zur
`config.yml` über `CLOUDFLARED_CONFIG` setzen.

**Stammdaten nicht gefunden**
Wenn `data/stammdaten_test.csv` fehlt, fällt das Matching auf eingebettete
Mock-Daten zurück (siehe `matching/stammdaten.py`).

---

## Notes

- Outputs landen unter `OUTPUT_DIR` (CLI) bzw. `data/reviews/<id>/` (API).
- Alle Secrets gehören in `.env`, niemals ins Repo.
