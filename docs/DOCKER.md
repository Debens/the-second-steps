# Running Zayto in Docker (proof of concept)

This packages the app so it can run on another computer with Docker installed. It is for the proof of concept only. It is **not** a production deployment.

## What it is, and one thing to know

The container runs the app in **development mode**. That is deliberate: the sandbox quick sign-in only exists outside production (production has no email delivery yet, so a production build could not be signed in to). Quick sign-in lets anyone who can open the address sign in as a fictional demo user, including the Account Owner.

The container connects to the shared **development Supabase database**, which holds only fictional demo data. Because of this:

- Do not put the container on the open internet without something in front of it (for example a password-protecting proxy, or a private network or VPN).
- Never reuse this setup with real customer data.

## Secrets

Nothing secret is built into the image (`.dockerignore` excludes every `.env*` file). The host supplies them at run time in a file called `.env.docker`, which is ignored by git. The project owner shares the values separately (not by email, chat or the repository):

| Setting                                                            | Notes                                                                           |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                     | The app's runtime database login. Never give the container the migration login. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Public Supabase details.                                                        |
| `SUPABASE_SECRET_KEY`                                              | Server-only key. Treat as a password.                                           |
| `NEXT_PUBLIC_APP_URL`                                              | The address people will open, for example `http://localhost:3000`.              |

## Running it

1. Install Docker.
2. Copy `.env.docker.example` to `.env.docker` and fill in the values.
3. From the project folder: `docker compose -f compose.app.yaml up --build`
4. Open `http://localhost:3000` and choose a sandbox user (for example Olivia Hart, the Account Owner).

Stop it with `Ctrl+C`, or run in the background with `docker compose -f compose.app.yaml up -d --build` and stop it with `docker compose -f compose.app.yaml down`.

## Sharing the image instead of the code

On the owner's computer: `docker build -t zayto-app:poc .` then `docker save zayto-app:poc -o zayto-app.tar`. On the other computer: `docker load -i zayto-app.tar`, then `docker run -d -p 3000:3000 --env-file .env.docker zayto-app:poc`. When using `docker run`, write the values in `.env.docker` **without quotes** (unlike compose, `docker run` keeps quotation marks as part of the value).

## Limits

- The first page load after starting is slow because development mode compiles pages on demand.
- The database is shared, so changes made through the container appear for everyone using the same Supabase project.
- The container cannot apply database migrations (it has no migration login), by design.
