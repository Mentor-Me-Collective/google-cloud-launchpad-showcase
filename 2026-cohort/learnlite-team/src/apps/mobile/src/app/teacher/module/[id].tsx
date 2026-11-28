import { router, useLocalSearchParams } from 'expo-router';
import { Input, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';

import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppButton } from '@/components/app-button';
import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import {
  BlockRow,
  ChipSelect,
  EmptyState,
  StatusBadge,
} from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { moduleBlockCount } from '@/features/teacher/utils';
import { useCopy } from '@/lib/i18n';

const SUBJECTS = [
  { value: 'Ciencias Naturales', label: 'Science' },
  { value: 'Matemáticas', label: 'Mathematics' },
  { value: 'Lengua', label: 'Language' },
  { value: 'Historia', label: 'History' },
];

export default function ModuleEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const modules = useTeacherStore((state) => state.modules);
  const updateModule = useTeacherStore((state) => state.updateModule);
  const addLesson = useTeacherStore((state) => state.addLesson);
  const updateLesson = useTeacherStore((state) => state.updateLesson);
  const publishModule = useTeacherStore((state) => state.publishModule);
  const setVisibility = useTeacherStore((state) => state.setVisibility);
  const saveModule = useTeacherStore((state) => state.saveModule);

  const [lessonTitle, setLessonTitle] = useState('');
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);
  const muted = useThemeColor('muted');
  const copy = useCopy();

  const module = modules.find((item) => item.id === id);

  if (!module) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-5">
        <Text className="text-xl font-black text-foreground">{copy.t('Module not found')}</Text>
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const blocks = moduleBlockCount(module);

  const preview = () => {
    const summary = module.lessons
      .map((lesson) => `• ${lesson.title} (${lesson.blocks.length} bloques)`)
      .join('\n');
    setDialog({
      title: module.title,
      message: `${module.lessons.length} ${copy.t('lessons')} · ${blocks} ${copy.t('blocks')}\n\n${summary || copy.t('No lessons yet')}`,
      confirmLabel: copy.t('Ready'),
    });
  };

  const addNewLesson = () => {
    addLesson(module.id, lessonTitle);
    setLessonTitle('');
  };

  const publish = async () => {
    updateModule(module.id, { title: module.title, subject: module.subject });
    if (module.status === 'draft') {
      const published = await publishModule(module.id);
      if (!published) return; // the reason is shown in the banner
      setDialog({
        title: copy.t('Module published'),
        message: copy.t('Your students can see it when you assign it.'),
        confirmLabel: copy.t('Ready'),
      });
    } else {
      await saveModule(module.id);
      setDialog({
        title: copy.t('Changes saved'),
        message: copy.t('The module was updated successfully.'),
        confirmLabel: copy.t('Ready'),
      });
    }
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader
        title={copy.t('Module editor')}
        subtitle={copy.t(module.subject)}
        back
        badge={
          <StatusBadge
            label={copy.t(module.status === 'published' ? 'Live' : 'Draft')}
            tone={module.status === 'published' ? 'success' : 'muted'}
          />
        }
      />

      <View className="flex-1">
        <View className="flex-row gap-2 px-5 pb-3">
          <MiniStat value={`${module.lessons.length}`} label={copy.t('Lessons')} color="#2F6BFF" />
          <MiniStat value={`${blocks}`} label={copy.t('Blocks')} color="#7C5CFF" />
          <MiniStat
            value={`${module.lessons.reduce((n, l) => n + l.blocks.filter((b) => b.kind === 'activity').length, 0)}`}
            label={copy.t('Activities')}
            color="#FF8A1F"
          />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-5 pb-6"
          keyboardShouldPersistTaps="handled">
          <View className="gap-1.5">
              <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Module title')}</Text>
              <Input
                value={module.title}
                onChangeText={(value) => updateModule(module.id, { title: value })}
                placeholder={copy.t('Module title')}
                className="h-14 rounded-[18px] border-2 border-border bg-surface px-4 text-base text-foreground"
              />
            </View>

          <View className="flex-row items-center gap-3 rounded-3xl border-2 border-border px-4 py-3" style={{ borderBottomWidth: 5 }}>
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="font-rounded text-base font-black text-foreground">{copy.t('Share in Community')}</Text>
              <Text className="text-sm font-semibold text-muted">
                {copy.t(module.visibility === 'public' ? 'Any student can find and play this module.' : 'Only students you assign it to can play it.')}
              </Text>
            </View>
            <Switch
              accessibilityLabel={copy.t('Share in Community')}
              value={module.visibility === 'public'}
              onValueChange={(on) => setVisibility(module.id, on ? 'public' : 'private')}
              trackColor={{ true: '#58CC02' }}
            />
          </View>

            <View className="gap-2">
              <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Subject')}</Text>
              <ChipSelect
                options={SUBJECTS.map((option) => ({ ...option, label: copy.t(option.label) }))}
                value={module.subject}
                onChange={(value) => updateModule(module.id, { subject: value })}
              />
            </View>

            <View className="flex-row items-center justify-between px-1">
              <Text className="text-xs font-black uppercase tracking-wide text-muted">
                {copy.t('Lessons and blocks')}
              </Text>
              <Text className="text-xs font-semibold text-muted">
                {module.lessons.length} {copy.t('lessons')}
              </Text>
            </View>

            {module.lessons.length === 0 ? (
              <EmptyState
                title={copy.t('No lessons yet')}
                message={copy.t('Create the first lesson and add theory or activities.')}
                icon={<Icon sf="book.closed" md="book-outline" size={22} color="#2F6BFF" />}
              />
            ) : (
              <View className="gap-3">
                {module.lessons.map((lesson, lessonIndex) => (
                  <View key={lesson.id} className="gap-3 rounded-[26px] border-2 border-border bg-background p-4" style={{ borderBottomWidth: 6 }}>
                    <View className="flex-row items-center gap-3">
                      <RaisedTile face="#2F6BFF" edge="#214FC9" size={44} radius={22} depth={3}>
                        <Text className="font-rounded text-lg font-black text-white">{lessonIndex + 1}</Text>
                      </RaisedTile>
                      <View className="flex-1">
                        <Input
                          value={lesson.title}
                          onChangeText={(value) =>
                            updateLesson(module.id, lesson.id, { title: value })
                          }
                          placeholder={copy.t('Lesson title')}
                          className="h-11 rounded-[18px] border-2 border-border bg-surface px-3 text-base font-bold text-foreground placeholder:text-muted"
                        />
                      </View>
                      <StatusBadge label={`${lesson.blocks.length}`} tone="muted" />
                    </View>

                    <View>
                      {lesson.blocks.map((block) => (
                        <BlockRow
                          key={block.id}
                          block={block}
                          onPress={() =>
                            router.push({
                              pathname: '/teacher/module/[id]/block/editor',
                              params: {
                                id: module.id,
                                lessonId: lesson.id,
                                blockId: block.id,
                                kind: block.kind,
                                type: block.activityType ?? '',
                              },
                            })
                          }
                        />
                      ))}
                    </View>

                    <AppButton
                      label={copy.t('Add block')}
                      variant="secondary"
                      size="md"
                      icon={<Icon sf="plus" md="add" size={16} color="#2F6BFF" />}
                      onPress={() =>
                        router.push({
                          pathname: '/teacher/module/[id]/block/new',
                          params: { id: module.id, lessonId: lesson.id },
                        })
                      }
                    />
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row items-center gap-2">
              <Input
                value={lessonTitle}
                onChangeText={setLessonTitle}
                onSubmitEditing={addNewLesson}
                placeholder={copy.t('New lesson')}
                returnKeyType="done"
                className="h-12 flex-1 rounded-[18px] border-2 border-border bg-surface px-4 text-base text-foreground"
              />
              <AppButton
                label={copy.t('Add lesson')}
                iconOnly
                size="sm"
                icon={<Icon sf="plus" md="add" size={22} color="#FFFFFF" />}
                onPress={addNewLesson}
              />
            </View>

            <View className="flex-row items-center gap-2 px-1 pb-4">
              <Icon sf="info.circle" md="information-circle-outline" size={16} color={muted} />
              <Text className="flex-1 text-xs text-muted">
                {copy.t('Changes are saved automatically.')}
              </Text>
            </View>
        </ScrollView>
      </View>

      <View className="flex-row gap-2 border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton label={copy.t('Preview')} variant="secondary" onPress={preview} className="flex-1" />
        <ChunkyButton
          label={module.status === 'draft' ? copy.t('Publish') : copy.t('Save')}
          onPress={publish}
          uppercase
          colors={module.status === 'draft' ? { face: '#58CC02', edge: '#46A302', label: '#FFFFFF' } : undefined}
          className="flex-1"
        />
      </View>
      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? copy.t('Confirm')}
        notice={!dialog?.onConfirm}
        cancelLabel={copy.t('Cancel')}
        icon="book-check-outline"
        onCancel={() => setDialog(null)}
        onConfirm={() => {
          const action = dialog?.onConfirm;
          setDialog(null);
          action?.();
        }}
      />
    </View>
  );
}

function MiniStat({ value, label, color }: { value: string; label: string; color: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-2xl border-2 border-border py-2.5" style={{ borderBottomWidth: 4 }}>
      <Text className="font-rounded text-xl font-black tabular-nums" style={{ color }}>{value}</Text>
      <Text className="text-[10px] font-black uppercase tracking-wide text-muted">{label}</Text>
    </View>
  );
}
