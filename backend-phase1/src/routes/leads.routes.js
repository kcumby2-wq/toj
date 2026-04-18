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
        campaign_id AS "campaignId",
        source,
        full_name AS "fullName",
        email,
        phone,
        status,
        revenue_amount AS "revenueAmount",
        converted_at AS "convertedAt",
        created_at AS "createdAt"
      FROM leads
      ORDER BY created_at DESC`
    );
    return ok(res, result.rows);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.post('/', async (req, res) => {
  const { clientOrgId, campaignId, source, fullName, email, phone, notes } = req.body;
  if (!clientOrgId || !campaignId || !fullName || !email) {
    return fail(res, 'clientOrgId, campaignId, fullName, and email are required', 400);
  }

  try {
    const result = await query(
      `INSERT INTO leads (id, client_org_id, campaign_id, source, full_name, email, phone, notes, status, revenue_amount, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', 0, NOW(), NOW())
      RETURNING id, client_org_id AS "clientOrgId", campaign_id AS "campaignId", source, full_name AS "fullName", email, phone, status, revenue_amount AS "revenueAmount", created_at AS "createdAt"`,
      [randomUUID(), clientOrgId, campaignId, source || null, fullName, email, phone || null, notes || null]
    );
    return created(res, result.rows[0]);
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.patch('/:leadId', async (req, res) => {
  const { status, notes, revenueAmount } = req.body;
  try {
    const result = await query(
      `UPDATE leads
      SET
        status = COALESCE($2, status),
        notes = COALESCE($3, notes),
        revenue_amount = COALESCE($4, revenue_amount),
        updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, notes, revenue_amount AS "revenueAmount", updated_at AS "updatedAt"`,
      [req.params.leadId, status || null, notes || null, typeof revenueAmount === 'number' ? revenueAmount : null]
    );

    if (!result.rows.length) {
      return fail(res, 'Lead not found', 404);
    }

    return ok(res, { success: true, lead: result.rows[0] });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.post('/:leadId/convert', async (req, res) => {
  const revenueAmount = Number(req.body.revenueAmount || 0);
  try {
    const result = await query(
      `UPDATE leads
      SET status = 'won',
          revenue_amount = $2,
          converted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING id, status, revenue_amount AS "revenueAmount", converted_at AS "convertedAt"`,
      [req.params.leadId, revenueAmount]
    );

    if (!result.rows.length) {
      return fail(res, 'Lead not found', 404);
    }

    return ok(res, { success: true, lead: result.rows[0] });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

module.exports = router;
