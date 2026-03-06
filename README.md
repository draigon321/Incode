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
3. Clone repo and install JS deps at repo root:
   - `pnpm install`
   - If prompted about ignored build scripts, run `pnpm approve-builds` and approve `electron`, `electron-winstaller`, and `esbuild`.
4. Create engine venv:
   - `cd services/engine`
   - `py -3.11 -m venv .venv`
   - `.venv\\Scripts\\pip install -r requirements.txt`
5. Return to repo root and run dev stack:
   - `cd ../..`
   - `pnpm dev`

## Codespaces / Linux Setup
1. Install JS deps:
   - `pnpm install`
2. Create engine venv:
   - `cd services/engine`
   - `python3 -m venv .venv`
   - `. .venv/bin/activate`
   - `pip install -r requirements.txt`
3. Return to repo root and run:
   - `cd ../..`
   - `pnpm dev`

## Fresh Machine Checklist (VS Code Desktop or New Codespace)
Run these each time you set up on a new machine:
- `pnpm install`
- `cd services/engine && python3 -m venv .venv` (or `py -3.11 -m venv .venv` on Windows)
- Install engine deps:
  - Windows: `services/engine/.venv/Scripts/pip install -r services/engine/requirements.txt`
  - Linux: `. services/engine/.venv/bin/activate && pip install -r services/engine/requirements.txt`
- `pnpm typecheck`
- `pnpm dev`

## Daily pnpm Commands
- `pnpm dev` (auto mode: in Codespaces runs web mode; on desktop runs Electron mode)
- `pnpm dev:web` (engine + UI only, browser-based; best for Codespaces)
- `pnpm dev:desktop-stack` (UI + Electron; Electron launches engine on a dynamic localhost port)
- `pnpm dev:ui` (run Vite UI only)
- `pnpm dev:desktop` (run Electron only; expects UI dev server)
- `pnpm dev:engine` (run FastAPI engine on `127.0.0.1:8000`)
- `pnpm build:all`
- `pnpm typecheck`
- `pnpm dist` (unpacked artifact for current platform)
- `pnpm --filter @incode/desktop dist:win` (Windows NSIS target, run on Windows host)

## Codespaces Note
- Electron desktop windows do not render in browser-only Codespaces sessions.
- Use `pnpm dev` (auto-detect) or `pnpm dev:web`.
- Open forwarded port `5173` for UI.
- Engine stays on port `8000` in web mode.
- UI includes an `Exit` button:
  - Electron mode: quits app and backend.
  - Web mode (Codespaces): shuts down backend (`/admin/shutdown`); terminal process will exit.

## Troubleshooting
- If you see `Error forwarding port` in browser preview:
  - Stop dev servers and run `pnpm dev` again.
  - In Codespaces `Ports` tab, confirm port `5173` is running and open.
  - Use `pnpm dev:web` explicitly if you do not need Electron.
- If Electron fails in Codespaces, this is expected (no desktop GUI). Use web mode.

## Previous Windows 11 Setup (Detailed)
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
