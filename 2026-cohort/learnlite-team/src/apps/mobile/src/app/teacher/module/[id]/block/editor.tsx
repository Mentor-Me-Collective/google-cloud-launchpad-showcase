import { router, useLocalSearchParams } from 'expo-router';
import { Input, Switch, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppButton } from '@/components/app-button';
import { Pressable } from '@/components/pressable';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { FormField } from '@/features/teacher/components/form-field';
import { StatusBadge } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import {
  ACTIVITY_META,
  BLOCK_KIND_LABEL,
  type ActivityType,
  type Block,
  type BlockKind,
} from '@/features/teacher/types';
import { blockLabel, emptyBlock } from '@/features/teacher/utils';
import { useCopy } from '@/lib/i18n';

const CONTENT_META = {
  theory: {
    label: 'Teoría',
    short: 'Tarjeta de contenido',
    icon: 'book.closed.fill',
    md: 'book',
    tint: '#2F6BFF',
  },
  material: {
    label: 'Archivo',
    short: 'Documento de apoyo',
    icon: 'doc.fill',
    md: 'document',
    tint: '#F08A24',
  },
  link: {
    label: 'Enlace',
    short: 'Video o sitio web',
    icon: 'link',
    md: 'link',
    tint: '#3FB6E8',
  },
} as const;

