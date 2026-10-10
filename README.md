# ONROL — The Path

A 3D scroll journey for ONROL (AI Execution School): Intro → Learn → Build → Launch → Earn → Apply.

## Develop
```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # production build in dist/
npm run preview    # serve dist/ locally
```

## Deploy
Pushing to `main` builds and deploys to GitHub Pages via `.github/workflows/deploy.yml`
(enable it once: repo Settings → Pages → Source: **GitHub Actions**).

Set the public URL in `.env` (`VITE_SITE_URL`) — it is used for the canonical link and the share image.
Update `public/robots.txt` and `public/sitemap.xml` if the domain changes.

## Useful URL options
- `#learn`, `#build`, `#launch`, `#earn`, `#apply` — open at a step
- `?q=low|mid|high` — force a quality level (default: picked from the device)
- `?og` — clean frame used to capture `public/og.png`

## Analytics
Events are pushed to `window.dataLayer` (GTM/GA) and dispatched as `onrol:*` DOM events:
`ready`, `step_view`, `apply_click`, `autopilot`, `joystick`, `view`, `theme`, `quality_down`, `webgl_lost`.
