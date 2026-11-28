import { router } from 'expo-router';
import { Input } from 'heroui-native';
import { useMemo, useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { CapIcon, ClassroomIcon, FlameIcon, StudentsIcon } from '@/components/game/game-icons';
import { Appear, GameProgress } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { edgeOf } from '@/features/student/progress';
import { Avatar, EmptyState } from '@/features/teacher/components/teacher-ui';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { missionsLabel, studentsLabel, useCopy } from '@/lib/i18n';

export default function ClassesScreen() {
  const classrooms = useTeacherStore((state) => state.classrooms);
  const students = useTeacherStore((state) => state.students);
  const assignments = useTeacherStore((state) => state.assignments);
  const copy = useCopy();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return classrooms.filter((c) => !q || `${c.name} ${c.grade} ${c.subject}`.toLowerCase().includes(q));
  }, [classrooms, query]);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-3" keyboardShouldPersistTaps="handled">
      <Appear index={0} className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-rounded text-4xl font-black text-foreground">{copy.t('Your classrooms')}</Text>
          <Text className="text-sm font-bold text-muted">
            {copy.t('{classes} classrooms · {students} students', { classes: classrooms.length, students: new Set(students.map((s) => s.id)).size })}
          </Text>
        </View>
        <AppButton
          label={copy.t('New classroom')}
          iconOnly
          size="sm"
          icon={<PlayfulIcon name="plus" size={24} color="#FFFFFF" />}
          onPress={() => router.push('/teacher/class/new')}
        />
      </Appear>

      {classrooms.length > 0 ? (
        <Appear index={1} className="flex-row gap-2">
          <SummaryChip color="#2F6BFF" value={classrooms.length} label={copy.classrooms} icon={<CapIcon size={28} />} />
          <SummaryChip
            color="#7C5CFF"
            value={new Set(students.map((s) => s.id)).size}
            label={copy.students}
            icon={<StudentsIcon size={28} />}
          />
          <SummaryChip
            color="#FF9600"
            value={new Set(students.filter((s) => s.activeToday).map((s) => s.id)).size}
            label={copy.t('Today')}
            icon={<FlameIcon size={28} />}
          />
        </Appear>
      ) : null}

      {classrooms.length > 2 ? (
        <Appear index={1} className="flex-row items-center gap-2 rounded-[18px] border-2 border-border bg-surface px-4">
          <PlayfulIcon name="magnify" size={20} color="#56648A" />
          <Input
            value={query}
            onChangeText={setQuery}
            placeholder={copy.t('Search classrooms...')}
            className="h-12 flex-1 border-0 bg-transparent px-0 text-base text-foreground placeholder:text-muted"
          />
        </Appear>
      ) : null}

      {classrooms.length === 0 ? (
        <Appear index={2}>
          <EmptyState
            title={copy.t('No classrooms yet')}
            message={copy.t('Create a classroom and share its code so your students can join.')}
            icon={null}
          />
        </Appear>
      ) : null}

      {visible.map((classroom, index) => {
        const members = students.filter((s) => s.classroomId === classroom.id);
        const active = members.filter((s) => s.activeToday).length;
        const missions = assignments.filter((a) => a.classroomId === classroom.id).length;
        const edge = edgeOf(classroom.color, 0.65);
        return (
          <Appear key={classroom.id} index={2 + index}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={classroom.name}
              onPress={() => router.push({ pathname: '/teacher/class/[id]', params: { id: classroom.id } })}>
              <View className="overflow-hidden rounded-[28px] border-2 border-border bg-background" style={{ borderBottomWidth: 6 }}>
                <View className="gap-3 overflow-hidden px-4 py-4" style={{ backgroundColor: classroom.color }}>
                  <View pointerEvents="none" style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, right: -40, top: -70, backgroundColor: '#FFFFFF', opacity: 0.12 }} />
                  <View pointerEvents="none" style={{ position: 'absolute', width: 60, height: 60, borderRadius: 30, right: 70, bottom: -26, backgroundColor: '#FFFFFF', opacity: 0.1 }} />
                  <View className="flex-row items-center gap-3">
                    <RaisedTile face={tint(classroom.color, 0.22)} edge={edge} size={56}>
                      <ClassroomIcon size={30} />
                    </RaisedTile>
                    <View className="min-w-0 flex-1">
                      <Text className="font-rounded text-2xl font-black leading-7 text-white" numberOfLines={1}>{classroom.name}</Text>
                      <Text className="text-sm font-bold text-white/85" numberOfLines={1}>
                        {classroom.grade} · {copy.t(classroom.subject)}
                      </Text>
                    </View>
                    <PlayfulIcon name="arrow-right" size={24} color="#FFFFFF" />
                  </View>
                  <View className="flex-row flex-wrap gap-2">
                    <Chip text={studentsLabel(copy, members.length)} />
                    <Chip text={missionsLabel(copy, missions)} />
                    {classroom.allowCommunity ? <Chip text={classroom.code} mono /> : null}
                  </View>
                </View>
                <View className="gap-2 px-4 py-4">
                  <View className="flex-row items-center justify-between">
                    <Text className="text-sm font-black text-foreground">{copy.t('Practised today')}</Text>
                    <Text className="text-sm font-black text-muted">{active}/{members.length}</Text>
                  </View>
                  <GameProgress percent={members.length ? (active / members.length) * 100 : 0} color={classroom.color} height={12} />
                  <View className="flex-row items-center justify-between pt-1">
                  {members.length > 0 ? (
                    <View className="flex-row items-center">
                      {members.slice(0, 6).map((s, i) => (
                        <View key={s.id} style={{ marginLeft: i === 0 ? 0 : -10, borderRadius: 99, borderWidth: 2, borderColor: '#FFFFFF' }}>
                          <Avatar name={s.name} size={32} />
                        </View>
                      ))}
                      {members.length > 6 ? <Text className="ml-2 text-xs font-black text-muted">+{members.length - 6}</Text> : null}
                    </View>
                  ) : (
                    <Text className="text-sm font-bold text-muted">{copy.t('Share the code so students can join.')}</Text>
                  )}
                    <View className="flex-row items-center gap-1 rounded-full px-3 py-1.5" style={{ backgroundColor: tint(classroom.color, 0.86) }}>
                      <Text className="text-xs font-black uppercase tracking-wide" style={{ color: edgeOf(classroom.color, 0.7) }}>{copy.t('Open')}</Text>
                      <PlayfulIcon name="arrow-right" size={14} color={edgeOf(classroom.color, 0.7)} />
                    </View>
                  </View>
                </View>
              </View>
            </Pressable>
          </Appear>
        );
      })}

      <Appear index={3 + visible.length}>
        <Pressable accessibilityRole="button" accessibilityLabel={copy.t('Create new classroom')} onPress={() => router.push('/teacher/class/new')}>
          <View className="flex-row items-center gap-4 rounded-[28px] border-2 border-dashed border-accent/50 bg-accent/5 p-4">
            <RaisedTile face="#2F6BFF" edge="#214FC9" size={56}>
              <PlayfulIcon name="plus" size={28} color="#FFFFFF" />
            </RaisedTile>
            <View className="min-w-0 flex-1">
              <Text className="font-rounded text-lg font-black text-foreground">{copy.t('Create new classroom')}</Text>
              <Text className="text-sm font-semibold text-muted">{copy.t('You get a code to share with your students.')}</Text>
            </View>
          </View>
        </Pressable>
      </Appear>
    </ScrollView>
  );
}

function SummaryChip({ color, value, label, icon }: { color: string; value: number; label: string; icon: ReactNode }) {
  return (
    <View className="flex-1 flex-row items-center gap-2 rounded-2xl px-3 py-2.5" style={{ backgroundColor: tint(color, 0.88) }}>
      {icon}
      <View className="min-w-0 flex-1">
        <Text className="font-rounded text-lg font-black leading-5" style={{ color: edgeOf(color, 0.8) }}>{value}</Text>
        <Text className="text-[11px] font-bold" style={{ color: edgeOf(color, 0.6) }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Text>
      </View>
    </View>
  );
}

function Chip({ text, mono }: { text: string; mono?: boolean }) {
  return (
    <View className="rounded-full bg-white/20 px-3 py-1">
      <Text className={`text-xs font-black text-white ${mono ? 'tracking-widest' : 'uppercase tracking-wide'}`}>{text}</Text>
    </View>
  );
}
