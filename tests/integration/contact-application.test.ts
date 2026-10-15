import { randomUUID } from "node:crypto";
import { Pool, type PoolClient } from "pg";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  archiveContact,
  createContact,
  findDuplicateContacts,
  getContact,
  listContacts,
  reactivateContact,
  updateContact,
  updateOrganisationIdentity,
} from "@/core/contacts/application/contacts";
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
const ids = {
  workspace: randomUUID(),
  ownerIdentity: randomUUID(),
  ownerMembership: randomUUID(),
  branchA: randomUUID(),
  branchB: randomUUID(),
  managerIdentity: randomUUID(),
  managerAuth: randomUUID(),
  managerMembership: randomUUID(),
  negotiatorAIdentity: randomUUID(),
  negotiatorAAuth: randomUUID(),
  negotiatorAMembership: randomUUID(),
  negotiatorBIdentity: randomUUID(),
  negotiatorBAuth: randomUUID(),
  negotiatorBMembership: randomUUID(),
};

async function addUser(
  client: PoolClient,
  input: {
    identityId: string;
    authSubject: string;
    membershipId: string;
    role: "branch_manager" | "negotiator";
    branchId: string;
  },
) {
  await client.query(
    `INSERT INTO "user_identities" ("id", "updated_at")
     VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
    [input.identityId],
  );
  await client.query(
    `INSERT INTO "authentication_provider_links"
      ("user_identity_id", "provider", "provider_subject")
     VALUES ($1::uuid, 'supabase', $2::uuid)`,
    [input.identityId, input.authSubject],
  );
  await client.query(
    `INSERT INTO "memberships"
      ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
     VALUES ($1::uuid, $2::uuid, $3::uuid, 'named_branches', CURRENT_TIMESTAMP)`,
    [input.membershipId, ids.workspace, input.identityId],
  );
  await client.query(
    `INSERT INTO "membership_roles"
      ("workspace_id", "membership_id", "role_code")
     VALUES ($1::uuid, $2::uuid, $3::membership_role_code)`,
    [ids.workspace, input.membershipId, input.role],
  );
  await client.query(
    `INSERT INTO "membership_branch_access"
      ("workspace_id", "membership_id", "branch_id")
     VALUES ($1::uuid, $2::uuid, $3::uuid)`,
    [ids.workspace, input.membershipId, input.branchId],
  );
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
       VALUES ($1::uuid, 'contact-app', 'Contact App', 'agency', CURRENT_TIMESTAMP)`,
      [ids.workspace],
    );
    await client.query(
      `INSERT INTO "branches" ("id", "workspace_id", "name", "updated_at")
       VALUES
        ($1::uuid, $3::uuid, 'Branch A', CURRENT_TIMESTAMP),
        ($2::uuid, $3::uuid, 'Branch B', CURRENT_TIMESTAMP)`,
      [ids.branchA, ids.branchB, ids.workspace],
    );
    await client.query(
      `INSERT INTO "user_identities" ("id", "updated_at")
       VALUES ($1::uuid, CURRENT_TIMESTAMP)`,
      [ids.ownerIdentity],
    );
    await client.query(
      `INSERT INTO "memberships"
        ("id", "workspace_id", "user_identity_id", "scope_mode", "updated_at")
       VALUES ($1::uuid, $2::uuid, $3::uuid, 'workspace', CURRENT_TIMESTAMP)`,
      [ids.ownerMembership, ids.workspace, ids.ownerIdentity],
    );
    await client.query(
      `INSERT INTO "membership_roles"
        ("workspace_id", "membership_id", "role_code")
       VALUES ($1::uuid, $2::uuid, 'workspace_owner')`,
      [ids.workspace, ids.ownerMembership],
    );
    await addUser(client, {
      identityId: ids.managerIdentity,
      authSubject: ids.managerAuth,
      membershipId: ids.managerMembership,
      role: "branch_manager",
      branchId: ids.branchA,
    });
    await addUser(client, {
      identityId: ids.negotiatorAIdentity,
      authSubject: ids.negotiatorAAuth,
      membershipId: ids.negotiatorAMembership,
      role: "negotiator",
      branchId: ids.branchA,
    });
    await addUser(client, {
      identityId: ids.negotiatorBIdentity,
      authSubject: ids.negotiatorBAuth,
      membershipId: ids.negotiatorBMembership,
      role: "negotiator",
      branchId: ids.branchB,
    });
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

const communication = {
  preferred: "email" as const,
  doNotEmail: false,
  doNotTelephone: false,
  doNotSms: false,
  doNotWhatsApp: false,
  doNotPost: false,
};

async function createPerson() {
  const result = await createContact({
    authSubject: ids.managerAuth,
    workspaceSlug: "contact-app",
    branchId: ids.branchA,
    kind: "person",
    details: {
      title: "Ms",
      firstName: "Olivia",
      middleNames: "",
      lastName: "Owner",
      preferredName: "Liv",
    },
    communication,
    contactPoints: [
      {
        kind: "email",
        label: "Personal",
        value: "owner@example.test",
        isPreferred: true,
      },
    ],
    addresses: [
      {
        kind: "individual",
        addressLine1: "1 High Street",
        addressLine2: "",
        locality: "",
        townCity: "London",
        county: "",
        postcode: "SW1A 1AA",
        countryCode: "GB",
      },
    ],
  });
  if (!result.ok) throw new Error(`Contact creation failed: ${result.error}`);
  return result.contactId;
}

beforeEach(seed);
afterAll(async () => {
  await db.$disconnect();
  await adminPool.end();
});

describe("contact application layer", () => {
  it("creates, reads and lists an audited contact", async () => {
    const contactId = await createPerson();
    const contact = await getContact({
      authSubject: ids.managerAuth,
      workspaceSlug: "contact-app",
      contactId,
    });
    expect(contact).toMatchObject({
      id: contactId,
      firstName: "Olivia",
      contactPoints: [{ normalizedValue: "owner@example.test" }],
      addresses: [{ postcode: "SW1A1AA" }],
    });
    const contacts = await listContacts({
      authSubject: ids.managerAuth,
      workspaceSlug: "contact-app",
      query: "Olivia",
    });
    expect(contacts?.map(({ id }) => id)).toEqual([contactId]);
    const audit = await adminPool.query(
      `SELECT "outcome" FROM "audit_events"
       WHERE "action" = 'contact.create' AND "target_id" = $1`,
      [contactId],
    );
    expect(audit.rows).toEqual([{ outcome: "succeeded" }]);
  });

  it("does not reveal a contact outside the member's branch", async () => {
    const contactId = await createPerson();
    await expect(
      getContact({
        authSubject: ids.negotiatorBAuth,
        workspaceSlug: "contact-app",
        contactId,
      }),
    ).resolves.toBeNull();
    await expect(
      listContacts({
        authSubject: ids.negotiatorBAuth,
        workspaceSlug: "contact-app",
      }),
    ).resolves.toEqual([]);
  });

  it("allows routine edits and scoped duplicate suggestions", async () => {
    const contactId = await createPerson();
    const contact = await getContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId,
    });
    const result = await updateContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId,
      kind: "person",
      details: {
        title: "Ms",
        firstName: "Olivia",
        middleNames: "Rose",
        lastName: "Owner",
        preferredName: "Liv",
      },
      communication,
      contactPoints: contact!.contactPoints.map((point) => ({
        id: point.id,
        kind: "email" as const,
        label: point.label ?? "",
        value: point.value,
        isPreferred: point.isPreferred,
      })),
      addresses: contact!.addresses.map((address) => ({
        id: address.id,
        kind: "individual" as const,
        addressLine1: address.addressLine1,
        addressLine2: address.addressLine2 ?? "",
        locality: address.locality ?? "",
        townCity: address.townCity,
        county: address.county ?? "",
        postcode: address.postcode,
        countryCode: address.countryCode,
      })),
    });
    expect(result).toEqual({ ok: true, contactId });
    const candidates = await findDuplicateContacts({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      email: "OWNER@example.test",
    });
    expect(candidates).toMatchObject([
      { strength: "strong", matchedFields: ["email"] },
    ]);
    await expect(
      findDuplicateContacts({
        authSubject: ids.negotiatorBAuth,
        workspaceSlug: "contact-app",
        email: "owner@example.test",
      }),
    ).resolves.toEqual([]);
  });

  it("reserves archive and organisation identity changes for managers", async () => {
    const contactId = await createPerson();
    await expect(
      archiveContact({
        authSubject: ids.negotiatorAAuth,
        workspaceSlug: "contact-app",
        contactId,
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      archiveContact({
        authSubject: ids.managerAuth,
        workspaceSlug: "contact-app",
        contactId,
      }),
    ).resolves.toEqual({ ok: true, contactId });
    expect(
      await listContacts({
        authSubject: ids.managerAuth,
        workspaceSlug: "contact-app",
      }),
    ).toEqual([]);
    await expect(
      reactivateContact({
        authSubject: ids.managerAuth,
        workspaceSlug: "contact-app",
        contactId,
      }),
    ).resolves.toEqual({ ok: true, contactId });

    const organisation = await createContact({
      authSubject: ids.managerAuth,
      workspaceSlug: "contact-app",
      branchId: ids.branchA,
      kind: "organisation",
      details: {
        type: "limited_company",
        legalName: "Oakfield Limited",
        tradingName: "Oakfield",
        registrationNumber: "AB123456",
        vatNumber: "",
      },
      communication,
      contactPoints: [],
      addresses: [],
    });
    if (!organisation.ok) throw new Error("Organisation creation failed.");
    await expect(
      updateContact({
        authSubject: ids.negotiatorAAuth,
        workspaceSlug: "contact-app",
        contactId: organisation.contactId,
        kind: "organisation",
        details: {
          type: "limited_company",
          legalName: "Oakfield Limited",
          tradingName: "Oakfield Homes",
          registrationNumber: "AB123456",
          vatNumber: "",
        },
        communication,
        contactPoints: [],
        addresses: [],
      }),
    ).resolves.toEqual({ ok: true, contactId: organisation.contactId });
    await expect(
      updateContact({
        authSubject: ids.negotiatorAAuth,
        workspaceSlug: "contact-app",
        contactId: organisation.contactId,
        kind: "organisation",
        details: {
          type: "limited_company",
          legalName: "Changed Limited",
          tradingName: "Oakfield Homes",
          registrationNumber: "AB123456",
          vatNumber: "",
        },
        communication,
        contactPoints: [],
        addresses: [],
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      updateOrganisationIdentity({
        authSubject: ids.negotiatorAAuth,
        workspaceSlug: "contact-app",
        contactId: organisation.contactId,
        details: {
          type: "limited_company",
          legalName: "Changed Limited",
          tradingName: "Changed",
          registrationNumber: "AB123456",
          vatNumber: "",
        },
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
  });
});
