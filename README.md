# Public HTTPS Proxy with Invidious Search

## Features

- Guarded public HTTPS web proxy
- In-app YouTube video search through trusted public Invidious instances
- Automatic fallback between the public instances listed by the Invidious project
- YouTube watch, Shorts, live, embed, and youtu.be link detection
- Official YouTube iframe playback
- No Google Cloud project or API key required

## Deploy

Import the project into Vercel and deploy it. No environment variables are required.

## Reliability

Public Invidious instances may rate-limit automated traffic or become temporarily unavailable. The backend tries several instances in sequence and returns a clear error if none respond.

## Proxy protections

HTTPS only, no custom ports, blocks private/reserved networks, revalidates redirects, GET only, response limits, restrictive CSP, and sandboxed proxied pages.
