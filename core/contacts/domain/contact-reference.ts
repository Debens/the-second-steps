import { randomBytes } from "node:crypto";

const REFERENCE_ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function createContactReference(kind: "person" | "organisation") {
  const bytes = randomBytes(8);
  const suffix = Array.from(
    bytes,
    (byte) => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length],
  ).join("");
  return `${kind === "person" ? "PER" : "ORG"}-${suffix}`;
}
