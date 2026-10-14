import "server-only";

import { randomUUID } from "node:crypto";
import {
  setWorkspaceDatabaseContext,
  withVerifiedIdentity,
} from "@/core/access/data/database-context";
import { DATABASE_ROLE_TO_SYSTEM_ROLE } from "@/core/access/data/role-mapping";
import { hasPermission } from "@/core/access/domain/role";
import {
  CUSTOMER_DETAIL_FIELDS,
  validateCustomerDetails,
  type CustomerDetailField,
  type CustomerDetailsInput,
  type ValidCustomerDetails,
} from "@/core/workspace/domain/customer-details";

export type CustomerDetailsRecord = ValidCustomerDetails & {
  id: string;
  slug: string;
  type: "AGENCY" | "LANDLORD";
  status: "ACTIVE" | "SUSPENDED" | "CLOSED";
  createdAt: Date;
};

export type WorkspaceCustomerDetailsResult = {
  details: CustomerDetailsRecord;
  canEdit: boolean;
};

export type UpdateCustomerDetailsResult =
  | { ok: true }
  | {
      ok: false;
      error: "access_denied" | "customer_not_found" | "invalid_input";
      fieldErrors?: Partial<Record<CustomerDetailField, string>>;
    };

export type CustomerDetailsFormState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Partial<Record<CustomerDetailField, string>>;
};

const CUSTOMER_DETAILS_SELECT = {
  id: true,
  slug: true,
  displayName: true,
  legalName: true,
  companyNumber: true,
  primaryEmail: true,
  telephone: true,
  website: true,
  registeredAddress1: true,
  registeredAddress2: true,
  registeredTownCity: true,
  registeredCounty: true,
  registeredPostcode: true,
  type: true,
  status: true,
  createdAt: true,
} as const;

function changedFields(
  previous: ValidCustomerDetails,
  next: ValidCustomerDetails,
) {
  return CUSTOMER_DETAIL_FIELDS.filter(
    (field) => previous[field] !== next[field],
  );
}

function editableDetails(record: CustomerDetailsRecord): ValidCustomerDetails {
  return Object.fromEntries(
    CUSTOMER_DETAIL_FIELDS.map((field) => [field, record[field]]),
  ) as ValidCustomerDetails;
}

export async function getWorkspaceCustomerDetails(
  authSubject: string,
  workspaceSlug: string,
): Promise<WorkspaceCustomerDetailsResult | null> {
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
      select: { roles: { select: { roleCode: true } } },
    });
    if (!actorWithRoles) return null;

    const roles = actorWithRoles.roles.map(
      ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
    );
    if (!hasPermission(roles, "workspace.read")) return null;

    const workspace = await transaction.workspace.findFirst({
      where: { id: actor.workspaceId, slug: workspaceSlug },
      select: CUSTOMER_DETAILS_SELECT,
    });
    if (!workspace || workspace.type === "PLATFORM_INTERNAL") return null;
    return {
      details: {
        ...workspace,
        type: workspace.type as "AGENCY" | "LANDLORD",
      },
      canEdit: hasPermission(roles, "workspace.update"),
    };
  });
}

