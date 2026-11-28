import { Input, useThemeColor } from 'heroui-native';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { useCopy } from '@/lib/i18n';

type AuthFieldProps = {
  label: string;
  hint?: string;
  /** Red text under the field, e.g. "Passwords do not match." */
  error?: string;
} & ComponentProps<typeof Input>;

/**
 * Label + HeroUI Input, used by both auth screens so fields never drift.
 * Password fields (`secureTextEntry`) get an eye button to show or hide what was typed.
 */
export function AuthField({ label, hint, error, secureTextEntry, ...input }: AuthFieldProps) {
  const copy = useCopy();
  const [visible, setVisible] = useState(false);
  const muted = useThemeColor('muted');
  const isPassword = Boolean(secureTextEntry);

  const translatedInput = {
    ...input,
    placeholder: input.placeholder ? copy.t(input.placeholder) : input.placeholder,
  };

  return (
    <View className="gap-1.5">
      <Text className="px-1 text-sm font-semibold text-foreground">{copy.t(label)}</Text>
      <View className="justify-center">
        <Input
          className={`h-14 rounded-[18px] border-2 bg-surface text-base text-foreground placeholder:text-muted ${
            error ? 'border-warning' : 'border-border'
          } ${isPassword ? 'pl-4 pr-14' : 'px-4'}`}
          secureTextEntry={isPassword && !visible}
          {...translatedInput}
        />
        {isPassword ? (
          <Pressable
            onPress={() => setVisible((value) => !value)}
            accessibilityRole="button"
            accessibilityLabel={copy.t(visible ? 'Hide password' : 'Show password')}
            hitSlop={8}
            className="absolute right-2 size-10 items-center justify-center rounded-full">
            <Icon
              sf={visible ? 'eye.slash.fill' : 'eye.fill'}
              md={visible ? 'eye-off' : 'eye'}
              size={22}
              color={muted}
            />
          </Pressable>
        ) : null}
      </View>
      {error ? <Text className="px-1 text-xs font-semibold text-warning">{copy.t(error)}</Text> : null}
      {hint && !error ? <Text className="px-1 text-xs text-muted">{copy.t(hint)}</Text> : null}
    </View>
  );
}
