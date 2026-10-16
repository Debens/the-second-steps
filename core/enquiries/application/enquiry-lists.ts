import "server-only";

import { hasPermission } from "@/core/access/domain/role";
import {
  EnquiryListItemStatus,
  EnquiryOutcomeKind,
} from "@/core/db/generated/enums";
import { isUuid } from "@/core/properties/domain/ids";
import {
  STARTER_LEAD_SOURCES,
  STARTER_LOST_REASONS,
  STARTER_POSTPONED_REASONS,
  validateListName,
} from "../domain/enquiry";
import {
  enquiryAudit,
  enquiryDeny,
  withEnquiryActor,
  type EnquiryActor,
  type EnquiryActorInput,
  type EnquiryTransaction,
} from "./enquiry-shared";

type OutcomeKindCode = "lost" | "postponed" | "both";
type ListKind = "lead_source" | "outcome_reason";

const OUTCOME_KIND = {
  lost: EnquiryOutcomeKind.LOST,
  postponed: EnquiryOutcomeKind.POSTPONED,
  both: EnquiryOutcomeKind.BOTH,
} as const;

async function ensureStarterLists(
  transaction: EnquiryTransaction,
  actor: EnquiryActor,
) {
  const [leadCount, lostCount, postponedCount] = await Promise.all([
    transaction.leadSource.count({ where: { workspaceId: actor.workspaceId } }),
    transaction.enquiryOutcomeReason.count({
      where: {
        workspaceId: actor.workspaceId,
        appliesTo: { in: [EnquiryOutcomeKind.LOST, EnquiryOutcomeKind.BOTH] },
      },
    }),
    transaction.enquiryOutcomeReason.count({
      where: {
        workspaceId: actor.workspaceId,
        appliesTo: {
          in: [EnquiryOutcomeKind.POSTPONED, EnquiryOutcomeKind.BOTH],
        },
      },
    }),
  ]);
  let inserted = false;
  // Concurrent first uses both try; only the one that adds rows audits it.
  if (leadCount === 0) {
    const added = await transaction.leadSource.createMany({
      data: STARTER_LEAD_SOURCES.map((name, sortOrder) => ({
        workspaceId: actor.workspaceId,
        name,
        sortOrder,
      })),
      skipDuplicates: true,
    });
    inserted ||= added.count > 0;
  }
  if (lostCount === 0) {
    const added = await transaction.enquiryOutcomeReason.createMany({
      data: STARTER_LOST_REASONS.map((name, sortOrder) => ({
        workspaceId: actor.workspaceId,
        name,
        appliesTo: EnquiryOutcomeKind.LOST,
        sortOrder,
      })),
      skipDuplicates: true,
    });
    inserted ||= added.count > 0;
  }
  if (postponedCount === 0) {
    const added = await transaction.enquiryOutcomeReason.createMany({
      data: STARTER_POSTPONED_REASONS.map((name, sortOrder) => ({
        workspaceId: actor.workspaceId,
        name,
        appliesTo: EnquiryOutcomeKind.POSTPONED,
        sortOrder,
      })),
      skipDuplicates: true,
    });
    inserted ||= added.count > 0;
  }
  if (inserted) {
    await enquiryAudit(transaction, actor, {
      action: "enquiry.settings.initialise",
      outcome: "SUCCEEDED",
    });
  }
}

export async function listEnquirySettings(input: EnquiryActorInput) {
  const result = await withEnquiryActor(input, async (transaction, actor) => {
    if (!hasPermission(actor.roles, "enquiry.read")) {
      return enquiryDeny(
        transaction,
        actor,
        "enquiry.settings.read",
        "access_denied",
      );
    }
    // Only staff who use the lists add the starter entries, so read-only
    // roles never write.
    if (
      hasPermission(actor.roles, "enquiry.create") ||
      hasPermission(actor.roles, "enquiry.settings.manage")
    ) {
      await ensureStarterLists(transaction, actor);
    }
    const [leadSources, outcomeReasons] = await Promise.all([
      transaction.leadSource.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      }),
      transaction.enquiryOutcomeReason.findMany({
        where: { workspaceId: actor.workspaceId },
        orderBy: [{ appliesTo: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
      }),
    ]);
    return {
      ok: true as const,
      leadSources: leadSources.map((item) => ({
        id: item.id,
        name: item.name,
        status: item.status.toLowerCase() as "active" | "hidden",
        sortOrder: item.sortOrder,
      })),
      outcomeReasons: outcomeReasons.map((item) => ({
        id: item.id,
        name: item.name,
        appliesTo: item.appliesTo.toLowerCase() as OutcomeKindCode,
        status: item.status.toLowerCase() as "active" | "hidden",
        sortOrder: item.sortOrder,
      })),
    };
  });
  return result.ok ? result : null;
}

