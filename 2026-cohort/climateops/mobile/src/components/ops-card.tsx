import type { ReactNode } from 'react';
import { View } from 'react-native';

import { cn } from '@/lib/cn';

type OpsCardProps = {
  children: ReactNode;
  /** plain: white card. advisory: pink card with a red left rail. tint: pale blue. */
  tone?: 'plain' | 'advisory' | 'tint';
  padded?: boolean;
};

/** ClimateOps' card: white with a hairline ice border and 16 pt corners, as in the picked design. */
export function OpsCard({ children, tone = 'plain', padded = true }: OpsCardProps) {
  return (
    <View
      className={cn(
        'rounded-2xl overflow-hidden border',
        tone === 'plain' ? 'bg-surface border-border' : null,
        tone === 'tint' ? 'bg-banner border-banner' : null,
        tone === 'advisory' ? 'bg-advisory border-advisory border-l-4 border-l-danger' : null,
        padded ? 'p-4 gap-3' : null,
      )}
    >
      {children}
    </View>
  );
}
