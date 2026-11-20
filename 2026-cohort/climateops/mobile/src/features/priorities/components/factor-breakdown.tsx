import { Text, View } from 'react-native';

import type { FacilityPriority } from '@/features/priorities/types/priority';
import { cn } from '@/lib/cn';

/** All five server factor scores, each with its weight and a 5-segment bar, plus the maths. */
export function FactorBreakdown({ item }: { item: FacilityPriority }) {
  const weighted = item.factors.reduce((sum, f) => sum + f.weight * f.score, 0);
  return (
    <View className="gap-3">
      {item.factors.map((f) => (
        <View key={f.key} className="gap-1.5">
          <View className="flex-row items-center justify-between gap-2">
            <Text className="text-[13px] font-semibold text-foreground">
              {f.label} <Text className="font-normal text-muted">· {Math.round(f.weight * 100)}%</Text>
            </Text>
            <Text className="text-[13px] font-bold text-foreground">{f.score}/5</Text>
          </View>
          <View className="flex-row gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <View
                key={n}
                className={cn('h-1.5 flex-1 rounded-full', n <= f.score ? (f.score >= 4 ? 'bg-danger' : 'bg-warning') : 'bg-surface-tertiary')}
              />
            ))}
          </View>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {f.detail}
          </Text>
        </View>
      ))}
      <Text className="text-[11px] text-muted">
        {item.no_one_on_site
          ? `No one on site today, so it's ranked last (factors would give ${item.score}).`
          : `Weighted average ${weighted.toFixed(2)} × 20 = ${item.score}`}
      </Text>
    </View>
  );
}
