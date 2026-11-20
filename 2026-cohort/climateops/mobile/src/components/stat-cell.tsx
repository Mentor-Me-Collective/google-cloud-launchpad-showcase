import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function StatCell({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <View className="flex-1 items-center gap-1">
      {icon}
      <Text className="text-[20px] font-bold text-foreground">{value}</Text>
      <Text className="text-[11px] text-muted text-center" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}
