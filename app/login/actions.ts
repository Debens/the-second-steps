"use server";

import { getSandboxAuthEmails, normaliseEmail } from "@/core/auth/config";
import { getAppUrl } from "@/core/auth/env";
import { createSupabaseAdminClient } from "@/core/auth/supabase-admin";
import { sendSandboxMagicLink } from "@/core/email/mailpit";
import type { LoginState } from "./login-state";

const GENERIC_MESSAGE =
  "If this email has been invited, a sign-in link is now in the local mail sandbox.";

export async function requestMagicLink(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = normaliseEmail(formData.get("email"));
  if (!email) {
    return { status: "error", message: "Enter a valid email address." };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      status: "error",
      message: "Production email delivery has not been configured yet.",
    };
  }

  if (!getSandboxAuthEmails().has(email)) {
    return { status: "sent", message: GENERIC_MESSAGE };
  }

  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (error) throw error;

    const signInUrl = new URL("/auth/confirm", getAppUrl());
    signInUrl.searchParams.set("token_hash", data.properties.hashed_token);

    await sendSandboxMagicLink(email, signInUrl.toString());
    return { status: "sent", message: GENERIC_MESSAGE };
  } catch {
    return {
      status: "error",
      message:
        "The local sign-in email could not be created. Check that Mailpit is running and try again.",
    };
  }
}
