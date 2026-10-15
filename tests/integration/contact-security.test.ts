import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";

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
  branchA1: randomUUID(),
  branchA2: randomUUID(),
  branchB: randomUUID(),
  identityA1: randomUUID(),
  identityA2: randomUUID(),
  identityAAll: randomUUID(),
  identityB: randomUUID(),
  membershipA1: randomUUID(),
  membershipA2: randomUUID(),
  membershipAAll: randomUUID(),
  membershipB: randomUUID(),
  personA1: randomUUID(),
  personA2: randomUUID(),
  organisationA: randomUUID(),
  personB: randomUUID(),
};

async function seedMembership(
  client: PoolClient,
  input: {
    membershipId: string;
    identityId: string;
    workspaceId: string;
    role: string;
    branchIds?: readonly string[];
  },
) {
  await client.query(
    `INSERT INTO "memberships"
      ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::membership_scope_mode,
       CURRENT_TIMESTAMP)`,
    [
      input.membershipId,
      input.workspaceId,
      input.identityId,
      input.branchIds ? "named_branches" : "workspace",
    ],
  );
  await client.query(
    `INSERT INTO "membership_roles"
      ("workspace_id", "membership_id", "role_code")
     VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
    [input.workspaceId, input.membershipId, input.role],
  );
  for (const branchId of input.branchIds ?? []) {
    await client.query(
      `INSERT INTO "membership_branch_access"
        ("workspace_id", "membership_id", "branch_id")
       VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      [input.workspaceId, input.membershipId, branchId],
    );
  }
}

async function seedContact(
  client: PoolClient,
  input: {
    id: string;
    workspaceId: string;
    membershipId: string;
    branchId: string;
    reference: string;
    kind?: "person" | "organisation";
  },
) {
  const kind = input.kind ?? "person";
  await client.query(
    `INSERT INTO "contacts" (
      "id", "workspace_id", "kind", "reference", "first_name", "last_name",
      "organisation_type", "legal_name", "created_by_membership_id", "updated_at"
    ) VALUES (
      $1::uuid, $2::uuid, $3::contact_kind, $4,
      CASE WHEN $3 = 'person' THEN 'Alex' END,
      CASE WHEN $3 = 'person' THEN 'Example' END,
      CASE WHEN $3 = 'organisation' THEN 'limited_company'::organisation_type END,
      CASE WHEN $3 = 'organisation' THEN 'Example Limited' END,
      $5::uuid, CURRENT_TIMESTAMP
    )`,
    [input.id, input.workspaceId, kind, input.reference, input.membershipId],
  );
  await client.query(
    `INSERT INTO "contact_branch_links" (
      "workspace_id", "contact_id", "branch_id", "is_primary",
      "created_by_membership_id", "updated_at"
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::uuid, CURRENT_TIMESTAMP)`,
    [input.workspaceId, input.id, input.branchId, input.membershipId],
  );
}

