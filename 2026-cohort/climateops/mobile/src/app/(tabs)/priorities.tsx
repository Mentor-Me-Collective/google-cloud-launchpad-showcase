import { router } from 'expo-router';
import { Button, Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { pressHaptic } from '@/components/pressable';
import { StatusBarStrip } from '@/components/status-bar-strip';
import { Palette } from '@/constants/theme';
import { OpsHeader } from '@/features/facilities/components/ops-header';
import { formatTime } from '@/features/facilities/utils/facility-derive';
import { PriorityRow } from '@/features/priorities/components/priority-row';
import { usePriorities } from '@/features/priorities/hooks/use-priorities';
import { enterStaggered, reflow } from '@/lib/motion';

export default function PrioritiesScreen() {
  const p = usePriorities();
  const { result, loading, error, refresh, expanded, toggle } = p;

  return (
    <View className="flex-1 bg-background">
    <ScrollView
      ref={p.scrollRef}
      onScroll={p.onScroll}
      scrollEventThrottle={16}
      onLayout={p.onViewportLayout}
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-safe-offset-2 pb-safe-offset-22 gap-4"
    >
      <OpsHeader />
      <View className="flex-row items-end justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-[26px] font-bold text-foreground">Priorities</Text>
          <Text className="text-[12px] text-muted">
            {result?.active ? `Ranked by heat risk · ${result.sample ? 'sample ' : ''}${result.event}` : 'Ranked by heat risk during a heat alert'}
          </Text>
        </View>
        <Button
          variant="secondary"
          size="sm"
          isDisabled={loading}
          onPress={() => {
            pressHaptic();
            refresh();
          }}
        >
          {loading ? <Spinner size="sm" /> : <Button.Label>Refresh</Button.Label>}
        </Button>
      </View>

      {result?.active ? (
        <Button
          variant="primary"
          onPress={() => {
            pressHaptic();
            router.push('/readiness-brief');
          }}
        >
          <Icon sf="sparkles" ion="sparkles" size={16} color={Palette.white} />
          <Button.Label>Generate readiness brief</Button.Label>
        </Button>
      ) : null}

      {error ? (
        <View className="flex-row items-center gap-2 rounded-xl bg-warning/15 px-3 py-2">
          <Icon sf="wifi.exclamationmark" ion="cloud-offline" size={16} color={Palette.warning} />
          <Text className="flex-1 text-[12px] text-foreground">{error}</Text>
        </View>
      ) : null}

      {result === null ? (
        <OpsCard>
          <View className="items-center gap-2 py-6">
            <Spinner />
            <Text className="text-[13px] text-muted">Scoring buildings…</Text>
          </View>
        </OpsCard>
      ) : null}

      {result && !result.active ? (
        <OpsCard>
          <View className="items-center gap-2 py-6">
            <Icon sf="checkmark.circle" ion="checkmark-circle-outline" size={32} color={Palette.muted} />
            <Text className="text-[16px] font-bold text-foreground">No active heat alert</Text>
            <Text className="text-center text-[12px] text-muted">Buildings are ranked here as soon as the National Weather Service issues a heat alert.</Text>
          </View>
        </OpsCard>
      ) : null}

      {result?.active ? (
        <View className="gap-3" onLayout={p.onListLayout}>
          {result.priorities.map((item, i) => (
            <Animated.View key={item.facility_id} entering={enterStaggered(i)} layout={reflow} onLayout={p.onRowLayout(item.facility_id)}>
              <PriorityRow item={item} open={expanded === item.facility_id} onToggle={() => toggle(item.facility_id)} />
            </Animated.View>
          ))}
          <Text className="text-center text-[11px] text-muted">
            Scored on the server at {formatTime(result.computed_at)} · heat 30%, vulnerable users 25%, no working AC 20%, people on site 15%, low staffing 10%
          </Text>
        </View>
      ) : null}
    </ScrollView>
    <StatusBarStrip />
    </View>
  );
}
