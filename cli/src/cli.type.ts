/**
 * Fack CLI - Types
 *
 * Command-line options, runner configurations, and server options.
 */

export interface CliGlobalOptions {
  verbose?: boolean;
  help?: boolean;
  version?: boolean;
}

export interface DevCommandOptions extends CliGlobalOptions {
  file?: string;
  port?: number;
  host?: string;
  key?: string;
  silent?: boolean;
  cors?: boolean;
}

export interface PullCommandOptions extends CliGlobalOptions {
  projectSlug: string;
  key?: string;
  out?: string;
  url?: string;
}

export interface InspectCommandOptions extends CliGlobalOptions {
  file?: string;
  key?: string;
}

export interface InitCommandOptions extends CliGlobalOptions {
  projectSlug?: string;
  key?: string;
  url?: string;
  out?: string;
}

export interface LoginCommandOptions extends CliGlobalOptions {
  url?: string;
  deviceName?: string;
}

export interface LogoutCommandOptions extends CliGlobalOptions {
  url?: string;
}

export interface ProjectsCommandOptions extends CliGlobalOptions {
  url?: string;
  json?: boolean;
}

export interface WhoamiCommandOptions extends CliGlobalOptions {
  url?: string;
  json?: boolean;
}

export interface ServerRouteMatch {
  route: import("../../lib/bundle/bundle.type").FackRuntimeRoute;
  params: Record<string, string>;
}
