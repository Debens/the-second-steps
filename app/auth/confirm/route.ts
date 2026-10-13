import { NextResponse } from "next/server";
import { provisionSandboxAccess } from "@/core/access/data/sandbox-provisioning";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");

  if (tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error && data.user?.email) {
      try {
        await provisionSandboxAccess({
          authSubject: data.user.id,
          email: data.user.email,
        });
        return NextResponse.redirect(new URL("/dashboard", requestUrl));
      } catch {
        await supabase.auth.signOut();
        return NextResponse.redirect(
          new URL("/login?error=access-setup", requestUrl),
        );
      }
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=invalid-link", requestUrl),
  );
}
