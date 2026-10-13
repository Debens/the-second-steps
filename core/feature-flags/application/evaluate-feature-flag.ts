import "server-only";

import { withVerifiedIdentity } from "@/core/access/data/database-context";
import { loadFeatureFlagEvaluationInput } from "../data/feature-flag-repository";
import {
  resolveFeatureFlag,
  type FeatureFlagEvaluation,
  type FeatureFlagKey,
  unavailableFeatureFlagEvaluation,
} from "../domain/feature-flag";
import { requireStaffMfaFromEnvironment } from "./environment";

export async function evaluateFeatureFlagForIdentity(input: {
  authSubject: string;
  key: FeatureFlagKey;
  workspaceSlug?: string;
}): Promise<FeatureFlagEvaluation> {
  const requireStaffMfa = requireStaffMfaFromEnvironment();

  try {
    const evaluation = await withVerifiedIdentity(
      input.authSubject,
      async (transaction, identity) => {
        const { definition, isStaff, workspaceOverride } =
          await loadFeatureFlagEvaluationInput(
            transaction,
            identity,
            input.key,
            input.workspaceSlug,
          );

        return resolveFeatureFlag({
          key: input.key,
          definition,
          isStaff,
          isZaytoUser: identity.isPlatformOwner,
          workspaceOverride,
          requireStaffMfa,
        });
      },
    );

    return evaluation ?? unavailableFeatureFlagEvaluation(input.key);
  } catch {
    return unavailableFeatureFlagEvaluation(input.key);
  }
}
