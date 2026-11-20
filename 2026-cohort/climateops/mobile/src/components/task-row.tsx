import { Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Chevron } from '@/components/chevron';
import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { durations, easings } from '@/lib/motion';

type TaskRowProps = {
  title: string;
  subtitle: string;
  done: boolean;
  onPress: () => void;
  onToggle?: () => void;
};

const tick = ZoomIn.duration(durations.gentle).easing(easings.enter);

export function TaskRow({ title, subtitle, done, onPress, onToggle }: TaskRowProps) {
  return (
    <View className="flex-row items-center gap-3 py-3">
      <Pressable
        onPress={onToggle}
        isDisabled={!onToggle}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: done }}
        accessibilityLabel={title}
        hitSlop={8}
      >
        {done ? (
          <Animated.View entering={tick} className="size-6 rounded-full bg-accent items-center justify-center">
            <Icon sf="checkmark" ion="checkmark" size={12} color={Palette.white} />
          </Animated.View>
        ) : (
          <View className="size-6 rounded-full border-2 border-border" />
        )}
      </Pressable>
      <Pressable onPress={onPress} className="flex-1 flex-row items-center gap-2" accessibilityRole="button">
        <View className="flex-1 gap-0.5">
          <Text className="text-[15px] font-semibold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          <Text className="text-[12px] text-muted" numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <Chevron />
      </Pressable>
    </View>
  );
}
