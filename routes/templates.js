const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const FILE = path.join(__dirname, "..", "db", "templates.json");

function load() {
  if (!fs.existsSync(FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(FILE, "utf8"));
  } catch {
    return {};
  }
}

function save(data) {
  fs.writeFileSync(FILE, JSON.stringify(data, null, 2));
}

// GET /api/templates — list current user's templates
router.get("/", (req, res) => {
  const all = load();
  const mine = all[req.session.userEmail] || {};
  res.json({ templates: mine });
});

// POST /api/templates — save a template { name, columns: [] }
router.post("/", (req, res) => {
  const { name, columns } = req.body;
  if (!name || !Array.isArray(columns) || columns.length === 0) {
    return res
      .status(400)
      .json({ error: "name and non-empty columns array required" });
  }
  const all = load();
  if (!all[req.session.userEmail]) all[req.session.userEmail] = {};
  all[req.session.userEmail][name] = { columns, updatedAt: new Date().toISOString() };
  save(all);
  res.json({ success: true });
});

// DELETE /api/templates/:name
router.delete("/:name", (req, res) => {
  const all = load();
  if (all[req.session.userEmail]) {
    delete all[req.session.userEmail][req.params.name];
    save(all);
  }
  res.json({ success: true });
});

module.exports = router;
