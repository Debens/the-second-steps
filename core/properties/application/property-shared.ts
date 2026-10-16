import "server-only";

import {
  withVerifiedIdentity,
  type AccessTransaction,
} from "@/core/access/data/database-context";
import { audit } from "@/core/contacts/application/contacts";
import {
  resolveContactActor,
  type ContactActor,
} from "@/core/contacts/application/contact-actor";

export type PropertyTransaction = AccessTransaction;
export type PropertyActor = ContactActor;
export type ActorInput = { authSubject: string; workspaceSlug: string };

export type PropertyWriteError =
  | "access_denied"
  | "property_not_found"
  | "contact_not_found"
  | "ownership_not_found"
  | "invalid_input"
  | "invalid_state";

export type PropertyFailure = { ok: false; error: PropertyWriteError };

export type PropertyWriteResult =
  { ok: true; propertyId: string } | PropertyFailure;

/**
 * Thrown inside a transaction to undo everything written so far. Returning an
 * error result would commit earlier writes, so a failure after the first
 * write must throw this instead.
 */
export class PropertyRollback extends Error {
  constructor(readonly error: PropertyWriteError) {
    super(`Property change rolled back: ${error}`);
  }
}

export function propertyAudit(
  transaction: PropertyTransaction,
  actor: PropertyActor,
  input: {
    action: string;
    outcome: "SUCCEEDED" | "DENIED";
    targetId?: string;
    metadata?: Record<string, string | string[]>;
  },
) {
  return audit(transaction, actor, { ...input, targetType: "property" });
}

export async function propertyDeny(
  transaction: PropertyTransaction,
  actor: PropertyActor,
  action: string,
  error: PropertyWriteError,
  targetId?: string,
): Promise<PropertyFailure> {
  await propertyAudit(transaction, actor, {
    action,
    outcome: "DENIED",
    targetId,
    metadata: { reason: error },
  });
  return { ok: false, error };
}

export async function withPropertyActor<T extends { ok: true }>(
  input: ActorInput,
  operation: (
    transaction: PropertyTransaction,
    actor: PropertyActor,
  ) => Promise<T | PropertyFailure>,
): Promise<T | PropertyFailure> {
  try {
    const result = await withVerifiedIdentity(
      input.authSubject,
      async (transaction, identity): Promise<T | PropertyFailure> => {
        const actor = await resolveContactActor(transaction, {
          userIdentityId: identity.userIdentityId,
          workspaceSlug: input.workspaceSlug,
        });
        if (!actor) return { ok: false, error: "access_denied" };
        return operation(transaction, actor);
      },
    );
    return result ?? { ok: false, error: "access_denied" };
  } catch (error) {
    if (error instanceof PropertyRollback) {
      return { ok: false, error: error.error };
    }
    throw error;
  }
}

/** Gives a contact a non-primary link to a branch, unless it already has one. */
export async function shareContactWithBranch(
  transaction: PropertyTransaction,
  actor: PropertyActor,
  contactId: string,
  branchId: string,
) {
  const existing = await transaction.contactBranchLink.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      contactId,
      branchId,
      endedAt: null,
    },
    select: { id: true },
  });
  if (existing) return false;

  await transaction.contactBranchLink.create({
    data: {
      workspaceId: actor.workspaceId,
      contactId,
      branchId,
      isPrimary: false,
      createdByMembershipId: actor.membershipId,
    },
  });
  return true;
}
