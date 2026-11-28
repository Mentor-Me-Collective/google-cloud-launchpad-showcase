import { useThemeColor } from 'heroui-native';
import { Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { Presets } from 'react-native-pulsar';

import { Pressable } from '@/components/pressable';
import { Icon } from '@/components/icon';
import { AIGuessBars } from '@/features/learn/components/ai-guess-bars';
import type { AnswerRecord, QuestionItem } from '@/features/learn/types/learn';
import { fadeIn } from '@/lib/motion';
import { useCopy } from '@/lib/i18n';
import { playSound } from '@/lib/sounds';

const KIND_LABEL: Record<QuestionItem['type'], string> = {
  next_word: 'Guess the next word',
  spot_the_error: 'Spot the hallucination',
  single_choice: 'Quick check',
};

type QuestionStepProps = {
  item: QuestionItem;
  record?: AnswerRecord;
  onAnswer: (answer: string, correct: boolean) => void;
};

export function QuestionStep({ item, record, onAnswer }: QuestionStepProps) {
  const success = useThemeColor('success');
  const danger = useThemeColor('danger');
  const accent = useThemeColor('accent');
  const answered = record !== undefined;
  const copy = useCopy();
  const correctText = item.options[item.correct];
  const isNextWord = item.type === 'next_word';

  const pick = (option: string, index: number) => {
    const correct = isNextWord
      ? option === [...(item.ai_choices ?? [])].sort((a, b) => b.p - a.p)[0]?.word
      : index === item.correct;
    if (correct) {
      Presets.System.notificationSuccess();
      playSound('correct');
    } else {
      Presets.System.notificationWarning();
      playSound('fail');
    }
    onAnswer(option, correct);
  };

  return (
    <View className="gap-5">
      <View className="flex-row items-center gap-2">
        <Icon
          sf={isNextWord ? 'text.cursor' : item.type === 'spot_the_error' ? 'exclamationmark.magnifyingglass' : 'checkmark.circle'}
          md={isNextWord ? 'create-outline' : item.type === 'spot_the_error' ? 'search-outline' : 'checkmark-circle-outline'}
          size={18}
          color={accent}
        />
        <Text className="text-sm font-bold uppercase tracking-wide text-accent">{copy.t(KIND_LABEL[item.type])}</Text>
      </View>
      <Text className={isNextWord ? 'text-3xl font-bold leading-10 text-foreground' : 'text-2xl font-bold text-foreground'}>
        {item.prompt}
      </Text>

      <View className={isNextWord ? 'flex-row flex-wrap gap-3' : 'gap-3'}>
        {item.options.map((option, index) => {
          const picked = record?.answer === option;
          const isRight = isNextWord ? false : option === correctText;
          const border = !answered
            ? 'border-border'
            : isRight
              ? 'border-success'
              : picked && !isNextWord
                ? 'border-danger'
                : picked
                  ? 'border-accent'
                  : 'border-border';
          const shape = isNextWord ? 'justify-center rounded-2xl' : 'rounded-2xl';
          return (
            <Pressable
              key={`${index}-${option}`}
              className={isNextWord ? 'basis-2/5 grow' : undefined}
              isDisabled={answered}
              onPress={() => pick(option, index)}
              accessibilityRole="button"
              accessibilityLabel={option}>
              <View
                className={`${shape} min-h-14 flex-row items-center gap-3 border-2 bg-background px-4 py-3 ${border}`}>
                <Text
                  className={
                    isNextWord
                      ? 'text-xl font-semibold text-foreground'
                      : 'flex-1 text-lg leading-6 text-foreground'
                  }>
                  {option}
                </Text>
                {answered && isRight ? <Icon sf="checkmark.circle.fill" md="checkmark-circle" size={22} color={success} /> : null}
                {answered && picked && !isRight && !isNextWord ? (
                  <Icon sf="xmark.circle.fill" md="close-circle" size={22} color={danger} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {answered && isNextWord && item.ai_choices ? (
        <AIGuessBars choices={item.ai_choices} pickedWord={record.answer} />
      ) : null}

      {answered ? (
        <Animated.View entering={fadeIn} className={`gap-2 rounded-2xl p-4 ${record.correct ? 'bg-success/15' : 'bg-accent/10'}`}>
          <Text className="text-lg font-bold text-foreground">
            {isNextWord
              ? copy.t('Why?')
              : record.correct
                ? copy.t('Correct!')
                : copy.t('Not quite. The answer is: {answer}', { answer: correctText })}
          </Text>
          <Text className="text-lg leading-7 text-foreground">{item.feedback}</Text>
        </Animated.View>
      ) : (
        <Text className="text-base text-muted">{copy.t('Tap an answer. It saves on this phone straight away.')}</Text>
      )}
    </View>
  );
}
