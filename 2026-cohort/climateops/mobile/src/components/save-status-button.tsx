import { Button, Spinner } from 'heroui-native';
import { useEffect } from 'react';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { Icon } from '@/components/icon';
import { pressHaptic } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { timing } from '@/lib/motion';

type SaveStatusButtonProps = { onPress: () => void; saving: boolean; saveCount: number };

/** "Save status": the snowflake turns a half-turn each time a save lands. */
export function SaveStatusButton({ onPress, saving, saveCount }: SaveStatusButtonProps) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (saveCount === 0) return;
    turn.set(withTiming(saveCount * 180, timing.draw));
  }, [saveCount, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get()}deg` }] }));

  return (
    <Button
      size="lg"
      variant="primary"
      isDisabled={saving}
      className="rounded-xl"
      onPress={() => {
        pressHaptic();
        onPress();
      }}
    >
      {saving ? (
        <Spinner color={Palette.white} />
      ) : (
        <Animated.View style={style}>
          <Icon sf="snowflake" ion="snow" size={18} color={Palette.white} />
        </Animated.View>
      )}
      <Button.Label>{saving ? 'Saving…' : 'Save status'}</Button.Label>
    </Button>
  );
}
