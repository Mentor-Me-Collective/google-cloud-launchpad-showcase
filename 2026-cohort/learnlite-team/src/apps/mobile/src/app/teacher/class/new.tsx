import { router } from 'expo-router';
import { Switch, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { FormField } from '@/features/teacher/components/form-field';
import { ChipSelect } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { CLASS_COLORS } from '@/features/teacher/types';
import { ClassroomIcon } from '@/components/game/game-icons';
import { Lumi } from '@/components/lumi/lumi';
import { edgeOf } from '@/features/student/progress';
import { useCopy } from '@/lib/i18n';

const GRADES = [
  { value: '5° grado', label: '5°' },
  { value: '6° grado', label: '6°' },
  { value: '7° grado', label: '7°' },
  { value: '8° grado', label: '8°' },
  { value: '9° grado', label: '9°' },
];

const SUBJECTS = [
  { value: 'Ciencias Naturales', label: 'Science' },
  { value: 'Matemáticas', label: 'Mathematics' },
  { value: 'Lengua', label: 'Language' },
  { value: 'Historia', label: 'History' },
];

export default function NewClassScreen() {
  const createClassroom = useTeacherStore((state) => state.createClassroom);
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('6° grado');
  const [subject, setSubject] = useState('Ciencias Naturales');
  const [color, setColor] = useState<string>(CLASS_COLORS[1].value);
  const [allowCommunity, setAllowCommunity] = useState(true);

  const muted = useThemeColor('muted');
  const border = useThemeColor('border');
  const copy = useCopy();

  const [busy, setBusy] = useState(false);

  const create = async () => {
    if (busy) return;
    setBusy(true);
    const id = await createClassroom({ name, grade, subject, color, allowCommunity });
    setBusy(false);
    if (id) router.replace({ pathname: '/teacher/class/[id]', params: { id } });
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader title={copy.t('New classroom')} subtitle={copy.t('Create a space for your class')} back />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View className="gap-3 rounded-[28px] p-5" style={{ backgroundColor: color, borderBottomWidth: 6, borderBottomColor: edgeOf(color, 0.65) }}>
          <View className="flex-row items-center gap-3">
            <View className="size-14 items-center justify-center rounded-2xl bg-white/20">
              <ClassroomIcon size={30} />
            </View>
            <View className="flex-1 gap-0.5">
              <Text className="font-rounded text-2xl font-black leading-7 text-white" numberOfLines={2}>
                {name.trim() || copy.t('Your new classroom')}
              </Text>
              <Text className="text-sm font-bold text-white/85">
                {grade} · {copy.t(subject)}
              </Text>
            </View>
            <Lumi size={76} mood="wave" />
          </View>
          <Text className="text-sm font-semibold leading-5 text-white/90">
            {copy.t('You can invite students with a code and assign modules when it is ready.')}
          </Text>
        </View>

        <FormField
          label={copy.t('Classroom name')}
          value={name}
          onChangeText={setName}
          placeholder={copy.t('e.g. 6th B')}
          hint={copy.t('Use a name your students will recognize.')}
        />

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Grade')}</Text>
          <ChipSelect options={GRADES} value={grade} onChange={setGrade} />
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Subject')}</Text>
          <ChipSelect options={SUBJECTS.map((option) => ({ ...option, label: copy.t(option.label) }))} value={subject} onChange={setSubject} />
        </View>

        <View className="gap-2">
          <Text className="px-1 text-sm font-bold text-foreground">{copy.t('Classroom color')}</Text>
          <View className="flex-row flex-wrap gap-3">
            {CLASS_COLORS.map((option) => {
              const selected = option.value === color;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Color ${option.id}`}
                  onPress={() => setColor(option.value)}
                  className="size-11 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: option.soft,
                    borderWidth: selected ? 3 : 1,
                    borderColor: selected ? option.value : border,
                  }}>
                  <View className="size-6 rounded-full" style={{ backgroundColor: option.value }} />
                  {selected ? (
                    <View className="absolute">
                      <Icon sf="checkmark" md="checkmark" size={16} color="#FFFFFF" />
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        </View>

        <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4">
          <View className="size-10 items-center justify-center rounded-xl bg-accent/12">
            <Icon sf="person.badge.plus" md="person-add" size={20} color="#2F6BFF" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-foreground">{copy.t('Join with code')}</Text>
            <Text className="text-sm text-muted">{copy.t('Students can join by themselves.')}</Text>
          </View>
          <Switch isSelected={allowCommunity} onSelectedChange={setAllowCommunity} />
        </View>

        <View className="flex-row items-center gap-2 px-1">
          <Icon sf="info.circle" md="information-circle-outline" size={16} color={muted} />
          <Text className="flex-1 text-xs text-muted">
            {copy.t('The classroom is created on this device. Syncing will come later.')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View className="border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton
          label={copy.createClass}
          icon={<Icon sf="plus" md="add" size={18} color="#FFFFFF" />}
          onPress={create}
        />
      </View>
    </View>
  );
}
