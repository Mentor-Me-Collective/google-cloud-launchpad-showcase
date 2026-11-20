import { Button, Spinner, Switch } from 'heroui-native';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { pressHaptic } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { formatTime } from '@/features/facilities/utils/facility-derive';
import { useHeatAlert } from '@/features/heat-alert/hooks/use-heat-alert';
import { formatAlertTime } from '@/features/heat-alert/utils/heat-alert-api';
import { fadeIn } from '@/lib/motion';

function TimeCell({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 gap-0.5">
      <Text className="text-[11px] font-semibold uppercase text-muted">{label}</Text>
      <Text className="text-[13px] font-semibold text-foreground">{value}</Text>
    </View>
  );
}

export function HeatAlertCard() {
  const { alert, extraCount, isSample, setUseSample, loading, error, checkedAt, refresh } = useHeatAlert();

  return (
    <OpsCard tone={alert ? 'advisory' : 'plain'}>
      <View className="flex-row items-center gap-2">
        <Icon sf="thermometer.sun.fill" ion="thermometer" size={18} color={alert ? Palette.danger : Palette.accent} />
        <Text className="flex-1 text-[15px] font-bold text-foreground">Heat alert</Text>
        {isSample ? (
          <View className="rounded-full bg-warning px-2.5 py-1">
            <Text className="text-[10px] font-bold text-warning-foreground">SAMPLE ALERT</Text>
          </View>
        ) : (
          <View className="rounded-full bg-frost px-2.5 py-1">
            <Text className="text-[10px] font-bold text-accent">LIVE · NWS</Text>
          </View>
        )}
      </View>

      {alert ? (
        <Animated.View key={`${alert.id}-${checkedAt ?? ''}`} entering={fadeIn} className="gap-3">
          <View className="gap-1">
            <Text className="text-[20px] font-bold text-danger">{alert.event}</Text>
            <Text className="text-[14px] text-foreground">{alert.headline}</Text>
            <Text className="text-[12px] text-muted">{alert.area}</Text>
          </View>
          <View className="flex-row gap-3">
            <TimeCell label="Starts" value={formatAlertTime(alert.onset)} />
            <TimeCell label="Ends" value={formatAlertTime(alert.ends)} />
          </View>
          <Text className="text-[11px] text-muted">
            Source: {alert.source}
            {extraCount > 0 ? ` · ${extraCount} more heat alert${extraCount > 1 ? 's' : ''}` : ''}
          </Text>
        </Animated.View>
      ) : (
        <Animated.View key={`none-${checkedAt ?? ''}`} entering={fadeIn} className="gap-1">
          <Text className="text-[17px] font-semibold text-foreground">No active heat alert</Text>
          <Text className="text-[12px] text-muted">National Weather Service, South Bronx (40.8155, -73.9171)</Text>
        </Animated.View>
      )}

      {error ? <Text className="text-[12px] text-danger">{error}</Text> : null}

      <View className="h-px bg-separator" />

      <View className="flex-row items-center gap-3">
        <Switch
          isSelected={isSample}
          onSelectedChange={(on) => {
            pressHaptic();
            setUseSample(on);
          }}
          accessibilityLabel="Use sample alert"
        />
        <View className="flex-1">
          <Text className="text-[13px] font-semibold text-foreground">Use sample alert</Text>
          <Text className="text-[11px] text-muted" numberOfLines={1}>
            {isSample ? 'Off = live from NWS' : checkedAt ? `Last checked ${formatTime(checkedAt)}` : 'Not checked yet'}
          </Text>
        </View>
        <Button
          size="sm"
          variant="secondary"
          isDisabled={loading}
          onPress={() => {
            pressHaptic();
            void refresh();
          }}
        >
          {loading ? <Spinner size="sm" /> : <Icon sf="arrow.clockwise" ion="refresh" size={14} color={Palette.accent} />}
          <Button.Label>Refresh</Button.Label>
        </Button>
      </View>
    </OpsCard>
  );
}
