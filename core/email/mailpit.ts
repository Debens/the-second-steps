import { getMailpitApiUrl } from "@/core/auth/env";

export async function sendSandboxMagicLink(email: string, signInUrl: string) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mailpit delivery is disabled in production.");
  }

  const response = await fetch(`${getMailpitApiUrl()}/api/v1/send`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      From: { Email: "no-reply@zayto.local", Name: "Zayto" },
      To: [{ Email: email }],
      Subject: "Your Zayto sign-in link",
      Text: `Use this one-time link to sign in to the Zayto sandbox:\n\n${signInUrl}\n\nIf you did not request this, you can ignore this email.`,
      HTML: `<p>Use this one-time link to sign in to the Zayto sandbox:</p><p><a href="${signInUrl}">Sign in to Zayto</a></p><p>If you did not request this, you can ignore this email.</p>`,
      Tags: ["authentication", "sandbox"],
    }),
    cache: "no-store",
  });

  if (!response.ok) throw new Error("Mailpit could not accept the email.");
}
