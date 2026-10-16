import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  archiveContact,
  createContact,
} from "@/core/contacts/application/contacts";
import {
  addPropertyNote,
  editPropertyNote,
  listPropertyNotes,
  voidPropertyNote,
} from "@/core/properties/application/property-notes";
import {
  archiveProperty,
  createProperty,
  findDuplicateProperties,
  getProperty,
  listProperties,
  listPropertiesForContact,
  reactivateProperty,
  updateProperty,
} from "@/core/properties/application/properties";
import {
  addPropertyOwner,
  endPropertyOwnership,
  setPropertyLeadOwner,
  transferPropertyBranch,
} from "@/core/properties/application/property-ownership";
import type { PropertyDetailsInput } from "@/core/properties/domain/property";
import { db } from "@/core/db/client";

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

const adminPool = new Pool({ connectionString: adminUrl, ssl: false });
const workspaceSlug = "property-app";

const ids = {
  workspace: randomUUID(),
  branchA: randomUUID(),
  branchB: randomUUID(),
};

type RoleName = "branch_manager" | "negotiator" | "accounts";
const users = {
  managerA: { role: "branch_manager", branches: ["branchA"] },
  managerAB: { role: "branch_manager", branches: ["branchA", "branchB"] },
  negotiatorA: { role: "negotiator", branches: ["branchA"] },
  negotiatorB: { role: "negotiator", branches: ["branchB"] },
  accountsA: { role: "accounts", branches: ["branchA"] },
} as const satisfies Record<
  string,
  { role: RoleName; branches: readonly ("branchA" | "branchB")[] }
>;
type UserName = keyof typeof users;

const auth = Object.fromEntries(
  Object.keys(users).map((name) => [name, randomUUID()]),
) as Record<UserName, string>;

