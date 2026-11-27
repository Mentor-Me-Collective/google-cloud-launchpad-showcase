import { ActivityIndicator, Text, View } from 'react-native';

import { OpsCard } from '@/components/ops-card';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';

/** Loading the first copy, or a server error with a retry. Renders nothing when synced. */
export function SyncState() {
  const { facilities, loading, error, load } = useFacilitiesStore();
  if (loading && facilities.length === 0) {
    return (
      <View className="flex-row items-center gap-2 py-6 justify-center">
        <ActivityIndicator color={Palette.accent} />
        <Text className="text-[13px] text-muted">Loading your buildings…</Text>
      </View>
    );
  }
  if (!error) return null;
  return (
    <OpsCard tone="advisory">
      <Text className="text-[13px] text-foreground">{error}</Text>
      <Pressable onPress={load} accessibilityRole="button" className="self-start">
        <Text className="text-[13px] font-semibold text-accent">Try again</Text>
      </Pressable>
    </OpsCard>
  );
}
