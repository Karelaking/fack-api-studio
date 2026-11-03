import { NextRequest, NextResponse } from "next/server";
import {
  getOpenProjectsSummary,
  openProjectFile,
  saveProjectToFile,
  getDefaultProjectsDirectory,
} from "@/lib/file-manager/file-manager.service";
import {
  readRecents,
  removeRecentFile,
  clearRecentFiles,
} from "@/lib/file-manager/recents-store";
import {
  markProjectDirty,
  disassociateProjectFile,
} from "@/lib/file-manager/dirty-tracker";
import {
  deserializeProject,
  serializeProject,
} from "@/lib/file-manager/fack-io";
import { storageConnection } from "@/db";
import {
  authErrorResponse,
  requireProjectAccess,
  requireUserId,
} from "@/lib/auth";

/**
 * /api/file-manager — Endpoint for the local file management system.
 *
 * GET  → Retrieves open projects, recent files, and local default path.
 * POST → Handles open, save, import, export, and recents management.
 */

export async function GET(): Promise<NextResponse> {
  if (!storageConnection.features.fileManager) {
    return NextResponse.json(
      { error: "File manager operations are disabled in this storage mode." },
      { status: 403 },
    );
  }

  try {
    await requireUserId();
    const [openProjects, recents] = await Promise.all([
      getOpenProjectsSummary(),
      Promise.resolve(readRecents()),
    ]);

    return NextResponse.json({
      openProjects,
      recents,
      defaultDirectory: getDefaultProjectsDirectory(),
      isLocalMode: storageConnection.mode === "local",
    });
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message =
      error instanceof Error
        ? error.message
        : "Failed to fetch file manager status";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!storageConnection.features.fileManager) {
    return NextResponse.json(
      { error: "File manager operations are disabled in this storage mode." },
      { status: 403 },
    );
  }

  try {
    await requireUserId();
    const body = await request.json();
    const action = body?.action as string;

    switch (action) {
      case "open": {
        const filePath = body?.filePath as string;
        if (!filePath) {
          return NextResponse.json(
            { error: "Missing filePath" },
            { status: 400 },
          );
        }
        const { project, fackFile } = await openProjectFile(filePath);
        return NextResponse.json({ success: true, project, fackFile });
      }

      case "save": {
        const projectId = body?.projectId as string;
        const targetPath = body?.targetPath as string | undefined;
        if (!projectId) {
          return NextResponse.json(
            { error: "Missing projectId" },
            { status: 400 },
          );
        }
        await requireProjectAccess(projectId);
        const result = await saveProjectToFile(projectId, targetPath);
        return NextResponse.json({ success: true, ...result });
      }

      case "import-json": {
        const data = body?.data;
        if (!data) {
          return NextResponse.json(
            { error: "Missing data payload" },
            { status: 400 },
          );
        }
        const { project, rowCounts } = await deserializeProject(data);
        return NextResponse.json({ success: true, project, rowCounts });
      }

      case "export-json": {
        const projectId = body?.projectId as string;
        if (!projectId) {
          return NextResponse.json(
            { error: "Missing projectId" },
            { status: 400 },
          );
        }
        await requireProjectAccess(projectId);
        const fackFile = await serializeProject(projectId);
        return new NextResponse(JSON.stringify(fackFile, null, 2), {
          headers: {
            "Content-Type": "application/json",
            "Content-Disposition": `attachment; filename="${fackFile.metadata.slug}.fack"`,
          },
        });
      }

      case "mark-dirty": {
        const projectId = body?.projectId as string;
        if (projectId) {
          await requireProjectAccess(projectId);
          markProjectDirty(projectId);
        }
        return NextResponse.json({ success: true });
      }

      case "close": {
        const projectId = body?.projectId as string;
        if (projectId) {
          await requireProjectAccess(projectId);
          disassociateProjectFile(projectId);
        }
        return NextResponse.json({ success: true });
      }

      case "remove-recent": {
        const filePath = body?.filePath as string;
        if (filePath) {
          removeRecentFile(filePath);
        }
        return NextResponse.json({ success: true, recents: readRecents() });
      }

      case "clear-recents": {
        clearRecentFiles();
        return NextResponse.json({ success: true, recents: [] });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: "${action}"` },
          { status: 400 },
        );
    }
  } catch (error) {
    const authResponse = authErrorResponse(error);
    if (authResponse) return authResponse;

    const message =
      error instanceof Error ? error.message : "File operation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
