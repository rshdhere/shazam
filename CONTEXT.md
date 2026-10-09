# Shazam

Identifies the song(s) playing in a social-media video (Instagram, X, YouTube, Pinterest, TikTok) from a pasted link.

## Language

**Link**:
A social-media URL a user submits. Its canonical form (platform + media ID) identifies the media it points to.
_Avoid_: source, URL, input

**Clip**:
A short excerpt of audio cut from the media behind a Link.
_Avoid_: sample, snippet, window

**Lookup**:
One attempt to identify the song(s) behind a Link.
_Avoid_: search, scan, job

**Match**:
A song a recognition engine identified in a Clip, carrying its confidence and its timestamp in the media.
_Avoid_: result, guess

**Platform Tag**:
The song name the hosting platform itself attaches to the media, independent of what the audio contains.
_Avoid_: metadata, audio name

## Relationships

- A **Link** has at most one running **Lookup** at a time; anyone submitting the same Link while one runs joins it.
- A **Lookup** either completes or fails. A completed Lookup with zero **Matches** ("no match") is still a completion, not a failure; only errors such as blocked downloads or unavailable engines count as failures.
- A **Lookup** cuts several **Clips** from the media and produces zero or more distinct **Matches**.
- The same song recognised in several **Clips** is one **Match**, placed at its earliest timestamp with its highest confidence.
- A **Lookup** may carry a **Platform Tag**, shown alongside its **Matches** but never treated as one.
