const express = require('express');
const { randomUUID } = require('crypto');
const { query } = require('../db/pool');
const { ok, created, fail } = require('../utils/response');

const router = express.Router();

router.post('/event', async (req, res) => {
  const { type, campaignId, clientOrgId, assetId, referrer, source, deviceType, ipHash, userAgent, revenueAmount, meta } = req.body;
  if (!type || !campaignId) return fail(res, 'type and campaignId are required', 400);

  const trackedClientOrgId = clientOrgId || req.auth?.organizationId;
  if (!trackedClientOrgId) {
    return fail(res, 'clientOrgId is required when tenant context is missing', 400);
  }

  try {
    const result = await query(
      `INSERT INTO tracking_events (
        id,
        client_org_id,
        campaign_id,
        asset_id,
        type,
        event_time,
        referrer,
        source,
        device_type,
        ip_hash,
        user_agent,
        revenue_amount,
        meta_json
      )
      VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8, $9, $10, $11, $12::jsonb)
      RETURNING id`,
      [
        randomUUID(),
        trackedClientOrgId,
        campaignId,
        assetId || null,
        type,
        referrer || null,
        source || null,
        deviceType || null,
        ipHash || null,
        userAgent || null,
        typeof revenueAmount === 'number' ? revenueAmount : null,
        JSON.stringify(meta || {}),
      ]
    );

    return created(res, { success: true, eventId: result.rows[0].id });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/overview', (_req, res) => {
  return ok(res, {
    clicks: 214,
    scans: 91,
    leads: 37,
    conversions: 11,
    conversionRate: 0.297,
    revenue: 27800,
  });
});

router.get('/campaigns/:campaignId', (req, res) => {
  return ok(res, {
    campaignId: req.params.campaignId,
    clicks: 140,
    scans: 44,
    leads: 24,
    conversions: 8,
    revenue: 19600,
  });
});

module.exports = router;
