import { describe, it, expect, beforeEach } from "vite-plus/test";
import {
  trackAgentGenerationStarted,
  trackAgentPhaseTransitioned,
  trackAgentGenerationCompleted,
  trackAgentGenerationFailed,
  trackAgentProposalApplied,
  trackAgentToolExecuted,
  getRecentAgentEvents,
  getAgentMetrics,
  clearAgentTelemetryForTesting,
} from "../lib/ai/telemetry.service";

describe("AI API Architect — Telemetry & Analytics Service", () => {
  beforeEach(() => {
    clearAgentTelemetryForTesting();
  });

  it("should record generation started events", () => {
    trackAgentGenerationStarted({
      projectId: "proj_123",
      promptLength: 45,
      model: "openrouter/anthropic/claude-3.5-sonnet",
      provider: "openrouter",
      isStreaming: true,
    });

    const events = getRecentAgentEvents(10);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("agent_generation_started");
    if (events[0].type === "agent_generation_started") {
      expect(events[0].projectId).toBe("proj_123");
      expect(events[0].model).toBe("openrouter/anthropic/claude-3.5-sonnet");
      expect(events[0].isStreaming).toBe(true);
    }
  });

  it("should record phase transitioned events", () => {
    trackAgentPhaseTransitioned({
      projectId: "proj_123",
      phase: "inspecting",
      status: "active",
      detail: "Inspecting project architecture",
    });

    const events = getRecentAgentEvents(10);
    expect(events.length).toBe(1);
    expect(events[0].type).toBe("agent_phase_transitioned");
    if (events[0].type === "agent_phase_transitioned") {
      expect(events[0].phase).toBe("inspecting");
      expect(events[0].status).toBe("active");
    }
  });

  it("should accurately compute aggregated agent metrics across runs", () => {
    trackAgentGenerationCompleted({
      projectId: "proj_1",
      model: "openrouter/anthropic/claude-3.5-sonnet",
      provider: "openrouter",
      durationMs: 1200,
      endpointsCount: 3,
      routesCount: 8,
      conflictsCount: 0,
    });

    trackAgentGenerationCompleted({
      projectId: "proj_2",
      model: "google/gemini-2.5-flash",
      provider: "google",
      durationMs: 800,
      endpointsCount: 2,
      routesCount: 4,
      conflictsCount: 1,
    });

    trackAgentGenerationFailed({
      projectId: "proj_3",
      model: "openrouter/anthropic/claude-3.5-sonnet",
      provider: "openrouter",
      durationMs: 500,
      error: "Network timeout",
    });

    trackAgentProposalApplied({
      projectId: "proj_1",
      proposalId: "prop_1",
      durationMs: 150,
      createdEndpoints: 3,
      createdRoutes: 8,
      updatedRoutes: 0,
      deletedRoutes: 0,
    });

    trackAgentToolExecuted({
      toolName: "validateRoute",
      success: true,
      durationMs: 12,
    });

    const metrics = getAgentMetrics();
    expect(metrics.totalGenerations).toBe(3);
    expect(metrics.successfulGenerations).toBe(2);
    expect(metrics.failedGenerations).toBe(1);
    expect(metrics.successRatePercentage).toBe(67);
    expect(metrics.averageGenerationDurationMs).toBe(1000); // (1200 + 800) / 2
    expect(metrics.totalProposalsApplied).toBe(1);
    expect(metrics.toolExecutionsCount).toBe(1);
    expect(metrics.providerDistribution.openrouter).toBe(2);
    expect(metrics.providerDistribution.google).toBe(1);
  });
});
