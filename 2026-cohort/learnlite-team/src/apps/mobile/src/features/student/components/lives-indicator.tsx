import { useEffect } from 'react';
import { Text } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

export function LivesIndicator({ hearts, maxHearts, broken = false }: { hearts: number; maxHearts: number; broken?: boolean }) {
  const safeHearts = Math.max(0, Math.min(hearts, maxHearts));
  const motion = useSharedValue(0);

  useEffect(() => {
    if (!broken) return;
    motion.value = 0;
    motion.value = withSequence(
      withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
      withTiming(-1, { duration: 120, easing: Easing.inOut(Easing.quad) }),
      withTiming(0, { duration: 160, easing: Easing.out(Easing.quad) }),
    );
  }, [broken, safeHearts, motion]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: motion.value * 4 },
      { rotate: `${motion.value * 6}deg` },
      { scale: 1 + Math.abs(motion.value) * 0.08 },
    ],
  }));

  return (
    <Animated.View
      style={animatedStyle}
      accessibilityLabel={`${safeHearts} hearts`}
      className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5"
    >
      <LifeHeart size={23} active={safeHearts > 0} broken={broken} />
      <Text className="font-rounded text-base font-black text-foreground">{safeHearts}</Text>
    </Animated.View>
  );
}

function LifeHeart({ size, active, broken }: { size: number; active: boolean; broken: boolean }) {
  const color = broken ? '#D6536C' : active ? '#E45B78' : '#C9CEDB';
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" accessibilityLabel="heart life">
      <Path
        d="M12 20.5C10.8 19.55 3 14.8 3 8.4C3 5.35 5.2 3.5 7.8 3.5C9.65 3.5 11.05 4.5 12 5.75C12.95 4.5 14.35 3.5 16.2 3.5C18.8 3.5 21 5.35 21 8.4C21 14.8 13.2 19.55 12 20.5Z"
        fill={active && !broken ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {broken ? <Path d="M12 5.7L10.5 9.2L13.6 11.1L11.2 14.2L13.1 16.4" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" /> : null}
    </Svg>
  );
}
