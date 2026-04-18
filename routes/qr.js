const express = require("express");
const router = express.Router();
const QRCode = require("qrcode");

// POST /api/qr/generate
// body: { url }
router.post("/generate", async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== "string") {
    return res.status(400).json({ error: "url is required" });
  }

  try {
    // dataURL (base64 PNG) so the frontend can preview AND download
    const dataUrl = await QRCode.toDataURL(url, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
    });
    res.json({ qr: dataUrl, url });
  } catch (err) {
    res.status(500).json({ error: "QR generation failed" });
  }
});

module.exports = router;
