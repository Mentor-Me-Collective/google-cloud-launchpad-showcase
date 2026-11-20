import { TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Palette } from '@/constants/theme';

type SearchFieldProps = { value: string; onChangeText: (v: string) => void; placeholder: string };

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-xl bg-surface border border-border px-3 h-11">
      <Icon sf="magnifyingglass" ion="search" size={16} color={Palette.muted} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Palette.muted}
        className="flex-1 text-[14px] leading-none text-foreground"
        returnKeyType="search"
        clearButtonMode="while-editing"
        autoCorrect={false}
      />
    </View>
  );
}
