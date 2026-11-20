import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Chevron } from '@/components/chevron';
import { Icon } from '@/components/icon';
import { Image } from '@/components/image';
import { OpsCard } from '@/components/ops-card';
import { Pill } from '@/components/pill';
import { Pressable } from '@/components/pressable';
import { RiskRing } from '@/components/risk-ring';
import { Palette } from '@/constants/theme';
import type { Facility } from '@/features/facilities/types/facility';
import { acWorking, capitalize, facilityPhoto, formatUpdated, isDemo } from '@/features/facilities/utils/facility-derive';
import { useHeatScores } from '@/features/priorities/hooks/use-heat-scores';
import { hasScore, scoreColor, scoreLabel } from '@/features/priorities/utils/score-display';

export function FacilityCard({ facility }: { facility: Facility }) {
  const priority = useHeatScores().scoreFor(facility.facility_id);
  const risk = scoreLabel(priority);
  const working = acWorking(facility);
  const vulnerable = facility.serves_vulnerable === 'Y';
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/facility/[id]', params: { id: facility.facility_id } })}
      accessibilityRole="button"
      accessibilityLabel={`${facility.name}, AC ${working ? 'on' : 'down'}, heat risk ${risk}`}
    >
      <OpsCard>
        <View className="flex-row gap-3">
          <Image source={facilityPhoto(facility)} className="w-14 h-14 rounded-lg" contentFit="cover" />
          <View className="flex-1 gap-0.5">
            <View className="flex-row items-center gap-1.5">
              <Text className="text-[15px] font-semibold text-foreground shrink" numberOfLines={2}>
                {facility.name}
              </Text>
              <Pill label={isDemo(facility) ? 'Demo' : 'Real'} tone={isDemo(facility) ? 'demo' : 'accent'} size="sm" />
            </View>
            <Text className="text-[12px] text-muted" numberOfLines={1}>
              {isDemo(facility) ? 'Synthetic · no real address' : facility.address.split(',')[0]}
            </Text>
            <View className="flex-row items-center gap-1">
              <Icon sf="mappin.and.ellipse" ion="location-outline" size={11} color={Palette.muted} />
              <Text className="text-[11px] text-muted" numberOfLines={1}>
                {facility.neighborhood} · {capitalize(facility.facility_type)}
              </Text>
            </View>
            <Text className="text-[10px] font-medium tracking-wide text-muted">SIMULATED status</Text>
          </View>
          <View className="items-end gap-1">
            <Pill label={working ? 'AC ON' : 'AC DOWN'} tone={working ? 'success' : 'danger'} dot />
            <Text className="text-[10px] text-muted">{formatUpdated(facility.status_updated_at)}</Text>
          </View>
        </View>
        <View className="flex-row items-center gap-3">
          <Icon sf="person.3.fill" ion="people" size={15} color={Palette.accent} />
          <View className="gap-0.5">
            <Text className="text-[10px] text-muted">Occupancy / Staff</Text>
            <Text className="text-[15px] font-bold text-foreground">
              {facility.occupancy_today} / {facility.staff_on_shift}
            </Text>
          </View>
          <View className="items-center gap-0.5">
            <RiskRing value={hasScore(priority) ? priority.score : 0} color={scoreColor(priority)} label={risk} />
            <Text className="text-[9px] text-muted">Heat risk</Text>
          </View>
          <View className="w-px self-stretch bg-border" />
          <View className="flex-1 gap-0.5">
            <Text className="text-[10px] text-muted">Population served</Text>
            <Text className="text-[13px] font-semibold text-foreground" numberOfLines={1}>
              {capitalize(facility.population_served)}
            </Text>
            <Text className="text-[10px] text-muted" numberOfLines={1}>
              Vulnerable {vulnerable ? 'yes' : 'no'} · AC profile {facility.has_ac_profile.toLowerCase()}
            </Text>
          </View>
          <Chevron />
        </View>
      </OpsCard>
    </Pressable>
  );
}
