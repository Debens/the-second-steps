import "server-only";

import { randomUUID } from "node:crypto";
import { withVerifiedIdentity } from "@/core/access/data/database-context";
import { requireStaffMfaFromEnvironment } from "./environment";
import type { FeatureFlagKey } from "../domain/feature-flag";

export type FeatureFlagSummary = {
  key: FeatureFlagKey;
  displayName: string;
  description: string;
  globalEnabled: boolean;
  zaytoUsersEnabled: boolean;
  releaseProtected: boolean;
};

export type UpdateFeatureFlagResult =
  | { ok: true }
  | {
      ok: false;
      error: "access_denied" | "flag_not_found" | "release_protected";
    };

export async function listFeatureFlags(
  authSubject: string,
): Promise<readonly FeatureFlagSummary[] | null> {
  const requireStaffMfa = requireStaffMfaFromEnvironment();

  return withVerifiedIdentity(authSubject, async (transaction, identity) => {
    if (!identity.isPlatformOwner) return null;

    const flags = await transaction.featureFlag.findMany({
      where: { status: "ACTIVE" },
      select: {
        key: true,
        displayName: true,
        description: true,
        globalEnabled: true,
        zaytoUsersEnabled: true,
      },
      orderBy: { displayName: "asc" },
    });

    return flags.map((flag) => ({
      ...flag,
      key: flag.key as FeatureFlagKey,
      releaseProtected: flag.key === "staff_mfa" && requireStaffMfa,
    }));
  });
}

export async function updateFeatureFlagSettings(input: {
  authSubject: string;
  key: FeatureFlagKey;
  globalEnabled: boolean;
  zaytoUsersEnabled: boolean;
}): Promise<UpdateFeatureFlagResult> {
  const requireStaffMfa = requireStaffMfaFromEnvironment();
  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateFeatureFlagResult> => {
      if (!identity.isPlatformOwner) {
        await transaction.auditEvent.createMany({
          data: [
            {
              actorUserIdentityId: identity.userIdentityId,
              action: "feature_flag.update",
              outcome: "DENIED",
              targetType: "feature_flag",
              targetId: input.key,
              requestId: randomUUID(),
              metadata: { reason: "access_denied" },
            },
          ],
        });
        return { ok: false, error: "access_denied" };
      }

      const current = await transaction.featureFlag.findUnique({
        where: { key: input.key, status: "ACTIVE" },
        select: {
          id: true,
          globalEnabled: true,
          zaytoUsersEnabled: true,
        },
      });
      if (!current) {
        await transaction.auditEvent.create({
          data: {
            actorUserIdentityId: identity.userIdentityId,
            action: "feature_flag.update",
            outcome: "DENIED",
            targetType: "feature_flag",
            targetId: input.key,
            requestId: randomUUID(),
            metadata: { reason: "flag_not_found" },
          },
        });
        return { ok: false, error: "flag_not_found" };
      }

      if (
        input.key === "staff_mfa" &&
        requireStaffMfa &&
        !input.globalEnabled
      ) {
        await transaction.auditEvent.create({
          data: {
            actorUserIdentityId: identity.userIdentityId,
            action: "feature_flag.update",
            outcome: "DENIED",
            targetType: "feature_flag",
            targetId: input.key,
            requestId: randomUUID(),
            metadata: { reason: "release_protected" },
          },
        });
        return { ok: false, error: "release_protected" };
      }

      await transaction.featureFlag.update({
        where: { id: current.id },
        data: {
          globalEnabled: input.globalEnabled,
          zaytoUsersEnabled: input.zaytoUsersEnabled,
        },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserIdentityId: identity.userIdentityId,
          action: "feature_flag.update",
          outcome: "SUCCEEDED",
          targetType: "feature_flag",
          targetId: input.key,
          requestId: randomUUID(),
          metadata: {
            previous: {
              globalEnabled: current.globalEnabled,
              zaytoUsersEnabled: current.zaytoUsersEnabled,
            },
            next: {
              globalEnabled: input.globalEnabled,
              zaytoUsersEnabled: input.zaytoUsersEnabled,
            },
          },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
