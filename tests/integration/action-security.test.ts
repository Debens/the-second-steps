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
  ownerA: randomUUID(),
  managerA1: randomUUID(),
  negotiatorA2: randomUUID(),
  managerA12: randomUUID(),
  readOnlyA1: randomUUID(),
  accountsA1: randomUUID(),
  suspendedA1: randomUUID(),
  ownerB: randomUUID(),
  personA1: randomUUID(),
  personA2: randomUUID(),
  archivedA1: randomUUID(),
  personB: randomUUID(),
  propertyA1: randomUUID(),
  propertyA2: randomUUID(),
  actionA1: randomUUID(),
  actionA2: randomUUID(),
  actionB: randomUUID(),
  enquiryA1: randomUUID(),
  taskA1: randomUUID(),
};

type Actor = {
  workspaceId: string;
  membershipId: string;
  scope: "workspace" | "named_branches";
  branchIds?: readonly string[];
};

const actors = {
  ownerA: {
    workspaceId: ids.workspaceA,
    membershipId: ids.ownerA,
    scope: "workspace",
  },
  managerA1: {
    workspaceId: ids.workspaceA,
    membershipId: ids.managerA1,
    scope: "named_branches",
    branchIds: [ids.branchA1],
  },
  negotiatorA2: {
    workspaceId: ids.workspaceA,
    membershipId: ids.negotiatorA2,
    scope: "named_branches",
    branchIds: [ids.branchA2],
  },
  managerA12: {
    workspaceId: ids.workspaceA,
    membershipId: ids.managerA12,
    scope: "named_branches",
    branchIds: [ids.branchA1, ids.branchA2],
  },
  readOnlyA1: {
    workspaceId: ids.workspaceA,
    membershipId: ids.readOnlyA1,
    scope: "named_branches",
    branchIds: [ids.branchA1],
  },
  accountsA1: {
    workspaceId: ids.workspaceA,
    membershipId: ids.accountsA1,
    scope: "named_branches",
    branchIds: [ids.branchA1],
  },
  ownerB: {
    workspaceId: ids.workspaceB,
    membershipId: ids.ownerB,
    scope: "workspace",
  },
} satisfies Record<string, Actor>;

