#!/usr/bin/env python3
"""
Generates an interactive teaching-style 1080p MP4 Walkthrough Video for ClimateOps.
Features dynamic app interactions:
- Temperature slider physically drags from 88°F to 96°F to 104°F, recalculating scores in real-time.
- Cursor clicks 'Approve Exact Version v1' and the brief status physically updates to APPROVED.
- Cursor navigates Field Staff checklist, clicks 'Start Task', and inspects signed photo proof.
- Cursor clicks 'Verify & Accept' as Manager and the task physically marks as ACCEPTED.
- Full navigation through the Immutable Event Ledger and 108 automated tests.
All with realistic smoothstep Bézier cursor movement, expanding click ripples, and on-screen transcriptions (zero personal names).
"""

import os
import subprocess
import time
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path("/Users/justinmafie/Desktop/research/nvidia-hackathon/climateops-project-skeleton/2026-cohort/climateops")
OUT_DIR = ROOT / "docs/09-submission"
STEPS_DIR = Path("/tmp/climateops_steps")
FRAMES_DIR = Path("/tmp/climateops_frames")

WIDTH, HEIGHT = 1920, 1080

def create_cursor_sprites():
    # 1. macOS arrow pointer
    im_arrow = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d_a = ImageDraw.Draw(im_arrow)
    s_pts = [(3, 3), (3, 25), (8, 20), (14, 30), (17, 28), (11, 18), (19, 18)]
    d_a.polygon(s_pts, fill=(0, 0, 0, 110))
    b_pts = [(2, 1), (2, 23), (7, 18), (13, 28), (16, 26), (10, 16), (18, 16)]
    d_a.polygon(b_pts, fill=(20, 20, 20, 255))
    w_pts = [(3, 3), (3, 21), (7, 17), (13, 27), (15, 26), (9, 16), (16, 16)]
    d_a.polygon(w_pts, fill=(255, 255, 255, 255))

    # 2. Hand pointer cursor
    im_hand = Image.new("RGBA", (36, 36), (0, 0, 0, 0))
    d_h = ImageDraw.Draw(im_hand)
    d_h.rounded_rectangle([(11, 8), (29, 32)], radius=7, fill=(0, 0, 0, 90))
    d_h.ellipse([(14, 2), (22, 18)], fill=(0, 0, 0, 90))
    d_h.rounded_rectangle([(10, 7), (28, 31)], radius=7, fill=(20, 20, 20, 255))
    d_h.ellipse([(13, 1), (21, 17)], fill=(20, 20, 20, 255))
    d_h.rounded_rectangle([(11, 8), (27, 30)], radius=6, fill=(255, 255, 255, 255))
    d_h.ellipse([(14, 2), (20, 16)], fill=(255, 255, 255, 255))

    return im_arrow, im_hand

def add_transcription_overlay(im: Image.Image, category: str, stage_tag: str, transcription: str) -> Image.Image:
    im = im.convert("RGBA")
    if im.size != (WIDTH, HEIGHT):
        im = im.crop((0, 0, WIDTH, HEIGHT))

    overlay = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)

    bar_h = 136
    bar_y = HEIGHT - bar_h - 22
    bar_x = 44
    bar_w = WIDTH - 88

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

    draw.text((bar_x + 24, bar_y + 16), f"CLIMATEOPS DEMO · {category.upper()}", fill=(16, 185, 129), font=font_header)
    draw.text((bar_x + bar_w - 320, bar_y + 18), f"[ {stage_tag.upper()} ]", fill=(148, 163, 184), font=font_tag)
    draw.text((bar_x + 24, bar_y + 52), transcription, fill=(255, 255, 255), font=font_text, spacing=8)

    return im.convert("RGB")

def interpolate_cursor(waypoints, f):
    for i in range(len(waypoints) - 1):
        f0, x0, y0, c0, _ = waypoints[i]
        f1, x1, y1, c1, _ = waypoints[i+1]
        if f0 <= f <= f1:
            u = (f - f0) / max(1, (f1 - f0))
            t = u * u * (3.0 - 2.0 * u) # smoothstep
            curve = -25 * math.sin(u * math.pi)
            x = x0 + (x1 - x0) * t
            y = y0 + (y1 - y0) * t + curve
            ctype = c1 if u > 0.5 else c0
            return x, y, ctype
    return waypoints[-1][1], waypoints[-1][2], waypoints[-1][3]

