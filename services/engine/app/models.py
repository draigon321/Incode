from __future__ import annotations

from typing import Annotated, Any, Literal

from pydantic import BaseModel, Field


class TagOperand(BaseModel):
    kind: Literal['tag']
    tag: str


class ConstOperand(BaseModel):
    kind: Literal['const']
    value: str | int | float | bool


Operand = Annotated[TagOperand | ConstOperand, Field(discriminator='kind')]


class ContactNode(BaseModel):
    type: Literal['contact']
    op: Literal['XIC', 'XIO']
    tag: str


class CompareNode(BaseModel):
    type: Literal['compare']
    op: Literal['EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ']
    a: Operand
    b: Operand


class ConstNode(BaseModel):
    type: Literal['const']
    value: str | int | float | bool


class SeriesNode(BaseModel):
    type: Literal['series']
    nodes: list[NetworkNode]


class ParallelNode(BaseModel):
    type: Literal['parallel']
    branches: list[NetworkNode]


NetworkNode = Annotated[
    ContactNode | CompareNode | ConstNode | SeriesNode | ParallelNode,
    Field(discriminator='type'),
]


class CoilAction(BaseModel):
    type: Literal['coil']
    op: Literal['OTE', 'OTL', 'OTU']
    tag: str


class TimerAction(BaseModel):
    type: Literal['timer']
    op: Literal['TON']
    tag: str
    ptMs: int


class CounterAction(BaseModel):
    type: Literal['counter']
    op: Literal['CTU', 'CTD']
    tag: str
    preset: int


class MovAction(BaseModel):
    type: Literal['mov']
    source: Operand
    dest: str


class MathAction(BaseModel):
    type: Literal['math']
    op: Literal['ADD', 'SUB', 'MUL', 'DIV']
    a: Operand
    b: Operand
    dest: str


class LimitAction(BaseModel):
    type: Literal['limit']
    source: Operand
    low: Operand
    high: Operand
    dest: str


class OneShotAction(BaseModel):
    type: Literal['oneshot']
    op: Literal['ONS', 'OSR']
    tag: str


Action = Annotated[
    CoilAction | TimerAction | CounterAction | MovAction | MathAction | LimitAction | OneShotAction,
    Field(discriminator='type'),
]


class Tag(BaseModel):
    id: str
    name: str
    dataType: Literal['BOOL', 'DINT', 'REAL', 'TIMER', 'COUNTER', 'STRING']


class Rung(BaseModel):
    id: str
    number: int
    comment: str | None = None
    network: NetworkNode
    actions: list[Action]


class Routine(BaseModel):
    id: str
    name: str
    rungs: list[Rung]


class Project(BaseModel):
    version: Literal['ladder-ir/v0'] = 'ladder-ir/v0'
    id: str
    name: str
    tags: list[Tag] = Field(default_factory=list)
    routines: list[Routine] = Field(default_factory=list)


class AddTagOp(BaseModel):
    op: Literal['addTag']
    tag: Tag


class RenameTagOp(BaseModel):
    op: Literal['renameTag']
    tagId: str
    newName: str


class AddRoutineOp(BaseModel):
    op: Literal['addRoutine']
    routine: Routine


class AddRungOp(BaseModel):
    op: Literal['addRung']
    routineId: str
    rung: Rung


class DeleteRungOp(BaseModel):
    op: Literal['deleteRung']
    routineId: str
    rungId: str


class ReplaceRungOp(BaseModel):
    op: Literal['replaceRung']
    routineId: str
    rungId: str
    rung: Rung


class UpdateRungCommentOp(BaseModel):
    op: Literal['updateRungComment']
    routineId: str
    rungId: str
    comment: str


class EditNodeOp(BaseModel):
    op: Literal['editNode']
    routineId: str
    rungId: str
    path: str
    value: Any


PatchOp = Annotated[
    AddTagOp
    | RenameTagOp
    | AddRoutineOp
    | AddRungOp
    | DeleteRungOp
    | ReplaceRungOp
    | UpdateRungCommentOp
    | EditNodeOp,
    Field(discriminator='op'),
]


class Patch(BaseModel):
    version: Literal['ladder-patch/v0']
    ops: list[PatchOp]
    reason: str | None = None


class PatchRequest(BaseModel):
    patch: Patch


class Location(BaseModel):
    routineId: str
    rungId: str
    detail: str


class Finding(BaseModel):
    id: str
    severity: Literal['error', 'warning', 'info']
    message: str
    tag: str | None = None
    locations: list[Location] = Field(default_factory=list)


SeriesNode.model_rebuild()
ParallelNode.model_rebuild()
