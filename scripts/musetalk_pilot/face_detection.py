"""MIT-licensed YuNet face detector as a drop-in replacement for MuseTalk's
bundled S3FD ``face_detection`` package.

Pilot approval (docs/MUSETALK_GPU_ACCEPTANCE_REPORT.md): S3FD is excluded
because its upstream license inventory gives no license identifier. YuNet
(OpenCV Zoo, MIT) is approved for this isolated pilot only.

Why this module wins the import: ``musetalk/utils/__init__.py`` appends its
own directory to ``sys.path`` with ``sys.path.append(...)`` (end of path), so
a ``face_detection`` module located in this pilot directory (script dir or
PYTHONPATH, both earlier on sys.path) shadows the bundled S3FD package.

Only the surface MuseTalk actually uses is implemented::

    from face_detection import FaceAlignment, LandmarksType
    fa = FaceAlignment(LandmarksType._2D, flip_input=False, device=device)
    bbox_list = fa.get_detections_for_batch(np_rgb_batch)
    # -> [(x1, y1, x2, y2) ints | None]  (first/highest-score face per image)

The YuNet ONNX artifact is resolved from, in order:
  1. ``MUSETALK_YUNET_ONNX`` env var
  2. ``<this_dir>/face_detection_yunet_2023mar.onnx``
  3. ``$MUSETALK_HOME/models/yunet/face_detection_yunet_2023mar.onnx``
"""

from __future__ import annotations

import enum
import os
from typing import List, Optional, Sequence, Tuple

import cv2
import numpy as np

__all__ = ["FaceAlignment", "LandmarksType", "detect_first_face"]

YUNET_FILENAME = "face_detection_yunet_2023mar.onnx"
DEFAULT_SCORE_THRESHOLD = 0.6

_box_type = Tuple[int, int, int, int]


def _resolve_yunet_path(explicit: Optional[str] = None) -> str:
    candidates = []
    if explicit:
        candidates.append(explicit)
    env_path = os.environ.get("MUSETALK_YUNET_ONNX", "").strip()
    if env_path:
        candidates.append(env_path)
    here = os.path.dirname(os.path.abspath(__file__))
    candidates.append(os.path.join(here, YUNET_FILENAME))
    musetalk_home = os.environ.get("MUSETALK_HOME", "").strip()
    if musetalk_home:
        candidates.append(os.path.join(musetalk_home, "models", "yunet", YUNET_FILENAME))
    for path in candidates:
        if path and os.path.isfile(path):
            return path
    raise FileNotFoundError(
        "YuNet model not found. Expected one of: "
        + "; ".join(c for c in candidates if c)
        + ". Run scripts/musetalk_pilot/download_pilot_weights.py first."
    )


def _create_detector(onnx_path: str, score_threshold: float = DEFAULT_SCORE_THRESHOLD) -> cv2.FaceDetectorYN:
    detector = cv2.FaceDetectorYN.create(onnx_path, "", (320, 320), score_threshold)
    return detector


def detect_first_face(
    image_bgr: np.ndarray,
    detector: Optional[cv2.FaceDetectorYN] = None,
    onnx_path: Optional[str] = None,
    score_threshold: float = DEFAULT_SCORE_THRESHOLD,
) -> Optional[Tuple[_box_type, np.ndarray]]:
    """Detect the highest-scoring face in a BGR image.

    Returns ``(box, landmarks)`` where ``box`` is ``(x1, y1, x2, y2)`` ints and
    ``landmarks`` is a ``(5, 2)`` float array in YuNet order
    (right eye, left eye, nose, right mouth corner, left mouth corner),
    or ``None`` when no face passes the threshold.
    """
    if image_bgr is None or image_bgr.size == 0:
        return None
    if detector is None:
        detector = _create_detector(_resolve_yunet_path(onnx_path), score_threshold)
    height, width = image_bgr.shape[:2]
    detector.setInputSize((width, height))
    _, faces = detector.detect(image_bgr)
    if faces is None or len(faces) == 0:
        return None
    best = max(faces, key=lambda f: float(f[-1]))
    x, y, w, h = [int(v) for v in best[:4]]
    landmarks = np.array(best[4:14], dtype=np.float32).reshape(5, 2)
    x1 = max(0, x)
    y1 = max(0, y)
    x2 = min(width, x + w)
    y2 = min(height, y + h)
    if x2 - x1 <= 1 or y2 - y1 <= 1:
        return None
    return (x1, y1, x2, y2), landmarks


class LandmarksType(enum.Enum):
    """Subset of the bundled package's enum (MuseTalk only uses ``_2D``)."""

    _2D = 1
    _2D106 = 2
    _3D = 3


class FaceAlignment:
    """YuNet-backed stand-in for MuseTalk's S3FD ``FaceAlignment``."""

    def __init__(
        self,
        landmarks_type: LandmarksType = LandmarksType._2D,
        network_size=None,  # noqa: ARG002 - accepted for signature compatibility
        device: str = "cpu",
        flip_input: bool = False,  # noqa: ARG002 - YuNet path does not flip
        face_detector: str = "sfd",  # noqa: ARG002 - always YuNet in this pilot
        verbose: bool = False,
        **kwargs,
    ) -> None:
        del network_size, flip_input, face_detector, kwargs
        self.device = device
        self.landmarks_type = landmarks_type
        self.verbose = verbose
        self._detector = _create_detector(_resolve_yunet_path())

    def get_detections_for_batch(self, images: Sequence[np.ndarray]) -> List[Optional[_box_type]]:
        """Return ``(x1, y1, x2, y2)`` per RGB image, or ``None`` if no face."""
        results: List[Optional[_box_type]] = []
        for image in images:
            rgb = np.asarray(image)
            if rgb.ndim != 3:
                results.append(None)
                continue
            bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)
            detected = detect_first_face(bgr, detector=self._detector)
            results.append(None if detected is None else detected[0])
        return results
