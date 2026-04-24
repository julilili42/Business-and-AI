import os
import argparse
import time
import hashlib
import fitz  # pip install pymupdf
import pytesseract
import openai
from pdf2image import convert_from_path
from tqdm import tqdm
from concurrent.futures import ThreadPoolExecutor, as_completed
from multiprocessing import cpu_count

# ==============================
# KONFIGURATION - BITTE ANPASSEN
# ==============================

pytesseract.pytesseract.tesseract_cmd = r'C:\Users\MUTLUME\AppData\Local\Programs\Tesseract-OCR\tesseract.exe'
POPPLER_PATH = r'C:\Poppler\Release-25.12.0-0\poppler-25.12.0\Library\bin'
DEFAULT_OUTPUT_FOLDER = r"C:\Business & AI\Output"
MAX_WORKER = cpu_count()

# ===============================
# AZURE OPENAI SETUP
# ===============================

llm_client = openai.AzureOpenAI(
    api_version="2024-10-21",
    azure_endpoint="https://genai-nexus.api.corpinter.net/",
    api_key=os.getenv("NEXUS_API_KEY"),  # $env:NEXUS_API_KEY="your_key_here"
)

CHAT_MODEL = "gpt-5-mini"

SYSTEM_PROMPT = """
Du bist ein Experte für die Analyse von Bestellungen, Angeboten und Anfragen (Quotes/RFQs).
Deine Aufgabe ist es, aus einem (evtl. fehlerhaften) OCR-Text strukturierte Produktdaten zu extrahieren.

WICHTIG - SPRACHE:
- Erkenne die Sprache des Input-Texts automatisch.
- DEINE AUSGABE MUSS IN DER GLEICHEN SPRACHE WIE DER INPUT-TEXT SEIN.
- Übersetze NICHTS - behalte alle Fachbegriffe und Produktbezeichnungen
  in der Originalsprache des Dokuments bei.

HINWEISE ZUR EXTRAKTION:
1. OCR-FEHLER: Ignoriere Formatierungsfehler im Quelltext und interpretiere naheliegende Begriffe.
2. SYNONYME: Nutze dein Fachwissen (z.B. "Item No." = "Artikelnr.", "Part Number" = "ProduktID",
   "Qty" = "Menge", "Quantity" = "Anzahl", "Material Number" = "Materialnummer").
3. Wenn mehrere Produkte aufgelistet werden, extrahiere jedes Produkt einzeln.
4. FEHLENDE DATEN: Wenn eine Information nicht im Text steht, schreibe "Nicht vorhanden".
DEFINITION "ProduktID/Artikelnr.":
- Kann verschiedene Bezeichnungen haben: "Item No.", "Part Number", "Artikelnr.", "Material Number",
  "Materialnummer", "Bestellnummer", "Order No.", "Sachnummer", "SAP-Nr.", etc.
- Kann Buchstaben, Ziffern und Sonderzeichen wie '/', '-' enthalten.
- Im Text können ProduktIDs mit Leerzeichen formatiert sein - diese Leerzeichen entfernen.
- Falls keine ProduktID gefunden wird, das Feld leer lassen.

DEFINITION "Menge/Anzahl":
- Kann verschiedene Bezeichnungen haben: "Qty", "Quantity", "Menge", "Anzahl", "Ilość",
  "Cantidad", "Stück", "pcs", etc.
- Standard-Menge ist 1, falls keine angegeben.
- Mengen können mit Einheitskürzel stehen (z.B. "3 St", "2 pc", "10 x").
  In diesen Fällen ist die Zahl die Menge und das Kürzel die Einheit.
- Im Zweifel immer Menge=1 annehmen.

FORMATIERUNG DER AUSGABE (EXAKT DIESES SCHEMA):

### Produktliste
| Nr. | ProduktID/Artikelnr. | Beschreibung | Menge |
|-----|----------------------|--------------|-------|
| 1   | [Nummer oder leer]   | [Produktname in Originalsprache] | [Anzahl] |
| 2   | ...                  | ...          | ...   |

REGELN FÜR DIE AUSGABE:
- Jede Zeile der Quelltabelle wird zu einer Zeile in der Ausgabetabelle.
- "Nr." ist eine fortlaufende Nummer (1, 2, 3, ...).
- "ProduktID/Artikelnr." enthält die Teilenummer/Artikelnummer. Leer lassen wenn nicht vorhanden.
- "Beschreibung" enthält den Produktnamen/die Bezeichnung in der Originalsprache.
- "Menge" enthält die Anzahl (Standard: 1).
- Preise, Rabatte und andere Spalten NICHT in die Ausgabe übernehmen.
"""

# =============================================================================
# SPRACH-DEFINITIONEN FÜR TESSERACT
# =============================================================================

