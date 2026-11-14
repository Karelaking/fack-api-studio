/**
 * Fack API - String Helpers
 *
 * Provides string transformations and formatting utilities.
 */

import { toStr } from "../../utils/coerce";

export const stringHelpers = {
  uppercase: (args: unknown[]): string => {
    return toStr(args[0]).toUpperCase();
  },

  lowercase: (args: unknown[]): string => {
    return toStr(args[0]).toLowerCase();
  },

  trim: (args: unknown[]): string => {
    return toStr(args[0]).trim();
  },

  concat: (args: unknown[]): string => {
    return args.map((a) => toStr(a)).join("");
  },

  replace: (args: unknown[]): string => {
    const str = toStr(args[0]);
    const search = toStr(args[1]);
    const replacement = toStr(args[2]);
    if (!search) return str;
    return str.split(search).join(replacement);
  },

  substring: (args: unknown[]): string => {
    const str = toStr(args[0]);
    const start = Number(args[1]) || 0;
    const end = args[2] !== undefined ? Number(args[2]) : undefined;
    return str.substring(start, end);
  },

  length: (args: unknown[]): number => {
    const val = args[0];
    if (typeof val === "string" || Array.isArray(val)) {
      return val.length;
    }
    if (typeof val === "object" && val !== null) {
      return Object.keys(val).length;
    }
    return 0;
  },
};
