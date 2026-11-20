import { Button, Spinner } from 'heroui-native';
import { ScrollView, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BackButton } from '@/components/back-button';
import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { pressHaptic } from '@/components/pressable';
import { Palette } from '@/constants/theme';
import { formatAlertTime } from '@/features/heat-alert/utils/heat-alert-api';
import { BriefText } from '@/features/readiness/components/brief-text';
import { useReadinessBrief } from '@/features/readiness/hooks/use-readiness-brief';
import { durations, easings } from '@/lib/motion';

const arrive = FadeInDown.duration(durations.gentle).easing(easings.enter);

export default function ReadinessBriefScreen() {
  const { brief, loading, error, regenerate } = useReadinessBrief(true);

  return (
    <View className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-4 pt-safe-offset-2 pb-2">
        <BackButton />
        <Text className="text-[20px] font-bold text-foreground">Readiness brief</Text>
      </View>
      <ScrollView className="flex-1" contentContainerClassName="px-4 pt-2 pb-safe-offset-4 gap-4">
        <View className="flex-row items-center gap-2 rounded-xl bg-warning/15 px-3 py-2.5">
          <Icon sf="exclamationmark.triangle.fill" ion="warning" size={16} color={Palette.warning} />
          <Text className="flex-1 text-[13px] font-semibold text-foreground">AI-generated draft — manager review required</Text>
        </View>

        {loading ? (
          <OpsCard>
            <View className="items-center gap-2 py-6">
              <Spinner />
              <Text className="text-[15px] font-semibold text-foreground">Drafting the brief…</Text>
              <Text className="text-center text-[12px] text-muted">
                Sending the heat alert and today’s ranked buildings to the AI. This usually takes a minute or two.
              </Text>
            </View>
          </OpsCard>
        ) : null}

        {error && !loading ? (
          <OpsCard>
            <View className="flex-row items-start gap-2">
              <Icon sf="xmark.octagon.fill" ion="close-circle" size={18} color={Palette.danger} />
              <View className="flex-1 gap-1">
                <Text className="text-[15px] font-bold text-foreground">The brief couldn’t be generated</Text>
                <Text className="text-[13px] text-muted">{error}</Text>
              </View>
            </View>
            <Button
              variant="secondary"
              onPress={() => {
                pressHaptic();
                regenerate();
              }}
            >
              <Button.Label>Try again</Button.Label>
            </Button>
          </OpsCard>
        ) : null}

        {brief ? (
          <Animated.View key={brief.generated_at} entering={arrive} className={loading || error ? 'opacity-50' : undefined}>
            <OpsCard>
              <View className="gap-0.5">
                <Text className="text-[12px] font-semibold text-muted">
                  {loading || error ? 'Previous brief · ' : ''}Generated {formatAlertTime(brief.generated_at)}
                </Text>
                <Text className="text-[11px] text-muted">
                  {brief.sample ? 'Sample ' : ''}
                  {brief.event} · {brief.model}
                </Text>
              </View>
              <View className="h-px bg-separator" />
              <BriefText text={brief.brief} />
            </OpsCard>
          </Animated.View>
        ) : null}

        {!loading ? (
          <Button
            variant="primary"
            onPress={() => {
              pressHaptic();
              regenerate();
            }}
          >
            <Button.Label>{brief ? 'Regenerate brief' : 'Generate brief'}</Button.Label>
          </Button>
        ) : null}
        <Text className="text-center text-[11px] text-muted">
          Uses only the current heat alert and the server’s ranking. Check every action and source before sharing.
        </Text>
      </ScrollView>
    </View>
  );
}
