# Demo data

One JSON file per canned demo, named by the demo's nav slug (`document-registers.json` for `/demos/document-registers/`) and validated by `makeDemoSchema` in `src/content/schemas.ts`.

- `solution` is a solution id. `kind` picks the renderer and the schema of `data`:
  - `register` (`registerData`): synthetic documents and at least two registers whose cells each name the page they were read from, plus the download path;
  - `assistant` (`assistantData`): scenarios over a public corpus, each with its licence and exact attribution string, the passages it cites (verbatim) and its turns; across the scenarios at least one turn is `refused` and one is `false-answer-caught`, and every citation resolves to a passage of its own scenario;
  - `inbox` (`inboxData`): eight synthetic messages, exactly one escalated, and the trace log;
  - `report` (`sampleReport`): the ④ sample report;
  - `checker` (`checkerData`): `{ "source": "platform-ai" }`; the vendor facts live in `src/data/platform-ai.json`.
- `provenance` is required. `illustrative` data renders a visible label; `measured` data also needs `run`, the path of a committed harness run (`src/data/runs/<run-id>/`). The `checker` kind alone declares `sourced`: its facts are real, dated vendor statements, so its frame carries no "Illustrative data" label.
- Metrics are typed values (`{ "value": …, "unit": "…" }`), never written into free text; CI check 6 flags metric-shaped numbers in strings.
- Synthetic data stays visibly synthetic: invented names, "Synthetic" in every document title, and no real address, ABN, phone number, or email domain other than `example.com`.
- Only `*.json` files are loaded; this README is ignored.
- `document-registers.json` is built, not written by hand: edit the tables and forms in `scripts/demo-register-set.mjs` and run `node scripts/demo-register-set.mjs`, which also writes the demo's two downloads in `public/downloads/`. `tests/register-demo.test.mjs` fails while a committed file differs from what the script builds. The repair limits and management fees it quotes have their own entries in `src/data/banned-phrase-exceptions.json` and `src/data/metric-exceptions.json`.
