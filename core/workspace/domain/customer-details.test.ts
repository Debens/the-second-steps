import { describe, expect, it } from "vitest";
import {
  CUSTOMER_DETAIL_LIMITS,
  validateCustomerDetails,
} from "./customer-details";

const validInput = {
  displayName: " Oakfield Lettings ",
  legalName: " Oakfield Lettings Limited ",
  companyNumber: " ab123456 ",
  primaryEmail: " HELLO@OAKFIELD.TEST ",
  telephone: " 020 7946 0998 ",
  website: " https://oakfield.example ",
  registeredAddress1: " 1 Example Square ",
  registeredAddress2: " ",
  registeredTownCity: " Demo Town ",
  registeredCounty: " London ",
  registeredPostcode: " zz1 1zz ",
};

describe("customer details", () => {
  it("normalises a valid customer profile", () => {
    expect(validateCustomerDetails(validInput)).toEqual({
      ok: true,
      details: {
        displayName: "Oakfield Lettings",
        legalName: "Oakfield Lettings Limited",
        companyNumber: "AB123456",
        primaryEmail: "hello@oakfield.test",
        telephone: "020 7946 0998",
        website: "https://oakfield.example",
        registeredAddress1: "1 Example Square",
        registeredAddress2: null,
        registeredTownCity: "Demo Town",
        registeredCounty: "London",
        registeredPostcode: "ZZ1 1ZZ",
      },
    });
  });

  it("requires a customer name and validates email and website", () => {
    const result = validateCustomerDetails({
      ...validInput,
      displayName: " ",
      primaryEmail: "not-an-email",
      website: "oakfield.example",
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        displayName: "Enter a customer name.",
        primaryEmail: "Enter a valid email address.",
        website: "Enter a valid website address.",
      },
    });
  });

  it("enforces database length limits", () => {
    const result = validateCustomerDetails({
      ...validInput,
      legalName: "a".repeat(CUSTOMER_DETAIL_LIMITS.legalName + 1),
      registeredPostcode: "a".repeat(CUSTOMER_DETAIL_LIMITS.postcode + 1),
    });

    expect(result).toEqual({
      ok: false,
      fieldErrors: {
        legalName: "Use 160 characters or fewer.",
        registeredPostcode: "Use 16 characters or fewer.",
      },
    });
  });
});
