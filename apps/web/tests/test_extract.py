"""Extractor options: cookies and proxy for blocked platforms.

Run with: pnpm --filter web test:extractor
"""

import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "api"))

from extract import ydl_options  # noqa: E402

COOKIES = "# Netscape HTTP Cookie File\n.youtube.com\tTRUE\t/\tTRUE\t0\tSID\tabc\n"


class YdlOptionsTest(unittest.TestCase):
    def setUp(self):
        self.workdir = tempfile.mkdtemp()

    def options(self, platform, env):
        return ydl_options({"url": "https://example.test/v", "platform": platform}, self.workdir, env)

    def test_unchanged_when_nothing_is_set(self):
        options = self.options("youtube", {})
        self.assertNotIn("cookiefile", options)
        self.assertNotIn("proxy", options)

    def test_uses_youtube_cookies_for_youtube(self):
        options = self.options("youtube", {"YTDLP_YOUTUBE_COOKIES": COOKIES})
        with open(options["cookiefile"]) as f:
            self.assertEqual(f.read(), COOKIES)
        self.assertTrue(options["cookiefile"].startswith(self.workdir))

    def test_uses_instagram_cookies_for_instagram(self):
        options = self.options("instagram", {"YTDLP_INSTAGRAM_COOKIES": COOKIES})
        with open(options["cookiefile"]) as f:
            self.assertEqual(f.read(), COOKIES)

    def test_never_sends_one_platforms_cookies_to_another(self):
        env = {"YTDLP_YOUTUBE_COOKIES": COOKIES, "YTDLP_INSTAGRAM_COOKIES": COOKIES}
        for platform in ("x", "pinterest", "tiktok"):
            self.assertNotIn("cookiefile", self.options(platform, env))
        self.assertNotIn("cookiefile", self.options("instagram", {"YTDLP_YOUTUBE_COOKIES": COOKIES}))

    def test_accepts_cookies_pasted_with_escaped_newlines(self):
        escaped = COOKIES.replace("\n", "\\n")
        options = self.options("youtube", {"YTDLP_YOUTUBE_COOKIES": escaped})
        with open(options["cookiefile"]) as f:
            self.assertEqual(f.read(), COOKIES)

    def test_ignores_blank_values(self):
        options = self.options("youtube", {"YTDLP_YOUTUBE_COOKIES": "  ", "YTDLP_PROXY": ""})
        self.assertNotIn("cookiefile", options)
        self.assertNotIn("proxy", options)

    def test_routes_every_platform_through_the_proxy(self):
        for platform in ("youtube", "instagram", "x", "pinterest", "tiktok"):
            options = self.options(platform, {"YTDLP_PROXY": "http://user:pass@proxy.test:8080"})
            self.assertEqual(options["proxy"], "http://user:pass@proxy.test:8080")


if __name__ == "__main__":
    unittest.main()
