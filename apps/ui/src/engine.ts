export async function getEnginePort(): Promise<number> {
  if (window.engine?.getEnginePort) {
    return window.engine.getEnginePort();
  }

  const fallback = import.meta.env.VITE_ENGINE_PORT;
  return fallback ? Number(fallback) : 8000;
}

export async function getEngineBaseUrl(): Promise<string> {
  if (import.meta.env.VITE_USE_ENGINE_PROXY === '1') {
    return '/engine';
  }

  if (!window.engine?.getEnginePort) {
    const { hostname, protocol } = window.location;
    if (hostname.endsWith('.app.github.dev') && hostname.includes('-5173.')) {
      return `${protocol}//${hostname.replace('-5173.', '-8000.')}`;
    }
  }

  const port = await getEnginePort();
  return `http://127.0.0.1:${port}`;
}

export async function getEngineWsUrl(): Promise<string> {
  if (import.meta.env.VITE_USE_ENGINE_PROXY === '1') {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/engine/ws/events`;
  }

  if (!window.engine?.getEnginePort) {
    const { hostname, protocol } = window.location;
    if (hostname.endsWith('.app.github.dev') && hostname.includes('-5173.')) {
      const wsProtocol = protocol === 'https:' ? 'wss:' : 'ws:';
      return `${wsProtocol}//${hostname.replace('-5173.', '-8000.')}/ws/events`;
    }
  }

  const port = await getEnginePort();
  return `ws://127.0.0.1:${port}/ws/events`;
}
