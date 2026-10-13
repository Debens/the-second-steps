export const FEATURE_FLAG_KEYS = ["staff_mfa"] as const;

export type FeatureFlagKey = (typeof FEATURE_FLAG_KEYS)[number];

export type FeatureFlagSource =
  | "release_protection"
  | "zayto_users"
  | "workspace"
  | "global"
  | "not_applicable"
  | "unavailable";

export type FeatureFlagEvaluation = {
  enabled: boolean;
  source: FeatureFlagSource;
};

export type FeatureFlagDefinition = {
  globalEnabled: boolean;
  zaytoUsersEnabled: boolean;
  status: "ACTIVE" | "RETIRED";
};

export function unavailableFeatureFlagEvaluation(
  key: FeatureFlagKey,
): FeatureFlagEvaluation {
  return { enabled: key === "staff_mfa", source: "unavailable" };
}

export function isFeatureFlagKey(value: string): value is FeatureFlagKey {
  return FEATURE_FLAG_KEYS.some((key) => key === value);
}

export function resolveFeatureFlag(input: {
  key: FeatureFlagKey;
  definition: FeatureFlagDefinition | null;
  isStaff: boolean;
  isZaytoUser: boolean;
  workspaceOverride: boolean | null;
  requireStaffMfa: boolean;
}): FeatureFlagEvaluation {
  if (!input.isStaff) {
    return { enabled: false, source: "not_applicable" };
  }

  if (input.key === "staff_mfa" && input.requireStaffMfa) {
    return { enabled: true, source: "release_protection" };
  }

  if (!input.definition || input.definition.status !== "ACTIVE") {
    return { enabled: false, source: "unavailable" };
  }

  if (input.isZaytoUser && input.definition.zaytoUsersEnabled) {
    return { enabled: true, source: "zayto_users" };
  }

  if (input.workspaceOverride !== null) {
    return { enabled: input.workspaceOverride, source: "workspace" };
  }

  return { enabled: input.definition.globalEnabled, source: "global" };
}
