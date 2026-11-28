import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import BlinkEyes from '@/assets/character/character-blink.svg';
import OpenEyes from '@/assets/character/character-open.svg';
import { easings } from '@/lib/motion';

const VIEWBOX_RATIO = 160.247 / 165.471;

/**
 * The LearnLite character. It floats gently and blinks every few seconds by
 * crossfading the open-eyes and closed-eyes SVG exports. Motion is disabled when
 * the OS asks for reduced motion.
 */
export function HeroCharacter({ width = 232 }: { width?: number }) {
  const height = Math.round(width * VIEWBOX_RATIO);
  const reduced = useReducedMotion();
  const float = useSharedValue(0);
  const blink = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    float.set(withRepeat(withTiming(1, { duration: 2400, easing: easings.move }), -1, true));

    const id = setInterval(() => {
      blink.set(
        withSequence(
          withTiming(1, { duration: 90, easing: easings.enter }),
          withDelay(120, withTiming(0, { duration: 120, easing: easings.exit })),
        ),
      );
    }, 4200);

    return () => clearInterval(id);
  }, [blink, float, reduced]);

  const floatStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -10 * float.get() }, { rotate: `${-1.5 + 3 * float.get()}deg` }],
  }));
  const blinkStyle = useAnimatedStyle(() => ({ opacity: blink.get() }));

  return (
    <Animated.View style={floatStyle}>
      <View>
        <OpenEyes width={width} height={height} />
        <Animated.View style={[StyleSheet.absoluteFill, blinkStyle, { pointerEvents: 'none' }]}>
          <BlinkEyes width={width} height={height} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

/** The little speech bubble that sits next to the character. */
export function SpeechBubble({ label }: { label: string }) {
  return (
    <View className="rounded-2xl bg-foreground px-4 py-2">
      <Text className="text-lg font-black text-background">{label}</Text>
      <View className="absolute -bottom-1 left-4 size-3 rotate-45 rounded-sm bg-foreground" />
    </View>
  );
}
