/// <reference types="vite/client" />

declare global {
  interface Window {
    engine?: {
      getEnginePort: () => Promise<number>;
    };
  }
}

export {};
