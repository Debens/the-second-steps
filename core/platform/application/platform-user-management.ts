import "server-only";

import { randomUUID } from "node:crypto";
import { withVerifiedIdentity } from "@/core/access/data/database-context";
import { validatePersonName } from "@/core/platform/domain/user-profile";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type UpdatePlatformUserNameResult =
  | { ok: true }
  | {
      ok: false;
      error: "access_denied" | "invalid_input" | "user_not_found";
    };

export async function updatePlatformUserName(input: {
  authSubject: string;
  targetUserIdentityId: string;
  firstName: string;
  lastName: string;
}): Promise<UpdatePlatformUserNameResult> {
  const targetIdIsValid = UUID_PATTERN.test(input.targetUserIdentityId);
  const name = validatePersonName(input);

  const result = await withVerifiedIdentity(
    input.authSubject,
    async (transaction, identity): Promise<UpdatePlatformUserNameResult> => {
      const auditTargetId = targetIdIsValid ? input.targetUserIdentityId : null;

      if (!identity.isPlatformOwner) {
        return { ok: false, error: "access_denied" };
      }

      if (!targetIdIsValid || !name.ok) {
        await transaction.auditEvent.create({
          data: {
            actorUserIdentityId: identity.userIdentityId,
            action: "user_identity.name.update",
            outcome: "DENIED",
            targetType: "user_identity",
            targetId: auditTargetId,
            requestId: randomUUID(),
            metadata: { reason: "invalid_input" },
          },
        });
        return { ok: false, error: "invalid_input" };
      }

      const target = await transaction.userIdentity.findUnique({
        where: { id: input.targetUserIdentityId },
        select: { id: true, firstName: true, lastName: true },
      });

      if (!target) {
        await transaction.auditEvent.create({
          data: {
            actorUserIdentityId: identity.userIdentityId,
            action: "user_identity.name.update",
            outcome: "DENIED",
            targetType: "user_identity",
            targetId: input.targetUserIdentityId,
            requestId: randomUUID(),
            metadata: { reason: "user_not_found" },
          },
        });
        return { ok: false, error: "user_not_found" };
      }

      if (
        target.firstName === name.firstName &&
        target.lastName === name.lastName
      ) {
        return { ok: true };
      }

      await transaction.userIdentity.update({
        where: { id: target.id },
        data: { firstName: name.firstName, lastName: name.lastName },
      });
      await transaction.auditEvent.create({
        data: {
          actorUserIdentityId: identity.userIdentityId,
          action: "user_identity.name.update",
          outcome: "SUCCEEDED",
          targetType: "user_identity",
          targetId: target.id,
          requestId: randomUUID(),
          metadata: {
            previous: {
              firstName: target.firstName,
              lastName: target.lastName,
            },
            next: { firstName: name.firstName, lastName: name.lastName },
          },
        },
      });

      return { ok: true };
    },
  );

  return result ?? { ok: false, error: "access_denied" };
}
