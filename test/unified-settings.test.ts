import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test";

import {
  readWorkspaceConfig,
  writeWorkspaceConfig,
} from "../lib/storage/config-store";
import { slugifyPath } from "../lib/utils";

const ORIGINAL_FACK_DATA_DIR = process.env.FACK_DATA_DIR;
let tempDir: string;

beforeEach(() => {
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "fack-unified-settings-"));
  process.env.FACK_DATA_DIR = tempDir;
});

afterEach(() => {
  if (ORIGINAL_FACK_DATA_DIR === undefined) {
    delete process.env.FACK_DATA_DIR;
  } else {
    process.env.FACK_DATA_DIR = ORIGINAL_FACK_DATA_DIR;
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

describe("unified settings architecture", () => {
  it("persists workspace configuration updates correctly", () => {
    writeWorkspaceConfig({ workspaceName: "Staging Engine Cluster" });
    const config = readWorkspaceConfig();
    expect(config.workspaceName).toBe("Staging Engine Cluster");
  });

  it("normalizes project slugs during configuration updates", () => {
    expect(slugifyPath("My New Project 123")).toBe("my-new-project-123");
    expect(slugifyPath("api/v1/users")).toBe("api/v1/users");
    expect(slugifyPath("api//v2///auth")).toBe("api/v2/auth");
  });

  it("handles storage backup timestamp updates", () => {
    const nowIso = new Date().toISOString();
    writeWorkspaceConfig({ lastBackupAt: nowIso });
    const config = readWorkspaceConfig();
    expect(config.lastBackupAt).toBe(nowIso);
  });
});
