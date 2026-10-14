import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  getWorkspaceMembers,
  updateWorkspaceMemberRoles,
} from "@/core/access/application/workspace-members";
import { db } from "@/core/db/client";
import {
  listCustomerFeatureFlags,
  updateCustomerFeatureFlagOverride,
} from "@/core/platform/application/customer-feature-flags";
import {
  getCustomerProfile,
  listCustomerBranches,
  listCustomers,
  listPlatformUsers,
} from "@/core/platform/application/platform-directory";
import { updatePlatformUserName } from "@/core/platform/application/platform-user-management";
import {
  getWorkspaceCustomerDetails,
  updatePlatformCustomerDetails,
  updateWorkspaceCustomerDetails,
} from "@/core/workspace/application/workspace-details";

const UPDATED_CUSTOMER_DETAILS = {
  displayName: "Workspace A Updated",
  legalName: "Workspace A Limited",
  companyNumber: "AB123456",
  primaryEmail: "hello@workspace-a.test",
  telephone: "020 7946 0998",
  website: "https://workspace-a.example",
  registeredAddress1: "1 Example Square",
  registeredAddress2: "",
  registeredTownCity: "Demo Town",
  registeredCounty: "London",
  registeredPostcode: "ZZ1 1ZZ",
};

const runtimeUrl = process.env.DATABASE_URL;
const adminUrl = process.env.TEST_ADMIN_DATABASE_URL;

if (!runtimeUrl || !adminUrl) {
  throw new Error("Integration tests require isolated database URLs.");
}

for (const value of [runtimeUrl, adminUrl]) {
  const url = new URL(value);
  if (url.hostname !== "127.0.0.1" || url.pathname !== "/zayto_test") {
    throw new Error("Refusing to run integration tests outside zayto_test.");
  }
}

const runtimePool = new Pool({ connectionString: runtimeUrl, ssl: false });
const adminPool = new Pool({ connectionString: adminUrl, ssl: false });

const ids = {
  workspaceA: randomUUID(),
  workspaceB: randomUUID(),
  branchA: randomUUID(),
  branchB: randomUUID(),
  managerIdentity: randomUUID(),
  managerAuth: randomUUID(),
  managerMembership: randomUUID(),
  ownerOneIdentity: randomUUID(),
  ownerOneAuth: randomUUID(),
  ownerOneMembership: randomUUID(),
  ownerTwoIdentity: randomUUID(),
  ownerTwoAuth: randomUUID(),
  ownerTwoMembership: randomUUID(),
  platformIdentity: randomUUID(),
  platformAuth: randomUUID(),
  sameBranchIdentity: randomUUID(),
  otherBranchIdentity: randomUUID(),
  overlappingIdentity: randomUUID(),
  workspaceWideIdentity: randomUUID(),
  workspaceBOwnerIdentity: randomUUID(),
  sameBranchMembership: randomUUID(),
  otherBranchMembership: randomUUID(),
  overlappingMembership: randomUUID(),
  workspaceWideMembership: randomUUID(),
  workspaceBOwnerMembership: randomUUID(),
};

async function addIdentity(
  client: PoolClient,
  identityId: string,
  authSubject = randomUUID(),
  profile?: { firstName: string; lastName: string; primaryEmail: string },
) {
  await client.query(
    `INSERT INTO "user_identities"
      ("id", "first_name", "last_name", "primary_email", "updated_at")
     VALUES ($1::uuid, $2, $3, $4, CURRENT_TIMESTAMP)`,
    [
      identityId,
      profile?.firstName ?? null,
      profile?.lastName ?? null,
      profile?.primaryEmail ?? null,
    ],
  );
  await client.query(
    `INSERT INTO "authentication_provider_links"
      ("user_identity_id", "provider", "provider_subject")
     VALUES ($1::uuid, 'supabase', $2::uuid)`,
    [identityId, authSubject],
  );
}

