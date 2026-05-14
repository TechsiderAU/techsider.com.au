# techsider.com.au

Marketing landing page for Techsider — enterprise AI services for Australian business.

## Stack

- [Astro 5](https://astro.build/) (static output, no framework hydration)
- [Tailwind CSS v4](https://tailwindcss.com/) via `@tailwindcss/vite`
- [Three.js](https://threejs.org/) — interactive WebGL hero animation (`HeroScene.astro`), loaded as a deferred client script
- Fonts: EB Garamond (serif headlines), Inter Variable (body) — both self-hosted via fontsource
- Hosted on GitHub Pages at https://techsider.com.au

## Development

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # outputs to dist/
npm run preview  # serves dist/ locally
```

## Deploy

Push to `main`. The workflow in `.github/workflows/deploy.yml` builds and publishes to GitHub Pages automatically.

The custom domain is configured via `public/CNAME`. After enabling GitHub Pages (Settings → Pages → Source: GitHub Actions), point DNS at your registrar:

- Apex `techsider.com.au` → ALIAS/ANAME `techsiderau.github.io`, or A records to `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`
- Optional `www.techsider.com.au` → CNAME `techsiderau.github.io`

Then enable "Enforce HTTPS" once the cert provisions.

## Structure

```
src/
  layouts/BaseLayout.astro    # html/head/meta + Footer
  components/                 # Nav, Hero, Services, WhyUs, Approach, Contact, Footer
  pages/index.astro           # composes all sections
  styles/global.css           # tailwind import + @theme tokens + fonts
public/
  CNAME                       # techsider.com.au
  favicon.svg
  robots.txt
```

## Known follow-ups (post v1)

- Add `public/og.png` (1200×630) and the `<meta property="og:image">` tag in `BaseLayout.astro`.
- Replace placeholder LinkedIn/GitHub URLs in `Footer.astro` with the real accounts.
- Add `/insights` blog using Astro content collections when there's content to publish.
- `npm audit` reports a moderate XSS advisory against Astro 5 (`define:vars`). The vulnerable code path isn't reachable from this static site (no `define:vars` usage, no user input), so the warning is informational. Resolve by upgrading to Astro 6 once `@tailwindcss/vite` supports rolldown-vite.
