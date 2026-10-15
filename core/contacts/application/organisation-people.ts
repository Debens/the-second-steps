import "server-only";

import { withVerifiedIdentity } from "@/core/access/data/database-context";
import { hasBranchAccess } from "@/core/access/domain/scope";
import { hasPermission } from "@/core/access/domain/role";
import { ContactKind, ContactStatus } from "@/core/db/generated/enums";
import {
  validateRelationshipLabel,
  type ContactPointInput,
  type PersonDetailsInput,
} from "@/core/contacts/domain/contact";
import {
  audit,
  createContactInTransaction,
  deny,
  type ContactWriteResult,
} from "./contacts";
import { resolveContactActor, type ContactActor } from "./contact-actor";

type Transaction = Parameters<typeof resolveContactActor>[0];

type ActorInput = { authSubject: string; workspaceSlug: string };

/**
 * Organisation-person links are sensitive relationship changes: they require
 * `contact.sensitive.manage`, access to both contacts, and they share the
 * person with the organisation's branches that the actor can manage.
 */
async function withLinkManager(
  input: ActorInput,
  action: string,
  targetId: string,
  operation: (
    transaction: Transaction,
    actor: ContactActor,
  ) => Promise<ContactWriteResult>,
): Promise<ContactWriteResult> {
  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<ContactWriteResult> => {
      const actor = await resolveContactActor(transaction, {
        userIdentityId: identity.userIdentityId,
        workspaceSlug: input.workspaceSlug,
      });
      if (!actor) return { ok: false, error: "access_denied" };
      if (!hasPermission(actor.roles, "contact.sensitive.manage")) {
        return deny(transaction, actor, action, "access_denied", targetId);
      }
      return operation(transaction, actor);
    },
  );
  return result ?? { ok: false, error: "access_denied" };
}

async function clearPrimary(
  transaction: Transaction,
  actor: ContactActor,
  organisationContactId: string,
) {
  await transaction.organisationPersonLink.updateMany({
    where: {
      workspaceId: actor.workspaceId,
      organisationContactId,
      endedAt: null,
      isPrimary: true,
    },
    data: { isPrimary: false },
  });
}

async function sharePersonWithOrganisationBranches(
  transaction: Transaction,
  actor: ContactActor,
  organisationContactId: string,
  personContactId: string,
) {
  const organisationBranches = await transaction.contactBranchLink.findMany({
    where: {
      workspaceId: actor.workspaceId,
      contactId: organisationContactId,
      endedAt: null,
    },
    select: { branchId: true },
  });
  const personBranches = await transaction.contactBranchLink.findMany({
    where: {
      workspaceId: actor.workspaceId,
      contactId: personContactId,
      endedAt: null,
    },
    select: { branchId: true },
  });
  const existing = new Set(personBranches.map(({ branchId }) => branchId));
  const added = organisationBranches
    .map(({ branchId }) => branchId)
    .filter(
      (branchId) =>
        !existing.has(branchId) && hasBranchAccess(actor.scope, branchId),
    );
  if (added.length) {
    await transaction.contactBranchLink.createMany({
      data: added.map((branchId) => ({
        workspaceId: actor.workspaceId,
        contactId: personContactId,
        branchId,
        isPrimary: false,
        createdByMembershipId: actor.membershipId,
      })),
    });
  }
  return added;
}

async function linkInTransaction(
  transaction: Transaction,
  actor: ContactActor,
  input: {
    organisationContactId: string;
    personContactId: string;
    relationshipLabel: string | null;
    isPrimary: boolean;
  },
): Promise<ContactWriteResult> {
  const action = "contact.organisation_person.link";
  const organisation = await transaction.contact.findFirst({
    where: {
      id: input.organisationContactId,
      workspaceId: actor.workspaceId,
      kind: ContactKind.ORGANISATION,
      status: ContactStatus.ACTIVE,
    },
    select: { id: true },
  });
  const person = await transaction.contact.findFirst({
    where: {
      id: input.personContactId,
      workspaceId: actor.workspaceId,
      kind: ContactKind.PERSON,
      status: ContactStatus.ACTIVE,
    },
    select: { id: true },
  });
  if (!organisation || !person) {
    return deny(
      transaction,
      actor,
      action,
      "contact_not_found",
      input.organisationContactId,
    );
  }
  const existing = await transaction.organisationPersonLink.findFirst({
    where: {
      workspaceId: actor.workspaceId,
      organisationContactId: organisation.id,
      personContactId: person.id,
      endedAt: null,
    },
    select: { id: true },
  });
  if (existing) {
    return deny(transaction, actor, action, "invalid_state", organisation.id);
  }

  if (input.isPrimary) {
    await clearPrimary(transaction, actor, organisation.id);
  }
  const link = await transaction.organisationPersonLink.create({
    data: {
      workspaceId: actor.workspaceId,
      organisationContactId: organisation.id,
      personContactId: person.id,
      relationshipLabel: input.relationshipLabel,
      isPrimary: input.isPrimary,
    },
    select: { id: true },
  });
  const addedBranchIds = await sharePersonWithOrganisationBranches(
    transaction,
    actor,
    organisation.id,
    person.id,
  );
  await audit(transaction, actor, {
    action,
    outcome: "SUCCEEDED",
    targetId: organisation.id,
    metadata: {
      linkId: link.id,
      personContactId: person.id,
      isPrimary: String(input.isPrimary),
      addedBranchIds,
    },
  });
  return { ok: true, contactId: organisation.id };
}

