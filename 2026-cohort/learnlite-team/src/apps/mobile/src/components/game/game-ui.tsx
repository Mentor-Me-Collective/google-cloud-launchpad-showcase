/**
 * Small building blocks for the game layer: stat pills with numbers that count up, a chunky
 * progress bar, a pop-in speech bubble and a staggered entrance wrapper.
 */
import { useThemeColor } from 'heroui-native';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, View, type ViewStyle } from 'react-native';
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { playful } from '@/lib/motion';

/** A number that rolls up to its new value (XP, streak). */
export function useCountUp(value: number, duration = 650): number {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    const began = Date.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (Date.now() - began) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setShown(Math.round(start + (value - start) * eased));
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = value;
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, duration]);
  return shown;
}

/** Icon + number, e.g. 🔥 3. Bounces when the number changes. */
export function StatPill({ icon, value, label, tone = 'neutral' }: { icon: ReactNode; value: number; label: string; tone?: 'neutral' | 'warm' | 'gold' | 'rose' | 'ice' }) {
  const shown = useCountUp(value);
  const bump = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    bump.set(withSequence(withTiming(1.18, { duration: 120 }), withSpring(1, playful.pop)));
  }, [value, bump]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: bump.get() }] }));
  const text = { neutral: 'text-foreground', warm: 'text-[#FF7A00]', gold: 'text-[#E8A600]', rose: 'text-[#E04848]', ice: 'text-[#4AA8F0]' }[tone];
  return (
    <View
      accessible
      accessibilityLabel={`${value} ${label}`}
      className="flex-row items-center gap-1.5 rounded-full border-2 border-border bg-background py-1 pl-2 pr-3.5">
      <Animated.View style={style}>{icon}</Animated.View>
      <Text className={`text-lg font-black ${text}`}>{shown}</Text>
    </View>
  );
}

/** A thick, rounded progress bar with a light stripe on top, like a game's. */
export function GameProgress({ percent, color = '#58CC02', track, height = 16 }: { percent: number; color?: string; track?: string; height?: number }) {
  const themeTrack = useThemeColor('surface-secondary');
  track = track ?? themeTrack;
  const width = useSharedValue(0);
  useEffect(() => {
    width.set(withDelay(150, withSpring(Math.max(0, Math.min(100, percent)), playful.fill)));
  }, [percent, width]);
  const fill = useAnimatedStyle(() => ({ width: `${width.get()}%` }));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(percent) }}
      style={{ height, borderRadius: height, backgroundColor: track, overflow: 'hidden' }}>
      <Animated.View style={[{ height: '100%', borderRadius: height, backgroundColor: color, minWidth: percent > 0 ? height : 0 }, fill]}>
        <View style={{ position: 'absolute', top: height * 0.22, left: height * 0.5, right: height * 0.5, height: height * 0.22, borderRadius: height, backgroundColor: 'rgba(255,255,255,0.35)' }} />
      </Animated.View>
    </View>
  );
}

/** What Lumi says. Pops in, with the tail pointing at Lumi (left by default). */
export function SpeechBubble({ text, tail = 'left', style }: { text: string; tail?: 'left' | 'bottom'; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  // The pop only changes the size a little and never hides the bubble. It used to start fully
  // transparent; when the text changed while the screen was hidden (a lesson open on top), the
  // animation could be lost on Android and the bubble stayed invisible after going back.
  useEffect(() => {
    if (reduced) return;
    scale.set(0.88);
    scale.set(withSpring(1, playful.pop));
  }, [text, reduced, scale]);
  const pop = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));
  return (
    <Animated.View style={[{ transformOrigin: tail === 'left' ? '0% 60%' : '20% 100%' }, pop, style]}>
      <View className="rounded-3xl border-2 border-border bg-background px-4 py-3">
        <Text className="font-rounded text-base font-bold leading-6 text-foreground">{text}</Text>
      </View>
      {tail === 'left' ? (
        <View className="absolute -left-[7px] top-1/2 size-3.5 -translate-y-1/2 rotate-45 border-b-2 border-l-2 border-border bg-background" />
      ) : (
        <View className="absolute -bottom-[7px] left-8 size-3.5 rotate-45 border-b-2 border-r-2 border-border bg-background" />
      )}
    </Animated.View>
  );
}

/** Content that slides up and settles when the screen opens; pass the order for a stagger. */
export function Appear({ index = 0, children, className }: { index?: number; children: ReactNode; className?: string }) {
  // Only the first screenful animates in. Layout animations are costly on Android, and a long
  // list (a module path, a class roster) would otherwise run dozens of them at once.
  if (index > 6) return <View className={className}>{children}</View>;
  return (
    <Animated.View className={className} entering={FadeInDown.delay(60 + index * 60).duration(320)}>
      {children}
    </Animated.View>
  );
}
