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
  identityA12: randomUUID(),
  identityAAll: randomUUID(),
  identityB: randomUUID(),
  membershipA1: randomUUID(),
  membershipA2: randomUUID(),
  membershipA12: randomUUID(),
  membershipAAll: randomUUID(),
  membershipB: randomUUID(),
  personA1: randomUUID(),
  personA2: randomUUID(),
  personB: randomUUID(),
  propertyA1: randomUUID(),
  propertyA2: randomUUID(),
  propertyB: randomUUID(),
};

type Actor = {
  workspaceId: string;
  membershipId: string;
  scope: "workspace" | "named_branches";
  branchIds?: readonly string[];
};

const actors = {
  managerA1: {
    workspaceId: ids.workspaceA,
    membershipId: ids.membershipA1,
    scope: "named_branches",
    branchIds: [ids.branchA1],
  },
  negotiatorA2: {
    workspaceId: ids.workspaceA,
    membershipId: ids.membershipA2,
    scope: "named_branches",
    branchIds: [ids.branchA2],
  },
  managerA12: {
    workspaceId: ids.workspaceA,
    membershipId: ids.membershipA12,
    scope: "named_branches",
    branchIds: [ids.branchA1, ids.branchA2],
  },
  ownerAAll: {
    workspaceId: ids.workspaceA,
    membershipId: ids.membershipAAll,
    scope: "workspace",
  },
} satisfies Record<string, Actor>;

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
  },
) {
  await client.query(
    `INSERT INTO "contacts" (
      "id", "workspace_id", "kind", "reference", "first_name", "last_name",
      "created_by_membership_id", "updated_at"
    ) VALUES ($1::uuid, $2::uuid, 'person', $3, 'Alex', 'Example',
      $4::uuid, CURRENT_TIMESTAMP)`,
    [input.id, input.workspaceId, input.reference, input.membershipId],
  );
  await client.query(
    `INSERT INTO "contact_branch_links" (
      "workspace_id", "contact_id", "branch_id", "is_primary",
      "created_by_membership_id", "updated_at"
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::uuid, CURRENT_TIMESTAMP)`,
    [input.workspaceId, input.id, input.branchId, input.membershipId],
  );
}

const insertPropertySql = `INSERT INTO "properties" (
  "id", "workspace_id", "reference", "responsible_branch_id",
  "address_street", "town_city", "postcode", "normalized_address_key",
  "property_type", "created_by_membership_id", "updated_at"
) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, '1 Test Street', 'London',
  'SW1A 1AA', $5, 'flat', $6::uuid, CURRENT_TIMESTAMP)`;

