import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { timing } from '@/lib/motion';

type ProgressBarProps = {
  /** 0–100 */
  percent: number;
  tone?: 'accent' | 'success' | 'light';
};

export function ProgressBar({ percent, tone = 'accent' }: ProgressBarProps) {
  const width = useSharedValue(percent);
  useEffect(() => {
    width.set(withTiming(percent, timing.move));
  }, [percent, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  const track = tone === 'light' ? 'bg-white/25' : 'bg-surface-secondary';
  const color = tone === 'success' ? 'bg-success' : tone === 'light' ? 'bg-white' : 'bg-accent';
  return (
    <View
      className={`h-2 overflow-hidden rounded-full ${track}`}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: percent }}>
      <Animated.View className={`h-full rounded-full ${color}`} style={fill} />
    </View>
  );
}
