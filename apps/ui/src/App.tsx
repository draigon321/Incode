import { useEffect, useMemo, useState } from 'react';
import type { Patch, Project } from '@incode/shared';
import { LadderRenderer, type Selection } from './ladderRenderer';
import { getEngineBaseUrl, getEnginePort, getEngineWsUrl } from './engine';
import './styles.css';

type Finding = {
  id: string;
  severity: string;
  message: string;
  tag?: string;
  locations: Array<{ routineId: string; rungId: string; detail: string }>;
};

type XrefMap = Record<string, Array<{ routineId: string; rungId: string; detail: string }> >;

function totalRefs(map: XrefMap | undefined): number {
  if (!map) {
    return 0;
  }
  return Object.values(map).reduce((acc, refs) => acc + refs.length, 0);
}

export default function App() {
  const [enginePort, setEnginePort] = useState<number | null>(null);
  const [health, setHealth] = useState<string>('starting');
  const [projectId, setProjectId] = useState<string>('');
  const [project, setProject] = useState<Project | null>(null);
  const [wsLog, setWsLog] = useState<string[]>([]);
  const [findings, setFindings] = useState<Finding[]>([]);
  const [xrefReads, setXrefReads] = useState<XrefMap>();
  const [xrefWrites, setXrefWrites] = useState<XrefMap>();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [highlightedRungId, setHighlightedRungId] = useState<string>('');

  const selectedTagReads = useMemo(() => {
    if (!selection?.tag || !xrefReads) {
      return [];
    }
    return xrefReads[selection.tag] ?? [];
  }, [selection, xrefReads]);

  const selectedTagWrites = useMemo(() => {
    if (!selection?.tag || !xrefWrites) {
      return [];
    }
    return xrefWrites[selection.tag] ?? [];
  }, [selection, xrefWrites]);

  async function api(path: string, init?: RequestInit) {
    const baseUrl = await getEngineBaseUrl();
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...init,
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    return response.json();
  }

  async function refreshProjectData(id: string) {
    const [projectResponse, lintResponse, xrefResponse] = await Promise.all([
      api(`/project/${id}`),
      api(`/project/${id}/lint/run`, { method: 'POST' }),
      api(`/project/${id}/xref/build`, { method: 'POST' }),
    ]);
    setProject(projectResponse.project);
    setFindings(lintResponse.findings);
    setXrefReads(xrefResponse.reads);
    setXrefWrites(xrefResponse.writes);
  }

  useEffect(() => {
    let ws: WebSocket | undefined;
    getEnginePort()
      .then(async (port) => {
        setEnginePort(port);
        const baseUrl = await getEngineBaseUrl();
        const healthPayload = await fetch(`${baseUrl}/health`).then((r) => r.json());
        setHealth(healthPayload.status);

        const wsUrl = await getEngineWsUrl();
        ws = new WebSocket(wsUrl);
        ws.onmessage = (event) => {
          setWsLog((prev) => [`${new Date().toISOString()} ${event.data}`, ...prev].slice(0, 25));
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'project.changed' && data.payload?.projectId) {
              refreshProjectData(data.payload.projectId).catch(() => undefined);
            }
            if (data.type === 'lint.updated' && data.payload?.findings) {
              setFindings(data.payload.findings);
            }
            if (data.type === 'xref.updated') {
              setXrefReads(data.payload.reads ?? {});
              setXrefWrites(data.payload.writes ?? {});
            }
          } catch {
            // keep raw log if message is not JSON
          }
        };
      })
      .catch((error) => {
        setHealth(`error: ${String(error)}`);
      });

    return () => {
      ws?.close();
    };
  }, []);

  async function createNewProject() {
    const response = await api('/project/new', { method: 'POST' });
    setProjectId(response.projectId);
    setProject(response.project);
    await refreshProjectData(response.projectId);
  }

  async function applySamplePatch() {
    if (!projectId) {
      return;
    }

    const patch: Patch = {
      version: 'ladder-patch/v0',
      reason: 'create two OTE writers to trigger L001',
      ops: [
        { op: 'addTag', tag: { id: 't-motor-run', name: 'MotorRun', dataType: 'BOOL' } },
        { op: 'addTag', tag: { id: 't-start', name: 'StartPB', dataType: 'BOOL' } },
        { op: 'addTag', tag: { id: 't-stop', name: 'StopPB', dataType: 'BOOL' } },
        {
          op: 'addRoutine',
          routine: {
            id: 'r-main',
            name: 'MainRoutine',
            rungs: [],
          },
        },
        {
          op: 'addRung',
          routineId: 'r-main',
          rung: {
            id: 'r1',
            number: 1,
            comment: 'first writer',
            network: {
              type: 'series',
              nodes: [{ type: 'contact', op: 'XIC', tag: 'StartPB' }],
            },
            actions: [{ type: 'coil', op: 'OTE', tag: 'MotorRun' }],
          },
        },
        {
          op: 'addRung',
          routineId: 'r-main',
          rung: {
            id: 'r2',
            number: 2,
            comment: 'second writer triggers L001',
            network: {
              type: 'series',
              nodes: [{ type: 'contact', op: 'XIO', tag: 'StopPB' }],
            },
            actions: [
              { type: 'coil', op: 'OTE', tag: 'MotorRun' },
              { type: 'timer', op: 'TON', tag: 'MotorRunTimer', ptMs: 500 },
            ],
          },
        },
      ],
    };

    await api(`/project/${projectId}/patch/apply`, {
      method: 'POST',
      body: JSON.stringify({ patch }),
    });

    await refreshProjectData(projectId);
  }

  async function loadSampleProject() {
    const response = await api('/project/new', { method: 'POST' });
    const newProjectId = response.projectId as string;
    setProjectId(newProjectId);
    const sampleProject = await fetch('/sample-project.json').then((r) => r.json());
    const patchOps = [
      ...sampleProject.tags.map((tag: unknown) => ({ op: 'addTag', tag })),
      ...sampleProject.routines.map((routine: { id: string; name: string; rungs: unknown[] }) => ({
        op: 'addRoutine',
        routine: { id: routine.id, name: routine.name, rungs: [] },
      })),
      ...sampleProject.routines.flatMap((routine: { id: string; rungs: unknown[] }) =>
        routine.rungs.map((rung: unknown) => ({
          op: 'addRung',
          routineId: routine.id,
          rung,
        })),
      ),
    ];

    await api(`/project/${newProjectId}/patch/apply`, {
      method: 'POST',
      body: JSON.stringify({
        patch: {
          version: 'ladder-patch/v0',
          reason: 'load bundled sample',
          ops: patchOps,
        },
      }),
    });
    await refreshProjectData(newProjectId);
  }

  async function exitApplication() {
    if (window.appControl?.quit) {
      await window.appControl.quit();
      return;
    }

    try {
      await api('/admin/shutdown', { method: 'POST' });
      setHealth('shutting_down');
      setWsLog((prev) => [`${new Date().toISOString()} Engine shutdown requested`, ...prev].slice(0, 25));
    } catch (error) {
      setHealth(`shutdown_error: ${String(error)}`);
    }
  }

  return (
    <div className="app-root">
      <header>
        <h1>Incode Ladder IDE</h1>
        <div>Engine: {enginePort ?? 'unknown'} | Health: {health}</div>
      </header>

      <div className="toolbar panel">
        <button onClick={createNewProject}>Create New Project</button>
        <button onClick={loadSampleProject}>Load Sample Project</button>
        <button onClick={applySamplePatch} disabled={!projectId}>
          Apply Sample Patch
        </button>
        <button onClick={exitApplication}>Exit</button>
        <div>Project ID: {projectId || '(none)'}</div>
        <div>Tags: {project?.tags.length ?? 0}</div>
        <div>Rungs: {project?.routines.reduce((sum, routine) => sum + routine.rungs.length, 0) ?? 0}</div>
        <div>Xref reads: {totalRefs(xrefReads)} | writes: {totalRefs(xrefWrites)}</div>
      </div>

      <div className="main-grid">
        <div>
          {project ? (
            <LadderRenderer
              project={project}
              highlightedRungId={highlightedRungId}
              onSelect={async (nextSelection) => {
                setSelection(nextSelection);
                if (projectId && (!xrefReads || !xrefWrites)) {
                  const xrefResponse = await api(`/project/${projectId}/xref/build`, { method: 'POST' });
                  setXrefReads(xrefResponse.reads);
                  setXrefWrites(xrefResponse.writes);
                }
                if (projectId && findings.length === 0) {
                  const lintResponse = await api(`/project/${projectId}/lint/run`, { method: 'POST' });
                  setFindings(lintResponse.findings);
                }
              }}
            />
          ) : (
            <div className="panel">No project loaded.</div>
          )}

          <div className="panel">
            <h2>WS Events</h2>
            <pre>{wsLog.join('\n')}</pre>
          </div>

          <div className="panel">
            <h2>Lint Findings</h2>
            {findings.length === 0 ? <div>No findings</div> : null}
            {findings.map((finding, idx) => (
              <div key={`${finding.id}-${idx}`} className="finding">
                <strong>{finding.id}</strong> [{finding.severity}] {finding.message}
              </div>
            ))}
          </div>
        </div>

        <aside className="panel">
          <h2>Selection</h2>
          {selection ? (
            <>
              <div>Detail: {selection.detail}</div>
              <div>Routine: {selection.routineId}</div>
              <div>Rung: {selection.rungId}</div>
              <div>Tag: {selection.tag ?? '(none)'}</div>
              <h3>Reads</h3>
              {selectedTagReads.map((loc, idx) => (
                <button
                  key={`read-${idx}`}
                  className="jump-btn"
                  onClick={() => setHighlightedRungId(loc.rungId)}
                >
                  {loc.routineId} / {loc.rungId} ({loc.detail})
                </button>
              ))}
              <h3>Writes</h3>
              {selectedTagWrites.map((loc, idx) => (
                <button
                  key={`write-${idx}`}
                  className="jump-btn"
                  onClick={() => setHighlightedRungId(loc.rungId)}
                >
                  {loc.routineId} / {loc.rungId} ({loc.detail})
                </button>
              ))}
            </>
          ) : (
            <div>Select a node/action in the ladder.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
