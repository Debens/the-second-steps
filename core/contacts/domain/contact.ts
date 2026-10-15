export const CONTACT_LIMITS = {
  title: 40,
  firstName: 100,
  middleNames: 200,
  lastName: 100,
  preferredName: 100,
  legalName: 200,
  tradingName: 200,
  registrationNumber: 64,
  vatNumber: 32,
  email: 254,
  telephone: 32,
  label: 40,
  addressLine: 160,
  locality: 100,
  townCity: 100,
  county: 100,
  postcode: 16,
} as const;

export type PersonDetailsInput = {
  title: string;
  firstName: string;
  middleNames: string;
  lastName: string;
  preferredName: string;
};

export type OrganisationDetailsInput = {
  type:
    "limited_company" | "llp" | "partnership" | "trust" | "charity" | "other";
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  vatNumber: string;
};

type FieldErrors<T extends string> = Partial<Record<T, string>>;

function optionalValue(value: string) {
  return value.trim() || null;
}

function addLengthError<T extends string>(
  errors: FieldErrors<T>,
  field: T,
  value: string | null,
  maximum: number,
) {
  if (value !== null && value.length > maximum) {
    errors[field] = `Use ${maximum} characters or fewer.`;
  }
}

export function validatePersonDetails(input: PersonDetailsInput) {
  const details = {
    title: optionalValue(input.title),
    firstName: input.firstName.trim(),
    middleNames: optionalValue(input.middleNames),
    lastName: input.lastName.trim(),
    preferredName: optionalValue(input.preferredName),
  };
  const fieldErrors: FieldErrors<keyof PersonDetailsInput> = {};

  if (!details.firstName) fieldErrors.firstName = "Enter a first name.";
  if (!details.lastName) fieldErrors.lastName = "Enter a surname.";

  addLengthError(fieldErrors, "title", details.title, CONTACT_LIMITS.title);
  addLengthError(
    fieldErrors,
    "firstName",
    details.firstName,
    CONTACT_LIMITS.firstName,
  );
  addLengthError(
    fieldErrors,
    "middleNames",
    details.middleNames,
    CONTACT_LIMITS.middleNames,
  );
  addLengthError(
    fieldErrors,
    "lastName",
    details.lastName,
    CONTACT_LIMITS.lastName,
  );
  addLengthError(
    fieldErrors,
    "preferredName",
    details.preferredName,
    CONTACT_LIMITS.preferredName,
  );

  return Object.keys(fieldErrors).length > 0
    ? ({ ok: false, fieldErrors } as const)
    : ({ ok: true, details } as const);
}

export function validateOrganisationDetails(input: OrganisationDetailsInput) {
  const details = {
    type: input.type,
    legalName: input.legalName.trim(),
    tradingName: optionalValue(input.tradingName),
    registrationNumber: optionalValue(input.registrationNumber),
    vatNumber: optionalValue(input.vatNumber),
  };
  const fieldErrors: FieldErrors<keyof OrganisationDetailsInput> = {};

  if (!details.legalName) fieldErrors.legalName = "Enter a legal name.";
  addLengthError(
    fieldErrors,
    "legalName",
    details.legalName,
    CONTACT_LIMITS.legalName,
  );
  addLengthError(
    fieldErrors,
    "tradingName",
    details.tradingName,
    CONTACT_LIMITS.tradingName,
  );
  addLengthError(
    fieldErrors,
    "registrationNumber",
    details.registrationNumber,
    CONTACT_LIMITS.registrationNumber,
  );
  addLengthError(
    fieldErrors,
    "vatNumber",
    details.vatNumber,
    CONTACT_LIMITS.vatNumber,
  );

  return Object.keys(fieldErrors).length > 0
    ? ({ ok: false, fieldErrors } as const)
    : ({
        ok: true,
        details: {
          ...details,
          normalizedRegistrationNumber: normalizeIdentifier(
            details.registrationNumber,
          ),
          normalizedVatNumber: normalizeIdentifier(details.vatNumber),
        },
      } as const);
}

export function normalizeEmail(value: string) {
  const normalized = value.trim().toLowerCase();
  if (
    !normalized ||
    normalized.length > CONTACT_LIMITS.email ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)
  ) {
    return null;
  }
  return normalized;
}

export function normalizeTelephone(value: string) {
  let normalized = value.trim().replace(/[\s().-]/g, "");
  if (normalized.startsWith("00")) normalized = `+${normalized.slice(2)}`;
  if (/^0\d{9,10}$/.test(normalized)) normalized = `+44${normalized.slice(1)}`;
  return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : null;
}

export function normalizeIdentifier(value: string | null) {
  return value?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || null;
}

export function normalizePostcode(value: string) {
  const normalized = value.replace(/\s/g, "").toUpperCase();
  return /^[A-Z0-9]{5,8}$/.test(normalized) ? normalized : null;
}

export type DuplicateSignalInput = {
  exactEmail?: boolean;
  exactTelephone?: boolean;
  exactRegistrationNumber?: boolean;
  sameNormalizedName?: boolean;
  samePostcode?: boolean;
};

