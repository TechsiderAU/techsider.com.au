# Regulatory rows

One JSON file per industry, named by its industry id (`financial-services.json`), shaped `{ "rows": [ … ] }` and validated by `regulatoryFile` in `src/content/schemas.ts`. The rows are Australian obligations, so an industry page renders them only inside its Australia band (`#australia`, which carries `data-region="au"`).

- Every row has `id`, `obligation`, `meaning`, `design`, `evidence`, `source` (a URL), `asAt` and `lastReviewed`.
- `jurisdictions` (`cth`, `nsw`, `vic`, `qld`, `local`) is optional, except in `government.json`, where every row needs it (CI check 8). On the Government page it places the row in the band's Commonwealth, State or Local section, and a row can sit in more than one.
- Rows hold only obligations that bear on an AI system, never procurement rules. `evidence` names a deliverable artefact; it never claims the artefact meets the obligation.
- An industry's obligation chips, the band's "Designed around" chips, point at rows here by `id`.
- CI check 13 fails a build in which a regulatory row (`[data-regulatory-row]`) or a jurisdiction section (`[data-jurisdiction-section]`) renders outside the band. International and cross-border rules, standards and guidance, and EU law that reaches outside the EU, are not rows: they are anchors in `src/data/anchors/`, which the page's "Rules that travel" block shows.
- Only `*.json` files are loaded; this README is ignored.
