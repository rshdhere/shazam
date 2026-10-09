# Recognise songs with external engines, not our own fingerprint catalogue

Identifying arbitrary songs requires a fingerprint catalogue of essentially all released music, which we cannot build or license. So despite being a "Shazam alternative", we send Clips to hosted recognition engines (ACRCloud and AudD) behind a common interface, with the primary/fallback order chosen by configuration. A self-hosted fingerprinter (Dejavu-style) was rejected because it only recognises songs we ingest ourselves; the unofficial Shazam endpoint was rejected because it violates Shazam's terms and can break without notice.

## Consequences

Every non-reused Lookup costs money per Clip, which is why Lookups are reused per canonical Link and rate-limited per IP.
