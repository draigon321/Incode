from __future__ import annotations

import asyncio
import uuid
from datetime import UTC, datetime

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .analysis import build_xref, run_lint
from .models import PatchRequest, Project
from .patching import apply_patch
from .store import ProjectStore

app = FastAPI(title='Incode Ladder Engine', version='0.1.0')
store = ProjectStore()


class WSManager:
    def __init__(self) -> None:
        self.connections: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.connections.add(websocket)

    def disconnect(self, websocket: WebSocket) -> None:
        self.connections.discard(websocket)

    async def broadcast(self, message: dict) -> None:
        stale: list[WebSocket] = []
        for connection in self.connections:
            try:
                await connection.send_json(message)
            except Exception:
                stale.append(connection)
        for connection in stale:
            self.disconnect(connection)


ws_manager = WSManager()


@app.on_event('startup')
async def startup_event() -> None:
    asyncio.create_task(heartbeat_task())


async def heartbeat_task() -> None:
    while True:
        await ws_manager.broadcast(
            {
                'type': 'heartbeat',
                'tsUtc': datetime.now(UTC).isoformat(),
            }
        )
        await asyncio.sleep(2)


@app.exception_handler(ValidationError)
async def validation_exception_handler(_, exc: ValidationError):
    return JSONResponse(
        status_code=422,
        content={
            'ok': False,
            'error': 'validation_error',
            'errors': exc.errors(),
        },
    )


@app.get('/health')
async def health() -> dict[str, str]:
    return {'status': 'ok', 'version': '0.1.0'}


@app.get('/')
async def root() -> dict:
    return {
        'service': 'Incode Ladder Engine',
        'status': 'ok',
        'version': '0.1.0',
        'routes': {
            'health': '/health',
            'eventsWs': '/ws/events',
            'projectNew': '/project/new',
            'projectGet': '/project/{project_id}',
            'patchValidate': '/project/{project_id}/patch/validate',
            'patchApply': '/project/{project_id}/patch/apply',
            'xrefBuild': '/project/{project_id}/xref/build',
            'lintRun': '/project/{project_id}/lint/run',
        },
    }


@app.websocket('/ws/events')
async def ws_events(websocket: WebSocket) -> None:
    await ws_manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)


@app.post('/project/new')
async def project_new() -> dict:
    project_id = str(uuid.uuid4())
    project = Project(id=project_id, name='Untitled Project', tags=[], routines=[])
    store.set(project)
    return {'projectId': project_id, 'project': project.model_dump(mode='json')}


@app.get('/project/{project_id}')
async def project_get(project_id: str) -> dict:
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail='project_not_found')
    return {'project': project.model_dump(mode='json')}


@app.post('/project/{project_id}/patch/validate')
async def patch_validate(project_id: str, body: PatchRequest) -> dict:
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail='project_not_found')

    try:
        apply_patch(project, body.patch)
        return {'ok': True}
    except (ValidationError, ValueError) as exc:
        return {'ok': False, 'errors': [{'message': str(exc)}]}


@app.post('/project/{project_id}/patch/apply')
async def patch_apply(project_id: str, body: PatchRequest) -> dict:
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail='project_not_found')

    try:
        updated = apply_patch(project, body.patch)
    except (ValidationError, ValueError) as exc:
        return {'ok': False, 'errors': [{'message': str(exc)}]}

    store.update(project_id, updated)

    xref = build_xref(updated)
    lint = run_lint(updated)

    await ws_manager.broadcast({'type': 'project.changed', 'payload': {'projectId': project_id}})
    await ws_manager.broadcast({'type': 'xref.updated', 'payload': xref})
    await ws_manager.broadcast(
        {
            'type': 'lint.updated',
            'payload': {
                'projectId': project_id,
                'findings': [f.model_dump(mode='json') for f in lint['findings']],
            },
        }
    )

    return {'project': updated.model_dump(mode='json')}


@app.post('/project/{project_id}/xref/build')
async def xref_build(project_id: str) -> dict:
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail='project_not_found')
    return build_xref(project)


@app.post('/project/{project_id}/lint/run')
async def lint_run(project_id: str) -> dict:
    project = store.get(project_id)
    if project is None:
        raise HTTPException(status_code=404, detail='project_not_found')
    lint = run_lint(project)
    return {'findings': [f.model_dump(mode='json') for f in lint['findings']]}
