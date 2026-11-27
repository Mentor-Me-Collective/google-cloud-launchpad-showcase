import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chevron } from '@/components/chevron';
import { Icon } from '@/components/icon';
import { PenguinBanner } from '@/components/penguin-banner';
import { Pressable } from '@/components/pressable';
import { StatusBarStrip } from '@/components/status-bar-strip';
import { TaskRow } from '@/components/task-row';
import { Palette } from '@/constants/theme';
import { FacilityCard } from '@/features/facilities/components/facility-card';
import { OpsHeader } from '@/features/facilities/components/ops-header';
import { SectionHeader } from '@/features/facilities/components/section-header';
import { SyncState } from '@/features/facilities/components/sync-state';
import { useFacilitiesSync } from '@/features/facilities/hooks/use-facilities-sync';
import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { HeatAlertCard } from '@/features/heat-alert/components/heat-alert-card';
import { sortFacilities } from '@/features/facilities/utils/facility-derive';
import { useHeatScores } from '@/features/priorities/hooks/use-heat-scores';
import { useTodayTasks } from '@/features/tasks/hooks/use-today-tasks';
import { enterStaggered } from '@/lib/motion';

export default function HomeScreen() {
  useFacilitiesSync();
  const facilities = useFacilitiesStore((s) => s.facilities);
  const { tasks, allCheckedIn } = useTodayTasks();
  const { scoreFor } = useHeatScores();
  const ranked = sortFacilities(facilities, 'risk', (id) => scoreFor(id)?.rank ?? null);

  return (
    <View className="flex-1 bg-background">
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-safe-offset-2 pb-safe-offset-22 gap-4">
      <OpsHeader />

      <HeatAlertCard />

      <View className="rounded-2xl bg-accent p-1">
        <Pressable onPress={() => router.navigate('/alerts')} accessibilityRole="button" className="flex-row items-center gap-3 px-3 py-2.5">
          <Icon sf="checklist" ion="clipboard" size={20} color={Palette.white} />
          <Text className="flex-1 text-[17px] font-semibold text-accent-foreground">Today’s tasks</Text>
          <Chevron color={Palette.white} />
        </Pressable>
        <View className="rounded-xl bg-surface px-3">
          {tasks.map((t, i) => (
            <View key={t.id}>
              {i > 0 ? <View className="h-px bg-separator" /> : null}
              <TaskRow title={t.title} subtitle={t.subtitle} done={t.done} onPress={t.onPress} onToggle={t.onToggle} />
            </View>
          ))}
        </View>
      </View>

      <PenguinBanner
        art={require('@/assets/images/art/penguin.png')}
        title={allCheckedIn ? 'Every building checked in' : 'Keep South Bronx cool'}
        subtitle={allCheckedIn ? 'All statuses are current for today. Nice work.' : 'Every working AC unit saves lives.'}
        onPress={() => router.navigate('/facilities')}
      />

      <SectionHeader
        title="Buildings at risk"
        trailing={
          <View className="rounded-full bg-frost px-3 py-1">
            <Text className="text-[13px] font-semibold text-accent">{facilities.length} total</Text>
          </View>
        }
      />
      <SyncState />
      {ranked.map((f, i) => (
        <Animated.View key={f.facility_id} entering={enterStaggered(i)}>
          <FacilityCard facility={f} />
        </Animated.View>
      ))}
    </ScrollView>
    <StatusBarStrip />
    </View>
  );
}
