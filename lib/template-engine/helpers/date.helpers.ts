/**
 * Fack API - Date Helpers
 *
 * Provides date formatting, ISO timestamps, and date calculation utilities.
 */

import { toStr } from "../../utils/coerce";

export const dateHelpers = {
  now: (): string => {
    return new Date().toISOString();
  },

  timestamp: (): number => {
    return Date.now();
  },

  formatDate: (args: unknown[]): string => {
    const strVal = toStr(args[0]);
    const dateInput = strVal ? new Date(strVal) : new Date();
    if (isNaN(dateInput.getTime())) {
      return strVal;
    }
    const format = args[1] ? toStr(args[1]) : "iso";
    if (format === "date") {
      return dateInput.toISOString().split("T")[0];
    }
    if (format === "time") {
      return dateInput.toISOString().split("T")[1].replace("Z", "");
    }
    return dateInput.toISOString();
  },

  addDays: (args: unknown[]): string => {
    const strVal = toStr(args[0]);
    const dateInput = strVal ? new Date(strVal) : new Date();
    const days = Number(args[1]) || 0;
    dateInput.setDate(dateInput.getDate() + days);
    return dateInput.toISOString();
  },
};
