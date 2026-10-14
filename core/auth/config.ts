const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type SandboxPersona =
  | "account_owner"
  | "branch_manager"
  | "platform_owner"
  | "dual_owner"
  | "no_access";

const SANDBOX_PERSONAS: Readonly<
  Record<
    SandboxPersona,
    { email: string; displayName: string; accessLabel: string }
  >
> = {
  account_owner: {
    email: "owner@zayto.local",
    displayName: "Olivia Hart",
    accessLabel: "Account Owner · all branches",
  },
  branch_manager: {
    email: "branch.manager@zayto.local",
    displayName: "Ben Carter",
    accessLabel: "Branch Manager · Main Branch",
  },
  platform_owner: {
    email: "platform.owner@zayto.local",
    displayName: "Theo Grant",
    accessLabel: "Zayto Platform Owner",
  },
  dual_owner: {
    email: "dual.owner@zayto.local",
    displayName: "Maya Ellis",
    accessLabel: "Platform Owner and Account Owner",
  },
  no_access: {
    email: "no.access@zayto.local",
    displayName: "Noah Reed",
    accessLabel: "No access · denial checks",
  },
};

export type SandboxQuickSignInOption = {
  email: string;
  displayName: string;
  accessLabel: string;
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
      ? Object.values(SANDBOX_PERSONAS)
          .map(({ email }) => email)
          .join(",")
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
  const entries = Object.entries(SANDBOX_PERSONAS) as Array<
    [SandboxPersona, (typeof SANDBOX_PERSONAS)[SandboxPersona]]
  >;

  return (
    entries.find(([, persona]) => persona.email === normalisedEmail)?.[0] ??
    null
  );
}

export function isSandboxQuickSignInEnabled() {
  return (
    process.env.NODE_ENV === "development" &&
    process.env.SANDBOX_QUICK_SIGN_IN !== "false"
  );
}

export function getSandboxQuickSignInOptions(): SandboxQuickSignInOption[] {
  if (!isSandboxQuickSignInEnabled()) return [];

  const allowedEmails = getSandboxAuthEmails();
  return Object.values(SANDBOX_PERSONAS).filter(({ email }) =>
    allowedEmails.has(email),
  );
}
