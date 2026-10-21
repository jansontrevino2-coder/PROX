# Public HTTPS Vercel Proxy

A guarded Vercel fetch proxy for public HTTPS websites. No hostname allowlist is required.

## Deploy

Import this project into Vercel and deploy it. No environment variables are required.

## Protections

- HTTPS destinations only
- Blocks credentials embedded in URLs
- Blocks custom destination ports
- DNS checks block private/reserved targets
- Redirect destinations are revalidated
- 5 MB response limit
- 12 second timeout
- GET only and proxied form submission blocked
- Restrictive CSP and sandboxed iframe

## Limitations

Complex sites may not work because authentication, cookies, WebSockets, JavaScript navigation, anti-bot systems, and browser security policies are not fully reproduced by this lightweight proxy.
