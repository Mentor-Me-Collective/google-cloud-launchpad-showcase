import { Input } from 'heroui-native';
import type { ComponentProps } from 'react';
import { Text, View } from 'react-native';
import { useCopy } from '@/lib/i18n';

type FormFieldProps = {
  label: string;
  hint?: string;
} & ComponentProps<typeof Input>;

export function FormField({ label, hint, className, ...input }: FormFieldProps) {
  const copy = useCopy();
  const translatedInput = {
    ...input,
    placeholder: input.placeholder ? copy.t(input.placeholder) : input.placeholder,
  };
  return (
    <View className="gap-1.5">
      <Text className="px-1 text-sm font-bold text-foreground">{copy.t(label)}</Text>
      <Input
        className={`min-h-14 rounded-[18px] border-2 border-border bg-surface px-4 text-base text-foreground placeholder:text-muted ${className ?? ''}`}
        {...translatedInput}
      />
      {hint ? <Text className="px-1 text-xs text-muted">{copy.t(hint)}</Text> : null}
    </View>
  );
}
