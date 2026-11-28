import { useThemeColor } from 'heroui-native';
import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { Card } from '@/components/card';
import { Icon } from '@/components/icon';
import { timing } from '@/lib/motion';
import { useCopy } from '@/lib/i18n';

type CompletionCardProps = {
  lessonNumber: number;
  lessonTitle: string;
  score: number;
  total: number;
  moduleComplete: boolean;
};

export function CompletionCard({ lessonNumber, lessonTitle, score, total, moduleComplete }: CompletionCardProps) {
  const successColor = useThemeColor('success');
  const reduced = useReducedMotion();
  const copy = useCopy();
  const scale = useSharedValue(reduced ? 1 : 0.6);
  const opacity = useSharedValue(reduced ? 1 : 0);
  useEffect(() => {
    if (reduced) return;
    scale.set(withTiming(1, timing.draw));
    opacity.set(withTiming(1, timing.enter));
  }, [opacity, reduced, scale]);
  const seal = useAnimatedStyle(() => ({ opacity: opacity.get(), transform: [{ scale: scale.get() }] }));

  return (
    <View className="items-center gap-5 py-8">
      <Animated.View style={seal} className="size-32 items-center justify-center rounded-full bg-success/15">
        <Icon
          sf={moduleComplete ? 'rosette' : 'checkmark.seal.fill'}
          md={moduleComplete ? 'ribbon' : 'checkmark-circle'}
          size={72}
          color={successColor}
        />
      </Animated.View>
      <View className="items-center gap-2">
        <Text className="text-center text-3xl font-bold text-foreground">
          {moduleComplete ? `${copy.t('Module 1 complete')}!` : `${copy.t('Lesson')} ${lessonNumber} ${copy.t('complete')}`}
        </Text>
        <Text className="text-center text-lg text-muted">
          {moduleComplete ? copy.t('You finished every lesson that is available. Well done, Amara.') : lessonTitle}
        </Text>
      </View>
      <Card>
        <View className="items-center gap-1 px-4">
          <Text className="text-4xl font-black tabular-nums text-foreground">
            {score} {copy.t('of')} {total}
          </Text>
          <Text className="text-base text-muted">{copy.t('answers matched')}</Text>
        </View>
      </Card>
      <Text className="text-center text-base text-muted">{copy.t('Saved on this phone. It stays here even with no internet.')}</Text>
    </View>
  );
}
