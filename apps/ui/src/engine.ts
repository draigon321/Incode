export async function getEnginePort(): Promise<number> {
  if (window.engine?.getEnginePort) {
    return window.engine.getEnginePort();
  }

  const fallback = import.meta.env.VITE_ENGINE_PORT;
  return fallback ? Number(fallback) : 8000;
}

export async function getEngineBaseUrl(): Promise<string> {
  const port = await getEnginePort();
  return `http://127.0.0.1:${port}`;
}
