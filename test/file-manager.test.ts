import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { afterAll, beforeAll, describe, expect, it } from "vite-plus/test";

import { db } from "@/db";
import * as schema from "@/db/schema";
import {
  serializeProject,
  deserializeProject,
  writeFackFile,
  readFackFile,
  parseFackFile,
} from "@/lib/file-manager/fack-io";
import {
  addRecentFile,
  readRecents,
  removeRecentFile,
  clearRecentFiles,
} from "@/lib/file-manager/recents-store";
import {
  markProjectDirty,
  markProjectClean,
  isProjectDirty,
  associateProjectFile,
  getProjectFilePath,
  getProjectLastSavedAt,
} from "@/lib/file-manager/dirty-tracker";

describe("File Manager — .fack Project Serialization & Deserialization", () => {
  const tempDir = path.join(os.tmpdir(), `fack-test-${Date.now()}`);
  const testProjectId = "proj_test_fm_1";

  beforeAll(async () => {
    fs.mkdirSync(tempDir, { recursive: true });

    // Seed a test project with endpoints and routes
    await db.insert(schema.projects).values({
      id: testProjectId,
      userId: "system",
      name: "Test API Project",
      slug: "test-api-project",
      description: "A test project for .fack serialization",
    });

    await db.insert(schema.endpoints).values({
      id: "ep_test_fm_1",
      projectId: testProjectId,
      name: "Users",
      basePath: "/users",
    });

    await db.insert(schema.routes).values({
      id: "rt_test_fm_1",
      endpointId: "ep_test_fm_1",
      method: "GET",
      path: "/",
      statusCode: 200,
      responseSchema: JSON.stringify({ type: "array" }),
    });
  });

  afterAll(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup error
    }
  });

  it("serializes a project into a valid FackProjectFile", async () => {
    const fackFile = await serializeProject(testProjectId);

    expect(fackFile.format).toBe("fack-project");
    expect(fackFile.fackVersion).toBe(1);
    expect(fackFile.metadata.name).toBe("Test API Project");
    expect(fackFile.metadata.slug).toBe("test-api-project");
    expect(fackFile.project.id).toBe(testProjectId);
    expect(fackFile.endpoints.length).toBe(1);
    expect(fackFile.routes.length).toBe(1);
    expect(fackFile.routes[0].method).toBe("GET");
  });

  it("writes and reads .fack file to and from disk", async () => {
    const filePath = path.join(tempDir, "test-api-project.fack");
    const serialized = await serializeProject(testProjectId, filePath);

    await writeFackFile(filePath, serialized);
    expect(fs.existsSync(filePath)).toBe(true);

    const readBack = await readFackFile(filePath);
    expect(readBack.metadata.name).toBe("Test API Project");
    expect(readBack.project.id).toBe(testProjectId);
    expect(readBack.endpoints.length).toBe(1);
  });

  it("deserializes a FackProjectFile into the database", async () => {
    const newProjectId = "proj_test_deserialized_2";
    const samplePayload = {
      fackVersion: 1,
      format: "fack-project",
      savedAt: new Date().toISOString(),
      metadata: {
        name: "Imported API",
        slug: "imported-api",
        description: "An imported project",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      project: {
        id: newProjectId,
        userId: "system",
        name: "Imported API",
        slug: "imported-api",
        description: "An imported project",
        createdAt: new Date(),
        updatedAt: new Date(),
        isLoggingEnabled: true,
        isCachingEnabled: true,
        version: 1,
      },
      endpoints: [
        {
          id: "ep_imported_1",
          projectId: newProjectId,
          name: "Orders",
          basePath: "/orders",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ],
      routes: [
        {
          id: "rt_imported_1",
          endpointId: "ep_imported_1",
          method: "POST",
          path: "/",
          statusCode: 201,
          responseSchema: "{}",
          createdAt: new Date(),
          updatedAt: new Date(),
          isAuthRequired: false,
          isEnabled: true,
        },
      ],
      canvasState: null,
      scenarios: [],
      projectRevisions: [],
      generationTasks: [],
      generationProposals: [],
      mockStates: [],
      webhooks: [],
      notes: [],
    };

    const { project, rowCounts } = await deserializeProject(samplePayload);
    expect(project.id).toBe(newProjectId);
    expect(project.slug).toBe("imported-api");
    expect(rowCounts.projects).toBe(1);
    expect(rowCounts.endpoints).toBe(1);
    expect(rowCounts.routes).toBe(1);
  });

  it("rejects corrupted or invalid .fack files", () => {
    expect(() => parseFackFile(null)).toThrow();
    expect(() => parseFackFile({ format: "not-fack" })).toThrow();
    expect(() =>
      parseFackFile({ format: "fack-project", fackVersion: 99 }),
    ).toThrow();
  });
});

describe("File Manager — Recents Store", () => {
  beforeAll(() => {
    clearRecentFiles();
  });

  afterAll(() => {
    clearRecentFiles();
  });

  it("adds and reads recent files", () => {
    const samplePath = path.resolve("./data/projects/sample.fack");
    addRecentFile(samplePath, "Sample Project", "sample-project");

    const recents = readRecents();
    expect(recents.length).toBeGreaterThanOrEqual(1);
    expect(recents[0].projectName).toBe("Sample Project");
    expect(recents[0].slug).toBe("sample-project");
  });

  it("removes a file from recents", () => {
    const samplePath = path.resolve("./data/projects/sample.fack");
    removeRecentFile(samplePath);

    const recents = readRecents();
    expect(recents.some((r) => r.filePath === samplePath)).toBe(false);
  });
});

describe("File Manager — Dirty Tracker", () => {
  const pId = "proj_dirty_test";
  const pPath = path.resolve("./data/projects/dirty-test.fack");

  it("tracks dirty state and file association", () => {
    expect(isProjectDirty(pId)).toBe(false);

    associateProjectFile(pId, pPath);
    expect(getProjectFilePath(pId)).toBe(pPath);

    markProjectDirty(pId);
    expect(isProjectDirty(pId)).toBe(true);

    const savedAt = new Date().toISOString();
    markProjectClean(pId, savedAt);
    expect(isProjectDirty(pId)).toBe(false);
    expect(getProjectLastSavedAt(pId)).toBe(savedAt);
  });
});