export default function BlockEditorScreen() {
  const params = useLocalSearchParams<{
    id: string;
    lessonId: string;
    blockId?: string;
    kind?: string;
    type?: string;
  }>();
  const modules = useTeacherStore((state) => state.modules);
  const addBlock = useTeacherStore((state) => state.addBlock);
  const updateBlock = useTeacherStore((state) => state.updateBlock);
  const removeBlock = useTeacherStore((state) => state.removeBlock);

  const module = modules.find((item) => item.id === params.id);
  const lesson = module?.lessons.find((item) => item.id === params.lessonId);
  const existing = lesson?.blocks.find((block) => block.id === params.blockId);

  const kindValue: BlockKind =
    params.kind === 'material' || params.kind === 'link' || params.kind === 'activity'
      ? params.kind
      : 'theory';
  const typeValue =
    params.type && params.type in ACTIVITY_META ? (params.type as ActivityType) : undefined;

  const [draft, setDraft] = useState<Block>(
    () => existing ?? emptyBlock(kindValue, typeValue),
  );
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm?: () => void;
  } | null>(null);
  const muted = useThemeColor('muted');
  const copy = useCopy();

  if (!module || !lesson) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-5">
        <Text className="text-xl font-black text-foreground">{copy.t('Block not found')}</Text>
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const update = (patch: Partial<Block>) => setDraft((current) => ({ ...current, ...patch }));

  const meta =
    draft.kind === 'activity' && draft.activityType
      ? ACTIVITY_META[draft.activityType]
      : CONTENT_META[draft.kind as 'theory' | 'material' | 'link'];

  const options = draft.options ?? [];
  const answers = draft.answers ?? [];
  const pairs = draft.pairs ?? [];
  const steps = draft.steps ?? [];
  const categories = draft.categories ?? [];

  const answerSummary = () => {
    if (draft.kind !== 'activity') return draft.body || draft.fileName || draft.url || '';
    switch (draft.activityType) {
      case 'multiple-choice':
        return `${copy.t('Correct answer')}: ${options[draft.correctIndex ?? 0] || copy.t('Undefined')}`;
      case 'true-false':
        return `${copy.t('Correct answer')}: ${draft.correctBool ? copy.t('True') : copy.t('False')}`;
      case 'match-pairs':
        return pairs.map((pair) => `${pair.left} → ${pair.right}`).join('\n');
      case 'order-steps':
        return steps.map((step, index) => `${index + 1}. ${step}`).join('\n');
      case 'fill-blanks':
        return `${copy.t('Answers')}: ${answers.filter(Boolean).join(', ') || copy.t('Undefined')}`;
      case 'classify':
        return categories
          .map((category) => `${category.name}: ${category.items.join(', ')}`)
          .join('\n');
      default:
        return '';
    }
  };

  const preview = () => {
    setDialog({
        title: draft.title || copy.t('Preview'),
      message: `${draft.prompt || draft.body || draft.fileName || draft.url || copy.t('No content yet.')}\n\n${answerSummary()}`,
      confirmLabel: copy.t('Ready'),
    });
  };

  const save = () => {
    if (params.blockId) {
      updateBlock(module.id, lesson.id, params.blockId, draft);
    } else {
      addBlock(module.id, lesson.id, draft);
    }
    setDialog({
      title: params.blockId ? copy.t('Block updated') : copy.t('Block added'),
      message: copy.t('Changes saved on this device.'),
      confirmLabel: copy.t('Ready'),
      onConfirm: () => router.back(),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader
        title={params.blockId ? copy.t('Edit block') : copy.t('New block')}
        subtitle={`${module.title} · ${lesson.title}`}
        back
        badge={<StatusBadge label={blockLabel(draft)} tone="accent" />}
        right={
          params.blockId ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy.t('Delete block')}
              onPress={() =>
                setDialog({
                  title: copy.t('Delete block'),
                  message: copy.t('Do you want to delete this block? This action cannot be undone.'),
                  confirmLabel: copy.t('Delete'),
                  danger: true,
                  onConfirm: () => {
                    removeBlock(module.id, lesson.id, params.blockId!);
                    router.back();
                  },
                })
              }
              className="size-11 items-center justify-center rounded-full bg-warning/15">
              <Icon sf="trash" md="trash-outline" size={18} color="#F08A24" />
            </Pressable>
          ) : undefined
        }
      />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View
          className="flex-row items-center gap-3 rounded-2xl p-4"
          style={{ backgroundColor: `${meta.tint}1F` }}>
          <View
            className="size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: meta.tint }}>
            <Icon sf={meta.icon} md={meta.md} size={22} color="#FFFFFF" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-black text-foreground">{copy.t(meta.label)}</Text>
            <Text className="text-sm text-muted">
              {'short' in meta ? copy.t(meta.short) : copy.t(BLOCK_KIND_LABEL[draft.kind])}
            </Text>
          </View>
        </View>

        <FormField
          label={copy.t('Title')}
          value={draft.title}
          onChangeText={(value) => update({ title: value })}
          placeholder={copy.t('Short, clear title')}
        />

        {draft.kind === 'theory' ? (
          <>
            <FormField
              label={copy.t('Card text')}
              value={draft.body ?? ''}
              onChangeText={(value) => update({ body: value })}
              placeholder={copy.t('Explain the concept in your own words')}
              multiline
              className="h-40 py-3"
            />
            <UploadBox
              label={copy.t('Card image')}
              value={draft.imageDescription ?? ''}
              onPress={() => update({ imageDescription: copy.t('Supporting illustration') })}
              onRemove={() => update({ imageDescription: '' })}
            />
            <FormField
              label={copy.t('Image description')}
              value={draft.imageDescription ?? ''}
              onChangeText={(value) => update({ imageDescription: value })}
              placeholder={copy.t('Describe what is shown in the image')}
            />
            <FormField
              label={copy.t('Lumi comment')}
              value={draft.lumiComment ?? ''}
              onChangeText={(value) => update({ lumiComment: value })}
              placeholder={copy.t('A friendly hint for your students')}
            />
            <ToggleRow
              label={copy.t('Attach as support')}
              description={copy.t('Students can open it while answering.')}
              value={Boolean(draft.attachAsSupport)}
              onChange={(value) => update({ attachAsSupport: value })}
            />
          </>
        ) : null}

        {draft.kind === 'material' ? (
          <UploadBox
            label={copy.t('Support file')}
            value={draft.fileName ?? ''}
            onPress={() => update({ fileName: 'Guia-de-apoyo.pdf', fileSize: '1.2 MB' })}
            onRemove={() => update({ fileName: '', fileSize: '' })}
          />
        ) : null}

        {draft.kind === 'link' ? (
          <>
            <FormField
              label="URL"
              value={draft.url ?? ''}
              onChangeText={(value) => update({ url: value })}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
            />
            <FormField
              label={copy.t('Description')}
              value={draft.body ?? ''}
              onChangeText={(value) => update({ body: value })}
              placeholder={copy.t('What will the student find?')}
              multiline
              className="h-24 py-3"
            />
          </>
        ) : null}

        {draft.kind === 'activity' ? (
          <>
            <FormField
              label={copy.t('Prompt')}
              value={draft.instruction ?? ''}
              onChangeText={(value) => update({ instruction: value })}
              placeholder={copy.t('Read the question and choose the correct answer.')}
              multiline
              className="h-20 py-3"
            />
            <FormField
              label={draft.activityType === 'fill-blanks' ? copy.t('Text with blanks') : copy.t('Question or statement')}
              value={draft.prompt ?? ''}
              onChangeText={(value) => update({ prompt: value })}
              placeholder={
                draft.activityType === 'fill-blanks'
                  ? copy.t('Write the sentence and use ___ for the blank.')
                  : copy.t('Write the question the student will see')
              }
              multiline
              className="h-24 py-3"
            />

            {draft.activityType === 'multiple-choice' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Options')}</Text>
                {options.map((option, index) => (
                  <View key={`option-${index}`} className="flex-row items-center gap-2">
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={copy.t('Mark option {n} as correct', { n: index + 1 })}
                      onPress={() => update({ correctIndex: index })}
                      className={`size-8 items-center justify-center rounded-full border-2 ${
                        index === (draft.correctIndex ?? 0)
                          ? 'border-success bg-success'
                          : 'border-border bg-surface'
                      }`}>
                      {index === (draft.correctIndex ?? 0) ? (
                        <Icon sf="checkmark" md="checkmark" size={14} color="#FFFFFF" />
                      ) : null}
                    </Pressable>
                    <Input
                      value={option}
                      onChangeText={(value) => {
                        const next = [...options];
                        next[index] = value;
                        update({ options: next });
                      }}
                      placeholder={copy.t('Option {n}', { n: index + 1 })}
                      className="h-12 flex-1 rounded-[18px] border-2 border-border bg-surface px-3 text-base text-foreground"
                    />
                    {options.length > 2 ? (
                      <RemoveButton
                        onPress={() => {
                          const next = options.filter((_, itemIndex) => itemIndex !== index);
                          update({
                            options: next,
                            correctIndex: Math.min(draft.correctIndex ?? 0, next.length - 1),
                          });
                        }}
                      />
                    ) : null}
                  </View>
                ))}
                <AddButton
                  label={copy.t('Add option')}
                  onPress={() => update({ options: [...options, ''] })}
                />
              </View>
            ) : null}

            {draft.activityType === 'true-false' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Correct answer')}</Text>
                <View className="flex-row gap-2">
                  <TruthCard
                    label={copy.t('True')}
                    tint="#2ECC71"
                    icon="checkmark.circle.fill"
                    md="checkmark-circle"
                    selected={draft.correctBool !== false}
                    onPress={() => update({ correctBool: true })}
                  />
                  <TruthCard
                    label={copy.t('False')}
                    tint="#F08A24"
                    icon="xmark.circle.fill"
                    md="close-circle"
                    selected={draft.correctBool === false}
                    onPress={() => update({ correctBool: false })}
                  />
                </View>
              </View>
            ) : null}

            {draft.activityType === 'match-pairs' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Pairs')}</Text>
                {pairs.map((pair, index) => (
                  <View key={`pair-${index}`} className="flex-row items-center gap-2">
                    <View className="min-w-0 flex-1">
                      <Input
                        value={pair.left}
                        onChangeText={(value) => {
                          const next = pairs.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, left: value } : item,
                          );
                          update({ pairs: next });
                        }}
                        placeholder={copy.t('Concept')}
                        className="h-12 w-full rounded-[18px] border-2 border-border bg-surface px-3 text-base text-foreground"
                      />
                    </View>
                    <Icon sf="arrow.right" md="arrow-forward" size={16} color={muted} />
                    <View className="min-w-0 flex-1">
                      <Input
                        value={pair.right}
                        onChangeText={(value) => {
                          const next = pairs.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, right: value } : item,
                          );
                          update({ pairs: next });
                        }}
                        placeholder={copy.t('Pair')}
                        className="h-12 w-full rounded-[18px] border-2 border-border bg-surface px-3 text-base text-foreground"
                      />
                    </View>
                    {pairs.length > 2 ? (
                      <RemoveButton
                        onPress={() =>
                          update({ pairs: pairs.filter((_, itemIndex) => itemIndex !== index) })
                        }
                      />
                    ) : null}
                  </View>
                ))}
                <AddButton
                  label={copy.t('Add pair')}
                  onPress={() => update({ pairs: [...pairs, { left: '', right: '' }] })}
                />
              </View>
            ) : null}

            {draft.activityType === 'order-steps' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Steps in order')}</Text>
                {steps.map((step, index) => (
                  <View key={`step-${index}`} className="flex-row items-center gap-2">
                    <View className="size-7 items-center justify-center rounded-full bg-accent/12">
                      <Text className="text-xs font-black text-accent">{index + 1}</Text>
                    </View>
                    <Input
                      value={step}
                      onChangeText={(value) => {
                        const next = [...steps];
                        next[index] = value;
                        update({ steps: next });
                      }}
                      placeholder={`Paso ${index + 1}`}
                      className="h-12 flex-1 rounded-[18px] border-2 border-border bg-surface px-3 text-base text-foreground"
                    />
                    <IconButton
                      icon="chevron.up"
                      md="chevron-up"
                      disabled={index === 0}
                      onPress={() => {
                        const next = [...steps];
                        [next[index - 1], next[index]] = [next[index], next[index - 1]];
                        update({ steps: next });
                      }}
                    />
                    <IconButton
                      icon="chevron.down"
                      md="chevron-down"
                      disabled={index === steps.length - 1}
                      onPress={() => {
                        const next = [...steps];
                        [next[index + 1], next[index]] = [next[index], next[index + 1]];
                        update({ steps: next });
                      }}
                    />
                    {steps.length > 2 ? (
                      <RemoveButton
                        onPress={() =>
                          update({ steps: steps.filter((_, itemIndex) => itemIndex !== index) })
                        }
                      />
                    ) : null}
                  </View>
                ))}
                <AddButton
                  label={copy.t('Add step')}
                  onPress={() => update({ steps: [...steps, ''] })}
                />
              </View>
            ) : null}

            {draft.activityType === 'fill-blanks' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Correct answers')}</Text>
                {answers.map((answer, index) => (
                  <View key={`answer-${index}`} className="flex-row items-center gap-2">
                    <Input
                      value={answer}
                      onChangeText={(value) => {
                        const next = [...answers];
                        next[index] = value;
                        update({ answers: next });
                      }}
                      placeholder={`Respuesta ${index + 1}`}
                      className="h-12 flex-1 rounded-[18px] border-2 border-border bg-surface px-3 text-base text-foreground"
                    />
                    {answers.length > 1 ? (
                      <RemoveButton
                        onPress={() =>
                          update({ answers: answers.filter((_, itemIndex) => itemIndex !== index) })
                        }
                      />
                    ) : null}
                  </View>
                ))}
                <AddButton
                  label={copy.t('Add answer')}
                  onPress={() => update({ answers: [...answers, ''] })}
                />
              </View>
            ) : null}

            {draft.activityType === 'classify' ? (
              <View className="gap-2">
                <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Categories')}</Text>
                {categories.map((category, index) => (
                  <View key={`category-${index}`} className="gap-2 rounded-2xl bg-surface p-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-xs font-bold uppercase tracking-wide text-muted">
                        {copy.t('Category')} {index + 1}
                      </Text>
                      {categories.length > 2 ? (
                        <RemoveButton
                          onPress={() =>
                            update({
                              categories: categories.filter((_, itemIndex) => itemIndex !== index),
                            })
                          }
                        />
                      ) : null}
                    </View>
                    <Input
                      value={category.name}
                      onChangeText={(value) => {
                        const next = categories.map((item, itemIndex) =>
                          itemIndex === index ? { ...item, name: value } : item,
                        );
                        update({ categories: next });
                      }}
                      placeholder={copy.t('Category name')}
                      className="h-12 rounded-[18px] border-2 border-border bg-background px-3 text-base text-foreground"
                    />
                    <Input
                      value={category.items.join(', ')}
                      onChangeText={(value) => {
                        const next = categories.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                items: value
                                  .split(',')
                                  .map((entry) => entry.trim())
                                  .filter(Boolean),
                              }
                            : item,
                        );
                        update({ categories: next });
                      }}
                      placeholder={copy.t('Items separated by comma')}
                      className="h-12 rounded-[18px] border-2 border-border bg-background px-3 text-base text-foreground"
                    />
                  </View>
                ))}
                <AddButton
                  label={copy.t('Add category')}
                  onPress={() =>
                    update({ categories: [...categories, { name: '', items: [] }] })
                  }
                />
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <View className="flex-1">
                <FormField
                  label="XP"
                  value={String(draft.xp ?? 10)}
                  onChangeText={(value) => update({ xp: Number(value) || 0 })}
                  keyboardType="number-pad"
                />
              </View>
              <View className="flex-1">
                <FormField
                  label={copy.t('Hint')}
                  value={draft.hint ?? ''}
                  onChangeText={(value) => update({ hint: value })}
                  placeholder={copy.t('Optional')}
                />
              </View>
            </View>

            <FormField
              label={copy.t('Answer explanation')}
              value={draft.explanation ?? ''}
              onChangeText={(value) => update({ explanation: value })}
              placeholder={copy.t('Reinforce learning after answering')}
              multiline
              className="h-20 py-3"
            />
          </>
        ) : null}

        <View className="flex-row items-center gap-2 px-1">
          <Icon sf="info.circle" md="information-circle-outline" size={16} color={muted} />
          <Text className="flex-1 text-xs text-muted">
            {copy.t('You can edit this block anytime from the module.')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View className="flex-row gap-2 border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton label={copy.t('Preview')} variant="secondary" onPress={preview} className="flex-1" />
        <ChunkyButton label={copy.t('Save')} onPress={save} className="flex-1" />
      </View>
      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? copy.t('Confirm')}
        notice={!dialog?.onConfirm}
        cancelLabel={copy.t('Cancel')}
        danger={dialog?.danger}
        icon={dialog?.danger ? 'trash-can-outline' : 'lightbulb-on-outline'}
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

