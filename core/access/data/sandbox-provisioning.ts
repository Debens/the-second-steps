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
  displayName: "Oakfield Lettings",
  legalName: "Oakfield Lettings Limited (Demo)",
  companyNumber: "00000000",
  primaryEmail: "hello@oakfield.test",
  telephone: "020 7946 0998",
  website: "https://oakfield.example",
  registeredAddress1: "1 Example Square",
  registeredTownCity: "Demo Town",
  registeredCounty: "London",
  registeredPostcode: "ZZ1 1ZZ",
} as const;

const SANDBOX_PERSONA_NAMES: Readonly<Record<SandboxPersona, string>> = {
  account_owner: "Olivia Hart",
  platform_owner: "Theo Grant",
  dual_owner: "Maya Ellis",
  no_access: "Noah Reed",
};

const SANDBOX_BRANCH = {
  name: "Main Branch",
  email: "main@oakfield.test",
  telephone: "020 7946 0998",
  address1: "1 Example Square",
  townCity: "Demo Town",
  county: "London",
  postcode: "ZZ1 1ZZ",
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
        data: {
          id: userIdentityId,
          displayName: SANDBOX_PERSONA_NAMES[persona],
          primaryEmail: input.email.trim().toLowerCase(),
        },
      });
      await transaction.authenticationProviderLink.create({
        data: {
          userIdentityId,
          provider: AuthenticationProvider.SUPABASE,
          providerSubject: input.authSubject,
        },
      });
    } else {
      await transaction.userIdentity.update({
        where: { id: userIdentityId },
        data: {
          displayName: SANDBOX_PERSONA_NAMES[persona],
          primaryEmail: input.email.trim().toLowerCase(),
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
          ...SANDBOX_WORKSPACE,
          status: "ACTIVE",
        },
      });

      await setWorkspaceDatabaseContext(transaction, workspace.id);

      await transaction.branch.upsert({
        where: {
          workspaceId_name: {
            workspaceId: workspace.id,
            name: SANDBOX_BRANCH.name,
          },
        },
        create: {
          workspaceId: workspace.id,
          ...SANDBOX_BRANCH,
          status: "ACTIVE",
        },
        update: { ...SANDBOX_BRANCH, status: "ACTIVE" },
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
