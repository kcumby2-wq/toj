-- Subject Media Platform - Phase 1 SQL Schema
-- PostgreSQL 15+

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- -----------------------------------------------------
-- ENUMS
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'organization_type') THEN
    CREATE TYPE organization_type AS ENUM ('agency', 'client');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
    CREATE TYPE membership_role AS ENUM ('agency_owner', 'agency_member', 'client_admin', 'client_user');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaign_status') THEN
    CREATE TYPE campaign_status AS ENUM ('draft', 'active', 'paused', 'completed', 'archived');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'asset_type') THEN
    CREATE TYPE asset_type AS ENUM ('utm_link', 'qr_code');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'event_type') THEN
    CREATE TYPE event_type AS ENUM ('click', 'scan', 'pageview', 'lead_submit', 'conversion');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
    CREATE TYPE lead_status AS ENUM ('new', 'qualified', 'contacted', 'proposal', 'won', 'lost');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'deliverable_status') THEN
    CREATE TYPE deliverable_status AS ENUM ('pending', 'in_progress', 'completed', 'blocked');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    CREATE TYPE invoice_status AS ENUM ('draft', 'open', 'paid', 'void', 'uncollectible');
  END IF;
END$$;

-- -----------------------------------------------------
-- CORE TABLES
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type organization_type NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  role membership_role NOT NULL,
  permissions_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, organization_id)
);

CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL UNIQUE REFERENCES organizations(id) ON DELETE CASCADE,
  agency_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
  onboarding_status TEXT NOT NULL DEFAULT 'started',
  account_status TEXT NOT NULL DEFAULT 'active',
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT clients_org_type_guard CHECK (client_org_id <> agency_org_id)
);

-- -----------------------------------------------------
-- CAMPAIGNS + ASSETS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  goal_summary TEXT,
  budget_amount NUMERIC(12,2),
  starts_on DATE,
  ends_on DATE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_budget_nonnegative CHECK (budget_amount IS NULL OR budget_amount >= 0),
  CONSTRAINT campaigns_date_window CHECK (starts_on IS NULL OR ends_on IS NULL OR starts_on <= ends_on)
);

CREATE TABLE IF NOT EXISTS campaign_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type asset_type NOT NULL,
  source TEXT,
  medium TEXT,
  campaign_param TEXT,
  content TEXT,
  term TEXT,
  tracking_url TEXT,
  qr_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- TRACKING + LEADS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS tracking_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES campaign_assets(id) ON DELETE SET NULL,
  type event_type NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer TEXT,
  source TEXT,
  device_type TEXT,
  ip_hash TEXT,
  user_agent TEXT,
  revenue_amount NUMERIC(12,2),
  meta_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT tracking_events_revenue_nonnegative CHECK (revenue_amount IS NULL OR revenue_amount >= 0)
);

CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  source TEXT,
  full_name TEXT,
  email CITEXT,
  phone TEXT,
  status lead_status NOT NULL DEFAULT 'new',
  revenue_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  converted_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT leads_revenue_nonnegative CHECK (revenue_amount >= 0)
);

-- -----------------------------------------------------
-- DELIVERY + COMMS
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status deliverable_status NOT NULL DEFAULT 'pending',
  due_date DATE,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subject TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES message_threads(id) ON DELETE CASCADE,
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- BILLING + REPORTING + AUDIT
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_invoice_id TEXT UNIQUE,
  amount NUMERIC(12,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status invoice_status NOT NULL DEFAULT 'draft',
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoices_amount_nonnegative CHECK (amount >= 0)
);

CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  stripe_event_id TEXT UNIQUE,
  event_type TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS report_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  report_type TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  payload_json JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT report_snapshots_period_window CHECK (period_start <= period_end)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  client_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_json JSONB,
  after_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------
