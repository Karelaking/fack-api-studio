/**
 * Fack API - Logic, Equality & Utility Helpers
 *
 * Implements truthiness checks, equality, comparison, boolean logic, and default fallbacks.
 */

export function isTruthy(val: unknown): boolean {
  if (val === null || val === undefined || val === false) {
    return false;
  }
  if (typeof val === "number" && (val === 0 || isNaN(val))) {
    return false;
  }
  if (typeof val === "string" && val.trim() === "") {
    return false;
  }
  if (Array.isArray(val) && val.length === 0) {
    return false;
  }
  return true;
}

export const utilityHelpers = {
  default: (args: unknown[]): unknown => {
    const val = args[0];
    const fallback = args[1];
    if (val === null || val === undefined || val === "") {
      return fallback;
    }
    return val;
  },

  coalesce: (args: unknown[]): unknown => {
    for (const arg of args) {
      if (arg !== null && arg !== undefined && arg !== "") {
        return arg;
      }
    }
    return undefined;
  },

  eq: (args: unknown[]): boolean => {
    const a = args[0];
    const b = args[1];
    // Allow loose string-number equality e.g. "200" === 200
    if (typeof a === "number" || typeof b === "number") {
      return Number(a) === Number(b);
    }
    return a === b;
  },

  neq: (args: unknown[]): boolean => {
    const a = args[0];
    const b = args[1];
    if (typeof a === "number" || typeof b === "number") {
      return Number(a) !== Number(b);
    }
    return a !== b;
  },

  gt: (args: unknown[]): boolean => {
    return Number(args[0]) > Number(args[1]);
  },

  gte: (args: unknown[]): boolean => {
    return Number(args[0]) >= Number(args[1]);
  },

  lt: (args: unknown[]): boolean => {
    return Number(args[0]) < Number(args[1]);
  },

  lte: (args: unknown[]): boolean => {
    return Number(args[0]) <= Number(args[1]);
  },

  and: (args: unknown[]): boolean => {
    if (args.length === 0) return false;
    return args.every((a) => isTruthy(a));
  },

  or: (args: unknown[]): boolean => {
    return args.some((a) => isTruthy(a));
  },

  not: (args: unknown[]): boolean => {
    return !isTruthy(args[0]);
  },
};
