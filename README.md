# Zayto

Zayto is a UK residential lettings and property management CRM for letting agencies. Residential sales will be added later.

**Status:** proof of concept. The login page is visual only (light, dark and system themes). PostgreSQL on Supabase (London) is connected via Prisma; there are no tables and no real sign-in yet. See `docs/ROADMAP.md`.

## Running it locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000/login.

## Checks

| Command              | What it does                                               |
| -------------------- | ---------------------------------------------------------- |
| `npm run check`      | Runs typecheck, lint, format check and unit tests together |
| `npm run typecheck`  | Checks TypeScript types                                    |
| `npm run lint`       | Looks for likely bugs and bad patterns (ESLint)            |
| `npm run format`     | Rewrites files into the standard format (Prettier)         |
| `npm run test`       | Runs unit tests (Vitest)                                   |
| `npm run test:e2e`   | Runs browser tests (Playwright)                            |
| `npm run db:migrate` | Creates and applies a database structure change (Prisma)   |

## Stack

Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Prisma 7, PostgreSQL (Supabase, London).

## Documentation

Product, architecture and decisions live in `docs/`. Instructions for AI assistants are in `AGENTS.md` and `.cursor/rules/`.
