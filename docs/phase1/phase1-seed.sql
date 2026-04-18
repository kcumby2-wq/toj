-- Subject Media Platform - Phase 1 Seed Data
-- Run after phase1-schema.sql

BEGIN;

-- Organizations
INSERT INTO organizations (id, name, type)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Subject Media', 'agency'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Trails of Joy', 'client'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Xpand Sports', 'client')
ON CONFLICT (id) DO NOTHING;

-- Users (password hash placeholder for Password123)
INSERT INTO users (id, email, password_hash, full_name, status)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'owner@subjectmedia.com', '$2a$10$KuzP.pioA5PP4ghxG3hmNu2xVoLy1N6bof4N0PtyX76nnGRwV90Uy', 'Agency Owner', 'active'),
  ('22222222-2222-2222-2222-222222222222', 'ops@subjectmedia.com', '$2a$10$KuzP.pioA5PP4ghxG3hmNu2xVoLy1N6bof4N0PtyX76nnGRwV90Uy', 'Operations Manager', 'active'),
  ('33333333-3333-3333-3333-333333333333', 'clientadmin@trailsofjoy.com', '$2a$10$KuzP.pioA5PP4ghxG3hmNu2xVoLy1N6bof4N0PtyX76nnGRwV90Uy', 'TOJ Client Admin', 'active')
ON CONFLICT (id) DO NOTHING;

