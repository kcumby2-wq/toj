const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const MARKETPLACE_FILE = path.join(__dirname, "..", "db", "marketplace_templates.json");
const PURCHASES_FILE = path.join(__dirname, "..", "db", "marketplace_purchases.json");

function loadJson(filePath) {
  if (!fs.existsSync(filePath)) return [];
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return [];
  }
}

function saveJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

router.get("/templates", (req, res) => {
  const userEmail = req.session?.userEmail;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated" });

  const templates = loadJson(MARKETPLACE_FILE);
  const purchases = loadJson(PURCHASES_FILE).filter((p) => p.userEmail === userEmail);

  const unlockedTemplateIds = new Set(purchases.map((p) => p.templateId));
  const payload = templates.map((t) => ({
    ...t,
    unlocked: unlockedTemplateIds.has(t.id),
  }));

  res.json(payload);
});

router.post("/purchase", (req, res) => {
  const userEmail = req.session?.userEmail;
  if (!userEmail) return res.status(401).json({ error: "Not authenticated" });

  const { templateId } = req.body;
  if (!templateId) return res.status(400).json({ error: "templateId required" });

  const templates = loadJson(MARKETPLACE_FILE);
  const template = templates.find((t) => t.id === templateId);
  if (!template) return res.status(404).json({ error: "Template not found" });

  const purchases = loadJson(PURCHASES_FILE);
  const alreadyOwned = purchases.find(
    (p) => p.userEmail === userEmail && p.templateId === templateId
  );
  if (alreadyOwned) {
    return res.json({ success: true, purchase: alreadyOwned, duplicate: true });
  }

  // Simulated payment confirmation for MVP
  const purchase = {
    id: Math.random().toString(36).slice(2),
    userEmail,
    templateId,
    amountCents: template.priceCents || 0,
    purchasedAt: new Date().toISOString(),
    status: "paid",
  };

  purchases.push(purchase);
  saveJson(PURCHASES_FILE, purchases);

  res.json({ success: true, purchase });
});

module.exports = router;
