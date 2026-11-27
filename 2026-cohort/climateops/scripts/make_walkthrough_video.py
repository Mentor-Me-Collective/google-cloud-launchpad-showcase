#!/usr/bin/env python3
"""
Generates a broadcast-quality 1080p MP4 Walkthrough Video for ClimateOps submission.
Captures live UI states from http://localhost:8080 and slides from docs/09-submission/slides.html,
composites high-contrast captions and title overlays, and encodes with ffmpeg.
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

def capture_url(url: str, out_path: Path, wait_sec: float = 1.0):
    cmd = [
        CHROME,
        "--headless",
        "--hide-scrollbars",
        f"--window-size={WIDTH},{HEIGHT}",
        f"--screenshot={out_path}",
        url
    ]
    subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)

def add_caption_overlay(img_path: Path, act_title: str, speaker_tag: str, caption_text: str):
    im = Image.open(img_path).convert("RGBA")
    draw = ImageDraw.Draw(im)

    # Dark translucent banner at the bottom
    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    bar_h = 130
    bar_y = HEIGHT - bar_h - 20
    bar_x = 40
    bar_w = WIDTH - 80

    overlay_draw.rounded_rectangle(
        [(bar_x, bar_y), (bar_x + bar_w, bar_y + bar_h)],
        radius=16,
        fill=(10, 16, 14, 230),
        outline=(16, 185, 129, 180),
        width=2
    )

    im = Image.alpha_composite(im, overlay)
    draw = ImageDraw.Draw(im)

    # Load standard system font
    try:
        font_title = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 20)
        font_sub = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 24)
        font_meta = ImageFont.truetype("/System/Library/Fonts/Helvetica.ttc", 16)
    except Exception:
        font_title = font_sub = font_meta = ImageFont.load_default()

    # Draw header text
    draw.text((bar_x + 24, bar_y + 16), f"CLIMATEOPS DEMO · {act_title.upper()}", fill=(16, 185, 129), font=font_title)
    draw.text((bar_x + bar_w - 280, bar_y + 18), speaker_tag, fill=(148, 163, 184), font=font_meta)

    # Draw caption body
    draw.text((bar_x + 24, bar_y + 54), caption_text, fill=(255, 255, 255), font=font_sub)

    im.convert("RGB").save(img_path)

def main():
    print("Capturing live scenes and slides for the 5-minute walkthrough...")

    scenes = [
        {
            "id": "scene_01_cover",
            "url": f"file://{ROOT}/docs/09-submission/slides.html?slide=1",
            "title": "Act 1: Cover, Problem & SDG 13 Mission",
            "speaker": "Justin Mafie · AI Cloud Leader",
            "caption": "Extreme heat is America's deadliest climate event. Mott Haven & Melrose suffer from NYC's highest Heat Vulnerability Index (5/5).\nClimateOps turns raw NWS warnings into verified, human-approved physical facility preparations.",
            "duration": 18
        },
        {
            "id": "scene_02_weather",
            "url": "http://localhost:8080/?scroll=.header-title-box",
            "title": "Act 2: Real-Time Weather Alert Ingestion & Provenance",
            "speaker": "Kseniya Naumovich · Cloud Data Analytics",
            "caption": "ClimateOps monitors National Weather Service CAP alerts for South Bronx zone NYZ073 with active freshness labeling.\nWe track 10 facilities (6 real public sites + 2 controlled benchmark test buildings in Tenant A).",
            "duration": 22
        },
        {
            "id": "scene_03_ranking",
            "url": "http://localhost:8080/?scroll=%23rank-list&highlight=%23rank-list",
            "title": "Act 3: Explainable 5-Factor Vulnerability Scoring",
            "speaker": "Kseniya Naumovich · Cloud Data Analytics",
            "caption": "Zero black-box decisions. Mathematical formula: Heat Index (30%) + Vulnerability (25%) + AC Outage (20%) + Occupancy (15%) + Staff (10%).\nRank #1: E. Roberts Moore Older Adult Center scores 93.3 due to fragile seniors and a broken chiller.",
            "duration": 24
        },
        {
            "id": "scene_04_stress_sim",
            "url": "http://localhost:8080/?temp=104&scroll=.hazard-bar-container",
            "title": "Act 4: What-If Stress Testing Simulator (104°F Heat Wave)",
            "speaker": "Kseniya Naumovich · Cloud Data Analytics",
            "caption": "Operators can stress-test operations by adjusting ambient temperatures from 80°F to 115°F.\nAt 104°F extreme heat, facility risk scores and priority rankings recalculate dynamically in real time.",
            "duration": 22
        },
        {
            "id": "scene_05_architecture",
            "url": f"file://{ROOT}/docs/09-submission/slides.html?slide=3",
            "title": "Act 5: Enterprise Google Cloud & NVIDIA NIM Architecture",
            "speaker": "Blanca Perez · Team Lead & AI Research",
            "caption": "Google Cloud Run serverless backend with Firestore native event sourcing, Secret Manager, and Cloud Storage.\nPaired with NVIDIA NIM microservices (nemotron-3.5-bolt-e4b) for grounded synthesis and llama-3.2 vision.",
            "duration": 22
        },
        {
            "id": "scene_06_brief",
            "url": "http://localhost:8080/?scroll=%23brief&highlight=%23brief",
            "title": "Act 6: NVIDIA NIM Action Brief with Strict Citations",
            "speaker": "Blanca Perez · Team Lead & AI Research",
            "caption": "NVIDIA NIM Nemotron-3.5 synthesizes actionable, facility-specific preparation checklists.\nCrucially, all recommendations are grounded in verified data via citation tags [FACT-1], eliminating hallucinations.",
            "duration": 24
        },
        {
            "id": "scene_07_approval_gate",
            "url": f"file://{ROOT}/docs/09-submission/slides.html?slide=5",
            "title": "Act 7: ADR-001 Mandatory Human Manager Approval Gate",
            "speaker": "Justin Mafie · AI Cloud Leader",
            "caption": "Safety-first governance: AI proposes recommendations, but an authorized manager must formally approve.\nCryptographically binds SHA-256 brief hash. Creating tasks before approval returns HTTP 409 Conflict.",
            "duration": 24
        },
        {
            "id": "scene_08_staff_proof",
            "url": "http://localhost:8080/?who=demo-staff-a&scroll=%23tasks-list",
            "title": "Act 8: Field Staff Execution & GCS Signed Photo Proof",
            "speaker": "Shiksha Kandel · Cloud Cybersecurity",
            "caption": "Role-Based Access Control (RBAC): Staff technician Marcus sees assigned tasks with approval buttons locked (HTTP 403).\nUploads physical photo proof of chiller gauges directly to Cloud Storage via 15-minute HMAC signed URLs.",
            "duration": 24
        },
        {
            "id": "scene_09_verify_audit",
            "url": "http://localhost:8080/?who=demo-manager-a&scroll=%23events-list",
            "title": "Act 9: Manager Verification & Immutable Audit Ledger",
            "speaker": "Blanca & Shiksha · Verification & Governance",
            "caption": "Switching back to Manager, Justin signs off with 'Verify & Accept'.\nFirestore native mode event sourcing logs every state change with microsecond timestamps for city compliance.",
            "duration": 22
        },
        {
            "id": "scene_10_tests_credits",
            "url": f"file://{ROOT}/docs/09-submission/slides.html?slide=7",
            "title": "Act 10: 108 Automated Tests, Team Credits & Closing",
            "speaker": "Justin Mafie & ClimateOps Team",
            "caption": "108 / 108 automated backend tests passing in CI. Zero credentials leaked to git. Verified live on Cloud Run.\nBuilt for the Mentor Me Collective Google Cloud Launchpad Showcase by Blanca, Justin, Kseniya, and Shiksha.",
            "duration": 20
        }
    ]

    total_duration = sum(s["duration"] for s in scenes)
    print(f"Total video planned duration: {total_duration} seconds (~{total_duration//60}:{total_duration%60:02d} mins)")

    # 1. Capture and prepare all scene images
    image_files = []
    for idx, s in enumerate(scenes):
        print(f"[{idx+1}/{len(scenes)}] Capturing {s['id']}...")
        img_path = FRAMES_DIR / f"{s['id']}.png"
        capture_url(s["url"], img_path)
        add_caption_overlay(img_path, s["title"], s["speaker"], s["caption"])
        image_files.append((img_path, s["duration"]))

    # 2. Build ffmpeg concat script for seamless video rendering
    concat_file = FRAMES_DIR / "concat.txt"
    with open(concat_file, "w") as f:
        for img_path, dur in image_files:
            f.write(f"file '{img_path}'\n")
            f.write(f"duration {dur}\n")
        # repeat last image for ffmpeg quirk
        f.write(f"file '{image_files[-1][0]}'\n")

    out_mp4 = OUT_DIR / "climateops_walkthrough.mp4"
    print(f"Encoding walkthrough video to {out_mp4} using ffmpeg...")

    # Encode 1080p 30fps MP4 with h264
    cmd = [
        "ffmpeg",
        "-y",
        "-f", "concat",
        "-safe", "0",
        "-i", str(concat_file),
        "-vf", "fps=30,format=yuv420p",
        "-c:v", "libx264",
        "-preset", "medium",
        "-crf", "20",
        str(out_mp4)
    ]
    subprocess.run(cmd, check=True)
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"Successfully generated {out_mp4} ({size_mb:.2f} MB, {total_duration}s duration)!")

if __name__ == "__main__":
    main()
