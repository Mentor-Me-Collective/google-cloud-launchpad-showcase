import { useEffect } from "react";
import { Text, View } from "react-native";
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { Card } from "@/components/card";
import type { AIChoice } from "@/features/learn/types/learn";
import { durations, easings, timing } from "@/lib/motion";
import { useCopy } from "@/lib/i18n";

const STAGGER = 140;

type GuessBarProps = {
  choice: AIChoice;
  index: number;
  isTop: boolean;
  isPicked: boolean;
  matched: boolean;
};

function GuessBar({ choice, index, isTop, isPicked, matched }: GuessBarProps) {
  const reduced = useReducedMotion();
  const width = useSharedValue(reduced ? choice.p * 100 : 0);
  useEffect(() => {
    if (reduced) return;
    width.set(
      withDelay(index * STAGGER, withTiming(choice.p * 100, timing.draw)),
    );
  }, [choice.p, index, reduced, width]);
  const fill = useAnimatedStyle(() => ({
    width: `${Math.max(width.get(), 2)}%`,
  }));
  const tone =
    isTop && matched ? "bg-success" : isTop ? "bg-accent" : "bg-accent/35";
  const percent = Math.round(choice.p * 100);
  const copy = useCopy();
  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <Text className="font-rounded text-lg font-bold text-foreground">
            {choice.word}
          </Text>
          {isPicked ? (
            <View className="rounded-full border border-accent px-2 py-0.5">
              <Text className="text-xs font-semibold text-accent">
                {copy.t('Your guess')}
              </Text>
            </View>
          ) : null}
        </View>
        <Animated.Text
          entering={FadeIn.duration(durations.base)
            .easing(easings.enter)
            .delay(index * STAGGER + durations.draw / 2)}
          className="text-base font-bold tabular-nums text-foreground"
        >
          {percent}%
        </Animated.Text>
      </View>
      <View className="h-3 overflow-hidden rounded-full bg-surface-secondary">
        <Animated.View className={`h-full rounded-full ${tone}`} style={fill} />
      </View>
    </View>
  );
}

type AIGuessBarsProps = {
  choices: AIChoice[];
  pickedWord: string;
};

/** "Think like the model": the model's next-word guesses draw in after the learner picks. */
export function AIGuessBars({ choices, pickedWord }: AIGuessBarsProps) {
  const copy = useCopy();
  const sorted = [...choices].sort((a, b) => b.p - a.p);
  const top = sorted[0]?.word;
  const matched = top === pickedWord;
  return (
    <Card>
      <View className="gap-4">
        <View className="gap-1">
          <Text className="text-xs font-bold uppercase tracking-wide text-muted">
            {copy.t('What the model guessed')}
          </Text>
          <Text className="text-lg text-foreground">
            {matched
              ? copy.t('You thought like the model.')
              : copy.t('The model\'s top guess was "{word}".', { word: top ?? '' })}
          </Text>
        </View>
        {sorted.map((choice, i) => (
          <GuessBar
            key={choice.word}
            choice={choice}
            index={i}
            isTop={i === 0}
            isPicked={choice.word === pickedWord}
            matched={matched}
          />
        ))}
        <Text className="text-sm text-muted">
          {copy.t('Example numbers to show the idea, not from a real model.')}
        </Text>
      </View>
    </Card>
  );
}
