/**
 * Fack AI API Architect — Core Architect Agent Service
 *
 * Orchestrates the full 5-phase generation lifecycle:
 * 1. Understand -> 2. Inspect -> 3. Design -> 4. Validate -> 5. Present (Change Set)
 *
 * Integrates with the Vercel AI SDK (Gemini / OpenAI) with automatic fallback
 * to the deterministic domain synthesizer when running offline or without API keys.
 */

import { generateObject } from "ai";
import { nanoid } from "nanoid";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, generationTasks, generationProposals } from "@/db/schema";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import type {
  GeneratedApi,
  ApiChangeSet,
  GenerationProgressStep,
  RouteConflict,
  DetailedPromptResult,
} from "@/lib/ai/types";
import {
  AI_SYSTEM_PROMPT,
  AI_PROMPT_EXPANSION_SYSTEM_PROMPT,
} from "./prompts.constant";
import {
  synthesizeDetailedPrompt,
  synthesizeFallbackApi,
} from "./fallback-synthesizer.constant";
import {
  generatedApiSchema,
  detailedPromptSchema,
  validateAndNormalizeApi,
  buildApiChangeSet,
} from "./validator.service";
import { getProjectSummary } from "@/lib/services/project.service";
import {
  getEndpointsByProjectId,
  type EndpointWithRoutes,
} from "@/lib/services/endpoint.service";
import {
  getRoutesByProjectId,
  type RouteWithEndpoint,
} from "@/lib/services/route.service";

export interface GenerateApiOptions {
  projectId?: string;
  prompt: string;
  model?: string;
  onProgress?: (step: GenerationProgressStep) => void;
}

export interface GenerateApiExecutionResult {
  success: boolean;
  generation?: GeneratedApi;
  changeSet?: ApiChangeSet;
  conflicts?: RouteConflict[];
  durationMs?: number;
  modelUsed?: string;
  provider?: "openrouter" | "google" | "openai" | "fallback";
  detailedPrompt?: string;
  detailedSummary?: string;
  error?: string;
  proposalId?: string;
  expectedVersion?: number;
  clarificationRequest?: string;
}

export interface ResolvedAiModel {
  model: Parameters<typeof generateObject>[0]["model"];
  name: string;
  provider: "openrouter" | "google" | "openai";
}

/**
 * Resolves the active model provider based on configured environment variables.
 * Prioritizes OpenRouter, with fallback to Google Gemini and OpenAI.
 */
export function resolveAiModel(
  requestedModel?: string,
): ResolvedAiModel | undefined {
  const openrouterKey = process.env.OPENROUTER_API_KEY;
  if (openrouterKey) {
    const openrouter = createOpenRouter({
      apiKey: openrouterKey,
      baseURL: process.env.OPENROUTER_BASE_URL,
      appName: "Fack API Studio",
      appUrl: "https://fackapi.studio",
    });
    const modelId =
      requestedModel ||
      process.env.OPENROUTER_MODEL ||
      "anthropic/claude-3.5-sonnet";
    const displayName = modelId.startsWith("openrouter/")
      ? modelId
      : `openrouter/${modelId}`;
    return {
      model: openrouter(modelId),
      name: displayName,
      provider: "openrouter",
    };
  }

  const geminiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (geminiKey) {
    const google = createGoogleGenerativeAI({ apiKey: geminiKey });
    const modelId = requestedModel || "gemini-2.5-flash";
    return {
      model: google(modelId),
      name: `google/${modelId}`,
      provider: "google",
    };
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    const openai = createOpenAI({ apiKey: openaiKey });
    const modelId = requestedModel || "gpt-4o-mini";
    return {
      model: openai(modelId),
      name: `openai/${modelId}`,
      provider: "openai",
    };
  }

  return undefined;
}

/**
 * Expands a raw user prompt into an exhaustive, structured architectural specification.
 */
