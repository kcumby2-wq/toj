const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const FILE = path.join(__dirname, "..", "db", "contacts.json");

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

// GET /api/contacts — list current user's saved campaign contact sets
router.get("/", (req, res) => {
  const all = load();
  res.json({ sets: all[req.session.userEmail] || {} });
});

// POST /api/contacts  body: { name, rows }
router.post("/", (req, res) => {
  const { name, rows } = req.body;
  if (!name || !Array.isArray(rows)) {
    return res.status(400).json({ error: "name and rows array required" });
  }
  const all = load();
  if (!all[req.session.userEmail]) all[req.session.userEmail] = {};
  all[req.session.userEmail][name] = {
    rows,
    updatedAt: new Date().toISOString(),
  };
  save(all);
  res.json({ success: true });
});

// DELETE /api/contacts/:name
router.delete("/:name", (req, res) => {
  const all = load();
  if (all[req.session.userEmail]) {
    delete all[req.session.userEmail][req.params.name];
    save(all);
  }
  res.json({ success: true });
});

module.exports = router;
