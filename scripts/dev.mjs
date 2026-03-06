import { spawn } from 'node:child_process';

const isCodespaces = Boolean(
  process.env.CODESPACES || process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN,
);

const script = isCodespaces ? 'dev:web' : 'dev:desktop-stack';
const child = spawn('pnpm', ['run', script], {
  stdio: 'inherit',
  shell: process.platform === 'win32',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
