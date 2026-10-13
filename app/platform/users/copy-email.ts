export type CopyEmailStatus = "idle" | "copied" | "failed";

export const COPY_EMAIL_FEEDBACK_MS = 2000;

/** The sign-in address to copy, or null when none is recorded. */
export function signInEmailCopyValue(email: string | null): string | null {
  return email ? email : null;
}

export function copyEmailFeedback(status: CopyEmailStatus): {
  label: string;
  announcement: string;
} {
  if (status === "copied") {
    return { label: "Copied", announcement: "Email address copied" };
  }

  if (status === "failed") {
    return {
      label: "Could not copy",
      announcement: "Could not copy the email address",
    };
  }

  return { label: "Copy email", announcement: "" };
}

export async function copyDisplayedEmail(
  email: string,
  writeText: (value: string) => Promise<void>,
): Promise<boolean> {
  try {
    await writeText(email);
    return true;
  } catch {
    return false;
  }
}

export function writeClipboardText(value: string): Promise<void> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return Promise.reject(new Error("Clipboard is unavailable"));
  }

  return navigator.clipboard.writeText(value);
}
