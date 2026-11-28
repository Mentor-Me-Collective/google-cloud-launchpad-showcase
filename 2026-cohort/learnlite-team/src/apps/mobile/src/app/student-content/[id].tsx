import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { Card } from '@/components/card';
import { PlayfulIcon } from '@/components/icon';
import { useStudentStore } from '@/features/student/store/student-store';
import { useCopy } from '@/lib/i18n';

export default function StudentContentScreen() {
  const { id, moduleId } = useLocalSearchParams<{ id: string; moduleId: string }>();
  const onlineModule = useStudentStore((state) => state.modules.find((item) => item.id === moduleId));
  const cachedModule = useStudentStore((state) => state.downloadedModules.find((item) => item.id === moduleId));
  const module = cachedModule ?? onlineModule;
  const block = module?.lessons.flatMap((lesson) => lesson.blocks).find((item) => item.id === id);
  const copy = useCopy();

  if (!module || !block || block.kind === 'activity') return <Redirect href={moduleId ? `/student-module/${moduleId}` : '/student-classes'} />;

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-8 pt-safe-offset-3">
      <View className="flex-row items-center gap-3">
        <AppButton
          label={copy.t('Back')}
          iconOnly
          flat
          size="sm"
          variant="secondary"
          icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
          onPress={() => router.back()}
        />
        <View className="min-w-0 flex-1"><Text className="text-sm font-black uppercase tracking-wide text-accent">{copy.t(block.kind === 'material' ? 'Material' : 'Theory')}</Text><Text className="text-xl font-black text-foreground" numberOfLines={1}>{block.title}</Text></View>
      </View>

      <Card>
        {block.kind === 'theory' ? (
          <View className="gap-4">
            <Text className="font-rounded text-3xl font-black text-foreground">{block.title}</Text>
            <Text className="text-lg leading-8 text-foreground">{block.body ?? copy.t('There is no text in this material yet.')}</Text>
            {block.lumiComment ? <View className="rounded-2xl border-2 border-border bg-surface p-4"><Text className="text-base text-muted">{block.lumiComment}</Text></View> : null}
          </View>
        ) : (
          <View className="items-center gap-4 py-5">
            <View className="size-20 items-center justify-center rounded-3xl bg-surface"><PlayfulIcon name="bookshelf" size={40} color="#F08A24" /></View>
            <Text className="text-center text-2xl font-black text-foreground">{block.fileName ?? block.title}</Text>
            <Text className="text-center text-base text-muted">{block.fileSize ?? copy.t('Saved inside this module for offline study.')}</Text>
            <AppButton label={copy.t('Saved for offline')} variant="secondary" onPress={() => undefined} />
          </View>
        )}
      </Card>
    </ScrollView>
  );
}
