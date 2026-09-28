# Safe-Use Kits

One YAML file per kit. Phase C writes them; until the first one exists the `kits` collection is empty and the build logs nothing.

- **Schema:** `makeKitSchema` in `src/content/schemas.ts`. `industry` is an industry id. `source`, `asAt` and `lawyerReviewedAt` are required; `lawyerReviewedAt` stays `null` until the lawyer review is done, and the launch gate (CI check 8) fails while any kit is still `null`.
- `download` is a site path: `/downloads/<name>.pdf` or `/downloads/<name>.docx`.
- Kit copy is scanned for pricing language and currency figures (CI check 11).
- Only `*.yaml` files are loaded; this README is ignored.
