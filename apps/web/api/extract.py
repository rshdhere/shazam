"""Extractor: fetches the media behind a Link and cuts audio Clips from it.

POST JSON {url, maxClips, clipSeconds, skipSeconds}
  -> {ok: true, durationSeconds, clips: [{offsetSeconds, audioBase64}]}
  -> {ok: false, reason: "unavailable" | "blocked"}

Runs as a Vercel Python Function; `python3 api/extract.py` serves it locally.
"""

import base64
import json
import os
import shutil
import subprocess
import tempfile
from http.server import BaseHTTPRequestHandler, HTTPServer

import yt_dlp

BLOCKED_HINTS = (
    "sign in to confirm",
    "login required",
    "log in",
    "rate-limit",
    "http error 429",
    "http error 403",
    "not a bot",
)


def ffmpeg_path():
    found = shutil.which("ffmpeg")
    if found:
        return found
    import imageio_ffmpeg

    return imageio_ffmpeg.get_ffmpeg_exe()


def plan_clips(duration, max_clips, clip_seconds, skip_seconds):
    """Offsets (seconds) of up to max_clips evenly spaced Clips."""
    if duration < skip_seconds + clip_seconds:
        return [(0.0, duration)]
    last = duration - clip_seconds
    if max_clips == 1:
        return [((skip_seconds + last) / 2, clip_seconds)]
    step = (last - skip_seconds) / (max_clips - 1)
    return [(skip_seconds + step * i, clip_seconds) for i in range(max_clips)]


def cut_clip(source, offset, length):
    result = subprocess.run(
        [ffmpeg_path(), "-v", "error", "-ss", f"{offset:.2f}", "-t", f"{length:.2f}",
         "-i", source, "-vn", "-ac", "1", "-ar", "44100", "-b:a", "96k", "-f", "mp3", "pipe:1"],
        capture_output=True,
        check=True,
    )
    return result.stdout


def classify(error):
    message = str(error).lower()
    return "blocked" if any(hint in message for hint in BLOCKED_HINTS) else "unavailable"


def extract(request):
    workdir = tempfile.mkdtemp()
    options = {
        "quiet": True,
        "no_warnings": True,
        "noplaylist": True,
        "format": "bestaudio/best",
        "outtmpl": os.path.join(workdir, "media.%(ext)s"),
        "ffmpeg_location": ffmpeg_path(),
        "socket_timeout": 20,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            try:
                info = ydl.extract_info(request["url"], download=False)
                duration = float(info.get("duration") or 0)
                ydl.process_ie_result(info, download=True)
            except yt_dlp.utils.DownloadError as error:
                return {"ok": False, "reason": classify(error)}
        media = next(os.path.join(workdir, f) for f in os.listdir(workdir) if f.startswith("media."))
        clips = [
            {"offsetSeconds": round(offset, 2), "audioBase64": base64.b64encode(cut_clip(media, offset, length)).decode()}
            for offset, length in plan_clips(
                duration, int(request["maxClips"]), float(request["clipSeconds"]), float(request["skipSeconds"])
            )
        ]
        return {"ok": True, "durationSeconds": duration, "clips": clips}
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        secret = os.environ.get("EXTRACTOR_SECRET")
        if secret and self.headers.get("authorization") != f"Bearer {secret}":
            return self.respond(401, {"error": "unauthorized"})
        length = int(self.headers.get("content-length") or 0)
        try:
            request = json.loads(self.rfile.read(length))
        except json.JSONDecodeError:
            return self.respond(400, {"error": "invalid json"})
        self.respond(200, extract(request))

    def respond(self, status, body):
        payload = json.dumps(body).encode()
        self.send_response(status)
        self.send_header("content-type", "application/json")
        self.send_header("content-length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


if __name__ == "__main__":
    port = int(os.environ.get("EXTRACTOR_PORT", "3001"))
    print(f"Extractor listening on http://localhost:{port}")
    HTTPServer(("127.0.0.1", port), handler).serve_forever()
