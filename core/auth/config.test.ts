import { afterEach, describe, expect, it } from "vitest";
import {
  getSandboxAuthEmails,
  getSandboxPersona,
  normaliseEmail,
} from "./config";

const originalEmails = process.env.SANDBOX_AUTH_EMAILS;

afterEach(() => {
  if (originalEmails === undefined) delete process.env.SANDBOX_AUTH_EMAILS;
  else process.env.SANDBOX_AUTH_EMAILS = originalEmails;
});

describe("sandbox auth configuration", () => {
  it("normalises valid email addresses", () => {
    expect(normaliseEmail("  Owner@Zayto.Local ")).toBe("owner@zayto.local");
  });

  it("rejects malformed email addresses", () => {
    expect(normaliseEmail("not-an-email")).toBeNull();
    expect(normaliseEmail(null)).toBeNull();
  });

  it("reads a case-insensitive comma-separated allow-list", () => {
    process.env.SANDBOX_AUTH_EMAILS = "One@Example.com, two@example.com";

    expect(getSandboxAuthEmails()).toEqual(
      new Set(["one@example.com", "two@example.com"]),
    );
  });

  it("maps approved local identities to sandbox personas", () => {
    expect(getSandboxPersona("OWNER@ZAYTO.LOCAL")).toBe("account_owner");
    expect(getSandboxPersona("platform.owner@zayto.local")).toBe(
      "platform_owner",
    );
    expect(getSandboxPersona("dual.owner@zayto.local")).toBe("dual_owner");
    expect(getSandboxPersona("no.access@zayto.local")).toBe("no_access");
    expect(getSandboxPersona("unknown@zayto.local")).toBeNull();
  });
});
