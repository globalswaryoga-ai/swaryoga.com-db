import importlib.util
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "extract_facial_expressions.py"
SPEC = importlib.util.spec_from_file_location("extract_facial_expressions", SCRIPT_PATH)
FACIAL_SCRIPT = importlib.util.module_from_spec(SPEC)
assert SPEC is not None and SPEC.loader is not None
SPEC.loader.exec_module(FACIAL_SCRIPT)


class YouTubeDownloadConfigurationTests(unittest.TestCase):
    def test_command_does_not_use_cookies_unless_configured(self):
        with patch.dict(os.environ, {"YT_DLP_PATH": "/usr/bin/yt-dlp", "YOUTUBE_COOKIES_FILE": ""}):
            command = FACIAL_SCRIPT.build_youtube_download_command(
                "https://www.youtube.com/watch?v=abcdefghijk",
                "/tmp/video.mp4",
                FACIAL_SCRIPT.get_youtube_cookies_file(),
            )

        self.assertEqual(command[0], "/usr/bin/yt-dlp")
        self.assertNotIn("--cookies", command)
        self.assertIn("--no-playlist", command)

    def test_command_uses_only_the_configured_authorized_cookie_file(self):
        with tempfile.TemporaryDirectory() as directory:
            cookies_file = Path(directory) / "cookies.txt"
            cookies_file.write_text("# Netscape HTTP Cookie File\n", encoding="utf-8")
            with patch.dict(os.environ, {"YOUTUBE_COOKIES_FILE": str(cookies_file)}):
                configured_file = FACIAL_SCRIPT.get_youtube_cookies_file()
                command = FACIAL_SCRIPT.build_youtube_download_command(
                    "https://www.youtube.com/watch?v=abcdefghijk",
                    "/tmp/video.mp4",
                    configured_file,
                )

        self.assertEqual(command[command.index("--cookies") + 1], str(cookies_file))

    def test_missing_cookie_file_fails_with_configuration_guidance(self):
        with patch.dict(os.environ, {"YOUTUBE_COOKIES_FILE": "/missing/youtube-cookies.txt"}):
            with self.assertRaisesRegex(RuntimeError, "YOUTUBE_COOKIES_FILE"):
                FACIAL_SCRIPT.get_youtube_cookies_file()

    def test_bot_check_errors_explain_authorized_cookie_setup(self):
        anonymous_error = FACIAL_SCRIPT.format_youtube_download_error(
            "Sign in to confirm you're not a bot", False, 1
        )
        configured_error = FACIAL_SCRIPT.format_youtube_download_error(
            "Sign in to confirm you're not a bot", True, 1
        )

        self.assertIn("YOUTUBE_COOKIES_FILE", anonymous_error)
        self.assertIn("account authorized to view it", anonymous_error)
        self.assertIn("rejected the configured cookies", configured_error)

    def test_unrelated_download_errors_remain_explicit(self):
        error = FACIAL_SCRIPT.format_youtube_download_error("Video unavailable", False, 1)

        self.assertEqual(error, "yt-dlp download failed (exit code 1): Video unavailable")


if __name__ == "__main__":
    unittest.main()
