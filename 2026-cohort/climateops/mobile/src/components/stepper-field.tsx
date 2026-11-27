import { Text, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';

type StepperFieldProps = {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: number;
};

/** Whole-number field with − / + buttons, for occupancy and staff counts. */
export function StepperField({ label, value, onChange, step = 1 }: StepperFieldProps) {
  const n = Number.parseInt(value, 10);
  const current = Number.isNaN(n) ? 0 : n;
  return (
    <View className="flex-row items-center gap-3">
      <Text className="flex-1 text-[14px] text-foreground">{label}</Text>
      <Pressable
        onPress={() => onChange(String(Math.max(0, current - step)))}
        accessibilityRole="button"
        accessibilityLabel={`Decrease ${label}`}
        className="size-10 rounded-full bg-frost items-center justify-center"
      >
        <Icon sf="minus" ion="remove" size={16} color={Palette.accent} />
      </Pressable>
      <TextInput
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, ''))}
        keyboardType="number-pad"
        accessibilityLabel={label}
        className="w-16 h-10 rounded-xl border border-border bg-surface text-center text-[17px] font-bold leading-none text-foreground"
        selectTextOnFocus
      />
      <Pressable
        onPress={() => onChange(String(current + step))}
        accessibilityRole="button"
        accessibilityLabel={`Increase ${label}`}
        className="size-10 rounded-full bg-frost items-center justify-center"
      >
        <Icon sf="plus" ion="add" size={16} color={Palette.accent} />
      </Pressable>
    </View>
  );
}
