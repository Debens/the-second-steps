import "server-only";

import { randomUUID } from "node:crypto";
import type { SandboxPersona } from "@/core/auth/config";
import { getSandboxPersona } from "@/core/auth/config";
import { db } from "@/core/db/client";
import { AuthenticationProvider } from "@/core/db/generated/enums";
import {
  setSandboxProvisioningContext,
  setWorkspaceDatabaseContext,
} from "./database-context";

const SANDBOX_WORKSPACE = {
  slug: "oakfield-lettings-demo",
  displayName: "Oakfield Lettings (Demo)",
} as const;

function needsWorkspace(persona: SandboxPersona) {
  return persona === "account_owner" || persona === "dual_owner";
}

function needsPlatformRole(persona: SandboxPersona) {
  return persona === "platform_owner" || persona === "dual_owner";
}

export async function provisionSandboxAccess(input: {
  authSubject: string;
  email: string;
}) {
  if (process.env.NODE_ENV === "production") return;

  const persona = getSandboxPersona(input.email);
  if (!persona) return;

  await db.$transaction(async (transaction) => {
    const candidateUserIdentityId = randomUUID();
    await setSandboxProvisioningContext(transaction, {
      authSubject: input.authSubject,
      userIdentityId: candidateUserIdentityId,
      platformOwner: true,
    });

    const existingLink =
      await transaction.authenticationProviderLink.findUnique({
        where: {
          provider_providerSubject: {
            provider: AuthenticationProvider.SUPABASE,
            providerSubject: input.authSubject,
          },
        },
      });
    const userIdentityId =
      existingLink?.userIdentityId ?? candidateUserIdentityId;

    await setSandboxProvisioningContext(transaction, {
      authSubject: input.authSubject,
      userIdentityId,
      platformOwner: true,
    });

    if (!existingLink) {
      await transaction.userIdentity.create({
        data: { id: userIdentityId },
      });
      await transaction.authenticationProviderLink.create({
        data: {
          userIdentityId,
          provider: AuthenticationProvider.SUPABASE,
          providerSubject: input.authSubject,
        },
      });
    }

    if (needsPlatformRole(persona)) {
      await transaction.platformRoleAssignment.upsert({
        where: {
          userIdentityId_roleCode: {
            userIdentityId,
            roleCode: "PLATFORM_OWNER",
          },
        },
        create: {
          userIdentityId,
          roleCode: "PLATFORM_OWNER",
          status: "ACTIVE",
          assignedByUserIdentityId: userIdentityId,
        },
        update: { status: "ACTIVE", endedAt: null },
      });
    }

    if (needsWorkspace(persona)) {
      const workspace = await transaction.workspace.upsert({
        where: { slug: SANDBOX_WORKSPACE.slug },
        create: {
          ...SANDBOX_WORKSPACE,
          type: "AGENCY",
          status: "ACTIVE",
        },
        update: {
          displayName: SANDBOX_WORKSPACE.displayName,
          status: "ACTIVE",
        },
      });

      await setWorkspaceDatabaseContext(transaction, workspace.id);

      await transaction.branch.upsert({
        where: {
          workspaceId_name: {
            workspaceId: workspace.id,
            name: "Main Branch",
          },
        },
        create: {
          workspaceId: workspace.id,
          name: "Main Branch",
          status: "ACTIVE",
        },
        update: { status: "ACTIVE" },
      });

      const membership = await transaction.membership.upsert({
        where: {
          workspaceId_userIdentityId: {
            workspaceId: workspace.id,
            userIdentityId,
          },
        },
        create: {
          workspaceId: workspace.id,
          userIdentityId,
          status: "ACTIVE",
          scopeMode: "WORKSPACE",
        },
        update: {
          status: "ACTIVE",
          scopeMode: "WORKSPACE",
          endedAt: null,
        },
      });

      await transaction.membershipRole.upsert({
        where: {
          membershipId_roleCode: {
            membershipId: membership.id,
            roleCode: "WORKSPACE_OWNER",
          },
        },
        create: {
          workspaceId: workspace.id,
          membershipId: membership.id,
          roleCode: "WORKSPACE_OWNER",
          assignedByUserIdentityId: userIdentityId,
        },
        update: {},
      });
    }

    await transaction.auditEvent.create({
      data: {
        workspaceId: null,
        actorUserIdentityId: userIdentityId,
        action: "sandbox.access.provisioned",
        outcome: "SUCCEEDED",
        targetType: "sandbox_persona",
        targetId: persona,
        requestId: randomUUID(),
        metadata: { source: "local_magic_link" },
      },
    });
  });
}
