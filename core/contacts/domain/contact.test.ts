import { describe, expect, it } from "vitest";
import {
  duplicateSignalStrength,
  normalizeEmail,
  normalizePostcode,
  normalizeTelephone,
  preferredChannelIsAllowed,
  validateOrganisationDetails,
  validatePersonDetails,
} from "./contact";
import { createContactReference } from "./contact-reference";

describe("contact domain", () => {
  it("validates and trims a person without splitting names", () => {
    expect(
      validatePersonDetails({
        title: " Ms ",
        firstName: " Olivia Rose ",
        middleNames: " ",
        lastName: " van Hart ",
        preferredName: " Liv ",
      }),
    ).toEqual({
      ok: true,
      details: {
        title: "Ms",
        firstName: "Olivia Rose",
        middleNames: null,
        lastName: "van Hart",
        preferredName: "Liv",
      },
    });
  });

  it("requires both person name fields", () => {
    expect(
      validatePersonDetails({
        title: "",
        firstName: " ",
        middleNames: "",
        lastName: " ",
        preferredName: "",
      }),
    ).toMatchObject({
      ok: false,
      fieldErrors: {
        firstName: "Enter a first name.",
        lastName: "Enter a surname.",
      },
    });
  });

  it("normalises organisation identifiers for matching", () => {
    expect(
      validateOrganisationDetails({
        type: "limited_company",
        legalName: " Oakfield Homes Limited ",
        tradingName: " Oakfield Homes ",
        registrationNumber: " ab 12-34-56 ",
        vatNumber: " gb 123 4567 89 ",
      }),
    ).toMatchObject({
      ok: true,
      details: {
        legalName: "Oakfield Homes Limited",
        normalizedRegistrationNumber: "AB123456",
        normalizedVatNumber: "GB123456789",
      },
    });
  });

  it("normalises contact values without guessing invalid numbers", () => {
    expect(normalizeEmail(" LANDLORD@EXAMPLE.COM ")).toBe(
      "landlord@example.com",
    );
    expect(normalizeTelephone("020 7946 0998")).toBe("+442079460998");
    expect(normalizeTelephone("7946 0998")).toBeNull();
    expect(normalizePostcode(" sw1a 1aa ")).toBe("SW1A1AA");
  });

  it("ranks explainable duplicate signals", () => {
    expect(duplicateSignalStrength({ exactEmail: true })).toBe("strong");
    expect(
      duplicateSignalStrength({
        sameNormalizedName: true,
        samePostcode: true,
      }),
    ).toBe("possible");
    expect(duplicateSignalStrength({ samePostcode: true })).toBe("none");
  });

  it("rejects a preferred channel that is restricted", () => {
    expect(
      preferredChannelIsAllowed({
        preferred: "email",
        restricted: new Set(["email"]),
      }),
    ).toBe(false);
  });

  it("creates kind-labelled non-sequential references", () => {
    expect(createContactReference("person")).toMatch(/^PER-[2-9A-HJ-NP-Z]{8}$/);
    expect(createContactReference("organisation")).toMatch(
      /^ORG-[2-9A-HJ-NP-Z]{8}$/,
    );
  });
});
