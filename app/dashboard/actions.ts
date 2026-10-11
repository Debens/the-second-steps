"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/core/auth/supabase-server";

export async function signOut() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  if (data.user) await supabase.auth.signOut();

  redirect("/login");
}