latin_sprachen    = ['eng', 'deu', 'fra', 'ita', 'spa', 'por', 'nld', 'ces']
cyrillic_sprachen = ['rus', 'ukr', 'bul', 'srp']
chinesisch        = ['chi_sim', 'chi_tra']
japanisch         = ['jpn']
arabisch          = ['ara']
devanagari        = ['hin', 'san', 'mar']

ALLE_SPRACHEN = "+".join(
    latin_sprachen + cyrillic_sprachen + chinesisch + japanisch + arabisch + devanagari
)

# =============================================================================
# SCHRITT 1: BILDER AUS PDF EXTRAHIEREN (PyMuPDF)
# =============================================================================

def extrahiere_bilder_aus_pdf(pdf_pfad, bilder_ordner):
    """Extrahiert alle eingebetteten Bilder aus der PDF und speichert sie."""
    os.makedirs(bilder_ordner, exist_ok=True)
    doc = fitz.open(pdf_pfad)
    anzahl = 0
    uebersprungen_duplikate = 0
    bekannte_hashes = set()

    # Bereits vorhandene Bilder im Zielordner berücksichtigen (z.B. bei erneutem Lauf)
    for vorhandene_datei in os.listdir(bilder_ordner):
        vorhandener_pfad = os.path.join(bilder_ordner, vorhandene_datei)
        if os.path.isfile(vorhandener_pfad):
            try:
                with open(vorhandener_pfad, "rb") as f:
                    bekannte_hashes.add(hashlib.sha256(f.read()).hexdigest())
            except Exception:
                # Defekte/gesperrte Dateien ignorieren, Extraktion soll weiterlaufen
                pass

    print(f"\n🖼️  Extrahiere eingebettete Bilder aus PDF...")
    for page_num in range(len(doc)):
        page = doc[page_num]
        for img_index, img in enumerate(page.get_images(full=True)):
            xref = img[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                ext = base_image["ext"]

                bild_hash = hashlib.sha256(image_bytes).hexdigest()
                if bild_hash in bekannte_hashes:
                    uebersprungen_duplikate += 1
                    continue

                dateiname = f"bild_seite{page_num + 1}_{img_index + 1}.{ext}"
                pfad = os.path.join(bilder_ordner, dateiname)
                with open(pfad, "wb") as f:
                    f.write(image_bytes)
                anzahl += 1
                bekannte_hashes.add(bild_hash)
            except Exception as e:
                print(f"   ⚠️  Bild auf Seite {page_num + 1} konnte nicht gespeichert werden: {e}")

    doc.close()

    if anzahl > 0:
        print(f"   ✅ {anzahl} Bild(er) gespeichert unter: {bilder_ordner}")
    else:
        print(f"   ℹ️  Keine eingebetteten Bilder in der PDF gefunden.")

    if uebersprungen_duplikate > 0:
        print(f"   ♻️  {uebersprungen_duplikate} Duplikat(e) wurden nicht gespeichert.")

# ===============================================================
# SCHRITT 2: OCR - TEXT AUS PDF EXTRAHIEREN (Tesseract + Poppler)
# ===============================================================

def verarbeite_seite(args):
    """Hilfsfunktion für die parallele OCR-Verarbeitung einer einzelnen Seite."""
    i, bild = args
    custom_config = r'--psm 6'  # Zeilenweise Erkennung
    try:
        text = pytesseract.image_to_string(bild, lang=ALLE_SPRACHEN, config=custom_config)
        return i, f"\n--- SEITE {i + 1} ---\n{text}"
    except Exception as e:
        return i, f"\n--- SEITE {i + 1} ---\n[OCR FEHLER: {e}]"


def extrahiere_text_per_ocr(pdf_pfad, ocr_ausgabe_txt):
    """Konvertiert PDF-Seiten zu Bildern und führt OCR durch. Gibt den Text zurück."""
    print(f"\n🔍 Starte OCR-Textextraktion...")
    print(f"   Konvertiere PDF zu Bildern (DPI=300)...")

    seiten_bilder = convert_from_path(pdf_pfad, dpi=300, poppler_path=POPPLER_PATH)
    print(f"   PDF hat {len(seiten_bilder)} Seite(n). Starte OCR mit {MAX_WORKER} parallelen Threads...")

    seiten_liste = [(i, bild) for i, bild in enumerate(seiten_bilder)]
    alle_texte = [None] * len(seiten_liste)

    with ThreadPoolExecutor(max_workers=MAX_WORKER) as executor:
        futures = [executor.submit(verarbeite_seite, seite) for seite in seiten_liste]
        with tqdm(total=len(seiten_liste), desc="   OCR-Fortschritt") as pbar:
            for future in as_completed(futures):
                i, text = future.result()
                alle_texte[i] = text
                pbar.update(1)

    kompletter_text = "".join(alle_texte)

    with open(ocr_ausgabe_txt, 'w', encoding='utf-8') as f:
        f.write(kompletter_text)

    print(f"   ✅ OCR-Text gespeichert unter: {ocr_ausgabe_txt}")
    return kompletter_text

# ==================================
# SCHRITT 3: LLM - DATEN EXTRAHIEREN
# ==================================

def extrahiere_daten_per_llm(ocr_text, llm_ausgabe_txt):
    """Schickt den OCR-Text ans LLM und speichert das strukturierte Ergebnis."""
    print(f"   🤖 LLM-Extraktion läuft...")

    response = llm_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": ocr_text}
        ]
    )

    ergebnis = response.choices[0].message.content

    with open(llm_ausgabe_txt, "w", encoding="utf-8") as f:
        f.write(ergebnis)

    print(f"   🤖 LLM-Ergebnis gespeichert: {os.path.basename(llm_ausgabe_txt)}")
    return ergebnis