async function addUser(client: PoolClient, name: UserName) {
  const identityId = randomUUID();
  const membershipId = randomUUID();
  await client.query(
    `INSERT INTO "user_identities" ("id", "updated_at")
     VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
    [identityId],
  );
  await client.query(
    `INSERT INTO "authentication_provider_links"
      ("user_identity_id", "provider", "provider_subject")
     VALUES ($1::uuid, 'supabase', $2::uuid)`,
    [identityId, auth[name]],
  );
  await client.query(
    `INSERT INTO "memberships"
      ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'named_branches', CURRENT_TIMESTAMP)`,
    [membershipId, ids.workspace, identityId],
  );
  await client.query(
    `INSERT INTO "membership_roles"
      ("workspace_id", "membership_id", "role_code")
     VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
    [ids.workspace, membershipId, users[name].role],
  );
  for (const branch of users[name].branches) {
    await client.query(
      `INSERT INTO "membership_branch_access"
        ("workspace_id", "membership_id", "branch_id")
       VALUES ($1::uuid, $2::uuid, $3::uuid)`,
      [ids.workspace, membershipId, ids[branch]],
    );
  }
}

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
       VALUES ($1::uuid, $2, 'Property App', 'agency', CURRENT_TIMESTAMP)`,
      [ids.workspace, workspaceSlug],
    );
    await client.query(
      `INSERT INTO "branches" ("id", "workspace_id", "name", "updated_at")
       VALUES
        ($1::uuid, $3::uuid, 'Branch A', CURRENT_TIMESTAMP),
        ($2::uuid, $3::uuid, 'Branch B', CURRENT_TIMESTAMP)`,
      [ids.branchA, ids.branchB, ids.workspace],
    );
    // A workspace must always have an active Account Owner.
    const ownerIdentity = randomUUID();
    const ownerMembership = randomUUID();
    await client.query(
      `INSERT INTO "user_identities" ("id", "updated_at")
       VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
      [ownerIdentity],
    );
    await client.query(
      `INSERT INTO "memberships"
        ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'workspace', CURRENT_TIMESTAMP)`,
      [ownerMembership, ids.workspace, ownerIdentity],
    );
    await client.query(
      `INSERT INTO "membership_roles"
        ("workspace_id", "membership_id", "role_code")
       VALUES ($1::uuid, $2::uuid, 'workspace_owner')`,
      [ids.workspace, ownerMembership],
    );
    for (const name of Object.keys(users) as UserName[]) {
      await addUser(client, name);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const communication = {
  preferred: null,
  doNotEmail: false,
  doNotTelephone: false,
  doNotSms: false,
  doNotWhatsApp: false,
  doNotPost: false,
};

async function createPerson(lastName = "Owner", branchId = ids.branchA) {
  const result = await createContact({
    authSubject: auth.managerAB,
    workspaceSlug,
    branchId,
    kind: "person",
    details: {
      title: "",
      firstName: "Olivia",
      middleNames: "",
      lastName,
      preferredName: "",
    },
    communication,
    contactPoints: [],
    addresses: [],
  });
  if (!result.ok) throw new Error(`Contact creation failed: ${result.error}`);
  return result.contactId;
}

const details: PropertyDetailsInput = {
  addressBuilding: "Flat 2",
  addressStreet: "10 High Street",
  addressLocality: "",
  townCity: "London",
  county: "",
  postcode: "sw1a1aa",
  propertyType: "flat",
  bedrooms: 2,
  bathrooms: 1,
  receptionRooms: null,
  floorArea: null,
  floorAreaUnit: null,
  furnishedStatus: null,
  features: [],
  parkingNotes: "",
  outdoorSpaceNotes: "",
  councilTaxBand: null,
  generalNotes: "",
};

const as = (name: UserName) => ({
  authSubject: auth[name],
  workspaceSlug,
});

async function makeProperty(
  options: {
    by?: UserName;
    branchId?: string;
    overrides?: Partial<PropertyDetailsInput>;
    owners?: Parameters<typeof createProperty>[0]["owners"];
  } = {},
) {
  const result = await createProperty({
    ...as(options.by ?? "managerA"),
    branchId: options.branchId ?? ids.branchA,
    details: { ...details, ...options.overrides },
    owners: options.owners ?? [],
  });
  if (!result.ok) throw new Error(`Property creation failed: ${result.error}`);
  return result.propertyId;
}

async function count(sql: string, params: unknown[] = []) {
  const result = await adminPool.query<{ n: string }>(sql, params);
  return Number(result.rows[0].n);
}

beforeEach(seed);
afterAll(async () => {
  await db.$disconnect();
  await adminPool.end();
});

describe("property application layer", () => {
  it("creates an audited property with a lead owner who becomes visible to its branch", async () => {
    const contactId = await createPerson();
    const propertyId = await makeProperty({
      owners: [{ contactId, isLead: true, startedOn: "2020-05-01" }],
    });

    const property = await getProperty({ ...as("negotiatorA"), propertyId });
    expect(property).toMatchObject({
      archived: false,
      responsibleBranch: { id: ids.branchA },
      details: { postcode: "SW1A 1AA", propertyType: "flat", bedrooms: 2 },
      ownerships: [{ contactId, isLead: true, name: "Olivia Owner" }],
      can: { update: true, archive: false, manageOwners: false },
    });
    expect(property?.reference).toMatch(/^PRP-/);

    // Owners are counted so a current owner cannot be archived by mistake.
    expect(
      await count(
        `SELECT "current_property_ownership_count" AS n FROM "contacts"
         WHERE "id" = $1`,
        [contactId],
      ),
    ).toBe(1);

    const audit = await adminPool.query(
      `SELECT "action", "target_type", "metadata"::text AS metadata
       FROM "audit_events" WHERE "target_id" = $1 ORDER BY "created_at"`,
      [propertyId],
    );
    expect(audit.rows.map((row) => row.action)).toEqual([
      "property.ownership.add",
      "property.create",
    ]);
    expect(audit.rows.every((row) => row.target_type === "property")).toBe(
      true,
    );
    expect(JSON.stringify(audit.rows)).not.toContain("High Street");
  });

  it("stores every characteristic exactly as chosen", async () => {
    const propertyId = await makeProperty({
      overrides: {
        propertyType: "semi_detached",
        bathrooms: 2,
        receptionRooms: 1,
        floorArea: 950,
        floorAreaUnit: "sq_ft",
        furnishedStatus: "part_furnished",
        features: ["ev_charging", "private_garden", "en_suite"],
        parkingNotes: "Two spaces",
        councilTaxBand: "D",
      },
    });
    const property = await getProperty({ ...as("managerA"), propertyId });
    expect(property?.details).toMatchObject({
      propertyType: "semi_detached",
      floorArea: 950,
      floorAreaUnit: "sq_ft",
      furnishedStatus: "part_furnished",
      councilTaxBand: "D",
      parkingNotes: "Two spaces",
    });
    expect([...(property?.details.features ?? [])].sort()).toEqual(
      ["ev_charging", "en_suite", "private_garden"].sort(),
    );
  });

  it("creates a new owner in place within the property's branch", async () => {
    const propertyId = await makeProperty({
      owners: [
        {
          isLead: true,
          startedOn: "",
          newContact: {
            kind: "organisation",
            branchId: ids.branchB, // overridden by the property's branch
            details: {
              type: "limited_company",
              legalName: "Estate Holdings Limited",
              tradingName: "",
              registrationNumber: "",
              vatNumber: "",
            },
            communication,
            contactPoints: [],
            addresses: [],
          },
        },
      ],
    });
    const property = await getProperty({ ...as("negotiatorA"), propertyId });
    expect(property?.ownerships).toMatchObject([
      { name: "Estate Holdings Limited", contactKind: "organisation" },
    ]);
    // The new owner is visible in the property's branch, not the other one.
    expect(
      await count(
        `SELECT count(*) AS n FROM "contact_branch_links"
         WHERE "branch_id" = $1 AND "ended_at" IS NULL`,
        [ids.branchB],
      ),
    ).toBe(0);
  });

  it("undoes the whole property when an owner cannot be recorded", async () => {
    const contactId = await createPerson();
    const result = await createProperty({
      ...as("managerA"),
      branchId: ids.branchA,
      details,
      owners: [
        { contactId, isLead: true, startedOn: "" },
        { contactId: randomUUID(), isLead: false, startedOn: "" },
      ],
    });
    expect(result).toEqual({ ok: false, error: "contact_not_found" });
    expect(await count(`SELECT count(*) AS n FROM "properties"`)).toBe(0);
    expect(await count(`SELECT count(*) AS n FROM "property_ownerships"`)).toBe(
      0,
    );
  });

  it("does not let someone record an owner they cannot see", async () => {
    const hiddenContact = await createPerson("Hidden", ids.branchA);
    const result = await createProperty({
      ...as("negotiatorB"),
      branchId: ids.branchB,
      details,
      owners: [{ contactId: hiddenContact, isLead: true, startedOn: "" }],
    });
    expect(result).toEqual({ ok: false, error: "contact_not_found" });
    expect(await count(`SELECT count(*) AS n FROM "properties"`)).toBe(0);
  });

  it("rejects invalid details, other branches and users who cannot create", async () => {
    await expect(
      createProperty({
        ...as("managerA"),
        branchId: ids.branchA,
        details: { ...details, postcode: "not a postcode" },
        owners: [],
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
    await expect(
      createProperty({
        ...as("negotiatorA"),
        branchId: ids.branchB,
        details,
        owners: [],
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      createProperty({
        ...as("accountsA"),
        branchId: ids.branchA,
        details,
        owners: [],
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      createProperty({
        authSubject: randomUUID(),
        workspaceSlug,
        branchId: ids.branchA,
        details,
        owners: [],
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    expect(await count(`SELECT count(*) AS n FROM "properties"`)).toBe(0);
  });

  it("finds properties by address, postcode, reference and owner name within scope", async () => {
    const contactId = await createPerson("Rutherford");
    const propertyId = await makeProperty({
      owners: [{ contactId, isLead: true, startedOn: "" }],
    });
    const reference = (await getProperty({ ...as("managerA"), propertyId }))!
      .reference;

    for (const query of [
      "high street",
      "SW1A1AA",
      "sw1a 1aa",
      reference.toLowerCase(),
      "Rutherford",
    ]) {
      const found = await listProperties({ ...as("negotiatorA"), query });
      expect(
        found.map((p) => p.id),
        query,
      ).toEqual([propertyId]);
    }
    const [item] = await listProperties(as("negotiatorA"));
    expect(item).toMatchObject({
      leadLandlord: { contactId, name: "Olivia Rutherford" },
      branchName: "Branch A",
      propertyType: "flat",
    });

    await expect(listProperties(as("negotiatorB"))).resolves.toEqual([]);
    await expect(
      getProperty({ ...as("negotiatorB"), propertyId }),
    ).resolves.toBeNull();
  });

  it("warns about duplicate addresses, strongest first, only among visible properties", async () => {
    const same = await makeProperty();
    const otherFlat = await makeProperty({
      overrides: { addressBuilding: "Flat 3" },
    });
    await makeProperty({ overrides: { addressStreet: "12 High Street" } });

    const query = {
      building: "FLAT 2",
      street: "10 high street",
      postcode: "SW1A 1AA",
    };
    const found = await findDuplicateProperties({
      ...as("negotiatorA"),
      ...query,
    });
    expect(found.map(({ id, strength }) => [id, strength])).toEqual([
      [same, "strong"],
      [otherFlat, "possible"],
    ]);
    await expect(
      findDuplicateProperties({ ...as("negotiatorB"), ...query }),
    ).resolves.toEqual([]);
    await expect(
      findDuplicateProperties({
        ...as("negotiatorA"),
        ...query,
        excludePropertyId: same,
      }),
    ).resolves.toHaveLength(1);
  });

  it("updates details for permitted users, recording only which fields changed", async () => {
    const propertyId = await makeProperty();
    await expect(
      updateProperty({
        ...as("accountsA"),
        propertyId,
        details: { ...details, bedrooms: 3, generalNotes: "Tenant moving out" },
      }),
    ).resolves.toEqual({ ok: true, propertyId });

    const property = await getProperty({ ...as("managerA"), propertyId });
    expect(property?.details).toMatchObject({
      bedrooms: 3,
      generalNotes: "Tenant moving out",
    });
    const audit = await adminPool.query(
      `SELECT "metadata"::text AS metadata FROM "audit_events"
       WHERE "action" = 'property.update'`,
    );
    expect(JSON.parse(audit.rows[0].metadata)).toEqual({
      changedFields: ["bedrooms", "generalNotes"],
    });

    await expect(
      updateProperty({
        ...as("negotiatorB"),
        propertyId,
        details,
      }),
    ).resolves.toEqual({ ok: false, error: "property_not_found" });
    await expect(
      updateProperty({
        ...as("managerA"),
        propertyId,
        details: { ...details, townCity: "" },
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
  });

  it("lets only managers archive, and blocks edits while archived", async () => {
    const propertyId = await makeProperty();
    await expect(
      archiveProperty({ ...as("negotiatorA"), propertyId }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      archiveProperty({ ...as("managerA"), propertyId }),
    ).resolves.toEqual({ ok: true, propertyId });
    await expect(
      archiveProperty({ ...as("managerA"), propertyId }),
    ).resolves.toEqual({ ok: false, error: "invalid_state" });
    await expect(
      updateProperty({ ...as("managerA"), propertyId, details }),
    ).resolves.toEqual({ ok: false, error: "invalid_state" });

    await expect(listProperties(as("managerA"))).resolves.toEqual([]);
    const archivedList = await listProperties({
      ...as("managerA"),
      includeArchived: true,
    });
    expect(archivedList.map(({ archived }) => archived)).toEqual([true]);

    await expect(
      reactivateProperty({ ...as("managerA"), propertyId }),
    ).resolves.toEqual({ ok: true, propertyId });
  });

  describe("owners", () => {
    it("lets only managers add owners and moves the lead marker", async () => {
      const first = await createPerson("First");
      const second = await createPerson("Second");
      const propertyId = await makeProperty({
        owners: [{ contactId: first, isLead: true, startedOn: "" }],
      });

      await expect(
        addPropertyOwner({
          ...as("negotiatorA"),
          propertyId,
          owner: { contactId: second, isLead: false, startedOn: "" },
        }),
      ).resolves.toEqual({ ok: false, error: "access_denied" });
      await expect(
        addPropertyOwner({
          ...as("managerA"),
          propertyId,
          owner: { contactId: first, isLead: false, startedOn: "" },
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_state" });
      await expect(
        addPropertyOwner({
          ...as("managerA"),
          propertyId,
          owner: { contactId: second, isLead: true, startedOn: "2021-01-01" },
        }),
      ).resolves.toEqual({ ok: true, propertyId });

      let property = await getProperty({ ...as("managerA"), propertyId });
      expect(property?.ownerships.map((o) => [o.name, o.isLead])).toEqual([
        ["Olivia Second", true],
        ["Olivia First", false],
      ]);

      const firstOwnership = property!.ownerships.find(
        (o) => o.contactId === first,
      )!;
      await expect(
        setPropertyLeadOwner({
          ...as("managerA"),
          propertyId,
          ownershipId: firstOwnership.id,
        }),
      ).resolves.toEqual({ ok: true, propertyId });
      property = await getProperty({ ...as("managerA"), propertyId });
      expect(property?.ownerships[0]).toMatchObject({
        contactId: first,
        isLead: true,
      });
      await expect(
        setPropertyLeadOwner({
          ...as("managerA"),
          propertyId,
          ownershipId: firstOwnership.id,
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_state" });
    });

    it("ends an ownership with a reason, keeping it as history", async () => {
      const contactId = await createPerson();
      const propertyId = await makeProperty({
        owners: [{ contactId, isLead: true, startedOn: "2020-01-01" }],
      });
      const ownership = (await getProperty({ ...as("managerA"), propertyId }))!
        .ownerships[0];
      const base = {
        ...as("managerA"),
        propertyId,
        ownershipId: ownership.id,
      };

      await expect(
        endPropertyOwnership({
          ...as("negotiatorA"),
          propertyId,
          ownershipId: ownership.id,
          reason: "Sold",
          endedOn: "2024-06-01",
        }),
      ).resolves.toEqual({ ok: false, error: "access_denied" });
      await expect(
        endPropertyOwnership({ ...base, reason: " ", endedOn: "2024-06-01" }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });
      await expect(
        endPropertyOwnership({
          ...base,
          reason: "Sold",
          endedOn: "2019-01-01",
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });
      await expect(
        endPropertyOwnership({
          ...base,
          reason: "Sold",
          endedOn: "2024-06-01",
        }),
      ).resolves.toEqual({ ok: true, propertyId });
      await expect(
        endPropertyOwnership({
          ...base,
          reason: "Sold",
          endedOn: "2024-06-01",
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_state" });

      const property = await getProperty({ ...as("managerA"), propertyId });
      expect(property?.ownerships).toMatchObject([
        { isLead: false, endReason: "Sold", endedAt: expect.any(Date) },
      ]);
      expect(
        await count(
          `SELECT "current_property_ownership_count" AS n FROM "contacts"
           WHERE "id" = $1`,
          [contactId],
        ),
      ).toBe(0);

      const forContact = await listPropertiesForContact({
        ...as("managerA"),
        contactId,
      });
      expect(forContact).toMatchObject([
        { propertyId, current: false, endedOn: new Date("2024-06-01") },
      ]);
    });
  });

  describe("branch transfers", () => {
    it("moves a property with its owners and keeps a permanent record", async () => {
      const contactId = await createPerson();
      const propertyId = await makeProperty({
        owners: [{ contactId, isLead: true, startedOn: "" }],
      });
      const target = {
        ...as("managerAB"),
        propertyId,
        toBranchId: ids.branchB,
      };

      await expect(
        transferPropertyBranch({
          ...target,
          ...as("negotiatorA"),
          reason: "x",
        }),
      ).resolves.toEqual({ ok: false, error: "access_denied" });
      await expect(
        transferPropertyBranch({
          ...target,
          ...as("managerA"),
          reason: "Move",
        }),
      ).resolves.toEqual({ ok: false, error: "access_denied" });
      await expect(
        transferPropertyBranch({ ...target, reason: "  " }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });
      await expect(
        transferPropertyBranch({
          ...target,
          toBranchId: ids.branchA,
          reason: "Same",
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });

      await expect(listProperties(as("negotiatorB"))).resolves.toEqual([]);
      await expect(
        transferPropertyBranch({
          ...target,
          reason: "Branch B covers this area",
        }),
      ).resolves.toEqual({ ok: true, propertyId });

      // The new branch now sees the property, its owners and its history.
      const seenByB = await getProperty({ ...as("negotiatorB"), propertyId });
      expect(seenByB).toMatchObject({
        responsibleBranch: { id: ids.branchB },
        ownerships: [{ contactId, name: "Olivia Owner" }],
        transfers: [
          {
            fromBranchName: "Branch A",
            toBranchName: "Branch B",
            reason: "Branch B covers this area",
          },
        ],
      });
      // The old branch no longer sees the property.
      await expect(
        getProperty({ ...as("negotiatorA"), propertyId }),
      ).resolves.toBeNull();
      // The owner stays visible to the old branch as a contact.
      const forContactB = await listPropertiesForContact({
        ...as("negotiatorB"),
        contactId,
      });
      expect(forContactB.map((p) => p.propertyId)).toEqual([propertyId]);

      expect(
        await count(
          `SELECT count(*) AS n FROM "audit_events"
           WHERE "action" = 'property.branch.transfer'
             AND "outcome" = 'succeeded'`,
        ),
      ).toBe(1);
    });
  });

  describe("owners and contact archiving", () => {
    it("refuses to archive a current owner with a clear reason, then allows it after the ownership ends", async () => {
      const contactId = await createPerson();
      const propertyId = await makeProperty({
        owners: [{ contactId, isLead: true, startedOn: "" }],
      });
      const archive = { ...as("managerA"), contactId };

      await expect(archiveContact(archive)).resolves.toEqual({
        ok: false,
        error: "owns_property",
      });

      // Once the property moves to Branch B, the Branch A manager can no
      // longer see it, but must still be stopped from archiving its owner.
      const ownership = (await getProperty({ ...as("managerA"), propertyId }))!
        .ownerships[0];
      await transferPropertyBranch({
        ...as("managerAB"),
        propertyId,
        toBranchId: ids.branchB,
        reason: "Moved",
      });
      await expect(
        getProperty({ ...as("managerA"), propertyId }),
      ).resolves.toBeNull();
      await expect(archiveContact(archive)).resolves.toEqual({
        ok: false,
        error: "owns_property",
      });

      await endPropertyOwnership({
        ...as("managerAB"),
        propertyId,
        ownershipId: ownership.id,
        reason: "Sold",
        endedOn: "",
      });
      await expect(archiveContact(archive)).resolves.toEqual({
        ok: true,
        contactId,
      });
    });
  });

  describe("notes", () => {
    it("lets writers add notes, managers correct them, and keeps the history", async () => {
      const propertyId = await makeProperty();
      const base = { ...as("negotiatorA"), propertyId };
      const added = await addPropertyNote({
        ...base,
        body: "Boiler serviced in March",
      });
      if (!added.ok) throw new Error(`Note failed: ${added.error}`);

      await expect(addPropertyNote({ ...base, body: "  " })).resolves.toEqual({
        ok: false,
        error: "invalid_input",
      });
      await expect(
        addPropertyNote({ ...as("negotiatorB"), propertyId, body: "Hello" }),
      ).resolves.toEqual({ ok: false, error: "property_not_found" });
      await expect(
        editPropertyNote({
          ...base,
          noteId: added.noteId,
          body: "Boiler serviced in April",
          occurredAt: null,
          reason: "Wrong month",
        }),
      ).resolves.toEqual({ ok: false, error: "access_denied" });

      const manager = { ...as("managerA"), propertyId, noteId: added.noteId };
      // The edit form sends back the note's original time unless it is changed.
      const [original] = (await listPropertyNotes({ ...base }))!;
      await expect(
        editPropertyNote({
          ...manager,
          body: "Boiler serviced in April",
          occurredAt: original.occurredAt,
          reason: "Wrong month",
        }),
      ).resolves.toEqual({ ok: true, noteId: added.noteId });
      await expect(
        editPropertyNote({
          ...manager,
          body: "Boiler serviced in April",
          occurredAt: original.occurredAt,
          reason: "No change",
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });

      const edited = await listPropertyNotes({
        ...as("negotiatorA"),
        propertyId,
      });
      expect(edited).toMatchObject([
        {
          body: "Boiler serviced in April",
          edited: true,
          authorName: expect.any(String),
          canManage: false,
        },
      ]);
      expect(
        await count(
          `SELECT count(*) AS n FROM "property_note_revisions"
           WHERE "note_id" = $1`,
          [added.noteId],
        ),
      ).toBe(1);

      // Another branch cannot read the notes of a property it cannot see.
      await expect(
        listPropertyNotes({ ...as("negotiatorB"), propertyId }),
      ).resolves.toEqual([]);

      await expect(
        voidPropertyNote({ ...manager, reason: "" }),
      ).resolves.toEqual({ ok: false, error: "invalid_input" });
      await expect(
        voidPropertyNote({ ...manager, reason: "Added to wrong property" }),
      ).resolves.toEqual({ ok: true, noteId: added.noteId });
      await expect(
        voidPropertyNote({ ...manager, reason: "Again" }),
      ).resolves.toEqual({ ok: false, error: "invalid_state" });
      await expect(
        editPropertyNote({
          ...manager,
          body: "Rewritten",
          occurredAt: null,
          reason: "Try",
        }),
      ).resolves.toEqual({ ok: false, error: "invalid_state" });

      await expect(
        listPropertyNotes({ ...as("negotiatorA"), propertyId }),
      ).resolves.toEqual([]);
      const withVoided = await listPropertyNotes({
        ...as("managerA"),
        propertyId,
        includeVoided: true,
      });
      expect(withVoided).toMatchObject([
        { voided: true, voidReason: "Added to wrong property" },
      ]);
    });
  });
});
