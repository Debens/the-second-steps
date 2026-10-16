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
  sourceA: randomUUID(),
  sourceB: randomUUID(),
  lostReasonA: randomUUID(),
  postponedReasonA: randomUUID(),
  enquiryA1: randomUUID(),
  enquiryA2: randomUUID(),
  enquiryB: randomUUID(),
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
  ownerB: {
    workspaceId: ids.workspaceB,
    membershipId: ids.membershipB,
    scope: "workspace",
  },
} satisfies Record<string, Actor>;

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
        ($1::uuid, 'enquiries-a', 'Enquiries A', 'agency', CURRENT_TIMESTAMP),
        ($2::uuid, 'enquiries-b', 'Enquiries B', 'agency', CURRENT_TIMESTAMP)`,
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
    const memberships: [string, string, string, string[] | null][] = [
      [ids.membershipAAll, ids.workspaceA, "workspace_owner", null],
      [ids.membershipA1, ids.workspaceA, "branch_manager", [ids.branchA1]],
      [ids.membershipA2, ids.workspaceA, "negotiator", [ids.branchA2]],
      [
        ids.membershipA12,
        ids.workspaceA,
        "branch_manager",
        [ids.branchA1, ids.branchA2],
      ],
      [ids.membershipB, ids.workspaceB, "workspace_owner", null],
    ];
    for (const [membershipId, workspaceId, role, branches] of memberships) {
      const identityId = randomUUID();
      await client.query(
        `INSERT INTO "user_identities" ("id", "updated_at")
         VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
        [identityId],
      );
      await client.query(
        `INSERT INTO "memberships"
          ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4::membership_scope_mode,
           CURRENT_TIMESTAMP)`,
        [
          membershipId,
          workspaceId,
          identityId,
          branches ? "named_branches" : "workspace",
        ],
      );
      await client.query(
        `INSERT INTO "membership_roles"
          ("workspace_id", "membership_id", "role_code")
         VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
        [workspaceId, membershipId, role],
      );
      for (const branchId of branches ?? []) {
        await client.query(
          `INSERT INTO "membership_branch_access"
            ("workspace_id", "membership_id", "branch_id")
           VALUES ($1::uuid, $2::uuid, $3::uuid)`,
          [workspaceId, membershipId, branchId],
        );
      }
    }
    for (const [contactId, workspaceId, branchId, membershipId, reference] of [
      [
        ids.personA1,
        ids.workspaceA,
        ids.branchA1,
        ids.membershipA1,
        "PER-EA111111",
      ],
      [
        ids.personA2,
        ids.workspaceA,
        ids.branchA2,
        ids.membershipA2,
        "PER-EA222222",
      ],
      [
        ids.personB,
        ids.workspaceB,
        ids.branchB,
        ids.membershipB,
        "PER-EB111111",
      ],
    ]) {
      await client.query(
        `INSERT INTO "contacts" (
          "id", "workspace_id", "kind", "reference", "first_name", "last_name",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, 'person', $3, 'Alex', 'Example',
          $4::uuid, CURRENT_TIMESTAMP)`,
        [contactId, workspaceId, reference, membershipId],
      );
      await client.query(
        `INSERT INTO "contact_branch_links" (
          "workspace_id", "contact_id", "branch_id", "is_primary",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, true, $4::uuid,
          CURRENT_TIMESTAMP)`,
        [workspaceId, contactId, branchId, membershipId],
      );
    }
    for (const [propertyId, branchId, reference] of [
      [ids.propertyA1, ids.branchA1, "PRP-EAAA2222"],
      [ids.propertyA2, ids.branchA2, "PRP-EBBB2222"],
    ]) {
      await client.query(
        `INSERT INTO "properties" (
          "id", "workspace_id", "reference", "responsible_branch_id",
          "address_street", "town_city", "postcode", "normalized_address_key",
          "property_type", "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, '1 Test Street', 'London',
          'SW1A 1AA', $3, 'flat', $5::uuid, CURRENT_TIMESTAMP)`,
        [propertyId, ids.workspaceA, reference, branchId, ids.membershipA1],
      );
    }
    await client.query(
      `INSERT INTO "lead_sources" ("id", "workspace_id", "name", "updated_at")
       VALUES ($1::uuid, $2::uuid, 'Rightmove', CURRENT_TIMESTAMP),
              ($3::uuid, $4::uuid, 'Rightmove', CURRENT_TIMESTAMP)`,
      [ids.sourceA, ids.workspaceA, ids.sourceB, ids.workspaceB],
    );
    await client.query(
      `INSERT INTO "enquiry_outcome_reasons"
        ("id", "workspace_id", "name", "applies_to", "updated_at")
       VALUES ($1::uuid, $3::uuid, 'Went with another agent', 'lost',
                CURRENT_TIMESTAMP),
              ($2::uuid, $3::uuid, 'Landlord not ready yet', 'postponed',
                CURRENT_TIMESTAMP)`,
      [ids.lostReasonA, ids.postponedReasonA, ids.workspaceA],
    );
    // Enquiries without linked records, so no protected counts change here.
    for (const [enquiryId, workspaceId, branchId, membershipId, reference] of [
      [
        ids.enquiryA1,
        ids.workspaceA,
        ids.branchA1,
        ids.membershipA1,
        "ENQ-AAAA2222",
      ],
      [
        ids.enquiryA2,
        ids.workspaceA,
        ids.branchA2,
        ids.membershipA2,
        "ENQ-BBBB2222",
      ],
      [
        ids.enquiryB,
        ids.workspaceB,
        ids.branchB,
        ids.membershipB,
        "ENQ-CCCC2222",
      ],
    ]) {
      await client.query(
        `INSERT INTO "landlord_enquiries" (
          "id", "workspace_id", "reference", "responsible_branch_id",
          "enquirer_name", "enquirer_telephone", "postcode",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, 'Pat Landlord',
          '07700 900111', 'SW1A 1AA', $5::uuid, CURRENT_TIMESTAMP)`,
        [enquiryId, workspaceId, reference, branchId, membershipId],
      );
    }
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

// Runs as the runtime role in a transaction that is rolled back unless the
// callback commits, so each test leaves the seed unchanged.
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

// Runs the callback and expects the database to refuse it, rolling back to a
// savepoint so the surrounding transaction can continue.
async function refused(
  client: PoolClient,
  code: string,
  callback: () => Promise<unknown>,
) {
  await client.query("SAVEPOINT attempt");
  await expect(callback()).rejects.toMatchObject({ code });
  await client.query("ROLLBACK TO SAVEPOINT attempt");
}

const insertEnquirySql = `INSERT INTO "landlord_enquiries" (
  "id", "workspace_id", "reference", "responsible_branch_id", "stage",
  "enquirer_name", "enquirer_email", "enquirer_telephone", "postcode",
  "contact_id", "property_id", "created_by_membership_id", "updated_at"
) VALUES ($1::uuid, $2::uuid, $3, $4::uuid, $5::enquiry_stage, 'Pat Landlord',
  $6, $7, $8, $9::uuid, $10::uuid, $11::uuid, CURRENT_TIMESTAMP)`;

function insertEnquiry(
  client: PoolClient,
  input: {
    id?: string;
    branchId?: string;
    stage?: string;
    email?: string | null;
    telephone?: string | null;
    postcode?: string | null;
    contactId?: string | null;
    propertyId?: string | null;
    membershipId?: string;
    reference?: string;
  } = {},
) {
  return client.query(insertEnquirySql, [
    input.id ?? randomUUID(),
    ids.workspaceA,
    input.reference ?? "ENQ-DDDD2222",
    input.branchId ?? ids.branchA1,
    input.stage ?? "new_enquiry",
    input.email === undefined ? null : input.email,
    input.telephone === undefined ? "07700 900222" : input.telephone,
    input.postcode === undefined ? "SW1A 1AA" : input.postcode,
    input.contactId ?? null,
    input.propertyId ?? null,
    input.membershipId ?? ids.membershipA1,
  ]);
}

function recordStage(
  client: PoolClient,
  input: {
    enquiryId: string;
    from: string;
    to: string;
    membershipId: string;
    reason?: string | null;
  },
) {
  return client.query(
    `INSERT INTO "enquiry_stage_history" (
      "workspace_id", "enquiry_id", "from_stage", "to_stage", "reason",
      "changed_by_membership_id"
    ) VALUES ($1::uuid, $2::uuid, $3::enquiry_stage, $4::enquiry_stage, $5,
      $6::uuid)`,
    [
      ids.workspaceA,
      input.enquiryId,
      input.from,
      input.to,
      input.reason ?? null,
      input.membershipId,
    ],
  );
}

function setStage(
  client: PoolClient,
  enquiryId: string,
  stage: string,
  outcomeReasonId: string | null = null,
) {
  return client.query(
    `UPDATE "landlord_enquiries"
     SET "stage" = $2::enquiry_stage, "outcome_reason_id" = $3::uuid,
       "updated_at" = CURRENT_TIMESTAMP
     WHERE "id" = $1::uuid`,
    [enquiryId, stage, outcomeReasonId],
  );
}

async function linkedCount(table: "contacts" | "properties", id: string) {
  const result = await adminPool.query<{ n: number }>(
    `SELECT "current_open_enquiry_count" AS n FROM "${table}"
     WHERE "id" = $1::uuid`,
    [id],
  );
  return result.rows[0].n;
}

async function visibleIds(client: PoolClient, table: string) {
  const result = await client.query<{ id: string }>(
    `SELECT "id" FROM "${table}" ORDER BY "id"`,
  );
  return result.rows.map(({ id }) => id);
}

beforeEach(seedFoundation);

afterAll(async () => {
  await runtimePool.end();
  await adminPool.end();
});

describe("enquiry database security", () => {
  it("shows nothing without a verified workspace context", async () => {
    for (const table of [
      "landlord_enquiries",
      "lead_sources",
      "enquiry_outcome_reasons",
    ]) {
      const result = await runtimePool.query(`SELECT "id" FROM "${table}"`);
      expect(result.rows, table).toHaveLength(0);
    }
  });

  it("limits named-branch users to enquiries in their branches", async () => {
    await asActor(actors.managerA1, async (client) => {
      expect(await visibleIds(client, "landlord_enquiries")).toEqual([
        ids.enquiryA1,
      ]);
    });
    await asActor(actors.ownerAAll, async (client) => {
      expect((await visibleIds(client, "landlord_enquiries")).sort()).toEqual(
        [ids.enquiryA1, ids.enquiryA2].sort(),
      );
    });
    await asActor(actors.ownerB, async (client) => {
      expect(await visibleIds(client, "landlord_enquiries")).toEqual([
        ids.enquiryB,
      ]);
    });
  });

  it("shares the agency's lists with every member, and only that agency", async () => {
    await asActor(actors.negotiatorA2, async (client) => {
      expect(await visibleIds(client, "lead_sources")).toEqual([ids.sourceA]);
      expect(
        (await visibleIds(client, "enquiry_outcome_reasons")).sort(),
      ).toEqual([ids.lostReasonA, ids.postponedReasonA].sort());
    });
    await asActor(actors.ownerB, async (client) => {
      expect(await visibleIds(client, "lead_sources")).toEqual([ids.sourceB]);
      await refused(client, "42501", () =>
        client.query(
          `INSERT INTO "lead_sources" ("workspace_id", "name", "updated_at")
           VALUES ($1::uuid, 'Sneaky', CURRENT_TIMESTAMP)`,
          [ids.workspaceA],
        ),
      );
    });
  });

  it("keeps list names unique within an agency, ignoring case and spaces", async () => {
    await asActor(actors.ownerAAll, async (client) => {
      await refused(client, "23505", () =>
        client.query(
          `INSERT INTO "lead_sources" ("workspace_id", "name", "updated_at")
           VALUES ($1::uuid, '  rightmove ', CURRENT_TIMESTAMP)`,
          [ids.workspaceA],
        ),
      );
    });
  });

  it("only creates new enquiries, in the actor's branch, as the actor", async () => {
    await asActor(actors.managerA1, async (client) => {
      await refused(client, "42501", () =>
        insertEnquiry(client, { stage: "appraisal_booked" }),
      );
      await refused(client, "42501", () =>
        insertEnquiry(client, { branchId: ids.branchA2 }),
      );
      await refused(client, "42501", () =>
        insertEnquiry(client, { membershipId: ids.membershipA2 }),
      );
      await insertEnquiry(client);
    });
  });

  it("never links an enquiry to a contact or property the actor cannot see", async () => {
    await asActor(actors.managerA1, async (client) => {
      await refused(client, "42501", () =>
        insertEnquiry(client, { contactId: ids.personA2 }),
      );
      await refused(client, "42501", () =>
        insertEnquiry(client, { propertyId: ids.propertyA2 }),
      );
    });
  });

  it("requires a way to reach the enquirer and a valid postcode", async () => {
    await asActor(actors.managerA1, async (client) => {
      await refused(client, "23514", () =>
        insertEnquiry(client, { email: null, telephone: null }),
      );
      await refused(client, "23514", () =>
        insertEnquiry(client, { postcode: "sw1a1aa" }),
      );
      await refused(client, "23514", () =>
        insertEnquiry(client, { postcode: null }),
      );
    });
  });

  it("rejects cross-agency links", async () => {
    await expect(
      adminPool.query(
        `UPDATE "landlord_enquiries" SET "lead_source_id" = $2::uuid
         WHERE "id" = $1::uuid`,
        [ids.enquiryA1, ids.sourceB],
      ),
    ).rejects.toMatchObject({ code: "23503" });
  });

  describe("stage changes", () => {
    it("needs a matching history row by the same actor in the same transaction", async () => {
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "23514", () =>
          setStage(client, ids.enquiryA1, "lost", ids.lostReasonA),
        );
        await recordStage(client, {
          enquiryId: ids.enquiryA1,
          from: "new_enquiry",
          to: "lost",
          reason: "Chose another agent",
          membershipId: ids.membershipA1,
        });
        await setStage(client, ids.enquiryA1, "lost", ids.lostReasonA);
        const row = await client.query(
          `SELECT "stage", "stage_changed_at" = transaction_timestamp() AS fresh
           FROM "landlord_enquiries" WHERE "id" = $1::uuid`,
          [ids.enquiryA1],
        );
        expect(row.rows).toEqual([{ stage: "lost", fresh: true }]);
      });
    });

    it("allows one history row per enquiry per transaction", async () => {
      await asActor(actors.managerA1, async (client) => {
        await recordStage(client, {
          enquiryId: ids.enquiryA1,
          from: "new_enquiry",
          to: "lost",
          reason: "Gone",
          membershipId: ids.membershipA1,
        });
        await setStage(client, ids.enquiryA1, "lost", ids.lostReasonA);
        await refused(client, "23505", () =>
          recordStage(client, {
            enquiryId: ids.enquiryA1,
            from: "lost",
            to: "postponed",
            reason: "Phantom",
            membershipId: ids.membershipA1,
          }),
        );
      });
    });

    it("only records a change from the current stage, by the actor", async () => {
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "42501", () =>
          recordStage(client, {
            enquiryId: ids.enquiryA1,
            from: "appraisal_booked",
            to: "appraisal_completed",
            membershipId: ids.membershipA1,
          }),
        );
        await refused(client, "42501", () =>
          recordStage(client, {
            enquiryId: ids.enquiryA1,
            from: "new_enquiry",
            to: "lost",
            reason: "Gone",
            membershipId: ids.membershipAAll,
          }),
        );
      });
    });

    it("refuses at commit a history row whose change never happened", async () => {
      await asActor(actors.managerA1, async (client) => {
        await recordStage(client, {
          enquiryId: ids.enquiryA1,
          from: "new_enquiry",
          to: "lost",
          reason: "Never applied",
          membershipId: ids.membershipA1,
        });
        await expect(client.query("COMMIT")).rejects.toMatchObject({
          code: "23514",
        });
      });
    });

    it("cannot be fooled by a temporary history table", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query(
          `CREATE TEMP TABLE "enquiry_stage_history"
           (LIKE public."enquiry_stage_history" INCLUDING DEFAULTS)`,
        );
        await client.query(
          `INSERT INTO pg_temp."enquiry_stage_history" (
            "workspace_id", "enquiry_id", "from_stage", "to_stage",
            "reason", "changed_by_membership_id"
          ) VALUES ($1::uuid, $2::uuid, 'new_enquiry', 'lost', 'Fake',
            $3::uuid)`,
          [ids.workspaceA, ids.enquiryA1, ids.membershipA1],
        );
        await refused(client, "23514", () =>
          setStage(client, ids.enquiryA1, "lost", ids.lostReasonA),
        );
      });
    });

    it("requires a reason to close an enquiry or move it backwards", async () => {
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "23514", () =>
          recordStage(client, {
            enquiryId: ids.enquiryA1,
            from: "new_enquiry",
            to: "postponed",
            membershipId: ids.membershipA1,
          }),
        );
      });
    });

    it("requires the real contact and property from appraisal booking onwards", async () => {
      await asActor(actors.managerA1, async (client) => {
        await recordStage(client, {
          enquiryId: ids.enquiryA1,
          from: "new_enquiry",
          to: "appraisal_booked",
          membershipId: ids.membershipA1,
        });
        await refused(client, "23514", () =>
          setStage(client, ids.enquiryA1, "appraisal_booked"),
        );
      });
    });

    it("only accepts an outcome reason meant for that outcome", async () => {
      await asActor(actors.managerA1, async (client) => {
        await recordStage(client, {
          enquiryId: ids.enquiryA1,
          from: "new_enquiry",
          to: "lost",
          reason: "Gone",
          membershipId: ids.membershipA1,
        });
        await refused(client, "23514", () =>
          setStage(client, ids.enquiryA1, "lost", ids.postponedReasonA),
        );
        await refused(client, "23514", () =>
          setStage(client, ids.enquiryA1, "lost", null),
        );
      });
    });

    it("never swaps a linked contact or property for another", async () => {
      await asActor(actors.managerA12, async (client) => {
        const enquiryId = randomUUID();
        await insertEnquiry(client, {
          id: enquiryId,
          contactId: ids.personA1,
          propertyId: ids.propertyA1,
          membershipId: ids.membershipA12,
        });
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "landlord_enquiries" SET "contact_id" = $2::uuid
             WHERE "id" = $1::uuid`,
            [enquiryId, ids.personA2],
          ),
        );
      });
    });
  });

  describe("records with an open enquiry", () => {
    async function openLinkedEnquiry() {
      // Shared with Branch A2 so an A2 user can see the contact but not the
      // A1 enquiry or property.
      const client = await adminPool.connect();
      const enquiryId = randomUUID();
      try {
        await client.query("BEGIN");
        await setContext(client, actors.ownerAAll);
        await client.query(
          `INSERT INTO "contact_branch_links" (
            "workspace_id", "contact_id", "branch_id", "is_primary",
            "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, $3::uuid, false, $4::uuid,
            CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.personA1, ids.branchA2, ids.membershipA1],
        );
        await insertEnquiry(client, {
          id: enquiryId,
          contactId: ids.personA1,
          propertyId: ids.propertyA1,
          membershipId: ids.membershipAAll,
        });
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
      return enquiryId;
    }

    it("counts the open enquiry on the contact and the property", async () => {
      await openLinkedEnquiry();
      expect(await linkedCount("contacts", ids.personA1)).toBe(1);
      expect(await linkedCount("properties", ids.propertyA1)).toBe(1);
    });

    it("refuses to archive them, even for a user who cannot see the enquiry", async () => {
      await openLinkedEnquiry();
      await asActor(actors.negotiatorA2, async (client) => {
        expect(await visibleIds(client, "landlord_enquiries")).toEqual([
          ids.enquiryA2,
        ]);
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "contacts" SET "status" = 'archived',
              "archived_at" = CURRENT_TIMESTAMP WHERE "id" = $1::uuid`,
            [ids.personA1],
          ),
        );
      });
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "properties" SET "status" = 'archived',
              "archived_at" = CURRENT_TIMESTAMP WHERE "id" = $1::uuid`,
            [ids.propertyA1],
          ),
        );
      });
    });

    it("releases them when the enquiry closes and counts them again on reopening", async () => {
      const enquiryId = await openLinkedEnquiry();
      const client = await runtimePool.connect();
      try {
        await client.query("BEGIN");
        await setContext(client, actors.managerA1);
        await recordStage(client, {
          enquiryId,
          from: "new_enquiry",
          to: "lost",
          reason: "Chose another agent",
          membershipId: ids.membershipA1,
        });
        await setStage(client, enquiryId, "lost", ids.lostReasonA);
        await client.query("COMMIT");
      } finally {
        client.release();
      }
      expect(await linkedCount("contacts", ids.personA1)).toBe(0);
      expect(await linkedCount("properties", ids.propertyA1)).toBe(0);

      await asActor(actors.managerA1, async (inner) => {
        await recordStage(inner, {
          enquiryId,
          from: "lost",
          to: "new_enquiry",
          reason: "Landlord came back",
          membershipId: ids.membershipA1,
        });
        await setStage(inner, enquiryId, "new_enquiry");
        const counts = await inner.query(
          `SELECT
             (SELECT "current_open_enquiry_count" FROM "contacts"
              WHERE "id" = $1::uuid) AS contact_count,
             (SELECT "current_open_enquiry_count" FROM "properties"
              WHERE "id" = $2::uuid) AS property_count`,
          [ids.personA1, ids.propertyA1],
        );
        expect(counts.rows).toEqual([{ contact_count: 1, property_count: 1 }]);
      });
    });

    it("never lets the application write the counts directly", async () => {
      await asActor(actors.ownerAAll, async (client) => {
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "contacts" SET "current_open_enquiry_count" = 3
             WHERE "id" = $1::uuid`,
            [ids.personA1],
          ),
        );
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "properties" SET "current_open_enquiry_count" = 3
             WHERE "id" = $1::uuid`,
            [ids.propertyA1],
          ),
        );
      });
    });

    it("cannot change the counts from a temporary trigger function", async () => {
      await asActor(actors.managerA1, async (client) => {
        await client.query(`CREATE TEMP TABLE "bump_log" ("x" integer)`);
        await client.query(
          `CREATE FUNCTION pg_temp.bump() RETURNS trigger
           LANGUAGE plpgsql AS $$
           BEGIN
             UPDATE public."properties"
             SET "current_open_enquiry_count" = 9
             WHERE "id" = '${ids.propertyA1}'::uuid;
             RETURN NEW;
           END $$`,
        );
        await client.query(
          `CREATE TRIGGER "bump_trigger" BEFORE INSERT ON "bump_log"
           FOR EACH ROW EXECUTE FUNCTION pg_temp.bump()`,
        );
        await refused(client, "23514", () =>
          client.query(`INSERT INTO "bump_log" ("x") VALUES (1)`),
        );
      });
    });
  });

  describe("appraisals", () => {
    function bookAppraisal(
      client: PoolClient,
      enquiryId: string,
      extra: {
        status?: string;
        feeKind?: string | null;
        feeValue?: number | null;
      } = {},
    ) {
      return client.query<{ id: string }>(
        `INSERT INTO "appraisals" (
          "workspace_id", "enquiry_id", "scheduled_at", "assigned_membership_id",
          "status", "fee_kind", "fee_value", "fee_vat",
          "created_by_membership_id", "updated_at"
        ) VALUES ($1::uuid, $2::uuid, CURRENT_TIMESTAMP + interval '1 day',
          $3::uuid, $4::appraisal_status, $5::fee_kind, $6,
          CASE WHEN $5 IS NULL THEN NULL ELSE 'exclusive'::vat_treatment END,
          $3::uuid, CURRENT_TIMESTAMP)
        RETURNING "id"`,
        [
          ids.workspaceA,
          enquiryId,
          ids.membershipA1,
          extra.status ?? "scheduled",
          extra.feeKind ?? null,
          extra.feeValue ?? null,
        ],
      );
    }

    it("only books scheduled appraisals on visible enquiries, one at a time", async () => {
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "42501", () =>
          bookAppraisal(client, ids.enquiryA2),
        );
        await refused(client, "42501", () =>
          bookAppraisal(client, ids.enquiryA1, { status: "completed" }),
        );
        await bookAppraisal(client, ids.enquiryA1);
        await refused(client, "23505", () =>
          bookAppraisal(client, ids.enquiryA1),
        );
      });
    });

    it("checks fee values and keeps a finished appraisal final", async () => {
      await asActor(actors.managerA1, async (client) => {
        await refused(client, "23514", () =>
          bookAppraisal(client, ids.enquiryA1, {
            feeKind: "percentage",
            feeValue: 20000,
          }),
        );
        const booked = await bookAppraisal(client, ids.enquiryA1, {
          feeKind: "percentage",
          feeValue: 1200,
        });
        const appraisalId = booked.rows[0].id;
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "appraisals" SET "status" = 'completed' WHERE "id" = $1::uuid`,
            [appraisalId],
          ),
        );
        await client.query(
          `UPDATE "appraisals" SET "status" = 'cancelled' WHERE "id" = $1::uuid`,
          [appraisalId],
        );
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "appraisals" SET "notes" = 'Changed' WHERE "id" = $1::uuid`,
            [appraisalId],
          ),
        );
      });
    });

    it("hides appraisals of enquiries in other branches", async () => {
      // Branch A2 books an appraisal on its own enquiry and saves it.
      await asActor(actors.negotiatorA2, async (client) => {
        await client.query(
          `INSERT INTO "appraisals" (
            "workspace_id", "enquiry_id", "scheduled_at",
            "assigned_membership_id", "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, CURRENT_TIMESTAMP, $3::uuid, $3::uuid,
            CURRENT_TIMESTAMP)`,
          [ids.workspaceA, ids.enquiryA2, ids.membershipA2],
        );
        await client.query("COMMIT");
      });
      await asActor(actors.managerA1, async (client) => {
        expect(await visibleIds(client, "appraisals")).toEqual([]);
      });
      await asActor(actors.ownerAAll, async (client) => {
        expect(await visibleIds(client, "appraisals")).toHaveLength(1);
      });
    });
  });

  describe("next actions", () => {
    function addTask(
      client: PoolClient,
      input: {
        enquiryId: string;
        appraisalId?: string | null;
        status?: string;
      },
    ) {
      return client.query<{ id: string }>(
        `INSERT INTO "enquiry_tasks" (
          "workspace_id", "enquiry_id", "appraisal_id", "title", "due_on",
          "assigned_membership_id", "status", "created_by_membership_id",
          "updated_at"
        ) VALUES ($1::uuid, $2::uuid, $3::uuid, 'Call back', CURRENT_DATE,
          $4::uuid, $5::enquiry_task_status, $4::uuid, CURRENT_TIMESTAMP)
        RETURNING "id"`,
        [
          ids.workspaceA,
          input.enquiryId,
          input.appraisalId ?? null,
          ids.membershipA12,
          input.status ?? "open",
        ],
      );
    }

    it("ties an appraisal task to an appraisal of the same enquiry", async () => {
      await asActor(actors.managerA12, async (client) => {
        const appraisal = await client.query<{ id: string }>(
          `INSERT INTO "appraisals" (
            "workspace_id", "enquiry_id", "scheduled_at",
            "assigned_membership_id", "created_by_membership_id", "updated_at"
          ) VALUES ($1::uuid, $2::uuid, CURRENT_TIMESTAMP, $3::uuid, $3::uuid,
            CURRENT_TIMESTAMP) RETURNING "id"`,
          [ids.workspaceA, ids.enquiryA2, ids.membershipA12],
        );
        await refused(client, "23503", () =>
          addTask(client, {
            enquiryId: ids.enquiryA1,
            appraisalId: appraisal.rows[0].id,
          }),
        );
        await addTask(client, {
          enquiryId: ids.enquiryA2,
          appraisalId: appraisal.rows[0].id,
        });
      });
    });

    it("starts tasks open, records who closed them, and keeps them closed", async () => {
      await asActor(actors.managerA12, async (client) => {
        await refused(client, "42501", () =>
          addTask(client, { enquiryId: ids.enquiryA1, status: "done" }),
        );
        const task = await addTask(client, { enquiryId: ids.enquiryA1 });
        const taskId = task.rows[0].id;
        await refused(client, "42501", () =>
          client.query(
            `UPDATE "enquiry_tasks" SET "status" = 'done',
              "closed_at" = CURRENT_TIMESTAMP, "closed_by_membership_id" = $2::uuid
             WHERE "id" = $1::uuid`,
            [taskId, ids.membershipAAll],
          ),
        );
        await client.query(
          `UPDATE "enquiry_tasks" SET "status" = 'done',
            "closed_at" = CURRENT_TIMESTAMP, "closed_by_membership_id" = $2::uuid
           WHERE "id" = $1::uuid`,
          [taskId, ids.membershipA12],
        );
        await refused(client, "23514", () =>
          client.query(
            `UPDATE "enquiry_tasks" SET "title" = 'Changed' WHERE "id" = $1::uuid`,
            [taskId],
          ),
        );
      });
    });
  });

  it("prevents the runtime role from deleting or rewriting history", async () => {
    for (const table of [
      "lead_sources",
      "enquiry_outcome_reasons",
      "landlord_enquiries",
      "enquiry_stage_history",
      "appraisals",
      "enquiry_tasks",
    ]) {
      await asActor(actors.ownerAAll, async (client) => {
        await expect(
          client.query(`DELETE FROM "${table}"`),
        ).rejects.toMatchObject({ code: "42501" });
      });
    }
    await asActor(actors.ownerAAll, async (client) => {
      await expect(
        client.query(`UPDATE "enquiry_stage_history" SET "reason" = 'x'`),
      ).rejects.toMatchObject({ code: "42501" });
    });
  });
});