export async function linkOrganisationPerson(
  input: ActorInput & {
    organisationContactId: string;
    personContactId: string;
    relationshipLabel: string;
    isPrimary: boolean;
  },
): Promise<ContactWriteResult> {
  const action = "contact.organisation_person.link";
  const label = validateRelationshipLabel(input.relationshipLabel);
  return withLinkManager(
    input,
    action,
    input.organisationContactId,
    async (transaction, actor) => {
      if (!label.ok) {
        return deny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.organisationContactId,
        );
      }
      return linkInTransaction(transaction, actor, {
        ...input,
        relationshipLabel: label.label,
      });
    },
  );
}

/**
 * Creates a person in one of the organisation's branches that the actor can
 * manage and links them, all in one transaction.
 */
export async function createAndLinkOrganisationPerson(
  input: ActorInput & {
    organisationContactId: string;
    details: PersonDetailsInput;
    contactPoints: readonly ContactPointInput[];
    relationshipLabel: string;
    isPrimary: boolean;
  },
): Promise<ContactWriteResult> {
  const action = "contact.organisation_person.link";
  const label = validateRelationshipLabel(input.relationshipLabel);
  return withLinkManager(
    input,
    action,
    input.organisationContactId,
    async (transaction, actor) => {
      if (!label.ok || input.contactPoints.length === 0) {
        return deny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.organisationContactId,
        );
      }
      const branchLinks = await transaction.contactBranchLink.findMany({
        where: {
          workspaceId: actor.workspaceId,
          contactId: input.organisationContactId,
          endedAt: null,
          contact: {
            kind: ContactKind.ORGANISATION,
            status: ContactStatus.ACTIVE,
          },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { branchId: true },
      });
      const branch = branchLinks.find(({ branchId }) =>
        hasBranchAccess(actor.scope, branchId),
      );
      if (!branch) {
        return deny(
          transaction,
          actor,
          action,
          "contact_not_found",
          input.organisationContactId,
        );
      }
      const person = await createContactInTransaction(transaction, actor, {
        kind: "person",
        details: input.details,
        branchId: branch.branchId,
        communication: NO_PREFERENCES,
        contactPoints: input.contactPoints,
        addresses: [],
      });
      if (!person.ok) return person;
      const linked = await linkInTransaction(transaction, actor, {
        organisationContactId: input.organisationContactId,
        personContactId: person.contactId,
        relationshipLabel: label.label,
        isPrimary: input.isPrimary,
      });
      // A brand-new person cannot already be linked; roll back if it fails.
      if (!linked.ok)
        throw new Error(`Linking new person failed: ${linked.error}`);
      return linked;
    },
  );
}

const NO_PREFERENCES = {
  preferred: null,
  doNotEmail: false,
  doNotTelephone: false,
  doNotSms: false,
  doNotWhatsApp: false,
  doNotPost: false,
};

async function findActiveLink(
  transaction: Transaction,
  actor: ContactActor,
  organisationContactId: string,
  linkId: string,
) {
  return transaction.organisationPersonLink.findFirst({
    where: {
      id: linkId,
      workspaceId: actor.workspaceId,
      organisationContactId,
      endedAt: null,
      organisationContact: { status: ContactStatus.ACTIVE },
    },
    select: { id: true, personContactId: true },
  });
}

export async function updateOrganisationPersonLink(
  input: ActorInput & {
    organisationContactId: string;
    linkId: string;
    relationshipLabel: string;
    isPrimary: boolean;
  },
): Promise<ContactWriteResult> {
  const action = "contact.organisation_person.update";
  const label = validateRelationshipLabel(input.relationshipLabel);
  return withLinkManager(
    input,
    action,
    input.organisationContactId,
    async (transaction, actor) => {
      if (!label.ok) {
        return deny(
          transaction,
          actor,
          action,
          "invalid_input",
          input.organisationContactId,
        );
      }
      const link = await findActiveLink(
        transaction,
        actor,
        input.organisationContactId,
        input.linkId,
      );
      if (!link) {
        return deny(
          transaction,
          actor,
          action,
          "contact_not_found",
          input.organisationContactId,
        );
      }
      if (input.isPrimary) {
        await clearPrimary(transaction, actor, input.organisationContactId);
      }
      await transaction.organisationPersonLink.update({
        where: { id: link.id },
        data: { relationshipLabel: label.label, isPrimary: input.isPrimary },
      });
      await audit(transaction, actor, {
        action,
        outcome: "SUCCEEDED",
        targetId: input.organisationContactId,
        metadata: {
          linkId: link.id,
          personContactId: link.personContactId,
          isPrimary: String(input.isPrimary),
        },
      });
      return { ok: true, contactId: input.organisationContactId };
    },
  );
}

export async function endOrganisationPersonLink(
  input: ActorInput & { organisationContactId: string; linkId: string },
): Promise<ContactWriteResult> {
  const action = "contact.organisation_person.end";
  return withLinkManager(
    input,
    action,
    input.organisationContactId,
    async (transaction, actor) => {
      const link = await findActiveLink(
        transaction,
        actor,
        input.organisationContactId,
        input.linkId,
      );
      if (!link) {
        return deny(
          transaction,
          actor,
          action,
          "contact_not_found",
          input.organisationContactId,
        );
      }
      // Ending preserves the row as history; branch visibility granted when
      // the link was made is left in place.
      await transaction.organisationPersonLink.update({
        where: { id: link.id },
        data: { endedAt: new Date(), isPrimary: false },
      });
      await audit(transaction, actor, {
        action,
        outcome: "SUCCEEDED",
        targetId: input.organisationContactId,
        metadata: { linkId: link.id, personContactId: link.personContactId },
      });
      return { ok: true, contactId: input.organisationContactId };
    },
  );
}
