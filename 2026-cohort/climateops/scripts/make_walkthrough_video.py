#!/usr/bin/env python3
"""
Generates a fast, high-density 1080p MP4 Walkthrough Video for ClimateOps submission.
Covers all user journeys (Ingestion, Scoring, Stress Test, NIM Brief, ADR-001 Approval Gate,
Field Staff Checklist, Photo Proof, Manager Verification, Audit Ledger, and 108 Tests)
with clear on-screen transcriptions and zero personal names.
"""

import os
import subprocess
import time
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/Users/justinmafie/Desktop/research/nvidia-hackathon/climateops-project-skeleton/2026-cohort/climateops")
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
OUT_DIR = ROOT / "docs/09-submission"
FRAMES_DIR = Path("/tmp/climateops_frames")
FRAMES_DIR.mkdir(parents=True, exist_ok=True)

WIDTH, HEIGHT = 1920, 1080

def capture_page(url: str, out_path: Path, height: int = 1080, virtual_time_ms: int = 2000):
    cmd = [
        CHROME,
        "--headless",
        "--hide-scrollbars",
        f"--window-size={WIDTH},{height}",
        f"--virtual-time-budget={virtual_time_ms}",
        f"--screenshot={out_path}",
        url
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def add_transcription_overlay(img_path: Path, category: str, stage_tag: str, transcription: str):
    im = Image.open(img_path).convert("RGBA")
    
    # Crop or resize if needed to exactly 1920x1080
    if im.size != (WIDTH, HEIGHT):
        im = im.crop((0, 0, WIDTH, HEIGHT))

    # Frosted dark translucent banner at bottom
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    bar_h = 136
    bar_y = HEIGHT - bar_h - 22
    bar_x = 44
    bar_w = WIDTH - 88

    # Rounded translucent rectangle with emerald border
    overlay_draw.rounded_rectangle(
        [(bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h)],
        radius=14,
        fill=(8, 14, 12, 235),
        outline=(16, 185, 129, 210),
        width=2
    )

    im = Image.alpha_composite(im, overlay)
    draw = ImageDraw.Draw(im)

    try:
        font_header = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        font_tag = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 17)
        font_text = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
    except Exception:
        font_header = font_tag = font_text = ImageFont.load_default()

    # Draw Category Header (Green) and Stage Tag (Silver/Teal)
    draw.text((bar_x + 24, bar_y + 16), f"CLIMATEOPS DEMO · {category.upper()}", fill=(16, 185, 129), font=font_header)
    draw.text((bar_x + bar_w - 320, bar_y + 18), f"[ {stage_tag.upper()} ]", fill=(148, 163, 184), font=font_tag)

    # Draw 2-line transcription text (White)
    draw.text((bar_x + 24, bar_y + 52), transcription, fill=(255, 255, 255), font=font_text, spacing=8)

    im.convert("RGB").save(img_path)

