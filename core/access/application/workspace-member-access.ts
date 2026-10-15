import "server-only";

import { randomUUID } from "node:crypto";
import {
  lockWorkspaceAccessChanges,
  setWorkspaceDatabaseContext,
  withVerifiedIdentity,
} from "@/core/access/data/database-context";
import {
  DATABASE_ROLE_TO_SYSTEM_ROLE,
  SYSTEM_ROLE_TO_DATABASE_ROLE,
} from "@/core/access/data/role-mapping";
import {
  evaluateRoleChange,
  type RoleChangeDenial,
} from "../domain/role-change";
import {
  evaluateScopeChange,
  type ScopeChangeDenial,
} from "../domain/scope-change";
import {
  isSystemRole,
  validateRoleCombination,
  type SystemRole,
} from "../domain/role";
import { validateMembershipScope, type MembershipScope } from "../domain/scope";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UpdateMemberAccessError =
  | RoleChangeDenial
  | ScopeChangeDenial
  | "access_denied"
  | "invalid_branch"
  | "invalid_input"
  | "invalid_scope"
  | "member_not_found";

export type UpdateMemberAccessResult =
  | { ok: true }
  | {
      ok: false;
      error: UpdateMemberAccessError;
    };

export async function updateWorkspaceMemberAccess(input: {
  authSubject: string;
  workspaceSlug: string;
  targetMembershipId: string;
  proposedRoleValues: readonly string[];
  proposedScope: MembershipScope;
}): Promise<UpdateMemberAccessResult> {
  const rolesAreValid = input.proposedRoleValues.every(isSystemRole);
  const roles = rolesAreValid
    ? (input.proposedRoleValues as readonly SystemRole[])
    : [];
  const roleValidation = rolesAreValid ? validateRoleCombination(roles) : null;
  const scopeValidation = validateMembershipScope(input.proposedScope);
  const branchIds =
    scopeValidation.ok && scopeValidation.scope.kind === "named_branches"
      ? [...scopeValidation.scope.branchIds]
      : [];
  const validationError =
    !UUID_PATTERN.test(input.targetMembershipId) || !rolesAreValid
      ? "invalid_input"
      : !roleValidation?.ok
        ? "invalid_role_combination"
        : !scopeValidation.ok
          ? "invalid_scope"
          : branchIds.some((id) => !UUID_PATTERN.test(id))
            ? "invalid_branch"
            : null;

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateMemberAccessResult> => {
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

      const deny = async (reason: UpdateMemberAccessError) => {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.access.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: UUID_PATTERN.test(input.targetMembershipId)
              ? input.targetMembershipId
              : null,
            requestId: randomUUID(),
            metadata: { reason },
          },
        });
        return { ok: false as const, error: reason };
      };

      if (validationError || !scopeValidation.ok) {
        return deny(validationError ?? "invalid_scope");
      }

      const [actorAccess, target, otherActiveOwnerCount] = await Promise.all([
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
        transaction.membership.count({
          where: {
            workspaceId: actor.workspaceId,
            id: { not: input.targetMembershipId },
            status: "ACTIVE",
            roles: { some: { roleCode: "WORKSPACE_OWNER" } },
          },
        }),
      ]);
      if (!actorAccess) return { ok: false, error: "access_denied" };
      if (!target) return deny("member_not_found");

      const actorRoles = actorAccess.roles.map(
        ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
      );
      const targetRoles = target.roles.map(
        ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
      );
      const actorBranchIds = actorAccess.branchAccess.map(
        ({ branchId }) => branchId,
      );
      const targetIsVisible =
        actorAccess.scopeMode === "WORKSPACE" ||
        target.scopeMode === "WORKSPACE" ||
        target.branchAccess.some(({ branchId }) =>
          actorBranchIds.includes(branchId),
        );
      if (!targetIsVisible) return deny("member_not_found");

      const roleDecision = evaluateRoleChange({
        actorMembershipId: actor.id,
        targetMembershipId: target.id,
        actorRoles,
        currentTargetRoles: targetRoles,
        proposedTargetRoles: roles,
        otherActiveOwnerCount,
      });
      if (!roleDecision.allowed) return deny(roleDecision.reason);

      const scopeDecision = evaluateScopeChange({
        actorMembershipId: actor.id,
        targetMembershipId: target.id,
        actorRoles,
        targetRoles,
      });
      if (!scopeDecision.allowed) return deny(scopeDecision.reason);

      if (
        actorAccess.scopeMode === "NAMED_BRANCHES" &&
        (scopeValidation.scope.kind === "workspace" ||
          branchIds.some((branchId) => !actorBranchIds.includes(branchId)))
      ) {
        return deny("invalid_branch");
      }

      if (scopeValidation.scope.kind === "named_branches") {
        const proposedBranches = await transaction.branch.findMany({
          where: { workspaceId: actor.workspaceId, id: { in: branchIds } },
          select: { id: true, status: true },
        });
        const currentBranchIds = target.branchAccess.map(
          ({ branchId }) => branchId,
        );
        if (
          proposedBranches.length !== branchIds.length ||
          proposedBranches.some(
            (branch) =>
              branch.status !== "ACTIVE" &&
              !currentBranchIds.includes(branch.id),
          )
        ) {
          return deny("invalid_branch");
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

      await transaction.membershipRole.deleteMany({
        where: {
          membershipId: target.id,
          workspaceId: actor.workspaceId,
          roleCode: {
            notIn: roles.map((role) => SYSTEM_ROLE_TO_DATABASE_ROLE[role]),
          },
        },
      });
      await transaction.membershipRole.createMany({
        data: roles.map((role) => ({
          workspaceId: actor.workspaceId,
          membershipId: target.id,
          roleCode: SYSTEM_ROLE_TO_DATABASE_ROLE[role],
          assignedByUserIdentityId: identity.userIdentityId,
        })),
        skipDuplicates: true,
      });
      await transaction.membership.update({
        where: { id: target.id },
        data: {
          scopeMode:
            newScope.kind === "workspace" ? "WORKSPACE" : "NAMED_BRANCHES",
        },
      });
      await transaction.membershipBranchAccess.deleteMany({
        where: { workspaceId: actor.workspaceId, membershipId: target.id },
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
          action: "membership.access.update",
          outcome: "SUCCEEDED",
          targetType: "membership",
          targetId: target.id,
          requestId: randomUUID(),
          metadata: {
            previousRoles: targetRoles,
            newRoles: roles,
            previousScope,
            newScope,
          },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
