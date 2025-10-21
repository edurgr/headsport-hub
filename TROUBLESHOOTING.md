### HEAD Hub — Troubleshooting Guide

This document lists common local build/run issues and how to fix them.

#### Build fails: Supabase env vars missing at build time

Symptoms:

```
Error: Supabase env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
```

Cause: The client was throwing at import time when env vars were not present.

Fix:
- Copy `app/env.example` to `app/.env.local` and fill real values.
- For offline/local smoke builds, safe placeholders are used so the build completes. Functionality that needs Supabase will not work without real keys.

Commands:

```bash
cd app
cp env.example .env.local
npm run build
```

#### ESLint warning: .eslintignore no longer supported

Symptoms:

```
ESLintIgnoreWarning: The ".eslintignore" file is no longer supported.
```

Cause: ESLint Flat Config deprecates `.eslintignore`.

Fix options:
- Migrate patterns into `ignores` inside `app/eslint.config.mjs` (already present).
- Remove the legacy `.eslintignore` file if present.

#### Next.js plugin not detected in ESLint

Symptoms:

```
The Next.js plugin was not detected in your ESLint configuration.
```

Cause: `next.settings.rootDir` pointed to a monorepo pattern.

Fix:
- Updated `app/eslint.config.mjs` to `settings.next.rootDir = ['.']`.

#### Full quality check locally

```bash
cd app
npm ci
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

#### Environment variables checklist

Required for full functionality (see `app/env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only ops)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL`
- Email service keys (e.g., `SENDGRID_API_KEY`) if email flows are exercised

Notes:
- Values prefixed with `NEXT_PUBLIC_` are exposed to the browser; do not put secrets there.
- For production, set envs in your hosting platform (e.g., Cloudflare Pages).


