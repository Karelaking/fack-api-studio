/**
 * Fack API - Mock State Helpers
 *
 * Provides read-only access to mock store state collections (lookup, count).
 */

import type { TemplateContext } from "../types";
import { toStr } from "../../utils/coerce";

export const stateHelpers = {
  lookup: (args: unknown[], context: TemplateContext): unknown => {
    const collection = toStr(args[0]).toLowerCase().trim();
    const id = toStr(args[1]);

    if (!collection || !id || !context.state) {
      return null;
    }

    if (typeof context.state.lookup === "function") {
      const found = context.state.lookup(collection, id);
      return found !== undefined ? found : null;
    }

    if (context.state.collections && context.state.collections[collection]) {
      const list = context.state.collections[collection];
      const found = list.find((item) => toStr(item.id) === id);
      return found !== undefined ? found : null;
    }

    const directCol = context.state[collection];
    if (Array.isArray(directCol)) {
      const found = directCol.find(
        (item) =>
          item &&
          typeof item === "object" &&
          toStr((item as Record<string, unknown>).id) === id,
      );
      return found !== undefined ? found : null;
    }

    return null;
  },

  count: (args: unknown[], context: TemplateContext): number => {
    const collection = toStr(args[0]).toLowerCase().trim();

    if (!collection || !context.state) {
      return 0;
    }

    if (typeof context.state.count === "function") {
      return context.state.count(collection);
    }

    if (context.state.collections && context.state.collections[collection]) {
      return context.state.collections[collection].length;
    }

    const directCol = context.state[collection];
    if (Array.isArray(directCol)) {
      return directCol.length;
    }

    return 0;
  },
};
