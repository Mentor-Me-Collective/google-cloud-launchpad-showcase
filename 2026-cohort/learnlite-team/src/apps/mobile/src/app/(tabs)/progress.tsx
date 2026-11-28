import { Switch } from 'heroui-native';
import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { ListRow } from '@/components/list-row';
import { Section } from '@/components/section';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { ProgressBar } from '@/features/learn/components/progress-bar';
import { SyncChip } from '@/features/learn/components/sync-chip';
import { LEARNER_NAME } from '@/features/learn/data/module1';
import { useLearnOverview } from '@/features/learn/hooks/use-learn-overview';
import { useSyncStatus } from '@/features/learn/hooks/use-sync-status';
import { STATUS_LABEL, timeAgo } from '@/features/learn/utils/progress';
import { useCopy } from '@/lib/i18n';

export default function ProgressScreen() {
  const o = useLearnOverview();
  const sync = useSyncStatus();
  const learnerName = useAuthStore((s) => s.name) || LEARNER_NAME;
  const signOut = useAuthStore((s) => s.signOut);
  const copy = useCopy();

  return (
    <View className="flex-1 bg-background">
      <ScrollView className="flex-1" contentContainerClassName="px-5 pt-safe-offset-2 pb-safe-offset-22 gap-6">
      <SyncChip />
      <Text className="text-3xl font-bold text-foreground">{copy.t("{name}'s progress", { name: learnerName })}</Text>

      <Card>
        <View className="gap-4">
          <View className="flex-row items-end gap-3">
            <Text className="text-6xl font-black tabular-nums text-foreground">{o.percent}%</Text>
            <Text className="flex-1 pb-2 text-lg text-muted">{copy.t('of Module 1 done')}</Text>
          </View>
          <ProgressBar percent={o.percent} tone={o.percent === 100 ? 'success' : 'accent'} />
          <View className="flex-row gap-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-2xl font-bold tabular-nums text-foreground">{o.completedCount}</Text>
              <Text className="text-base text-muted">{copy.t('lessons completed')}</Text>
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="text-2xl font-bold tabular-nums text-foreground">{o.inProgressCount}</Text>
              <Text className="text-base text-muted">{copy.t('in progress')}</Text>
            </View>
          </View>
        </View>
      </Card>

      <Section title={copy.t('Lessons')}>
        <Card list>
          {o.rows.map((r) => (
            <ListRow
              key={r.lesson.lesson_id}
              title={`${copy.t('Lesson')} ${r.lesson.number}: ${r.lesson.title}`}
              subtitle={r.completion ? `${copy.t('Completed')} · ${r.completion.score} ${copy.t('of')} ${r.completion.total} ${copy.t('matched')}` : `${copy.t(STATUS_LABEL[r.status])} · ${r.percent}%`}
              onPress={o.downloaded ? () => o.openLesson(r.lesson.lesson_id) : undefined}
            />
          ))}
        </Card>
      </Section>

      <Section title={copy.t('Last learning activity')}>
        <Card>
          <Text className="text-lg text-foreground">
            {o.lastActivity ? `${o.lastActivity.label} · ${timeAgo(o.lastActivity.at, copy.locale)}` : copy.t('Nothing yet. Open a lesson to begin.')}
          </Text>
        </Card>
      </Section>

      <Section title={copy.t('Saved on this phone')}>
        <Card list>
          <ListRow title={copy.t('Answers saved')} right={<Text className="text-base font-semibold tabular-nums text-foreground">{o.answers.length}</Text>} />
          <ListRow title={copy.t('Answered while offline')} right={<Text className="text-base font-semibold tabular-nums text-foreground">{o.offlineAnswers}</Text>} />
          <ListRow title={copy.t('Records not yet uploaded')} right={<Text className="text-base font-semibold tabular-nums text-foreground">{sync.unsent}</Text>} />
          <ListRow
            title={copy.t('Module downloaded')}
            right={<Text className="text-base text-muted">{o.downloadedAt ? timeAgo(o.downloadedAt, copy.locale) : copy.t('Not yet')}</Text>}
          />
        </Card>
        <Text className="px-1 text-sm text-muted">{copy.t('Online saving is not switched on yet, so nothing has been uploaded.')}</Text>
      </Section>

      <Section title={copy.t('Testing')}>
        <Card list>
          <View className="flex-row items-center gap-3 py-3">
            <View className="flex-1 gap-0.5">
              <Text className="text-base text-foreground">{copy.t('Test offline mode')}</Text>
              <Text className="text-sm text-muted">{copy.t('Acts as if there is no internet, even when there is.')}</Text>
            </View>
            <Switch isSelected={o.simulateOffline} onSelectedChange={o.setSimulateOffline} />
          </View>
          <ListRow title={copy.t('Reset {name} progress', { name: learnerName })} onPress={o.resetProgress} />
          <ListRow
            title={copy.t('Sign out')}
            onPress={() => {
              signOut();
              router.replace('/login');
            }}
          />
        </Card>
      </Section>
      </ScrollView>
      <ConfirmDialog
        visible={o.confirmAction !== null}
        title={copy.t("Reset Amara's progress?")}
        message={copy.t('All answers and completed lessons on this phone are cleared.')}
        confirmLabel={copy.t('Reset')}
        cancelLabel={copy.t('Cancel')}
        danger
        onConfirm={o.confirmPendingAction}
        onCancel={o.cancelConfirm}
        icon="refresh"
      />
    </View>
  );
}
