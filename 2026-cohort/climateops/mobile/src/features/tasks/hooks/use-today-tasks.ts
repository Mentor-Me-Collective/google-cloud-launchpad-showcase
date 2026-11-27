import { router } from 'expo-router';
import { useEffect } from 'react';
import { Presets } from 'react-native-pulsar';

import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { acWorking, dayKey, formatUpdated, updatedToday } from '@/features/facilities/utils/facility-derive';
import { useCurrentHeatAlert } from '@/features/heat-alert/hooks/use-current-heat-alert';
import { formatAlertTime } from '@/features/heat-alert/utils/heat-alert-api';
import { useTasksStore } from '@/features/tasks/store/tasks-store';

export interface TodayTask {
  id: string;
  title: string;
  subtitle: string;
  done: boolean;
  onPress: () => void;
  onToggle?: () => void;
}

/** Today's three tasks, two of them derived from the live building data. */
export function useTodayTasks() {
  const facilities = useFacilitiesStore((s) => s.facilities);
  const { done, celebrated, toggle, markCelebrated } = useTasksStore();
  const today = dayKey(new Date());
  const checkedIn = facilities.filter((f) => updatedToday(f)).length;
  const acDown = facilities.filter((f) => !acWorking(f)).length;
  const allCheckedIn = facilities.length > 0 && checkedIn === facilities.length;
  const stalest = [...facilities].sort(
    (a, b) => new Date(a.status_updated_at).getTime() - new Date(b.status_updated_at).getTime(),
  )[0];
  const reviewed = (done[today] ?? []).includes('heat-alert');
  const { alert: heat, isSample } = useCurrentHeatAlert();
  const celebrateNow = allCheckedIn && !celebrated.includes(today);

  useEffect(() => {
    if (!celebrateNow) return;
    Presets.System.notificationSuccess();
    markCelebrated(today);
  }, [celebrateNow, markCelebrated, today]);

  const tasks: TodayTask[] = [
    {
      id: 'check-in',
      title: 'Check in every building',
      subtitle: `${checkedIn} of ${facilities.length} checked in today · ${acDown} AC down`,
      done: allCheckedIn,
      onPress: () => router.navigate('/facilities'),
    },
  ];
  if (stalest) {
    tasks.push({
      id: 'stalest',
      title: updatedToday(stalest) ? `Status updated at ${stalest.name}` : `Update status at ${stalest.name}`,
      subtitle: `Last update ${formatUpdated(stalest.status_updated_at)}`,
      done: updatedToday(stalest),
      onPress: () => router.push({ pathname: '/facility/[id]', params: { id: stalest.facility_id } }),
    });
  }
  const alertLine = heat ? `${isSample ? 'Sample · ' : ''}${heat.event} · starts ${formatAlertTime(heat.onset)}` : 'No active heat alert';
  tasks.push({
    id: 'heat-alert',
    title: 'Review the heat alert',
    subtitle: reviewed ? `Reviewed today · ${alertLine}` : alertLine,
    done: reviewed,
    onPress: () => router.navigate('/alerts'),
    onToggle: () => toggle(today, 'heat-alert'),
  });

  return { tasks, allCheckedIn };
}
