import { router } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';

import { PlayfulIcon } from '@/components/icon';
import { CheckIcon, SparkIcon } from '@/components/game/game-icons';
import { Appear, SpeechBubble } from '@/components/game/game-ui';
import { Lumi } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { useStudentStore } from '@/features/student/store/student-store';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { useLiveRefresh } from '@/lib/use-live-refresh';

type CommunityModule = {
  id: string;
  title: string;
  subject: string;
  description: string;
  authorName: string;
  lessonCount: number;
  activityCount: number;
  assigned: boolean;
  completedLessons: number;
};

const SUBJECT_COLORS = ['#2F6BFF', '#7C5CFF', '#FF8A1F', '#1CB0A8', '#E0559A', '#58CC02'];

/** Colour of a subject, the same every time, so a subject is recognisable at a glance. */
function subjectColor(subject: string) {
  let hash = 0;
  for (const char of subject) hash = (hash * 31 + char.charCodeAt(0)) % 997;
  return SUBJECT_COLORS[hash % SUBJECT_COLORS.length];
}

/** Community: modules that teachers chose to share with everyone. */
export default function CommunityScreen() {
  const copy = useCopy();
  const muted = useThemeColor('muted');
  const fetchModule = useStudentStore((state) => state.fetchModule);
  const [query, setQuery] = useState('');
  const [subject, setSubject] = useState<string | null>(null);
  const [items, setItems] = useState<CommunityModule[] | null>(null);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [failed, setFailed] = useState(false);
  const [opening, setOpening] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (subject) params.set('subject', subject);
      const result = await api<{ items: CommunityModule[]; subjects: string[] }>(
        `/community/modules${params.size ? `?${params}` : ''}`,
      );
      setItems(result.items);
      // The subject chips come from every shared module, so they do not vanish while filtering.
      if (!subject && !query.trim()) setSubjects(result.subjects);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [query, subject]);

  // Typing searches after a short pause instead of on every key.
  useEffect(() => {
    const timer = setTimeout(() => void load(), query ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, query]);
  useLiveRefresh(load, true, 30_000);

  const open = async (module: CommunityModule) => {
    if (opening) return;
    setOpening(module.id);
    const ok = await fetchModule(module.id);
    setOpening(null);
    if (!ok) {
      void load(); // its author stopped sharing it: the list catches up
      return;
    }
    router.push({ pathname: '/student-module/[id]', params: { id: module.id, from: 'community' } });
  };

  const lumiLine = failed
    ? copy.t('I could not load the community. I will try again in a moment.')
    : items && items.length === 0 && !query && !subject
      ? copy.t('No teacher has shared a module yet. Come back soon!')
      : items && items.length === 0
        ? copy.t('I found nothing for that. Try another word!')
        : copy.t('Lessons that teachers shared with everyone. Pick one and play!');

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-4 px-5 pb-safe-offset-24 pt-safe-offset-3"
      keyboardShouldPersistTaps="handled">
      <Appear index={0} className="gap-0.5">
        <Text className="font-rounded text-4xl font-black text-foreground">{copy.t('Community')}</Text>
        <Text className="text-sm font-bold text-muted">{copy.t('Modules shared by teachers')}</Text>
      </Appear>

      <Appear index={1} className="flex-row items-center gap-1">
        <Lumi size={84} mood={failed ? 'sad' : 'happy'} />
        <View className="flex-1 pl-2">
          <SpeechBubble text={lumiLine} />
        </View>
      </Appear>

      <Appear index={2}>
        <View className="flex-row items-center gap-3 rounded-2xl border-2 border-border bg-surface px-4">
          <PlayfulIcon name="magnify" size={20} color={muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={copy.t('Search modules')}
            placeholderTextColor={muted}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel={copy.t('Search modules')}
            className="min-h-12 flex-1 text-base font-semibold text-foreground"
          />
        </View>
      </Appear>

      {subjects.length > 1 ? (
        <Appear index={3}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerClassName="gap-2">
            {[null, ...subjects].map((value) => {
              const active = value === subject;
              const color = value ? subjectColor(value) : '#2F6BFF';
              return (
                <Pressable
                  key={value ?? 'all'}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => setSubject(value)}
                  className="rounded-full border-2 px-4 py-2"
                  style={{ borderColor: active ? color : '#E4E8F0', backgroundColor: active ? color : 'transparent' }}>
                  <Text className={`text-sm font-black ${active ? 'text-white' : 'text-foreground'}`}>
                    {value ?? copy.t('All')}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Appear>
      ) : null}

      {(items ?? []).map((module, index) => {
        const color = subjectColor(module.subject);
        const finished = module.lessonCount > 0 && module.completedLessons >= module.lessonCount;
        return (
          <Appear key={module.id} index={4 + index}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={module.title}
              onPress={() => void open(module)}
              className="gap-3 rounded-3xl border-2 border-border p-4"
              style={{ borderBottomWidth: 6 }}>
              <View className="flex-row items-center gap-3">
                <View className="size-12 items-center justify-center rounded-2xl" style={{ backgroundColor: color }}>
                  <SparkIcon size={26} />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="font-rounded text-lg font-black leading-6 text-foreground" numberOfLines={2}>
                    {module.title}
                  </Text>
                  <Text className="text-sm font-bold" style={{ color }} numberOfLines={1}>
                    {module.subject}
                  </Text>
                </View>
                {finished ? (
                  <View className="size-8 items-center justify-center rounded-full bg-success">
                    <CheckIcon size={18} color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              {module.description ? (
                <Text className="text-sm font-semibold leading-5 text-muted" numberOfLines={2}>
                  {module.description}
                </Text>
              ) : null}
              <View className="flex-row flex-wrap items-center gap-2">
                <Chip text={module.lessonCount === 1 ? copy.t('1 lesson') : copy.t('{count} lessons', { count: module.lessonCount })} />
                <Chip text={copy.t('{count} activities', { count: module.activityCount })} />
                {module.completedLessons > 0 && !finished ? (
                  <Chip text={copy.t('{done} of {total} done', { done: module.completedLessons, total: module.lessonCount })} tone={color} />
                ) : null}
                {module.assigned ? <Chip text={copy.t('Assigned to you')} tone="#58CC02" /> : null}
              </View>
              <Text className="text-xs font-bold text-muted">{copy.t('By {name}', { name: module.authorName })}</Text>
              {opening === module.id ? <Text className="text-xs font-black text-accent">{copy.t('Opening...')}</Text> : null}
            </Pressable>
          </Appear>
        );
      })}
    </ScrollView>
  );
}

function Chip({ text, tone }: { text: string; tone?: string }) {
  return (
    <View className="rounded-full px-3 py-1" style={{ backgroundColor: tone ? `${tone}22` : '#EEF1F7' }}>
      <Text className="text-xs font-black" style={{ color: tone ?? '#56648A' }}>
        {text}
      </Text>
    </View>
  );
}
