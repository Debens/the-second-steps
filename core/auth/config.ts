const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SandboxPersona =
  "account_owner" | "platform_owner" | "dual_owner" | "no_access";

const DEFAULT_SANDBOX_PERSONA_EMAILS: Readonly<Record<SandboxPersona, string>> =
  {
    account_owner: "owner@zayto.local",
    platform_owner: "platform.owner@zayto.local",
    dual_owner: "dual.owner@zayto.local",
    no_access: "no.access@zayto.local",
  };

export function normaliseEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;

  return email;
}

export function getSandboxAuthEmails() {
  const configured = process.env.SANDBOX_AUTH_EMAILS;
  const fallback =
    process.env.NODE_ENV === "development"
      ? Object.values(DEFAULT_SANDBOX_PERSONA_EMAILS).join(",")
      : "";

  return new Set(
    (configured ?? fallback)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function getSandboxPersona(email: string): SandboxPersona | null {
  if (process.env.NODE_ENV === "production") return null;

  const normalisedEmail = email.trim().toLowerCase();
  const entries = Object.entries(DEFAULT_SANDBOX_PERSONA_EMAILS) as Array<
    [SandboxPersona, string]
  >;

  return (
    entries.find(([, personaEmail]) => personaEmail === normalisedEmail)?.[0] ??
    null
  );
}
