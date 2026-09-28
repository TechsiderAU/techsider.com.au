# Industries

One YAML file per industry page. Phase C writes the nine entries; until the first one exists the `industries` collection is empty and the build logs nothing.

- **File name = entry id = nav slug.** `financial-services.yaml` holds the content for `/industries/financial-services/`. Name, path and one-liner live in `src/data/nav.ts` only.
- **Schema:** `makeIndustrySchema` in `src/content/schemas.ts`: exactly four workflow stages, at least three flagship use cases and three obligation chips, and five to seven FAQs.
- **References by id:** `leadSolutions` and every use case's `solution` are solution ids (`src/content/solutions/`); each obligation chip's `row` is a row id in `src/data/regulatory/<industry-id>.json`; `scenario.trace` is a trace id in `src/data/traces/`. CI check 1 fails on an id that doesn't resolve.
- Only `*.yaml` files are loaded; this README is ignored.
