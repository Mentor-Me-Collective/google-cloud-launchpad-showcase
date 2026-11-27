#!/usr/bin/env python3
"""Run the app's AI photo-proof check (DEC-09) on photos with your own key. Nothing is stored.
  export NVIDIA_API_KEY=...   (never commit it)
  python scripts/try_vision.py HT-01 photo1.jpg [photo2.jpg ...]
Task ids with a photo rule: HT-01 (thermostat/AC at 78°F or below), HT-07 (drinking water), HT-09 (blinds closed).
Prints the advisory verdict the manager would see for each photo."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app.config import Settings  # noqa: E402
from app.uploads import sniff_image_type  # noqa: E402
from app.vision import TASK_RULES, VisionClient, run_photo_check  # noqa: E402

if len(sys.argv) < 3 or sys.argv[1] not in TASK_RULES:
    sys.exit(f"Usage: python scripts/try_vision.py <{'|'.join(TASK_RULES)}> photo.jpg [more photos]")
cfg = Settings()
if not cfg.nvidia_ready:
    sys.exit("FAIL: NVIDIA_API_KEY is not set.")
vision = VisionClient(cfg.nvidia_api_key, cfg.nvidia_vision_model_id, cfg.nvidia_base_url)
print("Model:", vision.model_id, "| task:", sys.argv[1])
for path in sys.argv[2:]:
    data = Path(path).read_bytes()
    ctype = sniff_image_type(data)
    if ctype is None:
        print(f"SKIP {path}: not a JPEG or PNG")
        continue
    ai = run_photo_check(vision, data, ctype, sys.argv[1])
    if ai["status"] == "done":
        print(f"{ai['verdict'].upper():8s} {Path(path).name}  reading={ai['reading_f']}  {ai['latency_ms']} ms  {ai['reason']}")
    else:
        print(f"{ai['status'].upper():8s} {Path(path).name}  {ai.get('error') or ai['reason']}")
