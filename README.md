# RentSafe Lagos

**Know before you sign.** Nigeria's first rental transparency and intelligence
platform — a Glassdoor-meets-Google-Maps for the Lagos rental market. Tenant
reviews, rent history, flood risk, commute intelligence and agent reputation,
built as a mobile-first PWA for real Lagos conditions.

RentSafe does **not** list properties, process payments, or connect landlords
to tenants. It is a pure information layer for the 15M+ tenants of Lagos.

**This repository is the React PWA.** The FastAPI backend lives in
[rentsafe-backend](https://github.com/ZILLABB/rentsafe-backend).

## Run it locally

```bash
npm install
npm run dev
```

Vite proxies `/api` to `http://localhost:8000`, so start the backend first —
see [rentsafe-backend](https://github.com/ZILLABB/rentsafe-backend) for its setup (it needs no configuration).

## Stack

React 18 · TypeScript · Vite · Tailwind · Framer Motion · TanStack Query ·
MapLibre GL · vite-plugin-pwa (Workbox)

## Tests

```bash
npm test          # Vitest
npm run lint
npx tsc -b --noEmit
npm run build
```

## Notes that matter

- **Three languages.** English, Nigerian Pidgin and Yorùbá. UI strings only —
  reviews stay in the language they were written in.
- **Data cost is a feature.** MapLibre is ~940KB and is lazy-loaded, so the
  landing page ships ~10KB of route code rather than a megabyte. Nigerian
  mobile data is metered; a heavy first paint is money.
- **Nothing invented.** An unrated property renders a grey "–", not a red 0.0.
  A property with no reported rent shows no price rather than ₦0. An
  approximate map pin is drawn dashed and labelled as the area, not the
  building.
- **Layout widths are deliberate.** Pages that are read (terms, privacy) and
  forms (the review wizard) keep a ~768px measure. Everything else uses the
  viewport.

## Design

The original design document is in `design/`.
