import { router } from 'expo-router';
import type { ComponentProps } from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { FormField } from '@/features/teacher/components/form-field';
import { ChipSelect } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { Lumi } from '@/components/lumi/lumi';
import { useCopy } from '@/lib/i18n';

const SUBJECTS = [
  { value: 'Ciencias Naturales', label: 'Science' },
  { value: 'Matemáticas', label: 'Mathematics' },
  { value: 'Lengua', label: 'Language' },
  { value: 'Historia', label: 'History' },
];

export default function NewModuleScreen() {
  const createModule = useTeacherStore((state) => state.createModule);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Ciencias Naturales');
  const copy = useCopy();

  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const id = await createModule({ title, subject });
    setBusy(false);
    if (id) router.replace({ pathname: '/teacher/module/[id]', params: { id } });
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader title={copy.t('New module')} subtitle={copy.t('Build your next mission')} back />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View className="flex-row items-center gap-2 rounded-[28px] bg-[#FF8A1F] p-5" style={{ borderBottomWidth: 6, borderBottomColor: '#C86400' }}>
          <View className="flex-1 gap-2">
            <View className="size-12 items-center justify-center rounded-2xl bg-white/20">
              <Icon sf="square.stack.3d.up.fill" md="layers" size={24} color="#FFFFFF" />
            </View>
            <Text className="font-rounded text-2xl font-black leading-8 text-white" numberOfLines={3}>
              {title.trim() || copy.t('Your new mission')}
            </Text>
            <Text className="text-sm font-semibold text-white/90">
              {copy.t(subject)} · {copy.t('starts as a draft and you can publish when it is ready.')}
            </Text>
          </View>
          <Lumi size={84} mood="thinking" />
        </View>

        <FormField
          label={copy.t('Module title')}
          value={title}
          onChangeText={setTitle}
          placeholder={copy.t('e.g. Mission: The cell')}
          hint={copy.t('A short, catchy title works best.')}
        />

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Subject')}</Text>
          <ChipSelect options={SUBJECTS.map((option) => ({ ...option, label: copy.t(option.label) }))} value={subject} onChange={setSubject} />
        </View>

        <View className="gap-2 rounded-2xl bg-surface p-4">
          <Text className="text-sm font-bold text-foreground">{copy.t('What you can add')}</Text>
          <FeatureRow icon="book.closed.fill" md="book" text={copy.t('Theory cards with images and comments.')} />
          <FeatureRow icon="doc.fill" md="document" text={copy.t('Files and supporting links for your class.')} />
          <FeatureRow icon="checkmark.circle.fill" md="checkmark-circle" text={copy.t('Six types of interactive activities.')} />
        </View>

        <View className="flex-row items-center gap-2 px-1">
          <Icon sf="info.circle" md="information-circle-outline" size={16} color="#56648A" />
          <Text className="flex-1 text-xs text-muted">
            {copy.t('You can edit the title and subject whenever you want.')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View className="border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton
          label={copy.t('Create module')}
          icon={<Icon sf="plus" md="add" size={18} color="#FFFFFF" />}
          onPress={create}
        />
      </View>
    </View>
  );
}

function FeatureRow({
  icon,
  md,
  text,
}: {
  icon: ComponentProps<typeof Icon>['sf'];
  md: ComponentProps<typeof Icon>['md'];
  text: string;
}) {
  return (
    <View className="flex-row items-center gap-2.5">
      <Icon sf={icon} md={md} size={16} color="#2F6BFF" />
      <Text className="flex-1 text-sm text-muted">{text}</Text>
    </View>
  );
}
