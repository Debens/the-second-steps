"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireMfaUser } from "@/core/auth/mfa";
import {
  archiveContact,
  createContact,
  findDuplicateContacts,
  reactivateContact,
  updateContact,
  type CommunicationPreferencesInput,
} from "@/core/contacts/application/contacts";
import type {
  ContactAddressInput,
  ContactPointInput,
  OrganisationDetailsInput,
  PersonDetailsInput,
} from "@/core/contacts/domain/contact";
import {
  validateContactAddresses,
  validateContactPoints,
  validateOrganisationDetails,
  validatePersonDetails,
} from "@/core/contacts/domain/contact";

export type ContactFormState = {
  status: "idle" | "error" | "duplicates";
  message: string;
  duplicates?: readonly {
    id: string;
    label: string;
    reference: string;
    strength: "strong" | "possible";
    matchedFields: readonly string[];
  }[];
  duplicateReviewToken?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

const INITIAL_ERROR: ContactFormState = {
  status: "error",
  message: "Review the form and try again.",
};

function text(formData: FormData, name: string) {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function checked(formData: FormData, name: string) {
  return formData.get(name) === "on";
}

function contactPoints(formData: FormData): ContactPointInput[] {
  const points: ContactPointInput[] = [];
  const preferredEmail = text(formData, "preferredEmail");
  const preferredTelephone = text(formData, "preferredTelephone");
  for (const [kind, valueName, labelName, preferred] of [
    ["email", "emailValue", "emailLabel", preferredEmail],
    ["telephone", "telephoneValue", "telephoneLabel", preferredTelephone],
  ] as const) {
    const values = formData.getAll(valueName);
    const labels = formData.getAll(labelName);
    const ids = formData.getAll(`${kind}Id`);
    values.forEach((value, index) => {
      if (typeof value !== "string" || !value.trim()) return;
      points.push({
        id:
          typeof ids[index] === "string" && ids[index]
            ? String(ids[index])
            : undefined,
        kind,
        value,
        label: typeof labels[index] === "string" ? String(labels[index]) : "",
        isPreferred: preferred === String(index),
      });
    });
  }
  return points;
}

function addresses(
  formData: FormData,
  kind: "person" | "organisation",
): ContactAddressInput[] {
  const definitions =
    kind === "person" ? ["individual"] : ["registered", "correspondence"];
  const result = definitions.flatMap((addressKind) => {
    const prefix = `${addressKind}Address`;
    const addressLine1 = text(formData, `${prefix}Line1`);
    const values = {
      addressLine1,
      addressLine2: text(formData, `${prefix}Line2`),
      locality: text(formData, `${prefix}Locality`),
      townCity: text(formData, `${prefix}TownCity`),
      county: text(formData, `${prefix}County`),
      postcode: text(formData, `${prefix}Postcode`),
    };
    if (!Object.values(values).some((value) => value.trim())) return [];
    return [
      {
        id: text(formData, `${prefix}Id`) || undefined,
        kind: addressKind as ContactAddressInput["kind"],
        ...values,
        countryCode: "GB",
      },
    ];
  });
  if (kind === "organisation" && checked(formData, "sameAsRegistered")) {
    const registered = result.find(
      ({ kind: addressKind }) => addressKind === "registered",
    );
    if (registered)
      return [
        registered,
        {
          ...registered,
          id: text(formData, "correspondenceAddressId") || undefined,
          kind: "correspondence",
        },
      ];
  }
  return result;
}

function communication(formData: FormData): CommunicationPreferencesInput {
  const preferred = text(formData, "preferredCommunication");
  return {
    preferred:
      preferred === "email" ||
      preferred === "telephone" ||
      preferred === "sms" ||
      preferred === "whatsapp" ||
      preferred === "post"
        ? preferred
        : null,
    doNotEmail: checked(formData, "doNotEmail"),
    doNotTelephone: checked(formData, "doNotTelephone"),
    doNotSms: checked(formData, "doNotSms"),
    doNotWhatsApp: checked(formData, "doNotWhatsApp"),
    doNotPost: checked(formData, "doNotPost"),
  };
}

function personDetails(formData: FormData): PersonDetailsInput {
  return {
    title: text(formData, "title"),
    firstName: text(formData, "firstName"),
    middleNames: text(formData, "middleNames"),
    lastName: text(formData, "lastName"),
    preferredName: text(formData, "preferredName"),
  };
}

function organisationDetails(formData: FormData): OrganisationDetailsInput {
  const type = text(formData, "organisationType");
  return {
    type: [
      "limited_company",
      "llp",
      "partnership",
      "trust",
      "charity",
      "other",
    ].includes(type)
      ? (type as OrganisationDetailsInput["type"])
      : "other",
    legalName: text(formData, "legalName"),
    tradingName: text(formData, "tradingName"),
    registrationNumber: text(formData, "registrationNumber"),
    vatNumber: text(formData, "vatNumber"),
  };
}

function supportedCommunication(
  preferences: CommunicationPreferencesInput,
  points: readonly ContactPointInput[],
  contactAddresses: readonly ContactAddressInput[],
) {
  if (!preferences.preferred) return true;
  if (preferences.preferred === "email")
    return points.some(({ kind }) => kind === "email");
  if (["telephone", "sms", "whatsapp"].includes(preferences.preferred)) {
    return points.some(({ kind }) => kind === "telephone");
  }
  return contactAddresses.length > 0;
}

function contactLabel(contact: {
  kind: "PERSON" | "ORGANISATION";
  firstName: string | null;
  lastName: string | null;
  legalName: string | null;
}) {
  return contact.kind === "PERSON"
    ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
    : (contact.legalName ?? "Unnamed organisation");
}

function duplicateReviewToken(input: {
  kind: "person" | "organisation";
  points: readonly ContactPointInput[];
  addresses: readonly ContactAddressInput[];
  details: PersonDetailsInput | OrganisationDetailsInput;
}) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        kind: input.kind,
        points: input.points.map(({ kind, value }) => [kind, value.trim()]),
        postcode: input.addresses[0]?.postcode.trim() ?? "",
        details: input.details,
      }),
    )
    .digest("hex");
}

