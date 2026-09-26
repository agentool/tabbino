<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Product copy

Every UI label must serve a function: an action, a status, or an actual explanation. No slogans or decorative marketing copy. Keep useful constraints such as accepted image formats and upload limits. Reviewers must apply this rule throughout the full flow.

## Personal data

Never commit personal receiving wallets, payment emails, receipt photos, credentials, or account-specific configuration. Guest bills have empty payment destinations. Signed-in users may use their own privately stored payment profile for new bills where they are the payer. Never apply one user’s defaults to another payer or change existing shared bills automatically. Signed-in participant details come from the active session at runtime.

## Deployment branches

Follow docs/deployment.md: main deploys staging, prod deploys production. Independent/named reviews remain required; merge an exact PR revision only after they pass. Never auto-promote main to prod.
