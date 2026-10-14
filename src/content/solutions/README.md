# Solutions

One YAML file per solution page. Phase C writes the five entries; until the first one exists the `solutions` collection is empty and the build logs nothing.

- **File name = entry id = nav slug.** `document-registers.yaml` holds the content for `/solutions/document-registers/`. The page's name, path and one-liner live in `src/data/nav.ts` only, so they are not repeated here.
- **Schema:** `makeSolutionSchema` in `src/content/schemas.ts`. Every package carries `status: launch | on-request | internal`, and every launch package (the generic one included) lists its `buyers` (`mid-market`, `enterprise-government`); `matrix` cells are keyed by industry id and stay within 60 characters; `forLine` is the Home row's "For:" line (10–90 characters).
- **Per-solution switches:** `packagesHeading` is `Packages` (the default) or `Engagements` (④); `independencePolicy: true` renders the independence policy (④).
- **References by id:** `byIndustry` lists industry ids (`src/content/industries/`); `demo` names a demo id (`src/data/demos/`).
- **Region notes (go-global §4.2):** every launch package's `onshoreNote` renders as its region note. A note that names a region says where the package runs: in the client's own Microsoft or AWS account, in the cloud region they choose, or in an Australian region if Techsider manages it. It then says the team reaches the system remotely from Sydney, under the data-transfer terms in the client's contract, and `tests/solutions-content.test.mjs` requires "remotely from Sydney" in every such note. Inside a platform the client already licenses, the note says the vendor sets where model calls are processed.
- **`onshore: true`** means every step runs in the region the client chooses, and the region note says which of the two options applies. Only such a package shows the badge "Your data stays in your region.", linked to its region note (CI check 10).
- **Australia-only packages**, launch or on-request, carry `region: au` and render with an "Australia" label. A `matrix` cell that names one says "(Australia)" inline, within its 60 characters.
- Offer copy in this folder is scanned for pricing language and currency figures (CI check 11).
- Only `*.yaml` files are loaded; this README is ignored.
