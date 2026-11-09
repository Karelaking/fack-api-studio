import { describe, expect, it, vi } from "vite-plus/test";

// Server actions call revalidatePath, which requires a Next.js request scope.
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
  unstable_cache: (fn: unknown) => fn,
}));

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { mockStates } from "@/db/schema";
import { createProject, deleteProject } from "../lib/actions/projects";
import { clearCache } from "../lib/cache";
import {
  deleteMockItem,
  getMockCollection,
  getMockItem,
  saveMockItem,
} from "../lib/stateful-mock";

describe("stateful mock storage", () => {
  it("upserts by (project, collection, item key) instead of duplicating rows", async () => {
    const project = await createProject({ name: "Stateful Project" });
    clearCache();

    try {
      await saveMockItem(project.id, "/users", { id: "1", name: "First" }, "1");
      await saveMockItem(
        project.id,
        "/users",
        { id: "1", name: "Updated" },
        "1",
      );

      const rows = await db
        .select()
        .from(mockStates)
        .where(eq(mockStates.projectId, project.id));
      expect(rows).toHaveLength(1);

      const item = await getMockItem(project.id, "/users", "1");
      expect(item).toMatchObject({ id: "1", name: "Updated" });
    } finally {
      await deleteProject(project.id);
      clearCache();
    }
  });

  it("invalidates cached collections on write and delete", async () => {
    const project = await createProject({ name: "Stateful Cache Project" });
    clearCache();

    try {
      await saveMockItem(project.id, "/users", { id: "1", name: "One" }, "1");
      expect(await getMockCollection(project.id, "/users")).toHaveLength(1);

      await saveMockItem(project.id, "/users", { id: "2", name: "Two" }, "2");
      const collected = await getMockCollection(project.id, "/users");
      expect(collected.map((entry) => entry.id).sort()).toEqual(["1", "2"]);

      await deleteMockItem(project.id, "/users", "1");
      expect(await getMockItem(project.id, "/users", "1")).toBeNull();
      const afterDelete = await getMockCollection(project.id, "/users");
      expect(afterDelete.map((entry) => entry.id)).toEqual(["2"]);
    } finally {
      await deleteProject(project.id);
      clearCache();
    }
  });
});
