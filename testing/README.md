# Testing

End-to-end evaluation harness for the quoting pipeline.

This directory is **separate from `tests/`**:

- `tests/` — unit + integration tests run on every commit. Fast, hermetic.
- `testing/` — full-pipeline evaluation against real and synthetic RFQs. Slower, optionally calls a real LLM, produces metrics reports.

## Layout

```
testing/
  eval/
    cases/
      real/                 # anonymised real RFQs (Phase 2)
      synthetic/            # generator-produced cases (Phase 4)
    recordings/             # cached LLM responses for reproducible runs
    metrics/                # per-step metric implementations
    schema.py               # Pydantic models for expected/*.json
    case_loader.py          # discover + load cases
    runner.py               # run pipeline against a case
    report.py               # markdown report writer
  generator/                # synthetic RFQ factory (Phase 4)
  run_eval.py               # CLI entry point
  test_eval_harness.py      # pytest entry, marker = "eval"
```

## A case

Each case is one directory under `cases/{real,synthetic}/`:

```
case_name/
  input/
    mail.eml | mail.msg          # the incoming RFQ
    attachments/                  # optional: extracted attachments
  expected/
    anfrage.json                  # ground-truth Anfrage (extraction step)
    matches.json                  # ground-truth Stammdaten matches (optional)
    quotation.json                # ground-truth Quotation (optional)
  notes.md                        # what's special about this case
```

Only `input/mail.{eml,msg}` and `expected/anfrage.json` are required.
Missing expected files mean that step is not scored for this case.

## Running

```bash
# Run all cases, write report
python testing/run_eval.py

# Run only the smoke test (fast, no LLM)
python testing/run_eval.py --case smoke_fastpath_001

# Via pytest
uv run pytest testing/ -m eval
```

## Modes (planned)

- **default** — uses cached LLM recordings from `recordings/`. Free + deterministic.
- **`--live`** — calls the real LLM; updates `recordings/`. Manual, costs money.
- **`--baseline`** — fails if score regressed vs. `data/eval_runs/baseline.json`.
