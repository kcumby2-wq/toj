const express = require("express");
const fs = require("fs");
const path = require("path");
const { generateReport, sendReportsToAllUsers } = require("../utils/reportScheduler");

const router = express.Router();
const REPORTS_FILE = path.join(__dirname, "..", "db", "reports.json");

function loadReports() {
  if (!fs.existsSync(REPORTS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(REPORTS_FILE, "utf8"));
  } catch {
    return [];
  }
}

// GET /api/reports - Get user's report history
router.get("/", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const reports = loadReports();
  const userReports = reports
    .filter((r) => r.userEmail === req.session.userEmail)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));

  res.json(userReports);
});

// GET /api/reports/generate/:period - Generate a report on-demand
router.get("/generate/:period", (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { period } = req.params;
  if (!["weekly", "monthly"].includes(period)) {
    return res.status(400).json({ error: "Period must be 'weekly' or 'monthly'" });
  }

  try {
    const reportData = generateReport(req.session.userEmail, period);
    res.json(reportData);
  } catch (error) {
    res.status(500).json({ error: "Failed to generate report", details: error.message });
  }
});

// POST /api/reports/send - Send immediate report (admin endpoint)
router.post("/send", async (req, res) => {
  if (!req.session?.userEmail) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const { period = "weekly" } = req.body;

  if (!["weekly", "monthly"].includes(period)) {
    return res
      .status(400)
      .json({ error: "Period must be 'weekly' or 'monthly'" });
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return res.status(500).json({
      error: "Email not configured",
      message: "Admin must set EMAIL_USER and EMAIL_PASS",
    });
  }

  try {
    const reportData = generateReport(req.session.userEmail, period);
    const { sendReportEmail } = require("../utils/reportScheduler");
    const success = await sendReportEmail(
      req.session.userEmail,
      reportData,
      period
    );

    if (success) {
      res.json({ success: true, message: `${period} report sent to your email` });
    } else {
      res.status(500).json({ error: "Failed to send report" });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
