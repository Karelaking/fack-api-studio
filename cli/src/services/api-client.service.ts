/**
 * Fack CLI — Studio HTTP client.
 *
 * The CLI only needs five calls: start a device flow, poll it, identify the
 * terminal, list projects, and download a bundle. Everything returns plain
 * serialisable data so commands stay free of transport details.
 */

export interface DeviceAuthorization {
  deviceCode: string;
  userCode: string;
  expiresIn: number;
  interval: number;
  verificationUri: string;
  verificationUriComplete: string;
}

export type DeviceTokenPoll =
  | {
      status: "approved";
      token: string;
      tokenPrefix: string;
      device: { name: string; platform: string };
      userId?: string;
    }
  | { status: "pending" | "denied" | "expired" | "invalid"; error?: string };

export interface CliProject {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  endpointCount: number;
  routeCount: number;
  updatedAt: string;
}

export interface CliMe {
  authenticated: boolean;
  mode: "token" | "local";
  user: { id: string };
  device: {
    id: string;
    name: string;
    platform: string;
    createdAt: string;
    lastUsedAt: string | null;
  } | null;
}

export interface BundleDownload {
  bytes: Buffer;
  projectId?: string;
  projectSlug?: string;
  projectName?: string;
  projectKey?: string;
}

export class FackApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "FackApiError";
  }
}

async function readError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as {
      error?: unknown;
      message?: unknown;
    };
    if (typeof body.error === "string") return body.error;
    if (typeof body.message === "string") return body.message;
  } catch {
    // Fall through to the status text.
  }
  return response.statusText || `Request failed with ${response.status}`;
}

export class FackApiClient {
  private readonly baseUrl: string;

  constructor(
    baseUrl: string,
    private readonly token?: string,
  ) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private authHeaders(extra?: Record<string, string>): Headers {
    const headers = new Headers(extra);
    headers.set("Accept", "application/json");
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    return headers;
  }

  private async requestJson<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      throw new FackApiError(await readError(response), response.status);
    }
    return (await response.json()) as T;
  }

  async startDeviceFlow(input: {
    deviceName: string;
    platform: string;
  }): Promise<DeviceAuthorization> {
    return this.requestJson<DeviceAuthorization>("/api/cli/auth/device", {
      method: "POST",
      headers: this.authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify(input),
    });
  }

  async pollDeviceToken(deviceCode: string): Promise<DeviceTokenPoll> {
    const response = await fetch(`${this.baseUrl}/api/cli/auth/token`, {
      method: "POST",
      headers: this.authHeaders({ "Content-Type": "application/json" }),
      body: JSON.stringify({ deviceCode }),
    });

    let body: DeviceTokenPoll | undefined;
    try {
      body = (await response.json()) as DeviceTokenPoll;
    } catch {
      body = undefined;
    }

    if (body?.status === "approved") return body;
    if (response.status === 202 || body?.status === "pending") {
      return { status: "pending" };
    }
    if (body?.status) return body;

    throw new FackApiError(await readError(response), response.status);
  }

  async fetchMe(): Promise<CliMe> {
    return this.requestJson<CliMe>("/api/cli/me", {
      headers: this.authHeaders(),
    });
  }

  async listProjects(): Promise<{ projects: CliProject[] }> {
    return this.requestJson<{ projects: CliProject[] }>("/api/cli/projects", {
      headers: this.authHeaders(),
    });
  }

  async downloadBundle(
    slug: string,
    fallbackKey?: string,
  ): Promise<BundleDownload> {
    const headers = new Headers({ Accept: "application/octet-stream" });
    if (this.token) {
      headers.set("Authorization", `Bearer ${this.token}`);
    } else if (fallbackKey) {
      headers.set("Authorization", `Bearer ${fallbackKey}`);
    }

    const response = await fetch(
      `${this.baseUrl}/api/projects/${encodeURIComponent(slug)}/bundle`,
      { headers },
    );

    if (!response.ok) {
      throw new FackApiError(await readError(response), response.status);
    }

    const bytes = Buffer.from(await response.arrayBuffer());
    const projectName = response.headers.get("x-fack-project-name");

    return {
      bytes,
      projectId: response.headers.get("x-fack-project-id") ?? undefined,
      projectSlug: response.headers.get("x-fack-project-slug") ?? undefined,
      projectName: projectName ? decodeURIComponent(projectName) : undefined,
      projectKey: response.headers.get("x-fack-project-key") ?? fallbackKey,
    };
  }

  async revoke(): Promise<{ success: boolean; revoked: boolean }> {
    return this.requestJson<{ success: boolean; revoked: boolean }>(
      "/api/cli/auth/revoke",
      {
        method: "POST",
        headers: this.authHeaders(),
      },
    );
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof FackApiError && error.status === 401;
}

export function describeNetworkError(error: unknown, baseUrl: string): string {
  if (error instanceof FackApiError) return error.message;
  if (error instanceof Error) {
    return `Could not reach Fack Studio at ${baseUrl} (${error.message}).`;
  }
  return `Could not reach Fack Studio at ${baseUrl}.`;
}
