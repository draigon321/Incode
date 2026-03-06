import type { Action, NetworkNode, Project, Rung } from '@incode/shared';
import React from 'react';

type Selection = {
  kind: 'node' | 'action';
  tag?: string;
  routineId: string;
  rungId: string;
  detail: string;
};

type Props = {
  project: Project;
  onSelect: (selection: Selection) => void;
  highlightedRungId?: string;
};

const GRID = 24;
const RUNG_HEIGHT = 120;

function collectNodeWidth(node: NetworkNode): number {
  if (node.type === 'contact' || node.type === 'compare' || node.type === 'const') {
    return 5 * GRID;
  }
  if (node.type === 'series') {
    return node.nodes.reduce((sum, n) => sum + collectNodeWidth(n), GRID);
  }
  const maxBranchWidth = Math.max(...node.branches.map(collectNodeWidth));
  return maxBranchWidth + GRID * 2;
}

function renderNode(
  node: NetworkNode,
  x: number,
  y: number,
  routineId: string,
  rung: Rung,
  onSelect: (selection: Selection) => void,
): { element: React.ReactNode; width: number } {
  if (node.type === 'contact') {
    const width = 5 * GRID;
    return {
      width,
      element: (
        <g
          onClick={() =>
            onSelect({
              kind: 'node',
              tag: node.tag,
              routineId,
              rungId: rung.id,
              detail: `${node.op} ${node.tag}`,
            })
          }
          style={{ cursor: 'pointer' }}
        >
          <line x1={x} y1={y} x2={x + width} y2={y} stroke="#264653" strokeWidth={2} />
          <line x1={x + GRID} y1={y - 16} x2={x + GRID} y2={y + 16} stroke="#264653" strokeWidth={2} />
          <line x1={x + GRID * 2} y1={y - 16} x2={x + GRID * 2} y2={y + 16} stroke="#264653" strokeWidth={2} />
          <text x={x + GRID * 2.5} y={y - 20} textAnchor="middle" fontSize="12" fill="#1d3557">
            {node.op}
          </text>
          <text x={x + GRID * 2.5} y={y + 30} textAnchor="middle" fontSize="12" fill="#1d3557">
            {node.tag}
          </text>
        </g>
      ),
    };
  }

  if (node.type === 'compare') {
    const width = 7 * GRID;
    return {
      width,
      element: (
        <g
          onClick={() =>
            onSelect({
              kind: 'node',
              routineId,
              rungId: rung.id,
              detail: `${node.op}`,
            })
          }
          style={{ cursor: 'pointer' }}
        >
          <rect x={x + GRID / 2} y={y - 20} width={width - GRID} height={40} fill="#f1faee" stroke="#1d3557" />
          <text x={x + width / 2} y={y - 4} textAnchor="middle" fontSize="12" fill="#1d3557">
            {node.op}
          </text>
          <text x={x + width / 2} y={y + 12} textAnchor="middle" fontSize="11" fill="#1d3557">
            {node.a.kind === 'tag' ? node.a.tag : String(node.a.value)} | {node.b.kind === 'tag' ? node.b.tag : String(node.b.value)}
          </text>
        </g>
      ),
    };
  }

  if (node.type === 'const') {
    const width = 4 * GRID;
    return {
      width,
      element: (
        <g>
          <rect x={x + GRID / 2} y={y - 16} width={width - GRID} height={32} fill="#f8f9fa" stroke="#6c757d" />
          <text x={x + width / 2} y={y + 4} textAnchor="middle" fontSize="12" fill="#343a40">
            {String(node.value)}
          </text>
        </g>
      ),
    };
  }

  if (node.type === 'series') {
    const elements: React.ReactNode[] = [];
    let cursor = x;
    for (const child of node.nodes) {
      const rendered = renderNode(child, cursor, y, routineId, rung, onSelect);
      elements.push(rendered.element);
      cursor += rendered.width;
    }
    return {
      width: cursor - x,
      element: <g>{elements}</g>,
    };
  }

  const width = collectNodeWidth(node);
  const branchGap = 34;
  const startY = y - ((node.branches.length - 1) * branchGap) / 2;
  const branches = node.branches.map((branch, idx) => {
    const yPos = startY + idx * branchGap;
    const branchNode = renderNode(branch, x + GRID, yPos, routineId, rung, onSelect);
    return (
      <g key={`${rung.id}-branch-${idx}`}>
        <line x1={x} y1={yPos} x2={x + GRID} y2={yPos} stroke="#264653" strokeWidth={2} />
        {branchNode.element}
        <line
          x1={x + GRID + branchNode.width}
          y1={yPos}
          x2={x + width}
          y2={yPos}
          stroke="#264653"
          strokeWidth={2}
        />
      </g>
    );
  });

  return {
    width,
    element: (
      <g>
        <line x1={x} y1={startY} x2={x} y2={startY + (node.branches.length - 1) * branchGap} stroke="#264653" strokeWidth={2} />
        <line
          x1={x + width}
          y1={startY}
          x2={x + width}
          y2={startY + (node.branches.length - 1) * branchGap}
          stroke="#264653"
          strokeWidth={2}
        />
        {branches}
      </g>
    ),
  };
}

