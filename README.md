# Incode AI Ladder IDE Scaffold

Desktop-first deterministic ladder logic IDE scaffold with an AI copiloting layer on top.

## Safety Boundaries
- No direct PLC communication.
- Engine is local-only (HTTP + WebSocket over localhost).
- Future import/export only (L5X and IR JSON).

## Repo Layout
- `apps/desktop`: Electron main + preload
- `apps/ui`: React + Vite renderer
- `services/engine`: FastAPI backend
- `packages/shared`: shared TS contracts (IR + patch)
- `samples`: sample ladder project JSON

## Windows 11 Dev Setup
1. Install Node.js 20+ and pnpm.
2. Install Python 3.11+.
3. Create engine venv:
   - `cd services/engine`
   - `py -3.11 -m venv .venv`
   - `.venv\\Scripts\\pip install -r requirements.txt`
4. Install JS deps at repo root:
   - `pnpm install`
   - If prompted about ignored build scripts, run `pnpm approve-builds` and approve `electron`, `electron-winstaller`, and `esbuild`.
5. Run dev stack:
   - `pnpm dev`

## Useful Commands
- `pnpm dev` (UI + Electron, Electron launches engine on dynamic port)
- `pnpm dev:engine` (standalone engine at `127.0.0.1:8000`)
- `pnpm build:ui`
- `pnpm build:desktop`
- `pnpm build:all`
- `pnpm dist` (electron-builder unpacked artifact; Codespaces-friendly)
- `pnpm --filter @incode/desktop dist:win` (Windows NSIS installer target)
- `pnpm typecheck`

## Engine Lifecycle
- Electron main picks a free localhost port.
- Electron spawns `uvicorn` via the project venv python.
- Electron waits for `GET /health` to return OK before loading renderer.
- On app exit, Electron terminates the engine subprocess.

## Safe Port Passing
- Electron stores selected engine port in main process.
- Preload exposes `window.engine.getEnginePort()` via `contextBridge`.
- Renderer never gets Node APIs directly.

## Python Quality Tools
- Ruff configured in `services/engine/pyproject.toml`.
- Run: `cd services/engine && .venv/Scripts/python -m ruff check .`

## Known TODOs
- Bundle Python engine with PyInstaller for production installers.
- Add IR import/export pipeline (L5X + JSON).
- Expand lint set and simulation runtime.
- Harden auth/session model if moving beyond local internal tool.
