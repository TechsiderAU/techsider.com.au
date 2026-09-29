# Documents

One Markdown file per long-prose page. Phase C writes the three entries; until the first one exists the `documents` collection is empty and the build logs nothing.

- **File name = entry id:** `privacy.md` (`/legal/privacy/`), `website-terms.md` (`/legal/website-terms/`) and `evaluation-method.md` (`/resources/evaluation-method/`). The page's name and path live in `src/data/nav.ts` only.
- **Frontmatter:** `documentSchema` in `src/content/page-schemas.ts`: `title`, `summary` (at least 20 characters), `lastUpdated`, an optional `effective` date, and `draft` (default `false`). Unknown keys fail the build.
- **Body:** plain Markdown. Headings start at `##`: the page template supplies the one `<h1>` from `title`.
- Only `*.md` files are loaded, and never this README (`optionalGlob` leaves every `README.md` out).
