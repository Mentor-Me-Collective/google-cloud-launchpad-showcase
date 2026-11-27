import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Palette } from '@/constants/theme';
import { HeatAlertPill } from '@/features/facilities/components/heat-alert-pill';
import { useFacilitiesStore } from '@/features/facilities/store/facilities-store';
import { acWorking } from '@/features/facilities/utils/facility-derive';

/** Snowflake + count of buildings with working AC, and the heat alert badge. */
export function OpsHeader() {
  const facilities = useFacilitiesStore((s) => s.facilities);
  const working = facilities.filter(acWorking).length;
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="flex-row items-center gap-1.5 flex-1">
        <Icon sf="snowflake" ion="snow" size={32} color={Palette.accent} />
        <Text className="text-[34px] font-bold text-foreground" accessibilityLabel={`${working} buildings with AC working today`}>
          {working}
        </Text>
        <Text className="flex-shrink text-[9px] font-semibold text-foreground leading-tight" numberOfLines={2}>
          {'BUILDINGS WITH\nAC ON TODAY'}
        </Text>
      </View>
      <HeatAlertPill />
    </View>
  );
}
