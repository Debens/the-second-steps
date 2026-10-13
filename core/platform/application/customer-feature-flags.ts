import "server-only";

import { randomUUID } from "node:crypto";
import {
  setWorkspaceDatabaseContext,
  withVerifiedIdentity,
} from "@/core/access/data/database-context";
import { requireStaffMfaFromEnvironment } from "@/core/feature-flags/application/environment";
import type { FeatureFlagKey } from "@/core/feature-flags/domain/feature-flag";

export type CustomerFeatureFlagOverrideMode =
  "inherit" | "enabled" | "disabled";

export type CustomerFeatureFlagSummary = {
  key: FeatureFlagKey;
  displayName: string;
  description: string;
  globalEnabled: boolean;
  overrideMode: CustomerFeatureFlagOverrideMode;
  effectiveEnabled: boolean;
  releaseProtected: boolean;
};

export async function listCustomerFeatureFlags(
  authSubject: string,
  customerSlug: string,
): Promise<readonly CustomerFeatureFlagSummary[] | null> {
  const requireStaffMfa = requireStaffMfaFromEnvironment();

  return withVerifiedIdentity(authSubject, async (transaction, identity) => {
    if (!identity.isPlatformOwner) return null;

    const customer = await transaction.workspace.findFirst({
      where: { slug: customerSlug, type: { not: "PLATFORM_INTERNAL" } },
      select: { id: true },
    });
    if (!customer) return null;

    const flags = await transaction.featureFlag.findMany({
      where: { status: "ACTIVE" },
      select: {
        key: true,
        displayName: true,
        description: true,
        globalEnabled: true,
        workspaceOverrides: {
          where: { workspaceId: customer.id },
          select: { enabled: true },
        },
      },
      orderBy: { displayName: "asc" },
    });

    return flags.map((flag) => {
      const override = flag.workspaceOverrides[0]?.enabled;
      const releaseProtected = flag.key === "staff_mfa" && requireStaffMfa;
      return {
        key: flag.key as FeatureFlagKey,
        displayName: flag.displayName,
        description: flag.description,
        globalEnabled: flag.globalEnabled,
        overrideMode:
          override === undefined
            ? "inherit"
            : override
              ? "enabled"
              : "disabled",
        effectiveEnabled:
          releaseProtected || override === undefined
            ? releaseProtected || flag.globalEnabled
            : override,
        releaseProtected,
      };
    });
  });
}

export type UpdateCustomerFeatureFlagResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | "access_denied"
        | "customer_not_found"
        | "flag_not_found"
        | "release_protected";
    };

export async function updateCustomerFeatureFlagOverride(input: {
  authSubject: string;
  customerSlug: string;
  key: FeatureFlagKey;
  mode: CustomerFeatureFlagOverrideMode;
}): Promise<UpdateCustomerFeatureFlagResult> {
  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateCustomerFeatureFlagResult> => {
      if (!identity.isPlatformOwner) {
        await transaction.auditEvent.createMany({
          data: [
            {
              actorUserIdentityId: identity.userIdentityId,
              action: "workspace_feature_flag.update",
              outcome: "DENIED",
              targetType: "workspace_feature_flag",
              targetId: input.key,
              requestId: randomUUID(),
              metadata: { reason: "access_denied" },
            },
          ],
        });
        return { ok: false, error: "access_denied" };
      }

      const customer = await transaction.workspace.findFirst({
        where: { slug: input.customerSlug, type: { not: "PLATFORM_INTERNAL" } },
        select: { id: true },
      });
      if (!customer) return { ok: false, error: "customer_not_found" };

      await setWorkspaceDatabaseContext(transaction, customer.id);

      const flag = await transaction.featureFlag.findUnique({
        where: { key: input.key, status: "ACTIVE" },
        select: {
          id: true,
          workspaceOverrides: {
            where: { workspaceId: customer.id },
            select: { enabled: true },
          },
        },
      });
      if (!flag) return { ok: false, error: "flag_not_found" };

      if (
        input.key === "staff_mfa" &&
        requireStaffMfaFromEnvironment() &&
        input.mode === "disabled"
      ) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: customer.id,
            actorUserIdentityId: identity.userIdentityId,
            action: "workspace_feature_flag.update",
            outcome: "DENIED",
            targetType: "workspace_feature_flag",
            targetId: input.key,
            requestId: randomUUID(),
            metadata: { reason: "release_protected" },
          },
        });
        return { ok: false, error: "release_protected" };
      }

      const previous = flag.workspaceOverrides[0]?.enabled ?? null;
      const next = input.mode === "inherit" ? null : input.mode === "enabled";

      if (next === null) {
        await transaction.workspaceFeatureFlagOverride.deleteMany({
          where: { workspaceId: customer.id, featureFlagId: flag.id },
        });
      } else {
        await transaction.workspaceFeatureFlagOverride.upsert({
          where: {
            workspaceId_featureFlagId: {
              workspaceId: customer.id,
              featureFlagId: flag.id,
            },
          },
          create: {
            workspaceId: customer.id,
            featureFlagId: flag.id,
            enabled: next,
            changedByUserIdentityId: identity.userIdentityId,
          },
          update: {
            enabled: next,
            changedByUserIdentityId: identity.userIdentityId,
            changedAt: new Date(),
          },
        });
      }

      await transaction.auditEvent.create({
        data: {
          workspaceId: customer.id,
          actorUserIdentityId: identity.userIdentityId,
          action: "workspace_feature_flag.update",
          outcome: "SUCCEEDED",
          targetType: "workspace_feature_flag",
          targetId: input.key,
          requestId: randomUUID(),
          metadata: { previous, next },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