# ==============
# HAUPT-PIPELINE
# ==============

def verarbeite_pdf(pdf_pfad, ausgabe_ordner):
    """Führt die komplette Pipeline für eine PDF-Datei aus."""

    dateiname      = os.path.basename(pdf_pfad)
    name           = os.path.splitext(dateiname)[0]

    # Unterordner pro PDF anlegen
    pdf_ordner     = os.path.join(ausgabe_ordner, name)
    bilder_ordner  = os.path.join(pdf_ordner, "bilder")
    ocr_txt_pfad   = os.path.join(pdf_ordner, f"{name}_ocr.txt")
    llm_txt_pfad   = os.path.join(pdf_ordner, f"{name}_llm_ergebnis.txt")

    os.makedirs(pdf_ordner, exist_ok=True)

    print(f"\n{'=' * 60}")
    print(f"📄 Verarbeite : {dateiname}")
    print(f"📂 Ausgabe    : {pdf_ordner}")
    print(f"⚙️  Threads    : {MAX_WORKER}")
    print(f"{'=' * 60}")

    # --- Schritt 1: Eingebettete Bilder speichern ---
    extrahiere_bilder_aus_pdf(pdf_pfad, bilder_ordner)

    # --- Schritt 2: OCR ---
    ocr_text = extrahiere_text_per_ocr(pdf_pfad, ocr_txt_pfad)

    # --- Schritt 3: LLM ---
    extrahiere_daten_per_llm(ocr_text, llm_txt_pfad)

    print(f"\n{'=' * 60}")
    print(f"✅ PIPELINE ABGESCHLOSSEN: {dateiname}")
    print(f"   📝 OCR-Text    : {ocr_txt_pfad}")
    print(f"   🤖 LLM-Ergebnis: {llm_txt_pfad}")
    print(f"   🖼️  Bilder      : {bilder_ordner}")
    print(f"{'=' * 60}")


def parse_args():
    parser = argparse.ArgumentParser(
        description="KFZ-PDF-Pipeline: OCR + Bildextraktion + LLM-Analyse",
        formatter_class=argparse.RawTextHelpFormatter,
        epilog=(
            "Beispiele:\n"
            "  python pdf_extractor.py dokument.pdf\n"
            "  python pdf_extractor.py dokument.pdf --output C:\\Ergebnisse\n"
        )
    )
    parser.add_argument(
        "pdf",
        metavar="PDF_PFAD",
        help="Pfad zur PDF-Datei, die verarbeitet werden soll."
    )
    parser.add_argument(
        "-o", "--output",
        metavar="ORDNER",
        default=DEFAULT_OUTPUT_FOLDER,
        help=f"Ausgabeordner für alle Ergebnisse.\n(Standard: {DEFAULT_OUTPUT_FOLDER})"
    )
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    start_time = time.time()

    # Ausgabeordner anlegen
    os.makedirs(args.output, exist_ok=True)

    # PDF prüfen
    if not os.path.exists(args.pdf):
        print(f"❌ Fehler: Die Datei wurde nicht gefunden:")
        print(f"   {args.pdf}")
    else:
        try:
            verarbeite_pdf(args.pdf, args.output)
            erfolg = True
        except Exception as e:
            print(f"\n❌ Fehler in der Pipeline: {e}")
            erfolg = False

        print(f"\n{'=' * 60}")
        print("✅ VERARBEITUNG ERFOLGREICH!" if erfolg else "❌ VERARBEITUNG FEHLGESCHLAGEN!")
        print(f"{'=' * 60}")

    dauer = time.time() - start_time
    print(f"\n⏱️  Gesamtdauer: {dauer:.2f} Sekunden", end="")
    print(f" ({dauer / 60:.2f} Minuten)" if dauer > 60 else "")
