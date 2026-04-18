const express = require("express");
const { isUuid } = require("./_helpers");

const router = express.Router();

router.post("/leads/:leadId/convert", (req, res) => {
  const { leadId } = req.params;
  const { revenueAmount } = req.body || {};

  if (!isUuid(leadId)) {
    return res.status(422).json({ error: "leadId must be a valid uuid" });
  }

  if (revenueAmount == null || Number(revenueAmount) < 0) {
    return res.status(422).json({ error: "revenueAmount must be >= 0" });
  }

  return res.status(200).json({
    id: leadId,
    status: "won",
    revenueAmount: Number(revenueAmount),
    convertedAt: new Date().toISOString(),
  });
});

module.exports = router;