export async function updateWorkspaceCustomerDetails(input: {
  authSubject: string;
  workspaceSlug: string;
  details: CustomerDetailsInput;
}): Promise<UpdateCustomerDetailsResult> {
  const validation = validateCustomerDetails(input.details);

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateCustomerDetailsResult> => {
      const actor = await transaction.membership.findFirst({
        where: {
          userIdentityId: identity.userIdentityId,
          status: "ACTIVE",
          workspace: { slug: input.workspaceSlug, status: "ACTIVE" },
        },
        select: { id: true, workspaceId: true },
      });
      if (!actor) return { ok: false, error: "access_denied" };

      await setWorkspaceDatabaseContext(transaction, actor.workspaceId);
      const actorWithRoles = await transaction.membership.findUnique({
        where: { id: actor.id },
        select: { roles: { select: { roleCode: true } } },
      });
      if (!actorWithRoles) return { ok: false, error: "access_denied" };

      const roles = actorWithRoles.roles.map(
        ({ roleCode }) => DATABASE_ROLE_TO_SYSTEM_ROLE[roleCode],
      );
      const permitted = hasPermission(roles, "workspace.update");
      if (!permitted || !validation.ok) {
        const reason = permitted ? "invalid_input" : "access_denied";
        await transaction.auditEvent.create({
          data: {
            workspaceId: actor.workspaceId,
            actorUserIdentityId: identity.userIdentityId,
            actorMembershipId: actor.id,
            action: "workspace.details.update",
            outcome: "DENIED",
            targetType: "workspace",
            targetId: actor.workspaceId,
            requestId: randomUUID(),
            metadata: { reason },
          },
        });
        return {
          ok: false,
          error: reason,
          fieldErrors: validation.ok ? undefined : validation.fieldErrors,
        };
      }

      const workspace = await transaction.workspace.findFirst({
        where: {
          id: actor.workspaceId,
          slug: input.workspaceSlug,
          status: "ACTIVE",
          type: { not: "PLATFORM_INTERNAL" },
        },
        select: CUSTOMER_DETAILS_SELECT,
      });
      if (!workspace) return { ok: false, error: "customer_not_found" };

      const previous = editableDetails({
        ...workspace,
        type: workspace.type as "AGENCY" | "LANDLORD",
      });
      const changes = changedFields(previous, validation.details);
      if (changes.length === 0) return { ok: true };

      await transaction.workspace.update({
        where: { id: workspace.id },
        data: validation.details,
      });
      await transaction.auditEvent.create({
        data: {
          workspaceId: workspace.id,
          actorUserIdentityId: identity.userIdentityId,
          actorMembershipId: actor.id,
          action: "workspace.details.update",
          outcome: "SUCCEEDED",
          targetType: "workspace",
          targetId: workspace.id,
          requestId: randomUUID(),
          metadata: { changedFields: changes },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}

export async function updatePlatformCustomerDetails(input: {
  authSubject: string;
  customerSlug: string;
  details: CustomerDetailsInput;
}): Promise<UpdateCustomerDetailsResult> {
  const validation = validateCustomerDetails(input.details);

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdateCustomerDetailsResult> => {
      if (!identity.isPlatformOwner) {
        return { ok: false, error: "access_denied" };
      }

      const workspace = await transaction.workspace.findFirst({
        where: {
          slug: input.customerSlug,
          type: { not: "PLATFORM_INTERNAL" },
        },
        select: CUSTOMER_DETAILS_SELECT,
      });
      if (!workspace) return { ok: false, error: "customer_not_found" };

      await setWorkspaceDatabaseContext(transaction, workspace.id);

      if (!validation.ok) {
        await transaction.auditEvent.create({
          data: {
            workspaceId: workspace.id,
            actorUserIdentityId: identity.userIdentityId,
            action: "workspace.details.update",
            outcome: "DENIED",
            targetType: "workspace",
            targetId: workspace.id,
            requestId: randomUUID(),
            metadata: { reason: "invalid_input", source: "platform" },
          },
        });
        return {
          ok: false,
          error: "invalid_input",
          fieldErrors: validation.fieldErrors,
        };
      }

      const previous = editableDetails({
        ...workspace,
        type: workspace.type as "AGENCY" | "LANDLORD",
      });
      const changes = changedFields(previous, validation.details);
      if (changes.length === 0) return { ok: true };

      await transaction.workspace.update({
        where: { id: workspace.id },
        data: validation.details,
      });
      await transaction.auditEvent.create({
        data: {
          workspaceId: workspace.id,
          actorUserIdentityId: identity.userIdentityId,
          action: "workspace.details.update",
          outcome: "SUCCEEDED",
          targetType: "workspace",
          targetId: workspace.id,
          requestId: randomUUID(),
          metadata: { changedFields: changes, source: "platform" },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
