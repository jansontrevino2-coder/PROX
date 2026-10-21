# Public HTTPS Proxy with YouTube Mode

## Features

- Guarded public HTTPS web proxy
- YouTube link detection for watch, Shorts, live, embed, and youtu.be links
- Official privacy-enhanced YouTube player embeds
- YouTube video search using the official YouTube Data API v3

## Deploy

1. Import the project into Vercel.
2. Create a Google Cloud API key with YouTube Data API v3 enabled.
3. In Vercel Project Settings > Environment Variables, add `YOUTUBE_API_KEY` with that key.
4. Redeploy.

Do not put the API key in frontend JavaScript. The included `/api/youtube-search.js` route keeps it server-side.

## Proxy protections

HTTPS only, no custom ports, blocks private/reserved networks, revalidates redirects, GET only, response limits, restrictive CSP, and sandboxed proxied pages.
