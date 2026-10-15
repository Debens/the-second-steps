import { describe, expect, it } from "vitest";
import {
  duplicateSignalStrength,
  normalizeEmail,
  normalizePostcode,
  normalizeTelephone,
  preferredChannelIsAllowed,
  validateContactAddresses,
  validateContactPoints,
  validateOrganisationDetails,
  validatePersonDetails,
  validateRelationshipLabel,
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

  it("normalises contact points and permits one preferred value per kind", () => {
    expect(
      validateContactPoints([
        {
          kind: "email",
          label: " Work ",
          value: " OWNER@EXAMPLE.COM ",
          isPreferred: true,
        },
        {
          kind: "telephone",
          label: "Mobile",
          value: "07700 900123",
          isPreferred: true,
        },
      ]),
    ).toMatchObject({
      ok: true,
      points: [
        { label: "Work", normalizedValue: "owner@example.com" },
        { normalizedValue: "+447700900123" },
      ],
    });
    expect(
      validateContactPoints([
        { kind: "email", label: "", value: "a@example.com", isPreferred: true },
        { kind: "email", label: "", value: "b@example.com", isPreferred: true },
      ]),
    ).toEqual({ ok: false, reason: "multiple_preferred_contact_points" });
  });

  it("keeps person and organisation address kinds separate", () => {
    const address = {
      kind: "registered" as const,
      addressLine1: " 1 High Street ",
      addressLine2: "",
      locality: "",
      townCity: " London ",
      county: "",
      postcode: " sw1a 1aa ",
      countryCode: "gb",
    };
    expect(validateContactAddresses("organisation", [address])).toMatchObject({
      ok: true,
      addresses: [{ postcode: "SW1A1AA", countryCode: "GB" }],
    });
    expect(validateContactAddresses("person", [address])).toEqual({
      ok: false,
      reason: "invalid_address",
    });
  });

  it("creates kind-labelled non-sequential references", () => {
    expect(createContactReference("person")).toMatch(/^PER-[2-9A-HJ-NP-Z]{8}$/);
    expect(createContactReference("organisation")).toMatch(
      /^ORG-[2-9A-HJ-NP-Z]{8}$/,
    );
  });

  it("trims optional organisation relationship labels", () => {
    expect(validateRelationshipLabel("  Director ")).toEqual({
      ok: true,
      label: "Director",
    });
    expect(validateRelationshipLabel("   ")).toEqual({ ok: true, label: null });
    expect(validateRelationshipLabel("x".repeat(101))).toMatchObject({
      ok: false,
    });
  });
});
