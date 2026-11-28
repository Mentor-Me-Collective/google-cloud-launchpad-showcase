import { useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Card } from '@/components/card';
import { AppButton } from '@/components/app-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { Pressable } from '@/components/pressable';
import { Icon } from '@/components/icon';
import { ProgressBar } from '@/features/learn/components/progress-bar';
import { SyncChip } from '@/features/learn/components/sync-chip';
import { LOCKED_LESSONS, MODULE_MINUTES, MODULE_SUBTITLE, MODULE_TITLE } from '@/features/learn/data/module1';
import { useLearnOverview } from '@/features/learn/hooks/use-learn-overview';
import { STATUS_LABEL } from '@/features/learn/utils/progress';
import { fadeIn } from '@/lib/motion';
import { useCopy } from '@/lib/i18n';

export default function ModuleScreen() {
  const o = useLearnOverview();
  const success = useThemeColor('success');
  const accent = useThemeColor('accent');
  const muted = useThemeColor('muted');
  const copy = useCopy();
  const [expandedLessonId, setExpandedLessonId] = useState<string | null>(null);

  const available = o.rows.map((r) => ({ kind: 'open' as const, number: r.lesson.number, row: r }));
  const locked = LOCKED_LESSONS.map((l) => ({ kind: 'locked' as const, number: l.number, locked: l }));
  const all = [...available, ...locked].sort((a, b) => a.number - b.number);

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6">
      <SyncChip />
      <View className="gap-2">
        <Text className="text-sm font-bold uppercase tracking-wide text-accent">{copy.t('Module 1 · about {minutes} min', { minutes: MODULE_MINUTES })}</Text>
        <Text className="text-3xl font-bold text-foreground">{MODULE_TITLE}</Text>
        <Text className="text-lg text-muted">{MODULE_SUBTITLE}</Text>
      </View>

      {o.downloaded ? (
        <Animated.View entering={fadeIn} className="flex-row items-center gap-3 rounded-2xl bg-success/15 p-4">
          <Icon sf="checkmark.icloud.fill" md="cloud-done" size={26} color={success} />
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-bold text-foreground">{copy.t('Saved for offline')}</Text>
            <Text className="text-base text-muted">{copy.t('Lessons 1 and 4 open with no internet.')}</Text>
          </View>
          <AppButton label={copy.t('Remove')} size="sm" variant="secondary" onPress={o.removeDownload} />
        </Animated.View>
      ) : (
        <View className="gap-3">
          <AppButton label={copy.t('Download Module 1')} size="lg" onPress={o.download} />
          <Text className="text-center text-base text-muted">{copy.t('Saves Lessons 1 and 4 on this phone. About 30 KB.')}</Text>
        </View>
      )}

      <View className="gap-3">
        {all.map((entry) => {
          if (entry.kind === 'locked') {
            return (
              <View key={`locked-${entry.number}`} className="flex-row items-center gap-4 rounded-3xl border border-dashed border-border p-4">
                <Text className="w-8 text-center text-2xl font-black tabular-nums text-muted">{entry.number}</Text>
                <View className="flex-1 gap-0.5">
                  <Text className="text-lg font-semibold text-muted">{entry.locked.title}</Text>
                  <Text className="text-base text-muted">{copy.t('Coming soon')}</Text>
                </View>
                <Icon sf="lock.fill" md="lock-closed" size={18} color={muted} />
              </View>
            );
          }
          const { lesson, status, percent, completion } = entry.row;
          const statusColor = status === 'completed' ? success : status === 'not-downloaded' ? muted : accent;
          const isExpanded = expandedLessonId === lesson.lesson_id;
          return (
            <Card key={lesson.lesson_id}>
              <View className="flex-row items-center gap-3">
                <Pressable
                  onPress={() => setExpandedLessonId(isExpanded ? null : lesson.lesson_id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${isExpanded ? copy.t('Collapse') : copy.t('Expand')} ${lesson.title}`}
                  className="min-w-0 flex-1">
                  <View className="flex-row items-center gap-3">
                    <Text className="w-8 text-center text-2xl font-black tabular-nums text-accent">{lesson.number}</Text>
                    <View className="min-w-0 flex-1">
                      <Text className="text-xl font-bold text-foreground" numberOfLines={1}>{lesson.title}</Text>
                      <Text className="text-sm text-muted">{lesson.items.length} {copy.t('content blocks')}</Text>
                    </View>
                    <Icon sf={isExpanded ? 'chevron.up' : 'chevron.down'} md={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={muted} />
                  </View>
                </Pressable>
                {o.downloaded ? <AppButton label={copy.t('Start lesson')} size="sm" onPress={() => o.openLesson(lesson.lesson_id)} /> : null}
              </View>
              {isExpanded ? (
                <View className="mt-3 gap-3 border-t border-border pt-3">
                  <Text className="text-base leading-6 text-muted">{lesson.objective}</Text>
                  <View className="flex-row items-center gap-2">
                    <Icon
                      sf={status === 'completed' ? 'checkmark.circle.fill' : status === 'not-downloaded' ? 'arrow.down.circle' : 'iphone'}
                      md={status === 'completed' ? 'checkmark-circle' : status === 'not-downloaded' ? 'download-outline' : 'phone-portrait-outline'}
                      size={16}
                      color={statusColor}
                    />
                    <Text className="flex-1 text-base font-semibold text-foreground">
                      {o.downloaded ? copy.t(STATUS_LABEL[status]) : copy.t('Download to open')}
                      {completion ? ` · ${completion.score}/${completion.total}` : ''}
                    </Text>
                    <Text className="text-base text-muted">{lesson.minutes} min</Text>
                  </View>
                  {status === 'in-progress' ? <ProgressBar percent={percent} /> : null}
                </View>
              ) : null}
            </Card>
          );
        })}
      </View>
      </ScrollView>
      <ConfirmDialog
        visible={o.confirmAction !== null}
        title={o.confirmAction === 'reset' ? copy.t("Reset Amara's progress?") : copy.t('Remove Module 1 from this phone?')}
        message={o.confirmAction === 'reset' ? copy.t('All answers and completed lessons on this phone are cleared.') : copy.t("Lessons will need downloading again. Amara's progress is kept.")}
        confirmLabel={o.confirmAction === 'reset' ? copy.t('Reset') : copy.t('Remove')}
        cancelLabel={copy.t('Cancel')}
        danger={o.confirmAction !== 'reset'}
        onConfirm={o.confirmPendingAction}
        onCancel={o.cancelConfirm}
        icon={o.confirmAction === 'reset' ? 'refresh' : 'trash-can-outline'}
      />
    </View>
  );
}
