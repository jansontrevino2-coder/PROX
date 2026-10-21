import dns from "node:dns/promises";
import net from "node:net";

const MAX_BYTES = 5 * 1024 * 1024;
const TIMEOUT_MS = 12000;

function isPrivateIp(ip) {
  if (net.isIPv4(ip)) {
    const p = ip.split(".").map(Number);
    return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
      (p[0] === 169 && p[1] === 254) ||
      (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
      (p[0] === 192 && p[1] === 168) ||
      (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
      p[0] >= 224;
  }
  if (net.isIPv6(ip)) {
    const x = ip.toLowerCase();
    return x === "::1" || x === "::" || x.startsWith("fc") || x.startsWith("fd") ||
      x.startsWith("fe8") || x.startsWith("fe9") || x.startsWith("fea") || x.startsWith("feb") ||
      x.startsWith("::ffff:127.") || x.startsWith("::ffff:10.") || x.startsWith("::ffff:192.168.");
  }
  return true;
}

async function validateTarget(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("Enter a valid URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS destinations are supported.");
  if (url.username || url.password) throw new Error("Credentials in URLs are blocked.");
  if (url.port && url.port !== "443") throw new Error("Custom ports are blocked.");
  const host = url.hostname.toLowerCase();
  const records = await dns.lookup(host, { all: true, verbatim: true });
  if (!records.length || records.some(r => isPrivateIp(r.address))) throw new Error("Destination resolved to a blocked network.");
  return url;
}

function proxied(abs) { return `/api/proxy?url=${encodeURIComponent(abs)}`; }

function rewriteHtml(html, base) {
  html = html.replace(/<base\b[^>]*>/gi, "");
  html = html.replace(/\b(href|src|action|poster)=(['"])(.*?)\2/gi, (m, attr, q, value) => {
    if (!value || /^(data:|blob:|javascript:|mailto:|tel:|#)/i.test(value)) return m;
    try { return `${attr}=${q}${proxied(new URL(value, base).href)}${q}`; } catch { return m; }
  });
  html = html.replace(/\bsrcset=(['"])(.*?)\1/gi, (m, q, value) => {
    const out = value.split(",").map(part => {
      const bits = part.trim().split(/\s+/); if (!bits[0]) return part;
      try { bits[0] = proxied(new URL(bits[0], base).href); } catch {}
      return bits.join(" ");
    }).join(", ");
    return `srcset=${q}${out}${q}`;
  });
  const guard = `<script>document.addEventListener('submit',e=>{e.preventDefault();alert('Form submissions are disabled by this safe proxy.');});</script>`;
  return html.replace(/<\/body>/i, `${guard}</body>`);
}

async function fetchChecked(startUrl) {
  let current = await validateTarget(startUrl);
  for (let i = 0; i < 5; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        redirect: "manual", signal: controller.signal,
        headers: { "user-agent": "SafeVercelProxy/1.0", "accept": "text/html,application/xhtml+xml,text/css,image/*,*/*;q=0.8" }
      });
    } finally { clearTimeout(timer); }
    if ([301,302,303,307,308].includes(response.status)) {
      const loc = response.headers.get("location");
      if (!loc) throw new Error("Invalid redirect.");
      current = await validateTarget(new URL(loc, current).href);
      continue;
    }
    return { response, current };
  }
  throw new Error("Too many redirects.");
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex, nofollow");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  try {
    const raw = Array.isArray(req.query.url) ? req.query.url[0] : req.query.url;
    if (!raw) return res.status(400).json({ error: "Missing url parameter" });
    const { response, current } = await fetchChecked(raw);
    const type = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].toLowerCase();
    const len = Number(response.headers.get("content-length") || 0);
    if (len > MAX_BYTES) throw new Error("Response is too large.");
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_BYTES) throw new Error("Response is too large.");
    res.status(response.status);
    res.setHeader("Content-Type", type.startsWith("text/") ? `${type}; charset=utf-8` : type);
    res.setHeader("Content-Security-Policy", "default-src 'self' data: blob:; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'; media-src 'self' data: blob:; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
    if (type === "text/html" || type === "application/xhtml+xml") {
      return res.send(rewriteHtml(new TextDecoder().decode(bytes), current));
    }
    if (type === "text/css") {
      let css = new TextDecoder().decode(bytes);
      css = css.replace(/url\((['"]?)(.*?)\1\)/gi, (m,q,v) => {
        if (/^(data:|blob:|#)/i.test(v)) return m;
        try { return `url(${q}${proxied(new URL(v, current).href)}${q})`; } catch { return m; }
      });
      return res.send(css);
    }
    return res.send(Buffer.from(bytes));
  } catch (error) {
    const message = error?.name === "AbortError" ? "Destination timed out." : (error?.message || "Proxy request failed.");
    return res.status(400).json({ error: message });
  }
}
