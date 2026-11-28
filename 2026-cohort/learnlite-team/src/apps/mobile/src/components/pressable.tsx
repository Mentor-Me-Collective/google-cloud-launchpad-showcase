import { PressableFeedback } from 'heroui-native';
import { useRef, type ComponentProps } from 'react';
import { Presets } from 'react-native-pulsar';

/** Fire the standard selection haptic (Pulsar). Call at the START of a HeroUI <Button>'s
 *  onPress (and any other onPress that doesn't go through <Pressable>/<ListRow>) so EVERY
 *  tap has haptic feedback. */
export function pressHaptic(): void {
  Presets.System.selection();
}

/** Two taps on the same thing closer than this count as one (a double tap). */
const REPEAT_MS = 650;

type PressEvent = { nativeEvent?: { timestamp?: number }; timeStamp?: number } | undefined;

/** When the finger actually touched the screen. A busy JS thread (mounting the next screen)
 * can deliver the second tap of a double tap a whole second late, so comparing the time the
 * handler runs is not enough; the touch's own timestamp is. */
function touchTime(event: PressEvent): number {
  const time = event?.nativeEvent?.timestamp ?? event?.timeStamp;
  return typeof time === 'number' && time > 0 ? time : Date.now();
}

/**
 * Returns a check to call at the start of onPress: false for the second tap of a double tap.
 * Every button in the app goes through it (Pressable, AppButton, ListRow, the lesson path), so
 * a quick double tap can never open the same screen twice.
 */
export function useSinglePress(): (event?: PressEvent) => boolean {
  const last = useRef<number | null>(null);
  return (event) => {
    const time = touchTime(event);
    if (last.current !== null && Math.abs(time - last.current) < REPEAT_MS) return false;
    last.current = time;
    return true;
  };
}

type PressableProps = ComponentProps<typeof PressableFeedback> & {
  /** For controls meant to be tapped quickly over and over (rare). */
  allowRepeat?: boolean;
};

/**
 * The standard pressable surface — HeroUI's PressableFeedback (built-in scale animation)
 * PLUS a selection haptic on every press. Use this for ANY tappable thing that isn't a
 * <ListRow>, a HeroUI <Button>, or the native <Segmented> — a pressable card, a custom
 * chip, an icon button. Never a bare React Native Pressable (no animation, no haptic).
 *
 * For a HeroUI <Button>, call pressHaptic() at the start of its onPress; for <ListRow> the
 * haptic is built in.
 */
export function Pressable({ onPress, allowRepeat = false, ...rest }: PressableProps) {
  const firstTap = useSinglePress();
  return (
    <PressableFeedback
      onPress={(e) => {
        if (!allowRepeat && !firstTap(e as PressEvent)) return;
        pressHaptic();
        if (typeof onPress === 'function') onPress(e);
      }}
      {...rest}
    />
  );
}
