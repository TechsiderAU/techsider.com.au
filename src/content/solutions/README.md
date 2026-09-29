# Solutions

One YAML file per solution page. Phase C writes the five entries; until the first one exists the `solutions` collection is empty and the build logs nothing.

- **File name = entry id = nav slug.** `document-registers.yaml` holds the content for `/solutions/document-registers/`. The page's name, path and one-liner live in `src/data/nav.ts` only, so they are not repeated here.
- **Schema:** `makeSolutionSchema` in `src/content/schemas.ts`. Every package carries `status: launch | on-request | internal`, and every launch package (the generic one included) lists its `buyers` (`mid-market`, `enterprise-government`); `matrix` cells are keyed by industry id and stay within 60 characters; `forLine` is the Home row's "For:" line (10–90 characters).
- **Per-solution switches:** `packagesHeading` is `Packages` (the default) or `Engagements` (④); `independencePolicy: true` renders the independence policy (④).
- **References by id:** `byIndustry` lists industry ids (`src/content/industries/`); `demo` names a demo id (`src/data/demos/`).
- Offer copy in this folder is scanned for pricing language and currency figures (CI check 11).
- Only `*.yaml` files are loaded; this README is ignored.
