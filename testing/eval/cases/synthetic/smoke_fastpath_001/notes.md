# smoke_fastpath_001

Purpose: end-to-end pipeline check without any LLM dependency.

The mail body contains a literal article number (`00002900KS0009`,
present in `data/stammdaten.csv`) followed by `qty 5`. The Aho-Corasick
fast-path in `quoting.extraction.fast_path` picks this up, so:

- `extraction_path` is `"fast_path"` (no LLM call)
- one position is produced: `pos_nr=10`, `menge=5`, `einheit="ST"`
- matching produces a single exact hit
- pricing + rendering run deterministically

We intentionally do **not** assert prices here — that would couple this
smoke case to whatever rules live in `pricing/`. A dedicated pricing
case can do that.