async function seedProperty(
  client: PoolClient,
  input: {
    id: string;
    workspaceId: string;
    branchId: string;
    membershipId: string;
    reference: string;
  },
) {
  await client.query(insertPropertySql, [
    input.id,
    input.workspaceId,
    input.reference,
    input.branchId,
    `1 test street|${input.reference}`,
    input.membershipId,
  ]);
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
        ($1::uuid, 'properties-a', 'Properties A', 'agency', CURRENT_TIMESTAMP),
        ($2::uuid, 'properties-b', 'Properties B', 'agency', CURRENT_TIMESTAMP)`,
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
       SELECT unnest($1::uuid[]), CURRENT_TIMESTAMP`,
      [
        [
          ids.identityA1,
          ids.identityA2,
          ids.identityA12,
          ids.identityAAll,
          ids.identityB,
        ],
      ],
    );
    await seedMembership(client, {
      membershipId: ids.membershipA1,
      identityId: ids.identityA1,
      workspaceId: ids.workspaceA,
      role: "branch_manager",
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
      membershipId: ids.membershipA12,
      identityId: ids.identityA12,
      workspaceId: ids.workspaceA,
      role: "branch_manager",
      branchIds: [ids.branchA1, ids.branchA2],
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
      id: ids.personB,
      workspaceId: ids.workspaceB,
      membershipId: ids.membershipB,
      branchId: ids.branchB,
      reference: "PER-B1111111",
    });
    await seedProperty(client, {
      id: ids.propertyA1,
      workspaceId: ids.workspaceA,
      branchId: ids.branchA1,
      membershipId: ids.membershipA1,
      reference: "PRP-AAAA2222",
    });
    await seedProperty(client, {
      id: ids.propertyA2,
      workspaceId: ids.workspaceA,
      branchId: ids.branchA2,
      membershipId: ids.membershipA2,
      reference: "PRP-BBBB2222",
    });
    await seedProperty(client, {
      id: ids.propertyB,
      workspaceId: ids.workspaceB,
      branchId: ids.branchB,
      membershipId: ids.membershipB,
      reference: "PRP-CCCC2222",
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function setContext(client: PoolClient, actor: Actor) {
  await client.query("SELECT set_config('app.workspace_id', $1, true)", [
    actor.workspaceId,
  ]);
  await client.query("SELECT set_config('app.membership_id', $1, true)", [
    actor.membershipId,
  ]);
  await client.query(
    "SELECT set_config('app.membership_scope_mode', $1, true)",
    [actor.scope],
  );
  await client.query("SELECT set_config('app.allowed_branch_ids', $1, true)", [
    `{${(actor.branchIds ?? []).join(",")}}`,
  ]);
}

// Runs the callback as the runtime role in a transaction that is always
// rolled back, so each test leaves the seeded data unchanged.
async function asActor(
  actor: Actor,
  callback: (client: PoolClient) => Promise<void>,
) {
  const client = await runtimePool.connect();
  try {
    await client.query("BEGIN");
    await setContext(client, actor);
    await callback(client);
  } finally {
    await client.query("ROLLBACK").catch(() => undefined);
    client.release();
  }
}

async function insertOwnership(
  client: PoolClient,
  input: {
    propertyId: string;
    contactId: string;
    membershipId: string;
    isLead?: boolean;
    workspaceId?: string;
  },
) {
  const result = await client.query<{ id: string }>(
    `INSERT INTO "property_ownerships" (
      "workspace_id", "property_id", "contact_id", "is_lead",
      "created_by_membership_id", "updated_at"
    ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5::uuid, CURRENT_TIMESTAMP)
    RETURNING "id"`,
    [
      input.workspaceId ?? ids.workspaceA,
      input.propertyId,
      input.contactId,
      input.isLead ?? false,
      input.membershipId,
    ],
  );
  return result.rows[0].id;
}

async function ownershipCount(contactId: string) {
  const result = await adminPool.query<{ count: number }>(
    `SELECT "current_property_ownership_count" AS "count"
     FROM "contacts" WHERE "id" = $1::uuid`,
    [contactId],
  );
  return result.rows[0].count;
}

async function propertyIds(client: PoolClient) {
  const result = await client.query<{ id: string }>(
    `SELECT "id" FROM "properties" ORDER BY "reference"`,
  );
  return result.rows.map(({ id }) => id);
}

beforeEach(seedFoundation);

afterAll(async () => {
  await runtimePool.end();
  await adminPool.end();
});

describe("property database security", () => {
  it("denies property rows when verified workspace context is absent", async () => {
    const result = await runtimePool.query(`SELECT "id" FROM "properties"`);
    expect(result.rows).toHaveLength(0);
  });

  it("limits named-branch users to properties in their branches", async () => {
    await asActor(actors.managerA1, async (client) => {
      expect(await propertyIds(client)).toEqual([ids.propertyA1]);
    });
    await asActor(actors.negotiatorA2, async (client) => {
      expect(await propertyIds(client)).toEqual([ids.propertyA2]);
    });
  });

  it("shows workspace-scoped members every property in only their workspace", async () => {
    await asActor(actors.ownerAAll, async (client) => {
      expect(await propertyIds(client)).toEqual([
        ids.propertyA1,
        ids.propertyA2,
      ]);
    });
  });

  it("does not grant Platform Owner standing property access", async () => {
    const client = await runtimePool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT set_config('app.platform_owner', 'true', true)",
      );
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        ids.workspaceA,
      ]);
      const result = await client.query(`SELECT "id" FROM "properties"`);
      expect(result.rows).toHaveLength(0);
    } finally {
      await client.query("ROLLBACK").catch(() => undefined);
      client.release();
    }
  });

  it("only creates properties in the actor's branches and as the actor", async () => {
    await asActor(actors.managerA1, async (client) => {
      await client.query("SAVEPOINT hidden_branch");
      await expect(
        client.query(insertPropertySql, [
          randomUUID(),
          ids.workspaceA,
          "PRP-DDDD2222",
          ids.branchA2,
          "key",
          ids.membershipA1,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
      await client.query("ROLLBACK TO SAVEPOINT hidden_branch");

      await expect(
        client.query(insertPropertySql, [
          randomUUID(),
          ids.workspaceA,
          "PRP-EEEE2222",
          ids.branchA1,
          "key",
          ids.membershipA2,
        ]),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });

  it("prevents updates to hidden properties and changes to identity fields", async () => {
    await asActor(actors.managerA1, async (client) => {
      const hidden = await client.query(
        `UPDATE "properties" SET "bedrooms" = 3 WHERE "id" = $1::uuid`,
        [ids.propertyA2],
      );
      expect(hidden.rowCount).toBe(0);

      await expect(
        client.query(
          `UPDATE "properties" SET "reference" = 'PRP-ZZZZ2222'
           WHERE "id" = $1::uuid`,
          [ids.propertyA1],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });
  });

  it("validates postcodes, rooms, floor area and lifecycle", async () => {
    const invalidUpdates = [
      `"postcode" = 'sw1a 1aa'`,
      `"bedrooms" = 51`,
      `"floor_area" = 900`,
      `"status" = 'archived'`,
      `"country_code" = 'FR'`,
    ];
    for (const assignment of invalidUpdates) {
      await expect(
        adminPool.query(
          `UPDATE "properties" SET ${assignment} WHERE "id" = $1::uuid`,
          [ids.propertyA1],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    }
  });

  it("prevents the runtime role from hard-deleting property data", async () => {
    for (const table of [
      "properties",
      "property_ownerships",
      "property_branch_transfers",
      "property_notes",
      "property_note_revisions",
    ]) {
      await asActor(actors.ownerAAll, async (client) => {
        await expect(
          client.query(`DELETE FROM "${table}"`),
        ).rejects.toMatchObject({ code: "42501" });
      });
    }
  });

  it("rejects cross-workspace property relationships", async () => {
    await expect(
      adminPool.query(
        `INSERT INTO "property_ownerships" (
          "workspace_id", "property_id", "contact_id",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.propertyA1, ids.personB, ids.membershipA1],
      ),
    ).rejects.toMatchObject({ code: "23503" });

    await expect(
      adminPool.query(insertPropertySql, [
        randomUUID(),
        ids.workspaceA,
        "PRP-FFFF2222",
        ids.branchB,
        "key",
        ids.membershipA1,
      ]),
    ).rejects.toMatchObject({ code: "23503" });
  });

  describe("branch transfers", () => {
    async function transfer(
      client: PoolClient,
      input: { from: string; to: string; membershipId: string },
    ) {
      await client.query(
        `INSERT INTO "property_branch_transfers" (
          "workspace_id", "property_id", "from_branch_id", "to_branch_id",
          "reason", "transferred_by_membership_id"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Office move',
          $5::uuid)`,
        [
          ids.workspaceA,
          ids.propertyA1,
          input.from,
          input.to,
          input.membershipId,
        ],
      );
    }

    async function moveProperty(client: PoolClient, branchId: string) {
      return client.query(
        `UPDATE "properties" SET "responsible_branch_id" = $2::uuid,
          "updated_at" = CURRENT_TIMESTAMP
         WHERE "id" = $1::uuid`,
        [ids.propertyA1, branchId],
      );
    }

    it("moves a property between managed branches with a transfer record", async () => {
      await asActor(actors.managerA12, async (client) => {
        await transfer(client, {
          from: ids.branchA1,
          to: ids.branchA2,
          membershipId: ids.membershipA12,
        });
        const moved = await moveProperty(client, ids.branchA2);
        expect(moved.rowCount).toBe(1);

        // The new branch sees the property and its transfer history.
        await setContext(client, actors.negotiatorA2);
        expect(await propertyIds(client)).toEqual([
          ids.propertyA1,
          ids.propertyA2,
        ]);
        const history = await client.query(
          `SELECT "id" FROM "property_branch_transfers"`,
        );
        expect(history.rows).toHaveLength(1);

        // The old branch no longer sees it.
        await setContext(client, actors.managerA1);
        expect(await propertyIds(client)).toEqual([]);
      });
    });

    it("commits a transfer only when the property actually moves", async () => {
      await asActor(actors.managerA12, async (client) => {
        await transfer(client, {
          from: ids.branchA1,
          to: ids.branchA2,
          membershipId: ids.membershipA12,
        });
        await moveProperty(client, ids.branchA2);
        await client.query("COMMIT");
      });

      await asActor(actors.managerA12, async (client) => {
        await transfer(client, {
          from: ids.branchA2,
          to: ids.branchA1,
          membershipId: ids.membershipA12,
        });
        await expect(client.query("COMMIT")).rejects.toMatchObject({
          code: "23514",
        });
      });
    });

    it("rejects a branch change without a matching transfer record", async () => {
      await asActor(actors.managerA12, async (client) => {
        await expect(moveProperty(client, ids.branchA2)).rejects.toMatchObject({
          code: "23514",
        });
      });
    });

    it("allows only one transfer record per property per transaction, so history cannot show phantom moves", async () => {
      await asActor(actors.managerA12, async (client) => {
        await transfer(client, {
          from: ids.branchA1,
          to: ids.branchA2,
          membershipId: ids.membershipA12,
        });
        await moveProperty(client, ids.branchA2);
        await expect(
          transfer(client, {
            from: ids.branchA2,
            to: ids.branchA1,
            membershipId: ids.membershipA12,
          }),
        ).rejects.toMatchObject({ code: "23505" });
      });
    });

    it("cannot be fooled by a temporary table standing in for the transfer history", async () => {
      await asActor(actors.managerA12, async (client) => {
        await client.query(
          `CREATE TEMP TABLE "property_branch_transfers"
           (LIKE public."property_branch_transfers" INCLUDING DEFAULTS)`,
        );
        await client.query(
          `INSERT INTO pg_temp."property_branch_transfers" (
            "workspace_id", "property_id", "from_branch_id", "to_branch_id",
            "reason", "transferred_by_membership_id"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, 'Fake',
            $5::uuid)`,
          [
            ids.workspaceA,
            ids.propertyA1,
            ids.branchA1,
            ids.branchA2,
            ids.membershipA12,
          ],
        );
        await expect(moveProperty(client, ids.branchA2)).rejects.toMatchObject({
          code: "23514",
        });
      });
    });

    it("rejects a transfer recorded by someone else", async () => {
      await asActor(actors.managerA12, async (client) => {
        await expect(
          transfer(client, {
            from: ids.branchA1,
            to: ids.branchA2,
            membershipId: ids.membershipAAll,
          }),
        ).rejects.toMatchObject({ code: "42501" });
      });
    });

    it("rejects a transfer to a branch outside the actor's scope", async () => {
      await asActor(actors.managerA1, async (client) => {
        await expect(
          transfer(client, {
            from: ids.branchA1,
            to: ids.branchA2,
            membershipId: ids.membershipA1,
          }),
        ).rejects.toMatchObject({ code: "42501" });
      });
    });

    it("rejects a transfer that does not start from the current branch", async () => {
      await asActor(actors.managerA12, async (client) => {
        await expect(
          transfer(client, {
            from: ids.branchA2,
            to: ids.branchA1,
            membershipId: ids.membershipA12,
          }),
        ).rejects.toMatchObject({ code: "42501" });
      });
    });

    it("keeps transfer history append-only", async () => {
      await asActor(actors.ownerAAll, async (client) => {
        await expect(
          client.query(
            `UPDATE "property_branch_transfers" SET "reason" = 'Changed'`,
          ),
        ).rejects.toMatchObject({ code: "42501" });
      });
    });
  });

  describe("ownerships", () => {
    it("lets an in-scope user record an owner and counts the ownership", async () => {
      await asActor(actors.managerA1, async (client) => {
        await insertOwnership(client, {
          propertyId: ids.propertyA1,
          contactId: ids.personA1,
          membershipId: ids.membershipA1,
          isLead: true,
        });
        const count = await client.query<{ count: number }>(
          `SELECT "current_property_ownership_count" AS "count"
           FROM "contacts" WHERE "id" = $1::uuid`,
          [ids.personA1],
        );
        expect(count.rows).toEqual([{ count: 1 }]);
      });
    });

    it("rejects ownerships of hidden properties or hidden contacts", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query("SAVEPOINT hidden_contact");
        await expect(
          insertOwnership(client, {
            propertyId: ids.propertyA1,
            contactId: ids.personA2,
            membershipId: ids.membershipA1,
          }),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT hidden_contact");

        await expect(
          insertOwnership(client, {
            propertyId: ids.propertyA2,
            contactId: ids.personA1,
            membershipId: ids.membershipA1,
          }),
        ).rejects.toMatchObject({ code: "42501" });
      });
    });

    it("allows one current lead and one current ownership per contact", async () => {
      await adminPool.query(
        `INSERT INTO "contact_branch_links" (
          "workspace_id", "contact_id", "branch_id", "is_primary",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, false, $4::uuid,
          CURRENT_TIMESTAMP)`,
        [ids.workspaceA, ids.personA2, ids.branchA1, ids.membershipA1],
      );
      await asActor(actors.managerA1, async (client) => {
        await insertOwnership(client, {
          propertyId: ids.propertyA1,
          contactId: ids.personA1,
          membershipId: ids.membershipA1,
          isLead: true,
        });
        await client.query("SAVEPOINT second_lead");
        await expect(
          insertOwnership(client, {
            propertyId: ids.propertyA1,
            contactId: ids.personA2,
            membershipId: ids.membershipA1,
            isLead: true,
          }),
        ).rejects.toMatchObject({ code: "23505" });
        await client.query("ROLLBACK TO SAVEPOINT second_lead");

        await expect(
          insertOwnership(client, {
            propertyId: ids.propertyA1,
            contactId: ids.personA1,
            membershipId: ids.membershipA1,
          }),
        ).rejects.toMatchObject({ code: "23505" });
      });
    });

    it("keeps ownership identity fixed and ended ownerships permanent", async () => {
      await asActor(actors.managerA1, async (client) => {
        const ownershipId = await insertOwnership(client, {
          propertyId: ids.propertyA1,
          contactId: ids.personA1,
          membershipId: ids.membershipA1,
          isLead: true,
        });

        await client.query("SAVEPOINT change_owner");
        await expect(
          client.query(
            `UPDATE "property_ownerships" SET "started_on" = DATE '2020-01-01'
             WHERE "id" = $1::uuid`,
            [ownershipId],
          ),
        ).rejects.toMatchObject({ code: "23514" });
        await client.query("ROLLBACK TO SAVEPOINT change_owner");

        // An ending must clear the lead marker and give a reason.
        await client.query("SAVEPOINT end_as_lead");
        await expect(
          client.query(
            `UPDATE "property_ownerships" SET "ended_at" = CURRENT_TIMESTAMP,
              "end_reason" = 'Sold'
             WHERE "id" = $1::uuid`,
            [ownershipId],
          ),
        ).rejects.toMatchObject({ code: "23514" });
        await client.query("ROLLBACK TO SAVEPOINT end_as_lead");

        await client.query(
          `UPDATE "property_ownerships" SET "ended_at" = CURRENT_TIMESTAMP,
            "end_reason" = 'Sold', "is_lead" = false
           WHERE "id" = $1::uuid`,
          [ownershipId],
        );
        await expect(
          client.query(
            `UPDATE "property_ownerships" SET "end_reason" = 'Changed'
             WHERE "id" = $1::uuid`,
            [ownershipId],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("rejects archived or merged contacts as current owners", async () => {
      const archivedId = randomUUID();
      await adminPool.query(
        `INSERT INTO "contacts" (
          "id", "workspace_id", "kind", "reference", "status", "first_name",
          "last_name", "archived_at", "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, 'person', 'PER-ARCH2222', 'archived',
          'Archived', 'Owner', CURRENT_TIMESTAMP, $3::uuid, CURRENT_TIMESTAMP)`,
        [archivedId, ids.workspaceA, ids.membershipA1],
      );
      await expect(
        adminPool.query(
          `INSERT INTO "property_ownerships" (
            "workspace_id", "property_id", "contact_id",
            "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.propertyA1, archivedId, ids.membershipA1],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });
  });

  describe("current owner archiving", () => {
    async function seedHiddenOwnership() {
      // personA2 belongs to branch A2, and also (through ownership) to A1.
      const client = await adminPool.connect();
      try {
        await client.query("BEGIN");
        // The ownership count update runs under row security, so the setup
        // needs a workspace context like any real caller.
        await setContext(client, actors.ownerAAll);
        await client.query(
          `INSERT INTO "contact_branch_links" (
            "workspace_id", "contact_id", "branch_id", "is_primary",
            "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, false, $4::uuid,
            CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.personA2, ids.branchA1, ids.membershipA1],
        );
        const ownershipId = await insertOwnership(client, {
          propertyId: ids.propertyA1,
          contactId: ids.personA2,
          membershipId: ids.membershipA1,
        });
        await client.query("COMMIT");
        return ownershipId;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }

    it("hides an ownership from users who cannot see the property", async () => {
      await seedHiddenOwnership();
      await asActor(actors.negotiatorA2, async (client) => {
        const ownerships = await client.query(
          `SELECT "id" FROM "property_ownerships"`,
        );
        expect(ownerships.rows).toHaveLength(0);
      });
      await asActor(actors.managerA1, async (client) => {
        const ownerships = await client.query(
          `SELECT "contact_id" FROM "property_ownerships"`,
        );
        expect(ownerships.rows).toEqual([{ contact_id: ids.personA2 }]);
      });
    });

    it("hides an ownership when the owner contact is not visible", async () => {
      // Remove the owner's A1 link so the A1 user can no longer see them.
      await seedHiddenOwnership();
      await adminPool.query(
        `UPDATE "contact_branch_links" SET "ended_at" = CURRENT_TIMESTAMP,
          "updated_at" = CURRENT_TIMESTAMP
         WHERE "contact_id" = $1::uuid AND "branch_id" = $2::uuid`,
        [ids.personA2, ids.branchA1],
      );
      await asActor(actors.managerA1, async (client) => {
        expect(await propertyIds(client)).toEqual([ids.propertyA1]);
        const ownerships = await client.query(
          `SELECT "id" FROM "property_ownerships"`,
        );
        expect(ownerships.rows).toHaveLength(0);
      });
    });

    it("blocks archiving a current owner even when the property is hidden", async () => {
      await seedHiddenOwnership();
      expect(await ownershipCount(ids.personA2)).toBe(1);
      await asActor(actors.negotiatorA2, async (client) => {
        await expect(
          client.query(
            `UPDATE "contacts" SET "status" = 'archived',
              "archived_at" = CURRENT_TIMESTAMP
             WHERE "id" = $1::uuid`,
            [ids.personA2],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("allows archiving once every ownership has ended", async () => {
      const ownershipId = await seedHiddenOwnership();
      await asActor(actors.managerA1, async (client) => {
        await client.query(
          `UPDATE "property_ownerships" SET "ended_at" = CURRENT_TIMESTAMP,
            "end_reason" = 'Sold'
           WHERE "id" = $1::uuid`,
          [ownershipId],
        );
        const archived = await client.query(
          `UPDATE "contacts" SET "status" = 'archived',
            "archived_at" = CURRENT_TIMESTAMP
           WHERE "id" = $1::uuid`,
          [ids.personA2],
        );
        expect(archived.rowCount).toBe(1);
      });
    });

    it("cannot change the ownership count from a temporary trigger function", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query(`CREATE TEMP TABLE "bump_log" ("x" integer)`);
        await client.query(
          `CREATE FUNCTION pg_temp.bump() RETURNS trigger
           LANGUAGE plpgsql AS $$
           BEGIN
             UPDATE public."contacts"
             SET "current_property_ownership_count" = 7
             WHERE "id" = '${ids.personA1}'::uuid;
             RETURN NEW;
           END $$`,
        );
        await client.query(
          `CREATE TRIGGER "bump_trigger" BEFORE INSERT ON "bump_log"
           FOR EACH ROW EXECUTE FUNCTION pg_temp.bump()`,
        );
        await expect(
          client.query(`INSERT INTO "bump_log" ("x") VALUES (1)`),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("cannot hide an ownership from the count with a temporary contacts table", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query(
          `CREATE TEMP TABLE "contacts" (LIKE public."contacts")`,
        );
        await insertOwnership(client, {
          propertyId: ids.propertyA1,
          contactId: ids.personA1,
          membershipId: ids.membershipA1,
        });
        // The real contact must have been counted, so archiving is refused.
        await expect(
          client.query(
            `UPDATE public."contacts" SET "status" = 'archived',
              "archived_at" = CURRENT_TIMESTAMP
             WHERE "id" = $1::uuid`,
            [ids.personA1],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });

    it("never lets anyone write the ownership count directly", async () => {
      await asActor(actors.ownerAAll, async (client) => {
        await expect(
          client.query(
            `UPDATE "contacts" SET "current_property_ownership_count" = 5
             WHERE "id" = $1::uuid`,
            [ids.personA1],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
      await expect(
        adminPool.query(
          `INSERT INTO "contacts" (
            "workspace_id", "kind", "reference", "first_name", "last_name",
            "status", "archived_at", "current_property_ownership_count",
            "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, 'person', 'PER-COUNT222', 'Count', 'Owner',
            'archived', CURRENT_TIMESTAMP, 1, $2::uuid, CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.membershipA1],
        ),
      ).rejects.toMatchObject({ code: "23514" });
    });
  });

  describe("property notes", () => {
    async function addNote(client: PoolClient, propertyId: string) {
      const result = await client.query<{ id: string }>(
        `INSERT INTO "property_notes" (
          "workspace_id", "property_id", "body", "created_by_membership_id",
          "author_name", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, 'Keys with neighbour', $3::uuid,
          'Alex Example', CURRENT_TIMESTAMP)
        RETURNING "id"`,
        [ids.workspaceA, propertyId, ids.membershipA1],
      );
      return result.rows[0].id;
    }

    it("only lets users who can see the property read or write its notes", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query("SAVEPOINT hidden_property");
        await expect(addNote(client, ids.propertyA2)).rejects.toMatchObject({
          code: "42501",
        });
        await client.query("ROLLBACK TO SAVEPOINT hidden_property");

        await addNote(client, ids.propertyA1);
        await setContext(client, actors.negotiatorA2);
        const hidden = await client.query(`SELECT "id" FROM "property_notes"`);
        expect(hidden.rows).toHaveLength(0);
      });
    });

    it("keeps voided notes final and revisions append-only", async () => {
      await asActor(actors.managerA1, async (client) => {
        const noteId = await addNote(client, ids.propertyA1);
        await client.query(
          `INSERT INTO "property_note_revisions" (
            "workspace_id", "note_id", "previous_body",
            "previous_occurred_at", "edit_reason", "edited_by_membership_id"
          ) VALUES ($1::uuid, $2::uuid, 'Old', CURRENT_TIMESTAMP, 'Typo',
            $3::uuid)`,
          [ids.workspaceA, noteId, ids.membershipA1],
        );
        await client.query("SAVEPOINT revision_update");
        await expect(
          client.query(
            `UPDATE "property_note_revisions" SET "edit_reason" = 'Changed'`,
          ),
        ).rejects.toMatchObject({ code: "42501" });
        await client.query("ROLLBACK TO SAVEPOINT revision_update");

        await client.query(
          `UPDATE "property_notes" SET "status" = 'voided',
            "voided_at" = CURRENT_TIMESTAMP,
            "voided_by_membership_id" = $2::uuid,
            "voided_by_name" = 'Alex Example', "void_reason" = 'Wrong property'
           WHERE "id" = $1::uuid`,
          [noteId, ids.membershipA1],
        );
        await expect(
          client.query(
            `UPDATE "property_notes" SET "body" = 'Rewritten'
             WHERE "id" = $1::uuid`,
            [noteId],
          ),
        ).rejects.toMatchObject({ code: "23514" });
      });
    });
  });
});
