import { useEffect } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { easings } from '@/lib/motion';

/** Illustration ink. The blobs are always light, so their faces stay navy in both
 *  color schemes instead of following `foreground` (which flips to white in dark). */
const INK = '#0B1F4B';

type FloatingBlobProps = {
  size: number;
  /** A Tailwind background utility for the body, e.g. "bg-accent/20". */
  tone: string;
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
  delay?: number;
  distance?: number;
};

/** A tiny smiling friend that bobs up and down behind the character. */
export function FloatingBlob({
  size,
  tone,
  top,
  left,
  right,
  bottom,
  delay = 0,
  distance = 8,
}: FloatingBlobProps) {
  const reduced = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    progress.set(
      withDelay(delay, withRepeat(withTiming(1, { duration: 2600, easing: easings.move }), -1, true)),
    );
  }, [delay, progress, reduced]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -distance * progress.get() }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', top, left, right, bottom }, style]}>
      <View
        className={`items-center justify-center ${tone}`}
        style={{ width: size, height: size, borderRadius: size / 2 }}>
        <View style={{ flexDirection: 'row', gap: size * 0.14, marginTop: -size * 0.04 }}>
          <View
            style={{
              width: size * 0.12,
              height: size * 0.19,
              borderRadius: size * 0.09,
              backgroundColor: INK,
            }}
          />
          <View
            style={{
              width: size * 0.12,
              height: size * 0.19,
              borderRadius: size * 0.09,
              backgroundColor: INK,
            }}
          />
        </View>
        <Svg width={size * 0.4} height={size * 0.2} viewBox="0 0 40 20" style={{ marginTop: size * 0.03 }}>
          <Path
            d="M4 5 C10 18 30 18 36 5"
            stroke={INK}
            strokeWidth={3.5}
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </View>
    </Animated.View>
  );
}
