# The Extractor returns Clip audio; TypeScript stores it in Blob

The spec had the Python Extractor upload Clips to Vercel Blob and return their URLs. Instead it returns each Clip's audio inline (base64, about 120 KB per 10 s Clip), and the TypeScript side puts it in Blob through a `ClipStore` port. That keeps the Extractor free of storage credentials and SDKs, so it stays the narrow, movable piece ADR 0002 wants (Link in, Platform Tag and Clips out), and lets tests and local development swap Blob for an inline `data:` store when no Blob token is set.

## Consequences

The Extractor's response grows with the Clip count, which is fine at five 10 s Clips. If a step retries after uploading some Clips, those uploads are orphaned in Blob; nothing cleans them up yet, which is acceptable at portfolio scale. yt-dlp reports a Platform Tag only where its extractor reads the platform's music credit (YouTube music credits and TikTok sounds today); Instagram's audio label is not exposed by yt-dlp, so Instagram Lookups show no Platform Tag until the Extractor reads it some other way.
