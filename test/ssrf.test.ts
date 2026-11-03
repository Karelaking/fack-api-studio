import { describe, expect, it } from "vite-plus/test";
import {
  validateWebhookUrl,
  assertSafeWebhookUrl,
  SsrfSecurityError,
} from "@/lib/security/ssrf.service";

describe("ssrf.service", () => {
  it("should allow safe external https and http webhook destinations", () => {
    expect(validateWebhookUrl("https://api.github.com/webhooks").safe).toBe(
      true,
    );
    expect(
      validateWebhookUrl("https://hooks.slack.com/services/T00/B00/X00").safe,
    ).toBe(true);
    expect(validateWebhookUrl("http://example.com/api/callback").safe).toBe(
      true,
    );
  });

  it("should reject non-http protocols (file, gopher, ftp, javascript)", () => {
    expect(validateWebhookUrl("file:///etc/passwd").safe).toBe(false);
    expect(validateWebhookUrl("ftp://files.example.com").safe).toBe(false);
    expect(validateWebhookUrl("gopher://127.0.0.1:70").safe).toBe(false);
    expect(validateWebhookUrl("javascript:alert(1)").safe).toBe(false);
  });

  it("should reject cloud instance metadata endpoints unconditionally", () => {
    expect(
      validateWebhookUrl("http://169.254.169.254/latest/meta-data/").safe,
    ).toBe(false);
    expect(
      validateWebhookUrl("http://169.254.169.254/computeMetadata/v1/").safe,
    ).toBe(false);
    expect(
      validateWebhookUrl("http://metadata.google.internal/computeMetadata/v1/")
        .safe,
    ).toBe(false);
    expect(
      validateWebhookUrl("http://instance-data/latest/meta-data/").safe,
    ).toBe(false);
  });

  it("should reject private RFC 1918 subnets in hosted environments", () => {
    expect(validateWebhookUrl("http://10.0.0.1/admin", false).safe).toBe(false);
    expect(
      validateWebhookUrl("http://172.16.5.10:8080/metrics", false).safe,
    ).toBe(false);
    expect(validateWebhookUrl("http://192.168.1.254/setup", false).safe).toBe(
      false,
    );
  });

  it("should reject localhost in hosted mode, but permit in local developer mode", () => {
    // Hosted mode (isLocalTier = false)
    expect(validateWebhookUrl("http://localhost:3000/api", false).safe).toBe(
      false,
    );
    expect(
      validateWebhookUrl("http://127.0.0.1:8000/webhook", false).safe,
    ).toBe(false);

    // Local developer mode (isLocalTier = true)
    expect(validateWebhookUrl("http://localhost:3000/api", true).safe).toBe(
      true,
    );
    expect(validateWebhookUrl("http://127.0.0.1:8000/webhook", true).safe).toBe(
      true,
    );
  });

  it("should throw SsrfSecurityError on assertSafeWebhookUrl for forbidden targets", () => {
    expect(() => {
      assertSafeWebhookUrl("http://169.254.169.254/latest/meta-data/");
    }).toThrow(SsrfSecurityError);
  });
});
