import { describe, it, expect, beforeAll, afterAll } from "vite-plus/test";
import { MockServer } from "../../cli/src/server.service";
import type { FackRuntimeBundle } from "../../lib/bundle/types";

describe("Template Engine - Studio & CLI Runtime Parity", () => {
  let server: MockServer;
  const testPort = 39824;

  const mockBundle: FackRuntimeBundle = {
    magic: "FACK",
    version: 1,
    projectId: "proj_parity",
    projectName: "Parity Project",
    projectSlug: "parity-project",
    exportedAt: new Date().toISOString(),
    activeScenarioId: undefined,
    endpoints: [
      {
        id: "ep_1",
        name: "Users",
        basePath: "/api/users",
        description: "Users endpoint",
      },
    ],
    routes: [
      {
        id: "r_list",
        endpointId: "ep_1",
        method: "GET",
        path: "",
        fullPath: "/api/users",
        statusCode: 200,
        responseSchema: {},
        responseTemplate: JSON.stringify({
          endpoint: "{{request.path}}",
          method: "{{request.method}}",
          totalUsers: "{{count 'users'}}",
        }),
        latencyMin: 0,
        latencyMax: 0,
        errorRate: 0,
        customHeaders: {},
        isAuthRequired: false,
        isEnabled: true,
        collectionName: "users",
      },
      {
        id: "r_create",
        endpointId: "ep_1",
        method: "POST",
        path: "",
        fullPath: "/api/users",
        statusCode: 201,
        responseSchema: {},
        responseTemplate: JSON.stringify({
          success: true,
          createdName: "{{uppercase request.body.name}}",
          savedId: "{{state.current.id}}",
          role: '{{default request.body.role "viewer"}}',
        }),
        latencyMin: 0,
        latencyMax: 0,
        errorRate: 0,
        customHeaders: {},
        isAuthRequired: false,
        isEnabled: true,
        collectionName: "users",
      },
      {
        id: "r_get_one",
        endpointId: "ep_1",
        method: "GET",
        path: "/:id",
        fullPath: "/api/users/:id",
        statusCode: 200,
        responseSchema: {},
        responseTemplate: JSON.stringify({
          requestedId: "{{request.params.id}}",
          user: '{{lookup "users" request.params.id}}',
        }),
        latencyMin: 0,
        latencyMax: 0,
        errorRate: 0,
        customHeaders: {},
        isAuthRequired: false,
        isEnabled: true,
        collectionName: "users",
      },
    ],
    scenarios: [],
    mockStates: [],
  };

  beforeAll(async () => {
    server = new MockServer({
      bundle: mockBundle,
      port: testPort,
      host: "127.0.0.1",
      silent: true,
    });
    await server.start();
  });

  afterAll(async () => {
    await server.stop();
  });

  it("evaluates response template with request context and state count on GET", async () => {
    const res = await fetch(`http://127.0.0.1:${testPort}/api/users`);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      endpoint: string;
      method: string;
      totalUsers: number;
    };

    expect(data.endpoint).toBe("/api/users");
    expect(data.method).toBe("GET");
    expect(data.totalUsers).toBe(0);
  });

  it("persists item to mock store and formats response with state.current on POST", async () => {
    const postRes = await fetch(`http://127.0.0.1:${testPort}/api/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "dave",
        email: "dave@example.com",
      }),
    });

    expect(postRes.status).toBe(201);
    const postData = (await postRes.json()) as {
      success: boolean;
      createdName: string;
      savedId: string;
      role: string;
    };

    expect(postData.success).toBe(true);
    expect(postData.createdName).toBe("DAVE");
    expect(typeof postData.savedId).toBe("string");
    expect(postData.role).toBe("viewer");

    // Verify state persistence: count should now be 1
    const listRes = await fetch(`http://127.0.0.1:${testPort}/api/users`);
    const listData = (await listRes.json()) as { totalUsers: number };
    expect(listData.totalUsers).toBe(1);

    // Verify lookup on newly created item
    const getOneRes = await fetch(
      `http://127.0.0.1:${testPort}/api/users/${postData.savedId}`,
    );
    const getOneData = (await getOneRes.json()) as {
      requestedId: string;
      user: { id: string; name: string };
    };

    expect(getOneData.requestedId).toBe(postData.savedId);
    expect(getOneData.user.id).toBe(postData.savedId);
    expect(getOneData.user.name).toBe("dave");
  });
});