-- TENANCY GUARDS
-- -----------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_campaigns_id_client_org') THEN
    ALTER TABLE campaigns
      ADD CONSTRAINT uq_campaigns_id_client_org UNIQUE (id, client_org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_campaign_assets_id_client_org') THEN
    ALTER TABLE campaign_assets
      ADD CONSTRAINT uq_campaign_assets_id_client_org UNIQUE (id, client_org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_message_threads_id_client_org') THEN
    ALTER TABLE message_threads
      ADD CONSTRAINT uq_message_threads_id_client_org UNIQUE (id, client_org_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_assets_campaign_client_guard') THEN
    ALTER TABLE campaign_assets
      ADD CONSTRAINT fk_assets_campaign_client_guard
      FOREIGN KEY (campaign_id, client_org_id)
      REFERENCES campaigns (id, client_org_id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_campaign_client_guard') THEN
    ALTER TABLE tracking_events
      ADD CONSTRAINT fk_events_campaign_client_guard
      FOREIGN KEY (campaign_id, client_org_id)
      REFERENCES campaigns (id, client_org_id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_events_asset_client_guard') THEN
    ALTER TABLE tracking_events
      ADD CONSTRAINT fk_events_asset_client_guard
      FOREIGN KEY (asset_id, client_org_id)
      REFERENCES campaign_assets (id, client_org_id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_leads_campaign_client_guard') THEN
    ALTER TABLE leads
      ADD CONSTRAINT fk_leads_campaign_client_guard
      FOREIGN KEY (campaign_id, client_org_id)
      REFERENCES campaigns (id, client_org_id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_deliverables_campaign_client_guard') THEN
    ALTER TABLE deliverables
      ADD CONSTRAINT fk_deliverables_campaign_client_guard
      FOREIGN KEY (campaign_id, client_org_id)
      REFERENCES campaigns (id, client_org_id)
      ON DELETE NO ACTION;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_messages_thread_client_guard') THEN
    ALTER TABLE messages
      ADD CONSTRAINT fk_messages_thread_client_guard
      FOREIGN KEY (thread_id, client_org_id)
      REFERENCES message_threads (id, client_org_id)
      ON DELETE CASCADE;
  END IF;
END$$;

-- -----------------------------------------------------
-- INDEXES
-- -----------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_memberships_org ON memberships (organization_id);
CREATE INDEX IF NOT EXISTS idx_memberships_user ON memberships (user_id);

CREATE INDEX IF NOT EXISTS idx_campaigns_client_org ON campaigns (client_org_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns (status);
CREATE INDEX IF NOT EXISTS idx_campaigns_id_client_org ON campaigns (id, client_org_id);

CREATE INDEX IF NOT EXISTS idx_assets_campaign ON campaign_assets (campaign_id);
CREATE INDEX IF NOT EXISTS idx_assets_client_org ON campaign_assets (client_org_id);
CREATE INDEX IF NOT EXISTS idx_assets_campaign_client_org ON campaign_assets (campaign_id, client_org_id);
CREATE INDEX IF NOT EXISTS idx_assets_id_client_org ON campaign_assets (id, client_org_id);

CREATE INDEX IF NOT EXISTS idx_events_client_org_time ON tracking_events (client_org_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_campaign_time ON tracking_events (campaign_id, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_type_time ON tracking_events (type, event_time DESC);
CREATE INDEX IF NOT EXISTS idx_events_asset_client_org ON tracking_events (asset_id, client_org_id);

CREATE INDEX IF NOT EXISTS idx_leads_client_org_status ON leads (client_org_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_campaign ON leads (campaign_id);
CREATE INDEX IF NOT EXISTS idx_leads_campaign_client_org ON leads (campaign_id, client_org_id);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deliverables_client_org_status ON deliverables (client_org_id, status);
CREATE INDEX IF NOT EXISTS idx_deliverables_due_date ON deliverables (due_date);
CREATE INDEX IF NOT EXISTS idx_deliverables_campaign_client_org ON deliverables (campaign_id, client_org_id);

CREATE INDEX IF NOT EXISTS idx_threads_client_org ON message_threads (client_org_id);
CREATE INDEX IF NOT EXISTS idx_threads_id_client_org ON message_threads (id, client_org_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread_created ON messages (thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_thread_client_org ON messages (thread_id, client_org_id);

CREATE INDEX IF NOT EXISTS idx_invoices_client_org_status ON invoices (client_org_id, status);
CREATE INDEX IF NOT EXISTS idx_report_snapshots_client_org_period ON report_snapshots (client_org_id, period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_audit_client_org_created ON audit_logs (client_org_id, created_at DESC);

-- -----------------------------------------------------
-- UPDATED_AT AUTOMATION
-- -----------------------------------------------------
CREATE OR REPLACE FUNCTION set_row_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_organizations_set_updated_at') THEN
    CREATE TRIGGER trg_organizations_set_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_users_set_updated_at') THEN
    CREATE TRIGGER trg_users_set_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_clients_set_updated_at') THEN
    CREATE TRIGGER trg_clients_set_updated_at
    BEFORE UPDATE ON clients
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_campaigns_set_updated_at') THEN
    CREATE TRIGGER trg_campaigns_set_updated_at
    BEFORE UPDATE ON campaigns
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_leads_set_updated_at') THEN
    CREATE TRIGGER trg_leads_set_updated_at
    BEFORE UPDATE ON leads
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_deliverables_set_updated_at') THEN
    CREATE TRIGGER trg_deliverables_set_updated_at
    BEFORE UPDATE ON deliverables
    FOR EACH ROW
    EXECUTE FUNCTION set_row_updated_at();
  END IF;
END$$;

-- -----------------------------------------------------
-- OPTIONAL RLS TEMPLATE (PRODUCTION)
-- -----------------------------------------------------
-- App should set tenant context per request:
--   SET app.current_client_org_id = '<client-org-uuid>';
--
-- Uncomment and apply the block below in production after verifying
-- service roles, background jobs, and migration tooling behavior.
--
-- CREATE OR REPLACE FUNCTION current_client_org_id()
-- RETURNS UUID AS $$
--   SELECT NULLIF(current_setting('app.current_client_org_id', true), '')::uuid;
-- $$ LANGUAGE sql STABLE;
--
-- ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE campaign_assets ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE tracking_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE deliverables ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE message_threads ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY campaigns_tenant_policy ON campaigns
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY campaign_assets_tenant_policy ON campaign_assets
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY tracking_events_tenant_policy ON tracking_events
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY leads_tenant_policy ON leads
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY deliverables_tenant_policy ON deliverables
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY message_threads_tenant_policy ON message_threads
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY messages_tenant_policy ON messages
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY invoices_tenant_policy ON invoices
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY report_snapshots_tenant_policy ON report_snapshots
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());
--
-- CREATE POLICY audit_logs_tenant_policy ON audit_logs
--   USING (client_org_id = current_client_org_id())
--   WITH CHECK (client_org_id = current_client_org_id());

-- -----------------------------------------------------
-- NOTE
-- -----------------------------------------------------
-- RLS template is included above (optional, production rollout).
-- Keep membership checks in API middleware for defense in depth.