async function addMembership(
  client: PoolClient,
  input: {
    id: string;
    identityId: string;
    workspaceId: string;
    role: string;
    branchIds?: string[];
  },
) {
  const scopeMode = input.branchIds ? "named_branches" : "workspace";
  await client.query(
    `INSERT INTO "memberships"
      ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::membership_scope_mode,
       CURRENT_TIMESTAMP)`,
    [input.id, input.workspaceId, input.identityId, scopeMode],
  );
  await client.query(
    `INSERT INTO "membership_roles"
      ("workspace_id", "membership_id", "role_code")
     VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
    [input.workspaceId, input.id, input.role],
  );

  for (const branchId of input.branchIds ?? []) {
    await client.query(
      `INSERT INTO "membership_branch_access"
        ("workspace_id", "membership_id", "branch_id")
       VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      [input.workspaceId, input.id, branchId],
    );
  }
}

async function seedAccessFoundation() {
  const client = await adminPool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `TRUNCATE TABLE "audit_events", "workspace_feature_flag_overrides",
        "membership_branch_access", "membership_roles", "memberships",
        "branches", "platform_role_assignments",
        "authentication_provider_links", "workspaces", "user_identities"
       CASCADE`,
    );
    await client.query(
      `INSERT INTO "workspaces"
        ("id", "slug", "display_name", "type", "updated_at")
       VALUES
        ($1::uuid, 'workspace-a', 'Workspace A', 'agency', CURRENT_TIMESTAMP),
        ($2::uuid, 'workspace-b', 'Workspace B', 'agency', CURRENT_TIMESTAMP)`,
      [ids.workspaceA, ids.workspaceB],
    );
    await client.query(
      `INSERT INTO "branches" ("id", "workspace_id", "name", "updated_at")
       VALUES
        ($1::uuid, $3::uuid, 'Branch A', CURRENT_TIMESTAMP),
        ($2::uuid, $3::uuid, 'Branch B', CURRENT_TIMESTAMP)`,
      [ids.branchA, ids.branchB, ids.workspaceA],
    );

    await addIdentity(client, ids.managerIdentity, ids.managerAuth, {
      firstName: "Morgan",
      lastName: "Manager",
      primaryEmail: "manager@workspace-a.test",
    });
    await addIdentity(client, ids.ownerOneIdentity, ids.ownerOneAuth, {
      firstName: "Olivia",
      lastName: "Owner",
      primaryEmail: "owner.one@workspace-a.test",
    });
    await addIdentity(client, ids.ownerTwoIdentity, ids.ownerTwoAuth, {
      firstName: "Owen",
      lastName: "Owner",
      primaryEmail: "owner.two@workspace-a.test",
    });
    await addIdentity(client, ids.platformIdentity, ids.platformAuth, {
      firstName: "Theo",
      lastName: "Grant",
      primaryEmail: "platform.owner@zayto.local",
    });
    await client.query(
      `INSERT INTO "platform_role_assignments"
        ("user_identity_id", "role_code")
       VALUES ($1::uuid, 'platform_owner')`,
      [ids.platformIdentity],
    );
    await addIdentity(client, ids.sameBranchIdentity, randomUUID(), {
      firstName: "Sam",
      lastName: "Samebranch",
      primaryEmail: "same@workspace-a.test",
    });
    await addIdentity(client, ids.otherBranchIdentity, randomUUID(), {
      firstName: "Orla",
      lastName: "Otherbranch",
      primaryEmail: "other@workspace-a.test",
    });
    await addIdentity(client, ids.overlappingIdentity, randomUUID(), {
      firstName: "Alex",
      lastName: "Overlap",
      primaryEmail: "overlap@workspace-a.test",
    });
    await addIdentity(client, ids.workspaceWideIdentity, randomUUID(), {
      firstName: "Will",
      lastName: "Workspace",
      primaryEmail: "workspace.wide@workspace-a.test",
    });
    await addIdentity(client, ids.workspaceBOwnerIdentity, randomUUID(), {
      firstName: "Bea",
      lastName: "WorkspaceB",
      primaryEmail: "owner@workspace-b.test",
    });

    await addMembership(client, {
      id: ids.managerMembership,
      identityId: ids.managerIdentity,
      workspaceId: ids.workspaceA,
      role: "branch_manager",
      branchIds: [ids.branchA],
    });
    await addMembership(client, {
      id: ids.ownerOneMembership,
      identityId: ids.ownerOneIdentity,
      workspaceId: ids.workspaceA,
      role: "workspace_owner",
    });
    await addMembership(client, {
      id: ids.ownerTwoMembership,
      identityId: ids.ownerTwoIdentity,
      workspaceId: ids.workspaceA,
      role: "workspace_owner",
    });
    await addMembership(client, {
      id: ids.sameBranchMembership,
      identityId: ids.sameBranchIdentity,
      workspaceId: ids.workspaceA,
      role: "negotiator",
      branchIds: [ids.branchA],
    });
    await addMembership(client, {
      id: ids.otherBranchMembership,
      identityId: ids.otherBranchIdentity,
      workspaceId: ids.workspaceA,
      role: "negotiator",
      branchIds: [ids.branchB],
    });
    await addMembership(client, {
      id: ids.overlappingMembership,
      identityId: ids.overlappingIdentity,
      workspaceId: ids.workspaceA,
      role: "property_manager",
      branchIds: [ids.branchA, ids.branchB],
    });
    await addMembership(client, {
      id: ids.workspaceWideMembership,
      identityId: ids.workspaceWideIdentity,
      workspaceId: ids.workspaceA,
      role: "read_only",
    });
    await addMembership(client, {
      id: ids.workspaceBOwnerMembership,
      identityId: ids.workspaceBOwnerIdentity,
      workspaceId: ids.workspaceB,
      role: "workspace_owner",
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

beforeEach(seedAccessFoundation);

afterAll(async () => {
  await db.$disconnect();
  await runtimePool.end();
  await adminPool.end();
});

describe("database and workspace access hardening", () => {
  it("hides every workspace until a verified context is present", async () => {
    const baseline = await runtimePool.query(`SELECT "id" FROM "workspaces"`);
    expect(baseline.rows).toHaveLength(0);

    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        ids.workspaceA,
      ]);
      const visible = await client.query<{ id: string }>(
        `SELECT "id" FROM "workspaces" ORDER BY "id"`,
      );
      expect(visible.rows.map(({ id }) => id)).toEqual([ids.workspaceA]);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("prevents the runtime login from changing database structure or assuming the migrator role", async () => {
    const role = await runtimePool.query<{
      rolcreatedb: boolean;
      rolcreaterole: boolean;
      rolbypassrls: boolean;
      rolsuper: boolean;
    }>(
      `SELECT "rolcreatedb", "rolcreaterole", "rolbypassrls", "rolsuper"
       FROM "pg_roles" WHERE "rolname" = current_user`,
    );
    expect(role.rows[0]).toEqual({
      rolcreatedb: false,
      rolcreaterole: false,
      rolbypassrls: false,
      rolsuper: false,
    });
    await expect(
      runtimePool.query(
        `CREATE TABLE "public"."runtime_escape" ("id" integer)`,
      ),
    ).rejects.toThrow();
    await expect(
      runtimePool.query(`SELECT 1 FROM "public"."_prisma_migrations"`),
    ).rejects.toThrow();
    await expect(
      runtimePool.query(`SET ROLE "zayto_migrator"`),
    ).rejects.toThrow();
  });

  it("shows a Branch Manager workspace-wide staff and overlapping branches only", async () => {
    const result = await getWorkspaceMembers(ids.managerAuth, "workspace-a");
    expect(result).not.toBeNull();
    const visibleIds = result?.members.map(({ id }) => id) ?? [];
    expect(visibleIds).toEqual(
      expect.arrayContaining([
        ids.managerMembership,
        ids.ownerOneMembership,
        ids.ownerTwoMembership,
        ids.sameBranchMembership,
        ids.overlappingMembership,
        ids.workspaceWideMembership,
      ]),
    );
    expect(visibleIds).not.toContain(ids.otherBranchMembership);
    expect(visibleIds).not.toContain(ids.workspaceBOwnerMembership);
    expect(result?.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: ids.sameBranchMembership,
          firstName: "Sam",
          lastName: "Samebranch",
          primaryEmail: "same@workspace-a.test",
        }),
      ]),
    );
  });

  it("limits workspace identity details to permitted roles and branch-visible members", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.user_identity_id', $1, true)",
        [ids.managerIdentity],
      );
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        ids.workspaceA,
      ]);
      const visible = await client.query<{ id: string }>(
        `SELECT "id" FROM "user_identities" ORDER BY "id"`,
      );
      const visibleIds = visible.rows.map(({ id }) => id);
      expect(visibleIds).toEqual(
        expect.arrayContaining([
          ids.managerIdentity,
          ids.ownerOneIdentity,
          ids.ownerTwoIdentity,
          ids.sameBranchIdentity,
          ids.overlappingIdentity,
          ids.workspaceWideIdentity,
        ]),
      );
      expect(visibleIds).not.toContain(ids.otherBranchIdentity);
      expect(visibleIds).not.toContain(ids.workspaceBOwnerIdentity);
      await client.query("ROLLBACK");

      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.user_identity_id', $1, true)",
        [ids.sameBranchIdentity],
      );
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        ids.workspaceA,
      ]);
      const noDirectoryPermission = await client.query<{ id: string }>(
        `SELECT "id" FROM "user_identities" ORDER BY "id"`,
      );
      expect(noDirectoryPermission.rows).toEqual([
        { id: ids.sameBranchIdentity },
      ]);
      await client.query("ROLLBACK");
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("rejects an audit actor membership from another workspace", async () => {
    await expect(
      adminPool.query(
        `INSERT INTO "audit_events"
          ("workspace_id", "actor_membership_id", "action", "outcome", "request_id")
         VALUES ($1::uuid, $2::uuid, 'security.test', 'denied', $3)`,
        [ids.workspaceA, ids.workspaceBOwnerMembership, randomUUID()],
      ),
    ).rejects.toThrow();
  });

  it("serialises competing owner demotions so one active owner remains", async () => {
    const [first, second] = await Promise.all([
      updateWorkspaceMemberRoles({
        authSubject: ids.ownerOneAuth,
        workspaceSlug: "workspace-a",
        targetMembershipId: ids.ownerTwoMembership,
        proposedRoleValues: ["agency_admin"],
      }),
      updateWorkspaceMemberRoles({
        authSubject: ids.ownerTwoAuth,
        workspaceSlug: "workspace-a",
        targetMembershipId: ids.ownerOneMembership,
        proposedRoleValues: ["agency_admin"],
      }),
    ]);
    expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);

    const ownerCount = await adminPool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS "count"
       FROM "membership_roles"
       INNER JOIN "memberships" ON "memberships"."id" = "membership_roles"."membership_id"
       WHERE "memberships"."workspace_id" = $1::uuid
         AND "memberships"."status" = 'active'
         AND "membership_roles"."role_code" = 'workspace_owner'`,
      [ids.workspaceA],
    );
    expect(ownerCount.rows[0]?.count).toBe("1");

    const deniedAudit = await adminPool.query(
      `SELECT 1 FROM "audit_events"
       WHERE "workspace_id" = $1::uuid
         AND "action" = 'membership.roles.update'
         AND "outcome" = 'denied'`,
      [ids.workspaceA],
    );
    expect(deniedAudit.rowCount).toBe(1);
  });

  it("rejects an empty named-branch membership at commit", async () => {
    const client = await adminPool.connect();
    try {
      await client.query("BEGIN");
      const identityId = randomUUID();
      await addIdentity(client, identityId);
      await addMembership(client, {
        id: randomUUID(),
        identityId,
        workspaceId: ids.workspaceA,
        role: "negotiator",
        branchIds: [],
      });
      await expect(client.query("COMMIT")).rejects.toThrow(
        /requires at least one branch/,
      );
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("allows a Platform Owner to search identity and customer metadata only", async () => {
    const users = await listPlatformUsers(ids.platformAuth, "Theo");
    expect(users).toHaveLength(1);
    expect(users?.[0]).toMatchObject({
      id: ids.platformIdentity,
      firstName: "Theo",
      lastName: "Grant",
      primaryEmail: "platform.owner@zayto.local",
      isPlatformOwner: true,
    });

    const customers = await listCustomers(ids.platformAuth, "Workspace A");
    expect(customers).toHaveLength(1);
    expect(customers?.[0]).toMatchObject({
      id: ids.workspaceA,
      activeBranchCount: 2,
      activeUserCount: 7,
    });

    const profile = await getCustomerProfile(ids.platformAuth, "workspace-a");
    expect(profile?.id).toBe(ids.workspaceA);
    const branches = await listCustomerBranches(
      ids.platformAuth,
      "workspace-a",
    );
    expect(branches?.map(({ id }) => id)).toEqual([ids.branchA, ids.branchB]);
  });

  it("denies the platform directory to an ordinary workspace member", async () => {
    await expect(listPlatformUsers(ids.ownerOneAuth)).resolves.toBeNull();
    await expect(listCustomers(ids.ownerOneAuth)).resolves.toBeNull();
    await expect(
      getCustomerProfile(ids.ownerOneAuth, "workspace-a"),
    ).resolves.toBeNull();
  });

  it("shows customer details with role-aware editing capability", async () => {
    const owner = await getWorkspaceCustomerDetails(
      ids.ownerOneAuth,
      "workspace-a",
    );
    expect(owner).toMatchObject({
      details: { id: ids.workspaceA, displayName: "Workspace A" },
      canEdit: true,
    });

    const manager = await getWorkspaceCustomerDetails(
      ids.managerAuth,
      "workspace-a",
    );
    expect(manager).toMatchObject({
      details: { id: ids.workspaceA, displayName: "Workspace A" },
      canEdit: false,
    });
    await expect(
      getWorkspaceCustomerDetails(ids.ownerOneAuth, "workspace-b"),
    ).resolves.toBeNull();
  });

  it("allows an Account Owner to update only their workspace details", async () => {
    await expect(
      updateWorkspaceCustomerDetails({
        authSubject: ids.ownerOneAuth,
        workspaceSlug: "workspace-a",
        details: UPDATED_CUSTOMER_DETAILS,
      }),
    ).resolves.toEqual({ ok: true });

    const workspaces = await adminPool.query<{
      id: string;
      display_name: string;
      primary_email: string | null;
    }>(
      `SELECT "id", "display_name", "primary_email"
       FROM "workspaces" ORDER BY "slug"`,
    );
    expect(workspaces.rows).toEqual([
      {
        id: ids.workspaceA,
        display_name: "Workspace A Updated",
        primary_email: "hello@workspace-a.test",
      },
      {
        id: ids.workspaceB,
        display_name: "Workspace B",
        primary_email: null,
      },
    ]);

    const audit = await adminPool.query<{
      actor_membership_id: string;
      metadata: { changedFields: string[] };
    }>(
      `SELECT "actor_membership_id", "metadata"
       FROM "audit_events"
       WHERE "action" = 'workspace.details.update'
         AND "target_id" = $1`,
      [ids.workspaceA],
    );
    expect(audit.rows[0]?.actor_membership_id).toBe(ids.ownerOneMembership);
    expect(audit.rows[0]?.metadata.changedFields).toContain("displayName");
  });

  it("denies customer-detail editing without workspace.update", async () => {
    await expect(
      updateWorkspaceCustomerDetails({
        authSubject: ids.managerAuth,
        workspaceSlug: "workspace-a",
        details: UPDATED_CUSTOMER_DETAILS,
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });

    const workspace = await adminPool.query<{ display_name: string }>(
      `SELECT "display_name" FROM "workspaces" WHERE "id" = $1::uuid`,
      [ids.workspaceA],
    );
    expect(workspace.rows[0]?.display_name).toBe("Workspace A");
  });

  it("allows a Platform Owner to update customer details", async () => {
    await expect(
      updatePlatformCustomerDetails({
        authSubject: ids.platformAuth,
        customerSlug: "workspace-a",
        details: UPDATED_CUSTOMER_DETAILS,
      }),
    ).resolves.toEqual({ ok: true });

    const workspace = await adminPool.query<{ display_name: string }>(
      `SELECT "display_name" FROM "workspaces" WHERE "id" = $1::uuid`,
      [ids.workspaceA],
    );
    expect(workspace.rows[0]?.display_name).toBe("Workspace A Updated");
  });

  it("allows a Platform Owner to update a name and audits the change", async () => {
    await expect(
      updatePlatformUserName({
        authSubject: ids.platformAuth,
        targetUserIdentityId: ids.ownerOneIdentity,
        firstName: "  Olivia Rose  ",
        lastName: "  van Hart  ",
      }),
    ).resolves.toEqual({ ok: true });

    const updated = await adminPool.query<{
      first_name: string;
      last_name: string;
    }>(
      `SELECT "first_name", "last_name"
       FROM "user_identities" WHERE "id" = $1::uuid`,
      [ids.ownerOneIdentity],
    );
    expect(updated.rows[0]).toEqual({
      first_name: "Olivia Rose",
      last_name: "van Hart",
    });

    const audit = await adminPool.query<{
      actor_user_identity_id: string;
      outcome: string;
    }>(
      `SELECT "actor_user_identity_id", "outcome"
       FROM "audit_events"
       WHERE "action" = 'user_identity.name.update'
         AND "target_id" = $1`,
      [ids.ownerOneIdentity],
    );
    expect(audit.rows).toEqual([
      {
        actor_user_identity_id: ids.platformIdentity,
        outcome: "succeeded",
      },
    ]);
  });

  it("denies name editing to an ordinary workspace member", async () => {
    await expect(
      updatePlatformUserName({
        authSubject: ids.ownerOneAuth,
        targetUserIdentityId: ids.platformIdentity,
        firstName: "Not",
        lastName: "Allowed",
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });

    const unchanged = await adminPool.query<{
      first_name: string;
      last_name: string;
    }>(
      `SELECT "first_name", "last_name"
       FROM "user_identities" WHERE "id" = $1::uuid`,
      [ids.platformIdentity],
    );
    expect(unchanged.rows[0]).toEqual({
      first_name: "Theo",
      last_name: "Grant",
    });
  });

  it("updates one customer feature-flag override and records its audit", async () => {
    const initial = await listCustomerFeatureFlags(
      ids.platformAuth,
      "workspace-a",
    );
    expect(initial?.[0]?.overrideMode).toBe("inherit");

    await expect(
      updateCustomerFeatureFlagOverride({
        authSubject: ids.platformAuth,
        customerSlug: "workspace-a",
        key: "staff_mfa",
        mode: "enabled",
      }),
    ).resolves.toEqual({ ok: true });

    const workspaceA = await listCustomerFeatureFlags(
      ids.platformAuth,
      "workspace-a",
    );
    const workspaceB = await listCustomerFeatureFlags(
      ids.platformAuth,
      "workspace-b",
    );
    expect(workspaceA?.[0]).toMatchObject({
      overrideMode: "enabled",
      effectiveEnabled: true,
    });
    expect(workspaceB?.[0]?.overrideMode).toBe("inherit");

    const audit = await adminPool.query(
      `SELECT "outcome", "workspace_id" FROM "audit_events"
       WHERE "action" = 'workspace_feature_flag.update'
         AND "target_id" = 'staff_mfa'`,
    );
    expect(audit.rows).toEqual([
      { outcome: "succeeded", workspace_id: ids.workspaceA },
    ]);
  });

  it("denies customer feature-flag changes by an ordinary member", async () => {
    await expect(
      updateCustomerFeatureFlagOverride({
        authSubject: ids.ownerOneAuth,
        customerSlug: "workspace-a",
        key: "staff_mfa",
        mode: "enabled",
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });

    const overrideCount = await adminPool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS "count"
       FROM "workspace_feature_flag_overrides"`,
    );
    expect(overrideCount.rows[0]?.count).toBe("0");
  });
});