async function seedFoundation() {
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
        ($1::uuid, 'contacts-a', 'Contacts A', 'agency', CURRENT_TIMESTAMP),
        ($2::uuid, 'contacts-b', 'Contacts B', 'agency', CURRENT_TIMESTAMP)`,
      [ids.workspaceA, ids.workspaceB],
    );
    await client.query(
      `INSERT INTO "branches" ("id", "workspace_id", "name", "updated_at")
       VALUES
        ($1::uuid, $4::uuid, 'A One', CURRENT_TIMESTAMP),
        ($2::uuid, $4::uuid, 'A Two', CURRENT_TIMESTAMP),
        ($3::uuid, $5::uuid, 'B One', CURRENT_TIMESTAMP)`,
      [ids.branchA1, ids.branchA2, ids.branchB, ids.workspaceA, ids.workspaceB],
    );
    await client.query(
      `INSERT INTO "user_identities" ("id", "updated_at")
       VALUES
        ($1::uuid, CURRENT_TIMESTAMP),
        ($2::uuid, CURRENT_TIMESTAMP),
        ($3::uuid, CURRENT_TIMESTAMP),
        ($4::uuid, CURRENT_TIMESTAMP)`,
      [ids.identityA1, ids.identityA2, ids.identityAAll, ids.identityB],
    );
    await seedMembership(client, {
      membershipId: ids.membershipA1,
      identityId: ids.identityA1,
      workspaceId: ids.workspaceA,
      role: "workspace_owner",
      branchIds: [ids.branchA1],
    });
    await seedMembership(client, {
      membershipId: ids.membershipA2,
      identityId: ids.identityA2,
      workspaceId: ids.workspaceA,
      role: "negotiator",
      branchIds: [ids.branchA2],
    });
    await seedMembership(client, {
      membershipId: ids.membershipAAll,
      identityId: ids.identityAAll,
      workspaceId: ids.workspaceA,
      role: "workspace_owner",
    });
    await seedMembership(client, {
      membershipId: ids.membershipB,
      identityId: ids.identityB,
      workspaceId: ids.workspaceB,
      role: "workspace_owner",
    });
    await seedContact(client, {
      id: ids.personA1,
      workspaceId: ids.workspaceA,
      membershipId: ids.membershipA1,
      branchId: ids.branchA1,
      reference: "PER-A1111111",
    });
    await seedContact(client, {
      id: ids.personA2,
      workspaceId: ids.workspaceA,
      membershipId: ids.membershipA2,
      branchId: ids.branchA2,
      reference: "PER-A2222222",
    });
    await seedContact(client, {
      id: ids.organisationA,
      workspaceId: ids.workspaceA,
      membershipId: ids.membershipA1,
      branchId: ids.branchA1,
      reference: "ORG-A1111111",
      kind: "organisation",
    });
    await seedContact(client, {
      id: ids.personB,
      workspaceId: ids.workspaceB,
      membershipId: ids.membershipB,
      branchId: ids.branchB,
      reference: "PER-B1111111",
    });
    await client.query(
      `INSERT INTO "contact_points" (
        "workspace_id", "contact_id", "kind", "value", "normalized_value",
        "is_preferred", "updated_at"
      ) VALUES ($1::uuid, $2::uuid, 'email', 'alex@example.test',
        'alex@example.test', true, CURRENT_TIMESTAMP)`,
      [ids.workspaceA, ids.personA1],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function setContactContext(
  client: PoolClient,
  input: {
    workspaceId: string;
    membershipId: string;
    scope: "workspace" | "named_branches";
    branchIds?: readonly string[];
  },
) {
  await client.query("SELECT set_config('app.workspace_id', $1, true)", [
    input.workspaceId,
  ]);
  await client.query("SELECT set_config('app.membership_id', $1, true)", [
    input.membershipId,
  ]);
  await client.query(
    "SELECT set_config('app.membership_scope_mode', $1, true)",
    [input.scope],
  );
  await client.query("SELECT set_config('app.allowed_branch_ids', $1, true)", [
    `{${(input.branchIds ?? []).join(",")}}`,
  ]);
}

beforeEach(seedFoundation);

afterAll(async () => {
  await runtimePool.end();
  await adminPool.end();
});

describe("contact database security", () => {
  it("denies contact rows when verified workspace and branch context is absent", async () => {
    const result = await runtimePool.query(`SELECT "id" FROM "contacts"`);
    expect(result.rows).toHaveLength(0);
  });

  it("limits named-branch users to contacts and children in their branch", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipA1,
        scope: "named_branches",
        branchIds: [ids.branchA1],
      });
      const contacts = await client.query<{ id: string }>(
        `SELECT "id" FROM "contacts" ORDER BY "reference"`,
      );
      expect(contacts.rows.map(({ id }) => id)).toEqual([
        ids.organisationA,
        ids.personA1,
      ]);
      const points = await client.query<{ contact_id: string }>(
        `SELECT "contact_id" FROM "contact_points"`,
      );
      expect(points.rows).toEqual([{ contact_id: ids.personA1 }]);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("prevents hidden-branch updates and child inserts", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipA1,
        scope: "named_branches",
        branchIds: [ids.branchA1],
      });
      const update = await client.query(
        `UPDATE "contacts" SET "preferred_name" = 'Hidden update',
          "updated_at" = CURRENT_TIMESTAMP
         WHERE "id" = $1::uuid`,
        [ids.personA2],
      );
      expect(update.rowCount).toBe(0);

      await expect(
        client.query(
          `INSERT INTO "contact_points" (
            "workspace_id", "contact_id", "kind", "value",
            "normalized_value", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, 'email', 'hidden@example.test',
            'hidden@example.test', CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.personA2],
        ),
      ).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("allows workspace-scoped members to see all contacts in only their workspace", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipAAll,
        scope: "workspace",
      });
      const result = await client.query<{ id: string }>(
        `SELECT "id" FROM "contacts" ORDER BY "reference"`,
      );
      expect(result.rows.map(({ id }) => id)).toEqual([
        ids.organisationA,
        ids.personA1,
        ids.personA2,
      ]);
      expect(result.rows.some(({ id }) => id === ids.personB)).toBe(false);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("does not grant Platform Owner standing contact access", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.platform_owner', 'true', true)",
      );
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        ids.workspaceA,
      ]);
      const result = await client.query(`SELECT "id" FROM "contacts"`);
      expect(result.rows).toHaveLength(0);
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  it("creates a contact and its authorised primary branch link atomically", async () => {
    const client = await runtimePool.connect();
    const contactId = randomUUID();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipA1,
        scope: "named_branches",
        branchIds: [ids.branchA1],
      });
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO "contacts" (
          "id", "workspace_id", "kind", "reference", "first_name",
          "last_name", "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, 'person', 'PER-NEW22222', 'New',
          'Contact', $3::uuid, CURRENT_TIMESTAMP)
        RETURNING "id"`,
        [contactId, ids.workspaceA, ids.membershipA1],
      );
      expect(inserted.rows).toEqual([{ id: contactId }]);
      await client.query(
        `INSERT INTO "contact_branch_links" (
          "workspace_id", "contact_id", "branch_id", "is_primary",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::uuid,
          CURRENT_TIMESTAMP)`,
        [ids.workspaceA, contactId, ids.branchA1, ids.membershipA1],
      );
      await client.query("COMMIT");
    } finally {
      client.release();
    }
  });

  it("rejects an active contact without a branch link at commit", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipA1,
        scope: "named_branches",
        branchIds: [ids.branchA1],
      });
      await client.query(
        `INSERT INTO "contacts" (
          "workspace_id", "kind", "reference", "first_name", "last_name",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, 'person', 'PER-NOLINK22', 'No', 'Branch',
          $2::uuid, CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.membershipA1],
      );
      await expect(client.query("COMMIT")).rejects.toMatchObject({
        code: "23514",
      });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("requires an active contact to retain one primary branch", async () => {
    const client = await adminPool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE "contact_branch_links" SET "is_primary" = false,
          "updated_at" = CURRENT_TIMESTAMP
         WHERE "workspace_id" = $1::uuid AND "contact_id" = $2::uuid`,
        [ids.workspaceA, ids.personA1],
      );
      await expect(client.query("COMMIT")).rejects.toMatchObject({
        code: "23514",
      });
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("rejects wrong address and organisation-person contact kinds", async () => {
    await expect(
      adminPool.query(
        `INSERT INTO "contact_addresses" (
          "workspace_id", "contact_id", "kind", "address_line_1",
          "town_city", "postcode", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, 'registered', '1 Test Street',
          'London', 'SW1A 1AA', CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.personA1],
      ),
    ).rejects.toMatchObject({ code: "23514" });

    await expect(
      adminPool.query(
        `INSERT INTO "organisation_person_links" (
          "workspace_id", "organisation_contact_id", "person_contact_id",
          "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.personA1, ids.organisationA],
      ),
    ).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects cross-workspace relationships", async () => {
    await expect(
      adminPool.query(
        `INSERT INTO "contact_branch_links" (
          "workspace_id", "contact_id", "branch_id", "is_primary",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, false, $4::uuid,
          CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.personA1, ids.branchB, ids.membershipA1],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  it("prevents the runtime role from hard-deleting contact data", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await setContactContext(client, {
        workspaceId: ids.workspaceA,
        membershipId: ids.membershipAAll,
        scope: "workspace",
      });
      await expect(
        client.query(`DELETE FROM "contact_points"`),
      ).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK");
    } finally {
      client.release();
    }
  });

  describe("contact notes", () => {
    const noteIds = {
      branchNote: randomUUID(),
      agencyNote: randomUUID(),
    };

    async function seedNotes() {
      await adminPool.query(
        `INSERT INTO "contact_branch_links" (
          "workspace_id", "contact_id", "branch_id", "is_primary",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, false, $4::uuid,
          CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.personA1, ids.branchA2, ids.membershipA1],
      );
      await adminPool.query(
        `INSERT INTO "contact_notes" (
          "id", "workspace_id", "contact_id", "branch_id", "visibility",
          "body", "created_by_membership_id", "author_name", "updated_at"
        ) VALUES
          ($1::uuid, $3::uuid, $4::uuid, $5::uuid, 'branch', 'Private',
            $6::uuid, 'Author One', CURRENT_TIMESTAMP),
          ($2::uuid, $3::uuid, $4::uuid, $5::uuid, 'agency', 'Shared',
            $6::uuid, 'Author One', CURRENT_TIMESTAMP)`,
        [
          noteIds.branchNote,
          noteIds.agencyNote,
          ids.workspaceA,
          ids.personA1,
          ids.branchA1,
          ids.membershipA1,
        ],
      );
    }

    async function inContext<T>(
      context: Parameters<typeof setContactContext>[1],
      run: (client: PoolClient) => Promise<T>,
    ) {
      const client = await runtimePool.connect();
      try {
        await client.query("BEGIN");
        await setContactContext(client, context);
        const result = await run(client);
        await client.query("ROLLBACK");
        return result;
      } finally {
        client.release();
      }
    }

    const branchA1User = {
      workspaceId: ids.workspaceA,
      membershipId: ids.membershipA1,
      scope: "named_branches" as const,
      branchIds: [ids.branchA1],
    };
    const branchA2User = {
      workspaceId: ids.workspaceA,
      membershipId: ids.membershipA2,
      scope: "named_branches" as const,
      branchIds: [ids.branchA2],
    };

    it("hides branch-private notes from another branch but shows agency-wide ones", async () => {
      await seedNotes();
      const owner = await inContext(branchA1User, (client) =>
        client.query<{ body: string }>(
          `SELECT "body" FROM "contact_notes" ORDER BY "body"`,
        ),
      );
      expect(owner.rows.map(({ body }) => body)).toEqual(["Private", "Shared"]);
      const other = await inContext(branchA2User, (client) =>
        client.query<{ body: string }>(`SELECT "body" FROM "contact_notes"`),
      );
      expect(other.rows.map(({ body }) => body)).toEqual(["Shared"]);
      const outsider = await inContext(
        {
          workspaceId: ids.workspaceB,
          membershipId: ids.membershipB,
          scope: "workspace",
        },
        (client) => client.query(`SELECT "id" FROM "contact_notes"`),
      );
      expect(outsider.rows).toHaveLength(0);
    });

    it("requires the writer to act in the owning branch and be the author", async () => {
      await seedNotes();
      const insert = (
        client: PoolClient,
        branchId: string,
        authorMembershipId: string,
      ) =>
        client.query(
          `INSERT INTO "contact_notes" (
            "workspace_id", "contact_id", "branch_id", "body",
            "created_by_membership_id", "author_name", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'New', $4::uuid,
            'Writer', CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.personA1, branchId, authorMembershipId],
        );
      await inContext(branchA2User, async (client) => {
        await client.query("SAVEPOINT s1");
        await expect(
          insert(client, ids.branchA1, ids.membershipA2),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT s1");
        await expect(
          insert(client, ids.branchA2, ids.membershipA1),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT s1");
        await expect(
          insert(client, ids.branchA2, ids.membershipA2),
        ).resolves.toMatchObject({ rowCount: 1 });
      });
    });

    it("lets only the owning branch change a note, and never its ownership", async () => {
      await seedNotes();
      const update = (client: PoolClient, setClause: string) =>
        client.query(
          `UPDATE "contact_notes" SET ${setClause}, "updated_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1::uuid`,
          [noteIds.agencyNote],
        );
      await inContext(branchA2User, async (client) => {
        const result = await update(client, `"body" = 'Hijacked'`);
        expect(result.rowCount).toBe(0);
      });
      await inContext(branchA1User, async (client) => {
        await expect(
          update(client, `"body" = 'Corrected'`),
        ).resolves.toMatchObject({ rowCount: 1 });
        await client.query("SAVEPOINT s1");
        await expect(
          update(client, `"branch_id" = '${ids.branchA2}'::uuid`),
        ).rejects.toMatchObject({ code: "23514" });
        await client.query("ROLLBACK TO SAVEPOINT s1");
        await expect(
          update(client, `"author_name" = 'Someone else'`),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("keeps a voided note final and the history append-only", async () => {
      await seedNotes();
      await inContext(branchA1User, async (client) => {
        await client.query(
          `INSERT INTO "contact_note_revisions" (
            "workspace_id", "note_id", "previous_body", "previous_occurred_at",
            "previous_visibility", "edit_reason", "edited_by_membership_id"
          ) VALUES ($1::uuid, $2::uuid, 'Old', CURRENT_TIMESTAMP, 'branch',
            'Typo', $3::uuid)`,
          [ids.workspaceA, noteIds.branchNote, ids.membershipA1],
        );
        await client.query("SAVEPOINT s1");
        await expect(
          client.query(
            `UPDATE "contact_note_revisions" SET "edit_reason" = 'Changed'`,
          ),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT s1");
        await expect(
          client.query(`DELETE FROM "contact_note_revisions"`),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT s1");
        await expect(
          client.query(`DELETE FROM "contact_notes"`),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT s1");

        await client.query(
          `UPDATE "contact_notes" SET "status" = 'voided',
            "voided_at" = CURRENT_TIMESTAMP,
            "voided_by_membership_id" = $2::uuid, "voided_by_name" = 'Mgr',
            "void_reason" = 'Wrong contact', "updated_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1::uuid`,
          [noteIds.branchNote, ids.membershipA1],
        );
        await client.query("SAVEPOINT s2");
        await expect(
          client.query(
            `UPDATE "contact_notes" SET "status" = 'active',
              "voided_at" = NULL, "voided_by_membership_id" = NULL,
              "voided_by_name" = NULL, "void_reason" = NULL,
              "updated_at" = CURRENT_TIMESTAMP
             WHERE "id" = $1::uuid`,
            [noteIds.branchNote],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("does not let voiding rewrite a note", async () => {
      await seedNotes();
      await inContext(branchA1User, async (client) => {
        await expect(
          client.query(
            `UPDATE "contact_notes" SET "status" = 'voided',
              "voided_at" = CURRENT_TIMESTAMP,
              "voided_by_membership_id" = $2::uuid, "voided_by_name" = 'Mgr',
              "void_reason" = 'Wrong contact', "body" = 'Rewritten',
              "updated_at" = CURRENT_TIMESTAMP
             WHERE "id" = $1::uuid`,
            [noteIds.branchNote, ids.membershipA1],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("keeps earlier wording private to the owning branch after sharing", async () => {
      await seedNotes();
      await adminPool.query(
        `INSERT INTO "contact_note_revisions" (
          "workspace_id", "note_id", "previous_body", "previous_occurred_at",
          "previous_visibility", "edit_reason", "edited_by_membership_id"
        ) VALUES ($1::uuid, $2::uuid, 'Private earlier wording',
          CURRENT_TIMESTAMP, 'branch', 'Shared it', $3::uuid)`,
        [ids.workspaceA, noteIds.agencyNote, ids.membershipA1],
      );
      const owning = await inContext(branchA1User, (client) =>
        client.query(`SELECT "previous_body" FROM "contact_note_revisions"`),
      );
      expect(owning.rows).toEqual([
        { previous_body: "Private earlier wording" },
      ]);
      const otherBranch = await inContext(branchA2User, async (client) => {
        const notes = await client.query(
          `SELECT "id" FROM "contact_notes" WHERE "id" = $1::uuid`,
          [noteIds.agencyNote],
        );
        const revisions = await client.query(
          `SELECT "previous_body" FROM "contact_note_revisions"`,
        );
        return { notes: notes.rows, revisions: revisions.rows };
      });
      expect(otherBranch.notes).toHaveLength(1);
      expect(otherBranch.revisions).toEqual([]);
    });

    it("only files a note under one of the contact's current branches", async () => {
      const insert = (client: PoolClient, branchId: string) =>
        client.query(
          `INSERT INTO "contact_notes" (
            "workspace_id", "contact_id", "branch_id", "body",
            "created_by_membership_id", "author_name", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'New', $4::uuid,
            'Writer', CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.personA2, branchId, ids.membershipAAll],
        );
      await inContext(
        {
          workspaceId: ids.workspaceA,
          membershipId: ids.membershipAAll,
          scope: "workspace",
        },
        async (client) => {
          await client.query("SAVEPOINT s1");
          await expect(insert(client, ids.branchA1)).rejects.toMatchObject({
            code: "42501",
          });
          await client.query("ROLLBACK TO SAVEPOINT s1");
          await expect(insert(client, ids.branchA2)).resolves.toMatchObject({
            rowCount: 1,
          });
        },
      );
    });
  });
});
