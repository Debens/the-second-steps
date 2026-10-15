import "server-only";

import { randomUUID } from "node:crypto";
import {
  evaluateRoleChange,
  type RoleChangeDenial,
} from "@/core/access/domain/role-change";
import {
  hasPermission,
  isSystemRole,
  type SystemRole,
  validateRoleCombination,
} from "@/core/access/domain/role";
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
  validateMembershipScope,
  type MembershipScope,
} from "@/core/access/domain/scope";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type WorkspaceMemberSummary = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  primaryEmail: string | null;
  isCurrentUser: boolean;
  status: "ACTIVE" | "SUSPENDED" | "ENDED";
  roles: readonly SystemRole[];
  scopeMode: "WORKSPACE" | "NAMED_BRANCHES";
  branchCount: number;
  branchIds: readonly string[];
  canManageScope: boolean;
};

export type WorkspaceMembersResult = {
  actorMembershipId: string;
  canManageRoles: boolean;
  canManageBranchScopes: boolean;
  activeBranches: readonly { id: string; name: string }[];
  members: readonly WorkspaceMemberSummary[];
};

export type UpdateRolesResult =
  | { ok: true }
  | {
      ok: false;
      error:
        | RoleChangeDenial
        | "access_denied"
        | "invalid_input"
        | "member_not_found";
    };

