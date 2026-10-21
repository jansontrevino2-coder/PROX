# Public HTTPS Proxy with Key-Free YouTube Mode

## Features

- Guarded public HTTPS web proxy
- YouTube link detection for watch, Shorts, live, embed, and youtu.be links
- Official privacy-enhanced YouTube player embeds
- Text searches open the official YouTube search-results page in a new tab
- No Google Cloud project, API key, or environment variable required

## Deploy

Import the project into Vercel and deploy it. No environment variables are required.

## Why search opens YouTube

Official in-app YouTube result data is provided through the YouTube Data API, which requires an API key. This no-cloud edition does not scrape or imitate that API. Paste a selected video link back into YouTube mode to play it with the official embed.

## Proxy protections

HTTPS only, no custom ports, blocks private/reserved networks, revalidates redirects, GET only, response limits, restrictive CSP, and sandboxed proxied pages.
