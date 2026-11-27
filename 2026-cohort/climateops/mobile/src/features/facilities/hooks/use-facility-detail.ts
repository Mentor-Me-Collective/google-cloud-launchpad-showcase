import { useState } from 'react';
import { Presets } from 'react-native-pulsar';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';

export function useFacilityDetail(id: string) {
  const facility = useFacilitiesStore((s) => s.facilities.find((f) => f.facility_id === id));
  const saveStatus = useFacilitiesStore((s) => s.saveStatus);

  const [working, setWorking] = useState(facility?.ac_working_today === 'Y');
  const [occupancy, setOccupancy] = useState(String(facility?.occupancy_today ?? 0));
  const [staff, setStaff] = useState(String(facility?.staff_on_shift ?? 0));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [saveCount, setSaveCount] = useState(0);

  const dirty =
    facility != null &&
    ((facility.ac_working_today === 'Y') !== working ||
      String(facility.occupancy_today) !== occupancy ||
      String(facility.staff_on_shift) !== staff);

  const save = async () => {
    if (!facility || saving) return;
    if (occupancy === '' || staff === '') {
      setError('Enter a number for occupancy and staff.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const saved = await saveStatus(facility.facility_id, {
        ac_working_today: working ? 'Y' : 'N',
        occupancy_today: Number.parseInt(occupancy, 10),
        staff_on_shift: Number.parseInt(staff, 10),
      });
      Presets.System.notificationSuccess();
      setSavedAt(saved.status_updated_at);
      setSaveCount((c) => c + 1);
    } catch {
      Presets.System.notificationError();
      setError("Couldn't save. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return { facility, working, setWorking, occupancy, setOccupancy, staff, setStaff, saving, error, savedAt, saveCount, dirty, save };
}
