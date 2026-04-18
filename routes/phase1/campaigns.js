const express = require("express");
const { isUuid, parseIsoDate } = require("./_helpers");

const router = express.Router();

router.post("/campaigns", (req, res) => {
  const { clientOrgId, name, budgetAmount, startsOn, endsOn } = req.body || {};

  if (!isUuid(clientOrgId) || !name) {
    return res.status(422).json({ error: "clientOrgId (uuid) and name are required" });
  }

  if (budgetAmount != null && Number(budgetAmount) < 0) {
    return res.status(422).json({ error: "budgetAmount must be >= 0" });
  }

  if (startsOn && endsOn) {
    const start = parseIsoDate(startsOn);
    const end = parseIsoDate(endsOn);
    if (!start || !end || start > end) {
      return res.status(422).json({ error: "startsOn must be <= endsOn" });
    }
  }

  return res.status(201).json({
    id: "c1111111-1111-4111-8111-111111111111",
    clientOrgId,
    name,
    budgetAmount: budgetAmount ?? null,
    startsOn: startsOn ?? null,
    endsOn: endsOn ?? null,
  });
});

module.exports = router;
