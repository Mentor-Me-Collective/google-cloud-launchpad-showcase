import { router, useSegments, type Href } from 'expo-router';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import { pressHaptic } from '@/components/pressable';

type Tab = { name: string; href: Href };

/** A swipe has to travel this far, or be this fast, to count as "go to the next tab". */
const MIN_DISTANCE = 60;
const MIN_VELOCITY = 650;

/**
 * Lets the person change tab by swiping the screen left or right, like the pages of a book:
 * swipe left for the next tab, right for the previous one. The gesture only wakes up once the
 * finger has clearly moved sideways, so scrolling up and down is not affected.
 */
export function SwipeTabs({ tabs, children }: { tabs: Tab[]; children: ReactNode }) {
  const segments = useSegments();
  // The first tab is the "index" route, which has no segment of its own.
  const current = tabs.findIndex((tab) => tab.name === (segments[1] ?? 'index'));

  const go = (direction: 1 | -1) => {
    const next = tabs[current + direction];
    if (current === -1 || !next) return;
    pressHaptic();
    router.navigate(next.href);
  };

  const swipe = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-30, 30])
    .failOffsetY([-24, 24])
    .onEnd((event) => {
      const far = Math.abs(event.translationX) >= MIN_DISTANCE;
      const fast = Math.abs(event.velocityX) >= MIN_VELOCITY;
      if (!far && !fast) return;
      go(event.translationX < 0 ? 1 : -1);
    });

  return (
    <GestureDetector gesture={swipe}>
      <View style={{ flex: 1 }}>{children}</View>
    </GestureDetector>
  );
}