def main():
    print("Generating teaching-style interactive walkthrough video...")
    arrow_sprite, hand_sprite = create_cursor_sprites()

    # Load captured interactive states
    im_mgr_88 = Image.open(STEPS_DIR / "full_mgr_88.png")
    im_temp_96 = Image.open(STEPS_DIR / "full_temp_96.png")
    im_temp_104 = Image.open(STEPS_DIR / "full_temp_104.png")
    im_brief_pend = Image.open(STEPS_DIR / "full_brief_pending.png")
    im_brief_appr = Image.open(STEPS_DIR / "full_brief_approved.png")
    im_staff = Image.open(STEPS_DIR / "full_staff_view.png")
    im_mgr_rev = Image.open(STEPS_DIR / "full_mgr_review.png")
    im_mgr_acc = Image.open(STEPS_DIR / "full_mgr_accepted.png")
    slide1 = Image.open(FRAMES_DIR / "src_slide1.png")
    slide3 = Image.open(FRAMES_DIR / "src_slide3.png")
    slide7 = Image.open(FRAMES_DIR / "src_slide7.png")

    scenes = [
        # Scene 1: Mission
        {
            "id": "scene_01_mission",
            "get_bg": lambda f: slide1,
            "category": "Executive Mission · SDG 13 Resilience",
            "stage_tag": "System Overview",
            "transcription": "Extreme heat is America's deadliest weather threat. Mott Haven (South Bronx CD1) faces NYC's highest heat vulnerability (5/5).\nClimateOps operationalizes National Weather Service alerts into verified, human-approved facility readiness preparations.",
            "duration_frames": 240,
            "waypoints": [
                (0, 960, 260, 'arrow', None),
                (50, 480, 580, 'hand', 50),
                (100, 480, 580, 'arrow', None),
                (160, 960, 580, 'hand', 160),
                (210, 1420, 580, 'hand', 210),
                (240, 1420, 580, 'arrow', None)
            ]
        },
        # Scene 2: Live Ingestion
        {
            "id": "scene_02_ingestion",
            "get_bg": lambda f: im_mgr_88.crop((0, 0, 1920, 1080)),
            "category": "Data Provenance · Live NWS Weather Feed",
            "stage_tag": "Data Ingestion",
            "transcription": "Live ingestion of National Weather Service CAP alerts for South Bronx zone NYZ073 with automated freshness labeling.\nLive weather telemetry: 88°F ambient, 94°F Heat Index, providing an authoritative baseline for municipal mobilization.",
            "duration_frames": 270,
            "waypoints": [
                (0, 1200, 750, 'arrow', None),
                (45, 520, 160, 'hand', 45),
                (90, 520, 160, 'arrow', None),
                (150, 1400, 160, 'hand', 150),
                (200, 1400, 160, 'arrow', None),
                (245, 680, 310, 'hand', 245),
                (270, 680, 310, 'arrow', None)
            ]
        },
        # Scene 3: Explainable Scoring
        {
            "id": "scene_03_scoring",
            "get_bg": lambda f: im_mgr_88.crop((0, 260, 1920, 1340)),
            "category": "Decision Engine · 10-Facility Portfolio",
            "stage_tag": "Risk Scoring",
            "transcription": "Zero black-box AI. Mathematical formula: Heat Index (30%) + Vulnerability (25%) + AC Outage (20%) + Occupancy (15%) + Staff (10%).\nRanks 10 facilities (8 real Bronx public sites + 2 demo controls). E. Roberts Moore Center scores 93.3 (CRITICAL).",
            "duration_frames": 300,
            "waypoints": [
                (0, 1100, 600, 'arrow', None),
                (50, 550, 310, 'hand', 50),
                (95, 750, 310, 'hand', None),
                (150, 1050, 310, 'hand', 150),
                (210, 550, 440, 'hand', 210),
                (260, 1200, 440, 'arrow', None),
                (300, 1200, 440, 'arrow', None)
            ]
        },
        # Scene 4: What-If Stress Simulation (DYNAMIC SLIDER INTERACTION!)
        {
            "id": "scene_04_stress_test",
            # Dynamically morph background as slider is dragged!
            "get_bg": lambda f: (
                im_mgr_88.crop((0, 200, 1920, 1280)) if f < 50 else
                im_temp_96.crop((0, 200, 1920, 1280)) if f < 100 else
                im_temp_104.crop((0, 200, 1920, 1280))
            ),
            "category": "Simulation · 104°F Heat Wave Stress Test",
            "stage_tag": "What-If Analysis",
            "transcription": "Operators stress-test facilities across temperatures from 80°F to 115°F with instantaneous score recalculation.\nWatch the slider drag to 104°F extreme heat: facility risk scores jump immediately and reorder the critical response queue.",
            "duration_frames": 300,
            "waypoints": [
                (0, 600, 500, 'arrow', None),
                (35, 550, 270, 'hand', 35),     # grab slider at 88F
                (75, 800, 270, 'hand', None),   # drag to 96F
                (105, 1080, 270, 'hand', 105),  # drag to 104F, release with ripple
                (170, 750, 480, 'hand', 170),   # inspect critical score jump
                (240, 1150, 480, 'arrow', None),
                (300, 1150, 480, 'arrow', None)
            ]
        },
        # Scene 5: Architecture
        {
            "id": "scene_05_architecture",
            "get_bg": lambda f: slide3,
            "category": "Enterprise Stack · Google Cloud + NVIDIA NIM",
            "stage_tag": "Enterprise Stack",
            "transcription": "Google Cloud Run serverless backend with Firestore native event sourcing, Secret Manager, and short-lived Cloud Storage signed URLs.\nOrchestrated with NVIDIA NIM microservices: nemotron-3.5-bolt-e4b for synthesis and llama-3.2 for vision verification.",
            "duration_frames": 270,
            "waypoints": [
                (0, 960, 240, 'arrow', None),
                (50, 520, 420, 'hand', 50),
                (110, 520, 640, 'hand', 110),
                (180, 1400, 520, 'hand', 180),
                (235, 960, 720, 'hand', None),
                (270, 960, 720, 'arrow', None)
            ]
        },
        # Scene 6: NVIDIA NIM Action Plan
        {
            "id": "scene_06_nim_brief",
            "get_bg": lambda f: im_brief_pend.crop((0, 750, 1920, 1830)),
            "category": "AI Action Plan · NVIDIA Nemotron-3.5",
            "stage_tag": "AI Synthesis",
            "transcription": "NVIDIA NIM Nemotron synthesizes site-specific physical preparation checklists for chillers, generators, and hydration.\nStrict evidence grounding binds every task to verified building attributes using citation anchors [FACT-1], eliminating hallucinations.",
            "duration_frames": 300,
            "waypoints": [
                (0, 1100, 550, 'arrow', None),
                (50, 540, 240, 'hand', 50),
                (110, 580, 360, 'hand', 110),
                (170, 740, 440, 'hand', 170),
                (230, 950, 440, 'hand', None),
                (300, 950, 440, 'arrow', None)
            ]
        },
        # Scene 7: ADR-001 Approval Gate (DYNAMIC APPROVAL CLICK & STATE TRANSITION!)
        {
            "id": "scene_07_approval_gate",
            # On frame 95 click, status flips from PENDING_APPROVAL to APPROVED!
            "get_bg": lambda f: (
                im_brief_pend.crop((0, 780, 1920, 1860)) if f < 95 else
                im_brief_appr.crop((0, 780, 1920, 1860))
            ),
            "category": "User Journey 1 · ADR-001 Manager Safety Gate",
            "stage_tag": "Operations Manager",
            "transcription": "Safety-first governance: AI proposes actions, but an authorized Operations Manager must formally approve the brief.\nManager clicks 'Approve Exact Version v1': brief status physically transitions to APPROVED with SHA-256 cryptographic binding.",
            "duration_frames": 300,
            "waypoints": [
                (0, 1200, 650, 'arrow', None),
                (45, 620, 240, 'hand', None),
                (95, 540, 360, 'hand', 95),     # CLICK APPROVE BUTTON
                (160, 950, 360, 'hand', 160),   # Inspect APPROVED badge & hash
                (220, 1350, 240, 'arrow', None),
                (300, 1350, 240, 'arrow', None)
            ]
        },
        # Scene 8: Field Staff Task Execution
        {
            "id": "scene_08_staff_tasks",
            "get_bg": lambda f: im_staff.crop((0, 1100, 1920, 2180)),
            "category": "User Journey 2 · Field Staff Task Execution",
            "stage_tag": "Field Operations",
            "transcription": "Role-Based Access Control (RBAC): Field staff see assigned physical tasks with managerial approval controls locked (HTTP 403).\nStaff click 'Start Task' to begin physical deployment of portable cooling, hydration stations, and emergency power.",
            "duration_frames": 300,
            "waypoints": [
                (0, 750, 450, 'arrow', None),
                (45, 180, 160, 'hand', 45),     # point to Field Staff persona
                (105, 620, 260, 'hand', None),
                (165, 1420, 310, 'hand', 165),  # click Start Task
                (225, 650, 420, 'arrow', None),
                (300, 650, 420, 'arrow', None)
            ]
        },
        # Scene 9: Signed Photo Proof Upload
        {
            "id": "scene_09_photo_proof",
            "get_bg": lambda f: im_staff.crop((0, 1100, 1920, 2180)),
            "category": "User Journey 2 · GCS Signed Photo Proof",
            "stage_tag": "Field Operations",
            "transcription": "Field technicians upload physical photo proof of chiller pressure gauges and water station deployment.\nImages stream to private Google Cloud Storage via secure 15-minute HMAC signed URLs, evaluated with Nemotron Vision.",
            "duration_frames": 300,
            "waypoints": [
                (0, 900, 600, 'arrow', None),
                (50, 1420, 470, 'hand', 50),    # Click Upload Photo Proof
                (110, 650, 520, 'hand', 110),   # Inspect attached photo proof
                (170, 780, 560, 'hand', 170),   # Inspect AI advisory check PASS
                (235, 1420, 520, 'hand', None), # Awaiting Manager Sign-Off
                (300, 1420, 520, 'arrow', None)
            ]
        },
        # Scene 10: Manager Verification (DYNAMIC VERIFY & ACCEPT TRANSITION!)
        {
            "id": "scene_10_manager_verify",
            # On frame 95 click, task physically transitions from REVIEW to ACCEPTED!
            "get_bg": lambda f: (
                im_mgr_rev.crop((0, 1100, 1920, 2180)) if f < 95 else
                im_mgr_acc.crop((0, 1100, 1920, 2180))
            ),
            "category": "User Journey 3 · Manager Verification & Sign-Off",
            "stage_tag": "Operations Manager",
            "transcription": "Switching to Manager persona: Manager inspects submitted field photo evidence and advisory AI checks.\nManager clicks 'Verify & Accept': task immediately marks as VERIFIED & ACCEPTED, enforcing physical proof accountability.",
            "duration_frames": 300,
            "waypoints": [
                (0, 600, 400, 'arrow', None),
                (45, 180, 160, 'hand', 45),     # Persona: Operations Manager
                (95, 1380, 320, 'hand', 95),    # CLICK VERIFY & ACCEPT
                (165, 1380, 320, 'hand', None), # Status updates to ACCEPTED
                (230, 750, 320, 'hand', None),
                (300, 750, 320, 'arrow', None)
            ]
        },
        # Scene 11: Immutable Audit Ledger
        {
            "id": "scene_11_audit_ledger",
            "get_bg": lambda f: im_mgr_acc.crop((0, 1420, 1920, 2500)),
            "category": "Compliance · Immutable SHA-256 Audit Trail",
            "stage_tag": "Audit & Governance",
            "transcription": "Firestore event sourcing records every state transition, brief approval, photo upload, and manager verification in real time.\nImmutable cryptographic audit stream with microsecond UTC timestamps provides full transparency for municipal heat emergencies.",
            "duration_frames": 270,
            "waypoints": [
                (0, 1100, 550, 'arrow', None),
                (45, 520, 200, 'hand', 45),
                (105, 450, 280, 'hand', 105),   # TASK_VERIFIED
                (165, 1250, 280, 'hand', None), # Actor ID
                (220, 450, 340, 'hand', 220),   # PHOTO_SUBMITTED
                (270, 450, 340, 'arrow', None)
            ]
        },
        # Scene 12: Tests & Closing
        {
            "id": "scene_12_tests_closing",
            "get_bg": lambda f: slide7,
            "category": "Verification · 108 Automated Tests in CI",
            "stage_tag": "Production Ready",
            "transcription": "108 / 108 automated pytest tests passing in CI. Full tenant isolation, STRIDE threat model, and zero secrets committed.\nBuilt for the Mentor Me Collective × Google Cloud Launchpad Showcase — empowering resilient South Bronx communities.",
            "duration_frames": 270,
            "waypoints": [
                (0, 960, 240, 'arrow', None),
                (50, 520, 420, 'hand', 50),
                (115, 1050, 420, 'hand', 115),
                (180, 1400, 620, 'hand', 180),
                (240, 960, 500, 'hand', None),
                (270, 960, 500, 'arrow', None)
            ]
        }
    ]

    total_frames = sum(s["duration_frames"] for s in scenes)
    total_seconds = total_frames / 30.0
    print(f"Total video planned duration: {total_seconds:.1f} seconds (~{int(total_seconds//60)}:{int(total_seconds%60):02d} mins)")

    out_mp4 = OUT_DIR / "climateops_walkthrough.mp4"
    cmd_ffmpeg = [
        "ffmpeg",
        "-y",
        "-f", "rawvideo",
        "-vcodec", "rawvideo",
        "-s", f"{WIDTH}x{HEIGHT}",
        "-pix_fmt", "rgb24",
        "-r", "30",
        "-i", "-",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-preset", "veryfast",
        "-crf", "20",
        str(out_mp4)
    ]
    proc = subprocess.Popen(cmd_ffmpeg, stdin=subprocess.PIPE, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    rendered = 0
    t_start = time.time()
    for s_idx, s in enumerate(scenes):
        clicks = [w[4] for w in s["waypoints"] if w[4] is not None]
        n_frames = s["duration_frames"]
        
        print(f"[{s_idx+1}/{len(scenes)}] Rendering {s['id']} ({n_frames} frames)...")
        for f in range(n_frames):
            # Dynamic background for interactive state changes
            raw_bg = s["get_bg"](f)
            frame = add_transcription_overlay(raw_bg, s["category"], s["stage_tag"], s["transcription"])

            cur_x, cur_y, ctype = interpolate_cursor(s["waypoints"], f)
            cur_sprite = hand_sprite if ctype == "hand" else arrow_sprite

            # Draw expanding ripple on click frames
            for clk_f in clicks:
                if clk_f <= f <= clk_f + 16:
                    prog = (f - clk_f) / 16.0
                    r = int(8 + prog * 40)
                    alpha = int(220 * (1.0 - prog))
                    ov = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
                    d_ov = ImageDraw.Draw(ov)
                    cw = [w for w in s["waypoints"] if w[4] == clk_f][0]
                    d_ov.ellipse([(cw[1]-r, cw[2]-r), (cw[1]+r, cw[2]+r)], outline=(16, 185, 129, alpha), width=3)
                    d_ov.ellipse([(cw[1]-6, cw[2]-6), (cw[1]+6, cw[2]+6)], fill=(16, 185, 129, int(alpha * 0.7)))
                    frame.paste(ov, (0, 0), ov)

            frame.paste(cur_sprite, (int(cur_x), int(cur_y)), cur_sprite)
            proc.stdin.write(frame.tobytes())
            rendered += 1

    proc.stdin.close()
    proc.wait()

    elapsed = time.time() - t_start
    size_mb = out_mp4.stat().st_size / (1024 * 1024)
    print(f"Successfully generated interactive video {out_mp4} ({size_mb:.2f} MB, {total_seconds:.1f}s in {elapsed:.1f}s)!")

if __name__ == "__main__":
    main()
