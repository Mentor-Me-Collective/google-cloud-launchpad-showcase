import Animated, { Easing, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useEffect, useMemo } from 'react';
import { View } from 'react-native';

const COLORS = ['#F8C84E', '#6650E9', '#E27BB0', '#38B9D8', '#2ECC71'];

export function ConfettiBurst({ visible }: { visible: boolean }) {
  const progress = useSharedValue(0);
  const pieces = useMemo(
    () => Array.from({ length: 18 }, (_, index) => ({
      x: ((index * 37) % 160) - 80,
      y: -40 - ((index * 19) % 100),
      rotate: (index % 2 ? 1 : -1) * (70 + ((index * 23) % 140)),
      delay: (index % 6) * 35,
      color: COLORS[index % COLORS.length],
    })),
    [],
  );

  useEffect(() => {
    if (!visible) return;
    progress.value = 0;
    progress.value = withTiming(1, { duration: 850, easing: Easing.out(Easing.cubic) });
  }, [progress, visible]);

  return (
    <View pointerEvents="none" className="absolute inset-x-0 top-0 z-20 items-center">
      {pieces.map((piece, index) => (
        <ConfettiPiece key={index} piece={piece} progress={progress} />
      ))}
    </View>
  );
}

function ConfettiPiece({
  piece,
  progress,
}: {
  piece: { x: number; y: number; rotate: number; delay: number; color: string };
  progress: SharedValue<number>;
}) {
  const style = useAnimatedStyle(() => ({
    // Keep the pieces hidden before the celebration starts. Without this,
    // the first frame renders a single static strip at the top of activities.
    opacity: progress.value === 0
      ? 0
      : progress.value < 0.92
        ? 1
        : 1 - (progress.value - 0.92) / 0.08,
    transform: [
      { translateX: piece.x * progress.value },
      { translateY: piece.y * progress.value + progress.value * progress.value * 120 },
      { rotate: `${piece.rotate * progress.value}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[style, { backgroundColor: piece.color, position: 'absolute', top: 24, width: 8, height: 14, borderRadius: 3 }]}
    />
  );
}
