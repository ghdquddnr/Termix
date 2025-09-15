# Repository Guidelines

## Project Structure & Module Organization
- App code lives in `src/`.
  - Backend: `src/backend/` (`starter.ts`, `database/`, `routes/`, `ssh/`, `utils/`, `types/`, `tests/`).
  - Frontend: `src/components/`, `src/ui/`, `src/lib/`, `src/styles/`.
- Entry HTML: `index.html` (Vite).
- Build outputs: `dist/` (do not edit by hand).
- Local data: `db/data/db.sqlite` (SQLite for dev).

## Build, Test, and Development Commands
- `npm run dev` or `npm run start` — run Vite dev server.
- `npm run dev:backend` — compile TS and start backend (`dist/backend/starter.js`).
- `npm run dev:frontend` — run Vite dev server only.
- `npm run build` — build frontend (Vite).
- `npm run build:backend` — compile backend TypeScript (tsconfig.node.json).
- `npm run preview` — serve built frontend from `dist/`.
- `npm run lint` — ESLint across the repo.

Examples:
- Run a backend test file: `npx ts-node src/backend/tests/process-monitoring.test.ts`
- Run a CJS test: `node src/backend/tests/websocket-test.cjs`
- Theme scripts: `node test-theme-system.js`

## Coding Style & Naming Conventions
- TypeScript everywhere; prefer explicit types. Avoid `any`.
- Indentation: 2 spaces; single quotes; semicolons allowed by ESLint.
- React components/files: `PascalCase` (e.g., `ProcessMonitor.tsx`).
- Utilities/types/files: `kebab-case` (e.g., `theme-utils.ts`, `process-monitoring.ts`).
- Tests: `*.test.ts` or `*.test.tsx`, colocated in `__tests__/` or `tests/` folders.
- Run `npm run lint` before pushing; fix warnings when reasonable.

## Testing Guidelines
- Backend tests under `src/backend/tests/` can be executed with `ts-node` (see example above).
- Frontend/lib tests reside in `src/components/__tests__/` and `src/lib/__tests__/`. If adding tests, mirror nearby patterns and keep them runnable via `ts-node` or simple `node` where applicable until a unified runner is introduced.
- Strive for focused, deterministic unit tests; add integration tests around SSH and DB boundaries where feasible.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `docs:`, `refactor:`, `chore:`, `test:`.
- Scope changes narrowly; separate formatting-only commits when possible.
- PRs must include: clear description, linked issue (if any), before/after screenshots for UI, and notes on testing steps.

## Security & Configuration Tips
- Configure via `.env` (e.g., `PORT=8080`). Never commit secrets.
- Do not hand-edit `dist/` or commit local DBs; prefer migration scripts or seeders.
