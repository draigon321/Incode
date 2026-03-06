from app.analysis import run_lint
from app.models import Project
from app.patching import apply_patch
from app.store import ProjectStore


def test_l001_multi_writer_same_routine() -> None:
    store = ProjectStore()
    project = Project(id='p1', name='demo', tags=[], routines=[])
    store.set(project)

    patch = {
        'version': 'ladder-patch/v0',
        'reason': 'test',
        'ops': [
            {'op': 'addTag', 'tag': {'id': 't1', 'name': 'MotorRun', 'dataType': 'BOOL'}},
            {'op': 'addTag', 'tag': {'id': 't2', 'name': 'StartPB', 'dataType': 'BOOL'}},
            {'op': 'addTag', 'tag': {'id': 't3', 'name': 'StopPB', 'dataType': 'BOOL'}},
            {'op': 'addRoutine', 'routine': {'id': 'r-main', 'name': 'Main', 'rungs': []}},
            {
                'op': 'addRung',
                'routineId': 'r-main',
                'rung': {
                    'id': 'r1',
                    'number': 1,
                    'comment': 'writer 1',
                    'network': {
                        'type': 'series',
                        'nodes': [{'type': 'contact', 'op': 'XIC', 'tag': 'StartPB'}],
                    },
                    'actions': [{'type': 'coil', 'op': 'OTE', 'tag': 'MotorRun'}],
                },
            },
            {
                'op': 'addRung',
                'routineId': 'r-main',
                'rung': {
                    'id': 'r2',
                    'number': 2,
                    'comment': 'writer 2',
                    'network': {
                        'type': 'series',
                        'nodes': [{'type': 'contact', 'op': 'XIO', 'tag': 'StopPB'}],
                    },
                    'actions': [{'type': 'coil', 'op': 'OTE', 'tag': 'MotorRun'}],
                },
            },
        ],
    }

    from app.models import Patch

    updated = apply_patch(project, Patch.model_validate(patch))
    lint = run_lint(updated)

    assert any(f.id == 'L001' and f.tag == 'MotorRun' for f in lint['findings'])
