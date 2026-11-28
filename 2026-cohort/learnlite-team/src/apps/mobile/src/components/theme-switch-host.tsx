/**
 * Theme-switch host. Mounted once at the root (_layout.tsx), so changing theme with an
 * animation is one call:
 *
 *   const switchTheme = useThemeSwitch();
 *   switchTheme('dark');
 *
 * The host takes a picture of the whole window, switches the theme underneath it, then fades
 * the old picture away. It used to draw a circular reveal with Skia, but Skia is a very heavy
 * native library (several MB per phone architecture) and this was its only use, so the reveal
 * is now a plain cross-fade. Never call Uniwind.setTheme directly from a toggle: route it
 * through useThemeSwitch so the fade plays.
 */
import { createContext, use, useCallback, useRef, useState } from 'react';
import { Appearance, Image, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { captureScreen } from 'react-native-view-shot';
import { scheduleOnRN } from 'react-native-worklets';
import { Uniwind } from 'uniwind';

export type ThemeChoice = 'light' | 'dark' | 'system';

interface SwitchOrigin {
  x: number;
  y: number;
}

type ThemeSwitchFn = (next: ThemeChoice, origin?: SwitchOrigin) => void;

const ThemeSwitchContext = createContext<ThemeSwitchFn | null>(null);

/** The animated theme switch. Falls back to a plain (instant) Uniwind.setTheme
 *  when no host is mounted, so callers never need to branch. */
export const useThemeSwitch = (): ThemeSwitchFn => {
  const fn = use(ThemeSwitchContext);
  if (!fn) {
    return (next: ThemeChoice) => Uniwind.setTheme(next);
  }
  return fn;
};

const FADE_DURATION = 280;
const SWITCH_DELAY = 80;

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

function resolveTarget(next: ThemeChoice): 'light' | 'dark' {
  if (next === 'light' || next === 'dark') return next;
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export function ThemeSwitchHost({ children }: { children: React.ReactNode }) {
  const [overlay, setOverlay] = useState<string | null>(null);
  const animating = useRef(false);
  const opacity = useSharedValue(1);

  const finishSwitch = useCallback(() => {
    setOverlay(null);
    animating.current = false;
  }, []);

  const switchTheme = useCallback<ThemeSwitchFn>(
    async (next) => {
      if (animating.current) return;

      const currentResolved = Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
      if (currentResolved === resolveTarget(next)) {
        Uniwind.setTheme(next);
        return;
      }

      animating.current = true;
      let uri: string | null = null;
      try {
        uri = await captureScreen({ format: 'jpg', quality: 0.8, result: 'tmpfile' });
      } catch {
        uri = null;
      }
      if (!uri) {
        // No frozen frame to fade from: switch plainly rather than glitch.
        Uniwind.setTheme(next);
        animating.current = false;
        return;
      }

      opacity.set(1);
      setOverlay(uri);
      await wait(SWITCH_DELAY);
      Uniwind.setTheme(next);

      opacity.set(
        withTiming(0, { duration: FADE_DURATION, easing: Easing.out(Easing.quad) }, (finished) => {
          'worklet';
          if (finished) scheduleOnRN(finishSwitch);
        }),
      );
    },
    [opacity, finishSwitch],
  );

  const fade = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <ThemeSwitchContext.Provider value={switchTheme}>
      <View collapsable={false} style={styles.container}>
        {children}
        {overlay ? (
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, fade]}>
            <Image source={{ uri: overlay }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        ) : null}
      </View>
    </ThemeSwitchContext.Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
