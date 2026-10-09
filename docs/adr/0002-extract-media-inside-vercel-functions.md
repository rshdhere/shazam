# Extract media with yt-dlp inside a Vercel Function, not a separate worker

We run yt-dlp and ffmpeg in a Python Vercel Function so the whole product deploys as one Vercel project, accepting that YouTube and Instagram often block or challenge datacenter IPs. A dedicated worker (Fly.io/Railway container) or Vercel Sandbox microVMs were rejected as extra infrastructure and cold-start cost for a portfolio-scale project. The function accepts optional cookies (YouTube; Instagram from a burner account, never a personal one) and a proxy URL via environment variables, so blocking is mitigated by configuration rather than re-architecture.

## Consequences

If blocking becomes persistent even with a proxy, the Extractor is the one piece to move off Vercel; it is deliberately kept narrow (Link in → Platform Tag + Clips out) to make that move cheap.
