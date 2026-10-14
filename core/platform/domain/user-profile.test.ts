import { describe, expect, it } from "vitest";
import {
  formatPersonName,
  PERSON_NAME_PART_MAX_LENGTH,
  validatePersonName,
} from "./user-profile";

describe("person names", () => {
  it("trims valid first and last names without splitting their contents", () => {
    expect(
      validatePersonName({
        firstName: "  Mary Jane  ",
        lastName: "  van der Berg  ",
      }),
    ).toEqual({
      ok: true,
      firstName: "Mary Jane",
      lastName: "van der Berg",
    });
  });

  it("reports each missing name part", () => {
    expect(validatePersonName({ firstName: " ", lastName: " " })).toEqual({
      ok: false,
      fieldErrors: { firstName: "required", lastName: "required" },
    });
  });

  it("accepts the maximum length and reports a longer part", () => {
    expect(
      validatePersonName({
        firstName: "a".repeat(PERSON_NAME_PART_MAX_LENGTH),
        lastName: "Hart",
      }),
    ).toEqual({
      ok: true,
      firstName: "a".repeat(PERSON_NAME_PART_MAX_LENGTH),
      lastName: "Hart",
    });
    expect(
      validatePersonName({
        firstName: "Olivia",
        lastName: "a".repeat(PERSON_NAME_PART_MAX_LENGTH + 1),
      }),
    ).toEqual({
      ok: false,
      fieldErrors: { firstName: undefined, lastName: "too_long" },
    });
  });

  it("formats available name parts for display", () => {
    expect(formatPersonName("Olivia", "Hart")).toBe("Olivia Hart");
    expect(formatPersonName("Prince", null)).toBe("Prince");
    expect(formatPersonName(null, null)).toBe("Unnamed user");
  });
});
