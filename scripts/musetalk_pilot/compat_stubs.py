"""Install import-compat shims for the MuseTalk rtmpose-heatmap pilot path.

Why these exist (all verified by repo grep — none are on the pilot inference path):

1. ``mmcv.ops`` — mmpose 1.3.2 eagerly imports EDPose/DeformableDETR heads at
   module level, and those do ``from mmcv.ops import MultiScaleDeformableAttention``.
   ``mmcv.ops`` requires the compiled ``mmcv._ext`` C extension which ``mmcv-lite``
   does not ship. The pilot uses ``rtmpose-l`` (heatmap head only); no pilot code
   ever constructs a deformable-attention or DeformConv module. A real full
   ``mmcv`` install is used automatically when present.

2. ``mmdet.utils`` — mmpose's ``RTMOHead`` eagerly does
   ``from mmdet.utils import ConfigType, reduce_mean``. MuseTalk's README pins
   mmdet, but mmdet 3.1.0 hard-asserts ``mmcv < 2.1.0`` while no mmcv wheel for
   Python >= 3.10 exists below 2.1.0 on the openmmlab index — so real mmdet and
   mmcv-lite are mutually incompatible on modern Colab. Only ``ConfigType``
   (an annotation alias) and ``reduce_mean`` (torch.distributed helper) are
   touched, and only if RTMO runs (it never does on this path).

3. ``xtcocotools`` — mmpose.datasets.base does ``from xtcocotools.coco import
   COCO`` at import time. PyPI ships no xtcocotools wheels past cp39 and no
   usable sdist, so on py3.10+ it is uninstallable. xtcocotools is a fork of
   pycocotools with an identical API: delegate to pycocotools when available,
   otherwise provide import-only placeholders (COCO is never instantiated by
   the pilot — it is only referenced by dataset classes we never build).

Call :func:`install` BEFORE importing ``mmpose`` / ``scripts.inference``.
Every shim is skipped when the real package already imports cleanly, so this
file is safe on environments that do have full mmcv/mmdet/xtcocotools.
"""

from __future__ import annotations

import sys
import types


def _real_importable(name: str) -> bool:
    try:
        __import__(name)
        return True
    except Exception:  # noqa: BLE001 - any failure means "not usable here"
        return False


def _install_mmcv_ops() -> None:
    if "mmcv.ops" in sys.modules:
        return
    if _real_importable("mmcv.ops"):
        return

    class _Unavailable:
        """Placeholder for mmcv.ops symbols (never constructed on this path)."""

        def __init__(self, *args, **kwargs):
            raise RuntimeError(
                "mmcv.ops is unavailable (mmcv-lite has no C extension). "
                "The pilot rtmpose-heatmap path must never construct this module."
            )

    def _module_getattr(name: str):
        # PEP 562: only fabricate public symbol names. Private/dunder lookups
        # (e.g. inspect checking __file__ while scanning sys.modules) must fail
        # normally with AttributeError, or tools like inspect/transformers break.
        if name.startswith("_"):
            raise AttributeError(name)
        return _Unavailable

    stub = types.ModuleType("mmcv.ops")
    stub.__dict__["__getattr__"] = _module_getattr
    stub.__spec__ = __import__("importlib.machinery", fromlist=["ModuleSpec"]).ModuleSpec(
        "mmcv.ops", loader=None
    )
    sys.modules["mmcv.ops"] = stub
    try:
        import mmcv

        mmcv.ops = stub
    except Exception:  # noqa: BLE001 - parent may not be imported yet; sys.modules is enough
        pass


def _install_mmdet_utils() -> None:
    if "mmdet.utils" in sys.modules:
        return
    if _real_importable("mmdet.utils"):
        return

    import torch
    import torch.distributed as dist

    try:
        from mmengine.config import Config

        config_type = "Config, dict"  # type: ignore[assignment]
        _ConfigType = __import__("typing").Union[Config, dict]
    except Exception:  # noqa: BLE001 - annotation-only fallback
        _ConfigType = dict

    def reduce_mean(tensor):
        if not (dist.is_available() and dist.is_initialized()):
            return tensor
        result = tensor.clone()
        dist.all_reduce(result, op=dist.ReduceOp.SUM)
        result /= dist.get_world_size()
        return result

    mmdet_mod = types.ModuleType("mmdet")
    mmdet_mod.__path__ = []  # mark as package  # type: ignore[attr-defined]
    mmdet_mod.__version__ = "3.1.0-shim"
    utils_mod = types.ModuleType("mmdet.utils")
    utils_mod.ConfigType = _ConfigType
    utils_mod.reduce_mean = reduce_mean
    mmdet_mod.utils = utils_mod
    sys.modules["mmdet"] = mmdet_mod
    sys.modules["mmdet.utils"] = utils_mod


def _install_xtcocotools() -> None:
    if "xtcocotools.coco" in sys.modules:
        return
    if _real_importable("xtcocotools.coco"):
        return

    try:
        from pycocotools.coco import COCO as _COCO
        from pycocotools.cocoeval import COCOeval as _COCOeval
        from pycocotools import mask as _pyco_mask

        coco_mod = types.ModuleType("xtcocotools.coco")
        coco_mod.COCO = _COCO
        cocoeval_mod = types.ModuleType("xtcocotools.cocoeval")
        cocoeval_mod.COCOeval = _COCOeval
        mask_mod = _pyco_mask  # identical API (frPyObjects, encode, …)
    except ImportError:
        coco_mod = types.ModuleType("xtcocotools.coco")
        coco_mod.COCO = type("COCO", (), {})  # import-only placeholder
        cocoeval_mod = types.ModuleType("xtcocotools.cocoeval")
        cocoeval_mod.COCOeval = type("COCOeval", (), {})
        mask_mod = types.ModuleType("xtcocotools.mask")

    root = types.ModuleType("xtcocotools")
    root.__path__ = []  # type: ignore[attr-defined]
    root.coco = coco_mod
    root.cocoeval = cocoeval_mod
    root.mask = mask_mod
    sys.modules["xtcocotools"] = root
    sys.modules["xtcocotools.coco"] = coco_mod
    sys.modules["xtcocotools.cocoeval"] = cocoeval_mod
    sys.modules["xtcocotools.mask"] = mask_mod


def _relax_torch_load_weights_only() -> None:
    """torch>=2.6 defaults ``torch.load(weights_only=True)``; mmengine's
    checkpoint loader (written pre-2.6) omits the kwarg, and the approved
    DWPose checkpoint contains numpy globals that the strict unpickler rejects.

    The pilot only loads hash-verified weights from the manifest (see
    download_pilot_weights.py), so defaulting to ``weights_only=False`` here is
    a trusted-source decision. Explicit caller kwargs are still honored.
    """
    import torch

    original = torch.load
    if getattr(original, "_swar_pilot_wrapped", False):
        return

    def load(*args, **kwargs):
        kwargs.setdefault("weights_only", False)
        return original(*args, **kwargs)

    load._swar_pilot_wrapped = True  # type: ignore[attr-defined]
    torch.load = load  # type: ignore[assignment]


def install() -> None:
    """Idempotently install every shim needed to import mmpose on this host."""
    _install_mmcv_ops()
    _install_mmdet_utils()
    _install_xtcocotools()
    _relax_torch_load_weights_only()


if __name__ == "__main__":
    install()
    import mmpose  # noqa: F401

    print(f"compat stubs installed; mmpose {mmpose.__version__} imports cleanly")
