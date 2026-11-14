import { describe, it, expect } from "vite-plus/test";
import {
  renderTemplate,
  buildTemplateContext,
} from "../../lib/template-engine";

describe("Template Engine - Mock State Access", () => {
  it("looks up an item by id from state collection", () => {
    const template = JSON.stringify({
      foundUser: '{{lookup "users" request.params.id}}',
      userTotal: '{{count "users"}}',
    });

    const usersCollection = [
      { id: "u_1", name: "Alice", role: "admin" },
      { id: "u_2", name: "Bob", role: "developer" },
    ];

    const result = renderTemplate(template, {
      context: buildTemplateContext({
        request: {
          params: { id: "u_2" },
        },
        state: {
          collections: {
            users: usersCollection,
          },
        },
      }),
    }) as Record<string, unknown>;

    expect(result.foundUser).toEqual({
      id: "u_2",
      name: "Bob",
      role: "developer",
    });
    expect(result.userTotal).toBe(2);
  });

  it("accesses state collections directly through state.<collection> path", () => {
    const template = JSON.stringify({
      firstUserName: "{{state.users.0.name}}",
      totalCount: "{{length state.users}}",
    });

    const result = renderTemplate(template, {
      context: buildTemplateContext({
        request: {},
        state: {
          users: [
            { id: "u_1", name: "Charlie" },
            { id: "u_2", name: "Dana" },
          ],
        },
      }),
    }) as Record<string, unknown>;

    expect(result.firstUserName).toBe("Charlie");
    expect(result.totalCount).toBe(2);
  });

  it("returns null gracefully when looking up non-existent record", () => {
    const template = JSON.stringify({
      missing: '{{lookup "users" "non_existent_id"}}',
    });

    const result = renderTemplate(template, {
      context: buildTemplateContext({
        request: {},
        state: {
          collections: {
            users: [{ id: "u_1", name: "Alice" }],
          },
        },
      }),
    }) as Record<string, unknown>;

    expect(result.missing).toBeNull();
  });
});
