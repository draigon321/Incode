import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const repoRoot = process.cwd();
const engineDir = path.join(repoRoot, 'services', 'engine');

const pythonCandidates = [
  path.join(engineDir, '.venv', 'Scripts', 'python.exe'),
  path.join(engineDir, '.venv', 'bin', 'python'),
  'python',
  'python3',
];

const pythonCmd = pythonCandidates.find((candidate) => {
  if (candidate.includes(path.sep)) {
    return existsSync(candidate);
  }
  return true;
});

if (!pythonCmd) {
  console.error('No Python executable found.');
  process.exit(1);
}

const child = spawn(
  pythonCmd,
  ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
  {
    cwd: engineDir,
    stdio: 'inherit',
    shell: process.platform === 'win32' && !pythonCmd.includes(path.sep),
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
