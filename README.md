# ElringKlinger Quoting Pipeline – Installation & Start

KI-gestützter Generator für Angebotsentwürfe: RFQ rein, Angebotsentwurf raus.

```text
ingestion → extraction → matching → pricing → output
            (LLM)        (fuzzy)    (rules)
```

Nur die Extraktion nutzt ein LLM. Matching und Pricing sind deterministisch und auditierbar.

## Voraussetzungen

- Python 3.10+
- Node.js 20+
- API-Key für Gemini oder Azure OpenAI
- Optional für Outlook-Test: `cloudflared`

## 1. Repository vorbereiten

```bash
git clone <repo-url>
cd Business-and-AI
```

## 2. Python-Backend installieren

```bash
python -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate   # Windows

pip install -e ".[dev]"
cp env.example .env
```

Danach in `.env` den passenden API-Key eintragen.

## 3. Frontends installieren

Einmalig im Projektordner:

```bash
npm install
```

Falls die Frontend-Pakete eigene Abhängigkeiten haben:

```bash
npm --prefix review-ui install
npm --prefix outlook-ui install
```

## 4. Anwendung starten

Terminal 1: Python-API starten.

```bash
python run_review_api.py
```

Terminal 2: Frontends aus dem Projektordner starten.

```bash
npm run dev
```

Damit reicht für die Frontends ein einziger Startbefehl im Projektordner, sofern das Root-`package.json` entsprechend eingerichtet ist.

## 5. Root-`package.json` prüfen

Falls `npm run dev` im Projektordner noch nicht beide Frontends startet, im Root-`package.json` ergänzen:

```json
{
  "scripts": {
    "dev": "concurrently \"npm --prefix review-ui run dev\" \"npm --prefix outlook-ui run dev\""
  },
  "devDependencies": {
    "concurrently": "^9.0.0"
  }
}
```

Danach einmal:

```bash
npm install
```

und anschließend:

```bash
npm run dev
```

## 6. URLs

Typisch lokal:

- Review UI: `http://localhost:5174` oder der Port aus der Vite-Ausgabe
- Outlook UI: `https://localhost:5173` oder der Port aus der Vite-Ausgabe
- FastAPI: `http://127.0.0.1:8000`
- API Healthcheck: `http://127.0.0.1:8000/health`

Die tatsächlich genutzten Ports stehen immer in der Terminalausgabe.

## 7. Outlook Add-in testen

1. API starten:

```bash
python run_review_api.py
```

2. Frontends starten:

```bash
npm run dev
```

3. Outlook Add-in über `outlook-ui/manifest.xml` sideloaden.

4. Mail öffnen und den Add-in-Button ausführen.

`run_review_api.py` schreibt die aktive Tunnel-URL nach `.tunnel_url`, damit die API-Links für das Add-in automatisch stimmen.

## Tests

```bash
pytest
pytest tests/unit
```