function UploadBox({
  label,
  value,
  onPress,
  onRemove,
}: {
  label: string;
  value: string;
  onPress: () => void;
  onRemove: () => void;
}) {
  const copy = useCopy();
  return (
    <View className="gap-2">
      <Text className="px-1 text-sm font-bold text-foreground">{label}</Text>
      {value ? (
        <View className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
          <View className="size-10 items-center justify-center rounded-xl bg-success/15">
            <Icon sf="doc.fill" md="document" size={20} color="#2ECC71" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
              {value}
            </Text>
            <Text className="text-xs text-muted">{copy.t('Ready for your students')}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={copy.t('Remove file')}
            onPress={onRemove}
            className="size-9 items-center justify-center rounded-full bg-warning/15">
            <Icon sf="trash" md="trash-outline" size={15} color="#F08A24" />
          </Pressable>
        </View>
      ) : (
        <Pressable
          onPress={onPress}
          className="items-center gap-2 rounded-2xl border border-dashed border-accent/60 bg-accent/10 px-5 py-6">
          <View className="size-11 items-center justify-center rounded-full bg-accent/12">
            <Icon sf="square.and.arrow.up" md="cloud-upload-outline" size={20} color="#2F6BFF" />
          </View>
          <Text className="text-sm font-bold text-foreground">{copy.t('Tap to upload')}</Text>
          <Text className="text-center text-xs text-muted">
            {copy.t('PDF, image or presentation. It is saved on this device.')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4">
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-foreground">{label}</Text>
        <Text className="text-sm text-muted">{description}</Text>
      </View>
      <Switch isSelected={value} onSelectedChange={onChange} />
    </View>
  );
}

function TruthCard({
  label,
  tint,
  icon,
  md,
  selected,
  onPress,
}: {
  label: string;
  tint: string;
  icon: 'checkmark.circle.fill' | 'xmark.circle.fill';
  md: 'checkmark-circle' | 'close-circle';
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <AppButton
      label={label}
      variant={selected ? 'success' : 'secondary'}
      size="lg"
      className="flex-1"
      icon={<Icon sf={icon} md={md} size={28} color={selected ? '#06341B' : tint} />}
      onPress={onPress}
    />
  );
}

function AddButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <AppButton
      label={label}
      variant="secondary"
      size="sm"
      icon={<Icon sf="plus" md="add" size={16} color="#2F6BFF" />}
      onPress={onPress}
    />
  );
}

function RemoveButton({ onPress }: { onPress: () => void }) {
  const copy = useCopy();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.t('Delete')}
      onPress={onPress}
      className="size-9 items-center justify-center rounded-full bg-warning/15">
      <Icon sf="trash" md="trash-outline" size={15} color="#F08A24" />
    </Pressable>
  );
}

function IconButton({
  icon,
  md,
  disabled,
  onPress,
}: {
  icon: 'chevron.up' | 'chevron.down';
  md: 'chevron-up' | 'chevron-down';
  disabled?: boolean;
  onPress: () => void;
}) {
  const copy = useCopy();
  const foreground = useThemeColor('foreground');
  const muted = useThemeColor('border');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={copy.t('Move')}
      isDisabled={disabled}
      onPress={onPress}
      className="size-9 items-center justify-center rounded-full bg-surface">
      <Icon sf={icon} md={md} size={16} color={disabled ? muted : foreground} />
    </Pressable>
  );
}
