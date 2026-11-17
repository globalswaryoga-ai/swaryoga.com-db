"""DWPose/YuNet-landmark-derived geometric face mask for the MuseTalk pilot.

Pilot approval (docs/MUSETALK_GPU_ACCEPTANCE_REPORT.md): the BiSeNet face-
parsing checkpoint (``79999_iter.pth``) has no established provenance/license
and is EXCLUDED. For this isolated pilot only, a custom geometric mask built
from face landmarks replaces the learned semantic parser.

Interface compatibility: MuseTalk calls ``fp(image, mode=...)`` and expects a
PIL ``"L"`` mask the same size as the input (see ``musetalk/utils/blending.py
face_seg``). ``inference.py`` constructs ``FaceParsing(left_cheek_width=...,
right_cheek_width=...)`` for v15; ``run_inference_pilot.py`` swaps the class
before importing ``scripts.inference``.

Known deviation from the approval wording: the approval says "DWPose-landmark-
derived". DWPose landmarks are still used for the crop box (preprocessing),
but at blend time only the cropped face image is available, so this mask is
derived from YuNet's 5-point landmarks detected on the crop. This keeps the
mask purely geometric (ellipse + jaw/neck splits), which is the intent of the
approval. Edge seams must pass visual QA before any acceptance claim.
"""

from __future__ import annotations

import os
from typing import Optional, Tuple

import numpy as np
from PIL import Image

from face_detection import detect_first_face

import cv2


def _to_pil(image) -> Image.Image:
    if isinstance(image, str):
        return Image.open(image).convert("RGB")
    if isinstance(image, np.ndarray):
        arr = image
        if arr.ndim == 2:
            return Image.fromarray(arr).convert("RGB")
        # MuseTalk passes PIL images here; if numpy arrives assume RGB.
        return Image.fromarray(arr.astype("uint8")).convert("RGB")
    if isinstance(image, Image.Image):
        return image.convert("RGB")
    raise TypeError(f"Unsupported image type for geometric face mask: {type(image)!r}")


def _fallback_ellipse(width: int, height: int) -> Tuple[float, float, float, float]:
    """Centered ellipse when YuNet finds no face in the crop (last resort)."""
    cx, cy = width / 2.0, height * 0.5
    ax, ay = width * 0.35, height * 0.4
    return cx, cy, ax, ay


class GeometricFaceParsing:
    """Landmark-derived geometric mask with the same call signature as FaceParsing."""

    def __init__(self, left_cheek_width: int = 80, right_cheek_width: int = 80, **kwargs) -> None:
        del kwargs  # accept any future constructor args from inference.py
        # BiSeNet reference space is 512x512; keep the same semantics scaled.
        self.left_cheek_width = int(left_cheek_width)
        self.right_cheek_width = int(right_cheek_width)
        self._detector = None

    def _get_detector(self):
        if self._detector is None:
            from face_detection import _create_detector, _resolve_yunet_path

            self._detector = _create_detector(_resolve_yunet_path())
        return self._detector

    def _landmark_geometry(self, pil_image: Image.Image, mode: str):
        width, height = pil_image.size
        bgr = cv2.cvtColor(np.array(pil_image), cv2.COLOR_RGB2BGR)
        detected = detect_first_face(bgr, detector=self._get_detector())
        if detected is None:
            return (*_fallback_ellipse(width, height), mode)
        _box, lm = detected
        re_x, re_y = float(lm[0][0]), float(lm[0][1])
        le_x, le_y = float(lm[1][0]), float(lm[1][1])
        nose_x, nose_y = float(lm[2][0]), float(lm[2][1])
        rm_x, rm_y = float(lm[3][0]), float(lm[3][1])
        lm_x, lm_y = float(lm[4][0]), float(lm[4][1])

        eye_y = (re_y + le_y) / 2.0
        eye_x = (re_x + le_x) / 2.0
        mouth_y = (rm_y + lm_y) / 2.0
        mouth_x = (rm_x + lm_x) / 2.0

        # Eye-to-mouth distance approximates 0.4 of face height; build the
        # full-face ellipse around the eye/mouth axis.
        eye_to_mouth = max(mouth_y - eye_y, 1.0)
        face_half_h = eye_to_mouth * 1.6
        center_x = (eye_x + mouth_x) / 2.0 + (nose_x - eye_x) * 0.1
        center_y = eye_y + face_half_h * 0.28
        axis_x = face_half_h * 0.72
        axis_y = face_half_h
        return center_x, center_y, axis_x, axis_y, mode

    def __call__(self, image, size=(512, 512), mode: str = "raw") -> Image.Image:
        pil_image = _to_pil(image)
        width, height = pil_image.size

        cx, cy, ax, ay, resolved_mode = self._landmark_geometry(pil_image, mode)

        mask = np.zeros((height, width), dtype=np.uint8)
        center = (int(round(cx)), int(round(cy)))
        axes = (max(1, int(round(ax))), max(1, int(round(ay))))
        cv2.ellipse(mask, center, axes, 0, 0, 360, 255, thickness=-1)

        if resolved_mode == "jaw":
            # Keep the lower talking region only: from just below the nose
            # downward (mouth/chin/cheeks), mirroring the BiSeNet "jaw" intent.
            split_y = int(round(cy - ay * 0.15))
            mask[: max(0, split_y), :] = 0
        elif resolved_mode == "neck":
            # Band below the chin, narrower than the face ellipse.
            band_top = int(round(cy + ay * 0.55))
            band_bottom = min(height, int(round(cy + ay * 1.15)))
            neck = np.zeros_like(mask)
            if band_bottom > band_top:
                neck[band_top:band_bottom, :] = 255
            narrow = np.zeros_like(mask)
            nx1 = max(0, int(cx - ax * 0.6))
            nx2 = min(width, int(cx + ax * 0.6))
            narrow[:, nx1:nx2] = 255
            mask = cv2.bitwise_and(neck, narrow)

        # Cheek trim: scale the 512-space BiSeNet cheek_mask semantics.
        if resolved_mode != "neck" and width > 0:
            scale = width / 512.0
            left_cut = int((256 - self.left_cheek_width) * scale)
            right_cut = int((256 + self.right_cheek_width) * scale)
            if 0 < left_cut < width:
                mask[:, :left_cut] = 0
            if 0 < right_cut < width:
                mask[:, right_cut:] = 0

        return Image.fromarray(mask, mode="L")
