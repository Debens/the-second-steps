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
import {
  createAndLinkOrganisationPerson,
  endOrganisationPersonLink,
  linkOrganisationPerson,
  updateOrganisationPersonLink,
} from "@/core/contacts/application/organisation-people";
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
  ownerAuth: randomUUID(),
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
      `INSERT INTO "authentication_provider_links"
        ("user_identity_id", "provider", "provider_subject")
       VALUES ($1::uuid, 'supabase', $2::uuid)`,
      [ids.ownerIdentity, ids.ownerAuth],
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

async function createPerson(email = "owner@example.test") {
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
        value: email,
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

async function createOrganisation(authSubject: string, branchId: string) {
  const result = await createContact({
    authSubject,
    workspaceSlug: "contact-app",
    branchId,
    kind: "organisation",
    details: {
      type: "limited_company",
      legalName: "Linked Lettings Limited",
      tradingName: "",
      registrationNumber: "",
      vatNumber: "",
    },
    communication: { ...communication, preferred: null },
    contactPoints: [],
    addresses: [],
  });
  if (!result.ok) {
    throw new Error(`Organisation creation failed: ${result.error}`);
  }
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

  it("reserves organisation-person links for managers with access to both contacts", async () => {
    const personId = await createPerson();
    const organisationId = await createOrganisation(
      ids.managerAuth,
      ids.branchA,
    );
    const link = {
      workspaceSlug: "contact-app",
      organisationContactId: organisationId,
      personContactId: personId,
      relationshipLabel: " Director ",
      isPrimary: true,
    };
    await expect(
      linkOrganisationPerson({ ...link, authSubject: ids.negotiatorAAuth }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      linkOrganisationPerson({ ...link, authSubject: ids.managerAuth }),
    ).resolves.toEqual({ ok: true, contactId: organisationId });
    await expect(
      linkOrganisationPerson({ ...link, authSubject: ids.managerAuth }),
    ).resolves.toEqual({ ok: false, error: "invalid_state" });

    const organisation = await getContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId: organisationId,
    });
    expect(organisation?.organisationLinks).toMatchObject([
      {
        relationshipLabel: "Director",
        isPrimary: true,
        personContact: { id: personId },
      },
    ]);
    const person = await getContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId: personId,
    });
    expect(person?.personLinks).toMatchObject([
      { organisationContact: { id: organisationId } },
    ]);

    const hiddenOrganisationId = await createOrganisation(
      ids.ownerAuth,
      ids.branchB,
    );
    await expect(
      linkOrganisationPerson({
        ...link,
        organisationContactId: hiddenOrganisationId,
        authSubject: ids.managerAuth,
      }),
    ).resolves.toEqual({ ok: false, error: "contact_not_found" });
  });

  it("shares a linked person with the organisation's branch", async () => {
    const personId = await createPerson();
    const organisationId = await createOrganisation(ids.ownerAuth, ids.branchB);
    await expect(
      getContact({
        authSubject: ids.negotiatorBAuth,
        workspaceSlug: "contact-app",
        contactId: personId,
      }),
    ).resolves.toBeNull();
    await expect(
      linkOrganisationPerson({
        authSubject: ids.ownerAuth,
        workspaceSlug: "contact-app",
        organisationContactId: organisationId,
        personContactId: personId,
        relationshipLabel: "",
        isPrimary: false,
      }),
    ).resolves.toEqual({ ok: true, contactId: organisationId });
    const shared = await getContact({
      authSubject: ids.negotiatorBAuth,
      workspaceSlug: "contact-app",
      contactId: personId,
    });
    expect(shared?.branchLinks.map(({ branchId }) => branchId)).toEqual([
      ids.branchB,
    ]);
    const allBranches = await getContact({
      authSubject: ids.ownerAuth,
      workspaceSlug: "contact-app",
      contactId: personId,
    });
    expect(
      allBranches?.branchLinks.map(({ branchId, isPrimary }) => [
        branchId,
        isPrimary,
      ]),
    ).toEqual([
      [ids.branchA, true],
      [ids.branchB, false],
    ]);
    const audit = await adminPool.query(
      `SELECT "metadata" FROM "audit_events"
       WHERE "action" = 'contact.organisation_person.link'
         AND "outcome" = 'succeeded'`,
    );
    expect(audit.rows[0].metadata).toMatchObject({
      personContactId: personId,
      addedBranchIds: [ids.branchB],
    });
  });

  it("keeps one main contact and preserves ended links as history", async () => {
    const firstId = await createPerson("first@example.test");
    const secondId = await createPerson("second@example.test");
    const organisationId = await createOrganisation(
      ids.managerAuth,
      ids.branchA,
    );
    for (const personContactId of [firstId, secondId]) {
      const result = await linkOrganisationPerson({
        authSubject: ids.managerAuth,
        workspaceSlug: "contact-app",
        organisationContactId: organisationId,
        personContactId,
        relationshipLabel: "",
        isPrimary: true,
      });
      expect(result.ok).toBe(true);
    }
    const links = await getContact({
      authSubject: ids.managerAuth,
      workspaceSlug: "contact-app",
      contactId: organisationId,
    });
    expect(
      links?.organisationLinks.map(({ personContact, isPrimary }) => [
        personContact.id,
        isPrimary,
      ]),
    ).toEqual([
      [secondId, true],
      [firstId, false],
    ]);
    const firstLink = links!.organisationLinks.find(
      ({ personContact }) => personContact.id === firstId,
    )!;
    const update = {
      workspaceSlug: "contact-app",
      organisationContactId: organisationId,
      linkId: firstLink.id,
      relationshipLabel: "Director",
      isPrimary: true,
    };
    await expect(
      updateOrganisationPersonLink({
        ...update,
        authSubject: ids.negotiatorAAuth,
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      updateOrganisationPersonLink({ ...update, authSubject: ids.managerAuth }),
    ).resolves.toEqual({ ok: true, contactId: organisationId });
    await expect(
      endOrganisationPersonLink({
        authSubject: ids.managerAuth,
        workspaceSlug: "contact-app",
        organisationContactId: organisationId,
        linkId: firstLink.id,
      }),
    ).resolves.toEqual({ ok: true, contactId: organisationId });
    const after = await getContact({
      authSubject: ids.managerAuth,
      workspaceSlug: "contact-app",
      contactId: organisationId,
    });
    expect(
      after?.organisationLinks.map(({ personContact, isPrimary }) => [
        personContact.id,
        isPrimary,
      ]),
    ).toEqual([[secondId, false]]);
    const history = await adminPool.query(
      `SELECT "ended_at" IS NOT NULL AS "ended", "is_primary"
       FROM "organisation_person_links" WHERE "id" = $1`,
      [firstLink.id],
    );
    expect(history.rows).toEqual([{ ended: true, is_primary: false }]);
  });

  it("creates and links a new person in the organisation's branch in one step", async () => {
    const organisationId = await createOrganisation(
      ids.managerAuth,
      ids.branchA,
    );
    const input = {
      workspaceSlug: "contact-app",
      organisationContactId: organisationId,
      details: {
        title: "",
        firstName: "Nadia",
        middleNames: "",
        lastName: "Director",
        preferredName: "",
      },
      contactPoints: [
        {
          kind: "email" as const,
          label: "Work",
          value: "nadia@example.test",
          isPreferred: true,
        },
      ],
      relationshipLabel: "Director",
      isPrimary: true,
    };
    await expect(
      createAndLinkOrganisationPerson({
        ...input,
        authSubject: ids.negotiatorAAuth,
      }),
    ).resolves.toEqual({ ok: false, error: "access_denied" });
    await expect(
      createAndLinkOrganisationPerson({
        ...input,
        contactPoints: [],
        authSubject: ids.managerAuth,
      }),
    ).resolves.toEqual({ ok: false, error: "invalid_input" });
    await expect(
      createAndLinkOrganisationPerson({
        ...input,
        authSubject: ids.managerAuth,
      }),
    ).resolves.toEqual({ ok: true, contactId: organisationId });

    const organisation = await getContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId: organisationId,
    });
    expect(organisation?.organisationLinks).toMatchObject([
      {
        relationshipLabel: "Director",
        isPrimary: true,
        personContact: { firstName: "Nadia", lastName: "Director" },
      },
    ]);
    const personId = organisation!.organisationLinks[0]!.personContact.id;
    const person = await getContact({
      authSubject: ids.negotiatorAAuth,
      workspaceSlug: "contact-app",
      contactId: personId,
    });
    expect(
      person?.branchLinks.map(({ branchId, isPrimary }) => [
        branchId,
        isPrimary,
      ]),
    ).toEqual([[ids.branchA, true]]);
    const people = await adminPool.query(
      `SELECT count(*)::int AS "count" FROM "contacts" WHERE "kind" = 'person'`,
    );
    expect(people.rows).toEqual([{ count: 1 }]);
  });
});