function renderAction(
  action: Action,
  x: number,
  y: number,
  routineId: string,
  rung: Rung,
  onSelect: (selection: Selection) => void,
  idx: number,
) {
  if (action.type === 'coil') {
    return (
      <g
        key={`${rung.id}-action-${idx}`}
        onClick={() =>
          onSelect({
            kind: 'action',
            tag: action.tag,
            routineId,
            rungId: rung.id,
            detail: `${action.op} ${action.tag}`,
          })
        }
        style={{ cursor: 'pointer' }}
      >
        <line x1={x} y1={y} x2={x + GRID} y2={y} stroke="#264653" strokeWidth={2} />
        <path d={`M ${x + GRID} ${y} C ${x + GRID + 12} ${y - 18}, ${x + GRID + 20} ${y - 18}, ${x + GRID + 28} ${y}`} fill="none" stroke="#264653" strokeWidth={2} />
        <path d={`M ${x + GRID + 28} ${y} C ${x + GRID + 36} ${y - 18}, ${x + GRID + 44} ${y - 18}, ${x + GRID + 56} ${y}`} fill="none" stroke="#264653" strokeWidth={2} />
        <text x={x + 30} y={y + 20} textAnchor="middle" fontSize="12" fill="#1d3557">
          {action.op}
        </text>
        <text x={x + 68} y={y + 4} fontSize="12" fill="#1d3557">
          {action.tag}
        </text>
      </g>
    );
  }

  if (action.type === 'timer') {
    return (
      <g
        key={`${rung.id}-action-${idx}`}
        onClick={() =>
          onSelect({
            kind: 'action',
            tag: action.tag,
            routineId,
            rungId: rung.id,
            detail: `TON ${action.tag}`,
          })
        }
        style={{ cursor: 'pointer' }}
      >
        <rect x={x + GRID / 2} y={y - 16} width={7 * GRID} height={32} fill="#fff3bf" stroke="#e09f3e" />
        <text x={x + 4 * GRID} y={y - 2} textAnchor="middle" fontSize="12" fill="#7f5539">
          TON {action.tag}
        </text>
        <text x={x + 4 * GRID} y={y + 12} textAnchor="middle" fontSize="11" fill="#7f5539">
          PT {action.ptMs}ms
        </text>
      </g>
    );
  }

  return (
    <g key={`${rung.id}-action-${idx}`}>
      <rect x={x + GRID / 2} y={y - 14} width={6 * GRID} height={28} fill="#edf2f4" stroke="#8d99ae" />
      <text x={x + 3.5 * GRID} y={y + 4} textAnchor="middle" fontSize="11" fill="#2b2d42">
        {action.type}
      </text>
    </g>
  );
}

export function LadderRenderer({ project, onSelect, highlightedRungId }: Props) {
  const routine = project.routines[0];
  if (!routine) {
    return <div className="panel">No routines yet</div>;
  }

  return (
    <div className="panel ladder-panel">
      <h2>{routine.name}</h2>
      <svg width="100%" height={Math.max(260, routine.rungs.length * RUNG_HEIGHT + 40)} viewBox={`0 0 1400 ${Math.max(260, routine.rungs.length * RUNG_HEIGHT + 40)}`}>
        <line x1={40} y1={20} x2={40} y2={routine.rungs.length * RUNG_HEIGHT + 20} stroke="#1d3557" strokeWidth={3} />
        <line x1={1200} y1={20} x2={1200} y2={routine.rungs.length * RUNG_HEIGHT + 20} stroke="#1d3557" strokeWidth={3} />
        {routine.rungs.map((rung, index) => {
          const y = 70 + index * RUNG_HEIGHT;
          const renderedNetwork = renderNode(rung.network, 120, y, routine.id, rung, onSelect);
          let actionX = 120 + renderedNetwork.width + 20;
          const actions = rung.actions.map((action, idx) => {
            const node = renderAction(action, actionX, y, routine.id, rung, onSelect, idx);
            actionX += 220;
            return node;
          });

          return (
            <g key={rung.id} id={`rung-${rung.id}`}>
              <rect
                x={50}
                y={y - 40}
                width={1140}
                height={80}
                fill={highlightedRungId === rung.id ? '#e6f7ff' : 'transparent'}
                stroke={highlightedRungId === rung.id ? '#0077b6' : 'none'}
              />
              <text x={58} y={y - 8} fontSize="12" fill="#495057">
                Rung {rung.number}
              </text>
              <text x={58} y={y + 10} fontSize="11" fill="#6c757d">
                {rung.comment ?? ''}
              </text>
              <line x1={40} y1={y} x2={120} y2={y} stroke="#264653" strokeWidth={2} />
              {renderedNetwork.element}
              <line x1={120 + renderedNetwork.width} y1={y} x2={120 + renderedNetwork.width + 20} y2={y} stroke="#264653" strokeWidth={2} />
              {actions}
              <line x1={actionX - 20} y1={y} x2={1200} y2={y} stroke="#264653" strokeWidth={2} />
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export type { Selection };
