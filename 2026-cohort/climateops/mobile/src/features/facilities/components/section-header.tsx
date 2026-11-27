import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

export function SectionHeader({ title, trailing }: { title: string; trailing?: ReactNode }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text className="text-[20px] font-bold text-foreground">{title}</Text>
      {trailing}
    </View>
  );
}
