import { describe, it, expect } from "vite-plus/test";
import {
  encryptBundle,
  decryptBundle,
  generateProjectSecretKey,
  validateProjectSecretKey,
} from "@/lib/bundle/bundle-crypto.service";
import {
  BUNDLE_MAGIC_HEADER,
  BUNDLE_SPEC_VERSION,
  type FackRuntimeBundle,
} from "@/lib/bundle/bundle.type";

const dummyBundle: FackRuntimeBundle = {
  magic: BUNDLE_MAGIC_HEADER,
  version: BUNDLE_SPEC_VERSION,
  projectId: "proj_123",
  projectName: "Test Project",
  projectSlug: "test-project",
  exportedAt: new Date().toISOString(),
  activeScenarioId: undefined,
  endpoints: [
    {
      id: "ep_1",
      name: "Users API",
      basePath: "/api/users",
      description: "User management",
    },
  ],
  routes: [
    {
      id: "route_1",
      endpointId: "ep_1",
      method: "GET",
      path: "/:id",
      fullPath: "/api/users/:id",
      statusCode: 200,
      responseSchema: {
        type: "object",
        properties: {
          id: { type: "string" },
          name: { type: "string" },
        },
      },
      responseTemplate: undefined,
      latencyMin: 10,
      latencyMax: 50,
      errorRate: 0,
      customHeaders: { "X-Custom": "test" },
      isAuthRequired: false,
      isEnabled: true,
      collectionName: "users",
    },
  ],
  scenarios: [],
  mockStates: [],
};

describe("bundle-crypto.service", () => {
  it("should generate deterministic project secret key", () => {
    const key1 = generateProjectSecretKey("proj_123");
    const key2 = generateProjectSecretKey("proj_123");
    const keyOther = generateProjectSecretKey("proj_456");

    expect(key1).toBe(key2);
    expect(key1.startsWith("fack_sec_")).toBe(true);
    expect(key1).not.toBe(keyOther);
    expect(validateProjectSecretKey("proj_123", key1)).toBe(true);
    expect(validateProjectSecretKey("proj_123", "wrong-key")).toBe(false);
  });

  it("should encrypt and decrypt bundle successfully with correct key", () => {
    const secretKey = generateProjectSecretKey("proj_123");
    const encryptedBuffer = encryptBundle(dummyBundle, secretKey);

    expect(encryptedBuffer).toBeInstanceOf(Buffer);
    expect(encryptedBuffer.length).toBeGreaterThan(49);
    expect(encryptedBuffer.subarray(0, 4).toString("utf-8")).toBe("FACK");

    const result = decryptBundle(encryptedBuffer, secretKey);
    expect(result.bundle.projectId).toBe("proj_123");
    expect(result.bundle.routes.length).toBe(1);
    expect(result.bundle.routes[0].fullPath).toBe("/api/users/:id");
  });

  it("should fail decryption when given an incorrect secret key", () => {
    const secretKey = generateProjectSecretKey("proj_123");
    const encryptedBuffer = encryptBundle(dummyBundle, secretKey);

    expect(() => {
      decryptBundle(encryptedBuffer, "fack_sec_wrong_key_123456789012");
    }).toThrow(/Failed to decrypt bundle/);
  });

  it("should fail decryption when buffer is tampered with", () => {
    const secretKey = generateProjectSecretKey("proj_123");
    const encryptedBuffer = encryptBundle(dummyBundle, secretKey);

    // Tamper with the ciphertext at the end
    encryptedBuffer[encryptedBuffer.length - 2] ^= 0xff;

    expect(() => {
      decryptBundle(encryptedBuffer, secretKey);
    }).toThrow(/Failed to decrypt bundle/);
  });
});