function toSystemRoles(
  roles: ReadonlyArray<{ roleCode: keyof typeof DATABASE_ROLE_TO_SYSTEM_ROLE }>,
) {
  return roles.map(({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode]);
}

export async function getWorkspaceMembers(
  authSubject: string,
  workspaceSlug: string,
): Promise<WorkspaceMembersResult | null> {
  return withVerifiedIdentity(authSubject, async (transaction, identity) => {
    const actor = await transaction.membership.findFirst({
      where: {
        userIdentityId: identity.userIdentityId,
        status: "ACTIVE",
        workspace: { slug: workspaceSlug, status: "ACTIVE" },
      },
      select: { id: true, workspaceId: true },
    });
    if (!actor) return null;

    await setWorkspaceDatabaseContext(transaction, actor.workspaceId);

    const actorWithRoles = await transaction.membership.findUnique({
      where: { id: actor.id },
      select: {
        scopeMode: true,
        roles: { select: { roleCode: true } },
        branchAccess: { select: { branchId: true } },
      },
    });
    if (!actorWithRoles) return null;

    const actorRoles = toSystemRoles(actorWithRoles.roles);
    if (!hasPermission(actorRoles, "membership.read")) return null;

    const proposedScope: MembershipScope =
      actorWithRoles.scopeMode === "WORKSPACE"
        ? { kind: "workspace" }
        : {
            kind: "named_branches",
            branchIds: actorWithRoles.branchAccess.map(
              ({ branchId }) => branchId,
            ),
          };
    const scopeValidation = validateMembershipScope(proposedScope);
    if (!scopeValidation.ok) return null;

    const visibilityFilter =
      scopeValidation.scope.kind === "workspace"
        ? {}
        : {
            OR: [
              { scopeMode: "WORKSPACE" as const },
              {
                branchAccess: {
                  some: {
                    branchId: { in: [...scopeValidation.scope.branchIds] },
                  },
                },
              },
            ],
          };

    const [memberships, activeBranches] = await Promise.all([
      transaction.membership.findMany({
        where: { workspaceId: actor.workspaceId, ...visibilityFilter },
        select: {
          id: true,
          userIdentityId: true,
          status: true,
          scopeMode: true,
          userIdentity: {
            select: {
              firstName: true,
              lastName: true,
              primaryEmail: true,
            },
          },
          roles: { select: { roleCode: true } },
          branchAccess: { select: { branchId: true } },
        },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      }),
      transaction.branch.findMany({
        where: {
          workspaceId: actor.workspaceId,
          status: "ACTIVE",
          ...(scopeValidation.scope.kind === "named_branches"
            ? { id: { in: [...scopeValidation.scope.branchIds] } }
            : {}),
        },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);

    const canManageBranchScopes = hasPermission(
      actorRoles,
      "membership.scope.manage",
    );
    const actorIsOwner = actorRoles.includes("workspace_owner");

    return {
      actorMembershipId: actor.id,
      canManageRoles: hasPermission(actorRoles, "membership.roles.manage"),
      canManageBranchScopes,
      activeBranches,
      members: memberships.map((membership) => {
        const roles = toSystemRoles(membership.roles);
        const isCurrentUser =
          membership.userIdentityId === identity.userIdentityId;
        return {
          id: membership.id,
          firstName: membership.userIdentity.firstName,
          lastName: membership.userIdentity.lastName,
          primaryEmail: membership.userIdentity.primaryEmail,
          isCurrentUser,
          status: membership.status,
          roles,
          scopeMode: membership.scopeMode,
          branchCount: membership.branchAccess.length,
          branchIds: membership.branchAccess.map(({ branchId }) => branchId),
          canManageScope:
            canManageBranchScopes &&
            !isCurrentUser &&
            membership.status === "ACTIVE" &&
            (actorIsOwner || !roles.includes("workspace_owner")),
        };
      }),
    };
  });
}

export async function updateWorkspaceMemberRoles(input: {
  authSubject: string;
  workspaceSlug: string;
  targetMembershipId: string;
  proposedRoleValues: readonly string[];
}): Promise<UpdateRolesResult> {
  const targetIdIsValid = UUID_PATTERN.test(input.targetMembershipId);
  const rolesAreValid = input.proposedRoleValues.every(isSystemRole);
  const proposedRoles = rolesAreValid
    ? (input.proposedRoleValues as readonly SystemRole[])
    : [];
  const roleCombination = rolesAreValid
    ? validateRoleCombination(proposedRoles)
    : null;
  const validationError =
    !targetIdIsValid || !rolesAreValid
      ? "invalid_input"
      : !roleCombination?.ok
        ? "invalid_role_combination"
        : null;

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateRolesResult> => {
      const actor = await transaction.membership.findFirst({
        where: {
          userIdentityId: identity.userIdentityId,
          status: "ACTIVE",
          workspace: { slug: input.workspaceSlug, status: "ACTIVE" },
        },
        select: { id: true, workspaceId: true },
      });
      if (!actor) {
        await transaction.auditEvent.create({
          data: {
            actorUserIdentityId: identity.userIdentityId,
            action: "membership.roles.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: targetIdIsValid ? input.targetMembershipId : null,
            requestId: randomUUID(),
            metadata: { reason: validationError ?? "access_denied" },
          },
        });
        return {
          ok: false,
          error: validationError ?? "access_denied",
        };
      }

      await setWorkspaceDatabaseContext(transaction, actor.workspaceId);
      await lockWorkspaceAccessChanges(transaction, actor.workspaceId);

      if (validationError) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.roles.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: targetIdIsValid ? input.targetMembershipId : null,
            requestId: randomUUID(),
            metadata: { reason: validationError },
          },
        });
        return { ok: false, error: validationError };
      }

      const [actorWithRoles, target] = await Promise.all([
        transaction.membership.findUnique({
          where: { id: actor.id },
          select: { roles: { select: { roleCode: true } } },
        }),
        transaction.membership.findFirst({
          where: {
            id: input.targetMembershipId,
            workspaceId: actor.workspaceId,
            status: "ACTIVE",
          },
          select: {
            id: true,
            roles: { select: { roleCode: true } },
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
            action: "membership.roles.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: input.targetMembershipId,
            requestId: randomUUID(),
            metadata: { reason: "member_not_found" },
          },
        });
        return { ok: false, error: "member_not_found" };
      }

      const actorRoles = toSystemRoles(actorWithRoles.roles);
      const currentTargetRoles = toSystemRoles(target.roles);
      const otherActiveOwnerCount = await transaction.membership.count({
        where: {
          workspaceId: actor.workspaceId,
          id: { not: target.id },
          status: "ACTIVE",
          roles: { some: { roleCode: "WORKSPACE_OWNER" } },
        },
      });
      const decision = evaluateRoleChange({
        actorMembershipId: actor.id,
        targetMembershipId: target.id,
        actorRoles,
        currentTargetRoles,
        proposedTargetRoles: proposedRoles,
        otherActiveOwnerCount,
      });

      if (!decision.allowed) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "membership.roles.update",
            outcome: "DENIED",
            targetType: "membership",
            targetId: target.id,
            requestId: randomUUID(),
            metadata: { reason: decision.reason },
          },
        });
        return { ok: false, error: decision.reason };
      }

      await transaction.membershipRole.deleteMany({
        where: {
          membershipId: target.id,
          workspaceId: actor.workspaceId,
          roleCode: {
            notIn: proposedRoles.map(
              (role) => SYSTEM_ROLE_TO_DATABASE_ROLE[role],
            ),
          },
        },
      });
      await transaction.membershipRole.createMany({
        data: proposedRoles.map((role) => ({
          workspaceId: actor.workspaceId,
          membershipId: target.id,
          roleCode: SYSTEM_ROLE_TO_DATABASE_ROLE[role],
          assignedByUserIdentityId: identity.userIdentityId,
        })),
        skipDuplicates: true,
      });
      await transaction.auditEvent.create({
        data: {
          workspaceId: actor.workspaceId,
          actorUserIdentityId: identity.userIdentityId,
          actorMembershipId: actor.id,
          action: "membership.roles.update",
          outcome: "SUCCEEDED",
          targetType: "membership",
          targetId: target.id,
          requestId: randomUUID(),
          metadata: {
            previousRoles: currentTargetRoles,
            newRoles: proposedRoles,
          },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
