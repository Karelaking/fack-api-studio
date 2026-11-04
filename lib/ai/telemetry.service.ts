/**
 * Fack AI API Architect — Agent Telemetry & Analytics Service
 *
 * Implements a structured, observable telemetry layer following the standard
 * Object-Action naming taxonomy for the agentic AI lifecycle.
 *
 * Provides non-blocking event dispatching, phase latency measurements,
 * and an in-memory aggregation ring buffer for health monitoring.
 */

import type { GenerationProgressStatus } from "./types";

// ─── Type Definitions ─────────────────────────────────────────────────────────

export type AgentTelemetryEventType =
  | "agent_generation_started"
  | "agent_phase_transitioned"
  | "agent_generation_completed"
  | "agent_generation_failed"
  | "agent_proposal_applied"
  | "agent_tool_executed";

export interface AgentGenerationStartedEvent {
  type: "agent_generation_started";
  timestamp: number;
  projectId?: string;
  promptLength: number;
  model: string;
  provider: string;
  isStreaming: boolean;
}

export interface AgentPhaseTransitionedEvent {
  type: "agent_phase_transitioned";
  timestamp: number;
  projectId?: string;
  phase: string;
  status: GenerationProgressStatus;
  durationMs?: number;
  detail?: string;
}

export interface AgentGenerationCompletedEvent {
  type: "agent_generation_completed";
  timestamp: number;
  projectId?: string;
  model: string;
  provider: string;
  durationMs: number;
  endpointsCount: number;
  routesCount: number;
  conflictsCount: number;
}

export interface AgentGenerationFailedEvent {
  type: "agent_generation_failed";
  timestamp: number;
  projectId?: string;
  model: string;
  provider: string;
  durationMs: number;
  error: string;
}

export interface AgentProposalAppliedEvent {
  type: "agent_proposal_applied";
  timestamp: number;
  projectId: string;
  proposalId: string;
  durationMs: number;
  createdEndpoints: number;
  createdRoutes: number;
  updatedRoutes: number;
  deletedRoutes: number;
}

export interface AgentToolExecutedEvent {
  type: "agent_tool_executed";
  timestamp: number;
  toolName: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

export type AgentTelemetryEvent =
  | AgentGenerationStartedEvent
  | AgentPhaseTransitionedEvent
  | AgentGenerationCompletedEvent
  | AgentGenerationFailedEvent
  | AgentProposalAppliedEvent
  | AgentToolExecutedEvent;

export interface AgentAggregateMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  successRatePercentage: number;
  averageGenerationDurationMs: number;
  totalProposalsApplied: number;
  providerDistribution: Record<string, number>;
  toolExecutionsCount: number;
  lastEventTimestamp?: number;
}

// ─── Ring Buffer Storage ──────────────────────────────────────────────────────

const MAX_EVENT_BUFFER_SIZE = 500;
const eventBuffer: AgentTelemetryEvent[] = [];

/**
 * Appends a telemetry event to the ring buffer.
 */
function recordEvent(event: AgentTelemetryEvent): void {
  eventBuffer.push(event);
  if (eventBuffer.length > MAX_EVENT_BUFFER_SIZE) {
    eventBuffer.shift();
  }
}

// ─── Public Telemetry Dispatchers ─────────────────────────────────────────────

/**
 * Tracks the start of an AI API generation run.
 */
export function trackAgentGenerationStarted(params: {
  projectId?: string;
  promptLength: number;
  model: string;
  provider: string;
  isStreaming: boolean;
}): void {
  recordEvent({
    type: "agent_generation_started",
    timestamp: Date.now(),
    projectId: params.projectId,
    promptLength: params.promptLength,
    model: params.model,
    provider: params.provider,
    isStreaming: params.isStreaming,
  });
}

/**
 * Tracks the transition of an architect phase (Understand, Inspect, Design, etc.).
 */
export function trackAgentPhaseTransitioned(params: {
  projectId?: string;
  phase: string;
  status: GenerationProgressStatus;
  durationMs?: number;
  detail?: string;
}): void {
  recordEvent({
    type: "agent_phase_transitioned",
    timestamp: Date.now(),
    projectId: params.projectId,
    phase: params.phase,
    status: params.status,
    durationMs: params.durationMs,
    detail: params.detail,
  });
}

/**
 * Tracks the successful completion of an API generation run.
 */
