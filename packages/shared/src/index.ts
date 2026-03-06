import { z } from 'zod';

export const OperandSchema = z.union([
  z.object({ kind: z.literal('tag'), tag: z.string() }),
  z.object({ kind: z.literal('const'), value: z.union([z.string(), z.number(), z.boolean()]) }),
]);

export type Operand = z.infer<typeof OperandSchema>;

export const ContactNodeSchema = z.object({
  type: z.literal('contact'),
  op: z.enum(['XIC', 'XIO']),
  tag: z.string(),
});

export const CompareNodeSchema = z.object({
  type: z.literal('compare'),
  op: z.enum(['EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ']),
  a: OperandSchema,
  b: OperandSchema,
});

export const ConstNodeSchema = z.object({
  type: z.literal('const'),
  value: z.union([z.string(), z.number(), z.boolean()]),
});

export const SeriesNodeSchema: z.ZodType<SeriesNode> = z.lazy(() =>
  z.object({
    type: z.literal('series'),
    nodes: z.array(NetworkNodeSchema),
  }),
);

export const ParallelNodeSchema: z.ZodType<ParallelNode> = z.lazy(() =>
  z.object({
    type: z.literal('parallel'),
    branches: z.array(NetworkNodeSchema).min(2),
  }),
);

export const NetworkNodeSchema: z.ZodType<NetworkNode> = z.lazy(() =>
  z.union([
    ContactNodeSchema,
    CompareNodeSchema,
    ConstNodeSchema,
    SeriesNodeSchema,
    ParallelNodeSchema,
  ]),
);

export const CoilActionSchema = z.object({
  type: z.literal('coil'),
  op: z.enum(['OTE', 'OTL', 'OTU']),
  tag: z.string(),
});

export const TimerActionSchema = z.object({
  type: z.literal('timer'),
  op: z.literal('TON'),
  tag: z.string(),
  ptMs: z.number().int().nonnegative(),
});

export const CounterActionSchema = z.object({
  type: z.literal('counter'),
  op: z.enum(['CTU', 'CTD']),
  tag: z.string(),
  preset: z.number().int().nonnegative(),
});

export const MovActionSchema = z.object({
  type: z.literal('mov'),
  source: OperandSchema,
  dest: z.string(),
});

export const MathActionSchema = z.object({
  type: z.literal('math'),
  op: z.enum(['ADD', 'SUB', 'MUL', 'DIV']),
  a: OperandSchema,
  b: OperandSchema,
  dest: z.string(),
});

export const LimitActionSchema = z.object({
  type: z.literal('limit'),
  source: OperandSchema,
  low: OperandSchema,
  high: OperandSchema,
  dest: z.string(),
});

export const OneShotActionSchema = z.object({
  type: z.literal('oneshot'),
  op: z.enum(['ONS', 'OSR']),
  tag: z.string(),
});

export const ActionSchema = z.union([
  CoilActionSchema,
  TimerActionSchema,
  CounterActionSchema,
  MovActionSchema,
  MathActionSchema,
  LimitActionSchema,
  OneShotActionSchema,
]);

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  dataType: z.enum(['BOOL', 'DINT', 'REAL', 'TIMER', 'COUNTER', 'STRING']),
});

export const RungSchema = z.object({
  id: z.string(),
  number: z.number().int().nonnegative(),
  comment: z.string().optional(),
  network: NetworkNodeSchema,
  actions: z.array(ActionSchema),
});

export const RoutineSchema = z.object({
  id: z.string(),
  name: z.string(),
  rungs: z.array(RungSchema),
});

export const ProjectSchema = z.object({
  version: z.literal('ladder-ir/v0'),
  id: z.string(),
  name: z.string(),
  tags: z.array(TagSchema),
  routines: z.array(RoutineSchema),
});

export type ContactNode = z.infer<typeof ContactNodeSchema>;
export type CompareNode = z.infer<typeof CompareNodeSchema>;
export type ConstNode = z.infer<typeof ConstNodeSchema>;
export type SeriesNode = { type: 'series'; nodes: NetworkNode[] };
export type ParallelNode = { type: 'parallel'; branches: NetworkNode[] };
export type NetworkNode = ContactNode | CompareNode | ConstNode | SeriesNode | ParallelNode;
export type Action = z.infer<typeof ActionSchema>;
export type Tag = z.infer<typeof TagSchema>;
export type Rung = z.infer<typeof RungSchema>;
export type Routine = z.infer<typeof RoutineSchema>;
export type Project = z.infer<typeof ProjectSchema>;

const addTagOpSchema = z.object({
  op: z.literal('addTag'),
  tag: TagSchema,
});

const renameTagOpSchema = z.object({
  op: z.literal('renameTag'),
  tagId: z.string(),
  newName: z.string(),
});

const addRoutineOpSchema = z.object({
  op: z.literal('addRoutine'),
  routine: RoutineSchema,
});

const addRungOpSchema = z.object({
  op: z.literal('addRung'),
  routineId: z.string(),
  rung: RungSchema,
});

const deleteRungOpSchema = z.object({
  op: z.literal('deleteRung'),
  routineId: z.string(),
  rungId: z.string(),
});

const replaceRungOpSchema = z.object({
  op: z.literal('replaceRung'),
  routineId: z.string(),
  rungId: z.string(),
  rung: RungSchema,
});

const updateRungCommentOpSchema = z.object({
  op: z.literal('updateRungComment'),
  routineId: z.string(),
  rungId: z.string(),
  comment: z.string(),
});

const editNodeOpSchema = z.object({
  op: z.literal('editNode'),
  routineId: z.string(),
  rungId: z.string(),
  path: z.string(),
  value: z.unknown(),
});

export const PatchOpSchema = z.union([
  addTagOpSchema,
  renameTagOpSchema,
  addRoutineOpSchema,
  addRungOpSchema,
  deleteRungOpSchema,
  replaceRungOpSchema,
  updateRungCommentOpSchema,
  editNodeOpSchema,
]);

export const PatchSchema = z.object({
  version: z.literal('ladder-patch/v0'),
  reason: z.string().optional(),
  ops: z.array(PatchOpSchema).min(1),
});

export type PatchOp = z.infer<typeof PatchOpSchema>;
export type Patch = z.infer<typeof PatchSchema>;

export function validateProject(project: unknown) {
  return ProjectSchema.safeParse(project);
}

export function validatePatch(patch: unknown) {
  return PatchSchema.safeParse(patch);
}
