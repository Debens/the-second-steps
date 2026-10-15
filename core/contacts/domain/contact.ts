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
