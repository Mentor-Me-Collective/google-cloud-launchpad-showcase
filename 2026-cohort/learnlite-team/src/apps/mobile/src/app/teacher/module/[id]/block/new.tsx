import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { AppButton } from '@/components/app-button';
import { Pressable } from '@/components/pressable';
import { ActivityTypeCard } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import type { ActivityType } from '@/features/teacher/types';
import { useCopy } from '@/lib/i18n';

const CONTENT = [
  {
    kind: 'theory' as const,
    title: 'Teoría',
    subtitle: 'Explica un concepto con tarjetas',
    icon: 'book.closed.fill' as const,
    md: 'book' as const,
    tint: '#2F6BFF',
  },
  {
    kind: 'material' as const,
    title: 'Archivo',
    subtitle: 'Sube una guía o documento',
    icon: 'doc.fill' as const,
    md: 'document' as const,
    tint: '#F08A24',
  },
  {
    kind: 'link' as const,
    title: 'Enlace',
    subtitle: 'Comparte un video o sitio web',
    icon: 'link' as const,
    md: 'link' as const,
    tint: '#3FB6E8',
  },
];

const ACTIVITIES: ActivityType[] = [
  'multiple-choice',
  'true-false',
  'match-pairs',
  'order-steps',
  'fill-blanks',
  'classify',
];

export default function NewBlockScreen() {
  const { id, lessonId } = useLocalSearchParams<{ id: string; lessonId: string }>();
  const modules = useTeacherStore((state) => state.modules);
  const copy = useCopy();

  const module = modules.find((item) => item.id === id);
  const lesson = module?.lessons.find((item) => item.id === lessonId);

  if (!module || !lesson) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-5">
        <Text className="text-xl font-black text-foreground">{copy.t('Lesson not found')}</Text>
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const open = (kind: string, type = '') => {
    router.push({
      pathname: '/teacher/module/[id]/block/editor',
      params: { id: module.id, lessonId: lesson.id, kind, type },
    });
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader title={copy.t('Add block')} subtitle={lesson.title} back />

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-8"
        keyboardShouldPersistTaps="handled">
        <View className="flex-row items-center gap-3 rounded-2xl bg-accent/10 p-4">
          <View className="size-10 items-center justify-center rounded-full bg-accent">
            <Icon sf="sparkles" md="sparkles" size={18} color="#FFFFFF" />
          </View>
          <Text className="flex-1 text-sm leading-5 text-foreground">
            {copy.t('Mix short theory with activities to keep attention.')}
          </Text>
        </View>

        <View className="gap-3">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">{copy.t('Content')}</Text>
          {CONTENT.map((item) => (
            <Pressable
              key={item.kind}
              onPress={() => open(item.kind)}
              className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
              <View
                className="size-11 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${item.tint}1F` }}>
                <Icon sf={item.icon} md={item.md} size={22} color={item.tint} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-base font-bold text-foreground">{copy.t(item.title)}</Text>
                <Text className="text-sm text-muted">{copy.t(item.subtitle)}</Text>
              </View>
              <Icon sf="chevron.right" md="chevron-forward" size={18} color="#56648A" />
            </Pressable>
          ))}
        </View>

        <View className="gap-3">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">{copy.t('Activities')}</Text>
          {ACTIVITIES.map((type) => (
            <ActivityTypeCard key={type} type={type} onPress={() => open('activity', type)} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
