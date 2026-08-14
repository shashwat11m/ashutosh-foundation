const SITE_URL = "https://astro.ashutoshfoundation.in";

function stripHtml(html) {
  return String(html || "")
    .replace(/<[^>]*>?/g, "")
    .replace(/&nbsp;|&amp;|&quot;|&#39;|&lt;|&gt;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function excerpt(html, len = 160) {
  const text = stripHtml(html);
  if (!text) return "";
  return text.length > len ? text.substring(0, len - 1).trim() + "…" : text;
}

function absoluteImage(image) {
  if (!image) return SITE_URL + "/images/logo.png";
  if (/^https?:\/\//.test(image)) return image;
  return SITE_URL + (image.startsWith("/") ? image : "/" + image);
}

module.exports = { SITE_URL, stripHtml, excerpt, absoluteImage };
