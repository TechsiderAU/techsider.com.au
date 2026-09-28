# Regulatory rows

One JSON file per industry, named by its industry id (`financial-services.json`), shaped `{ "rows": [ … ] }` and validated by `regulatoryFile` in `src/content/schemas.ts`.

- Every row has `id`, `obligation`, `meaning`, `design`, `evidence`, `source` (a URL), `asAt` and `lastReviewed`.
- `jurisdictions` (`cth`, `nsw`, `vic`, `qld`, `local`) is optional, except in `government.json`, where every row needs it (CI check 8).
- Rows hold only obligations that bear on an AI system, never procurement rules. `evidence` names a deliverable artefact; it never claims the artefact meets the obligation.
- An industry's obligation chips point at rows here by `id`.
- Only `*.json` files are loaded; this README is ignored.
