import copy
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

from app.evidence import build_bundle
from app.scoring import hazard_from_records, rank_facilities

FIX = Path(__file__).resolve().parents[2] / "data" / "fixtures"
NOW = datetime.now(timezone.utc)


def make_bundle(weather=True):
    playbook = json.loads((FIX / "heat_tasks.json").read_text())
    recs = []
    if weather:
        recs = [{"id": "SIM-HEAT-001", "event": "Extreme Heat Warning", "expires": (NOW + timedelta(hours=5)).isoformat(),
                 "source_url": "x", "payload_hash": "h", "fixture_flag": "SIMULATED"}]
    facs = [
        {"facility_id": "DEMO-A1", "name": "DEMO One", "provenance": "DEMO_SYNTHETIC",
         "status": {"as_of": NOW.isoformat(), "ac_status": "none", "vulnerable_level": "many", "people_on_site": 30,
                    "staff_on_shift": 1, "staff_required": 3}},
        {"facility_id": "DEMO-A2", "name": "DEMO Two", "provenance": "DEMO_SYNTHETIC",
         "status": {"as_of": NOW.isoformat(), "ac_status": "unknown", "vulnerable_level": "some", "people_on_site": 5,
                    "staff_on_shift": 2, "staff_required": 2}},
    ]
    hz = hazard_from_records(recs, True, NOW)
    snaps = rank_facilities(facs, hz, NOW)
    return build_bundle(tenant_id="demo-a", fetched_at=NOW.isoformat(), weather_source="SIMULATED",
                        weather_records=recs, weather_status="ok", facilities=facs, snapshots=snaps, playbook=playbook)


class FakeLLM:
    """Test double with the same interface as NimClient."""
    def __init__(self, bundle, mutate=None, raises=None):
        self.bundle, self.mutate, self.raises = bundle, mutate, raises

    def generate(self, bundle):
        if self.raises:
            raise self.raises
        wx = bundle["weather_records"][0]["id"] if bundle["weather_records"] else "SRC-NWS-OKX"
        top = bundle["priority_snapshot"][0]["facility_id"]
        out = {
            "summary": "Highest-priority DEMO facility needs an AC check.",
            "claims": [
                {"id": "C-01", "text": "A heat alert is in the evidence.", "source_ids": [wx]},
                {"id": "C-02", "text": f"{top} ranks first in the deterministic priority list.", "source_ids": [f"FAC:{top}"]},
            ],
            "facility_actions": [{"facility_id": top, "playbook_task_id": "HT-01",
                                  "task_candidate": "Confirm AC works where at-risk people spend time (DEMO).",
                                  "rationale_claim_ids": ["C-01", "C-02"]}],
            "uncertainties": ["All statuses are DEMO_SYNTHETIC."],
        }
        out = copy.deepcopy(out)
        if self.mutate:
            self.mutate(out)
        return out, {"model_id": "fake-model"}
