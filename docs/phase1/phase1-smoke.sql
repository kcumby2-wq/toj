-- Subject Media Platform - Phase 1 Smoke Tests
-- Run after phase1-schema.sql and phase1-seed.sql
-- This script performs assertions and always rolls back.

BEGIN;

-- 1) updated_at trigger should refresh timestamp on row update
DO $$
DECLARE
  v_before TIMESTAMPTZ;
  v_after TIMESTAMPTZ;
BEGIN
  SELECT updated_at
  INTO v_before
  FROM campaigns
  WHERE id = 'f1111111-1111-1111-1111-111111111111';

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'Smoke test failed: expected seeded campaign row was not found';
  END IF;

  UPDATE campaigns
  SET goal_summary = CONCAT(COALESCE(goal_summary, ''), ' [smoke-check]')
  WHERE id = 'f1111111-1111-1111-1111-111111111111';

  SELECT updated_at
  INTO v_after
  FROM campaigns
  WHERE id = 'f1111111-1111-1111-1111-111111111111';

  IF v_after <= v_before THEN
    RAISE EXCEPTION 'Smoke test failed: updated_at trigger did not advance timestamp';
  END IF;

  RAISE NOTICE 'PASS: updated_at trigger advanced campaigns.updated_at';
END$$;

-- 2) Cross-tenant asset insert should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO campaign_assets (id, campaign_id, client_org_id, type, source, medium, campaign_param)
    VALUES (
      'a1000000-0000-0000-0000-0000000000aa',
      'f1111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'utm_link',
      'smoke',
      'test',
      'cross_tenant_fail'
    );

    RAISE EXCEPTION 'Smoke test failed: expected foreign_key_violation was not raised';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'PASS: cross-tenant campaign_assets insert blocked';
  END;
END$$;

-- 3) Non-negative invoice amount check should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO invoices (id, client_org_id, stripe_invoice_id, amount, currency, status)
    VALUES (
      'a9000000-0000-0000-0000-0000000000aa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'in_smoke_negative',
      -1,
      'USD',
      'draft'
    );

    RAISE EXCEPTION 'Smoke test failed: expected check_violation was not raised (invoice amount)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: negative invoice amount blocked';
  END;
END$$;

-- 4) Campaign date window check should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO campaigns (id, client_org_id, name, starts_on, ends_on)
    VALUES (
      'f3000000-0000-0000-0000-0000000000aa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'Invalid Date Window Campaign',
      DATE '2026-08-01',
      DATE '2026-07-01'
    );

    RAISE EXCEPTION 'Smoke test failed: expected check_violation was not raised (campaign date window)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: invalid campaign date window blocked';
  END;
END$$;

-- 5) Non-negative lead revenue check should fail
DO $$
BEGIN
  BEGIN
    INSERT INTO leads (id, client_org_id, campaign_id, status, revenue_amount)
    VALUES (
      'c1000000-0000-0000-0000-0000000000aa',
      'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
      'f1111111-1111-1111-1111-111111111111',
      'new',
      -10
    );

    RAISE EXCEPTION 'Smoke test failed: expected check_violation was not raised (lead revenue)';
  EXCEPTION
    WHEN check_violation THEN
      RAISE NOTICE 'PASS: negative lead revenue blocked';
  END;
END$$;

ROLLBACK;

-- If you saw only PASS notices and no exceptions, smoke tests passed.
