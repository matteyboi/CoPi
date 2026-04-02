# CoPi – AI Flight Syllabus

Frontend is now served with Vite, and backend API is an Express server.

## Scripts

- `npm run server` — start backend API on port `8787`
- `npm start` — start Vite frontend on port `3000`
- `npm run dev` — run backend + frontend together
- `npm run build` — create production frontend build in `dist/`
- `npm run preview` — preview production build locally
- `npm test` — run Vitest test suite

## Local Development

1. Install dependencies:
	- `npm install`
2. Start full stack dev mode:
	- `npm run dev`
3. Open:
	- `http://localhost:3000`

## API Proxy

Vite dev server proxies `/api/*` to:

- `http://localhost:8787`

This keeps frontend API calls unchanged.

## Notes

- Current migration keeps app behavior and backend routes intact.
- CRA tooling has been removed from runtime/build/test paths.
