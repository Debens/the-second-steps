export const PERSON_NAME_PART_MAX_LENGTH = 100;

type NamePartError = "required" | "too_long";

export type PersonNameValidation =
  | { ok: true; firstName: string; lastName: string }
  | {
      ok: false;
      fieldErrors: { firstName?: NamePartError; lastName?: NamePartError };
    };

function namePartError(value: string): NamePartError | undefined {
  if (!value) return "required";
  if (value.length > PERSON_NAME_PART_MAX_LENGTH) return "too_long";
  return undefined;
}

export function validatePersonName(input: {
  firstName: string;
  lastName: string;
}): PersonNameValidation {
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  const firstNameError = namePartError(firstName);
  const lastNameError = namePartError(lastName);

  if (firstNameError || lastNameError) {
    return {
      ok: false,
      fieldErrors: {
        firstName: firstNameError,
        lastName: lastNameError,
      },
    };
  }

  return { ok: true, firstName, lastName };
}

export function formatPersonName(
  firstName: string | null,
  lastName: string | null,
) {
  return [firstName, lastName].filter(Boolean).join(" ") || "Unnamed user";
}