function validateSubmission(input: {
  kind: "person" | "organisation";
  details: PersonDetailsInput | OrganisationDetailsInput;
  points: readonly ContactPointInput[];
  addresses: readonly ContactAddressInput[];
  preferences: CommunicationPreferencesInput;
}): ContactFormState | null {
  const fieldErrors: Partial<Record<string, string>> = {};
  const details =
    input.kind === "person"
      ? validatePersonDetails(input.details as PersonDetailsInput)
      : validateOrganisationDetails(input.details as OrganisationDetailsInput);
  if (!details.ok) Object.assign(fieldErrors, details.fieldErrors);

  const points = validateContactPoints(input.points);
  if (input.points.length === 0) {
    fieldErrors.contactMethods = "Add at least one email or telephone.";
  } else if (!points.ok) {
    fieldErrors.contactMethods =
      points.reason === "multiple_preferred_contact_points"
        ? "Choose only one preferred value of each type."
        : "Check the email addresses and telephone numbers.";
  }

  const addresses = validateContactAddresses(input.kind, input.addresses);
  if (!addresses.ok) {
    fieldErrors.addresses =
      input.kind === "person"
        ? "Complete the individual address or leave it blank."
        : "Complete each organisation address or leave it blank.";
  }

  if (
    !supportedCommunication(input.preferences, input.points, input.addresses)
  ) {
    fieldErrors.communication =
      "Choose a preferred method supported by the recorded contact details.";
  }

  return Object.keys(fieldErrors).length
    ? {
        status: "error",
        message: "Review the highlighted details.",
        fieldErrors,
      }
    : null;
}

