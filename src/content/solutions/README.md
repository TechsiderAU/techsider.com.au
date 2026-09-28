# Solutions

One YAML file per solution page. Phase C writes the five entries; until the first one exists the `solutions` collection is empty and the build logs nothing.

- **File name = entry id = nav slug.** `document-registers.yaml` holds the content for `/solutions/document-registers/`. The page's name, path and one-liner live in `src/data/nav.ts` only, so they are not repeated here.
- **Schema:** `makeSolutionSchema` in `src/content/schemas.ts`. Every package carries `status: launch | on-request | internal`; `matrix` cells are keyed by industry id and stay within 60 characters.
- **References by id:** `byIndustry` lists industry ids (`src/content/industries/`); `demo` names a demo id (`src/data/demos/`).
- Offer copy in this folder is scanned for pricing language and currency figures (CI check 11).
- Only `*.yaml` files are loaded; this README is ignored.
