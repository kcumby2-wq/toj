const express = require('express');
const { query } = require('../db/pool');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
        c.client_org_id AS "clientOrgId",
        o.name,
        c.account_status AS "accountStatus",
        c.onboarding_status AS "onboardingStatus",
        c.created_at AS "createdAt"
      FROM clients c
      JOIN organizations o ON o.id = c.client_org_id
      ORDER BY o.name ASC`
    );
    return ok(res, result.rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/:clientId', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        c.client_org_id AS "clientOrgId",
        o.name,
        c.account_status AS "accountStatus",
        c.onboarding_status AS "onboardingStatus",
        c.stripe_customer_id AS "stripeCustomerId",
        c.stripe_subscription_id AS "stripeSubscriptionId",
        c.updated_at AS "updatedAt"
      FROM clients c
      JOIN organizations o ON o.id = c.client_org_id
      WHERE c.client_org_id = $1
      LIMIT 1`,
      [req.params.clientId]
    );

    if (!result.rows.length) {
      return fail(res, 'Client not found', 404);
    }

    return ok(res, result.rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.patch('/:clientId', async (req, res) => {
  const { accountStatus, onboardingStatus } = req.body;
  if (!accountStatus && !onboardingStatus) {
    return fail(res, 'At least one of accountStatus or onboardingStatus is required', 400);
  }

  try {
    const result = await query(
      `UPDATE clients
      SET
        account_status = COALESCE($2, account_status),
        onboarding_status = COALESCE($3, onboarding_status),
        updated_at = NOW()
      WHERE client_org_id = $1
      RETURNING client_org_id AS "clientOrgId", account_status AS "accountStatus", onboarding_status AS "onboardingStatus", updated_at AS "updatedAt"`,
      [req.params.clientId, accountStatus || null, onboardingStatus || null]
    );

    if (!result.rows.length) {
      return fail(res, 'Client not found', 404);
    }

    return ok(res, { success: true, client: result.rows[0] });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

module.exports = router;
