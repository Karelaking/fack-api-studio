/**
 * Fack CLI - In-Memory Mock Store Service
 *
 * Provides stateful in-memory CRUD persistence across requests during a development session.
 */

import crypto from "node:crypto";
import type { FackRuntimeMockState } from "../../lib/bundle/bundle.type";

export class MockStore {
  private collections: Map<string, Map<string, Record<string, unknown>>> =
    new Map();
  private initialSeedStates: FackRuntimeMockState[] = [];

  constructor(initialStates: FackRuntimeMockState[] = []) {
    this.initialSeedStates = initialStates;
    this.reset();
  }

  public reset(): void {
    this.collections.clear();

    for (const state of this.initialSeedStates) {
      this.set(state.collection, state.itemKey, { ...state.data });
    }
  }

  private getOrCreateCollection(
    name: string,
  ): Map<string, Record<string, unknown>> {
    const normalized = name.toLowerCase().trim();
    let col = this.collections.get(normalized);
    if (!col) {
      col = new Map();
      this.collections.set(normalized, col);
    }
    return col;
  }

  public list(collectionName: string): Record<string, unknown>[] {
    const col = this.getOrCreateCollection(collectionName);
    return Array.from(col.values());
  }

  public get(
    collectionName: string,
    id: string,
  ): Record<string, unknown> | undefined {
    const col = this.getOrCreateCollection(collectionName);
    return col.get(id);
  }

  public create(
    collectionName: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> {
    const col = this.getOrCreateCollection(collectionName);
    const id =
      typeof data.id === "string" || typeof data.id === "number"
        ? String(data.id)
        : crypto.randomUUID();

    const item = {
      ...data,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    col.set(id, item);
    return item;
  }

  public update(
    collectionName: string,
    id: string,
    data: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    const col = this.getOrCreateCollection(collectionName);
    const existing = col.get(id);
    if (!existing) {
      return undefined;
    }

    const updated = {
      ...existing,
      ...data,
      id,
      updatedAt: new Date().toISOString(),
    };

    col.set(id, updated);
    return updated;
  }

  public delete(collectionName: string, id: string): boolean {
    const col = this.getOrCreateCollection(collectionName);
    return col.delete(id);
  }

  public set(
    collectionName: string,
    id: string,
    data: Record<string, unknown>,
  ): void {
    const col = this.getOrCreateCollection(collectionName);
    col.set(id, data);
  }

  public has(collectionName: string, id: string): boolean {
    const col = this.getOrCreateCollection(collectionName);
    return col.has(id);
  }
}
