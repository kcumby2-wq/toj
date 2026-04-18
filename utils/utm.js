// Build a UTM URL from components. Accepts optional content/term.
function buildUTM({ baseUrl, source, medium, campaign, content, term }) {
  const url = new URL(baseUrl);
  const params = {
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
    utm_content: content,
    utm_term: term,
  };
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      url.searchParams.set(k, String(v).trim());
    }
  }
  return url.toString();
}

function validateUTM({ baseUrl, source, medium, campaign }) {
  const errors = [];
  if (!baseUrl) errors.push("baseUrl is required");
  else {
    try {
      new URL(baseUrl);
    } catch {
      errors.push("baseUrl is not a valid URL (include https://)");
    }
  }
  if (!source) errors.push("utm_source is required");
  if (!medium) errors.push("utm_medium is required");
  if (!campaign) errors.push("utm_campaign is required");
  return errors;
}

module.exports = { buildUTM, validateUTM };
