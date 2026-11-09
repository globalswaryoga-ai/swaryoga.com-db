import importlib.util
import json
import pathlib
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer


SCRIPT = pathlib.Path(__file__).parents[1] / "scripts" / "avatar-gpu-adapter-server.py"
SPEC = importlib.util.spec_from_file_location("avatar_gpu_adapter", SCRIPT)
adapter = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(adapter)


class AvatarGPUAdapterTests(unittest.TestCase):
    def setUp(self):
        self.previous_token = adapter.INFERENCE_TOKEN
        adapter.INFERENCE_TOKEN = "test-token"
        self.server = ThreadingHTTPServer(("127.0.0.1", 0), adapter.GPUAdapterHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base_url = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join(timeout=2)
        adapter.INFERENCE_TOKEN = self.previous_token

    def test_valid_render_request_fails_closed_without_creating_video(self):
        request = urllib.request.Request(
            f"{self.base_url}/render",
            data=json.dumps({"job_id": "test-job"}).encode(),
            headers={"Authorization": "Bearer test-token", "Content-Type": "application/json"},
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)

        self.assertEqual(error.exception.code, 501)
        payload = json.loads(error.exception.read())
        self.assertEqual(payload["status"], "not_implemented")
        self.assertIn("No video was rendered", payload["error"])

    def test_invalid_token_is_rejected(self):
        request = urllib.request.Request(
            f"{self.base_url}/render",
            data=b"{}",
            headers={"Authorization": "Bearer wrong-token"},
            method="POST",
        )
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)
        self.assertEqual(error.exception.code, 401)

    def test_missing_token_configuration_is_unavailable(self):
        adapter.INFERENCE_TOKEN = ""
        request = urllib.request.Request(f"{self.base_url}/render", data=b"{}", method="POST")
        with self.assertRaises(urllib.error.HTTPError) as error:
            urllib.request.urlopen(request)
        self.assertEqual(error.exception.code, 503)


if __name__ == "__main__":
    unittest.main()
