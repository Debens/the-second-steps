import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const tokenHash = requestUrl.searchParams.get("token_hash");

  if (tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: "email",
    });

    if (!error) return NextResponse.redirect(new URL("/dashboard", requestUrl));
  }

  return NextResponse.redirect(
    new URL("/login?error=invalid-link", requestUrl),
  );
}