async function seed() {
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
        ($1::uuid, 'actions-a', 'Actions A', 'agency', CURRENT_TIMESTAMP),
        ($2::uuid, 'actions-b', 'Actions B', 'agency', CURRENT_TIMESTAMP)`,
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
    const memberships: [string, string, string, string[] | null, string][] = [
      [ids.ownerA, ids.workspaceA, "workspace_owner", null, "active"],
      [
        ids.managerA1,
        ids.workspaceA,
        "branch_manager",
        [ids.branchA1],
        "active",
      ],
      [
        ids.negotiatorA2,
        ids.workspaceA,
        "negotiator",
        [ids.branchA2],
        "active",
      ],
      [
        ids.managerA12,
        ids.workspaceA,
        "branch_manager",
        [ids.branchA1, ids.branchA2],
        "active",
      ],
      [ids.readOnlyA1, ids.workspaceA, "read_only", [ids.branchA1], "active"],
      [ids.accountsA1, ids.workspaceA, "accounts", [ids.branchA1], "active"],
      [
        ids.suspendedA1,
        ids.workspaceA,
        "negotiator",
        [ids.branchA1],
        "suspended",
      ],
      [ids.ownerB, ids.workspaceB, "workspace_owner", null, "active"],
    ];
    for (const [id, workspaceId, role, branches, status] of memberships) {
      const identityId = randomUUID();
      await client.query(
        `INSERT INTO "user_identities" ("id", "updated_at")
         VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
        [identityId],
      );
      await client.query(
        `INSERT INTO "memberships" ("id", "workspace_id", "user_identity_id",
          "scope_mode", "status", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::membership_scope_mode,
           $5::membership_status, CURRENT_TIMESTAMP)`,
        [
          id,
          workspaceId,
          identityId,
          branches ? "named_branches" : "workspace",
          status,
        ],
      );
      await client.query(
        `INSERT INTO "membership_roles"
          ("workspace_id", "membership_id", "role_code")
         VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
        [workspaceId, id, role],
      );
      for (const branchId of branches ?? []) {
        await client.query(
          `INSERT INTO "membership_branch_access"
            ("workspace_id", "membership_id", "branch_id")
           VALUES ($1::uuid, $2::uuid, $3::uuid)`,
          [workspaceId, id, branchId],
        );
      }
    }
    for (const [
      contactId,
      workspaceId,
      branchId,
      creator,
      reference,
      archived,
    ] of [
      [
        ids.personA1,
        ids.workspaceA,
        ids.branchA1,
        ids.managerA1,
        "PER-AC111111",
        false,
      ],
      [
        ids.personA2,
        ids.workspaceA,
        ids.branchA2,
        ids.negotiatorA2,
        "PER-AC222222",
        false,
      ],
      [
        ids.archivedA1,
        ids.workspaceA,
        ids.branchA1,
        ids.managerA1,
        "PER-AC333333",
        true,
      ],
      [
        ids.personB,
        ids.workspaceB,
        ids.branchB,
        ids.ownerB,
        "PER-AC444444",
        false,
      ],
    ] as const) {
      await client.query(
        `INSERT INTO "contacts" ("id", "workspace_id", "kind", "reference",
          "first_name", "last_name", "status", "archived_at",
          "created_by_membership_id", "updated_at")
         VALUES ($1::uuid, $2::uuid, 'person', $3, 'Alex', 'Example',
           $4::contact_status, $5, $6::uuid, CURRENT_TIMESTAMP)`,
        [
          contactId,
          workspaceId,
          reference,
          archived ? "archived" : "active",
          archived ? new Date() : null,
          creator,
        ],
      );
      await client.query(
        `INSERT INTO "contact_branch_links" ("workspace_id", "contact_id",
          "branch_id", "is_primary", "created_by_membership_id", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::uuid,
           CURRENT_TIMESTAMP)`,
        [workspaceId, contactId, branchId, creator],
      );
    }
    for (const [propertyId, branchId, reference] of [
      [ids.propertyA1, ids.branchA1, "PRP-ACAA2222"],
      [ids.propertyA2, ids.branchA2, "PRP-ACBB2222"],
    ]) {
      await client.query(
        `INSERT INTO "properties" ("id", "workspace_id", "reference",
          "responsible_branch_id", "address_street", "town_city", "postcode",
          "normalized_address_key", "property_type",
          "created_by_membership_id", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3, $4::uuid, '1 Test Street', 'London',
           'SW1A 1AA', $3, 'flat', $5::uuid, CURRENT_TIMESTAMP)`,
        [propertyId, ids.workspaceA, reference, branchId, ids.managerA1],
      );
    }
    // The assignee check reads the current workspace from the session.
    for (const [actionId, workspaceId, branchId, assignee, creator] of [
      [
        ids.actionA1,
        ids.workspaceA,
        ids.branchA1,
        ids.managerA1,
        ids.managerA1,
      ],
      [
        ids.actionA2,
        ids.workspaceA,
        ids.branchA2,
        ids.negotiatorA2,
        ids.managerA12,
      ],
      [ids.actionB, ids.workspaceB, ids.branchB, ids.ownerB, ids.ownerB],
    ]) {
      await client.query("SELECT set_config('app.workspace_id', $1, true)", [
        workspaceId,
      ]);
      await client.query(
        `INSERT INTO "actions" ("id", "workspace_id", "responsible_branch_id",
          "title", "due_on", "assigned_membership_id",
          "created_by_membership_id", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'Ring the council',
           '2026-10-16', $4::uuid, $5::uuid, CURRENT_TIMESTAMP)`,
        [actionId, workspaceId, branchId, assignee, creator],
      );
    }
    await client.query(
      `INSERT INTO "landlord_enquiries" ("id", "workspace_id", "reference",
        "responsible_branch_id", "enquirer_name", "enquirer_telephone",
        "postcode", "created_by_membership_id", "updated_at")
       VALUES ($1::uuid, $2::uuid, 'ENQ-ACAA2222', $3::uuid, 'Pat Landlord',
         '07700 900111', 'SW1A 1AA', $4::uuid, CURRENT_TIMESTAMP)`,
      [ids.enquiryA1, ids.workspaceA, ids.branchA1, ids.managerA1],
    );
    await client.query(
      `INSERT INTO "enquiry_tasks" ("id", "workspace_id", "enquiry_id",
        "title", "due_on", "assigned_membership_id",
        "created_by_membership_id", "updated_at")
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'Call landlord', '2026-10-16',
         $4::uuid, $4::uuid, CURRENT_TIMESTAMP)`,
      [ids.taskA1, ids.workspaceA, ids.enquiryA1, ids.managerA1],
    );
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

// Runs as the runtime role in a transaction that is always rolled back.
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

async function refused(
  client: PoolClient,
  codes: string | readonly string[],
  callback: () => Promise<unknown>,
) {
  const allowed = typeof codes === "string" ? [codes] : codes;
  await client.query("SAVEPOINT attempt");
  const error = await callback().then(
    () => null,
    (caught: unknown) => caught as { code?: string },
  );
  await client.query("ROLLBACK TO SAVEPOINT attempt");
  expect(error, "expected the database to refuse").not.toBeNull();
  expect(allowed).toContain(error?.code);
}

function insertAction(
  client: PoolClient,
  actor: Actor,
  input: {
    branchId?: string;
    assignee?: string;
    creator?: string;
    contactId?: string | null;
    propertyId?: string | null;
    status?: string;
    workspaceId?: string;
  } = {},
) {
  return client.query(
    `INSERT INTO "actions" ("workspace_id", "responsible_branch_id", "title",
      "due_on", "assigned_membership_id", "contact_id", "property_id",
      "status", "closed_at", "closed_by_membership_id",
      "created_by_membership_id", "updated_at")
     VALUES ($1::uuid, $2::uuid, 'Send the inventory', '2026-10-20', $3::uuid,
       $4::uuid, $5::uuid, $6::action_status,
       CASE WHEN $6 = 'open' THEN NULL ELSE CURRENT_TIMESTAMP END,
       CASE WHEN $6 = 'open' THEN NULL ELSE $7::uuid END,
       $7::uuid, CURRENT_TIMESTAMP)
     RETURNING "id"`,
    [
      input.workspaceId ?? actor.workspaceId,
      input.branchId ?? ids.branchA1,
      input.assignee ?? actor.membershipId,
      input.contactId ?? null,
      input.propertyId ?? null,
      input.status ?? "open",
      input.creator ?? actor.membershipId,
    ],
  );
}

async function visible(client: PoolClient) {
  const result = await client.query<{ id: string }>(
    `SELECT "id" FROM "actions" ORDER BY "id"`,
  );
  return result.rows.map(({ id }) => id);
}

beforeEach(seed);

afterAll(async () => {
  await runtimePool.end();
  await adminPool.end();
});

describe("general action database security", () => {
  it("shows nothing without a verified workspace context", async () => {
    const result = await runtimePool.query(`SELECT "id" FROM "actions"`);
    expect(result.rows).toHaveLength(0);
  });

  it("keeps each agency's actions to itself", async () => {
    await asActor(actors.ownerB, async (client) => {
      expect(await visible(client)).toEqual([ids.actionB]);
      await refused(client, ["42501", "23503", "23514"], () =>
        insertAction(client, actors.ownerB, {
          workspaceId: ids.workspaceA,
          branchId: ids.branchA1,
        }),
      );
      const update = await client.query(
        `UPDATE "actions" SET "title" = 'Taken' WHERE "id" = $1::uuid`,
        [ids.actionA1],
      );
      expect(update.rowCount).toBe(0);
    });
  });

  it("shows an action to its branch, its assignee and its creator only", async () => {
    await asActor(actors.negotiatorA2, async (client) => {
      expect(await visible(client)).toEqual([ids.actionA2]);
    });
    await asActor(actors.managerA1, async (client) => {
      expect(await visible(client)).toEqual([ids.actionA1]);
    });
    await asActor(actors.ownerA, async (client) => {
      expect((await visible(client)).sort()).toEqual(
        [ids.actionA1, ids.actionA2].sort(),
      );
    });
    // The creator still sees an action after losing access to its branch.
    await asActor({ ...actors.managerA12, branchIds: [] }, async (client) => {
      expect(await visible(client)).toEqual([ids.actionA2]);
    });
  });

  it("only creates open actions, as the actor, in a branch the actor works in", async () => {
    await asActor(actors.negotiatorA2, async (client) => {
      // Assigned to someone who can work there, so only the creator rule can
      // refuse it; assigning it to themselves is refused by the assignee rule.
      await refused(client, "42501", () =>
        insertAction(client, actors.negotiatorA2, {
          branchId: ids.branchA1,
          assignee: ids.managerA1,
        }),
      );
      await refused(client, "23514", () =>
        insertAction(client, actors.negotiatorA2, { branchId: ids.branchA1 }),
      );
      await refused(client, "42501", () =>
        insertAction(client, actors.negotiatorA2, {
          branchId: ids.branchA2,
          creator: ids.managerA12,
        }),
      );
      await refused(client, ["42501", "23514"], () =>
        insertAction(client, actors.negotiatorA2, {
          branchId: ids.branchA2,
          status: "done",
        }),
      );
      const created = await insertAction(client, actors.negotiatorA2, {
        branchId: ids.branchA2,
      });
      expect(created.rows).toHaveLength(1);
    });
  });

  it("lets every role except Read Only add actions", async () => {
    await asActor(actors.readOnlyA1, async (client) => {
      await refused(client, "42501", () =>
        insertAction(client, actors.readOnlyA1, { assignee: ids.managerA1 }),
      );
    });
    await asActor(actors.accountsA1, async (client) => {
      const created = await insertAction(client, actors.accountsA1);
      expect(created.rows).toHaveLength(1);
    });
  });

  it("only assigns actions to active colleagues who can work in the branch", async () => {
    await asActor(actors.managerA12, async (client) => {
      for (const assignee of [
        ids.readOnlyA1,
        ids.suspendedA1,
        ids.negotiatorA2,
      ]) {
        await refused(client, "23514", () =>
          insertAction(client, actors.managerA12, {
            branchId: ids.branchA1,
            assignee,
          }),
        );
      }
      await refused(client, ["23503", "23514"], () =>
        insertAction(client, actors.managerA12, {
          branchId: ids.branchA1,
          assignee: ids.ownerB,
        }),
      );
      const ok = await insertAction(client, actors.managerA12, {
        branchId: ids.branchA1,
        assignee: ids.accountsA1,
      });
      expect(ok.rows).toHaveLength(1);
      // The same rule applies when handing an action over.
      await refused(client, "23514", () =>
        client.query(
          `UPDATE "actions" SET "assigned_membership_id" = $2::uuid
           WHERE "id" = $1::uuid`,
          [ids.actionA1, ids.negotiatorA2],
        ),
      );
      const handed = await client.query(
        `UPDATE "actions" SET "assigned_membership_id" = $2::uuid
         WHERE "id" = $1::uuid`,
        [ids.actionA1, ids.accountsA1],
      );
      expect(handed.rowCount).toBe(1);
    });
  });

  it("lets a colleague in the branch change an action, but never Read Only", async () => {
    await asActor(actors.managerA12, async (client) => {
      const changed = await client.query(
        `UPDATE "actions" SET "due_on" = '2026-10-30' WHERE "id" = $1::uuid`,
        [ids.actionA1],
      );
      expect(changed.rowCount).toBe(1);
    });
    await asActor(actors.readOnlyA1, async (client) => {
      expect(await visible(client)).toEqual([ids.actionA1]);
      await refused(client, "42501", () =>
        client.query(
          `UPDATE "actions" SET "due_on" = '2026-10-30' WHERE "id" = $1::uuid`,
          [ids.actionA1],
        ),
      );
    });
  });

  it("records who closed an action, stamps the time, and keeps it closed", async () => {
    await asActor(actors.managerA1, async (client) => {
      await refused(client, "42501", () =>
        client.query(
          `UPDATE "actions" SET "status" = 'done',
             "closed_at" = CURRENT_TIMESTAMP,
             "closed_by_membership_id" = $2::uuid
           WHERE "id" = $1::uuid`,
          [ids.actionA1, ids.managerA12],
        ),
      );
      const closed = await client.query<{ closed_at: Date; now: Date }>(
        `UPDATE "actions" SET "status" = 'done',
           "closed_at" = '2000-01-01T00:00:00Z',
           "closed_by_membership_id" = $2::uuid
         WHERE "id" = $1::uuid
         RETURNING "closed_at", transaction_timestamp() AS "now"`,
        [ids.actionA1, ids.managerA1],
      );
      expect(closed.rows[0].closed_at.getTime()).toBe(
        closed.rows[0].now.getTime(),
      );
      await refused(client, "23514", () =>
        client.query(
          `UPDATE "actions" SET "status" = 'open', "closed_at" = NULL,
             "closed_by_membership_id" = NULL
           WHERE "id" = $1::uuid`,
          [ids.actionA1],
        ),
      );
      await refused(client, "23514", () =>
        client.query(
          `UPDATE "actions" SET "title" = 'Changed' WHERE "id" = $1::uuid`,
          [ids.actionA1],
        ),
      );
    });
  });

  it("keeps an action's identity and branch fixed", async () => {
    await asActor(actors.managerA12, async (client) => {
      for (const change of [
        `"responsible_branch_id" = '${ids.branchA2}'`,
        `"created_by_membership_id" = '${ids.managerA12}'`,
        `"created_at" = '2000-01-01T00:00:00Z'`,
      ]) {
        await refused(client, "23514", () =>
          client.query(`UPDATE "actions" SET ${change} WHERE "id" = $1::uuid`, [
            ids.actionA1,
          ]),
        );
      }
    });
  });

  it("only links active contacts and properties the actor can see, and never swaps them", async () => {
    await asActor(actors.managerA1, async (client) => {
      for (const contactId of [ids.personA2, ids.archivedA1, ids.personB]) {
        await refused(client, ["42501", "23503"], () =>
          insertAction(client, actors.managerA1, { contactId }),
        );
      }
      await refused(client, ["42501", "23503"], () =>
        insertAction(client, actors.managerA1, { propertyId: ids.propertyA2 }),
      );
      const linked = await insertAction(client, actors.managerA1, {
        contactId: ids.personA1,
        propertyId: ids.propertyA1,
      });
      const actionId = linked.rows[0].id;
      await refused(client, "23514", () =>
        client.query(
          `UPDATE "actions" SET "contact_id" = NULL WHERE "id" = $1::uuid`,
          [actionId],
        ),
      );
      // A link can be added later, under the same check.
      const later = await client.query(
        `UPDATE "actions" SET "contact_id" = $2::uuid WHERE "id" = $1::uuid`,
        [ids.actionA1, ids.personA1],
      );
      expect(later.rowCount).toBe(1);
    });
  });

  it("cannot be fooled by temporary tables standing in for memberships", async () => {
    await asActor(actors.managerA12, async (client) => {
      await client.query(
        `CREATE TEMP TABLE "memberships"
         (LIKE public."memberships" INCLUDING DEFAULTS)`,
      );
      await client.query(
        `INSERT INTO pg_temp."memberships" ("id", "workspace_id",
          "user_identity_id", "scope_mode", "status", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::uuid, 'workspace', 'active',
           CURRENT_TIMESTAMP)`,
        [ids.suspendedA1, ids.workspaceA, randomUUID()],
      );
      await refused(client, "23514", () =>
        insertAction(client, actors.managerA12, {
          branchId: ids.branchA1,
          assignee: ids.suspendedA1,
        }),
      );
    });
  });

  it("never lets the runtime role delete actions", async () => {
    await asActor(actors.ownerA, async (client) => {
      await refused(client, "42501", () =>
        client.query(`DELETE FROM "actions" WHERE "id" = $1::uuid`, [
          ids.actionA1,
        ]),
      );
    });
  });

  it("lets a lead next action be planned into the day", async () => {
    await asActor(actors.managerA1, async (client) => {
      const planned = await client.query(
        `UPDATE "enquiry_tasks" SET "planned_for" = '2026-10-16T09:00:00Z'
         WHERE "id" = $1::uuid`,
        [ids.taskA1],
      );
      expect(planned.rowCount).toBe(1);
    });
  });
});