export function duplicateSignalStrength(input: DuplicateSignalInput) {
  if (
    input.exactEmail ||
    input.exactTelephone ||
    input.exactRegistrationNumber
  ) {
    return "strong" as const;
  }
  if (input.sameNormalizedName && input.samePostcode) {
    return "possible" as const;
  }
  return "none" as const;
}

export function preferredChannelIsAllowed(input: {
  preferred: "email" | "telephone" | "sms" | "whatsapp" | "post" | null;
  restricted: ReadonlySet<string>;
}) {
  return input.preferred === null || !input.restricted.has(input.preferred);
}

export type ContactPointInput = {
  id?: string;
  kind: "email" | "telephone";
  label: string;
  value: string;
  isPreferred: boolean;
};

export type ValidContactPoint = {
  id?: string;
  kind: ContactPointInput["kind"];
  label: string | null;
  value: string;
  normalizedValue: string;
  isPreferred: boolean;
};

export function validateContactPoints(input: readonly ContactPointInput[]) {
  const ids = input.flatMap(({ id }) => (id ? [id] : []));
  if (new Set(ids).size !== ids.length) {
    return { ok: false, reason: "duplicate_contact_point" } as const;
  }

  const preferredKinds = input
    .filter(({ isPreferred }) => isPreferred)
    .map(({ kind }) => kind);
  if (new Set(preferredKinds).size !== preferredKinds.length) {
    return { ok: false, reason: "multiple_preferred_contact_points" } as const;
  }

  const points: ValidContactPoint[] = [];
  for (const point of input) {
    const value = point.value.trim();
    const label = optionalValue(point.label);
    if (label && label.length > CONTACT_LIMITS.label) {
      return { ok: false, reason: "invalid_contact_point" } as const;
    }

    const normalizedValue =
      point.kind === "email"
        ? normalizeEmail(value)
        : normalizeTelephone(value);
    const maximum =
      point.kind === "email" ? CONTACT_LIMITS.email : CONTACT_LIMITS.telephone;
    if (!normalizedValue || value.length > maximum) {
      return { ok: false, reason: "invalid_contact_point" } as const;
    }

    points.push({
      id: point.id,
      kind: point.kind,
      label,
      value,
      normalizedValue,
      isPreferred: point.isPreferred,
    });
  }

  return { ok: true, points } as const;
}

export type ContactAddressInput = {
  id?: string;
  kind: "individual" | "registered" | "correspondence";
  addressLine1: string;
  addressLine2: string;
  locality: string;
  townCity: string;
  county: string;
  postcode: string;
  countryCode: string;
};

export type ValidContactAddress = {
  id?: string;
  kind: ContactAddressInput["kind"];
  addressLine1: string;
  addressLine2: string | null;
  locality: string | null;
  townCity: string;
  county: string | null;
  postcode: string;
  countryCode: string;
};

export function validateContactAddresses(
  contactKind: "person" | "organisation",
  input: readonly ContactAddressInput[],
) {
  const ids = input.flatMap(({ id }) => (id ? [id] : []));
  const kinds = input.map(({ kind }) => kind);
  if (
    new Set(ids).size !== ids.length ||
    new Set(kinds).size !== kinds.length
  ) {
    return { ok: false, reason: "duplicate_address" } as const;
  }

  const addresses: ValidContactAddress[] = [];
  for (const address of input) {
    const kindIsValid =
      contactKind === "person"
        ? address.kind === "individual"
        : address.kind !== "individual";
    const addressLine1 = address.addressLine1.trim();
    const townCity = address.townCity.trim();
    const postcode = normalizePostcode(address.postcode);
    const countryCode = address.countryCode.trim().toUpperCase();
    const optionalFields = {
      addressLine2: optionalValue(address.addressLine2),
      locality: optionalValue(address.locality),
      county: optionalValue(address.county),
    };

    if (
      !kindIsValid ||
      !addressLine1 ||
      !townCity ||
      !postcode ||
      !/^[A-Z]{2}$/.test(countryCode) ||
      addressLine1.length > CONTACT_LIMITS.addressLine ||
      townCity.length > CONTACT_LIMITS.townCity ||
      postcode.length > CONTACT_LIMITS.postcode ||
      (optionalFields.addressLine2?.length ?? 0) > CONTACT_LIMITS.addressLine ||
      (optionalFields.locality?.length ?? 0) > CONTACT_LIMITS.locality ||
      (optionalFields.county?.length ?? 0) > CONTACT_LIMITS.county
    ) {
      return { ok: false, reason: "invalid_address" } as const;
    }

    addresses.push({
      id: address.id,
      kind: address.kind,
      addressLine1,
      ...optionalFields,
      townCity,
      postcode,
      countryCode,
    });
  }

  return { ok: true, addresses } as const;
}

export function validateRelationshipLabel(value: string) {
  const label = optionalValue(value);
  if (label !== null && label.length > 100) {
    return { ok: false, error: "Use 100 characters or fewer." } as const;
  }
  return { ok: true, label } as const;
}
