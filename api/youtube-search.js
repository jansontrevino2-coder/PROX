export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return res.status(503).json({ error: "YOUTUBE_API_KEY is not configured in Vercel." });

  const q = String(Array.isArray(req.query.q) ? req.query.q[0] : req.query.q || "").trim();
  if (!q || q.length > 120) return res.status(400).json({ error: "Enter a search between 1 and 120 characters." });

  const params = new URLSearchParams({
    part: "snippet",
    type: "video",
    videoEmbeddable: "true",
    safeSearch: "moderate",
    maxResults: "12",
    q,
    key
  });

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    const upstream = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`, { signal: controller.signal });
    clearTimeout(timer);
    const data = await upstream.json();
    if (!upstream.ok) return res.status(upstream.status).json({ error: data?.error?.message || "YouTube search failed." });
    const results = (data.items || []).map(item => ({
      id: item?.id?.videoId,
      title: item?.snippet?.title || "Untitled video",
      channel: item?.snippet?.channelTitle || "Unknown channel",
      thumbnail: item?.snippet?.thumbnails?.medium?.url || item?.snippet?.thumbnails?.default?.url || ""
    })).filter(item => /^[A-Za-z0-9_-]{11}$/.test(item.id));
    return res.status(200).json({ results });
  } catch (error) {
    return res.status(502).json({ error: error?.name === "AbortError" ? "YouTube search timed out." : "YouTube search failed." });
  }
}
