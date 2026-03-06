from __future__ import annotations

from copy import deepcopy
from typing import Any

from .models import (
    AddRoutineOp,
    AddRungOp,
    AddTagOp,
    DeleteRungOp,
    EditNodeOp,
    Patch,
    Project,
    RenameTagOp,
    ReplaceRungOp,
    UpdateRungCommentOp,
)


def _find_routine(project: Project, routine_id: str):
    for routine in project.routines:
        if routine.id == routine_id:
            return routine
    return None


def _find_rung(routine, rung_id: str):
    for rung in routine.rungs:
        if rung.id == rung_id:
            return rung
    return None


def _set_path(target: Any, path: str, value: Any) -> None:
    parts = [part for part in path.strip('/').split('/') if part]
    if not parts:
        raise ValueError('Invalid path')
    current = target
    for part in parts[:-1]:
        if isinstance(current, list):
            current = current[int(part)]
        elif isinstance(current, dict):
            current = current[part]
        else:
            current = getattr(current, part)
    last = parts[-1]
    if isinstance(current, list):
        current[int(last)] = value
    elif isinstance(current, dict):
        current[last] = value
    else:
        setattr(current, last, value)


def apply_patch(project: Project, patch: Patch) -> Project:
    updated = deepcopy(project)

    for op in patch.ops:
        if isinstance(op, AddTagOp):
            updated.tags.append(op.tag)
            continue

        if isinstance(op, RenameTagOp):
            for tag in updated.tags:
                if tag.id == op.tagId:
                    tag.name = op.newName
                    break
            else:
                raise ValueError(f'Tag id not found: {op.tagId}')
            continue

        if isinstance(op, AddRoutineOp):
            updated.routines.append(op.routine)
            continue

        if isinstance(op, AddRungOp):
            routine = _find_routine(updated, op.routineId)
            if routine is None:
                raise ValueError(f'Routine not found: {op.routineId}')
            routine.rungs.append(op.rung)
            continue

        if isinstance(op, DeleteRungOp):
            routine = _find_routine(updated, op.routineId)
            if routine is None:
                raise ValueError(f'Routine not found: {op.routineId}')
            routine.rungs = [r for r in routine.rungs if r.id != op.rungId]
            continue

        if isinstance(op, ReplaceRungOp):
            routine = _find_routine(updated, op.routineId)
            if routine is None:
                raise ValueError(f'Routine not found: {op.routineId}')
            for idx, rung in enumerate(routine.rungs):
                if rung.id == op.rungId:
                    routine.rungs[idx] = op.rung
                    break
            else:
                raise ValueError(f'Rung not found: {op.rungId}')
            continue

        if isinstance(op, UpdateRungCommentOp):
            routine = _find_routine(updated, op.routineId)
            if routine is None:
                raise ValueError(f'Routine not found: {op.routineId}')
            rung = _find_rung(routine, op.rungId)
            if rung is None:
                raise ValueError(f'Rung not found: {op.rungId}')
            rung.comment = op.comment
            continue

        if isinstance(op, EditNodeOp):
            routine = _find_routine(updated, op.routineId)
            if routine is None:
                raise ValueError(f'Routine not found: {op.routineId}')
            rung = _find_rung(routine, op.rungId)
            if rung is None:
                raise ValueError(f'Rung not found: {op.rungId}')
            target = rung.model_dump(mode='python')
            _set_path(target, op.path, op.value)
            routine.rungs = [
                rung_item if rung_item.id != rung.id else rung.__class__.model_validate(target)
                for rung_item in routine.rungs
            ]

    return updated
