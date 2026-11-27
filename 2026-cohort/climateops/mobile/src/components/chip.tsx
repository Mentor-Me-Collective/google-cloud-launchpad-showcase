import type { ReactNode } from 'react';
import { Text } from 'react-native';

import { Pressable } from '@/components/pressable';
import { cn } from '@/lib/cn';

type ChipProps = { label: string; active: boolean; onPress: () => void; leading?: ReactNode };

export function Chip({ label, active, onPress, leading }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      className={cn(
        'flex-row items-center gap-1.5 rounded-full px-3 h-9 border',
        active ? 'bg-accent border-accent' : 'bg-surface border-border',
      )}
    >
      {leading}
      <Text className={cn('text-[13px] font-medium', active ? 'text-accent-foreground' : 'text-foreground')}>{label}</Text>
    </Pressable>
  );
}
