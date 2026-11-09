#!/usr/bin/env python3
"""Health and protocol scaffold for the Swar in-house avatar inference adapter.

This server intentionally does not render video. A real, licensed inference
implementation must replace the explicit 501 response before it can complete
jobs in the in-house render queue.
"""

import argparse
import hmac
import http.server
import json
import os
import time

INFERENCE_TOKEN = os.environ.get("AVATAR_INFERENCE_TOKEN", "")


def check_cuda_availability():
    try:
        import torch
    except ImportError:
        return {
            "cuda_available": False,
            "device_name": "PyTorch is not installed",
            "device_count": 0,
            "torch_version": None,
        }

    cuda_available = torch.cuda.is_available()
    return {
        "cuda_available": cuda_available,
        "device_name": torch.cuda.get_device_name(0) if cuda_available else "CPU",
        "device_count": torch.cuda.device_count() if cuda_available else 0,
        "torch_version": torch.__version__,
    }


class GPUAdapterHandler(http.server.BaseHTTPRequestHandler):
    def _send_json(self, status_code: int, data: dict):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path != "/health":
            self._send_json(404, {"error": "Not Found"})
            return

        self._send_json(200, {
            "status": "service_ready",
            "rendering": "not_implemented",
            "inference_token_configured": bool(INFERENCE_TOKEN),
            "gpu": check_cuda_availability(),
            "timestamp": time.time(),
        })

    def do_POST(self):
        if self.path != "/render":
            self._send_json(404, {"error": "Not Found"})
            return
        if not INFERENCE_TOKEN:
            self._send_json(503, {"error": "AVATAR_INFERENCE_TOKEN is not configured."})
            return

        auth_header = self.headers.get("Authorization", "")
        expected_auth = f"Bearer {INFERENCE_TOKEN}"
        if not hmac.compare_digest(auth_header, expected_auth):
            self._send_json(401, {"error": "Unauthorized: Invalid AVATAR_INFERENCE_TOKEN"})
            return

        self._send_json(
            501,
            {
                "error": "Neural avatar inference is not implemented. No video was rendered or uploaded.",
                "status": "not_implemented",
            },
        )

    def log_message(self, format_string, *args):
        print(f"[GPU-Adapter] {format_string % args}", flush=True)


def run_server(port: int = 8080):
    server_address = ("", port)
    httpd = http.server.ThreadingHTTPServer(server_address, GPUAdapterHandler)
    print(f"[GPU-Adapter] Health/protocol scaffold listening on port {port}.", flush=True)
    print(f"[GPU-Adapter] Inference token configured: {bool(INFERENCE_TOKEN)}", flush=True)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        httpd.server_close()
        print("[GPU-Adapter] Server stopped.", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Swar avatar inference adapter scaffold")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    args = parser.parse_args()
    run_server(args.port)
