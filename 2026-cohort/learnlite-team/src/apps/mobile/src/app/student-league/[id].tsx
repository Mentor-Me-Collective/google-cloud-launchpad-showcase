import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { PlayfulIcon } from '@/components/icon';
import { FlameIcon, GemIcon, MedalIcon, TrophyIcon } from '@/components/game/game-icons';
import { Appear, SpeechBubble } from '@/components/game/game-ui';
import { Lumi, type LumiMood } from '@/components/lumi/lumi';
import { initialsOf } from '@/features/student/progress';
import { useEnsureStudentData, useStudentStore } from '@/features/student/store/student-store';
import { api } from '@/lib/api';
import { useCopy } from '@/lib/i18n';
import { useLiveRefresh } from '@/lib/use-live-refresh';

type Row = { rank: number; name: string; xp: number; streak: number; isMe: boolean };

const AVATAR_COLORS = ['#2F6BFF', '#7C5CFF', '#FF8A1F', '#1CB0A8', '#E0559A', '#58CC02'];

/** One classroom's league: its students ranked by XP, like a game's leaderboard. */
export default function ClassLeagueScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const classroom = useStudentStore((state) => state.classrooms.find((item) => item.id === id));
  const loaded = useStudentStore((state) => state.loaded);
  const copy = useCopy();
  useEnsureStudentData();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const board = await api<{ items: Row[] }>(`/me/classrooms/${id}/leaderboard`);
      setRows(board.items);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(load, Boolean(id), 20_000);

  if (!classroom) {
    if (!loaded) return <View className="flex-1 items-center justify-center bg-background"><Lumi size={120} mood="thinking" /></View>;
    return (
      <View className="flex-1 items-center justify-center gap-5 bg-background px-8">
        <Lumi size={150} mood="thinking" />
        <SpeechBubble text={copy.t('Join a classroom to compete in its league with your classmates!')} tail="bottom" />
        <AppButton label={copy.t('Join classroom')} uppercase onPress={() => router.replace('/student-classes')} />
      </View>
    );
  }

  const me = rows?.find((r) => r.isMe);
  const above = me && me.rank > 1 ? rows?.find((r) => r.rank === me.rank - 1) : undefined;
  const mood: LumiMood = me?.rank === 1 ? 'cheer' : 'happy';
  const lumiLine = !rows
    ? copy.t('Counting everyone’s XP...')
    : rows.length === 1
      ? copy.t('You are the first one here. Invite your classmates!')
      : me?.rank === 1
        ? copy.t('You are number 1 in your class! Keep it up!')
        : above && me
          ? copy.t('Only {xp} XP to pass {name}. Let us play a lesson!', { xp: above.xp - me.xp + 1, name: above.name.replace(/\.$/, '') })
          : copy.t('Answer activities to earn XP and climb the league.');
  const podium = (rows ?? []).slice(0, 3);
  const rest = (rows ?? []).slice(3);

  return (
    <ScrollView className="flex-1 bg-background" contentContainerClassName="gap-5 px-5 pb-safe-offset-24 pt-safe-offset-3">
      <Appear index={0} className="gap-3">
        <View className="self-start">
          <AppButton
            label={copy.t('Back')}
            iconOnly
            flat
            size="sm"
            variant="secondary"
            icon={<PlayfulIcon name="arrow-left" size={22} color="#56648A" />}
            onPress={() => (router.canGoBack() ? router.back() : router.replace({ pathname: '/student-class/[id]', params: { id: classroom.id } }))}
          />
        </View>
        <View className="flex-row items-center gap-3">
          <TrophyIcon size={36} />
          <View className="min-w-0 flex-1">
            <Text className="font-rounded text-4xl font-black text-foreground">{copy.t('League')}</Text>
            <Text className="text-sm font-bold text-muted" numberOfLines={1}>{classroom.name}</Text>
          </View>
        </View>
      </Appear>

      <Appear index={1} className="flex-row items-center gap-1">
        <Lumi size={92} mood={mood} />
        <View className="flex-1 pl-2">
          <SpeechBubble text={failed ? copy.t('I could not load the league. I will try again in a moment.') : lumiLine} />
        </View>
      </Appear>

      {/* Podium: 2nd, 1st, 3rd */}
      {podium.length > 0 ? (
        <Appear index={2} className="flex-row items-end justify-center gap-3 pt-2">
          {/* 2nd, 1st, 3rd: only the places that exist are drawn, so the podium stays centred. */}
          {[podium[1], podium[0], podium[2]]
            .filter((row): row is Row => row !== undefined)
            .map((row) => (
              <PodiumPlace key={`place-${row.rank}`} row={row} height={row.rank === 1 ? 124 : row.rank === 2 ? 96 : 76} />
            ))}
        </Appear>
      ) : null}

      {/* Everyone else */}
      {rest.length > 0 ? (
        <Appear index={3} className="gap-2">
          {rest.map((row) => (
            <LeagueRow key={`row-${row.rank}`} row={row} />
          ))}
        </Appear>
      ) : null}

      {me && me.rank > 3 ? (
        <Text className="text-center text-sm font-bold text-muted">
          {copy.t('You are number {rank} of {total}', { rank: me.rank, total: rows?.length ?? 0 })}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Avatar({ name, index, size = 44, ring }: { name: string; index: number; size?: number; ring?: string }) {
  const color = AVATAR_COLORS[index % AVATAR_COLORS.length];
  return (
    <View
      className="items-center justify-center rounded-full"
      style={{ width: size, height: size, backgroundColor: color, borderWidth: ring ? 3 : 0, borderColor: ring }}>
      <Text className="font-rounded font-black text-white" style={{ fontSize: size * 0.38 }}>
        {initialsOf(name)}
      </Text>
    </View>
  );
}

function PodiumPlace({ row, height }: { row: Row; height: number }) {
  const place = row.rank as 1 | 2 | 3;
  const tone = { 1: ['#FFC800', '#E8A600'], 2: ['#D5DCE6', '#A9B4C4'], 3: ['#F0A868', '#C97A3A'] }[place];
  return (
    <View className="flex-1 items-center gap-2" style={{ maxWidth: 132 }}>
      <View>
        <Avatar name={row.name} index={row.rank} size={row.rank === 1 ? 64 : 52} ring={row.isMe ? '#2F6BFF' : tone[0]} />
        <View className="absolute -bottom-2 -right-2">
          <MedalIcon size={26} place={place} />
        </View>
      </View>
      <Text className={`text-center text-sm font-black ${row.isMe ? 'text-accent' : 'text-foreground'}`} numberOfLines={1}>
        {row.name}
      </Text>
      <View
        className="w-full items-center justify-start rounded-t-2xl pt-3"
        style={{ height, backgroundColor: tone[0], borderBottomWidth: 0, borderTopWidth: 0 }}>
        <Text className="font-rounded text-3xl font-black text-white">{row.rank}</Text>
        <View className="mt-1 flex-row items-center gap-1 rounded-full bg-white/80 px-2 py-0.5">
          <GemIcon size={14} />
          <Text className="text-xs font-black" style={{ color: tone[1] }}>{row.xp}</Text>
        </View>
      </View>
    </View>
  );
}

function LeagueRow({ row }: { row: Row }) {
  return (
    <View
      className="flex-row items-center gap-3 rounded-2xl border-2 px-3 py-3"
      style={{ borderColor: row.isMe ? '#2F6BFF' : '#E4E8F0', backgroundColor: row.isMe ? 'rgba(47,107,255,0.08)' : 'transparent' }}>
      <Text className="w-7 text-center font-rounded text-lg font-black text-muted">{row.rank}</Text>
      <Avatar name={row.name} index={row.rank} />
      <View className="min-w-0 flex-1">
        <Text className={`text-base font-black ${row.isMe ? 'text-accent' : 'text-foreground'}`} numberOfLines={1}>
          {row.name}
        </Text>
        {row.streak > 0 ? (
          <View className="flex-row items-center gap-1">
            <FlameIcon size={13} />
            <Text className="text-xs font-bold text-muted">{row.streak}</Text>
          </View>
        ) : null}
      </View>
      <View className="flex-row items-center gap-1">
        <GemIcon size={18} />
        <Text className="text-base font-black text-foreground">{row.xp}</Text>
      </View>
    </View>
  );
}
