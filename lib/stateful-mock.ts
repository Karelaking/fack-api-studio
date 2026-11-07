import { db } from "@/db";
import { mockStates } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import {
  getCachedMockCollection,
  setCachedMockCollection,
  getCachedMockItem,
  setCachedMockItem,
  invalidateMockCollection,
  invalidateMockItem,
} from "@/lib/cache";

export interface MockStateItem {
  id: string; // The primary key (from the payload, or generated)
  [key: string]: unknown;
}

/**
 * Persist a new item into the stateful mock storage.
 *
 * A stateful mock collection is read on every request to its list endpoint
 * (merged into generated data), so reads are cached in-process and writes
 * invalidate the affected collection. Without this, each list request paid a
 * full-table scan plus a `JSON.parse` per row.
 */
export async function saveMockItem(
  projectId: string,
  collection: string,
  payload: Record<string, unknown>,
  itemKey?: string,
): Promise<MockStateItem> {
  const payloadId = typeof payload.id === "string" ? payload.id : undefined;
  const finalKey = itemKey ?? payloadId ?? nanoid();
  const finalPayload = { ...payload, id: finalKey };
  const serialized = JSON.stringify(finalPayload);

  // Single atomic upsert on the unique (project, collection, item_key) index.
  // The previous select-then-insert paid two round-trips and could insert
  // duplicates when two requests for the same item raced.
  await db
    .insert(mockStates)
    .values({
      id: nanoid(),
      projectId,
      collection,
      itemKey: finalKey,
      data: serialized,
    })
    .onConflictDoUpdate({
      target: [mockStates.projectId, mockStates.collection, mockStates.itemKey],
      set: {
        data: serialized,
        updatedAt: new Date(),
      },
    });

  // The collection listing changes; the individual item is now known.
  invalidateMockCollection(projectId, collection);
  setCachedMockItem(projectId, collection, finalKey, finalPayload);

  return finalPayload;
}

/**
 * Retrieve a specific item from state.
 */
export async function getMockItem(
  projectId: string,
  collection: string,
  itemKey: string,
): Promise<MockStateItem | null> {
  const cached = getCachedMockItem(projectId, collection, itemKey);
  if (cached !== undefined) {
    return cached as MockStateItem;
  }

  // Avoid a DB round-trip when the collection listing is already cached.
  const cachedCollection = getCachedMockCollection(projectId, collection);
  if (cachedCollection) {
    const match = cachedCollection.find(
      (item) =>
        item &&
        typeof item === "object" &&
        String((item as MockStateItem).id) === itemKey,
    );
    if (match) {
      setCachedMockItem(projectId, collection, itemKey, match);
      return match as MockStateItem;
    }
  }

  const row = await db.query.mockStates.findFirst({
    where: and(
      eq(mockStates.projectId, projectId),
      eq(mockStates.collection, collection),
      eq(mockStates.itemKey, itemKey),
    ),
  });

  if (!row) return null;

  try {
    const parsed = JSON.parse(row.data) as MockStateItem;
    setCachedMockItem(projectId, collection, itemKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Retrieve all items for a collection.
 */
export async function getMockCollection(
  projectId: string,
  collection: string,
): Promise<MockStateItem[]> {
  const cached = getCachedMockCollection(projectId, collection);
  if (cached) {
    return cached as MockStateItem[];
  }

  const rows = await db.query.mockStates.findMany({
    where: and(
      eq(mockStates.projectId, projectId),
      eq(mockStates.collection, collection),
    ),
    orderBy: (states, { desc }) => [desc(states.createdAt)],
  });

  const items = rows
    .map((r) => {
      try {
        return JSON.parse(r.data) as MockStateItem;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as MockStateItem[];

  setCachedMockCollection(projectId, collection, items);
  return items;
}

/**
 * Delete an item from state.
 */
export async function deleteMockItem(
  projectId: string,
  collection: string,
  itemKey: string,
): Promise<boolean> {
  await db
    .delete(mockStates)
    .where(
      and(
        eq(mockStates.projectId, projectId),
        eq(mockStates.collection, collection),
        eq(mockStates.itemKey, itemKey),
      ),
    );

  invalidateMockCollection(projectId, collection);
  invalidateMockItem(projectId, collection, itemKey);
  // Simple check for rows affected isn't always easy in SQLite drivers but we just return true.
  return true;
}
