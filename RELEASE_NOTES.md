# Release Notes

## v2-migration-stable (2026-04-01)

Tag: `v2-migration-stable`  
Commit: `798d7f2`

### Summary
- Migrated frontend toolchain from CRA to Vite.
- Migrated tests to Vitest with jsdom.
- Stabilized app test behavior around async data hydration/loading state.
- Revalidated build, test, runtime health checks, and audit baseline.

### Highlights
- Added Vite entry/config (`index.html`, `vite.config.js`, `src/main.jsx`).
- Updated test setup to Vitest-compatible `@testing-library/jest-dom/vitest`.
- Updated app smoke test to properly await loading completion.
- Added security remediation tracking doc.

### Validation Snapshot
- `npm test` ✅
- `npm run build` ✅
- `npm audit` ✅ (0 vulnerabilities at time of check)
- Frontend health (`http://localhost:3000`) ✅
- Backend health (`/api/health`) ✅

### Notes
- iPhone preview workflow verified via browser device emulation.
- Remote published: `origin/main` and tag `v2-migration-stable`.