-- Memberships
INSERT INTO memberships (id, user_id, organization_id, role, permissions_json)
VALUES
  ('d1111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agency_owner', '{"all": true}'::jsonb),
  ('d2222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'agency_member', '{"campaigns": true, "leads": true, "reports": true}'::jsonb),
  ('d3333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'client_admin', '{"dashboard": true, "leads": true}'::jsonb)
ON CONFLICT (user_id, organization_id) DO NOTHING;

-- Clients
INSERT INTO clients (id, client_org_id, agency_org_id, onboarding_status, account_status, stripe_customer_id, stripe_subscription_id)
VALUES
  ('e1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'completed', 'active', 'cus_TOJ001', 'sub_TOJ001'),
  ('e2222222-2222-2222-2222-222222222222', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'in_progress', 'active', 'cus_XPAND001', NULL)
ON CONFLICT (id) DO NOTHING;

-- Campaigns
INSERT INTO campaigns (id, client_org_id, name, status, goal_summary, budget_amount, starts_on, ends_on, created_by)
VALUES
  ('f1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TOJ Spring Creator Push', 'active', 'Drive qualified lead volume from social and events', 7500, '2026-04-01', '2026-06-30', '11111111-1111-1111-1111-111111111111'),
  ('f2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TOJ Event QR Campaign', 'active', 'Track scans and convert event traffic to leads', 4200, '2026-04-10', '2026-05-31', '22222222-2222-2222-2222-222222222222')
ON CONFLICT (id) DO NOTHING;

-- Campaign Assets
INSERT INTO campaign_assets (id, campaign_id, client_org_id, type, source, medium, campaign_param, content, term, tracking_url, qr_url)
VALUES
  ('a1000000-0000-0000-0000-000000000001', 'f1111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'utm_link', 'instagram', 'social', 'toj_spring_creator_push', 'link_in_bio', NULL, 'https://subjectmedia.xpandsports.com/?utm_source=instagram&utm_medium=social&utm_campaign=toj_spring_creator_push&utm_content=link_in_bio', NULL),
  ('a1000000-0000-0000-0000-000000000002', 'f2222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'qr_code', 'event', 'offline', 'toj_event_qr', 'booth_card', NULL, 'https://subjectmedia.xpandsports.com/?utm_source=event&utm_medium=offline&utm_campaign=toj_event_qr&utm_content=booth_card', 'https://cdn.subjectmedia.com/qr/toj_event_qr.png')
ON CONFLICT (id) DO NOTHING;

-- Tracking Events
INSERT INTO tracking_events (id, client_org_id, campaign_id, asset_id, type, event_time, referrer, source, device_type, ip_hash, user_agent, revenue_amount, meta_json)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f1111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'click', NOW() - INTERVAL '3 days', 'https://instagram.com', 'instagram', 'mobile', 'hash1', 'Mozilla/5.0 iPhone', NULL, '{"utm_content":"link_in_bio"}'::jsonb),
  ('b1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'a1000000-0000-0000-0000-000000000002', 'scan', NOW() - INTERVAL '1 day', NULL, 'event', 'mobile', 'hash2', 'Mozilla/5.0 Android', NULL, '{"location":"expo_hall"}'::jsonb),
  ('b1000000-0000-0000-0000-000000000003', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f1111111-1111-1111-1111-111111111111', 'a1000000-0000-0000-0000-000000000001', 'conversion', NOW() - INTERVAL '12 hours', 'https://instagram.com', 'instagram', 'desktop', 'hash3', 'Mozilla/5.0 Windows', 3200, '{"order_id":"SM-3200"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Leads
INSERT INTO leads (id, client_org_id, campaign_id, source, full_name, email, phone, status, revenue_amount, converted_at, notes)
VALUES
  ('c1000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f1111111-1111-1111-1111-111111111111', 'instagram', 'Taylor Reid', 'taylor@demo.com', '555-1001', 'won', 3200, NOW() - INTERVAL '10 hours', 'Converted from creator landing page'),
  ('c1000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'event', 'Jordan Blake', 'jordan@demo.com', '555-1002', 'qualified', 0, NULL, 'Requested callback after event')
ON CONFLICT (id) DO NOTHING;

-- Deliverables
INSERT INTO deliverables (id, client_org_id, campaign_id, title, description, status, due_date, owner_user_id, completed_at)
VALUES
  ('d9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f1111111-1111-1111-1111-111111111111', 'Landing Page Build', 'Design and publish creator portal landing page', 'completed', '2026-04-05', '22222222-2222-2222-2222-222222222222', NOW() - INTERVAL '12 days'),
  ('d9000000-0000-0000-0000-000000000002', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'f2222222-2222-2222-2222-222222222222', 'Event QR Print Cards', 'Produce QR cards for booth activation', 'in_progress', '2026-04-25', '22222222-2222-2222-2222-222222222222', NULL)
ON CONFLICT (id) DO NOTHING;

-- Messaging
INSERT INTO message_threads (id, client_org_id, subject)
VALUES
  ('e9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Weekly performance check-in')
ON CONFLICT (id) DO NOTHING;

INSERT INTO messages (id, thread_id, client_org_id, sender_user_id, body, created_at)
VALUES
  ('f9000000-0000-0000-0000-000000000001', 'e9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '11111111-1111-1111-1111-111111111111', 'Great progress this week. Conversions are up 18%.', NOW() - INTERVAL '2 days'),
  ('f9000000-0000-0000-0000-000000000002', 'e9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '33333333-3333-3333-3333-333333333333', 'Awesome. Can we prioritize event follow-up automation next?', NOW() - INTERVAL '1 day')
ON CONFLICT (id) DO NOTHING;

-- Billing
INSERT INTO invoices (id, client_org_id, stripe_invoice_id, amount, currency, status, issued_at, paid_at)
VALUES
  ('a9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'in_TOJ_001', 12500, 'USD', 'paid', NOW() - INTERVAL '25 days', NOW() - INTERVAL '24 days')
ON CONFLICT (id) DO NOTHING;

INSERT INTO billing_events (id, client_org_id, stripe_event_id, event_type, payload_json, processed_at)
VALUES
  ('b9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'evt_001', 'invoice.paid', '{"invoice":"in_TOJ_001"}'::jsonb, NOW() - INTERVAL '24 days')
ON CONFLICT (id) DO NOTHING;

-- Report snapshots
INSERT INTO report_snapshots (id, client_org_id, report_type, period_start, period_end, payload_json)
VALUES
  ('c9000000-0000-0000-0000-000000000001', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'summary', '2026-04-01', '2026-04-30', '{"clicks":214,"leads":37,"conversions":11,"revenue":27800}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- Audit logs
INSERT INTO audit_logs (id, actor_user_id, client_org_id, action, entity_type, entity_id, before_json, after_json)
VALUES
  ('d8000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'lead_status_changed', 'lead', 'c1000000-0000-0000-0000-000000000001', '{"status":"qualified"}'::jsonb, '{"status":"won"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- -----------------------------------------------------
-- OPTIONAL REGRESSION CHECKS (safe in transaction)
-- -----------------------------------------------------
-- Proves cross-tenant campaign/asset links are rejected.
-- Expected: NOTICE is raised, row is not kept.
SAVEPOINT seed_regression_checks;

DO $$
BEGIN
  BEGIN
    INSERT INTO campaign_assets (id, campaign_id, client_org_id, type, source, medium, campaign_param)
    VALUES (
      'a1000000-0000-0000-0000-000000000099',
      'f1111111-1111-1111-1111-111111111111',
      'cccccccc-cccc-cccc-cccc-cccccccccccc',
      'utm_link',
      'regression',
      'test',
      'cross_tenant_should_fail'
    );
    RAISE EXCEPTION 'Expected foreign key violation did not occur for cross-tenant insert';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE 'PASS: cross-tenant insert blocked by tenancy guard';
  END;
END$$;

ROLLBACK TO SAVEPOINT seed_regression_checks;
RELEASE SAVEPOINT seed_regression_checks;

COMMIT;
