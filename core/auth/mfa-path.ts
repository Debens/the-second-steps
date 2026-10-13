export function safePostMfaPath(value: string | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/dashboard";
  }

  if (
    value === "/platform" ||
    value.startsWith("/platform/") ||
    value === "/dashboard" ||
    value.startsWith("/dashboard/")
  ) {
    return value;
  }
  return "/dashboard";
}
