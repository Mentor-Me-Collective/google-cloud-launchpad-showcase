import * as WebBrowser from 'expo-web-browser';
import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AcToggle } from '@/components/ac-toggle';
import { BackButton } from '@/components/back-button';
import { FieldRow } from '@/components/field-row';
import { Icon } from '@/components/icon';
import { Image } from '@/components/image';
import { OpsCard } from '@/components/ops-card';
import { Pill } from '@/components/pill';
import { Pressable } from '@/components/pressable';
import { RiskRing } from '@/components/risk-ring';
import { SaveStatusButton } from '@/components/save-status-button';
import { StepperField } from '@/components/stepper-field';
import { Palette } from '@/constants/theme';
import { useFacilityDetail } from '@/features/facilities/hooks/use-facility-detail';
import {
  acWorking,
  capitalize,
  facilityPhoto,
  formatTime,
  formatUpdated,
  isDemo,
} from '@/features/facilities/utils/facility-derive';
import { FactorBreakdown } from '@/features/priorities/components/factor-breakdown';
import { useHeatScores } from '@/features/priorities/hooks/use-heat-scores';
import { hasScore, scoreColor, scoreLabel, scoreLevel } from '@/features/priorities/utils/score-display';
import { durations, easings, fadeIn } from '@/lib/motion';

const stamp = FadeInDown.duration(durations.gentle).easing(easings.enter);

