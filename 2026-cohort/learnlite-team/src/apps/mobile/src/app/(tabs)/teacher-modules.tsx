import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { BlocksIcon, BookIcon, CapIcon, CheckIcon, LessonBadgeIcon, PlayIcon, TargetIcon } from '@/components/game/game-icons';
import { Appear } from '@/components/game/game-ui';
import { PlayfulIcon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { RaisedTile, tint } from '@/components/raised';
import { edgeOf } from '@/features/student/progress';
import { EmptyState } from '@/features/teacher/components/teacher-ui';
import { useTeacherStore } from '@/features/teacher/store/teacher-store';
import { moduleBlockCount } from '@/features/teacher/utils';
import { useCopy } from '@/lib/i18n';

type Filter = 'all' | 'published' | 'draft';
const TONES = ['#2F6BFF', '#7C5CFF', '#FF8A1F', '#1CB0A8', '#E0559A'];

export default function TeacherModulesScreen() {
  const modules = useTeacherStore((state) => state.modules);
  const assignments = useTeacherStore((state) => state.assignments);
  const copy = useCopy();
  const [filter, setFilter] = useState<Filter>('all');
  const visible = modules.filter((m) => filter === 'all' || m.status === filter);
  const published = modules.filter((m) => m.status === 'published').length;
  const filters: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: copy.t('All'), count: modules.length },
    { value: 'published', label: copy.t('Published'), count: published },
    { value: 'draft', label: copy.t('Drafts'), count: modules.length - published },
  ];

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-3">
      <Appear index={0} className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="font-rounded text-4xl font-black text-foreground">{copy.t('Your modules')}</Text>
          <Text className="text-sm font-bold text-muted">{copy.t('{count} published', { count: published })}</Text>
        </View>
        <AppButton label={copy.t('New module')} iconOnly size="sm" icon={<PlayfulIcon name="plus" size={24} color="#FFFFFF" />} onPress={() => router.push('/teacher/module/new')} />
      </Appear>

      <Appear index={1} className="flex-row gap-2 rounded-2xl bg-surface p-1.5">
        {filters.map((f) => {
          const active = f.value === filter;
          return (
            <Pressable
              key={f.value}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              onPress={() => setFilter(f.value)}
              className={`flex-1 items-center rounded-xl py-2 ${active ? 'bg-background' : ''}`}>
              <Text className={`text-sm font-black ${active ? 'text-accent' : 'text-muted'}`}>{f.label} · {f.count}</Text>
            </Pressable>
          );
        })}
      </Appear>

      {visible.length === 0 ? (
        <Appear index={2}>
          <EmptyState
            title={filter === 'draft' ? copy.t('No drafts') : copy.t('No modules yet')}
            message={copy.t('Create a module with lessons and activities, then assign it to a classroom.')}
            icon={null}
          />
        </Appear>
      ) : null}

      {visible.map((module, index) => {
        const color = TONES[modules.indexOf(module) % TONES.length];
        const isPublished = module.status === 'published';
        const assignedTo = new Set(assignments.filter((a) => a.moduleId === module.id).map((a) => a.classroomId)).size;
        const activities = module.lessons.reduce((n, l) => n + l.blocks.filter((b) => b.kind === 'activity').length, 0);
        return (
          <Appear key={module.id} index={2 + index}>
            <View className="gap-4 rounded-[28px] border-2 border-border bg-background p-4" style={{ borderBottomWidth: 6 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={module.title}
                onPress={() => router.push({ pathname: '/teacher/module/[id]', params: { id: module.id } })}>
                <View className="flex-row items-start gap-3">
                  <RaisedTile face={tint(color, 0.86)} edge={tint(color, 0.6)} size={64} radius={18} depth={5}>
                    <BookIcon size={42} />
                  </RaisedTile>
                  <View className="min-w-0 flex-1 gap-1">
                    <View className="flex-row items-center gap-1.5 self-start rounded-full px-2.5 py-0.5" style={{ backgroundColor: isPublished ? '#DDF7C9' : '#FFF4D6' }}>
                      {isPublished ? <CheckIcon size={12} color="#3E8E00" /> : null}
                      <Text className="text-[11px] font-black uppercase tracking-wide" style={{ color: isPublished ? '#3E8E00' : '#C98A00' }}>
                        {copy.t(isPublished ? 'Live' : 'Draft')}
                      </Text>
                    </View>
                    <Text className="font-rounded text-xl font-black leading-6 text-foreground" numberOfLines={2}>{module.title}</Text>
                    <Text className="text-sm font-semibold text-muted" numberOfLines={1}>{copy.t(module.subject)}</Text>
                  </View>
                </View>
              </Pressable>
              <View className="flex-row gap-2">
                <Metric icon={<LessonBadgeIcon size={26} />} value={module.lessons.length} label={copy.t('lessons')} />
                <Metric icon={<BlocksIcon size={26} />} value={moduleBlockCount(module)} label={copy.t('blocks')} />
                <Metric icon={<TargetIcon size={26} />} value={activities} label={copy.t('activities')} />
                <Metric icon={<CapIcon size={26} />} value={assignedTo} label={copy.t('classes')} />
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <AppButton label={copy.t('Edit')} variant="secondary" size="md" onPress={() => router.push({ pathname: '/teacher/module/[id]', params: { id: module.id } })} />
                </View>
                <View className="flex-1">
                  <AppButton
                    label={copy.assign}
                    size="md"
                    disabled={!isPublished}
                    icon={<PlayIcon size={14} />}
                    onPress={() => router.push({ pathname: '/teacher/module/[id]/assign', params: { id: module.id } })}
                  />
                </View>
              </View>
            </View>
          </Appear>
        );
      })}

      <Appear index={3 + visible.length}>
        <AppButton label={copy.t('Create new module')} uppercase icon={<PlayfulIcon name="plus" size={20} color="#FFFFFF" />} onPress={() => router.push('/teacher/module/new')} />
      </Appear>
    </ScrollView>
  );
}

function Metric({ icon, value, label }: { icon: ReactNode; value: number; label: string }) {
  return (
    <View className="flex-1 items-center gap-0.5 rounded-2xl border-2 border-border bg-surface/60 px-1 py-2">
      {icon}
      <Text className="font-rounded text-lg font-black leading-6 text-foreground">{value}</Text>
      <Text className="text-[11px] font-bold text-muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
        {label}
      </Text>
    </View>
  );
}