export async function createContactAction(
  workspaceSlug: string,
  kind: "person" | "organisation",
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const path = `/dashboard/w/${workspaceSlug}/contacts/new?kind=${kind}`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const points = contactPoints(formData);
  const contactAddresses = addresses(formData, kind);
  const preferences = communication(formData);
  const submittedDetails =
    kind === "person" ? personDetails(formData) : organisationDetails(formData);
  const reviewToken = duplicateReviewToken({
    kind,
    points,
    addresses: contactAddresses,
    details: submittedDetails,
  });
  const validationError = validateSubmission({
    kind,
    details: submittedDetails,
    points,
    addresses: contactAddresses,
    preferences,
  });
  if (validationError) return validationError;

  if (text(formData, "duplicateReviewToken") !== reviewToken) {
    const person = kind === "person" ? personDetails(formData) : null;
    const organisation =
      kind === "organisation" ? organisationDetails(formData) : null;
    const candidates = await findDuplicateContacts({
      authSubject: user.id,
      workspaceSlug,
      email: points.find(({ kind: pointKind }) => pointKind === "email")?.value,
      telephone: points.find(({ kind: pointKind }) => pointKind === "telephone")
        ?.value,
      registrationNumber: organisation?.registrationNumber,
      name: person
        ? `${person.firstName} ${person.lastName}`
        : organisation?.legalName,
      postcode: contactAddresses[0]?.postcode,
    });
    if (candidates?.length) {
      return {
        status: "duplicates",
        message:
          "Possible existing contacts were found. Review them before continuing.",
        duplicates: candidates.map(({ contact, strength, matchedFields }) => ({
          id: contact.id,
          label: contactLabel(contact),
          reference: contact.reference,
          strength,
          matchedFields,
        })),
        duplicateReviewToken: reviewToken,
      };
    }
  }

  const common = {
    authSubject: user.id,
    workspaceSlug,
    branchId: text(formData, "branchId"),
    communication: preferences,
    contactPoints: points,
    addresses: contactAddresses,
  };
  const result =
    kind === "person"
      ? await createContact({
          ...common,
          kind,
          details: submittedDetails as PersonDetailsInput,
        })
      : await createContact({
          ...common,
          kind,
          details: submittedDetails as OrganisationDetailsInput,
        });
  if (!result.ok) return INITIAL_ERROR;
  revalidatePath(`/dashboard/w/${workspaceSlug}/contacts`);
  redirect(`/dashboard/w/${workspaceSlug}/contacts/${result.contactId}`);
}

export async function updateContactAction(
  workspaceSlug: string,
  contactId: string,
  kind: "person" | "organisation",
  _previousState: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const path = `/dashboard/w/${workspaceSlug}/contacts/${contactId}`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const points = contactPoints(formData);
  const contactAddresses = addresses(formData, kind);
  const preferences = communication(formData);
  const details =
    kind === "person" ? personDetails(formData) : organisationDetails(formData);
  const validationError = validateSubmission({
    kind,
    details,
    points,
    addresses: contactAddresses,
    preferences,
  });
  if (validationError) return validationError;
  const common = {
    authSubject: user.id,
    workspaceSlug,
    contactId,
    communication: preferences,
    contactPoints: points,
    addresses: contactAddresses,
  };
  const result =
    kind === "person"
      ? await updateContact({
          ...common,
          kind,
          details: details as PersonDetailsInput,
        })
      : await updateContact({
          ...common,
          kind,
          details: details as OrganisationDetailsInput,
        });
  if (!result.ok) return INITIAL_ERROR;
  revalidatePath(path);
  revalidatePath(`/dashboard/w/${workspaceSlug}/contacts`);
  return { status: "idle", message: "Contact saved." };
}

export async function changeContactArchiveAction(
  workspaceSlug: string,
  contactId: string,
  reactivate: boolean,
) {
  const path = `/dashboard/w/${workspaceSlug}/contacts/${contactId}`;
  const user = await requireMfaUser(path, { workspaceSlug });
  const result = reactivate
    ? await reactivateContact({
        authSubject: user.id,
        workspaceSlug,
        contactId,
      })
    : await archiveContact({ authSubject: user.id, workspaceSlug, contactId });
  if (!result.ok) redirect(`${path}?error=archive`);
  revalidatePath(path);
  revalidatePath(`/dashboard/w/${workspaceSlug}/contacts`);
  redirect(path);
}
