import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { cn } from '@/lib/cn';

type AcToggleProps = { working: boolean; onChange: (working: boolean) => void };

export function AcToggle({ working, onChange }: AcToggleProps) {
  return (
    <View className="flex-row gap-2">
      <Pressable
        onPress={() => onChange(true)}
        accessibilityRole="radio"
        accessibilityState={{ selected: working }}
        className={cn('flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl border', working ? 'bg-success border-success' : 'bg-surface border-border')}
      >
        <Icon sf="snowflake" ion="snow" size={15} color={working ? Palette.white : Palette.success} />
        <Text className={cn('text-[14px] font-semibold', working ? 'text-success-foreground' : 'text-foreground')}>Working</Text>
      </Pressable>
      <Pressable
        onPress={() => onChange(false)}
        accessibilityRole="radio"
        accessibilityState={{ selected: !working }}
        className={cn('flex-1 flex-row items-center justify-center gap-2 h-11 rounded-xl border', !working ? 'bg-danger border-danger' : 'bg-surface border-border')}
      >
        <Icon sf="exclamationmark.triangle.fill" ion="warning" size={15} color={!working ? Palette.white : Palette.danger} />
        <Text className={cn('text-[14px] font-semibold', !working ? 'text-danger-foreground' : 'text-foreground')}>Not working</Text>
      </Pressable>
    </View>
  );
}
