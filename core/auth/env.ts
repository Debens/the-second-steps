function requireEnvironmentVariable(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

export function getSupabasePublicEnvironment() {
  return {
    url: requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    publishableKey: requireEnvironmentVariable(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    ),
  };
}

export function getSupabaseSecretKey() {
  return requireEnvironmentVariable("SUPABASE_SECRET_KEY");
}

export function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function getMailpitApiUrl() {
  return process.env.MAILPIT_API_URL ?? "http://127.0.0.1:8025";
}
