import "server-only";

import { randomUUID } from "node:crypto";
import {
  lockWorkspaceAccessChanges,
  setWorkspaceDatabaseContext,
  withVerifiedIdentity,
} from "@/core/access/data/database-context";
import { DATABASE_ROLE_TO_SYSTEM_ROLE } from "@/core/access/data/role-mapping";
import {
  evaluateScopeChange,
  type ScopeChangeDenial,
} from "@/core/access/domain/scope-change";
import {
  validateMembershipScope,
  type MembershipScope,
} from "@/core/access/domain/scope";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UpdateMemberScopeResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | ScopeChangeDenial
        | "access_denied"
        | "invalid_branch"
        | "invalid_input"
        | "invalid_scope"
        | "member_not_found";
    };

export async function updateWorkspaceMemberScope(input: {
  authSubject: string;
  workspaceSlug: string;
  targetMembershipId: string;
  proposedScope: MembershipScope;
}): Promise<UpdateMemberScopeResult> {
  const targetIdIsValid = UUID_PATTERN.test(input.targetMembershipId);
  const scopeValidation = validateMembershipScope(input.proposedScope);
  const branchIds =
    scopeValidation.ok && scopeValidation.scope.kind === "named_branches"
      ? [...scopeValidation.scope.branchIds]
      : [];
  const branchIdsAreValid = branchIds.every((id) => UUID_PATTERN.test(id));
  const validationError = !targetIdIsValid
    ? "invalid_input"
    : !scopeValidation.ok
      ? "invalid_scope"
      : !branchIdsAreValid
        ? "invalid_branch"
        : null;

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateMemberScopeResult> => {
      const actor = await transaction.membership.findFirst({
        where: {
          userIdentityId: identity.userIdentityId,
          status: "ACTIVE",
          workspace: { slug: input.workspaceSlug, status: "ACTIVE" },
        },
        select: { id: true, workspaceId: true },
      });
      if (!actor)
        return { ok: false, error: validationError ?? "access_denied" };

      await setWorkspaceDatabaseContext(transaction, actor.workspaceId);
      await lockWorkspaceAccessChanges(transaction, actor.workspaceId);

      if (validationError || !scopeValidation.ok) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.scope.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: targetIdIsValid ? input.targetMembershipId : null,
            requestId: randomUUID(),
            metadata: { reason: validationError ?? "invalid_scope" },
          },
        });
        return {
          ok: false,
          error: validationError ?? "invalid_scope",
        };
      }

      const [actorWithRoles, target] = await Promise.all([
        transaction.membership.findUnique({
          where: { id: actor.id },
          select: {
            scopeMode: true,
            roles: { select: { roleCode: true } },
            branchAccess: { select: { branchId: true } },
          },
        }),
        transaction.membership.findFirst({
          where: {
            id: input.targetMembershipId,
            workspaceId: actor.workspaceId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            scopeMode: true,
            roles: { select: { roleCode: true } },
            branchAccess: { select: { branchId: true } },
          },
        }),
      ]);
      if (!actorWithRoles) return { ok: false, error: "access_denied" };
      if (!target) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.scope.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: input.targetMembershipId,
            requestId: randomUUID(),
            metadata: { reason: "member_not_found" },
          },
        });
        return { ok: false, error: "member_not_found" };
      }

      const actorRoles = actorWithRoles.roles.map(
        ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
      );
      const targetRoles = target.roles.map(
        ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
      );
      const actorBranchIds = actorWithRoles.branchAccess.map(
        ({ branchId }) => branchId,
      );
      const targetIsVisible =
        actorWithRoles.scopeMode === "WORKSPACE" ||
        target.scopeMode === "WORKSPACE" ||
        target.branchAccess.some(({ branchId }) =>
          actorBranchIds.includes(branchId),
        );
      if (!targetIsVisible) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.scope.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: target.id,
            requestId: randomUUID(),
            metadata: { reason: "member_not_found" },
          },
        });
        return { ok: false, error: "member_not_found" };
      }

      const decision = evaluateScopeChange({
        actorMembershipId: actor.id,
        targetMembershipId: target.id,
        actorRoles,
        targetRoles,
      });
      if (!decision.allowed) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.scope.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: target.id,
            requestId: randomUUID(),
            metadata: { reason: decision.reason },
          },
        });
        return { ok: false, error: decision.reason };
      }

      const proposedScopeExceedsActor =
        actorWithRoles.scopeMode === "NAMED_BRANCHES" &&
        (scopeValidation.scope.kind === "workspace" ||
          branchIds.some((branchId) => !actorBranchIds.includes(branchId)));
      if (proposedScopeExceedsActor) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.scope.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: target.id,
            requestId: randomUUID(),
            metadata: { reason: "invalid_branch" },
          },
        });
        return { ok: false, error: "invalid_branch" };
      }

      if (scopeValidation.scope.kind === "named_branches") {
        const proposedBranches = await transaction.branch.findMany({
          where: {
            workspaceId: actor.workspaceId,
            id: { in: branchIds },
          },
          select: { id: true, status: true },
        });
        const currentBranchIds = target.branchAccess.map(
          ({ branchId }) => branchId,
        );
        const containsNewInactiveBranch = proposedBranches.some(
          (branch) =>
            branch.status !== "ACTIVE" && !currentBranchIds.includes(branch.id),
        );
        if (
          proposedBranches.length !== branchIds.length ||
          containsNewInactiveBranch
        ) {
          await transaction.auditEvent.create({
            data: {
              workspaceId: actor.workspaceId,
              actorUserIdentityId: identity.userIdentityId,
              actorMembershipId: actor.id,
              action: "membership.scope.update",
              outcome: "DENIED",
              targetType: "membership",
              targetId: target.id,
              requestId: randomUUID(),
              metadata: { reason: "invalid_branch" },
            },
          });
          return { ok: false, error: "invalid_branch" };
        }
      }

      const previousScope =
        target.scopeMode === "WORKSPACE"
          ? { kind: "workspace" as const }
          : {
              kind: "named_branches" as const,
              branchIds: target.branchAccess.map(({ branchId }) => branchId),
            };
      const newScope = scopeValidation.scope;

      await transaction.membership.update({
        where: { id: target.id },
        data: {
          scopeMode:
            newScope.kind === "workspace" ? "WORKSPACE" : "NAMED_BRANCHES",
        },
      });
      await transaction.membershipBranchAccess.deleteMany({
        where: {
          workspaceId: actor.workspaceId,
          membershipId: target.id,
        },
      });
      if (newScope.kind === "named_branches") {
        await transaction.membershipBranchAccess.createMany({
          data: newScope.branchIds.map((branchId) => ({
            workspaceId: actor.workspaceId,
            membershipId: target.id,
            branchId,
            assignedByUserIdentityId: identity.userIdentityId,
          })),
        });
      }

      await transaction.auditEvent.create({
        data: {
          workspaceId: actor.workspaceId,
          actorUserIdentityId: identity.userIdentityId,
          actorMembershipId: actor.id,
          action: "membership.scope.update",
          outcome: "SUCCEEDED",
          targetType: "membership",
          targetId: target.id,
          requestId: randomUUID(),
          metadata: { previousScope, newScope },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
