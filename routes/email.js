const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const SUBSCRIBERS_FILE = path.join(__dirname, "..", "db", "email_subscribers.json");
const PAGES_FILE = path.join(__dirname, "..", "db", "landing_pages.json");

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

async function syncToMailchimp(email, name = "") {
  const apiKey = process.env.MAILCHIMP_API_KEY;
  const listId = process.env.MAILCHIMP_LIST_ID;
  if (!apiKey || !listId) return { synced: false, reason: "mailchimp_not_configured" };

  try {
    const keyParts = String(apiKey).split("-");
    const dc = keyParts.length > 1 ? keyParts[keyParts.length - 1] : "";
    if (!dc) {
      return { synced: false, reason: "mailchimp_invalid_api_key" };
    }

    const response = await fetch(`https://${dc}.api.mailchimp.com/3.0/lists/${listId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`anystring:${apiKey}`).toString("base64")}`,
      },
      body: JSON.stringify({
        email_address: email,
        status: "subscribed",
        merge_fields: {
          FNAME: name || "",
        },
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      const detail = payload.detail || payload.title || `mailchimp_http_${response.status}`;
      return { synced: false, reason: detail };
    }

    await response.json().catch(() => ({}));

    return { synced: true };
  } catch (error) {
    return { synced: false, reason: error.message || "mailchimp_error" };
  }
}

// Public email capture from landing pages
router.post("/capture", async (req, res) => {
  const { pageId, email, name } = req.body;
  if (!pageId || !email) {
    return res.status(400).json({ error: "pageId and email are required" });
  }

  const subscribers = loadJson(SUBSCRIBERS_FILE);
  const pages = loadJson(PAGES_FILE);
  const page = pages.find((p) => p.id === pageId);
  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }

  const existing = subscribers.find(
    (s) => s.pageId === pageId && s.email.toLowerCase() === email.toLowerCase()
  );
  if (existing) {
    return res.json({ success: true, duplicate: true, message: "Already subscribed" });
  }

  const subscriber = {
    id: Math.random().toString(36).slice(2),
    pageId,
    ownerEmail: page.ownerEmail,
    email,
    name: name || "",
    source: req.get("referer") || "landing-page",
    createdAt: new Date().toISOString(),
  };

  subscribers.push(subscriber);
  saveJson(SUBSCRIBERS_FILE, subscribers);

  const mailchimp = await syncToMailchimp(email, name);

  res.json({
    success: true,
    subscriber,
    mailchimp,
  });
});

// Authenticated list for creator dashboard
router.get("/subscribers", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const subscribers = loadJson(SUBSCRIBERS_FILE).filter(
    (s) => s.ownerEmail === req.session.userEmail
  );
  res.json(subscribers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
});

module.exports = router;
