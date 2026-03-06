const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('node:path');
const { spawn } = require('node:child_process');
const net = require('node:net');

let enginePort = 0;
let engineProc;

function getVenvPython() {
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const winPython = path.join(repoRoot, 'services', 'engine', '.venv', 'Scripts', 'python.exe');
  const unixPython = path.join(repoRoot, 'services', 'engine', '.venv', 'bin', 'python');
  return process.platform === 'win32' ? winPython : unixPython;
}

function findFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      server.close(() => {
        if (address && typeof address === 'object') {
          resolve(address.port);
          return;
        }
        reject(new Error('Unable to allocate free port'));
      });
    });
    server.on('error', reject);
  });
}

async function waitForHealth(port) {
  const deadline = Date.now() + 15000;
  const url = `http://127.0.0.1:${port}/health`;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        const payload = await response.json();
        if (payload.status === 'ok') {
          return;
        }
      }
    } catch (error) {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error('Engine health check timed out');
}

async function startEngine() {
  enginePort = await findFreePort();
  const repoRoot = path.resolve(__dirname, '..', '..', '..');
  const engineCwd = path.join(repoRoot, 'services', 'engine');
  const pythonCmd = process.env.ENGINE_PYTHON || getVenvPython();

  const env = {
    ...process.env,
    ENGINE_PORT: String(enginePort),
  };

  engineProc = spawn(
    pythonCmd,
    ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', String(enginePort)],
    {
      cwd: engineCwd,
      env,
      stdio: 'pipe',
    },
  );

  engineProc.stdout?.on('data', (chunk) => {
    process.stdout.write(`[engine] ${chunk}`);
  });
  engineProc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[engine] ${chunk}`);
  });

  await waitForHealth(enginePort);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL;
  if (devServerUrl) {
    win.loadURL(devServerUrl);
    return;
  }

  const indexPath = path.resolve(__dirname, '..', '..', 'ui', 'dist', 'index.html');
  win.loadFile(indexPath);
}

ipcMain.handle('engine:get-port', () => enginePort);

app.whenReady().then(async () => {
  try {
    await startEngine();
    createWindow();
  } catch (error) {
    console.error('Failed to launch app:', error);
    app.quit();
  }
});

app.on('before-quit', () => {
  if (engineProc && !engineProc.killed) {
    engineProc.kill();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
