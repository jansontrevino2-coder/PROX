const FALLBACK = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.tiekoetter.com",
  "https://invidious.f5.si"
];

const SEARCH_TIMEOUT = 4500;

function normalizeBase(value) {
  try {
    const u = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (u.protocol !== "https:") return null;
    return u.origin;
  } catch { return null; }
}

async function fetchJson(url, ms) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json", "user-agent": "Vercel-Invidious-Search/2.0" },
      redirect: "follow"
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally { clearTimeout(timer); }
}

async function currentInstances() {
  const bases = [];
  try {
    const data = await fetchJson("https://api.invidious.io/instances.json?sort_by=health", 3500);
    if (Array.isArray(data)) {
      for (const row of data) {
        const name = Array.isArray(row) ? row[0] : null;
        const meta = Array.isArray(row) ? row[1] : null;
        if (meta?.api !== true) continue;
        const base = normalizeBase(meta?.uri || name || "");
        if (base && !bases.includes(base)) bases.push(base);
      }
    }
  } catch {}
  for (const item of FALLBACK) if (!bases.includes(item)) bases.push(item);
  return bases.slice(0, 10);
}

function mapResults(data) {
  if (!Array.isArray(data)) return [];
  return data.filter(x => x?.type === "video" && /^[A-Za-z0-9_-]{11}$/.test(x.videoId)).slice(0,18).map(x => ({
    id: x.videoId,
    title: String(x.title || "Untitled video"),
    channel: String(x.author || "Unknown channel"),
    thumbnail: `https://i.ytimg.com/vi/${x.videoId}/hqdefault.jpg`,
    duration: Number.isFinite(x.lengthSeconds) ? x.lengthSeconds : null
  }));
}

async function tryInstance(instance, q) {
  const url = `${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video&region=US`;
  const data = await fetchJson(url, SEARCH_TIMEOUT);
  const results = mapResults(data);
  if (!results.length) throw new Error("No video results");
  return { results, source: new URL(instance).hostname };
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });
  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || "").trim();
  if (!q || q.length > 120) return res.status(400).json({ error: "Enter a search between 1 and 120 characters." });

  const instances = await currentInstances();
  for (let i = 0; i < instances.length; i += 3) {
    const batch = instances.slice(i, i + 3);
    try {
      const result = await Promise.any(batch.map(x => tryInstance(x, q)));
      return res.status(200).json(result);
    } catch {}
  }
  return res.status(502).json({ error: "Search servers are temporarily unavailable. Press Retry to try a fresh instance list." });
}
