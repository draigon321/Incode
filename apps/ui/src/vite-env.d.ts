/// <reference types="vite/client" />

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
