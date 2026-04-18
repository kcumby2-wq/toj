const express = require("express");
const router = express.Router();
const { buildUTM, validateUTM } = require("../utils/utm");

// POST /api/utm/build
// body: { baseUrl, source, medium, campaign, content?, term? }
router.post("/build", (req, res) => {
  const { baseUrl, source, medium, campaign, content, term } = req.body;

  const errors = validateUTM({ baseUrl, source, medium, campaign });
  if (errors.length) return res.status(400).json({ errors });

  const url = buildUTM({ baseUrl, source, medium, campaign, content, term });
  res.json({ url });
});

module.exports = router;