export default function FacilityDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useFacilityDetail(id);
  const f = d.facility;
  const scores = useHeatScores();
  const priority = f ? scores.scoreFor(f.facility_id) : null;

  if (!f) {
    return (
      <View className="flex-1 bg-background px-4 pt-safe-offset-2 gap-4">
        <BackButton />
        <Text className="text-[15px] text-foreground">This building isn’t in your list anymore.</Text>
      </View>
    );
  }

  const working = acWorking(f);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pt-safe-offset-2 pb-2">
        <BackButton />
        <Text className="text-[13px] text-muted">{f.facility_id}</Text>
      </View>
      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="px-4 pt-2 pb-safe-offset-4 gap-4"
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >

      <OpsCard padded={false}>
        <View>
          <Image source={facilityPhoto(f)} className="w-full h-44" contentFit="cover" />
          <View className="absolute bottom-2 left-2 rounded-full bg-navy/60 px-2 py-0.5">
            <Text className="text-[10px] text-accent-foreground">Representative photo</Text>
          </View>
        </View>
        <View className="p-4 gap-2">
          <View className="flex-row items-start gap-3">
            <View className="flex-1 gap-1">
              <Text className="text-[20px] font-bold text-foreground">{f.name}</Text>
              <Text className="text-[12px] text-muted">
                {capitalize(f.facility_type)} · {f.neighborhood}
              </Text>
            </View>
            <View className="items-center gap-0.5">
              <RiskRing
                value={hasScore(priority) ? priority.score : 0}
                color={scoreColor(priority)}
                label={scoreLabel(priority)}
                size={56}
                stroke={6}
              />
              <Text className="text-[10px] text-muted">Heat risk</Text>
            </View>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Pill label={isDemo(f) ? 'Demo' : 'Real'} tone={isDemo(f) ? 'demo' : 'accent'} />
            <Animated.View key={f.ac_working_today} entering={fadeIn}>
              <Pill label={working ? 'AC ON' : 'AC DOWN'} tone={working ? 'success' : 'danger'} dot />
            </Animated.View>
            <Text className="text-[11px] font-medium tracking-wide text-muted">SIMULATED status</Text>
          </View>
        </View>
      </OpsCard>

      <OpsCard>
        <View className="flex-row items-center justify-between">
          <Text className="text-[17px] font-bold text-foreground">Today’s status</Text>
          <Text className="text-[11px] text-muted">Updated {formatUpdated(f.status_updated_at)}</Text>
        </View>
        <Text className="text-[12px] text-muted">AC working today</Text>
        <AcToggle working={d.working} onChange={d.setWorking} />
        <StepperField label="Occupancy today" value={d.occupancy} onChange={d.setOccupancy} step={5} />
        <StepperField label="Staff on shift" value={d.staff} onChange={d.setStaff} />
        <SaveStatusButton onPress={d.save} saving={d.saving} saveCount={d.saveCount} />
        {d.error ? <Text className="text-[13px] text-danger">{d.error}</Text> : null}
        {d.savedAt && !d.error ? (
          <Animated.View key={d.savedAt} entering={stamp} className="flex-row items-center justify-center gap-1.5 rounded-xl bg-success/10 py-2">
            <Icon sf="checkmark.seal.fill" ion="checkmark-circle" size={15} color={Palette.success} />
            <Text className="text-[13px] font-semibold text-success">Status saved · {formatTime(d.savedAt)}</Text>
          </Animated.View>
        ) : null}
      </OpsCard>

      <OpsCard>
        <View className="flex-row items-center justify-between gap-2">
          <Text className="text-[17px] font-bold text-foreground">
            {hasScore(priority) ? `Heat risk ${priority.score} · ${scoreLevel(priority)}` : 'Heat risk —'}
          </Text>
          {priority ? (
            <Text className="text-[12px] font-semibold text-muted">
              #{priority.rank} of {scores.total}
            </Text>
          ) : null}
        </View>
        {priority ? (
          <View className="gap-3">
            <Text className="text-[12px] text-muted">{priority.reason}</Text>
            <FactorBreakdown item={priority} />
          </View>
        ) : (
          <Text className="text-[13px] text-muted">No active heat alert, so buildings aren’t scored right now.</Text>
        )}
      </OpsCard>

      <OpsCard>
        <Text className="text-[17px] font-bold text-foreground">Record</Text>
        <View>
          <FieldRow label="Facility ID" value={f.facility_id} />
          <FieldRow label="Name" value={f.name} />
          <FieldRow label="Address" value={f.address} />
          <FieldRow label="Neighborhood" value={f.neighborhood} />
          <FieldRow label="Latitude, longitude" value={`${f.latitude}, ${f.longitude}`} />
          <FieldRow label="Record type" value={f.record_type} />
          <FieldRow label="Verified by" value={f.verified_by} />
          <FieldRow label="Retrieved" value={f.retrieved_at ?? '—'} />
          <FieldRow label="Facility type" value={capitalize(f.facility_type)} />
          <FieldRow label="Population served" value={capitalize(f.population_served)} />
          <FieldRow label="Serves vulnerable" value={f.serves_vulnerable === 'Y' ? 'Yes (Y)' : 'No (N)'} />
          <FieldRow label="Has AC profile" value={f.has_ac_profile} />
          <FieldRow label="AC working today" value={f.ac_working_today} />
          <FieldRow label="Occupancy today" value={`${f.occupancy_today}`} />
          <FieldRow label="Staff on shift" value={`${f.staff_on_shift}`} />
          <FieldRow label="Status updated" value={`${formatUpdated(f.status_updated_at)} (${f.status_updated_at})`} />
          <FieldRow label="Status source" value={f.status_source} />
        </View>
        {f.source_url ? (
          <Pressable
            onPress={() => WebBrowser.openBrowserAsync(f.source_url ?? '')}
            accessibilityRole="link"
            className="flex-row items-center gap-2 rounded-xl bg-frost px-3 py-3"
          >
            <Icon sf="link" ion="link" size={15} color={Palette.accent} />
            <Text className="flex-1 text-[13px] font-semibold text-accent" numberOfLines={1}>
              Open source · {new URL(f.source_url).hostname}
            </Text>
          </Pressable>
        ) : (
          <Text className="text-[12px] text-muted">Synthetic record. No source link.</Text>
        )}
      </OpsCard>
      </KeyboardAwareScrollView>
    </View>
  );
}
