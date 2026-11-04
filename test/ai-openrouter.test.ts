import { describe, it, expect, beforeEach, afterEach } from "vite-plus/test";
import {
  resolveAiModel,
  generateApiSpecification,
} from "../lib/ai/architect.service";
import { agentTools } from "../lib/ai/tools.service";

describe("AI API Architect — OpenRouter Provider & Agent Workflow", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_MODEL;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe("resolveAiModel() Provider Resolution", () => {
    it("should prioritize OpenRouter when OPENROUTER_API_KEY is configured", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-key";
      process.env.GEMINI_API_KEY = "mock-gemini-key";
      process.env.OPENAI_API_KEY = "mock-openai-key";

      const resolved = resolveAiModel();

      expect(resolved).toBeDefined();
      expect(resolved?.provider).toBe("openrouter");
      expect(resolved?.name).toBe("openrouter/anthropic/claude-3.5-sonnet");
      expect(resolved?.model).toBeDefined();
    });

    it("should honor OPENROUTER_MODEL environment variable when specified", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-key";
      process.env.OPENROUTER_MODEL = "meta-llama/llama-3.3-70b-instruct";

      const resolved = resolveAiModel();

      expect(resolved).toBeDefined();
      expect(resolved?.provider).toBe("openrouter");
      expect(resolved?.name).toBe(
        "openrouter/meta-llama/llama-3.3-70b-instruct",
      );
    });

    it("should honor requested model override passed explicitly to resolveAiModel", () => {
      process.env.OPENROUTER_API_KEY = "sk-or-v1-mock-key";
      process.env.OPENROUTER_MODEL = "anthropic/claude-3.5-sonnet";

      const resolved = resolveAiModel("deepseek/deepseek-chat");

      expect(resolved).toBeDefined();
      expect(resolved?.provider).toBe("openrouter");
      expect(resolved?.name).toBe("openrouter/deepseek/deepseek-chat");
    });

    it("should fall back to Google Gemini when OPENROUTER_API_KEY is missing", () => {
      process.env.GEMINI_API_KEY = "mock-gemini-key";

      const resolved = resolveAiModel();

      expect(resolved).toBeDefined();
      expect(resolved?.provider).toBe("google");
      expect(resolved?.name).toContain("gemini-2.5-flash");
    });

    it("should fall back to OpenAI when OpenRouter and Gemini keys are missing", () => {
      process.env.OPENAI_API_KEY = "mock-openai-key";

      const resolved = resolveAiModel();

      expect(resolved).toBeDefined();
      expect(resolved?.provider).toBe("openai");
      expect(resolved?.name).toContain("gpt-4o-mini");
    });

    it("should return undefined when no AI provider keys are configured (offline mode)", () => {
      const resolved = resolveAiModel();
      expect(resolved).toBeUndefined();
    });
  });

  describe("Agent Workflow Execution (Offline Mode)", () => {
    it("should execute full multi-stage pipeline using deterministic synthesis when no keys are set", async () => {
      const result = await generateApiSpecification({
        prompt:
          "Create an inventory management service with products and stock levels",
      });

      expect(result.success).toBe(true);
      expect(result.provider).toBe("fallback");
      expect(result.modelUsed).toBe("deterministic-architect-engine");
      expect(result.generation).toBeDefined();
      expect(result.generation?.endpoints.length).toBeGreaterThan(0);
      expect(result.changeSet).toBeDefined();
    });
  });

  describe("Vercel AI SDK Tool Definitions", () => {
    it("should provide official Vercel AI SDK tools with description, parameters, and execute", () => {
      const toolNames = Object.keys(agentTools) as Array<
        keyof typeof agentTools
      >;

      expect(toolNames.length).toBe(11);
      for (const name of toolNames) {
        const tool = agentTools[name];
        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe("string");
        expect(tool.parameters).toBeDefined();
        expect(typeof tool.execute).toBe("function");
      }
    });
  });
});