export function trackAgentGenerationCompleted(params: {
  projectId?: string;
  model: string;
  provider: string;
  durationMs: number;
  endpointsCount: number;
  routesCount: number;
  conflictsCount: number;
}): void {
  recordEvent({
    type: "agent_generation_completed",
    timestamp: Date.now(),
    projectId: params.projectId,
    model: params.model,
    provider: params.provider,
    durationMs: params.durationMs,
    endpointsCount: params.endpointsCount,
    routesCount: params.routesCount,
    conflictsCount: params.conflictsCount,
  });
}

/**
 * Tracks a failed generation run.
 */
export function trackAgentGenerationFailed(params: {
  projectId?: string;
  model: string;
  provider: string;
  durationMs: number;
  error: string;
}): void {
  recordEvent({
    type: "agent_generation_failed",
    timestamp: Date.now(),
    projectId: params.projectId,
    model: params.model,
    provider: params.provider,
    durationMs: params.durationMs,
    error: params.error,
  });
}

/**
 * Tracks the successful application of an AI generation proposal to a project.
 */
export function trackAgentProposalApplied(params: {
  projectId: string;
  proposalId: string;
  durationMs: number;
  createdEndpoints: number;
  createdRoutes: number;
  updatedRoutes: number;
  deletedRoutes: number;
}): void {
  recordEvent({
    type: "agent_proposal_applied",
    timestamp: Date.now(),
    projectId: params.projectId,
    proposalId: params.proposalId,
    durationMs: params.durationMs,
    createdEndpoints: params.createdEndpoints,
    createdRoutes: params.createdRoutes,
    updatedRoutes: params.updatedRoutes,
    deletedRoutes: params.deletedRoutes,
  });
}

/**
 * Tracks an individual agent tool execution.
 */
export function trackAgentToolExecuted(params: {
  toolName: string;
  success: boolean;
  durationMs: number;
  error?: string;
}): void {
  recordEvent({
    type: "agent_tool_executed",
    timestamp: Date.now(),
    toolName: params.toolName,
    success: params.success,
    durationMs: params.durationMs,
    error: params.error,
  });
}

// ─── Metrics & Queries ────────────────────────────────────────────────────────

/**
 * Retrieves recent telemetry events from the in-memory ring buffer.
 */
export function getRecentAgentEvents(limit = 50): AgentTelemetryEvent[] {
  const boundedLimit = Math.max(1, Math.min(limit, MAX_EVENT_BUFFER_SIZE));
  return eventBuffer.slice(-boundedLimit).reverse();
}

/**
 * Computes aggregated observability metrics across all recorded agent events.
 */
export function getAgentMetrics(): AgentAggregateMetrics {
  let totalGenerations = 0;
  let successfulGenerations = 0;
  let failedGenerations = 0;
  let totalGenerationDuration = 0;
  let totalProposalsApplied = 0;
  let toolExecutionsCount = 0;
  const providerDistribution: Record<string, number> = {};

  for (const event of eventBuffer) {
    if (event.type === "agent_generation_completed") {
      totalGenerations++;
      successfulGenerations++;
      totalGenerationDuration += event.durationMs;
      providerDistribution[event.provider] =
        (providerDistribution[event.provider] ?? 0) + 1;
    } else if (event.type === "agent_generation_failed") {
      totalGenerations++;
      failedGenerations++;
      providerDistribution[event.provider] =
        (providerDistribution[event.provider] ?? 0) + 1;
    } else if (event.type === "agent_proposal_applied") {
      totalProposalsApplied++;
    } else if (event.type === "agent_tool_executed") {
      toolExecutionsCount++;
    }
  }

  const successRatePercentage =
    totalGenerations > 0
      ? Math.round((successfulGenerations / totalGenerations) * 100)
      : 100;

  const averageGenerationDurationMs =
    successfulGenerations > 0
      ? Math.round(totalGenerationDuration / successfulGenerations)
      : 0;

  const lastEvent = eventBuffer[eventBuffer.length - 1];

  return {
    totalGenerations,
    successfulGenerations,
    failedGenerations,
    successRatePercentage,
    averageGenerationDurationMs,
    totalProposalsApplied,
    providerDistribution,
    toolExecutionsCount,
    lastEventTimestamp: lastEvent ? lastEvent.timestamp : undefined,
  };
}

/**
 * Resets the in-memory event buffer (primarily for test environments).
 */
export function clearAgentTelemetryForTesting(): void {
  eventBuffer.length = 0;
}