def main():
    print("Generating fast-paced ClimateOps walkthrough video (zero personal names, all user journeys)...")

    # Step 1: Pre-capture base fullpage renders
    print("1. Capturing high-resolution viewport sources...")
    mgr_full = FRAMES_DIR / "src_mgr_full.png"
    staff_full = FRAMES_DIR / "src_staff_full.png"
    stress_full = FRAMES_DIR / "src_stress_full.png"
    slide1 = FRAMES_DIR / "src_slide1.png"
    slide3 = FRAMES_DIR / "src_slide3.png"
    slide7 = FRAMES_DIR / "src_slide7.png"

    capture_page("http://localhost:8080/?who=demo-manager-a", mgr_full, height=2500, virtual_time_ms=2500)
    capture_page("http://localhost:8080/?who=demo-staff-a", staff_full, height=2500, virtual_time_ms=2500)
    capture_page("http://localhost:8080/?temp=104", stress_full, height=2500, virtual_time_ms=2500)
    capture_page(f"file://{ROOT}/docs/09-submission/slides.html?slide=1", slide1, height=1080, virtual_time_ms=1000)
    capture_page(f"file://{ROOT}/docs/09-submission/slides.html?slide=3", slide3, height=1080, virtual_time_ms=1000)
    capture_page(f"file://{ROOT}/docs/09-submission/slides.html?slide=7", slide7, height=1080, virtual_time_ms=1000)

    # Open base images
    im_mgr = Image.open(mgr_full)
    im_staff = Image.open(staff_full)
    im_stress = Image.open(stress_full)

    # Step 2: Define the 12 fast scenes covering every user journey
    scenes = [
        {
            "id": "scene_01_mission",
            "base_image": Image.open(slide1),
            "category": "Executive Mission · SDG 13 Resilience",
            "stage_tag": "System Overview",
            "transcription": "Extreme heat is America's deadliest weather threat. Mott Haven (South Bronx CD1) faces NYC's highest heat vulnerability (5/5).\nClimateOps operationalizes National Weather Service alerts into verified, human-approved facility readiness preparations.",
            "duration": 8
        },
        {
            "id": "scene_02_ingestion",
            "base_image": im_mgr.crop((0, 0, 1920, 1080)),
            "category": "Data Provenance · Live NWS Weather Feed",
            "stage_tag": "Data Ingestion",
            "transcription": "Live ingestion of National Weather Service CAP alerts for South Bronx zone NYZ073 with automated freshness labeling.\nLive weather telemetry: 88°F ambient, 94°F Heat Index, providing an authoritative baseline for municipal mobilization.",
            "duration": 9
        },
        {
            "id": "scene_03_scoring",
            "base_image": im_mgr.crop((0, 260, 1920, 1340)),
            "category": "Decision Engine · 10-Facility Portfolio",
            "stage_tag": "Risk Scoring",
            "transcription": "Zero black-box AI. Mathematical formula: Heat Index (30%) + Vulnerability (25%) + AC Outage (20%) + Occupancy (15%) + Staff (10%).\nRanks 10 facilities (8 real Bronx public sites + 2 demo controls). E. Roberts Moore Center scores 93.3 (CRITICAL).",
            "duration": 10
        },
        {
            "id": "scene_04_stress_test",
            "base_image": im_stress.crop((0, 200, 1920, 1280)),
            "category": "Simulation · 104°F Heat Wave Stress Test",
            "stage_tag": "What-If Analysis",
            "transcription": "Operators stress-test facilities across temperatures from 80°F to 115°F with instantaneous score recalculation.\nAt 104°F extreme heat, priority rankings immediately reorder, escalating high-occupancy sites into the critical action queue.",
            "duration": 9
        },
        {
            "id": "scene_05_architecture",
            "base_image": Image.open(slide3),
            "category": "Enterprise Stack · Google Cloud + NVIDIA NIM",
            "stage_tag": "Enterprise Stack",
            "transcription": "Google Cloud Run serverless backend with Firestore native event sourcing, Secret Manager, and short-lived Cloud Storage signed URLs.\nOrchestrated with NVIDIA NIM microservices: nemotron-3.5-bolt-e4b for synthesis and llama-3.2 for vision verification.",
            "duration": 9
        },
        {
            "id": "scene_06_nim_brief",
            "base_image": im_mgr.crop((0, 750, 1920, 1830)),
            "category": "AI Action Plan · NVIDIA Nemotron-3.5",
            "stage_tag": "AI Synthesis",
            "transcription": "NVIDIA NIM Nemotron synthesizes site-specific physical preparation checklists for chillers, generators, and hydration.\nStrict evidence grounding binds every task to verified building attributes using citation anchors [FACT-1], eliminating hallucinations.",
            "duration": 10
        },
        {
            "id": "scene_07_approval_gate",
            "base_image": im_mgr.crop((0, 780, 1920, 1860)),
            "category": "User Journey 1 · ADR-001 Manager Safety Gate",
            "stage_tag": "Operations Manager",
            "transcription": "Safety-first governance: AI proposes actions, but an authorized Operations Manager must formally approve the brief.\nStrict safety barrier: generating physical tasks before approval returns HTTP 409 Conflict. Approval binds brief SHA-256 hash.",
            "duration": 10
        },
        {
            "id": "scene_08_staff_tasks",
            "base_image": im_staff.crop((0, 1100, 1920, 2180)),
            "category": "User Journey 2 · Field Staff Task Execution",
            "stage_tag": "Field Operations",
            "transcription": "Role-Based Access Control (RBAC): Field staff see assigned physical tasks with managerial approval controls locked (HTTP 403).\nStaff click 'Start Task' to begin physical deployment of portable cooling, hydration stations, and emergency power.",
            "duration": 10
        },
        {
            "id": "scene_09_photo_proof",
            "base_image": im_staff.crop((0, 1100, 1920, 2180)),
            "category": "User Journey 2 · GCS Signed Photo Proof",
            "stage_tag": "Field Operations",
            "transcription": "Field technicians upload physical photo proof of chiller pressure gauges and water station deployment.\nImages stream to private Google Cloud Storage via secure 15-minute HMAC signed URLs, evaluated with Nemotron Vision.",
            "duration": 10
        },
        {
            "id": "scene_10_manager_verify",
            "base_image": im_mgr.crop((0, 1100, 1920, 2180)),
            "category": "User Journey 3 · Manager Verification & Sign-Off",
            "stage_tag": "Operations Manager",
            "transcription": "Switching to Manager persona: Manager inspects submitted field photo evidence and advisory AI checks.\nManager clicks 'Verify & Accept', certifying physical completion and preventing unverified verbal sign-offs.",
            "duration": 10
        },
        {
            "id": "scene_11_audit_ledger",
            "base_image": im_mgr.crop((0, 1420, 1920, 2500)),
            "category": "Compliance · Immutable SHA-256 Audit Trail",
            "stage_tag": "Audit & Governance",
            "transcription": "Firestore event sourcing records every state transition, brief approval, photo upload, and manager verification in real time.\nImmutable cryptographic audit stream with microsecond UTC timestamps provides full transparency for municipal heat emergencies.",
            "duration": 9
        },
        {
            "id": "scene_12_tests_closing",
            "base_image": Image.open(slide7),
            "category": "Verification · 108 Automated Tests in CI",
            "stage_tag": "Production Ready",
            "transcription": "108 / 108 automated pytest tests passing in CI. Full tenant isolation, STRIDE threat model, and zero secrets committed.\nBuilt for the Mentor Me Collective × Google Cloud Launchpad Showcase — empowering resilient South Bronx communities.",
            "duration": 9
        }
    ]

    total_seconds = sum(s["duration"] for s in scenes)
    print(f"Total video planned duration: {total_seconds} seconds (~{total_seconds//60}:{total_seconds%60:02d} mins)")

    # Step 3: Render frames with transcription overlay
    image_files = []
    for idx, s in enumerate(scenes):
        print(f"[{idx+1}/{len(scenes)}] Rendering {s['id']}...")
        frame_path = FRAMES_DIR / f"{s['id']}.png"
        s["base_image"].convert("RGB").save(frame_path)
        add_transcription_overlay(frame_path, s["category"], s["stage_tag"], s["transcription"])
        image_files.append((frame_path, s["duration"]))

    # Step 4: Write concat file for ffmpeg
    concat_file = FRAMES_DIR / "concat.txt"
    with open(concat_file, "w") as f:
        for fpath, dur in image_files:
            f.write(f"file '{fpath}'\n")
            f.write(f"duration {dur}\n")
        # Quirk of ffmpeg concat demuxer: last file must be repeated without duration
        f.write(f"file '{image_files[-1][0]}'\n")

    # Step 5: Encode with ffmpeg
    out_mp4 = OUT_DIR / "climateops_walkthrough.mp4"
    print(f"Encoding walkthrough video to {out_mp4} using ffmpeg...")

    cmd_ffmpeg = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "veryfast",
        "-crf", "22",
        str(out_mp4)
    ]
    subprocess.run(cmd_ffmpeg, check=True)
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"Successfully generated {out_mp4} ({size_mb:.2f} MB, {total_seconds}s duration)!")

if __name__ == "__main__":
    main()