export async function expandUserPrompt(
  rawPrompt: string,
  projectContext?: string,
  requestedModel?: string,
): Promise<DetailedPromptResult> {
  const cleanPrompt = rawPrompt.trim();
  if (!cleanPrompt) {
    throw new Error("Prompt cannot be empty");
  }

  const modelConfig = resolveAiModel(requestedModel);
  if (modelConfig) {
    try {
      const systemContext = projectContext
        ? `${AI_PROMPT_EXPANSION_SYSTEM_PROMPT}\n\nExisting Project Context:\n${projectContext}`
        : AI_PROMPT_EXPANSION_SYSTEM_PROMPT;

      const result = await generateObject({
        model: modelConfig.model,
        schema: detailedPromptSchema,
        system: systemContext,
        prompt: cleanPrompt,
      });

      return result.object;
    } catch (llmError) {
      console.error("[Fack AI] LLM prompt expansion failed:", llmError);
      throw new Error(
        `LLM expansion failed: ${llmError instanceof Error ? llmError.message : String(llmError)}`,
      );
    }
  }

  return synthesizeDetailedPrompt(cleanPrompt);
}

/**
 * Executes the complete AI API Architect generation lifecycle.
 */
export async function generateApiSpecification(
  options: GenerateApiOptions,
): Promise<GenerateApiExecutionResult> {
  const startTime = Date.now();
  const { projectId, prompt, onProgress } = options;

  const emitProgress = (
    id: GenerationProgressStep["id"],
    label: string,
    status: GenerationProgressStep["status"],
    detail?: string,
  ) => {
    if (onProgress) {
      onProgress({ id, label, status, detail });
    }
  };

  let taskId: string | undefined;
  let expectedVersion = 1;

  if (projectId) {
    taskId = nanoid();
    const projectRow = await db.query.projects.findFirst({
      where: eq(projects.id, projectId),
    });
    if (projectRow) {
      expectedVersion = projectRow.version;
    }
    await db.insert(generationTasks).values({
      id: taskId,
      projectId,
      prompt: prompt.trim(),
      status: "pending",
    });
  }

  try {
    // ── Phase 1: Understand Requirements ──────────────────────────────────
    emitProgress(
      "understanding",
      "Analyzing requirements & domain scope",
      "active",
    );
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      throw new Error("Prompt cannot be empty");
    }
    emitProgress(
      "understanding",
      "Analyzing requirements & domain scope",
      "completed",
    );

    // ── Phase 2: Inspect Existing Project ─────────────────────────────────
    emitProgress(
      "inspecting",
      "Inspecting existing project architecture",
      "active",
    );
    let projectSummaryText = "";
    let existingEndpoints: EndpointWithRoutes[] = [];
    let existingRoutes: RouteWithEndpoint[] = [];

    if (projectId) {
      const [summary, endpoints, routes] = await Promise.all([
        getProjectSummary(projectId),
        getEndpointsByProjectId(projectId),
        getRoutesByProjectId(projectId),
      ]);
      existingEndpoints = endpoints;
      existingRoutes = routes;

      if (summary) {
        projectSummaryText = `
Existing Project Information:
- Project Name: "${summary.name}"
- Current Endpoints: ${summary.endpoints.map((e) => `${e.name} (${e.basePath}) with ${e.routeCount} routes`).join(", ")}
- Total Routes: ${summary.routeCount}

When modifying, preserve existing resource conventions where appropriate, avoid unnecessary route deletions, and design cohesive extensions.
`;
      }
    }
    emitProgress(
      "inspecting",
      "Inspecting existing project architecture",
      "completed",
    );

    // ── Phase 3: Detailed Specification Generation (Prompt Detailing) ─────
    emitProgress(
      "expanding_prompt",
      "Synthesizing detailed architecture specification",
      "active",
    );
    const detailedSpec = await expandUserPrompt(
      cleanPrompt,
      projectSummaryText,
      options.model,
    );
    emitProgress(
      "expanding_prompt",
      "Synthesizing detailed architecture specification",
      "completed",
      detailedSpec.summary,
    );

    if (detailedSpec.isAmbiguous && detailedSpec.clarificationRequest) {
      emitProgress("complete", "Clarification needed", "completed");

      if (taskId) {
        await db
          .update(generationTasks)
          .set({ status: "completed" })
          .where(eq(generationTasks.id, taskId));
      }

      return {
        success: true,
        clarificationRequest: detailedSpec.clarificationRequest,
        detailedPrompt: detailedSpec.detailedPrompt,
        detailedSummary: detailedSpec.summary,
      };
    }

    // ── Phase 4: Design API Endpoints & Routes ─────────────────────────────
    emitProgress(
      "designing",
      "Designing REST endpoints & schema models",
      "active",
      detailedSpec.entities.length > 0
        ? `Resources: ${detailedSpec.entities.join(", ")}`
        : undefined,
    );

    const modelConfig = resolveAiModel(options.model);
    let rawGeneratedApi: GeneratedApi;
    let modelUsed = "deterministic-architect-engine";
    const provider = modelConfig ? modelConfig.provider : "fallback";

    if (modelConfig) {
      modelUsed = modelConfig.name;
      try {
        const generationPrompt = `Detailed Architecture Specification:\n${detailedSpec.detailedPrompt}\n\nOriginal Request: "${cleanPrompt}"`;
        const result = await generateObject({
          model: modelConfig.model,
          schema: generatedApiSchema,
          system: `${AI_SYSTEM_PROMPT}\n${projectSummaryText}`,
          prompt: generationPrompt,
        });
        rawGeneratedApi = result.object;
      } catch (llmError) {
        console.error("[Fack AI] LLM call failed:", llmError);
        throw new Error(
          `LLM generation failed: ${llmError instanceof Error ? llmError.message : String(llmError)}`,
        );
      }
    } else {
      rawGeneratedApi = synthesizeFallbackApi(cleanPrompt);
    }

    emitProgress(
      "designing",
      "Designing REST endpoints & schema models",
      "completed",
    );

    // ── Phase 5: Validate and Normalize ───────────────────────────────────
    emitProgress(
      "validating",
      "Validating REST semantics & mock data bindings",
      "active",
    );
    const validation = validateAndNormalizeApi(rawGeneratedApi);

    const validatedApi = validation.normalizedApi ?? rawGeneratedApi;
    emitProgress(
      "validating",
      "Validating REST semantics & mock data bindings",
      "completed",
    );

    // ── Phase 6: Conflict Detection & Change Set ──────────────────────────
    emitProgress(
      "checking_conflicts",
      "Analyzing route collisions & conflict resolution",
      "active",
    );
    const changeSet = buildApiChangeSet(
      validatedApi,
      existingEndpoints,
      existingRoutes,
    );

    emitProgress(
      "checking_conflicts",
      "Analyzing route collisions & conflict resolution",
      "completed",
    );
    emitProgress(
      "complete",
      "API specification generated successfully",
      "completed",
    );

    const durationMs = Date.now() - startTime;

    let proposalId: string | undefined;
    if (taskId && projectId) {
      proposalId = nanoid();
      await db.insert(generationProposals).values({
        id: proposalId,
        taskId,
        projectId,
        baseProjectVersion: expectedVersion,
        payload: JSON.stringify({
          generatedApi: validatedApi,
          changeSet,
        }),
      });
      await db
        .update(generationTasks)
        .set({
          status: "completed",
          providerMetadata: modelUsed,
        })
        .where(eq(generationTasks.id, taskId));
    }

    return {
      success: true,
      generation: validatedApi,
      changeSet,
      conflicts: changeSet.conflicts,
      durationMs,
      modelUsed,
      provider,
      detailedPrompt: detailedSpec.detailedPrompt,
      detailedSummary: detailedSpec.summary,
      proposalId,
      expectedVersion,
    };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : "Unknown generation error";
    emitProgress("complete", `Generation failed: ${errorMessage}`, "failed");
    if (taskId) {
      await db
        .update(generationTasks)
        .set({
          status: "failed",
          error: errorMessage,
        })
        .where(eq(generationTasks.id, taskId));
    }
    throw err;
  }
}
