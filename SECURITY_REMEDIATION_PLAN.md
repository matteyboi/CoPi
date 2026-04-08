# Security Remediation Plan

Updated: 2026-04-01 (post Vite phase 1/2 scaffold)

## Current Verified State

- `npm test` passes.
- `npm run build` passes.
- `npm audit --audit-level=high --omit=dev` reports **26 vulnerabilities** (9 low, 3 moderate, 14 high).
- Remaining high-risk items are largely transitive through `react-scripts` / CRA-era tooling (`nth-check`, `serialize-javascript`, `webpack-dev-server`, etc.).

## Migration Progress

- Frontend dev/build path is now running on **Vite**.
- Backend remains unchanged (`server/index.js`, port `8787`).
- Test tooling is now running on **Vitest** (`npm test`).
- `react-scripts` has been removed from scripts/dependencies.

## Immediate Action: Rotate OpenAI Key

### Why
The API key has been present in local `.env` and appeared in terminal output previously. Treat it as compromised and rotate now.

### Rotation Checklist

1. In OpenAI dashboard:
   - Revoke the old key.
   - Create a new key.
2. Update local secrets:
   - Replace `OPENAI_API_KEY` value in `.enre
3. Validate runtime:
   - Restart backend/frontend dev processes.
   - Verify `GET /api/health` returns `aiConfigured: true`.
4. Clean local exposure:
   - Clear terminal scrollback/history entries containing the old key.
5. Prevent future leakage:
   - Never print keys in logs.
   - Keep `.env` ignored by git.

## Remediation Paths

## Path A — Stability-First (recommended short term)

Use this path if you want to keep current app behavior stable while reducing operational risk.

- Keep current dependency set (no `--force` audit changes).
- Rotate compromised key immediately.
- Add scheduled dependency audit checks (e.g., weekly).
- Track unresolved advisories as accepted technical risk until migration.

### Exit Criteria

- No active secret exposure.
- Build/tests remain green.
- Vulnerability count monitored with trendline (no silent regression).

## Path B — Full Remediation (requires migration)

Use this path to eliminate CRA/transitive blockers and significantly reduce vulnerability surface.

### Phase 1: Baseline and parity

- Create branch for migration.
- Snapshot current behavior:
  - Build output
  - Core flows (student selection, chat, modals, reset/rename actions)
  - API integration to backend

### Phase 2: Move frontend off CRA

Preferred target: **Vite + React**.

- Scaffold Vite React app in-place or migrate `src/` with minimal refactor.
- Port environment variable usage to Vite conventions.
- Recreate build, dev server, and static asset handling.
- Keep backend (`server/index.js`) unchanged initially.

### Phase 3: Replace CRA-specific tooling chain

- Remove `react-scripts` and associated transitive dependency graph.
- Reinstall only required modern equivalents.
- Re-run `npm audit --audit-level=high --omit=dev`.

### Phase 4: Harden and validate

- Re-run tests/build.
- Validate Safari layout and modal interactions.
- Verify `/api/health`, `/api/chat`, and `/api/chat/stream` behavior.

### Exit Criteria

- No high-severity production vulnerabilities (or documented exceptions).
- Build/test parity with pre-migration baseline.
- Runtime functionality unchanged from user perspective.

## Recommended Sequence

1. Rotate API key now.
2. Keep stability path for immediate operations.
3. Schedule migration path as the durable fix for unresolved CRA-driven advisories.

## Commands for Current Baseline Checks

```bash
CI=true npm test --watchAll=false
npm run build
npm audit --audit-level=high --omit=dev
```
