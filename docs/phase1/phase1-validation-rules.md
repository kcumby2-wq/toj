# Phase 1 Validation Rules

This file is the quick-reference validation checklist for backend and frontend teams.

## Campaigns

- `status` must be one of: `draft`, `active`, `paused`, `completed`, `archived`.
- `budgetAmount` must be `>= 0` when provided.
- If both `startsOn` and `endsOn` are provided, `startsOn <= endsOn`.

## Tracking Events

- `type` must be one of: `click`, `scan`, `pageview`, `lead_submit`, `conversion`.
- `revenueAmount` must be `>= 0` when provided.
- `assetId`, when provided, must belong to the same tenant as the selected campaign/client scope.

## Leads

- `status` must be one of: `new`, `qualified`, `contacted`, `proposal`, `won`, `lost`.
- `revenueAmount` must be `>= 0`.

## Deliverables

- `status` must be one of: `pending`, `in_progress`, `completed`, `blocked`.

## Invoices

- `status` must be one of: `draft`, `open`, `paid`, `void`, `uncollectible`.
- `amount` must be `>= 0`.

## Report Snapshots

- `periodStart <= periodEnd`.

## Tenant Integrity Rules

- Assets cannot reference campaigns from a different tenant.
- Tracking events cannot reference campaign/assets from a different tenant.
- Leads cannot reference campaigns from a different tenant.
- Deliverables cannot reference campaigns from a different tenant.
- Messages cannot reference threads from a different tenant.

## Database Automation

- `updated_at` is auto-maintained by DB triggers for: organizations, users, clients, campaigns, leads, deliverables.
- Application code should not rely on client-supplied `updated_at` values.

## RLS Rollout

- An optional RLS template is included in the schema for tenant-scoped tables.
- Set `app.current_client_org_id` per request before tenant-scoped queries.
- Keep API membership checks even after enabling RLS (defense in depth).

## Suggested API Error Mapping

- Validation failures: `400 Bad Request`.
- Cross-tenant or relational conflicts: `409 Conflict` (or `422 Unprocessable Entity` if preferred).
- Missing tenant-scoped entities: `404 Not Found`.

## Smoke Test Script

- File: `docs/phase1/phase1-smoke.sql`
- Purpose: verifies updated_at trigger behavior and key tenant/integrity constraints.
- Safety: runs in a transaction and ends with `ROLLBACK` (no data persisted).
- Run via npm script: `npm run db:smoke`
- Full reset + seed + smoke: `npm run db:reset`
- Run (example): `psql "$DATABASE_URL" -f docs/phase1/phase1-smoke.sql`
