import "server-only";

import { redirect } from "next/navigation";
import { evaluateFeatureFlagForIdentity } from "@/core/feature-flags/application/evaluate-feature-flag";
import { safePostMfaPath } from "./mfa-path";
import { createSupabaseServerClient } from "./supabase-server";

export async function requireMfaUser(
  nextPath: string,
  options: { workspaceSlug?: string } = {},
) {
  const supabase = await createSupabaseServerClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) redirect("/login");

  const mfaFlag = await evaluateFeatureFlagForIdentity({
    authSubject: userData.user.id,
    key: "staff_mfa",
    workspaceSlug: options.workspaceSlug,
  });
  if (!mfaFlag.enabled) return userData.user;

  const { data: assurance, error: assuranceError } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

  if (assuranceError || assurance.currentLevel !== "aal2") {
    const next = safePostMfaPath(nextPath);
    redirect(`/mfa?next=${encodeURIComponent(next)}`);
  }

  return userData.user;
}
