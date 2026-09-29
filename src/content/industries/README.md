# Industries

One YAML file per industry page. Phase C writes the nine entries; until the first one exists the `industries` collection is empty and the build logs nothing.

- **File name = entry id = nav slug.** `financial-services.yaml` holds the content for `/industries/financial-services/`. Name, path and one-liner live in `src/data/nav.ts` only.
- **Schema:** `makeIndustrySchema` in `src/content/schemas.ts`: exactly four workflow stages, at least three flagship use cases, five to seven FAQs, and (spec §8.5 blocks 2 and 5) 4–6 obligation chips, 3–5 `worksAlongside` systems and 3–4 recommended `packages`.
- **Government (`jurisdictions`):** an industry that lists `jurisdictions` meets those counts in each sub-section it covers (Commonwealth: `cth`; State: `nsw`, `vic`, `qld`; Local: `local`), and every chip, system and package names its `jurisdiction`. Without `jurisdictions`, none may.
- **References by id:** `leadSolutions` and every use case's `solution` are solution ids (`src/content/solutions/`); each package names a solution id and one of that solution's package ids (its generic package or a launch or on-request package, never an internal one); each obligation chip's `row` is a row id in `src/data/regulatory/<industry-id>.json`, and a chip's `jurisdiction` is one that row lists; `scenario.trace` is a trace id in `src/data/traces/`. CI check 1 fails on an id that doesn't resolve.
- Only `*.yaml` files are loaded; this README is ignored.
