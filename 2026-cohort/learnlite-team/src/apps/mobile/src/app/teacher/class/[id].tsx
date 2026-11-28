import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import { useTabStore } from '@/lib/tab-store';
import { router, useLocalSearchParams } from 'expo-router';
import { Input } from 'heroui-native';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { CalendarIcon, FlameIcon, GemIcon, MissionIcon, PlayIcon, StudentsIcon, TargetIcon } from '@/components/game/game-icons';
import { Appear } from '@/components/game/game-ui';
import { Icon, PlayfulIcon } from '@/components/icon';
import { Lumi } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { RaisedCard, RaisedTile, tint } from '@/components/raised';
import { edgeOf } from '@/features/student/progress';
import { Avatar, EmptyState, StatusBadge } from '@/features/teacher/components/teacher-ui';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { average, dueLabel, STUDENT_STATUS_META } from '@/features/teacher/utils';
import { studentsLabel, useCopy } from '@/lib/i18n';

type Tab = 'students' | 'assignments';

export default function ClassDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classroom = useTeacherStore((state) => state.classrooms.find((item) => item.id === id));
  const students = useTeacherStore((state) => state.students);
  const modules = useTeacherStore((state) => state.modules);
  const assignments = useTeacherStore((state) => state.assignments);
  const removeStudent = useTeacherStore((state) => state.removeStudent);
  const removeAssignment = useTeacherStore((state) => state.removeAssignment);
  const copy = useCopy();
  const [tab, setTab] = useState<Tab>('students');
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [dialog, setDialog] = useState<{
    title: string;
    message: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm?: () => void;
  } | null>(null);

  if (!classroom) {
    return (
      <View className="flex-1 items-center justify-center gap-4 bg-background px-6">
        <EmptyState title={copy.t('Class not found')} message={copy.t('Return to your classrooms and try again.')} icon={null} />
        <AppButton label={copy.t('Back')} size="sm" onPress={() => router.back()} />
      </View>
    );
  }

  const members = students.filter((s) => s.classroomId === classroom.id);
  const visibleMembers = members
    .filter((s) => s.name.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.xp - a.xp);
  const classAssignments = assignments.filter((a) => a.classroomId === classroom.id);
  const accuracy = average(members.map((s) => s.accuracy));
  const activeToday = members.filter((s) => s.activeToday).length;
  const edge = edgeOf(classroom.color, 0.7);
  const firstPublished = modules.find((m) => m.status === 'published');

  const assign = () => {
    if (!firstPublished) {
      setDialog({
        title: copy.t('No published modules'),
        message: copy.t('Publish a module first, then you can assign it to this classroom.'),
        confirmLabel: copy.t('Go to modules'),
        onConfirm: () => { useTabStore.getState().open('teacher-modules'); router.dismissTo('/teacher-modules'); },
      });
      return;
    }
    router.push({ pathname: '/teacher/module/[id]/assign', params: { id: firstPublished.id, classId: classroom.id } });
  };

  const copyCode = async () => {
    await Clipboard.setStringAsync(classroom.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <View className="flex-1 bg-background">
      <ScrollView contentContainerClassName="gap-5 pb-safe-offset-10" keyboardShouldPersistTaps="handled">
        {/* Banner */}
        <Appear index={0}>
          <LinearGradient
            colors={[classroom.color, edge]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }}>
            <View className="flex-row items-center justify-between pt-safe-offset-3">
              <AppButton
                label={copy.t('Back')}
                iconOnly
                flat
                size="sm"
                variant="secondary"
                icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
                onPress={() => (router.canGoBack() ? router.back() : router.replace('/classes'))}
              />
            </View>
            <View className="mt-3 flex-row items-end gap-2">
              <View className="min-w-0 flex-1 gap-1 pb-1">
                <Text className="font-rounded text-3xl font-black leading-9 text-white" numberOfLines={2}>{classroom.name}</Text>
                <Text className="text-base font-bold text-white/85">{classroom.grade} · {copy.t(classroom.subject)}</Text>
              </View>
              <Lumi size={92} mood="wave" />
            </View>
            <View className="mt-4 gap-2">
              <View className="flex-row gap-2">
                <HeroStat
                  edge={edgeOf(classroom.color, 0.55)}
                  value={`${members.length}`}
                  label={copy.students}
                  color="#2F6BFF"
                  icon={<StudentsIcon size={36} />}
                />
                <HeroStat edge={edgeOf(classroom.color, 0.55)} value={`${activeToday}`} label={copy.t('Practised today')} color="#FF9600" icon={<FlameIcon size={36} />} />
              </View>
              <View className="flex-row gap-2">
                <HeroStat edge={edgeOf(classroom.color, 0.55)} value={`${accuracy}%`} label={copy.t('Accuracy')} color="#E04848" icon={<TargetIcon size={36} />} />
                <HeroStat edge={edgeOf(classroom.color, 0.55)} value={`${classAssignments.length}`} label={copy.t('Missions')} color="#F0603F" icon={<MissionIcon size={36} />} />
              </View>
            </View>
          </LinearGradient>
        </Appear>

        <View className="gap-5 px-5">
          {/* Join code */}
          <Appear index={1}>
            <View className="gap-3 rounded-[28px] border-2 border-border p-4" style={{ borderBottomWidth: 6 }}>
              <View className="flex-row items-center justify-between">
                <Text className="text-xs font-black uppercase tracking-widest text-muted">{copy.t('Classroom code')}</Text>
                <StatusBadge label={classroom.allowCommunity ? copy.t('Joining open') : copy.t('Joining closed')} tone={classroom.allowCommunity ? 'success' : 'muted'} />
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel={copy.t('Copy code')} onPress={copyCode}>
                <View className="flex-row items-center justify-between rounded-2xl bg-surface px-4 py-4">
                  <Text className="flex-1 font-mono text-xl font-black tracking-wider text-foreground" numberOfLines={1} adjustsFontSizeToFit selectable>{classroom.code}</Text>
                  <Text className="text-sm font-black text-accent">{copied ? copy.t('Copied!') : copy.t('Copy')}</Text>
                </View>
              </Pressable>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <AppButton
                    label={copy.t('Invite')}
                    size="md"
                    variant="secondary"
                    icon={<Icon sf="person.badge.plus" md="person-add" size={18} color="#2F6BFF" />}
                    onPress={() => router.push({ pathname: '/teacher/class/[id]/students', params: { id: classroom.id } })}
                  />
                </View>
                <View className="flex-1">
                  <AppButton label={copy.assign} size="md" icon={<PlayIcon size={14} />} onPress={assign} />
                </View>
              </View>
            </View>
          </Appear>

          {/* Tabs */}
          <Appear index={2} className="flex-row gap-2 rounded-2xl bg-surface p-1.5">
            {(['students', 'assignments'] as Tab[]).map((value) => {
              const active = tab === value;
              const label = value === 'students' ? `${copy.students} · ${members.length}` : `${copy.t('Missions')} · ${classAssignments.length}`;
              return (
                <Pressable
                  key={value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setTab(value)}
                  className={`flex-1 items-center rounded-xl py-2.5 ${active ? 'bg-background' : ''}`}>
                  <Text className={`text-sm font-black ${active ? 'text-accent' : 'text-muted'}`}>{label}</Text>
                </Pressable>
              );
            })}
          </Appear>

          {tab === 'students' ? (
            <Appear index={3} className="gap-3">
              {members.length > 4 ? (
                <View className="flex-row items-center gap-2 rounded-[18px] border-2 border-border bg-surface px-4">
                  <PlayfulIcon name="magnify" size={20} color="#56648A" />
                  <Input
                    value={query}
                    onChangeText={setQuery}
                    placeholder={copy.t('Search student')}
                    className="h-12 flex-1 border-0 bg-transparent px-0 text-base text-foreground placeholder:text-muted"
                  />
                </View>
              ) : null}
              {members.length === 0 ? (
                <EmptyState title={copy.t('No students')} message={copy.t('Add students with their email or share the classroom code.')} icon={null} />
              ) : (
                <View className="overflow-hidden rounded-3xl border-2 border-border" style={{ borderBottomWidth: 5 }}>
                  {visibleMembers.map((student, index) => {
                    const meta = STUDENT_STATUS_META[student.status];
                    return (
                      <Pressable
                        key={student.id}
                        accessibilityRole="button"
                        accessibilityLabel={student.name}
                        onPress={() =>
                          setDialog({
                            title: copy.t('Remove {name}', { name: student.name }),
                            message: copy.t('They will no longer appear in this classroom, but their account will not be deleted.'),
                            confirmLabel: copy.t('Remove from classroom'),
                            danger: true,
                            onConfirm: () => removeStudent(classroom.id, student.id),
                          })
                        }>
                        <View className={`flex-row items-center gap-3 px-4 py-3 ${index < visibleMembers.length - 1 ? 'border-b-2 border-border' : ''}`}>
                          <Text className="w-6 text-center font-rounded text-base font-black text-muted">{index + 1}</Text>
                          <Avatar name={student.name} size={42} />
                          {/* Name on its own line, numbers and status as chips underneath: nothing has
                              to squeeze next to anything else on a narrow phone. */}
                          <View className="min-w-0 flex-1 gap-1.5">
                            <Text className="text-base font-black text-foreground" numberOfLines={1}>{student.name}</Text>
                            <View className="flex-row flex-wrap items-center gap-1.5">
                              <MiniStat icon={<GemIcon size={14} />} text={`${student.xp}`} />
                              <MiniStat icon={<FlameIcon size={14} dim={student.streak === 0} />} text={`${student.streak}`} />
                              <MiniStat icon={<TargetIcon size={14} />} text={`${student.accuracy}%`} />
                              <StatusBadge label={meta.label} tone={meta.tone} />
                            </View>
                          </View>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              )}
              {members.length > 0 ? (
                <Text className="text-center text-xs font-semibold text-muted">{copy.t('Tap a student to remove them from this classroom.')}</Text>
              ) : null}
            </Appear>
          ) : (
            <Appear index={3} className="gap-3">
              {classAssignments.length === 0 ? (
                <EmptyState title={copy.t('No assignments')} message={copy.t('Assign a module so your students can start practicing.')} icon={null} />
              ) : (
                classAssignments.map((assignment) => {
                  const module = modules.find((m) => m.id === assignment.moduleId);
                  const due = dueLabel(assignment.dueDate);
                  return (
                    <View key={assignment.id} className="gap-3 rounded-3xl border-2 border-border p-4" style={{ borderBottomWidth: 5 }}>
                      <View className="flex-row items-start gap-3">
                        <RaisedTile face={tint(classroom.color, 0.86)} edge={tint(classroom.color, 0.62)} size={48} radius={14}>
                          <MissionIcon size={32} />
                        </RaisedTile>
                        <View className="min-w-0 flex-1 gap-1">
                          <Text className="font-rounded text-lg font-black leading-6 text-foreground" numberOfLines={2}>
                            {module?.title ?? copy.t('Deleted module')}
                          </Text>
                          <View className="flex-row flex-wrap items-center gap-2">
                            <Text className="text-xs font-bold text-muted">{studentsLabel(copy, assignment.studentIds.length)}</Text>
                            {due ? (
                              <View className="flex-row items-center gap-1">
                                <CalendarIcon size={13} />
                                <Text className="text-xs font-bold text-muted">{copy.t('Due')} {due}</Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={copy.t('Remove assignment')}
                          hitSlop={8}
                          onPress={() =>
                            setDialog({
                              title: copy.t('Remove this assignment?'),
                              message: copy.t('Students will stop seeing "{module}". Their progress is kept.', { module: module?.title ?? copy.t('Assignment') }),
                              confirmLabel: copy.t('Remove'),
                              danger: true,
                              onConfirm: () => removeAssignment(assignment.id),
                            })
                          }
                          className="size-10 items-center justify-center rounded-full bg-warning/15">
                          <Icon sf="trash" md="trash-outline" size={18} color="#E58A32" />
                        </Pressable>
                      </View>
                      {assignment.message ? (
                        <View className="rounded-2xl bg-surface px-4 py-3">
                          <Text className="text-base font-semibold text-foreground">“{assignment.message}”</Text>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              )}
              <AppButton label={copy.t('Assign another module')} uppercase icon={<PlayIcon size={14} />} onPress={assign} />
            </Appear>
          )}
        </View>
      </ScrollView>

      <ConfirmDialog
        visible={dialog !== null}
        title={dialog?.title ?? ''}
        message={dialog?.message ?? ''}
        confirmLabel={dialog?.confirmLabel ?? copy.t('Confirm')}
        notice={!dialog?.onConfirm}
        cancelLabel={copy.t('Cancel')}
        danger={dialog?.danger}
        icon={dialog?.danger ? 'account-remove-outline' : 'clipboard-text-outline'}
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

/** One classroom metric on the banner: a solid white card with a raised icon, so the label never
 * has to squeeze into a tiny translucent pill. */
function HeroStat({ value, label, color, icon, edge }: { value: string; label: string; color: string; icon: ReactNode; edge: string }) {
  return (
    <RaisedCard face="#FFFFFF" edge={edge} radius={18} style={{ flex: 1 }} className="flex-row items-center gap-3 px-3 py-2.5">
      {icon}
      <View className="min-w-0 flex-1">
        <Text className="font-rounded text-xl font-black leading-6" style={{ color: edgeOf(color, 0.85) }} numberOfLines={1} adjustsFontSizeToFit>
          {value}
        </Text>
        <Text className="text-xs font-bold text-[#56648A]" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
          {label}
        </Text>
      </View>
    </RaisedCard>
  );
}

/** A tiny icon + number chip for a student row. */
function MiniStat({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <View className="flex-row items-center gap-1 rounded-full bg-surface px-2 py-0.5">
      {icon}
      <Text className="text-xs font-black text-muted">{text}</Text>
    </View>
  );
}
