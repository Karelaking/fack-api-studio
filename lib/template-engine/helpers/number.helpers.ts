/**
 * Fack API - Number & Math Helpers
 *
 * Provides arithmetic and mathematical utilities for templates.
 */

export const numberHelpers = {
  add: (args: unknown[]): number => {
    return args.reduce<number>((sum, val) => sum + (Number(val) || 0), 0);
  },

  subtract: (args: unknown[]): number => {
    const first = Number(args[0]) || 0;
    if (args.length === 1) return -first;
    return args
      .slice(1)
      .reduce<number>((diff, val) => diff - (Number(val) || 0), first);
  },

  multiply: (args: unknown[]): number => {
    if (args.length === 0) return 0;
    return args.reduce<number>((prod, val) => prod * (Number(val) || 0), 1);
  },

  divide: (args: unknown[]): number => {
    const first = Number(args[0]) || 0;
    const second = Number(args[1]);
    if (second === 0 || isNaN(second)) {
      return 0;
    }
    return first / second;
  },

  round: (args: unknown[]): number => {
    const val = Number(args[0]) || 0;
    const decimals = Number(args[1]) || 0;
    if (decimals <= 0) {
      return Math.round(val);
    }
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
  },

  floor: (args: unknown[]): number => {
    return Math.floor(Number(args[0]) || 0);
  },

  ceil: (args: unknown[]): number => {
    return Math.ceil(Number(args[0]) || 0);
  },

  abs: (args: unknown[]): number => {
    return Math.abs(Number(args[0]) || 0);
  },
};
