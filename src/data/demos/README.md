# Demo data

One JSON file per canned demo, named by the demo's nav slug (`document-registers.json` for `/demos/document-registers/`) and validated by `makeDemoSchema` in `src/content/schemas.ts`.

- `solution` is a solution id; `kind` picks the renderer (`register`, `assistant`, `inbox`, `report` or `checker`); `data` is the scenario the renderer plays.
- `provenance` is required. `illustrative` data renders a visible label; `measured` data also needs `run`, the path of a committed harness run (`src/data/runs/<run-id>/`).
- Metrics are typed values (`{ "value": …, "unit": "…" }`), never written into free text; CI check 6 flags metric-shaped numbers in strings.
- Only `*.json` files are loaded; this README is ignored.
