import { router, useLocalSearchParams } from 'expo-router';
import { Switch, useThemeColor } from 'heroui-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppButton } from '@/components/app-button';
import { Pressable } from '@/components/pressable';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { FormField } from '@/features/teacher/components/form-field';
import { Avatar } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { moduleBlockCount } from '@/features/teacher/utils';
import { studentsLabel, useCopy } from '@/lib/i18n';

type Mode = 'class' | 'students';

function defaultDueDate(locale: 'es' | 'en'): string {
  const date = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  return date.toLocaleDateString(locale === 'es' ? 'es-ES' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AssignModuleScreen() {
  const { id, classId } = useLocalSearchParams<{ id: string; classId?: string }>();
  const modules = useTeacherStore((state) => state.modules);
  const classrooms = useTeacherStore((state) => state.classrooms);
  const students = useTeacherStore((state) => state.students);
  const assignModule = useTeacherStore((state) => state.assignModule);
  const copy = useCopy();

  const [moduleId, setModuleId] = useState(id);
  const module = modules.find((item) => item.id === moduleId);
  const publishedModules = modules.filter((item) => item.status === 'published');
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>(
    classId ? [classId] : [],
  );
  const [mode, setMode] = useState<Mode>('class');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState(defaultDueDate(copy.locale));
  const [message, setMessage] = useState('');
  const [notify, setNotify] = useState(true);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    onConfirm?: () => void;
  } | null>(null);

  const muted = useThemeColor('muted');

  if (!module) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-5">
        <Text className="text-xl font-black text-foreground">{copy.t('Module not found')}</Text>
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  // A student in two of the selected classrooms is listed once.
  const availableStudents = [
    ...new Map(
      students.filter((student) => selectedClassrooms.includes(student.classroomId)).map((s) => [s.id, s]),
    ).values(),
  ];

  const toggleClassroom = (classroomId: string) => {
    setSelectedClassrooms((current) =>
      current.includes(classroomId)
        ? current.filter((item) => item !== classroomId)
        : [...current, classroomId],
    );
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    if (next === 'students' && selectedStudents.length === 0) {
      setSelectedStudents(availableStudents.map((student) => student.id));
    }
  };

  const assign = async () => {
    if (selectedClassrooms.length === 0) return;
    const ok = await assignModule({
      moduleId: module.id,
      classroomIds: selectedClassrooms,
      studentIds: mode === 'students' ? selectedStudents : [],
      dueDate,
      message,
      notify,
    });
    if (!ok) return; // the reason is shown in the banner
    setDialog({
      title: copy.t('Module assigned'),
      message: selectedClassrooms.length === 1
        ? copy.t('Assigned "{module}" to {count} classroom', { module: module.title, count: selectedClassrooms.length })
        : copy.t('Assigned "{module}" to {count} classrooms', { module: module.title, count: selectedClassrooms.length }),
      confirmLabel: copy.t('Ready'),
      onConfirm: () => router.back(),
    });
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader title={copy.t('Assign module')} subtitle={module.title} back />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View className="flex-row items-center gap-3 rounded-2xl bg-accent p-4">
          <View className="size-12 items-center justify-center rounded-2xl bg-background/20">
            <Icon sf="square.stack.3d.up.fill" md="layers" size={24} color="#FFFFFF" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-lg font-black text-accent-foreground" numberOfLines={1}>
              {module.title}
            </Text>
            <Text className="text-sm text-accent-foreground/80">
              {copy.t(module.subject)} · {module.lessons.length} {copy.t('lessons')} · {moduleBlockCount(module)} {copy.t('blocks')}
            </Text>
          </View>
          <View className="rounded-full bg-background/20 px-3 py-1">
            <Text className="text-[10px] font-black uppercase tracking-wide text-accent-foreground">
              {copy.t(module.status === 'published' ? 'Live' : 'Draft')}
            </Text>
          </View>
        </View>

        {module.status !== 'published' ? (
          <Text className="px-1 text-sm font-semibold text-warning">
            {copy.t('This module is a draft. Publish it first, or choose a published one below.')}
          </Text>
        ) : null}

        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-black uppercase tracking-wide text-muted">{copy.t('Module')}</Text>
            <Text className="text-xs font-semibold text-muted">
              {publishedModules.length} {copy.t('published')}
            </Text>
          </View>
          {publishedModules.length === 0 ? (
            <Text className="px-1 text-sm text-muted">{copy.t('You have no published modules yet.')}</Text>
          ) : (
            publishedModules.map((item) => {
              const selected = item.id === moduleId;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => setModuleId(item.id)}
                  className={`flex-row items-center gap-3 rounded-2xl border-2 p-3.5 ${
                    selected ? 'border-accent bg-accent/10' : 'border-border bg-surface'
                  }`}>
                  <View className="min-w-0 flex-1 gap-0.5">
                    <Text className="text-base font-black text-foreground" numberOfLines={1}>{item.title}</Text>
                    <Text className="text-xs text-muted" numberOfLines={1}>
                      {copy.t(item.subject)} · {item.lessons.length} {copy.t('lessons')} · {moduleBlockCount(item)} {copy.t('blocks')}
                    </Text>
                  </View>
                  <Icon
                    sf={selected ? 'checkmark.circle.fill' : 'circle'}
                    md={selected ? 'checkmark-circle' : 'ellipse-outline'}
                    size={22}
                    color={selected ? '#2F6BFF' : muted}
                  />
                </Pressable>
              );
            })
          )}
        </View>

        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-black uppercase tracking-wide text-muted">{copy.t('For')}</Text>
            <Text className="text-xs font-semibold text-muted">
              {selectedClassrooms.length} {copy.t('selected')}
            </Text>
          </View>

          {classrooms.map((classroom) => {
            const count = students.filter((student) =>
              classroom.studentIds.includes(student.id),
            ).length;
            return (
              <CheckRow
                key={classroom.id}
                checked={selectedClassrooms.includes(classroom.id)}
                title={classroom.name}
                subtitle={`${studentsLabel(copy, count)} · ${classroom.grade}`}
                left={<Avatar name={classroom.name} size={38} color={classroom.color} />}
                onPress={() => toggleClassroom(classroom.id)}
              />
            );
          })}
        </View>

        <View className="gap-2">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">{copy.t('Scope')}</Text>
          <View className="flex-row gap-2">
            <AppButton
              label={copy.t('Entire classroom')}
              variant={mode === 'class' ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onPress={() => changeMode('class')}
            />
            <AppButton
              label={copy.t('Specific students')}
              variant={mode === 'students' ? 'primary' : 'secondary'}
              size="sm"
              className="flex-1"
              onPress={() => changeMode('students')}
            />
          </View>

          {mode === 'students' ? (
            availableStudents.length === 0 ? (
              <Text className="px-1 text-sm text-muted">
                {copy.t('Select at least one classroom to choose students.')}
              </Text>
            ) : (
              <View className="gap-2">
                {availableStudents.map((student) => {
                  const classroom = classrooms.find((item) => item.id === student.classroomId);
                  return (
                    <CheckRow
                      key={student.id}
                      checked={selectedStudents.includes(student.id)}
                      title={student.name}
                      subtitle={classroom?.name ?? ''}
                      left={<Avatar name={student.name} size={34} color={classroom?.color} />}
                      onPress={() =>
                        setSelectedStudents((current) =>
                          current.includes(student.id)
                            ? current.filter((item) => item !== student.id)
                            : [...current, student.id],
                        )
                      }
                    />
                  );
                })}
              </View>
            )
          ) : null}
        </View>

        <FormField
          label={copy.t('Due date')}
          value={dueDate}
          onChangeText={setDueDate}
          placeholder={copy.t('e.g. Nov 20, 2026')}
        />

        <FormField
          label={copy.t('Message for your students')}
          value={message}
          onChangeText={setMessage}
          placeholder={copy.t('e.g. Let us explore the cell!')}
          multiline
          className="h-24 py-3"
        />

        <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4">
          <View className="size-10 items-center justify-center rounded-xl bg-accent/12">
            <Icon sf="bell.badge.fill" md="notifications" size={20} color="#2F6BFF" />
          </View>
          <View className="flex-1 gap-0.5">
            <Text className="text-base font-bold text-foreground">{copy.t('Send notification')}</Text>
            <Text className="text-sm text-muted">{copy.t('Notify students when assigning.')}</Text>
          </View>
          <Switch isSelected={notify} onSelectedChange={setNotify} />
        </View>

        <View className="flex-row items-center gap-2 px-1">
          <Icon sf="info.circle" md="information-circle-outline" size={16} color={muted} />
          <Text className="flex-1 text-xs text-muted">
            {mode === 'students'
              ? `${selectedStudents.length} ${copy.t('students selected.')}`
              : copy.t('It will be assigned to all students in the selected classrooms.')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View className="border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton
          label={
            selectedClassrooms.length === 0
            ? copy.t('Choose a classroom')
              : selectedClassrooms.length === 1
                ? copy.t('Assign to {count} classroom', { count: selectedClassrooms.length })
                : copy.t('Assign to {count} classrooms', { count: selectedClassrooms.length })
          }
          disabled={selectedClassrooms.length === 0}
          icon={<Icon sf="paperplane.fill" md="send" size={18} color="#FFFFFF" />}
          onPress={assign}
        />
      </View>
      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? copy.t('Confirm')}
        notice={!dialog?.onConfirm}
        cancelLabel={copy.t('Cancel')}
        icon="send-check-outline"
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

function CheckRow({
  checked,
  title,
  subtitle,
  left,
  onPress,
}: {
  checked: boolean;
  title: string;
  subtitle: string;
  left: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`flex-row items-center gap-3 rounded-2xl border p-3.5 ${
        checked ? 'border-accent bg-accent/10' : 'border-border bg-surface'
      }`}>
      {left}
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-foreground" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-sm text-muted" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View
        className={`size-6 items-center justify-center rounded-md border-2 ${
          checked ? 'border-accent bg-accent' : 'border-border bg-background'
        }`}>
        {checked ? <Icon sf="checkmark" md="checkmark" size={14} color="#FFFFFF" /> : null}
      </View>
    </Pressable>
  );
}
