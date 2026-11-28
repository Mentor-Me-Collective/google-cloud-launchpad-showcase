import { useThemeColor } from 'heroui-native';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { useSyncStatus } from '@/features/learn/hooks/use-sync-status';
import { timeAgo } from '@/features/learn/utils/progress';
import { useCopy } from '@/lib/i18n';

/** Sits at the top of every screen: where progress lives, plus the live connection state. */
export function SyncChip() {
  const { label, online, simulateOffline, lastSavedAt } = useSyncStatus();
  const success = useThemeColor('success');
  const warning = useThemeColor('warning');
  const muted = useThemeColor('muted');
  const saved = lastSavedAt !== null;
  const copy = useCopy();
  const connection = online ? copy.t('Online') : simulateOffline ? copy.t('Offline (test)') : copy.t('Offline');
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View
        className="shrink flex-row items-center gap-2 rounded-full bg-surface-secondary px-3 py-1.5"
        accessibilityLabel={saved ? `${copy.t(label)}, ${timeAgo(lastSavedAt, copy.locale)}` : copy.t(label)}>
        <Icon
          sf={saved ? 'checkmark.circle.fill' : 'iphone'}
          md={saved ? 'checkmark-circle' : 'phone-portrait-outline'}
          size={14}
          color={saved ? success : muted}
        />
        <Text className="shrink text-sm font-semibold text-foreground" numberOfLines={1}>
          {copy.t(label)}
        </Text>
      </View>
      <View
        className={`flex-row items-center gap-1.5 rounded-full px-3 py-1.5 ${online ? 'bg-success/15' : 'bg-warning/20'}`}
        accessibilityLabel={connection}>
        <Icon
          sf={online ? 'wifi' : 'wifi.slash'}
          md={online ? 'wifi' : 'cloud-offline-outline'}
          size={14}
          color={online ? success : warning}
        />
        <Text className="text-sm font-semibold text-foreground">{connection}</Text>
      </View>
    </View>
  );
}
