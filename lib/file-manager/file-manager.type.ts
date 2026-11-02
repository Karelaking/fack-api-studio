/**
 * Types for the Fack API local file management system.
 *
 * In local mode, API projects are saved as self-contained `.fack` files on disk.
 * These files are human-readable, pretty-printed JSON that can be committed
 * to Git, shared with team members, and reopened at any time.
 */

import type {
  Project,
  Endpoint,
  Route,
  CanvasState,
  Scenario,
  ProjectRevision,
  GenerationTask,
  GenerationProposal,
  MockState,
  Webhook,
  Note,
} from "@/db/schema";

export const FACK_FILE_VERSION = 1;
export const FACK_FILE_EXTENSION = ".fack";

export interface FackProjectMetadata {
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Self-contained schema of a `.fack` project file stored on disk.
 */
export interface FackProjectFile {
  fackVersion: number;
  format: "fack-project";
  savedAt: string;
  filePath?: string;
  metadata: FackProjectMetadata;
  project: Project;
  endpoints: Endpoint[];
  routes: Route[];
  canvasState: CanvasState | null;
  scenarios: Scenario[];
  projectRevisions: ProjectRevision[];
  generationTasks: GenerationTask[];
  generationProposals: GenerationProposal[];
  mockStates: MockState[];
  webhooks: Webhook[];
  notes: Note[];
}

/**
 * Item in the recently opened files list.
 */
export interface RecentFileEntry {
  id: string;
  filePath: string;
  fileName: string;
  projectName: string;
  slug: string;
  lastOpenedAt: string;
  lastSavedAt: string | null;
  fileSizeBytes: number;
}

/**
 * Real-time status of a project currently loaded in the local database.
 */
export interface OpenProjectSummary {
  projectId: string;
  name: string;
  slug: string;
  description: string;
  filePath: string | null;
  isDirty: boolean;
  lastSavedAt: string | null;
  endpointCount: number;
  routeCount: number;
}

/**
 * Result returned after opening or saving a `.fack` project file.
 */
export interface FileManagerOperationResult {
  success: boolean;
  project: Project;
  filePath: string;
  error?: string;
}
