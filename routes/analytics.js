const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const ANALYTICS_FILE = path.join(__dirname, "..", "db", "analytics.json");
const PAGES_FILE = path.join(__dirname, "..", "db", "landing_pages.json");

function loadAnalytics() {
  if (!fs.existsSync(ANALYTICS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf8"));
  } catch {
    return [];
  }
}

function saveAnalytics(analytics) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(analytics, null, 2));
}

function loadPages() {
  if (!fs.existsSync(PAGES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PAGES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function savePages(pages) {
  fs.writeFileSync(PAGES_FILE, JSON.stringify(pages, null, 2));
}

function isMobile(userAgent = "") {
  return /android|iphone|ipad|ipod|mobile/i.test(userAgent);
}

// POST /api/analytics/track - Track a click (public, no auth needed)
router.post("/track", (req, res) => {
  const { pageId, utm_source, utm_medium, utm_content, utm_campaign } = req.body;

  if (!pageId) {
    return res.status(400).json({ error: "pageId required" });
  }

  const analytics = loadAnalytics();
  const timestamp = new Date().toISOString();

  const event = {
    id: Math.random().toString(36).substring(7),
    pageId,
    timestamp,
    utm_source: utm_source || "direct",
    utm_medium: utm_medium || "none",
    utm_content: utm_content || "none",
    utm_campaign: utm_campaign || "none",
    referrer: req.get("referer") || "direct",
    userAgent: req.get("user-agent"),
    ip: req.ip,
  };

  analytics.push(event);
  saveAnalytics(analytics);

  // Increment click count on page
  const pages = loadPages();
  const pageIndex = pages.findIndex((p) => p.id === pageId);
  if (pageIndex !== -1) {
    pages[pageIndex].clicks = (pages[pageIndex].clicks || 0) + 1;
    savePages(pages);
  }

  res.json({ success: true, event });
});

  // GET /api/analytics/dashboard - Creator-wide analytics summary
  router.get("/dashboard", (req, res) => {
    if (!req.session?.userEmail) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const pages = loadPages().filter((p) => p.ownerEmail === req.session.userEmail);
    const pageIds = new Set(pages.map((p) => p.id));
    const analytics = loadAnalytics().filter((a) => pageIds.has(a.pageId));

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const bySource = {};
    const byDevice = { mobile: 0, desktop: 0 };
    const clicksByDay = {};
    const pagePerformance = {};

    analytics.forEach((a) => {
      const source = a.utm_source || "direct";
      bySource[source] = (bySource[source] || 0) + 1;

      if (isMobile(a.userAgent)) {
        byDevice.mobile += 1;
      } else {
        byDevice.desktop += 1;
      }

      const day = new Date(a.timestamp).toISOString().slice(0, 10);
      clicksByDay[day] = (clicksByDay[day] || 0) + 1;
      pagePerformance[a.pageId] = (pagePerformance[a.pageId] || 0) + 1;
    });

    const totalClicks = analytics.length;
    const clicksLast7Days = analytics.filter(
      (a) => new Date(a.timestamp) >= sevenDaysAgo
    ).length;
    const clicksLast30Days = analytics.filter(
      (a) => new Date(a.timestamp) >= thirtyDaysAgo
    ).length;

    const topPages = pages
      .map((p) => ({
        pageId: p.id,
        title: p.pageTitle,
        slug: p.slug,
        clicks: pagePerformance[p.id] || 0,
      }))
      .sort((a, b) => b.clicks - a.clicks)
      .slice(0, 5);

    res.json({
      totals: {
        pages: pages.length,
        totalClicks,
        clicksLast7Days,
        clicksLast30Days,
      },
      bySource,
      byDevice,
      clicksByDay,
      topPages,
    });
  });

// GET /api/analytics/:pageId - Get analytics for a page
router.get("/:pageId", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { pageId } = req.params;
  const pages = loadPages();
  const page = pages.find(
    (p) => p.id === pageId && p.ownerEmail === req.session.userEmail
  );

  if (!page) {
    return res.status(404).json({ error: "Page not found" });
  }

  const analytics = loadAnalytics();
  const pageAnalytics = analytics.filter((a) => a.pageId === pageId);

  // Group by source
  const bySource = {};
  pageAnalytics.forEach((a) => {
    const key = a.utm_source || "direct";
    bySource[key] = (bySource[key] || 0) + 1;
  });

  res.json({
    pageId,
    totalClicks: pageAnalytics.length,
    bySource,
    recentEvents: pageAnalytics.slice(-20),
  });
});

module.exports = router;
