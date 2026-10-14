import "server-only";

import {
  setWorkspaceDatabaseContext,
  withVerifiedIdentity,
} from "@/core/access/data/database-context";
import { DATABASE_ROLE_TO_SYSTEM_ROLE } from "@/core/access/data/role-mapping";
import { hasPermission } from "@/core/access/domain/role";
import {
  validateMembershipScope,
  type MembershipScope,
} from "@/core/access/domain/scope";

export type WorkspaceBranchSummary = {
  id: string;
  name: string;
  email: string | null;
  telephone: string | null;
  address1: string | null;
  address2: string | null;
  townCity: string | null;
  county: string | null;
  postcode: string | null;
  status: "ACTIVE" | "INACTIVE";
};

export async function getWorkspaceBranches(
  authSubject: string,
  workspaceSlug: string,
): Promise<readonly WorkspaceBranchSummary[] | null> {
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
    const membership = await transaction.membership.findUnique({
      where: { id: actor.id },
      select: {
        scopeMode: true,
        roles: { select: { roleCode: true } },
        branchAccess: { select: { branchId: true } },
      },
    });
    if (!membership) return null;

    const roles = membership.roles.map(
      ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
    );
    if (!hasPermission(roles, "branch.read")) return null;

    const proposedScope: MembershipScope =
      membership.scopeMode === "WORKSPACE"
        ? { kind: "workspace" }
        : {
            kind: "named_branches",
            branchIds: membership.branchAccess.map(({ branchId }) => branchId),
          };
    const scope = validateMembershipScope(proposedScope);
    if (!scope.ok) return null;

    return transaction.branch.findMany({
      where: {
        workspaceId: actor.workspaceId,
        ...(scope.scope.kind === "named_branches"
          ? { id: { in: [...scope.scope.branchIds] } }
          : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        telephone: true,
        address1: true,
        address2: true,
        townCity: true,
        county: true,
        postcode: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });
  });
}
