import { router } from 'expo-router';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chevron } from '@/components/chevron';
import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { Pill } from '@/components/pill';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { FactorBreakdown } from '@/features/priorities/components/factor-breakdown';
import type { FacilityPriority } from '@/features/priorities/types/priority';
import { hasScore, scoreLabel, scoreTextClass } from '@/features/priorities/utils/score-display';
import { cn } from '@/lib/cn';
import { fadeIn, fadeOut } from '@/lib/motion';

type PriorityRowProps = {
  item: FacilityPriority;
  open: boolean;
  onToggle: () => void;
};

/** One ranked building: rank, name, score out of 100 and why; tap for all five factor scores. */
export function PriorityRow({ item, open, onToggle }: PriorityRowProps) {
  const isDemo = item.record_type !== 'REAL' || item.facility_id.startsWith('NYC-Demo');
  const top = item.rank <= 3 && hasScore(item);
  const scoreA11y = hasScore(item) ? `score ${item.score} out of 100` : 'no score, no one on site today';

  return (
    <OpsCard padded={false}>
      <Pressable
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={`Rank ${item.rank}, ${item.name}, ${scoreA11y}. ${item.reason}`}
        className="flex-row items-center gap-3 p-4"
      >
        <View className={cn('size-9 items-center justify-center rounded-full', top ? 'bg-danger' : 'bg-frost')}>
          <Text className={cn('text-[15px] font-bold', top ? 'text-danger-foreground' : 'text-accent')}>{item.rank}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={2}>
            {item.name}
          </Text>
          <Text className="text-[12px] text-muted" numberOfLines={2}>
            {item.reason}
          </Text>
          {item.unconfirmed || isDemo ? (
            <View className="flex-row flex-wrap gap-1.5">
              {item.unconfirmed ? (
                <View className="flex-row items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5">
                  <Icon sf="exclamationmark.triangle.fill" ion="warning" size={11} color={Palette.warning} />
                  <Text className="text-[11px] font-semibold text-warning">Unconfirmed status</Text>
                </View>
              ) : null}
              {isDemo ? <Pill label="DEMO" tone="demo" size="sm" /> : null}
            </View>
          ) : null}
        </View>
        <View className="items-end">
          <Text className={cn('text-[24px] font-bold', scoreTextClass(item))}>{scoreLabel(item)}</Text>
          <Text className="text-[10px] text-muted">{hasScore(item) ? 'of 100' : 'no score'}</Text>
        </View>
        <Icon sf={open ? 'chevron.up' : 'chevron.down'} ion={open ? 'chevron-up' : 'chevron-down'} size={13} color={Palette.muted} />
      </Pressable>

      {open ? (
        <Animated.View entering={fadeIn} exiting={fadeOut} className="gap-3 border-t border-border px-4 pt-3 pb-4">
          <FactorBreakdown item={item} />
          <Pressable
            onPress={() => router.push({ pathname: '/facility/[id]', params: { id: item.facility_id } })}
            accessibilityRole="button"
            className="flex-row items-center justify-between rounded-xl bg-frost px-3 py-2.5"
          >
            <Text className="text-[13px] font-semibold text-accent">Open facility</Text>
            <Chevron color={Palette.accent} />
          </Pressable>
        </Animated.View>
      ) : null}
    </OpsCard>
  );
}
