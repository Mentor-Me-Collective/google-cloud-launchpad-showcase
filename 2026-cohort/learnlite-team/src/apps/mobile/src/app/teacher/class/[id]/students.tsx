import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { Switch, useThemeColor } from 'heroui-native';
import { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

import { Icon } from '@/components/icon';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { AppButton } from '@/components/app-button';
import { Pressable } from '@/components/pressable';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { FormField } from '@/features/teacher/components/form-field';
import { Avatar, StatusBadge } from '@/features/teacher/components/teacher-ui';
import { TeacherHeader } from '@/features/teacher/components/teacher-header';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { studentsLabel, useCopy } from '@/lib/i18n';

// Join requests are not part of the MVP: students join with the classroom code or by invitation.
const INITIAL_REQUESTS: { id: string; name: string; email: string }[] = [];

export default function AddStudentsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classrooms = useTeacherStore((state) => state.classrooms);
  const students = useTeacherStore((state) => state.students);
  const addStudentByEmail = useTeacherStore((state) => state.addStudentByEmail);
  const updateClassroom = useTeacherStore((state) => state.updateClassroom);

  const classroom = classrooms.find((item) => item.id === id);
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(INITIAL_REQUESTS);
  const [allowCommunity, setAllowCommunity] = useState(classroom?.allowCommunity ?? true);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm?: () => void;
  } | null>(null);

  const muted = useThemeColor('muted');
  const copy = useCopy();

  if (!classroom) {
    return (
      <View className="flex-1 items-center justify-center gap-3 bg-background px-5">
        <Text className="text-xl font-black text-foreground">{copy.t('Class not found')}</Text>
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const classroomStudents = students.filter((student) => student.classroomId === classroom.id);

  const copyCode = async () => {
    await Clipboard.setStringAsync(classroom.code);
    setDialog({
      title: copy.t('Code copied'),
      message: copy.t('{code} is on your clipboard.', { code: classroom.code }),
      confirmLabel: copy.t('Ready'),
    });
  };

  const shareCode = async () => {
    await Share.share({
      message: copy.t('Join {classroom} in LearnLite with code {code}.', {
        classroom: classroom.name,
        code: classroom.code,
      }),
    });
  };

  const invite = async () => {
    if (!email.trim()) return;
    const status = await addStudentByEmail(classroom.id, email);
    if (!status) return; // the reason is shown in the banner
    setEmail('');
    setDialog({
      title: copy.t('Invitation sent'),
      message:
        status === 'active'
          ? copy.t('The student was added to the classroom.')
          : copy.t('No account with that email yet. They can join with the classroom code.'),
      confirmLabel: copy.t('Ready'),
    });
  };

  const accept = (request: (typeof INITIAL_REQUESTS)[number]) => {
    setDialog({
      title: copy.t('Add {name}', { name: request.name }),
      message: copy.t('They will join {classroom} and see assigned activities.', { classroom: classroom.name }),
      confirmLabel: copy.t('Add student'),
      onConfirm: () => {
        void addStudentByEmail(classroom.id, request.email);
        setPending((current) => current.filter((item) => item.id !== request.id));
      },
    });
  };

  const reject = (request: (typeof INITIAL_REQUESTS)[number]) => {
    setPending((current) => current.filter((item) => item.id !== request.id));
  };

  return (
    <View className="flex-1 bg-background">
      <TeacherHeader
      title={copy.t('Add students')}
        subtitle={`${classroom.name} · ${studentsLabel(copy, classroomStudents.length)}`}
        back
      />

      <KeyboardAwareScrollView
        className="flex-1"
        contentContainerClassName="gap-5 px-5 pb-6"
        keyboardShouldPersistTaps="handled"
        bottomOffset={24}>
        <View className="gap-3 rounded-[28px] bg-accent p-5" style={{ overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', width: 160, height: 160, borderRadius: 80, right: -50, top: -60, backgroundColor: '#FFFFFF', opacity: 0.1 }} />
          <View pointerEvents="none" style={{ position: 'absolute', width: 70, height: 70, borderRadius: 35, right: 60, bottom: -30, backgroundColor: '#FFFFFF', opacity: 0.08 }} />
          <Text className="text-[11px] font-black uppercase tracking-[0.22em] text-accent-foreground/70">
            {copy.t('Class code')}
          </Text>
          <Text className="font-mono text-2xl font-black tracking-wider text-accent-foreground" numberOfLines={1} adjustsFontSizeToFit selectable>
            {classroom.code}
          </Text>
          <Text className="text-sm leading-5 text-accent-foreground/80">
            {copy.t('Share this code so your students can join from their account.')}
          </Text>
          <View className="flex-row gap-2 pt-1">
            <AppButton
              label={copy.t('Copy')}
              size="sm"
              className="flex-1"
              colors={{ face: '#FFFFFF', label: '#2F6BFF', edge: '#B9CBFF' }}
              icon={<Icon sf="doc.on.doc" md="copy-outline" size={16} color="#2F6BFF" />}
              onPress={copyCode}
            />
            <AppButton
              label={copy.t('Share')}
              size="sm"
              className="flex-1"
              colors={{ face: '#FFD43B', label: '#5C4300', edge: '#D9A900' }}
              icon={<Icon sf="square.and.arrow.up" md="share-outline" size={16} color="#5C4300" />}
              onPress={shareCode}
            />
          </View>
        </View>

        <View className="gap-3">
          <Text className="px-1 text-xs font-black uppercase tracking-wide text-muted">
            {copy.t('Invite by email')}
          </Text>
          <FormField
            label={copy.t('Student email')}
            value={email}
            onChangeText={setEmail}
            placeholder="student@school.edu"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <AppButton
            label={copy.t('Send invitation')}
            variant="secondary"
            size="sm"
            icon={<Icon sf="paperplane.fill" md="send" size={17} color="#2F6BFF" />}
            onPress={invite}
          />
        </View>

        <View className="flex-row items-center gap-3 rounded-2xl bg-surface p-4">
          <View className="size-10 items-center justify-center rounded-xl bg-accent/12">
            <Icon sf="person.badge.plus" md="person-add" size={20} color="#2F6BFF" />
          </View>
          <View className="flex-1 gap-0.5">
          <Text className="text-base font-bold text-foreground">{copy.t('Join with code')}</Text>
            <Text className="text-sm text-muted">{copy.t('Students can join by themselves.')}</Text>
          </View>
          <Switch
            isSelected={allowCommunity}
            onSelectedChange={(next) => {
              setAllowCommunity(next);
              updateClassroom(classroom.id, { allowCommunity: next });
            }}
          />
        </View>

        {/* Join requests are not a server feature yet; the section only shows when there are some. */}
        {pending.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between px-1">
            <Text className="text-xs font-black uppercase tracking-wide text-muted">
              {copy.t('Pending requests')}
            </Text>
            <StatusBadge label={`${pending.length}`} tone="warning" />
          </View>
          {pending.length === 0 ? (
            <View className="items-center gap-1 rounded-2xl border border-dashed border-border bg-surface/60 px-5 py-6">
              <Icon sf="checkmark.circle.fill" md="checkmark-circle" size={22} color="#2ECC71" />
              <Text className="text-sm font-bold text-foreground">{copy.t('All caught up')}</Text>
              <Text className="text-center text-xs text-muted">
                {copy.t('No pending requests right now.')}
              </Text>
            </View>
          ) : (
            pending.map((request) => (
              <View key={request.id} className="flex-row items-center gap-3 rounded-2xl bg-surface p-3.5">
                <Avatar name={request.name} size={36} />
                <View className="min-w-0 flex-1 gap-0.5">
                  <Text className="text-sm font-bold text-foreground" numberOfLines={1}>
                    {request.name}
                  </Text>
                  <Text className="text-xs text-muted" numberOfLines={1}>
                    {request.email}
                  </Text>
                </View>
                <AppButton label={copy.t('Accept')} variant="success" size="sm" onPress={() => accept(request)} />
                <AppButton label={copy.t('Reject')} variant="danger" size="sm" onPress={() => reject(request)} />
              </View>
            ))
          )}
        </View>
        ) : null}

        <View className="gap-2 rounded-2xl bg-surface p-4">
          <Text className="text-sm font-bold text-foreground">{copy.t('Students in classroom')}</Text>
          <View className="flex-row flex-wrap gap-2 pt-1">
            {classroomStudents.slice(0, 10).map((student) => (
              <View key={student.id} className="flex-row items-center gap-1.5 rounded-full bg-background px-2 py-1">
                <Avatar name={student.name} size={22} color={classroom.color} />
                <Text className="text-xs font-semibold text-foreground">{student.name.split(' ')[0]}</Text>
              </View>
            ))}
            {classroomStudents.length > 10 ? (
              <View className="items-center justify-center rounded-full bg-background px-3 py-1">
                <Text className="text-xs font-bold text-muted">
                  +{classroomStudents.length - 10}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View className="flex-row items-center gap-2 px-1">
          <Icon sf="info.circle" md="information-circle-outline" size={16} color={muted} />
          <Text className="flex-1 text-xs text-muted">
            {copy.t('If the student has no account yet, the invitation waits; they can also join with the code.')}
          </Text>
        </View>
      </KeyboardAwareScrollView>

      <View className="border-t border-border bg-background px-5 pb-safe-offset-4 pt-3">
        <ChunkyButton label={copy.t('Ready')} onPress={() => router.back()} />
      </View>
      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? copy.t('Confirm')}
        notice={!dialog?.onConfirm}
        cancelLabel={copy.t('Cancel')}
        danger={dialog?.danger}
        icon={dialog?.danger ? 'account-remove-outline' : 'account-plus-outline'}
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
