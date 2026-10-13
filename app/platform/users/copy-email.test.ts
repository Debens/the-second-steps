import { describe, expect, it } from "vitest";
import {
  copyDisplayedEmail,
  copyEmailFeedback,
  signInEmailCopyValue,
  writeClipboardText,
} from "./copy-email";

describe("sign-in email copy", () => {
  it("copies the displayed email address exactly", async () => {
    const written: string[] = [];

    await expect(
      copyDisplayedEmail("  owner@zayto.local  ", async (value) => {
        written.push(value);
      }),
    ).resolves.toBe(true);
    expect(written).toEqual(["  owner@zayto.local  "]);
  });

  it("does not report success when copying fails", async () => {
    await expect(
      copyDisplayedEmail("owner@zayto.local", async () => {
        throw new Error("denied");
      }),
    ).resolves.toBe(false);
  });

  it("offers a copy only when an email is recorded", () => {
    expect(signInEmailCopyValue("owner@zayto.local")).toBe("owner@zayto.local");
    expect(signInEmailCopyValue(null)).toBeNull();
    expect(signInEmailCopyValue("")).toBeNull();
  });

  it("announces Copied after a successful copy", () => {
    expect(copyEmailFeedback("idle")).toEqual({
      label: "Copy email",
      announcement: "",
    });
    expect(copyEmailFeedback("copied")).toEqual({
      label: "Copied",
      announcement: "Email address copied",
    });
    expect(copyEmailFeedback("failed")).toEqual({
      label: "Could not copy",
      announcement: "Could not copy the email address",
    });
  });

  it("fails closed when this environment has no clipboard", async () => {
    await expect(writeClipboardText("owner@zayto.local")).rejects.toThrow(
      "Clipboard is unavailable",
    );
  });
});
