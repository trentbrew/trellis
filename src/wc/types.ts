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

export type SandboxHostOptions = {
  port?: number;
  trellisRoot: string;
  assetsDir?: string;
  host?: string;
  onListen?: (url: string) => void;
};
