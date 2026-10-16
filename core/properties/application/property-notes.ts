import "server-only";

import { withVerifiedIdentity } from "@/core/access/data/database-context";
import { hasPermission } from "@/core/access/domain/role";
import { PropertyNoteStatus } from "@/core/db/generated/enums";
import { resolveContactActor } from "@/core/contacts/application/contact-actor";
import { actorName } from "@/core/contacts/application/contact-notes";
import {
  validateNoteBody,
  validateNoteOccurredAt,
  validateNoteReason,
} from "@/core/contacts/domain/contact";
import {
  propertyAudit,
  propertyDeny,
  withPropertyActor,
  type ActorInput,
  type PropertyActor,
  type PropertyFailure,
  type PropertyTransaction,
} from "./property-shared";

export type PropertyNoteResult = { ok: true; noteId: string } | PropertyFailure;

export type PropertyNoteView = {
  id: string;
  body: string;
  occurredAt: Date;
  createdAt: Date;
  authorName: string;
  edited: boolean;
  voided: boolean;
  voidReason: string | null;
  voidedByName: string | null;
  voidedAt: Date | null;
  canManage: boolean;
};

function withNoteActor(
  input: ActorInput,
  permission: "property.note.create" | "property.note.manage",
  action: string,
  propertyId: string,
  operation: (
    transaction: PropertyTransaction,
    actor: PropertyActor,
  ) => Promise<PropertyNoteResult>,
) {
  return withPropertyActor<{ ok: true; noteId: string }>(
    input,
    async (transaction, actor) => {
      if (!hasPermission(actor.roles, permission)) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "access_denied",
          propertyId,
        );
      }
      return operation(transaction, actor);
    },
  );
}

export function addPropertyNote(
  input: ActorInput & {
    propertyId: string;
    body: string;
    occurredAt?: Date | null;
  },
): Promise<PropertyNoteResult> {
  const action = "property.note.create";
  return withNoteActor(
    input,
    "property.note.create",
    action,
    input.propertyId,
    async (transaction, actor) => {
      const body = validateNoteBody(input.body);
      const occurredAt = validateNoteOccurredAt(input.occurredAt);
      if (!body.ok || !occurredAt.ok) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.propertyId,
        );
      }
      // Notes may be added to an archived property, as they are history.
      const property = await transaction.property.findFirst({
        where: { id: input.propertyId, workspaceId: actor.workspaceId },
        select: { id: true },
      });
      if (!property) return { ok: false, error: "property_not_found" };

      const note = await transaction.propertyNote.create({
        data: {
          workspaceId: actor.workspaceId,
          propertyId: property.id,
          body: body.body,
          occurredAt: occurredAt.occurredAt,
          createdByMembershipId: actor.membershipId,
          authorName: await actorName(transaction, actor),
        },
        select: { id: true },
      });
      await propertyAudit(transaction, actor, {
        action,
        outcome: "SUCCEEDED",
        targetId: property.id,
        metadata: { noteId: note.id },
      });
      return { ok: true, noteId: note.id };
    },
  );
}

function findNote(
  transaction: PropertyTransaction,
  actor: PropertyActor,
  input: { propertyId: string; noteId: string },
) {
  return transaction.propertyNote.findFirst({
    where: {
      id: input.noteId,
      propertyId: input.propertyId,
      workspaceId: actor.workspaceId,
    },
    select: {
      id: true,
      propertyId: true,
      status: true,
      body: true,
      occurredAt: true,
      version: true,
    },
  });
}

