export function requireStaffMfaFromEnvironment(
  value = process.env.REQUIRE_STAFF_MFA,
) {
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;

  throw new Error('REQUIRE_STAFF_MFA must be either "true" or "false".');
}
