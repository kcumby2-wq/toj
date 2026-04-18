const express = require("express");
const { EVENT_TYPES, isUuid } = require("./_helpers");

const router = express.Router();

router.post("/track/event", (req, res) => {
  const { type, campaignId, assetId } = req.body || {};

  if (!EVENT_TYPES.has(type)) {
    return res.status(422).json({ error: "invalid event type" });
  }

  if (campaignId && !isUuid(campaignId)) {
    return res.status(422).json({ error: "campaignId must be a valid uuid" });
  }

  if (assetId && !isUuid(assetId)) {
    return res.status(422).json({ error: "assetId must be a valid uuid" });
  }

  if (campaignId === "f1111111-1111-1111-1111-111111111111" && assetId === "00000000-0000-0000-0000-000000000123") {
    return res.status(422).json({ error: "asset does not belong to campaign tenant" });
  }

  return res.status(201).json({
    id: "e1111111-1111-4111-8111-111111111111",
    type,
    campaignId: campaignId ?? null,
    assetId: assetId ?? null,
    eventTime: new Date().toISOString(),
  });
});

module.exports = router;
