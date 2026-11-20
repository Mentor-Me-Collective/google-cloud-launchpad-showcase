import { Text, View } from 'react-native';

import { cn } from '@/lib/cn';

type PillProps = {
  label: string;
  tone: 'success' | 'danger' | 'accent' | 'neutral' | 'warning' | 'demo';
  dot?: boolean;
  size?: 'sm' | 'md';
};

export function Pill({ label, tone, dot, size = 'md' }: PillProps) {
  return (
    <View
      className={cn(
        'flex-row items-center gap-1 rounded-full',
        size === 'md' ? 'px-2 py-1' : 'px-2 py-0.5',
        tone === 'success' ? 'bg-success/10' : null,
        tone === 'danger' ? 'bg-danger/10' : null,
        tone === 'accent' ? 'bg-frost' : null,
        tone === 'warning' ? 'bg-warning/15' : null,
        tone === 'neutral' ? 'bg-surface-tertiary' : null,
        tone === 'demo' ? 'bg-demo/10' : null,
      )}
    >
      {dot ? (
        <View
          className={cn(
            'size-2 rounded-full',
            tone === 'success' ? 'bg-success' : null,
            tone === 'danger' ? 'bg-danger' : null,
            tone === 'accent' ? 'bg-accent' : null,
            tone === 'warning' ? 'bg-warning' : null,
            tone === 'neutral' ? 'bg-muted' : null,
          )}
        />
      ) : null}
      <Text
        className={cn(
          'font-semibold',
          size === 'md' ? 'text-[12px]' : 'text-[10px] tracking-wide',
          tone === 'success' ? 'text-success' : null,
          tone === 'danger' ? 'text-danger' : null,
          tone === 'accent' ? 'text-accent' : null,
          tone === 'warning' ? 'text-warning' : null,
          tone === 'neutral' ? 'text-muted' : null,
          tone === 'demo' ? 'text-demo' : null,
        )}
      >
        {label}
      </Text>
    </View>
  );
}
