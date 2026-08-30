export type PackedFile =
  | string
  | {
      binary: string;
    };

export type SandboxBootstrap = {
  packageJson: Record<string, unknown>;
  binTrellis: string;
  dist: Record<string, string>;
  nodeModules: Record<string, PackedFile>;
  clientHtml: string | null;
  version: string;
};

export type SandboxPackOptions = {
  /** Override the sandbox asset directory (default: auto-resolved). */
  assetsDir?: string;
  /** Include `dist/*.map` sourcemaps in the payload (default: false). */
  sourcemaps?: boolean;
  /** Drop unreachable build variants from vendored packages (default: true). */
  prune?: boolean;
};

export type SandboxHostOptions = {
  port?: number;
  trellisRoot: string;
  assetsDir?: string;
  host?: string;
  onListen?: (url: string) => void;
};
