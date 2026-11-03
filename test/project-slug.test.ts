import { describe, expect, it } from "vite-plus/test";
import {
  normalizeSlug,
  getProjectUrl,
  parseProjectPath,
  isProjectSubpage,
} from "@/lib/utils/project-slug";

describe("project-slug utility", () => {
  describe("normalizeSlug", () => {
    it("should strip leading, trailing, and duplicate slashes", () => {
      expect(normalizeSlug("/the-project-slug//")).toBe("the-project-slug");
      expect(normalizeSlug("//team///api//")).toBe("team/api");
      expect(normalizeSlug("clean-slug")).toBe("clean-slug");
      expect(normalizeSlug("")).toBe("");
    });
  });

  describe("getProjectUrl", () => {
    it("should generate standardized single-slash URLs", () => {
      expect(getProjectUrl("the-project-slug")).toBe(
        "/projects/the-project-slug/canvas",
      );
      expect(getProjectUrl("/the-project-slug//")).toBe(
        "/projects/the-project-slug/canvas",
      );
      expect(getProjectUrl("the-project-slug", "endpoints")).toBe(
        "/projects/the-project-slug/endpoints",
      );
      expect(getProjectUrl("the-project-slug", "settings")).toBe(
        "/projects/the-project-slug/settings",
      );
      expect(getProjectUrl("the-project-slug", "logs")).toBe(
        "/projects/the-project-slug/logs",
      );
      expect(getProjectUrl("the-project-slug", "notes")).toBe(
        "/projects/the-project-slug/notes",
      );
    });

    it("should fallback to canvas when subpage is unrecognized", () => {
      expect(getProjectUrl("the-project-slug", "invalid-subpage")).toBe(
        "/projects/the-project-slug/canvas",
      );
    });
  });

  describe("parseProjectPath", () => {
    it("should parse standard slug and subpage segments", () => {
      const parsed = parseProjectPath(["api", "v1", "canvas"]);
      expect(parsed.projectSlug).toBe("api/v1");
      expect(parsed.subpage).toBe("canvas");
    });

    it("should sanitize and filter empty segments from consecutive slashes", () => {
      const parsed = parseProjectPath(["", "the-project-slug", "", "canvas"]);
      expect(parsed.projectSlug).toBe("the-project-slug");
      expect(parsed.subpage).toBe("canvas");
    });

    it("should handle bare project slug without subpage", () => {
      const parsed = parseProjectPath(["", "the-project-slug", ""]);
      expect(parsed.projectSlug).toBe("the-project-slug");
      expect(parsed.subpage).toBe("");
    });

    it("should return empty for empty input", () => {
      expect(parseProjectPath([])).toEqual({ projectSlug: "", subpage: "" });
      expect(parseProjectPath(["", "   "])).toEqual({
        projectSlug: "",
        subpage: "",
      });
    });
  });

  describe("isProjectSubpage", () => {
    it("should correctly identify valid subpages", () => {
      expect(isProjectSubpage("canvas")).toBe(true);
      expect(isProjectSubpage("endpoints")).toBe(true);
      expect(isProjectSubpage("logs")).toBe(true);
      expect(isProjectSubpage("notes")).toBe(true);
      expect(isProjectSubpage("settings")).toBe(true);

      expect(isProjectSubpage("preview")).toBe(false);
      expect(isProjectSubpage("unknown")).toBe(false);
    });
  });
});
