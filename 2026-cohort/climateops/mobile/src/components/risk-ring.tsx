import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { Palette } from '@/constants/theme';
import { timing } from '@/lib/motion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type RiskRingProps = { value: number; color: string; size?: number; stroke?: number; label?: string };

/** A 0-100 ring that sweeps to its value whenever the value changes. */
export function RiskRing({ value, color, size = 34, stroke = 4, label }: RiskRingProps) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(withTiming(value / 100, timing.draw));
  }, [value, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: circumference * (1 - progress.get()),
  }));

  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke={Palette.frost} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      <Text className={size > 50 ? 'text-lg font-bold text-foreground' : 'text-[10px] font-semibold text-foreground'}>
        {label ?? `${value}`}
      </Text>
    </View>
  );
}
