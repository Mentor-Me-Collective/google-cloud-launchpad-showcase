import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chevron } from '@/components/chevron';
import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { PenguinBanner } from '@/components/penguin-banner';
import { Pill } from '@/components/pill';
import { Pressable } from '@/components/pressable';
import { StatusBarStrip } from '@/components/status-bar-strip';
import { Palette } from '@/constants/theme';
import { OpsHeader } from '@/features/facilities/components/ops-header';
import { SectionHeader } from '@/features/facilities/components/section-header';
import { useCurrentHeatAlert } from '@/features/heat-alert/hooks/use-current-heat-alert';
import { formatAlertTime } from '@/features/heat-alert/utils/heat-alert-api';
import type { RecentAlert } from '@/features/alerts/hooks/use-recent-alerts';
import { useRecentAlerts } from '@/features/alerts/hooks/use-recent-alerts';
import { enterStaggered } from '@/lib/motion';

const ALERT_ICON: Record<RecentAlert['kind'], Pick<React.ComponentProps<typeof Icon>, 'sf' | 'ion' | 'color'>> = {
  'ac-down': { sf: 'snowflake.slash', ion: 'snow-outline', color: Palette.danger },
  stale: { sf: 'clock.badge.exclamationmark', ion: 'time', color: Palette.warning },
  advisory: { sf: 'sun.max.fill', ion: 'sunny', color: Palette.warning },
  'all-clear': { sf: 'checkmark.seal.fill', ion: 'checkmark-circle', color: Palette.success },
};

export default function AlertsScreen() {
  const alerts = useRecentAlerts();
  const { alert, isSample } = useCurrentHeatAlert();

  return (
    <View className="flex-1 bg-background">
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-safe-offset-2 pb-safe-offset-22 gap-4">
      <OpsHeader />
      <View className="gap-0.5">
        <Text className="text-[26px] font-bold text-foreground">Alerts</Text>
        <Text className="text-[12px] text-muted">Stay informed. Keep our community safe.</Text>
      </View>

      <PenguinBanner art={require('@/assets/images/art/penguin.png')} title="Extreme heat can be dangerous." subtitle="AC failures and missed check-ins show up here." />

      {alert ? (
        <OpsCard tone="advisory">
          <View className="flex-row items-center justify-between gap-2">
            <View className="flex-row items-center gap-2 flex-1">
              <Icon sf="sun.max.fill" ion="sunny" size={18} color={Palette.warning} />
              <Text className="text-[13px] font-bold text-danger" numberOfLines={1}>
                {alert.event.toUpperCase()}
              </Text>
            </View>
            <View className={isSample ? 'rounded-full bg-warning px-2.5 py-1' : 'rounded-full bg-danger px-2.5 py-1'}>
              <Text className="text-[11px] font-bold text-danger-foreground">{isSample ? 'SAMPLE ALERT' : 'ACTIVE'}</Text>
            </View>
          </View>
          <Text className="text-[18px] font-bold text-foreground">{alert.headline}</Text>
          <Text className="text-[12px] text-muted">{alert.area}</Text>
          <View className="flex-row gap-3">
            <View className="flex-1 flex-row items-center gap-1.5">
              <Icon sf="clock" ion="time-outline" size={18} color={Palette.muted} />
              <View className="flex-shrink">
                <Text className="text-[12px] font-bold text-foreground">{formatAlertTime(alert.onset)}</Text>
                <Text className="text-[9px] text-muted">Starts</Text>
              </View>
            </View>
            <View className="flex-1 flex-row items-center gap-1.5">
              <Icon sf="clock.badge.checkmark" ion="time" size={18} color={Palette.muted} />
              <View className="flex-shrink">
                <Text className="text-[12px] font-bold text-foreground">{formatAlertTime(alert.ends)}</Text>
                <Text className="text-[9px] text-muted">Ends</Text>
              </View>
            </View>
          </View>
          <View className="flex-row gap-2 rounded-xl bg-surface/70 p-3">
            <Icon sf="info.circle.fill" ion="information-circle" size={18} color={Palette.muted} />
            <View className="flex-1 gap-0.5">
              <Text className="text-[13px] font-semibold text-foreground">What this means</Text>
              <Text className="text-[11px] text-muted">
                Prolonged heat may cause heat illness, especially for older adults, young children, and people with chronic conditions. Keep AC
                running where they gather.
              </Text>
            </View>
          </View>
          <Text className="text-[11px] text-muted">Source: {alert.source}</Text>
        </OpsCard>
      ) : (
        <OpsCard>
          <View className="flex-row items-center gap-2">
            <Icon sf="checkmark.circle" ion="checkmark-circle-outline" size={18} color={Palette.muted} />
            <Text className="text-[16px] font-bold text-foreground">No active heat alert</Text>
          </View>
          <Text className="text-[12px] text-muted">The National Weather Service has no heat alert for the South Bronx right now. Refresh from the Heat alert card on Home.</Text>
        </OpsCard>
      )}

      <PenguinBanner
        art={require('@/assets/images/art/penguin-hydrate.png')}
        title="Hydrate. Check on others."
        subtitle="Walk the floor at buildings serving older adults."
        onPress={() => router.push('/facilities')}
      />

      <SectionHeader title="Recent Alerts" trailing={<Pill label={`${alerts.length}`} tone="accent" />} />
      <OpsCard padded={false}>
        {alerts.map((a, i) => {
          const icon = ALERT_ICON[a.kind];
          const facilityID = a.facilityID;
          return (
            <Animated.View key={a.key} entering={enterStaggered(i)}>
              {i > 0 ? (<View className="px-4"><View className="h-px bg-separator" /></View>) : null}
              <Pressable
                onPress={facilityID ? () => router.push({ pathname: '/facility/[id]', params: { id: facilityID } }) : undefined}
                isDisabled={!facilityID}
                accessibilityRole={facilityID ? 'button' : 'text'}
                className="flex-row items-center gap-3 px-4 py-3"
              >
                <Icon sf={icon.sf} ion={icon.ion} size={22} color={icon.color} />
                <View className="flex-1 gap-0.5">
                  <Text className="text-[14px] font-semibold text-foreground">{a.title}</Text>
                  <Text className="text-[11px] text-muted">{a.body}</Text>
                  <Text className="text-[10px] text-muted">{a.when}</Text>
                </View>
                {facilityID ? <Chevron /> : null}
              </Pressable>
            </Animated.View>
          );
        })}
      </OpsCard>
    </ScrollView>
    <StatusBarStrip />
    </View>
  );
}
