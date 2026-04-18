const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db/pool');
const { ok, created, fail } = require('../utils/response');

const router = express.Router();

router.get('/', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
        id,
        client_org_id AS "clientOrgId",
        name,
        status,
        goal_summary AS "goalSummary",
        budget_amount AS "budgetAmount",
        starts_on AS "startsOn",
        ends_on AS "endsOn",
        updated_at AS "updatedAt"
      FROM campaigns
      ORDER BY updated_at DESC`
    );
    return ok(res, result.rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.post('/', async (req, res) => {
  const { clientOrgId, name, goalSummary, budgetAmount, startsOn, endsOn } = req.body;
  if (!clientOrgId || !name) return fail(res, 'clientOrgId and name are required', 400);

  try {
    const result = await query(
      `INSERT INTO campaigns (id, client_org_id, name, status, goal_summary, budget_amount, starts_on, ends_on, created_at, updated_at)
      VALUES ($1, $2, $3, 'draft', $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, client_org_id AS "clientOrgId", name, status, goal_summary AS "goalSummary", budget_amount AS "budgetAmount", starts_on AS "startsOn", ends_on AS "endsOn"`,
      [randomUUID(), clientOrgId, name, goalSummary || null, budgetAmount || null, startsOn || null, endsOn || null]
    );
    return created(res, result.rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/:campaignId', async (req, res) => {
  try {
    const result = await query(
      `SELECT
        id,
        client_org_id AS "clientOrgId",
        name,
        status,
        goal_summary AS "goalSummary",
        budget_amount AS "budgetAmount",
        starts_on AS "startsOn",
        ends_on AS "endsOn",
        updated_at AS "updatedAt"
      FROM campaigns
      WHERE id = $1
      LIMIT 1`,
      [req.params.campaignId]
    );

    if (!result.rows.length) {
      return fail(res, 'Campaign not found', 404);
    }

    return ok(res, result.rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.patch('/:campaignId', async (req, res) => {
  const { name, status, goalSummary, budgetAmount, startsOn, endsOn } = req.body;
  try {
    const result = await query(
      `UPDATE campaigns
      SET
        name = COALESCE($2, name),
        status = COALESCE($3, status),
        goal_summary = COALESCE($4, goal_summary),
        budget_amount = COALESCE($5, budget_amount),
        starts_on = COALESCE($6, starts_on),
        ends_on = COALESCE($7, ends_on),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, client_org_id AS "clientOrgId", name, status, goal_summary AS "goalSummary", budget_amount AS "budgetAmount", starts_on AS "startsOn", ends_on AS "endsOn", updated_at AS "updatedAt"`,
      [req.params.campaignId, name || null, status || null, goalSummary || null, budgetAmount || null, startsOn || null, endsOn || null]
    );

    if (!result.rows.length) {
      return fail(res, 'Campaign not found', 404);
    }

    return ok(res, { success: true, campaign: result.rows[0] });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.post('/:campaignId/assets/generate', (req, res) => {
  const { source, medium, campaignParam } = req.body;
  if (!source || !medium || !campaignParam) {
    return fail(res, 'source, medium, and campaignParam are required', 400);
  }

  return ok(res, [
    {
      id: 'a1000000-0000-0000-0000-000000000099',
      type: 'utm_link',
      trackingUrl: `https://subjectmedia.xpandsports.com/?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaignParam}`,
      qrUrl: null,
    },
    {
      id: 'a1000000-0000-0000-0000-000000000100',
      type: 'qr_code',
      trackingUrl: `https://subjectmedia.xpandsports.com/?utm_source=${source}&utm_medium=${medium}&utm_campaign=${campaignParam}`,
      qrUrl: 'https://cdn.subjectmedia.com/qr/generated.png',
    },
  ]);
});

module.exports = router;
