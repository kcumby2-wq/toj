const express = require("express");
const router = express.Router();
const { buildCSV, parseCSV } = require("../utils/csvBuilder");

// POST /api/csv/build  body: { rows: [{...}] }
router.post("/build", (req, res) => {
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ error: "rows array required" });
  }
  const csv = buildCSV(rows);
  res.json({ csv });
});

// POST /api/csv/parse  body: { text }
router.post("/parse", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "text required" });
  }
  try {
    const rows = parseCSV(text);
    res.json({ rows });
  } catch (err) {
    res.status(400).json({ error: "Failed to parse CSV" });
  }
});

module.exports = router;