export function addEnquiryListItem(
  input: EnquiryActorInput & {
    kind: ListKind;
    name: string;
    appliesTo?: OutcomeKindCode;
  },
) {
  const action = "enquiry.settings.add";
  return withEnquiryActor(input, async (transaction, actor) => {
    if (!hasPermission(actor.roles, "enquiry.settings.manage")) {
      return enquiryDeny(transaction, actor, action, "access_denied");
    }
    const name = validateListName(input.name);
    if (
      !["lead_source", "outcome_reason"].includes(input.kind) ||
      !name.ok ||
      (input.kind === "outcome_reason" &&
        (!input.appliesTo || !(input.appliesTo in OUTCOME_KIND))) ||
      (input.kind === "lead_source" && input.appliesTo !== undefined)
    ) {
      return enquiryDeny(transaction, actor, action, "invalid_input");
    }
    const last =
      input.kind === "lead_source"
        ? await transaction.leadSource.aggregate({
            where: { workspaceId: actor.workspaceId },
            _max: { sortOrder: true },
          })
        : await transaction.enquiryOutcomeReason.aggregate({
            where: {
              workspaceId: actor.workspaceId,
              appliesTo: OUTCOME_KIND[input.appliesTo!],
            },
            _max: { sortOrder: true },
          });
    const sortOrder = (last._max.sortOrder ?? -1) + 1;
    const item =
      input.kind === "lead_source"
        ? await transaction.leadSource.create({
            data: {
              workspaceId: actor.workspaceId,
              name: name.name,
              sortOrder,
            },
          })
        : await transaction.enquiryOutcomeReason.create({
            data: {
              workspaceId: actor.workspaceId,
              name: name.name,
              appliesTo: OUTCOME_KIND[input.appliesTo!],
              sortOrder,
            },
          });
    await enquiryAudit(transaction, actor, {
      action,
      outcome: "SUCCEEDED",
      metadata: { kind: input.kind, itemId: item.id },
    });
    return { ok: true as const, itemId: item.id };
  });
}

export function updateEnquiryListItem(
  input: EnquiryActorInput & {
    kind: ListKind;
    itemId: string;
    name: string;
    hidden: boolean;
    sortOrder: number;
  },
) {
  const action = "enquiry.settings.update";
  return withEnquiryActor(input, async (transaction, actor) => {
    if (!hasPermission(actor.roles, "enquiry.settings.manage")) {
      return enquiryDeny(
        transaction,
        actor,
        action,
        "access_denied",
        input.itemId,
      );
    }
    const name = validateListName(input.name);
    if (
      !["lead_source", "outcome_reason"].includes(input.kind) ||
      !isUuid(input.itemId) ||
      !name.ok ||
      !Number.isInteger(input.sortOrder) ||
      input.sortOrder < 0 ||
      input.sortOrder > 10_000
    ) {
      return enquiryDeny(
        transaction,
        actor,
        action,
        "invalid_input",
        input.itemId,
      );
    }
    const data = {
      name: name.name,
      status: input.hidden
        ? EnquiryListItemStatus.HIDDEN
        : EnquiryListItemStatus.ACTIVE,
      sortOrder: input.sortOrder,
    };
    const updated =
      input.kind === "lead_source"
        ? await transaction.leadSource.updateMany({
            where: { id: input.itemId, workspaceId: actor.workspaceId },
            data,
          })
        : await transaction.enquiryOutcomeReason.updateMany({
            where: { id: input.itemId, workspaceId: actor.workspaceId },
            data,
          });
    if (updated.count === 0)
      return { ok: false as const, error: "list_item_not_found" as const };
    await enquiryAudit(transaction, actor, {
      action,
      outcome: "SUCCEEDED",
      metadata: { kind: input.kind, itemId: input.itemId },
    });
    return { ok: true as const, itemId: input.itemId };
  });
}
