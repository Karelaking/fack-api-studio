import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { MockServer } from "@/cli/src/server.service";
import type { FackRuntimeBundle } from "@/lib/bundle/bundle.type";

const testBundle: FackRuntimeBundle = {
  magic: "FACK",
  version: 1,
  projectId: "proj_server_test",
  projectName: "Server Test Project",
  projectSlug: "server-test",
  exportedAt: new Date().toISOString(),
  activeScenarioId: undefined,
  endpoints: [
    {
      id: "ep_1",
      name: "Todos API",
      basePath: "/api/todos",
      description: "",
    },
    {
      id: "ep_2",
      name: "Secure API",
      basePath: "/api/secure",
      description: "",
    },
    {
      id: "ep_3",
      name: "Products API",
      basePath: "/api/products",
      description: "",
    },
  ],
  routes: [
    {
      id: "r_list_todos",
      endpointId: "ep_1",
      method: "GET",
      path: "/",
      fullPath: "/api/todos",
      statusCode: 200,
      responseSchema: {
        type: "array",
        items: {
          type: "object",
          properties: {
            id: { type: "string" },
            title: { type: "string" },
          },
        },
      },
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: { "X-Test-Header": "todos-list" },
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "todos",
    },
    {
      id: "r_create_todo",
      endpointId: "ep_1",
      method: "POST",
      path: "/",
      fullPath: "/api/todos",
      statusCode: 201,
      responseSchema: {},
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "todos",
    },
    {
      id: "r_get_todo",
      endpointId: "ep_1",
      method: "GET",
      path: "/:id",
      fullPath: "/api/todos/:id",
      statusCode: 200,
      responseSchema: {},
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "todos",
    },
    {
      id: "r_delete_todo",
      endpointId: "ep_1",
      method: "DELETE",
      path: "/:id",
      fullPath: "/api/todos/:id",
      statusCode: 200,
      responseSchema: {},
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "todos",
    },
    {
      id: "r_secure",
      endpointId: "ep_2",
      method: "GET",
      path: "/data",
      fullPath: "/api/secure/data",
      statusCode: 200,
      responseSchema: {
        type: "object",
        properties: { secret: { type: "string" } },
      },
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: true,
      isEnabled: true,
      collectionName: undefined,
    },
    {
      id: "r_put_product",
      endpointId: "ep_3",
      method: "PUT",
      path: "/:productId",
      fullPath: "/api/products/:productId",
      statusCode: 200,
      responseSchema: {},
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "products",
    },
    {
      id: "r_get_product",
      endpointId: "ep_3",
      method: "GET",
      path: "/:productId",
      fullPath: "/api/products/:productId",
      statusCode: 200,
      responseSchema: {},
      responseTemplate: undefined,
      latencyMin: 0,
      latencyMax: 0,
      errorRate: 0,
      customHeaders: {},
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "products",
    },
  ],
  scenarios: [],
  mockStates: [
    {
      id: "ms_1",
      collection: "todos",
      itemKey: "todo_1",
      data: { id: "todo_1", title: "Pre-seeded Todo" },
    },
  ],
};

const TEST_PORT = 49152;
const BASE_URL = `http://localhost:${TEST_PORT}`;

