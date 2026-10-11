# Integrations

No third-party SDKs are installed. Do not call live providers unless the user enables a named integration.

## Strategy (confirmed)

- Define a **TypeScript interface** per capability.
- Put the real vendor behind that interface.
- Ship a **mock** implementation for local development.
- Keep secrets on the server.
- Record every call attempt in an integration audit (when the jobs/audit tables exist).

## Capability interfaces (proposed)

| Interface | Examples (not contracted) | Notes |
| --- | --- | --- |
| `PortalPublisher` | Rightmove, Zoopla, OnTheMarket | Publish/update/unpublish listing |
| `ReferenceProvider` | Referencing firms | Create order, poll or webhook status |
| `IdentityProvider` | AML/KYC/ID vendors | Orders and result artefacts |
| `RightToRentProvider` | If separate from identity | Placeholder |
| `InsuranceProvider` | Rent guarantee etc. | Quotes/bind only when specified |
| `EsignProvider` | DocuSign, Dropbox Sign, etc. | Envelope lifecycle |
| `PaymentsProvider` | Rent collection | PCI: never store raw card data |
| `StorageProvider` | S3-compatible / similar | Private documents |
| `EmailProvider` | Transactional email | Later |

Vendor names above are **illustrative**, not selected.

## Webhooks (confirmed requirements when we add them)

- Verify signatures (or equivalent) before processing.
- Idempotency: the same event id must not double-apply money or status.
- Respond quickly; heavy work goes to a job.
- Unknown event types: log and store raw payload securely; do not crash.

## Failure (confirmed)

Timeouts on outbound HTTP. Retries with backoff for transient errors. Give up with a visible failed job, not a silent loop. Do not mark a listing “live on portal” unless the provider accepted it.

## What we will not do

- Invent REST paths for a portal
- Hard-code a vendor in React components
- Log ID scans, full account numbers, or raw webhook secrets
