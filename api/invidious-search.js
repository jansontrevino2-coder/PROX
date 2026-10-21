const INSTANCES = [
  "https://inv.nadeko.net",
  "https://invidious.nerdvpn.de",
  "https://yt.chocolatemoo53.com",
  "https://invidious.tiekoetter.com",
  "https://invidious.f5.si"
];

function cleanThumbnail(value, videoId) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) throw new Error();
    return url.href;
  } catch {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || "").trim();
  if (!q || q.length > 120) return res.status(400).json({ error: "Enter a search between 1 and 120 characters." });

  for (const instance of INSTANCES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const url = `${instance}/api/v1/search?q=${encodeURIComponent(q)}&type=video&region=US`;
      const upstream = await fetch(url, {
        signal: controller.signal,
        headers: { accept: "application/json", "user-agent": "Vercel-Invidious-Search/1.0" }
      });
      if (!upstream.ok) continue;
      const data = await upstream.json();
      if (!Array.isArray(data)) continue;
      const results = data.filter(item => item?.type === "video" && /^[A-Za-z0-9_-]{11}$/.test(item.videoId)).slice(0, 18).map(item => ({
        id: item.videoId,
        title: String(item.title || "Untitled video"),
        channel: String(item.author || "Unknown channel"),
        thumbnail: cleanThumbnail(item.videoThumbnails?.find(x => x.quality === "medium")?.url || item.videoThumbnails?.[0]?.url, item.videoId),
        duration: Number.isFinite(item.lengthSeconds) ? item.lengthSeconds : null
      }));
      if (results.length) return res.status(200).json({ results, source: new URL(instance).hostname });
    } catch {}
    finally { clearTimeout(timer); }
  }
  return res.status(502).json({ error: "All trusted Invidious search instances are currently unavailable. Try again shortly." });
}
