import fs from "node:fs";
import path from "node:path";
import { eq, inArray, getTableColumns, getTableName } from "drizzle-orm";
import type { SQLiteTable } from "drizzle-orm/sqlite-core";
import type { InValue } from "@libsql/client";

import { db } from "@/db";
import * as schema from "@/db/schema";
import { type FackProjectFile, FACK_FILE_VERSION } from "./file-manager.type";

const DATE_FIELDS = new Set(["createdAt", "updatedAt"]);
const BATCH_SIZE = 100;

function toDriverValues(
  columns: Array<{ key: string; name: string }>,
  row: Record<string, unknown>,
): InValue[] {
  return columns.map(({ key }) => {
    let value: unknown = row[key];

    if (
      DATE_FIELDS.has(key) &&
      typeof value === "string" &&
      !Number.isNaN(Date.parse(value))
    ) {
      value = new Date(value);
    }

    if (value === null || value === undefined) return null;
    if (value instanceof Date) {
      return Math.floor(value.getTime() / 1000);
    }
    if (typeof value === "boolean") return value ? 1 : 0;
    return value as InValue;
  });
}

function quoteIdent(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

function buildUpsertSql(tableName: string, columns: string[]): string {
  const idColumn = columns.includes("id") ? "id" : null;
  const columnList = columns.map(quoteIdent).join(", ");
  const placeholders = columns.map(() => "?").join(", ");

  if (idColumn) {
    const updates = columns
      .filter((column) => column !== idColumn)
      .map((column) => `${quoteIdent(column)}=excluded.${quoteIdent(column)}`)
      .join(", ");
    return `INSERT INTO ${quoteIdent(tableName)} (${columnList}) VALUES (${placeholders}) ON CONFLICT(${quoteIdent(idColumn)}) DO UPDATE SET ${updates}`;
  }

  return `INSERT INTO ${quoteIdent(tableName)} (${columnList}) VALUES (${placeholders})`;
}

/**
 * Extracts a complete project and all its child relations into a FackProjectFile.
 */
export async function serializeProject(
  projectId: string,
  filePath?: string,
): Promise<FackProjectFile> {
  const project = await db.query.projects.findFirst({
    where: eq(schema.projects.id, projectId),
  });

  if (!project) {
    throw new Error(`Project with ID "${projectId}" not found.`);
  }

  const endpoints = await db
    .select()
    .from(schema.endpoints)
    .where(eq(schema.endpoints.projectId, projectId));

  const endpointIds = endpoints.map((ep) => ep.id);

  const routes =
    endpointIds.length > 0
      ? await db
          .select()
          .from(schema.routes)
          .where(inArray(schema.routes.endpointId, endpointIds))
      : [];

  const routeIds = routes.map((r) => r.id);

  const webhooks =
    routeIds.length > 0
      ? await db
          .select()
          .from(schema.webhooks)
          .where(inArray(schema.webhooks.routeId, routeIds))
      : [];

  const [canvasState] = await db
    .select()
    .from(schema.canvasStates)
    .where(eq(schema.canvasStates.projectId, projectId));

  const scenarios = await db
    .select()
    .from(schema.scenarios)
    .where(eq(schema.scenarios.projectId, projectId));

  const projectRevisions = await db
    .select()
    .from(schema.projectRevisions)
    .where(eq(schema.projectRevisions.projectId, projectId));

  const generationTasks = await db
    .select()
    .from(schema.generationTasks)
    .where(eq(schema.generationTasks.projectId, projectId));

  const generationProposals = await db
    .select()
    .from(schema.generationProposals)
    .where(eq(schema.generationProposals.projectId, projectId));

  const mockStates = await db
    .select()
    .from(schema.mockStates)
    .where(eq(schema.mockStates.projectId, projectId));

  const notes = await db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.projectId, projectId));

  return {
    fackVersion: FACK_FILE_VERSION,
    format: "fack-project",
    savedAt: new Date().toISOString(),
    filePath,
    metadata: {
      name: project.name,
      slug: project.slug,
      description: project.description ?? "",
      createdAt:
        project.createdAt instanceof Date
          ? project.createdAt.toISOString()
          : new Date(project.createdAt).toISOString(),
      updatedAt:
        project.updatedAt instanceof Date
          ? project.updatedAt.toISOString()
          : new Date(project.updatedAt).toISOString(),
    },
    project,
    endpoints,
    routes,
    canvasState: canvasState ?? null,
    scenarios,
    projectRevisions,
    generationTasks,
    generationProposals,
    mockStates,
    webhooks,
    notes,
  };
}

/**
 * Validates and parses raw JSON or an object into a FackProjectFile.
 */
