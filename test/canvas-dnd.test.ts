import { describe, it, expect } from "vite-plus/test";
import { createCanvasDndStore } from "../stores/canvas-dnd-store";
import {
  parseSchemaToFields,
  synthesizeSchema,
  type SchemaField,
} from "../lib/schema-synthesizer";
import { getProviderByValue } from "../lib/faker-registry";

describe("Canvas DnD State Store", () => {
  it("should initialize with null selection", () => {
    const store = createCanvasDndStore();
    const state = store.getState();
    expect(state.selectedRouteId).toBeNull();
    expect(state.inspectedFieldId).toBeNull();
  });

  it("should select a route on canvas", () => {
    const store = createCanvasDndStore();
    store.getState().setSelectedRoute("route-123");
    expect(store.getState().selectedRouteId).toBe("route-123");
    expect(store.getState().inspectedFieldId).toBeNull();
  });

  it("should clear inspectedField when switching selected route", () => {
    const store = createCanvasDndStore();
    store.getState().setSelectedRoute("route-1");
    store.getState().setInspectedField("field-1");
    expect(store.getState().inspectedFieldId).toBe("field-1");

    store.getState().setSelectedRoute("route-2");
    expect(store.getState().selectedRouteId).toBe("route-2");
    expect(store.getState().inspectedFieldId).toBeNull();
  });

  it("should set and clear inspectedField", () => {
    const store = createCanvasDndStore();
    store.getState().setInspectedField("field-abc");
    expect(store.getState().inspectedFieldId).toBe("field-abc");

    store.getState().setInspectedField(null);
    expect(store.getState().inspectedFieldId).toBeNull();
  });
});

describe("Canvas Field Synthesis and Provider Mapping", () => {
  it("should lookup Faker providers in O(1) time", () => {
    const provider = getProviderByValue("person.fullName");
    expect(provider).toBeDefined();
    expect(provider?.label).toBe("Full Name");
    expect(provider?.category).toBe("Person");
  });

  it("should correctly append new field to schema without mutating existing fields", () => {
    const initialFields: SchemaField[] = [
      {
        id: "field-1",
        name: "id",
        type: "string",
        nullable: false,
        fakerProvider: "string.uuid",
      },
    ];

    const initialSchema = synthesizeSchema(initialFields);
    expect(initialSchema.properties.id).toBeDefined();

    // Simulate appending a field from DnD
    const parsed = parseSchemaToFields(initialSchema);
    const newField: SchemaField = {
      id: "field-2",
      name: "fullName",
      type: "string",
      nullable: false,
      fakerProvider: "person.fullName",
    };

    const updatedSchema = synthesizeSchema([...parsed, newField]);
    expect(updatedSchema.properties.id).toBeDefined();
    expect(updatedSchema.properties.fullName).toEqual({
      type: "string",
      "x-faker": "person.fullName",
      faker: "person.fullName",
    });
    expect(updatedSchema.required).toContain("fullName");
  });

  it("should handle removing a field from schema", () => {
    const fields: SchemaField[] = [
      {
        id: "field-1",
        name: "id",
        type: "string",
        nullable: false,
      },
      {
        id: "field-2",
        name: "email",
        type: "string",
        nullable: false,
        fakerProvider: "internet.email",
      },
    ];

    const schema = synthesizeSchema(fields);
    const parsed = parseSchemaToFields(schema);
    const filtered = parsed.filter((f) => f.name !== "email");
    const updated = synthesizeSchema(filtered);

    expect(updated.properties.id).toBeDefined();
    expect(updated.properties.email).toBeUndefined();
    expect(updated.required).not.toContain("email");
  });
});
