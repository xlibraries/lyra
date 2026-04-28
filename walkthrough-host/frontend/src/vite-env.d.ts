/// <reference types="vite/client" />

declare module "@mkkellogg/gaussian-splats-3d" {
  export class Viewer {
    constructor(options: Record<string, unknown>);
    init(): Promise<void>;
    addSplatScene(url: string, options: Record<string, unknown>): Promise<void>;
    start(): void;
    dispose?(): void;
    stop?(): void;
  }
}

interface ImportMetaEnv {
  readonly VITE_API_BASE: string;
  /** "true" = stream/parse PLY incrementally (see GaussianSplatViewer). Can stall through slow SSH tunnels. */
  readonly VITE_SPLAT_PROGRESSIVE_LOAD?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
