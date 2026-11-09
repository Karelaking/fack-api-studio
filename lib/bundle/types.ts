/**
 * Fack API - Runtime Bundle Types
 *
 * Defines the normalized runtime data structure for exported, encrypted
 * bundles used by the Fack Local CLI runner.
 */

export const BUNDLE_MAGIC_HEADER = "FACK";
export const BUNDLE_SPEC_VERSION = 1;

export interface FackRuntimeRoute {
  id: string;
  endpointId: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  path: string;
  fullPath: string;
  statusCode: number;
  responseSchema: Record<string, unknown>;
  responseTemplate: string | undefined;
  latencyMin: number;
  latencyMax: number;
  errorRate: number;
  customHeaders: Record<string, string>;
  isAuthRequired: boolean;
  isEnabled: boolean;
  collectionName: string | undefined;
}

export interface FackRuntimeEndpoint {
  id: string;
  name: string;
  basePath: string;
  description: string;
}

export interface FackRuntimeScenario {
  id: string;
  name: string;
  latencyMultiplier: number;
  forcedErrorRate: number;
}

export interface FackRuntimeMockState {
  id: string;
  collection: string;
  itemKey: string;
  data: Record<string, unknown>;
}

export interface FackRuntimeBundle {
  magic: typeof BUNDLE_MAGIC_HEADER;
  version: number;
  projectId: string;
  projectName: string;
  projectSlug: string;
  exportedAt: string;
  activeScenarioId: string | undefined;
  endpoints: FackRuntimeEndpoint[];
  routes: FackRuntimeRoute[];
  scenarios: FackRuntimeScenario[];
  mockStates: FackRuntimeMockState[];
}

export interface DecryptedBundleResult {
  bundle: FackRuntimeBundle;
  rawJson: string;
}
