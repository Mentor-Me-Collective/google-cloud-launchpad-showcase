import { Redirect, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { SparkIcon } from '@/components/game/game-icons';
import { Appear, SpeechBubble } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Lumi } from '@/components/lumi/lumi';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { useStudentStore } from '@/features/student/store/student-store';
import type { TeacherModule } from '@/features/teacher/types';
import { useCopy } from '@/lib/i18n';

function sizeLabel(module: TeacherModule) {
  const kb = JSON.stringify(module).length / 1024;
  return kb < 1024 ? `${Math.max(1, Math.round(kb))} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** The modules saved on this phone: what works without internet, and a way to free the space. */
export default function StudentDownloadsScreen() {
  const copy = useCopy();
  const authenticated = useAuthStore((state) => state.authenticated);
  const saved = useStudentStore((state) => state.downloadedModules);
  const pending = useStudentStore((state) => state.pendingRuns.length);
  const remove = useStudentStore((state) => state.removeModule);
  const syncOfflineRuns = useStudentStore((state) => state.syncOfflineRuns);
  const [asking, setAsking] = useState<TeacherModule | null>(null);
  const totalLessons = useMemo(() => saved.reduce((sum, module) => sum + module.lessons.length, 0), [saved]);

  if (!authenticated) return <Redirect href="/login" />;

  const line =
    saved.length === 0
      ? copy.t('Nothing saved yet. Open a module and tap the shelf button to study it without internet.')
      : copy.t('These modules work without internet. Your answers are sent when you are back online.');

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-4 px-5 pb-safe-offset-8 pt-safe-offset-3">
      <Appear index={0} className="flex-row items-center gap-3">
        <AppButton
          label={copy.t('Back')}
          iconOnly
          flat
          size="sm"
          variant="secondary"
          icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/student-profile'))}
        />
        <View className="flex-1">
          <Text className="font-rounded text-3xl font-black text-foreground">{copy.t('Offline modules')}</Text>
          <Text className="text-sm font-bold text-muted">
            {copy.t('{count} modules · {lessons} lessons', { count: saved.length, lessons: totalLessons })}
          </Text>
        </View>
      </Appear>

      <Appear index={1} className="flex-row items-center gap-1">
        <Lumi size={84} mood="happy" />
        <View className="flex-1 pl-2">
          <SpeechBubble text={line} />
        </View>
      </Appear>

      {pending > 0 ? (
        <Appear index={2}>
          <View className="flex-row items-center gap-3 rounded-2xl border-2 border-warning/60 bg-warning/10 px-4 py-3">
            <PlayfulIcon name="cloud-download-outline" size={22} color="#E58A32" />
            <Text className="flex-1 text-sm font-bold text-foreground">
              {pending === 1
                ? copy.t('1 finished lesson is waiting for internet to be sent.')
                : copy.t('{count} finished lessons are waiting for internet to be sent.', { count: pending })}
            </Text>
            <AppButton label={copy.t('Send now')} size="sm" variant="secondary" onPress={() => void syncOfflineRuns()} />
          </View>
        </Appear>
      ) : null}

      {saved.map((module, index) => (
        <Appear key={module.id} index={3 + index}>
          <View className="gap-3 rounded-3xl border-2 border-border p-4" style={{ borderBottomWidth: 6 }}>
            <View className="flex-row items-center gap-3">
              <View className="size-12 items-center justify-center rounded-2xl bg-accent">
                <SparkIcon size={26} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="font-rounded text-lg font-black leading-6 text-foreground" numberOfLines={2}>
                  {module.title}
                </Text>
                <Text className="text-sm font-bold text-muted" numberOfLines={1}>
                  {copy.t(module.subject)} · {module.lessons.length === 1 ? copy.t('1 lesson') : copy.t('{count} lessons', { count: module.lessons.length })} · {sizeLabel(module)}
                </Text>
              </View>
            </View>
            <View className="flex-row gap-2">
              <View className="flex-1">
                <AppButton
                  label={copy.t('Open')}
                  size="md"
                  onPress={() => router.push({ pathname: '/student-module/[id]', params: { id: module.id } })}
                />
              </View>
              <View className="flex-1">
                <AppButton
                  label={copy.t('Remove')}
                  size="md"
                  variant="secondary"
                  icon={<PlayfulIcon name="trash-can-outline" size={18} color="#E58A32" />}
                  onPress={() => setAsking(module)}
                />
              </View>
            </View>
          </View>
        </Appear>
      ))}

      <ConfirmDialog
        visible={asking !== null}
        danger
        icon="trash-can-outline"
        title={copy.t('Remove from this phone?')}
        message={copy.t('"{title}" will no longer work without internet. Your progress stays safe.', { title: asking?.title ?? '' })}
        confirmLabel={copy.t('Remove')}
        cancelLabel={copy.t('Keep it')}
        onCancel={() => setAsking(null)}
        onConfirm={() => {
          if (asking) remove(asking.id);
          setAsking(null);
        }}
      />
    </ScrollView>
  );
}
