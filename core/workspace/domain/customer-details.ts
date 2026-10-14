export const CUSTOMER_DETAIL_LIMITS = {
  displayName: 160,
  legalName: 160,
  companyNumber: 8,
  primaryEmail: 254,
  telephone: 32,
  website: 2048,
  addressLine: 160,
  townCity: 100,
  county: 100,
  postcode: 16,
} as const;

export const CUSTOMER_DETAIL_FIELDS = [
  "displayName",
  "legalName",
  "companyNumber",
  "primaryEmail",
  "telephone",
  "website",
  "registeredAddress1",
  "registeredAddress2",
  "registeredTownCity",
  "registeredCounty",
  "registeredPostcode",
] as const;

export type CustomerDetailField = (typeof CUSTOMER_DETAIL_FIELDS)[number];

export type CustomerDetailsInput = Record<CustomerDetailField, string>;

export type ValidCustomerDetails = {
  displayName: string;
  legalName: string | null;
  companyNumber: string | null;
  primaryEmail: string | null;
  telephone: string | null;
  website: string | null;
  registeredAddress1: string | null;
  registeredAddress2: string | null;
  registeredTownCity: string | null;
  registeredCounty: string | null;
  registeredPostcode: string | null;
};

export type CustomerDetailsValidation =
  | { ok: true; details: ValidCustomerDetails }
  | {
      ok: false;
      fieldErrors: Partial<Record<CustomerDetailField, string>>;
    };

function optionalValue(value: string) {
  return value.trim() || null;
}

function exceeds(value: string | null, maximum: number) {
  return value !== null && value.length > maximum;
}

export function validateCustomerDetails(
  input: CustomerDetailsInput,
): CustomerDetailsValidation {
  const details: ValidCustomerDetails = {
    displayName: input.displayName.trim(),
    legalName: optionalValue(input.legalName),
    companyNumber: optionalValue(input.companyNumber)?.toUpperCase() ?? null,
    primaryEmail: optionalValue(input.primaryEmail)?.toLowerCase() ?? null,
    telephone: optionalValue(input.telephone),
    website: optionalValue(input.website),
    registeredAddress1: optionalValue(input.registeredAddress1),
    registeredAddress2: optionalValue(input.registeredAddress2),
    registeredTownCity: optionalValue(input.registeredTownCity),
    registeredCounty: optionalValue(input.registeredCounty),
    registeredPostcode:
      optionalValue(input.registeredPostcode)?.toUpperCase() ?? null,
  };
  const fieldErrors: Partial<Record<CustomerDetailField, string>> = {};

  if (!details.displayName) {
    fieldErrors.displayName = "Enter a customer name.";
  } else if (details.displayName.length > CUSTOMER_DETAIL_LIMITS.displayName) {
    fieldErrors.displayName = "Use 160 characters or fewer.";
  }

  const lengthChecks: ReadonlyArray<
    [CustomerDetailField, string | null, number]
  > = [
    ["legalName", details.legalName, CUSTOMER_DETAIL_LIMITS.legalName],
    [
      "companyNumber",
      details.companyNumber,
      CUSTOMER_DETAIL_LIMITS.companyNumber,
    ],
    ["primaryEmail", details.primaryEmail, CUSTOMER_DETAIL_LIMITS.primaryEmail],
    ["telephone", details.telephone, CUSTOMER_DETAIL_LIMITS.telephone],
    ["website", details.website, CUSTOMER_DETAIL_LIMITS.website],
    [
      "registeredAddress1",
      details.registeredAddress1,
      CUSTOMER_DETAIL_LIMITS.addressLine,
    ],
    [
      "registeredAddress2",
      details.registeredAddress2,
      CUSTOMER_DETAIL_LIMITS.addressLine,
    ],
    [
      "registeredTownCity",
      details.registeredTownCity,
      CUSTOMER_DETAIL_LIMITS.townCity,
    ],
    [
      "registeredCounty",
      details.registeredCounty,
      CUSTOMER_DETAIL_LIMITS.county,
    ],
    [
      "registeredPostcode",
      details.registeredPostcode,
      CUSTOMER_DETAIL_LIMITS.postcode,
    ],
  ];

  for (const [field, value, maximum] of lengthChecks) {
    if (exceeds(value, maximum)) {
      fieldErrors[field] = `Use ${maximum} characters or fewer.`;
    }
  }

  if (
    details.primaryEmail &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.primaryEmail)
  ) {
    fieldErrors.primaryEmail = "Enter a valid email address.";
  }

  if (details.website) {
    try {
      const website = new URL(details.website);
      if (website.protocol !== "http:" && website.protocol !== "https:") {
        fieldErrors.website =
          "Enter a website beginning with http:// or https://.";
      }
    } catch {
      fieldErrors.website = "Enter a valid website address.";
    }
  }

  return Object.keys(fieldErrors).length > 0
    ? { ok: false, fieldErrors }
    : { ok: true, details };
}
