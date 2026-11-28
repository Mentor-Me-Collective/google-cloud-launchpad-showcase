import { usePageActive } from '@/lib/tab-store';
import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { playful } from '@/lib/motion';

import {
  CANVAS,
  Cheeks,
  ClosedEyes,
  EyeWhites,
  Feet,
  LeftArm,
  LeftBrow,
  LUMI_HEIGHT,
  LUMI_VIEWBOX,
  LUMI_WIDTH,
  Mouth,
  PIVOTS,
  Pupils,
  RightArm,
  RightBrow,
  SadMouth,
  Torso,
} from './lumi-parts';

/**
 * How Lumi feels right now.
 * - idle: breathes, blinks and looks around on its own.
 * - happy: smiling eyes, rosy cheeks, a little hop.
 * - cheer: a big celebration jump with arms up (a correct answer, a finished lesson).
 * - sad: droopy brows, a frown, a small shake (a wrong answer).
 * - thinking: looks up to the side, one arm up (while the student chooses).
 * - wave: says hello with the right arm.
 */
export type LumiMood = 'idle' | 'happy' | 'cheer' | 'sad' | 'thinking' | 'wave';

type LumiProps = {
  /** Width in points. Height follows the drawing. */
  size?: number;
  mood?: LumiMood;
  /** Change this number to play the same mood again (e.g. two correct answers in a row). */
  replay?: number;
  style?: ViewStyle;
};

const ratio = LUMI_HEIGHT / LUMI_WIDTH;

function Layer({ children, style }: { children: React.ReactNode; style?: object }) {
  // The drawing never changes, only its position: keep it as a cached bitmap so moving it
  // does not redraw every path on each frame (expensive on Android).
  return (
    <Animated.View
      pointerEvents="none"
      renderToHardwareTextureAndroid
      shouldRasterizeIOS
      style={[StyleSheet.absoluteFill, style]}>
      <Svg width="100%" height="100%" viewBox={LUMI_VIEWBOX}>
        {children}
      </Svg>
    </Animated.View>
  );
}

