import { Text, View } from 'react-native';

export function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row gap-3 py-2">
      <Text className="w-32 text-[12px] text-muted">{label}</Text>
      <Text className="flex-1 text-[13px] text-foreground" selectable>
        {value}
      </Text>
    </View>
  );
}
