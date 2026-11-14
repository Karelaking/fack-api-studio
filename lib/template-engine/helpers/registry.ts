/**
 * Fack API - Helper Registry
 *
 * Central registry mapping helper identifiers to execution functions.
 */

import type { HelperFunction, TemplateContext } from "../types";
import { stringHelpers } from "./string.helpers";
import { numberHelpers } from "./number.helpers";
import { dateHelpers } from "./date.helpers";
import { utilityHelpers } from "./utility.helpers";
import { stateHelpers } from "./state.helpers";
import { evaluateFakerExpression } from "./faker.helpers";

const builtinHelpers: Map<string, HelperFunction> = new Map();

// Register string helpers
for (const [name, fn] of Object.entries(stringHelpers)) {
  builtinHelpers.set(name, (args) => fn(args));
}

// Register number helpers
for (const [name, fn] of Object.entries(numberHelpers)) {
  builtinHelpers.set(name, (args) => fn(args));
}

// Register date helpers
for (const [name, fn] of Object.entries(dateHelpers)) {
  builtinHelpers.set(name, (args) => fn(args));
}

// Register utility helpers
for (const [name, fn] of Object.entries(utilityHelpers)) {
  builtinHelpers.set(name, (args) => fn(args));
}

// Register state helpers
for (const [name, fn] of Object.entries(stateHelpers)) {
  builtinHelpers.set(name, (args, context) => fn(args, context));
}

export class HelperRegistry {
  private customHelpers: Map<string, HelperFunction> = new Map();

  public register(name: string, fn: HelperFunction): void {
    this.customHelpers.set(name, fn);
  }

  public get(name: string): HelperFunction | undefined {
    return this.customHelpers.get(name) || builtinHelpers.get(name);
  }

  public has(name: string): boolean {
    return this.customHelpers.has(name) || builtinHelpers.has(name);
  }

  public execute(
    name: string,
    args: unknown[],
    context: TemplateContext,
  ): unknown {
    const helper = this.get(name);
    if (helper) {
      return helper(args, context);
    }

    // Check if this is a direct Faker invocation e.g. faker.person.fullName
    if (name.startsWith("faker.")) {
      const path = name.replace(/^faker\./, "");
      return evaluateFakerExpression(path, args);
    }

    return undefined;
  }
}

export const defaultHelperRegistry = new HelperRegistry();
