import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { useCurrentHeatAlert } from '@/features/heat-alert/hooks/use-current-heat-alert';

/** Header badge that mirrors the Heat alert card: the sample, a live NWS alert, or none. */
export function HeatAlertPill() {
  const { alert, isSample } = useCurrentHeatAlert();
  const title = alert ? (isSample ? `SAMPLE · ${alert.event}` : alert.event) : 'No heat alert';
  const subtitle = alert ? (alert.summary ?? 'Live · NWS') : 'Live · NWS';

  return (
    <Pressable
      onPress={() => router.navigate('/alerts')}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      className="flex-row items-center gap-1.5 rounded-full bg-surface px-2.5 py-2 max-w-48"
    >
      {alert ? (
        <Icon sf="sun.max.fill" ion="sunny" size={18} color={Palette.warning} />
      ) : (
        <Icon sf="checkmark.circle" ion="checkmark-circle-outline" size={18} color={Palette.muted} />
      )}
      <View className="flex-shrink">
        <Text className={alert ? 'text-[12px] font-semibold text-foreground' : 'text-[12px] font-semibold text-muted'} numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[10px] text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
    </Pressable>
  );
}
