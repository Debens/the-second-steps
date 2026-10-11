import { afterEach, describe, expect, it } from "vitest";
import { getSandboxAuthEmails, normaliseEmail } from "./config";

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
});