export function editPropertyNote(
  input: ActorInput & {
    propertyId: string;
    noteId: string;
    body: string;
    occurredAt: Date | null;
    reason: string;
  },
): Promise<PropertyNoteResult> {
  const action = "property.note.edit";
  return withNoteActor(
    input,
    "property.note.manage",
    action,
    input.propertyId,
    async (transaction, actor) => {
      const body = validateNoteBody(input.body);
      const occurredAt = validateNoteOccurredAt(input.occurredAt);
      const reason = validateNoteReason(input.reason);
      if (!body.ok || !occurredAt.ok || !reason.ok) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.propertyId,
        );
      }
      const note = await findNote(transaction, actor, input);
      if (!note) return { ok: false, error: "property_not_found" };
      if (note.status !== PropertyNoteStatus.ACTIVE) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_state",
          note.propertyId,
        );
      }
      const changedFields = [
        ...(body.body !== note.body ? ["body"] : []),
        ...(occurredAt.occurredAt.getTime() !== note.occurredAt.getTime()
          ? ["occurred_at"]
          : []),
      ];
      if (!changedFields.length) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_input",
          note.propertyId,
        );
      }
      // Only apply the edit if nobody changed the note since it was read, so
      // the recorded "previous" wording is always the wording replaced.
      const updated = await transaction.propertyNote.updateMany({
        where: {
          id: note.id,
          workspaceId: actor.workspaceId,
          status: PropertyNoteStatus.ACTIVE,
          version: note.version,
        },
        data: {
          body: body.body,
          occurredAt: occurredAt.occurredAt,
          lastEditedAt: new Date(),
          version: { increment: 1 },
        },
      });
      if (updated.count !== 1) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_state",
          note.propertyId,
        );
      }
      await transaction.propertyNoteRevision.create({
        data: {
          workspaceId: actor.workspaceId,
          noteId: note.id,
          previousBody: note.body,
          previousOccurredAt: note.occurredAt,
          editReason: reason.reason,
          editedByMembershipId: actor.membershipId,
        },
      });
      await propertyAudit(transaction, actor, {
        action,
        outcome: "SUCCEEDED",
        targetId: note.propertyId,
        metadata: { noteId: note.id, changedFields },
      });
      return { ok: true, noteId: note.id };
    },
  );
}

export function voidPropertyNote(
  input: ActorInput & { propertyId: string; noteId: string; reason: string },
): Promise<PropertyNoteResult> {
  const action = "property.note.void";
  return withNoteActor(
    input,
    "property.note.manage",
    action,
    input.propertyId,
    async (transaction, actor) => {
      const reason = validateNoteReason(input.reason);
      if (!reason.ok) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.propertyId,
        );
      }
      const note = await findNote(transaction, actor, input);
      if (!note) return { ok: false, error: "property_not_found" };
      if (note.status !== PropertyNoteStatus.ACTIVE) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_state",
          note.propertyId,
        );
      }
      const voided = await transaction.propertyNote.updateMany({
        where: {
          id: note.id,
          workspaceId: actor.workspaceId,
          status: PropertyNoteStatus.ACTIVE,
          version: note.version,
        },
        data: {
          status: PropertyNoteStatus.VOIDED,
          voidedAt: new Date(),
          voidedByMembershipId: actor.membershipId,
          voidedByName: await actorName(transaction, actor),
          voidReason: reason.reason,
          version: { increment: 1 },
        },
      });
      if (voided.count !== 1) {
        return propertyDeny(
          transaction,
          actor,
          action,
          "invalid_state",
          note.propertyId,
        );
      }
      await propertyAudit(transaction, actor, {
        action,
        outcome: "SUCCEEDED",
        targetId: note.propertyId,
        metadata: { noteId: note.id },
      });
      return { ok: true, noteId: note.id };
    },
  );
}

const NOTE_PAGE_SIZE = 50;

export function listPropertyNotes(
  input: ActorInput & { propertyId: string; includeVoided?: boolean },
): Promise<PropertyNoteView[] | null> {
  return withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity) => {
      const actor = await resolveContactActor(transaction, {
        userIdentityId: identity.userIdentityId,
        workspaceSlug: input.workspaceSlug,
      });
      if (!actor || !hasPermission(actor.roles, "property.read")) return null;
      const canManage = hasPermission(actor.roles, "property.note.manage");
      const notes = await transaction.propertyNote.findMany({
        where: {
          workspaceId: actor.workspaceId,
          propertyId: input.propertyId,
          ...(input.includeVoided && canManage
            ? {}
            : { status: PropertyNoteStatus.ACTIVE }),
        },
        orderBy: [{ occurredAt: "desc" }, { id: "asc" }],
        take: NOTE_PAGE_SIZE,
      });
      return notes.map((note) => ({
        id: note.id,
        body: note.body,
        occurredAt: note.occurredAt,
        createdAt: note.createdAt,
        authorName: note.authorName,
        edited: note.lastEditedAt !== null,
        voided: note.status === PropertyNoteStatus.VOIDED,
        voidReason: note.voidReason,
        voidedByName: note.voidedByName,
        voidedAt: note.voidedAt,
        canManage: canManage && note.status === PropertyNoteStatus.ACTIVE,
      }));
    },
  );
}
