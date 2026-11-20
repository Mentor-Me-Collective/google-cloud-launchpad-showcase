import Svg, { Polyline } from 'react-native-svg';

import { Palette } from '@/constants/theme';

/** Trailing disclosure mark, only placed on surfaces that navigate when tapped. */
export function Chevron({ color = Palette.muted, size = 14 }: { color?: string; size?: number }) {
  return (
    <Svg width={size * 0.6} height={size} viewBox="0 0 6 10">
      <Polyline points="1,1 5,5 1,9" fill="none" stroke={color} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