export function parseFackFile(data: unknown): FackProjectFile {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid .fack file: must be a JSON object.");
  }

  const candidate = data as Partial<FackProjectFile>;

  if (candidate.format !== "fack-project") {
    throw new Error('Invalid file format: format must be "fack-project".');
  }

  if (candidate.fackVersion !== FACK_FILE_VERSION) {
    throw new Error(
      `Unsupported .fack file version: expected ${FACK_FILE_VERSION}, found ${candidate.fackVersion}.`,
    );
  }

  if (!candidate.project || !candidate.project.id || !candidate.project.slug) {
    throw new Error("Invalid .fack file: missing valid project definition.");
  }

  return {
    fackVersion: FACK_FILE_VERSION,
    format: "fack-project",
    savedAt: candidate.savedAt ?? new Date().toISOString(),
    filePath: candidate.filePath,
    metadata: candidate.metadata ?? {
      name: candidate.project.name,
      slug: candidate.project.slug,
      description: candidate.project.description ?? "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    project: candidate.project,
    endpoints: Array.isArray(candidate.endpoints) ? candidate.endpoints : [],
    routes: Array.isArray(candidate.routes) ? candidate.routes : [],
    canvasState: candidate.canvasState ?? null,
    scenarios: Array.isArray(candidate.scenarios) ? candidate.scenarios : [],
    projectRevisions: Array.isArray(candidate.projectRevisions)
      ? candidate.projectRevisions
      : [],
    generationTasks: Array.isArray(candidate.generationTasks)
      ? candidate.generationTasks
      : [],
    generationProposals: Array.isArray(candidate.generationProposals)
      ? candidate.generationProposals
      : [],
    mockStates: Array.isArray(candidate.mockStates) ? candidate.mockStates : [],
    webhooks: Array.isArray(candidate.webhooks) ? candidate.webhooks : [],
    notes: Array.isArray(candidate.notes) ? candidate.notes : [],
  };
}

/**
 * Imports a FackProjectFile into the active working SQLite database.
 * Upserts project and all child tables.
 */
export async function deserializeProject(
  data: unknown,
): Promise<{ project: schema.Project; rowCounts: Record<string, number> }> {
  const fackFile = parseFackFile(data);
  const rowCounts: Record<string, number> = {};

  const tablesWithRows: Array<{
    table: SQLiteTable;
    rows: Array<Record<string, unknown>>;
  }> = [
    {
      table: schema.projects,
      rows: [fackFile.project as Record<string, unknown>],
    },
    {
      table: schema.endpoints,
      rows: fackFile.endpoints as Array<Record<string, unknown>>,
    },
    {
      table: schema.canvasStates,
      rows: fackFile.canvasState
        ? [fackFile.canvasState as Record<string, unknown>]
        : [],
    },
    {
      table: schema.scenarios,
      rows: fackFile.scenarios as Array<Record<string, unknown>>,
    },
    {
      table: schema.projectRevisions,
      rows: fackFile.projectRevisions as Array<Record<string, unknown>>,
    },
    {
      table: schema.generationTasks,
      rows: fackFile.generationTasks as Array<Record<string, unknown>>,
    },
    {
      table: schema.generationProposals,
      rows: fackFile.generationProposals as Array<Record<string, unknown>>,
    },
    {
      table: schema.routes,
      rows: fackFile.routes as Array<Record<string, unknown>>,
    },
    {
      table: schema.webhooks,
      rows: fackFile.webhooks as Array<Record<string, unknown>>,
    },
    {
      table: schema.mockStates,
      rows: fackFile.mockStates as Array<Record<string, unknown>>,
    },
    {
      table: schema.notes,
      rows: fackFile.notes as Array<Record<string, unknown>>,
    },
  ];

  for (const { table, rows } of tablesWithRows) {
    const tableName = getTableName(table);
    if (rows.length === 0) continue;

    const columns = Object.entries(
      getTableColumns(table) as Record<string, { name: string }>,
    ).map(([key, column]) => ({ key, name: column.name }));

    const sql = buildUpsertSql(
      tableName,
      columns.map((column) => column.name),
    );

    let written = 0;
    for (let start = 0; start < rows.length; start += BATCH_SIZE) {
      const batch = rows.slice(start, start + BATCH_SIZE);
      const statements = batch.map((row) => ({
        sql,
        args: toDriverValues(columns, row),
      }));
      await db.$client.batch(statements, "write");
      written += batch.length;
    }

    rowCounts[tableName] = written;
  }

  // Refetch the persisted project
  const loadedProject = await db.query.projects.findFirst({
    where: eq(schema.projects.id, fackFile.project.id),
  });

  if (!loadedProject) {
    throw new Error("Failed to load project after deserialization.");
  }

  return { project: loadedProject, rowCounts };
}

/**
 * Writes a FackProjectFile to disk atomically (temp file write then rename).
 */
export async function writeFackFile(
  filePath: string,
  fileData: FackProjectFile,
): Promise<void> {
  const resolvedPath = path.resolve(filePath);
  const dir = path.dirname(resolvedPath);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const jsonContent = JSON.stringify(fileData, null, 2);
  const tempPath = `${resolvedPath}.${process.pid}.${Date.now()}.tmp`;

  await fs.promises.writeFile(tempPath, jsonContent, "utf-8");
  await fs.promises.rename(tempPath, resolvedPath);
}

/**
 * Reads and parses a `.fack` file from disk.
 */
export async function readFackFile(filePath: string): Promise<FackProjectFile> {
  const resolvedPath = path.resolve(filePath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`File not found: ${resolvedPath}`);
  }

  const content = await fs.promises.readFile(resolvedPath, "utf-8");
  const rawData: unknown = JSON.parse(content);
  const parsed = parseFackFile(rawData);
  parsed.filePath = resolvedPath;
  return parsed;
}
