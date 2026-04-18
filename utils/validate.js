// Lightweight client-safe helpers (also usable server-side)
function isEmail(v) {
  if (!v) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v).trim());
}

function isUrl(v) {
  if (!v) return false;
  try {
    new URL(String(v).trim());
    return true;
  } catch {
    return false;
  }
}

function isPhone(v) {
  if (!v) return false;
  // Permissive: 7-15 digits with optional +, spaces, dashes, parens
  const digits = String(v).replace(/[^\d]/g, "");
  return digits.length >= 7 && digits.length <= 15;
}

module.exports = { isEmail, isUrl, isPhone };