/** Lumi, LearnLite's guide: the drawing split into parts that move on their own. */
export function Lumi({ size = 160, mood = 'idle', replay = 0, style }: LumiProps) {
  const height = size * ratio;
  const unit = size / LUMI_WIDTH; // one drawing unit in points
  // The canvas is bigger than the drawing (room for the arms); it overflows the layout box.
  const canvas = { left: CANVAS.x * unit, top: CANVAS.y * unit, width: CANVAS.w * unit, height: CANVAS.h * unit };
  const reduced = useReducedMotion();

  const jump = useSharedValue(0); // points, negative is up
  const shake = useSharedValue(0);
  const squashX = useSharedValue(1);
  const squashY = useSharedValue(1);
  const breathe = useSharedValue(0);
  const armL = useSharedValue(0); // degrees; positive raises the left arm
  const armR = useSharedValue(0); // degrees; negative raises the right arm
  const lookX = useSharedValue(0); // drawing units
  const lookY = useSharedValue(0);
  const blink = useSharedValue(0);
  const joy = useSharedValue(0); // 0 or 1: smiling "^ ^" eyes (never in between: the eyes would overlap)
  const blush = useSharedValue(0); // 0..1 rosy cheeks
  const sad = useSharedValue(0); // 0..1 brows, frown
  const mouth = useSharedValue(1);
  const browUp = useSharedValue(0);
  const moodRef = useRef(mood);
  moodRef.current = mood;

  // Tabs keep every screen mounted: only the Lumi on the visible screen, with the app in the
  // foreground, breathes, blinks and looks around. The others stay still and cost nothing.
  const [focused, setFocused] = useState(true);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => setForeground(state === 'active'));
    return () => subscription.remove();
  }, []);
  const pageActive = usePageActive();
  const alive = focused && foreground && pageActive && !reduced;

  // ---- always-on life: breathing, blinking and looking around -------------------------
  useEffect(() => {
    if (!alive) {
      cancelAnimation(breathe);
      return;
    }
    breathe.set(withRepeat(withTiming(1, { duration: 2200, easing: Easing.inOut(Easing.sin) }), -1, true));

    let blinkTimer: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      blinkTimer = setTimeout(() => {
        const twice = Math.random() < 0.25;
        const one = withSequence(withTiming(1, { duration: 70 }), withTiming(0, { duration: 110 }));
        blink.set(twice ? withSequence(one, withDelay(90, one)) : one);
        scheduleBlink();
      }, 2200 + Math.random() * 3200);
    };
    scheduleBlink();

    let lookTimer: ReturnType<typeof setTimeout>;
    const scheduleLook = () => {
      lookTimer = setTimeout(() => {
        if (moodRef.current === 'idle' || moodRef.current === 'happy') {
          const x = (Math.random() - 0.5) * 9;
          const y = (Math.random() - 0.5) * 5;
          const hold = 900 + Math.random() * 700;
          // A glance to the side, then back to the viewer.
          lookX.set(withSequence(withSpring(x, playful.soft), withDelay(hold, withSpring(0, playful.soft))));
          lookY.set(withSequence(withSpring(y, playful.soft), withDelay(hold, withSpring(0, playful.soft))));
        }
        scheduleLook();
      }, 2800 + Math.random() * 3500);
    };
    scheduleLook();

    return () => {
      clearTimeout(blinkTimer);
      clearTimeout(lookTimer);
      cancelAnimation(breathe);
    };
  }, [alive, blink, breathe, lookX, lookY]);

  // ---- moods ----------------------------------------------------------------------------
  useEffect(() => {
    const rest = () => {
      armL.set(withSpring(0, playful.soft));
      armR.set(withSpring(0, playful.soft));
      squashX.set(withSpring(1, playful.soft));
      squashY.set(withSpring(1, playful.soft));
      mouth.set(withSpring(1, playful.soft));
      browUp.set(withSpring(0, playful.soft));
    };

    if (reduced) {
      joy.set(mood === 'happy' || mood === 'cheer' ? 1 : 0);
      blush.set(mood === 'happy' || mood === 'cheer' || mood === 'wave' ? 1 : 0);
      sad.set(mood === 'sad' ? 1 : 0);
      return;
    }

    switch (mood) {
      case 'idle':
        joy.set(withTiming(0, { duration: 120 }));
        blush.set(withTiming(0, { duration: 300 }));
        sad.set(withTiming(0, { duration: 200 }));
        lookX.set(withSpring(0, playful.soft));
        lookY.set(withSpring(0, playful.soft));
        rest();
        break;

      case 'happy':
        sad.set(withTiming(0, { duration: 150 }));
        joy.set(withTiming(1, { duration: 120 }));
        blush.set(withTiming(1, { duration: 200 }));
        mouth.set(withSpring(1.2, playful.pop));
        armL.set(withSpring(32, playful.pop));
        armR.set(withSpring(-32, playful.pop));
        jump.set(withSequence(withTiming(-8 * unit, { duration: 160, easing: Easing.out(Easing.quad) }), withSpring(0, playful.bouncy)));
        break;

      case 'cheer': {
        sad.set(withTiming(0, { duration: 120 }));
        joy.set(withTiming(1, { duration: 120 }));
        blush.set(withTiming(1, { duration: 200 }));
        mouth.set(withSpring(1.3, playful.pop));
        browUp.set(withSpring(3, playful.pop));
        // Anticipate (squash), launch (stretch), land (squash), settle.
        const hop = (height: number) =>
          withSequence(
            withTiming(-height * unit, { duration: 230, easing: Easing.out(Easing.quad) }),
            withTiming(0, { duration: 200, easing: Easing.in(Easing.quad) }),
          );
        jump.set(withDelay(110, withSequence(hop(30), hop(16), withSpring(0, playful.bouncy))));
        squashY.set(
          withSequence(
            withTiming(0.86, { duration: 110 }),
            withTiming(1.1, { duration: 160 }),
            withDelay(270, withTiming(0.9, { duration: 90 })),
            withTiming(1.06, { duration: 140 }),
            withDelay(260, withSpring(1, playful.bouncy)),
          ),
        );
        squashX.set(
          withSequence(
            withTiming(1.12, { duration: 110 }),
            withTiming(0.94, { duration: 160 }),
            withDelay(270, withTiming(1.08, { duration: 90 })),
            withTiming(0.97, { duration: 140 }),
            withDelay(260, withSpring(1, playful.bouncy)),
          ),
        );
        const wiggle = (up: number) =>
          withSequence(
            withSpring(up, playful.pop),
            withRepeat(withTiming(up - Math.sign(up) * 24, { duration: 170 }), 4, true),
            withSpring(Math.sign(up) * 24, playful.soft), // arms come down to a happy pose
          );
        armL.set(wiggle(108));
        armR.set(wiggle(-108));
        break;
      }

      case 'sad':
        joy.set(withTiming(0, { duration: 120 }));
        blush.set(withTiming(0, { duration: 200 }));
        sad.set(withTiming(1, { duration: 220 }));
        lookX.set(withSpring(0, playful.soft));
        lookY.set(withSpring(4, playful.soft));
        mouth.set(withSpring(1, playful.soft));
        browUp.set(withSpring(0, playful.soft));
        armL.set(withSpring(-10, playful.soft));
        armR.set(withSpring(10, playful.soft));
        squashY.set(withSequence(withTiming(0.9, { duration: 140 }), withSpring(0.96, playful.soft)));
        squashX.set(withSequence(withTiming(1.07, { duration: 140 }), withSpring(1.02, playful.soft)));
        shake.set(
          withSequence(
            withTiming(-5 * unit, { duration: 60 }),
            withRepeat(withTiming(5 * unit, { duration: 80 }), 4, true),
            withSpring(0, playful.soft),
          ),
        );
        break;

      case 'thinking':
        joy.set(withTiming(0, { duration: 120 }));
        blush.set(withTiming(0, { duration: 200 }));
        sad.set(withTiming(0, { duration: 150 }));
        lookX.set(withSpring(5, playful.soft));
        lookY.set(withSpring(-4, playful.soft));
        browUp.set(withSpring(2.5, playful.soft));
        armR.set(withSpring(-38, playful.soft));
        armL.set(withSpring(0, playful.soft));
        mouth.set(withSpring(0.9, playful.soft));
        break;

      case 'wave':
        sad.set(withTiming(0, { duration: 120 }));
        joy.set(withTiming(0, { duration: 120 }));
        blush.set(withTiming(1, { duration: 200 }));
        mouth.set(withSpring(1.15, playful.pop));
        armL.set(withSpring(0, playful.soft));
        armR.set(
          withSequence(
            withSpring(-95, playful.pop),
            withRepeat(withTiming(-65, { duration: 200, easing: Easing.inOut(Easing.sin) }), 6, true),
            withSpring(0, playful.soft),
          ),
        );
        jump.set(withSequence(withTiming(-6 * unit, { duration: 150 }), withSpring(0, playful.bouncy)));
        break;
    }
  }, [mood, replay, reduced, unit, armL, armR, blush, browUp, joy, jump, lookX, lookY, mouth, sad, shake, squashX, squashY]);

  // ---- styles ---------------------------------------------------------------------------
  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: jump.get() - breathe.get() * 2 * unit }, { translateX: shake.get() }],
  }));
  const bodyStyle = useAnimatedStyle(() => ({
    transform: [
      { scaleX: squashX.get() * (1 + breathe.get() * 0.012) },
      { scaleY: squashY.get() * (1 - breathe.get() * 0.008 + 0.02 * breathe.get()) },
    ],
  }));
  const armLStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armL.get() + breathe.get() * 4}deg` }],
  }));
  const armRStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${armR.get() - breathe.get() * 4}deg` }],
  }));
  const eyesStyle = useAnimatedStyle(() => ({
    opacity: 1 - joy.get(),
    transform: [{ scaleY: 1 - blink.get() * 0.92 }],
  }));
  const pupilsStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: lookX.get() * unit }, { translateY: lookY.get() * unit }],
  }));
  const closedStyle = useAnimatedStyle(() => ({ opacity: Math.max(joy.get(), blink.get()) }));
  const cheeksStyle = useAnimatedStyle(() => ({ opacity: blush.get() }));
  const mouthStyle = useAnimatedStyle(() => ({
    opacity: 1 - sad.get(),
    transform: [{ scale: mouth.get() }],
  }));
  const sadMouthStyle = useAnimatedStyle(() => ({ opacity: sad.get() }));
  const leftBrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -browUp.get() * unit }, { rotate: `${-16 * sad.get()}deg` }],
  }));
  const rightBrowStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -browUp.get() * unit }, { rotate: `${16 * sad.get()}deg` }],
  }));
  const shadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(jump.get(), [-34 * unit, 0], [0.04, 0.09]),
    transform: [{ scaleX: interpolate(jump.get(), [-34 * unit, 0], [0.6, 1]) }],
  }));

  return (
    <View
      style={[{ width: size, height: height + size * 0.06, overflow: 'visible' }, style]}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants">
      {/* Ground shadow: shrinks while Lumi is in the air. */}
      <Animated.View
        pointerEvents="none"
        style={[
          { position: 'absolute', bottom: size * 0.01, alignSelf: 'center', width: size * 0.42, height: size * 0.05, borderRadius: size, backgroundColor: '#0B1F4B' },
          shadowStyle,
        ]}
      />
      <Animated.View style={[{ position: 'absolute', ...canvas }, rootStyle]}>
        <Layer>
          <Feet />
        </Layer>
        <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: PIVOTS.body }, bodyStyle]}>
          <Layer style={[{ transformOrigin: PIVOTS.leftShoulder }, armLStyle]}>
            <LeftArm />
          </Layer>
          <Layer style={[{ transformOrigin: PIVOTS.rightShoulder }, armRStyle]}>
            <RightArm />
          </Layer>
          <Layer>
            <Torso />
          </Layer>
          <Layer style={cheeksStyle}>
            <Cheeks />
          </Layer>
          <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: PIVOTS.eyes }, eyesStyle]}>
            <Layer>
              <EyeWhites />
            </Layer>
            <Layer style={pupilsStyle}>
              <Pupils />
            </Layer>
          </Animated.View>
          <Layer style={closedStyle}>
            <ClosedEyes />
          </Layer>
          <Layer style={[{ transformOrigin: PIVOTS.mouth }, mouthStyle]}>
            <Mouth />
          </Layer>
          <Layer style={sadMouthStyle}>
            <SadMouth />
          </Layer>
          <Layer style={[{ transformOrigin: PIVOTS.leftBrowInner }, leftBrowStyle]}>
            <LeftBrow />
          </Layer>
          <Layer style={[{ transformOrigin: PIVOTS.rightBrowInner }, rightBrowStyle]}>
            <RightBrow />
          </Layer>
        </Animated.View>
      </Animated.View>
    </View>
  );
}
