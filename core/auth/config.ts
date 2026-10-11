const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normaliseEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;

  const email = value.trim().toLowerCase();
  if (!email || email.length > 254 || !EMAIL_PATTERN.test(email)) return null;

  return email;
}

export function getSandboxAuthEmails() {
  const configured = process.env.SANDBOX_AUTH_EMAILS;
  const fallback =
    process.env.NODE_ENV === "development" ? "owner@zayto.local" : "";

  return new Set(
    (configured ?? fallback)
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}
