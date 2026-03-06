/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ENGINE_PORT?: string;
  readonly VITE_USE_ENGINE_PROXY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare global {
  interface Window {
    engine?: {
      getEnginePort: () => Promise<number>;
    };
    appControl?: {
      quit: () => Promise<void>;
    };
  }
}

export {};
