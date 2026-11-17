#!/usr/bin/env python3
"""Pilot entrypoint for MuseTalk inference with the user-approved replacements.

Swaps in, before ``scripts.inference`` is imported (its ``from musetalk.utils.
face_parsing import FaceParsing`` binds at import time):

  * ``FaceParsing``  -> ``GeometricFaceParsing`` (landmark-derived geometric
    mask; BiSeNet checkpoint excluded, see geometric_face_parsing.py)
  * ``face_detection`` -> YuNet shim (S3FD excluded, see face_detection.py;
    won via sys.path ordering, no patching required)

Everything else is unmodified upstream ``scripts/inference.py``.

Usage (cwd does not matter; this script chdirs to ``MUSETALK_HOME``)::

    python scripts/musetalk_pilot/run_inference_pilot.py \\
        --musetalk_home /path/to/MuseTalk \\
        --inference_config /path/to/task.yaml \\
        --result_dir /path/to/results

Output: the mp4 named by ``--output_vid_name`` (or upstream default) under
``<result_dir>/v15/``. NOTE: upstream ``inference.py`` swallows per-task
exceptions and exits 0 — callers MUST verify the output file exists and has a
non-zero duration (the GPU adapter does exactly that).
"""

from __future__ import annotations

import argparse
import os
import sys


def build_parser() -> argparse.ArgumentParser:
    # Defaults mirror scripts/inference.py exactly; only paths differ.
    parser = argparse.ArgumentParser(description="MuseTalk pilot inference (approved replacements only)")
    parser.add_argument("--musetalk_home", type=str, required=True, help="Path to the MuseTalk clone root")
    parser.add_argument("--ffmpeg_path", type=str, default="./ffmpeg-4.4-amd64-static/")
    parser.add_argument("--gpu_id", type=int, default=0)
    parser.add_argument("--vae_type", type=str, default="sd-vae")
    parser.add_argument("--unet_config", type=str, default=None, help="Default: <musetalk_home>/models/musetalkV15/musetalk.json")
    parser.add_argument("--unet_model_path", type=str, default=None, help="Default: <musetalk_home>/models/musetalkV15/unet.pth")
    parser.add_argument("--whisper_dir", type=str, default=None, help="Default: <musetalk_home>/models/whisper")
    parser.add_argument("--inference_config", type=str, required=True)
    parser.add_argument("--bbox_shift", type=int, default=0)
    parser.add_argument("--result_dir", default="./results")
    parser.add_argument("--extra_margin", type=int, default=10)
    parser.add_argument("--fps", type=int, default=25)
    parser.add_argument("--audio_padding_length_left", type=int, default=2)
    parser.add_argument("--audio_padding_length_right", type=int, default=2)
    parser.add_argument("--batch_size", type=int, default=8)
    parser.add_argument("--output_vid_name", type=str, default=None)
    parser.add_argument("--use_saved_coord", action="store_true")
    parser.add_argument("--saved_coord", action="store_true")
    parser.add_argument("--use_float16", action="store_true")
    parser.add_argument("--parsing_mode", default="jaw")
    parser.add_argument("--left_cheek_width", type=int, default=90)
    parser.add_argument("--right_cheek_width", type=int, default=90)
    parser.add_argument("--version", type=str, default="v15", choices=["v1", "v15"])
    return parser


def main() -> int:
    args = build_parser().parse_args()

    musetalk_home = os.path.abspath(args.musetalk_home)
    if not os.path.isdir(os.path.join(musetalk_home, "musetalk")):
        print(f"[pilot] ERROR: {musetalk_home} does not look like a MuseTalk clone.", file=sys.stderr)
        return 2

    # Upstream modules use paths relative to the repo root (DWPose config,
    # models/, ffmpeg). preprocessing.py initializes models at import time.
    os.chdir(musetalk_home)
    if musetalk_home not in sys.path:
        sys.path.insert(0, musetalk_home)

    # This script's directory (containing the YuNet face_detection shim and
    # GeometricFaceParsing) is sys.path[0] when executed as a file. When
    # imported instead, make sure it is present.
    pilot_dir = os.path.dirname(os.path.abspath(__file__))
    if pilot_dir not in sys.path:
        sys.path.insert(0, pilot_dir)

    # mmcv.ops / mmdet.utils / xtcocotools import shims — must run before any
    # module that eagerly imports mmpose heads/datasets (see compat_stubs.py).
    import compat_stubs  # noqa: E402

    compat_stubs.install()
    print("[pilot] compat stubs installed (mmcv.ops / mmdet.utils / xtcocotools as needed).", flush=True)

    from geometric_face_parsing import GeometricFaceParsing  # noqa: E402

    import musetalk.utils.face_parsing as face_parsing_module  # noqa: E402

    face_parsing_module.FaceParsing = GeometricFaceParsing
    print("[pilot] FaceParsing -> GeometricFaceParsing (BiSeNet excluded, approved pilot mask).", flush=True)
    print("[pilot] face_detection -> YuNet shim (S3FD excluded, approved pilot detector).", flush=True)

    from scripts import inference  # noqa: E402  (repo root is on sys.path)

    # Resolve model paths against the clone when not given explicitly.
    if args.unet_model_path is None:
        args.unet_model_path = os.path.join(musetalk_home, "models", "musetalkV15", "unet.pth")
    if args.unet_config is None:
        args.unet_config = os.path.join(musetalk_home, "models", "musetalkV15", "musetalk.json")
    if args.whisper_dir is None:
        args.whisper_dir = os.path.join(musetalk_home, "models", "whisper")

    inference.main(args)
    # Upstream swallows per-task exceptions; the caller verifies the output.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
