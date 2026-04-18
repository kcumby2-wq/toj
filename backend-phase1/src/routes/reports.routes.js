const express = require('express');
const { query } = require('../db/pool');
const { ok, fail } = require('../utils/response');

const router = express.Router();

router.get('/summary', async (req, res) => {
  const { from, to } = req.query;
  try {
    const result = await query(
      `SELECT
        COUNT(*) FILTER (WHERE type = 'click') AS clicks,
        COUNT(*) FILTER (WHERE type = 'scan') AS scans,
        COUNT(*) FILTER (WHERE type = 'conversion') AS conversions,
        COALESCE(SUM(revenue_amount), 0) AS revenue
      FROM tracking_events
      WHERE ($1::date IS NULL OR event_time::date >= $1::date)
        AND ($2::date IS NULL OR event_time::date <= $2::date)`,
      [from || null, to || null]
    );

    const leadsResult = await query(
      `SELECT COUNT(*) AS leads
       FROM leads
       WHERE ($1::date IS NULL OR created_at::date >= $1::date)
         AND ($2::date IS NULL OR created_at::date <= $2::date)`,
      [from || null, to || null]
    );

    return ok(res, {
      from: from || null,
      to: to || null,
      clicks: Number(result.rows[0].clicks || 0),
      scans: Number(result.rows[0].scans || 0),
      leads: Number(leadsResult.rows[0].leads || 0),
      conversions: Number(result.rows[0].conversions || 0),
      revenue: Number(result.rows[0].revenue || 0),
    });
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/revenue-by-campaign', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
        c.id AS "campaignId",
        c.name,
        COALESCE(SUM(t.revenue_amount), 0) AS revenue
      FROM campaigns c
      LEFT JOIN tracking_events t ON t.campaign_id = c.id
      GROUP BY c.id, c.name
      ORDER BY revenue DESC, c.name ASC`
    );
    return ok(res, result.rows.map((row) => ({ ...row, revenue: Number(row.revenue) })));
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/conversion-trend', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
        event_time::date AS date,
        COUNT(*) AS conversions
      FROM tracking_events
      WHERE type = 'conversion'
      GROUP BY event_time::date
      ORDER BY date ASC`
    );
    return ok(
      res,
      result.rows.map((row) => ({
        date: row.date,
        conversions: Number(row.conversions),
      }))
    );
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

router.get('/lead-sources', async (_req, res) => {
  try {
    const result = await query(
      `SELECT
        COALESCE(NULLIF(source, ''), 'unknown') AS source,
        COUNT(*) AS leads
      FROM leads
      GROUP BY COALESCE(NULLIF(source, ''), 'unknown')
      ORDER BY leads DESC, source ASC`
    );
    return ok(res, result.rows.map((row) => ({ ...row, leads: Number(row.leads) })));
  } catch (error) {
    return fail(res, error.message, 500);
  }
});

module.exports = router;
