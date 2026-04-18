const fs = require("fs");
const path = require("path");

const PAGES_FILE = path.join(__dirname, "..", "db", "landing_pages.json");
const ANALYTICS_FILE = path.join(__dirname, "..", "db", "analytics.json");

function loadPages() {
  if (!fs.existsSync(PAGES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(PAGES_FILE, "utf8"));
  } catch {
    return [];
  }
}

function loadAnalytics() {
  if (!fs.existsSync(ANALYTICS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf8"));
  } catch {
    return [];
  }
}

/**
 * Generate HTML report for a user's landing pages
 * @param {string} userName - User email
 * @param {string} period - 'weekly' or 'monthly'
 * @returns {object} Report data with HTML
 */
function generateReport(userEmail, period = "weekly") {
  const pages = loadPages();
  const analytics = loadAnalytics();

  const userPages = pages.filter((p) => p.ownerEmail === userEmail);
  const userAnalytics = analytics.filter((a) =>
    userPages.some((p) => p.id === a.pageId)
  );

  // Calculate stats
  const totalClicks = userAnalytics.length;
  const totalPages = userPages.length;
  const publishedPages = userPages.filter((p) => p.published).length;

  // Group clicks by source
  const bySource = {};
  userAnalytics.forEach((a) => {
    const source = a.utm_source || "direct";
    bySource[source] = (bySource[source] || 0) + 1;
  });

  // Top performing pages
  const pageStats = userPages.map((page) => {
    const clicks = userAnalytics.filter((a) => a.pageId === page.id).length;
    return { ...page, clicks };
  });
  const topPages = pageStats.sort((a, b) => b.clicks - a.clicks).slice(0, 5);

  // Generate HTML
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
        .header { background: #667eea; color: white; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .section { margin-bottom: 30px; }
        .section h2 { border-bottom: 2px solid #667eea; padding-bottom: 10px; color: #667eea; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 15px 0; }
        .stat-card { background: #f5f7fa; padding: 15px; border-radius: 8px; text-align: center; }
        .stat-card .number { font-size: 28px; font-weight: bold; color: #667eea; }
        .stat-card .label { font-size: 12px; color: #999; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        table th { background: #f5f7fa; padding: 12px; text-align: left; font-weight: 600; border-bottom: 1px solid #ddd; }
        table td { padding: 12px; border-bottom: 1px solid #eee; }
        table tr:hover { background: #f9f9f9; }
        .chart { background: #f5f7fa; padding: 20px; border-radius: 8px; margin: 15px 0; }
        .bar { display: flex; align-items: center; margin: 10px 0; }
        .bar-label { width: 100px; font-size: 12px; }
        .bar-fill { flex: 1; background: #667eea; height: 24px; border-radius: 4px; margin: 0 10px; display: flex; align-items: center; justify-content: flex-end; padding-right: 8px; color: white; font-size: 12px; }
        .footer { text-align: center; color: #999; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; }
        .period-badge { display: inline-block; background: #667eea; color: white; padding: 4px 8px; border-radius: 4px; font-size: 11px; margin-left: 10px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>CreatorLand ${period === "weekly" ? "Weekly" : "Monthly"} Report <span class="period-badge">${period.toUpperCase()}</span></h1>
        <p>Report generated on ${new Date().toLocaleString()}</p>
      </div>

      <div class="section">
        <h2>📊 Overview</h2>
        <div class="stats">
          <div class="stat-card">
            <div class="number">${totalPages}</div>
            <div class="label">Total Pages</div>
          </div>
          <div class="stat-card">
            <div class="number">${publishedPages}</div>
            <div class="label">Published</div>
          </div>
          <div class="stat-card">
            <div class="number">${totalClicks}</div>
            <div class="label">Total Clicks</div>
          </div>
          <div class="stat-card">
            <div class="number">${totalPages > 0 ? Math.round(totalClicks / totalPages) : 0}</div>
            <div class="label">Avg Clicks/Page</div>
          </div>
        </div>
      </div>

      ${Object.keys(bySource).length > 0 ? `
        <div class="section">
          <h2>📍 Traffic Sources</h2>
          <div class="chart">
            ${Object.entries(bySource)
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => {
                const percentage = totalClicks > 0 ? Math.round((count / totalClicks) * 100) : 0;
                return `
                  <div class="bar">
                    <div class="bar-label">${source}</div>
                    <div class="bar-fill" style="width: ${Math.max(percentage, 5)}%">${percentage}%</div>
                    <div style="width: 50px; text-align: right; font-size: 12px;">${count} clicks</div>
                  </div>
                `;
              })
              .join("")}
          </div>
        </div>
      ` : ""}

      ${topPages.length > 0 ? `
        <div class="section">
          <h2>🚀 Top Performing Pages</h2>
          <table>
            <thead>
              <tr>
                <th>Page Title</th>
                <th>Clicks</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              ${topPages
                .map(
                  (page) => `
                <tr>
                  <td><strong>${page.pageTitle}</strong></td>
                  <td>${page.clicks}</td>
                  <td>${page.published ? "✅ Published" : "📝 Draft"}</td>
                  <td>${new Date(page.createdAt).toLocaleDateString()}</td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
        </div>
      ` : `
        <div class="section">
          <p style="color: #999;">No pages or traffic data available for this period.</p>
        </div>
      `}

      <div class="footer">
        <p>CreatorLand © 2026 | This is an automated report. Do not reply to this email.</p>
        <p><a href="http://localhost:3000/pages.html" style="color: #667eea; text-decoration: none;">View your dashboard</a></p>
      </div>
    </body>
    </html>
  `;

  return {
    userEmail,
    period,
    generatedAt: new Date().toISOString(),
    stats: {
      totalPages,
      publishedPages,
      totalClicks,
      avgClicksPerPage: totalPages > 0 ? Math.round(totalClicks / totalPages) : 0,
      topSource: Object.entries(bySource).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A",
    },
    topPages,
    html,
  };
}

module.exports = { generateReport };
