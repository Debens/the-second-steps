import { createHmac, randomUUID } from "node:crypto";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { Pool } from "pg";
import {
  getSupabasePublicEnvironment,
  getSupabaseSecretKey,
} from "@/core/auth/env";
import { databaseSsl, databaseUrl } from "@/core/db/connection";

type MailpitMessageSummary = {
  ID: string;
  To: Array<{ Address: string }>;
};

type MailpitMessages = {
  messages: MailpitMessageSummary[];
};

type MailpitMessage = {
  Text: string;
};

const PERSONAS = [
  {
    email: "owner@zayto.local",
    expectedUrl: /\/dashboard\/w\/oakfield-lettings-demo$/,
    expectedHeading: "Dashboard",
    deniedUrl: "/platform",
  },
  {
    email: "platform.owner@zayto.local",
    expectedUrl: /\/platform$/,
    expectedHeading: "Platform overview",
    deniedUrl: "/dashboard/w/oakfield-lettings-demo",
  },
  {
    email: "dual.owner@zayto.local",
    expectedUrl: /\/dashboard$/,
    expectedHeading: "Where would you like to work?",
    deniedUrl: null,
  },
  {
    email: "no.access@zayto.local",
    expectedUrl: /\/dashboard$/,
    expectedHeading: "Access has not been granted",
    deniedUrl: "/dashboard/w/oakfield-lettings-demo",
  },
] as const;
const RUN_AUTH_MUTATION_E2E = process.env.RUN_AUTH_MUTATION_E2E === "true";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function createSupabaseTestAdminClient() {
  const { url } = getSupabasePublicEnvironment();

  return createClient(url, getSupabaseSecretKey(), {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

function decodeBase32(value: string) {
  let bits = "";
  for (const character of value.replace(/=+$/g, "").toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(character);
    if (index < 0) throw new Error("Unexpected TOTP secret format.");
    bits += index.toString(2).padStart(5, "0");
  }

  const bytes: number[] = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}

function currentTotp(secret: string) {
  const counter = Math.floor(Date.now() / 30_000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decodeBase32(secret))
    .update(buffer)
    .digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);
  return (binary % 1_000_000).toString().padStart(6, "0");
}

async function deleteTestFactors(email: string) {
  const supabase = createSupabaseTestAdminClient();
  const { data: users, error: usersError } =
    await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (usersError) throw usersError;

  const user = users.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  if (!user) return;

  const { data: factors, error: factorsError } =
    await supabase.auth.admin.mfa.listFactors({ userId: user.id });
  if (factorsError) throw factorsError;

  for (const factor of factors.factors) {
    const { error } = await supabase.auth.admin.mfa.deleteFactor({
      userId: user.id,
      id: factor.id,
    });
    if (error) throw error;
  }
}

async function authSubjectFor(email: string) {
  const supabase = createSupabaseTestAdminClient();
  const { data: users, error } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (error) throw error;

  const user = users.users.find(
    (candidate) => candidate.email?.toLowerCase() === email,
  );
  if (!user) throw new Error(`Sandbox identity ${email} was not found.`);
  return user.id;
}

async function setZaytoMfaAudience(enabled: boolean) {
  const authSubject = await authSubjectFor("platform.owner@zayto.local");
  const pool = new Pool({
    connectionString: databaseUrl(),
    ssl: databaseSsl(),
  });
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    await client.query("SELECT set_config('app.auth_subject', $1, true)", [
      authSubject,
    ]);
    const identity = await client.query<{ user_identity_id: string }>(
      `SELECT "user_identity_id"
       FROM "authentication_provider_links"
       WHERE "provider" = 'supabase' AND "provider_subject" = $1::uuid`,
      [authSubject],
    );
    const userIdentityId = identity.rows[0]?.user_identity_id;
    if (!userIdentityId)
      throw new Error("Platform test identity was not linked.");

    await client.query("SELECT set_config('app.user_identity_id', $1, true)", [
      userIdentityId,
    ]);
    const platformRole = await client.query(
      `SELECT 1
       FROM "platform_role_assignments"
       WHERE "user_identity_id" = $1::uuid
         AND "role_code" = 'platform_owner'
         AND "status" = 'active'`,
      [userIdentityId],
    );
    if (platformRole.rowCount !== 1) {
      throw new Error(
        "Platform test identity is not an active Platform Owner.",
      );
    }
    await client.query("SELECT set_config('app.platform_owner', 'true', true)");

    const updated = await client.query(
      `UPDATE "feature_flags"
       SET "global_enabled" = false,
           "zayto_users_enabled" = $1,
           "updated_at" = CURRENT_TIMESTAMP
       WHERE "key" = 'staff_mfa' AND "status" = 'active'`,
      [enabled],
    );
    if (updated.rowCount !== 1)
      throw new Error("Staff MFA flag was not found.");

    await client.query(
      `INSERT INTO "audit_events" (
         "actor_user_identity_id", "action", "outcome", "target_type",
         "target_id", "request_id", "metadata"
       ) VALUES ($1::uuid, 'feature_flag.test_control', 'succeeded',
         'feature_flag', 'staff_mfa', $2, $3::jsonb)`,
      [
        userIdentityId,
        randomUUID(),
        JSON.stringify({ zaytoUsersEnabled: enabled }),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function latestMagicLink(
  request: APIRequestContext,
  email: string,
): Promise<string> {
  await expect
    .poll(
      async () => {
        const response = await request.get(
          "http://127.0.0.1:8025/api/v1/messages",
        );
        if (!response.ok()) return null;

        const data = (await response.json()) as MailpitMessages;
        return (
          data.messages.find((message) =>
            message.To.some(
              (recipient) => recipient.Address.toLowerCase() === email,
            ),
          )?.ID ?? null
        );
      },
      { timeout: 10_000 },
    )
    .not.toBeNull();

  const summariesResponse = await request.get(
    "http://127.0.0.1:8025/api/v1/messages",
  );
  const summaries = (await summariesResponse.json()) as MailpitMessages;
  const messageId = summaries.messages.find((message) =>
    message.To.some((recipient) => recipient.Address.toLowerCase() === email),
  )?.ID;
  if (!messageId) throw new Error("Mailpit message was not found.");

  const messageResponse = await request.get(
    `http://127.0.0.1:8025/api/v1/message/${messageId}`,
  );
  const message = (await messageResponse.json()) as MailpitMessage;
  const link = message.Text.match(/https?:\/\/[^\s]+/)?.[0];
  if (!link)
    throw new Error("Magic link was not found in the Mailpit message.");

  return link;
}

async function openMagicLink(
  page: Page,
  request: APIRequestContext,
  email: string,
) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(
    page.getByText(/sign-in link is now in the local mail sandbox/i),
  ).toBeVisible();

  const link = await latestMagicLink(request, email);
  const callback = new URL(link);
  const appOrigin = new URL(page.url()).origin;
  await page.goto(`${appOrigin}${callback.pathname}${callback.search}`);
}

async function completeMfa(page: Page) {
  const secret = await page.getByTestId("totp-secret").textContent();
  if (!secret) throw new Error("TOTP secret was not shown.");

  await page.getByLabel("Six-digit code").fill(currentTotp(secret));
  await page.getByRole("button", { name: "Continue securely" }).click();
}

test.describe("sandbox access personas", () => {
  test.describe.configure({ mode: "serial" });

  for (const persona of PERSONAS) {
    test(`${persona.email} reaches only its authorised context`, async ({
      page,
      request,
    }) => {
      await openMagicLink(page, request, persona.email);
      await expect(page).toHaveURL(persona.expectedUrl);
      await expect(
        page.getByRole("heading", { name: persona.expectedHeading }),
      ).toBeVisible();

      if (persona.email === "platform.owner@zayto.local") {
        await page.goto("/platform/feature-flags");
        await expect(
          page.getByRole("heading", { name: "Feature flags" }),
        ).toBeVisible();
      }

      if (persona.deniedUrl) {
        await page.goto(persona.deniedUrl);
        await expect(page).toHaveURL(/\/access-denied$/);
        await expect(
          page.getByRole("heading", { name: "Access denied" }),
        ).toBeVisible();
      }
    });
  }

  test("the Zayto testing audience can require MFA independently", async ({
    page,
    request,
  }) => {
    test.skip(
      !RUN_AUTH_MUTATION_E2E,
      "Requires explicit approval because it changes shared sandbox Auth factors and feature flags.",
    );
    await deleteTestFactors("platform.owner@zayto.local");
    await setZaytoMfaAudience(true);
    try {
      await openMagicLink(page, request, "platform.owner@zayto.local");
      await expect(page).toHaveURL(/\/mfa\?next=/);
      await expect(
        page.getByRole("heading", { name: "Two-step verification" }),
      ).toBeVisible();
      await completeMfa(page);
      await expect(page).toHaveURL(/\/platform$/);
      await expect(
        page.getByRole("heading", { name: "Platform overview" }),
      ).toBeVisible();

      await page.goto("/platform/feature-flags");
      const zaytoAudience = page.getByRole("checkbox", {
        name: /Zayto users/i,
      });
      await expect(zaytoAudience).toBeChecked();
      await zaytoAudience.uncheck();
      await page.getByRole("button", { name: "Save audiences" }).click();
      await expect(page.getByRole("status")).toHaveText(
        "Feature flag settings saved.",
      );
    } finally {
      await setZaytoMfaAudience(false);
      await deleteTestFactors("platform.owner@zayto.local");
    }
  });
});
