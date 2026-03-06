from __future__ import annotations

from collections import defaultdict

from .models import (
    Action,
    CoilAction,
    CompareNode,
    ContactNode,
    Finding,
    Location,
    NetworkNode,
    Operand,
    Project,
)


def _collect_operand_reads(operand: Operand) -> list[str]:
    if operand.kind == 'tag':
        return [operand.tag]
    return []


def _collect_reads(node: NetworkNode) -> list[str]:
    if isinstance(node, ContactNode):
        return [node.tag]
    if isinstance(node, CompareNode):
        return _collect_operand_reads(node.a) + _collect_operand_reads(node.b)
    if node.type == 'const':
        return []
    if node.type == 'series':
        tags: list[str] = []
        for child in node.nodes:
            tags.extend(_collect_reads(child))
        return tags
    tags = []
    for branch in node.branches:
        tags.extend(_collect_reads(branch))
    return tags


def _collect_action_reads(action: Action) -> list[str]:
    if action.type == 'mov':
        return _collect_operand_reads(action.source)
    if action.type == 'math':
        return _collect_operand_reads(action.a) + _collect_operand_reads(action.b)
    if action.type == 'limit':
        return (
            _collect_operand_reads(action.source)
            + _collect_operand_reads(action.low)
            + _collect_operand_reads(action.high)
        )
    return []


def _collect_action_writes(action: Action) -> list[tuple[str, str]]:
    if action.type == 'coil':
        return [(action.tag, action.op)]
    if action.type == 'timer':
        return [(action.tag, action.op)]
    if action.type == 'counter':
        return [(action.tag, action.op)]
    if action.type == 'mov':
        return [(action.dest, 'MOV')]
    if action.type == 'math':
        return [(action.dest, action.op)]
    if action.type == 'limit':
        return [(action.dest, 'LIM')]
    if action.type == 'oneshot':
        return [(action.tag, action.op)]
    return []


def build_xref(project: Project) -> dict[str, dict[str, list[dict[str, str]]]]:
    reads: dict[str, list[dict[str, str]]] = defaultdict(list)
    writes: dict[str, list[dict[str, str]]] = defaultdict(list)

    for routine in project.routines:
        for rung in routine.rungs:
            for tag in _collect_reads(rung.network):
                reads[tag].append(
                    {
                        'routineId': routine.id,
                        'rungId': rung.id,
                        'detail': 'network',
                    }
                )
            for action in rung.actions:
                for tag in _collect_action_reads(action):
                    reads[tag].append(
                        {
                            'routineId': routine.id,
                            'rungId': rung.id,
                            'detail': f'action:{action.type}',
                        }
                    )
                for tag, detail in _collect_action_writes(action):
                    writes[tag].append(
                        {
                            'routineId': routine.id,
                            'rungId': rung.id,
                            'detail': detail,
                        }
                    )

    return {'reads': dict(reads), 'writes': dict(writes)}


def run_lint(project: Project) -> dict[str, list[Finding]]:
    findings: list[Finding] = []
    tag_by_name = {tag.name: tag for tag in project.tags}

    for routine in project.routines:
        writers: dict[str, list[Location]] = defaultdict(list)
        for rung in routine.rungs:
            for action in rung.actions:
                if isinstance(action, CoilAction) and action.op == 'OTE':
                    writers[action.tag].append(
                        Location(
                            routineId=routine.id,
                            rungId=rung.id,
                            detail='OTE writer',
                        )
                    )

        for tag_name, locations in writers.items():
            if len(locations) < 2:
                continue
            tag_def = tag_by_name.get(tag_name)
            if tag_def is not None and tag_def.dataType != 'BOOL':
                continue
            findings.append(
                Finding(
                    id='L001',
                    severity='error',
                    message=(
                        f'Multiple OTE writers found for BOOL tag {tag_name} '
                        f'in routine {routine.name}'
                    ),
                    tag=tag_name,
                    locations=locations,
                )
            )

    return {'findings': findings}