describe("cli/src/server.service", () => {
  let server: MockServer;

  beforeAll(async () => {
    server = new MockServer({
      port: TEST_PORT,
      host: "127.0.0.1",
      bundle: testBundle,
      silent: true,
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("should respond to /__fack/health with project metadata", async () => {
    const res = await fetch(`${BASE_URL}/__fack/health`);
    expect(res.status).toBe(200);

    const data = await res.json();
    expect(data.status).toBe("ok");
    expect(data.project).toBe("Server Test Project");
    expect(data.routesCount).toBe(testBundle.routes.length);
  });

  it("should respond to CORS OPTIONS preflight with 204 and CORS headers", async () => {
    const res = await fetch(`${BASE_URL}/api/todos`, { method: "OPTIONS" });
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("*");
    expect(res.headers.get("access-control-allow-methods")).toContain("GET");
  });

  it("should return pre-seeded items from mock state on GET /api/todos", async () => {
    const res = await fetch(`${BASE_URL}/api/todos`);
    expect(res.status).toBe(200);
    expect(res.headers.get("x-test-header")).toBe("todos-list");

    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((item: { id: string }) => item.id === "todo_1")).toBe(
      true,
    );
  });

  it("should create a new item with POST and retrieve it with GET /api/todos/:id", async () => {
    const postRes = await fetch(`${BASE_URL}/api/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "New created item" }),
    });
    expect(postRes.status).toBe(201);
    const created = await postRes.json();
    expect(created.id).toBeDefined();
    expect(created.title).toBe("New created item");

    // Now GET by id
    const getRes = await fetch(`${BASE_URL}/api/todos/${created.id}`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe(created.id);
    expect(fetched.title).toBe("New created item");

    // Now DELETE
    const delRes = await fetch(`${BASE_URL}/api/todos/${created.id}`, {
      method: "DELETE",
    });
    expect(delRes.status).toBe(200);

    // Verify deleted
    const checkRes = await fetch(`${BASE_URL}/api/todos/${created.id}`, {
      method: "DELETE",
    });
    expect(checkRes.status).toBe(404);
  });

  it("should enforce authentication on isAuthRequired routes", async () => {
    // Without auth header -> 401
    const unauthRes = await fetch(`${BASE_URL}/api/secure/data`);
    expect(unauthRes.status).toBe(401);
    const unauthData = await unauthRes.json();
    expect(unauthData.error).toBe("Unauthorized");

    // With auth header -> 200
    const authRes = await fetch(`${BASE_URL}/api/secure/data`, {
      headers: { Authorization: "Bearer test_token_123" },
    });
    expect(authRes.status).toBe(200);
  });

  it("should reset in-memory state on POST /__fack/reset", async () => {
    // Create an item
    const postRes = await fetch(`${BASE_URL}/api/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "temp_item", title: "To be wiped" }),
    });
    expect(postRes.status).toBe(201);

    // Call reset
    const resetRes = await fetch(`${BASE_URL}/__fack/reset`, {
      method: "POST",
    });
    expect(resetRes.status).toBe(200);

    // Verify temp_item is gone, but initial todo_1 is restored
    const listRes = await fetch(`${BASE_URL}/api/todos`);
    const list = await listRes.json();
    expect(list.some((i: { id: string }) => i.id === "temp_item")).toBe(false);
    expect(list.some((i: { id: string }) => i.id === "todo_1")).toBe(true);
  });

  it("should return 404 when querying non-existent item by ID on a populated collection", async () => {
    const res = await fetch(`${BASE_URL}/api/todos/nonexistent_9999`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Not Found");
    expect(data.id).toBe("nonexistent_9999");
  });

  it("should support CRUD with custom non-standard param names like :productId", async () => {
    // Upsert via PUT
    const putRes = await fetch(`${BASE_URL}/api/products/prod_101`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Mechanical Keyboard", price: 120 }),
    });
    expect(putRes.status).toBe(200);
    const saved = await putRes.json();
    expect(saved.id).toBe("prod_101");
    expect(saved.name).toBe("Mechanical Keyboard");

    // Fetch via GET
    const getRes = await fetch(`${BASE_URL}/api/products/prod_101`);
    expect(getRes.status).toBe(200);
    const fetched = await getRes.json();
    expect(fetched.id).toBe("prod_101");
    expect(fetched.name).toBe("Mechanical Keyboard");
  });

  it("should safely handle null or primitive request bodies without crashing", async () => {
    const postRes = await fetch(`${BASE_URL}/api/todos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "null",
    });
    expect(postRes.status).toBe(201);
    const item = await postRes.json();
    expect(item.id).toBeDefined();
  });

  it("should return 404 for unknown endpoints", async () => {
    const res = await fetch(`${BASE_URL}/api/unknown/endpoint`);
    expect(res.status).toBe(404);
    const data = await res.json();
    expect(data.error).toBe("Route not found");
  });
});
