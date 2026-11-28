import { Redirect, router } from 'expo-router';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Text, useWindowDimensions, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import {
  BookIcon,
  CapIcon,
  CheckIcon,
  FlameIcon,
  GemIcon,
  HeartIcon,
  LessonBadgeIcon,
  MissionIcon,
  StarIcon,
  TrophyIcon,
} from '@/components/game/game-icons';
import { Lumi } from '@/components/lumi/lumi';
import { Pressable } from '@/components/pressable';
import { RaisedCard } from '@/components/raised';
import { useAuthStore } from '@/features/auth/store/auth-store';
import { LEARNER_NAME } from '@/features/learn/data/module1';
import { useLearnStore } from '@/features/learn/store/learn-store';
import { ChunkyButton } from '@/features/teacher/components/chunky-button';
import { useCopy } from '@/lib/i18n';

/** Soft colour of the blob behind each slide's illustration. */
const BLOBS = ['#DCE8FF', '#FFEBD1', '#FFE0E0', '#E6DDFF', '#D9F4E4'];

/**
 * First launch: five slides that show what LearnLite is about. Swipe or tap "Next"; everything
 * fits on one screen (no vertical scrolling), and the illustrations move with the finger.
 */
export default function WelcomeScreen() {
  const finishOnboarding = useLearnStore((s) => s.finishOnboarding);
  const authenticated = useAuthStore((s) => s.authenticated);
  const learnerName = useAuthStore((s) => s.name);

  if (!authenticated) return <Redirect href="/login" />;
  return (
    <WelcomeSlides
      name={firstName(learnerName) || LEARNER_NAME}
      onFinish={() => {
        finishOnboarding();
        router.replace('/');
      }}
    />
  );
}

export function WelcomeSlides({ name, onFinish }: { name: string; onFinish: () => void }) {
  const copy = useCopy();
  const { width, height } = useWindowDimensions();
  const scrollX = useSharedValue(0);
  const shownPage = useSharedValue(0);
  const [page, setPage] = useState(0);
  const pager = useRef<Animated.ScrollView>(null);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
    const next = Math.round(event.contentOffset.x / Math.max(width, 1));
    if (next !== shownPage.get()) {
      shownPage.set(next);
      scheduleOnRN(setPage, next);
    }
  });

  // The illustration grows with the screen but never pushes the text off a short phone.
  const art = Math.min(width * 0.78, height * 0.34, 330);

  const slides: { title: string; body: string; art: ReactNode }[] = [
    {
      title: copy.t('Hi {name}! I am Lumi', { name }),
      body: copy.t('I will learn with you. Pick any topic and master it in five-minute lessons.'),
      art: <HelloArt size={art} />,
    },
    {
      title: copy.t('Lessons that feel like a game'),
      body: copy.t('Choose, match, order, fill the blanks and sort. Every lesson mixes short theory with quick activities.'),
      art: <ActivitiesArt size={art} />,
    },
    {
      title: copy.t('Earn XP, keep your streak'),
      body: copy.t('Every right answer gives you XP. Learn a little each day to keep the flame alive, and learn from every mistake.'),
      art: <RewardsArt size={art} />,
    },
    {
      title: copy.t('Join your classroom'),
      body: copy.t('Enter your teacher’s code to get missions, see your progress and climb the classroom league.'),
      art: <ClassroomArt size={art} />,
    },
    {
      title: copy.t('Study without internet'),
      body: copy.t('Save a module on your phone and keep learning offline. Your progress is sent when you are back online.'),
      art: <OfflineArt size={art} />,
    },
  ];
  const last = page >= slides.length - 1;

  const finish = onFinish;
  const next = () => {
    if (last) finish();
    else pager.current?.scrollTo({ x: (page + 1) * width, animated: true });
  };

  return (
    <View className="flex-1 bg-background pb-safe-offset-4 pt-safe-offset-2">
      {/* Top bar: brand and skip */}
      <View className="h-12 flex-row items-center justify-between px-6">
        <Text className="font-rounded text-2xl font-black text-accent">LearnLite</Text>
        {last ? null : (
          <Pressable accessibilityRole="button" accessibilityLabel={copy.t('Skip')} onPress={finish} hitSlop={12}>
            <Text className="text-base font-black text-muted">{copy.t('Skip')}</Text>
          </Pressable>
        )}
      </View>

      <Animated.ScrollView
        ref={pager}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}>
        {slides.map((slide, index) => (
          <Slide key={index} index={index} scrollX={scrollX} width={width} art={art} title={slide.title} body={slide.body}>
            {slide.art}
          </Slide>
        ))}
      </Animated.ScrollView>

      {/* Dots and the main button stay put while the slides move. */}
      <View className="gap-5 px-6 pt-2">
        <View className="flex-row items-center justify-center gap-2">
          {slides.map((_, index) => (
            <Dot key={index} index={index} scrollX={scrollX} width={width} />
          ))}
        </View>
        <ChunkyButton label={last ? copy.t('Get started') : copy.t('Next')} uppercase onPress={next} />
      </View>
    </View>
  );
}

function Slide({
  index,
  scrollX,
  width,
  art,
  title,
  body,
  children,
}: {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  art: number;
  title: string;
  body: string;
  children: ReactNode;
}) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  // The picture slides slower than the page (parallax) and shrinks a little as it leaves.
  const picture = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), range, [0, 1, 0], 'clamp'),
    transform: [
      { translateX: interpolate(scrollX.get(), range, [width * 0.4, 0, -width * 0.4], 'clamp') },
      { scale: interpolate(scrollX.get(), range, [0.75, 1, 0.75], 'clamp') },
    ],
  }));
  const blob = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      scrollX.get(),
      BLOBS.map((_, i) => i * width),
      BLOBS,
    ),
    transform: [{ scale: interpolate(scrollX.get(), range, [0.6, 1, 0.6], 'clamp') }],
  }));
  const text = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.get(), range, [0, 1, 0], 'clamp'),
    transform: [{ translateY: interpolate(scrollX.get(), range, [24, 0, 24], 'clamp') }],
  }));

  return (
    <View style={{ width }} className="flex-1 items-center justify-center gap-6 px-7">
      <View style={{ width: art, height: art }} className="items-center justify-center">
        <Animated.View
          style={[{ position: 'absolute', width: art * 0.92, height: art * 0.92, borderRadius: art }, blob]}
        />
        <Animated.View style={[{ width: art, height: art, alignItems: 'center', justifyContent: 'center' }, picture]}>
          {children}
        </Animated.View>
      </View>
      <Animated.View style={text} className="items-center gap-2">
        <Text className="text-center font-rounded text-3xl font-black leading-9 text-foreground" numberOfLines={2} adjustsFontSizeToFit>
          {title}
        </Text>
        <Text className="text-center text-base font-semibold leading-6 text-muted" numberOfLines={4}>
          {body}
        </Text>
      </Animated.View>
    </View>
  );
}

function Dot({ index, scrollX, width }: { index: number; scrollX: SharedValue<number>; width: number }) {
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.get(), range, [8, 28, 8], 'clamp'),
    opacity: interpolate(scrollX.get(), range, [0.35, 1, 0.35], 'clamp'),
  }));
  return <Animated.View style={[{ height: 8, borderRadius: 4, backgroundColor: '#2F6BFF' }, style]} />;
}

/** Gently bobs its content up and down, forever (still when the person prefers less motion). */
function Float({ children, delay = 0, distance = 7, style }: { children: ReactNode; delay?: number; distance?: number; style?: ViewStyle }) {
  const reduced = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    const half = { duration: 1500, easing: Easing.inOut(Easing.sin) };
    y.set(withDelay(delay, withRepeat(withSequence(withTiming(-distance, half), withTiming(0, half)), -1)));
  }, [delay, distance, reduced, y]);
  const animated = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/* ---------- Illustrations, built from the app's own flat icons ---------- */

function HelloArt({ size }: { size: number }) {
  const s = size / 300;
  return (
    <View style={{ width: size, height: size }}>
      <Float style={{ position: 'absolute', left: size * 0.5 - 85 * s, top: size * 0.5 - 85 * s }}>
        <Lumi size={170 * s} mood="wave" />
      </Float>
      <Float delay={200} style={{ position: 'absolute', left: 18 * s, top: 46 * s }}>
        <GemIcon size={46 * s} />
      </Float>
      <Float delay={600} style={{ position: 'absolute', right: 22 * s, top: 30 * s }}>
        <StarIcon size={50 * s} />
      </Float>
      <Float delay={900} style={{ position: 'absolute', right: 30 * s, bottom: 40 * s }}>
        <FlameIcon size={46 * s} />
      </Float>
      <Float delay={400} style={{ position: 'absolute', left: 34 * s, bottom: 36 * s }}>
        <BookIcon size={44 * s} />
      </Float>
    </View>
  );
}

function MiniCard({ rotate, children, style }: { rotate: number; children: ReactNode; style?: ViewStyle }) {
  return (
    <View style={[{ transform: [{ rotate: `${rotate}deg` }] }, style]}>
      <RaisedCard face="#FFFFFF" edge="#D5DBE8" radius={18} depth={5} className="gap-2 p-3" style={{ width: 118 }}>
        {children}
      </RaisedCard>
    </View>
  );
}

function Bar({ color, wide = 1, children }: { color: string; wide?: number; children?: ReactNode }) {
  return (
    <View className="h-6 flex-row items-center justify-center rounded-lg" style={{ backgroundColor: color, width: `${wide * 100}%` }}>
      {children}
    </View>
  );
}

function ActivitiesArt({ size }: { size: number }) {
  const s = Math.min(1.15, size / 300);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', transform: [{ scale: s }] }}>
      {/* Choose: three options, one right */}
      <Float delay={0} style={{ position: 'absolute', left: 4, top: 54 }}>
        <MiniCard rotate={-10}>
          <Bar color="#EEF1F6" />
          <Bar color="#58CC02">
            <CheckIcon size={16} />
          </Bar>
          <Bar color="#EEF1F6" />
        </MiniCard>
      </Float>
      {/* Order: numbered steps */}
      <Float delay={500} style={{ position: 'absolute', top: 18 }}>
        <MiniCard rotate={0}>
          {['#4A86FF', '#7C5CFF', '#F49A2B'].map((color, i) => (
            <View key={color} className="flex-row items-center gap-2">
              <View className="size-6 items-center justify-center rounded-full" style={{ backgroundColor: color }}>
                <Text className="text-xs font-black text-white">{i + 1}</Text>
              </View>
              <View className="h-3 flex-1 rounded-full bg-[#EEF1F6]" />
            </View>
          ))}
        </MiniCard>
      </Float>
      {/* Match: pairs joined */}
      <Float delay={900} style={{ position: 'absolute', right: 4, top: 70 }}>
        <MiniCard rotate={10}>
          {['#FFD43B', '#8DDB5F', '#84C6FF'].map((color) => (
            <View key={color} className="flex-row items-center gap-1.5">
              <View className="h-5 flex-1 rounded-md" style={{ backgroundColor: color }} />
              <View className="h-0.5 w-3 bg-[#C4CBDA]" />
              <View className="h-5 flex-1 rounded-md" style={{ backgroundColor: color }} />
            </View>
          ))}
        </MiniCard>
      </Float>
      <Float delay={300} style={{ position: 'absolute', bottom: 18 }}>
        <Lumi size={96} mood="happy" />
      </Float>
    </View>
  );
}

function RewardsArt({ size }: { size: number }) {
  const s = size / 300;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Float distance={9}>
        <FlameIcon size={150 * s} />
      </Float>
      <Float delay={300} style={{ position: 'absolute', left: 16 * s, top: 70 * s }}>
        <Pill icon={<GemIcon size={30 * s} />} text="+10 XP" color="#E04848" scale={s} />
      </Float>
      <Float delay={700} style={{ position: 'absolute', right: 10 * s, top: 40 * s }}>
        <Pill icon={<FlameIcon size={28 * s} />} text="7" color="#E8871E" scale={s} />
      </Float>
      <Float delay={1000} style={{ position: 'absolute', right: 26 * s, bottom: 46 * s }}>
        <Pill icon={<HeartIcon size={28 * s} />} text="5" color="#FF4B6E" scale={s} />
      </Float>
      <Float delay={500} style={{ position: 'absolute', left: 30 * s, bottom: 40 * s }}>
        <TrophyIcon size={56 * s} />
      </Float>
    </View>
  );
}

function Pill({ icon, text, color, scale }: { icon: ReactNode; text: string; color: string; scale: number }) {
  return (
    <RaisedCard face="#FFFFFF" edge="#D5DBE8" radius={99} depth={4} className="flex-row items-center gap-1.5 py-1.5 pl-2 pr-3.5">
      {icon}
      <Text className="font-rounded font-black" style={{ color, fontSize: 20 * scale }}>
        {text}
      </Text>
    </RaisedCard>
  );
}

function ClassroomArt({ size }: { size: number }) {
  const s = size / 300;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Float distance={6}>
        <CapIcon size={140 * s} />
      </Float>
      <Float delay={400} style={{ position: 'absolute', right: 20 * s, top: 34 * s }}>
        <MissionIcon size={64 * s} />
      </Float>
      <Float delay={800} style={{ position: 'absolute', left: 14 * s, bottom: 52 * s }}>
        <RaisedCard face="#2F6BFF" edge="#214FC9" radius={16} depth={4} className="px-3 py-2">
          <Text className="font-mono font-black tracking-widest text-white" style={{ fontSize: 16 * s }}>
            LL-4F2K
          </Text>
        </RaisedCard>
      </Float>
      <Float delay={200} style={{ position: 'absolute', right: 30 * s, bottom: 40 * s }}>
        <TrophyIcon size={58 * s} />
      </Float>
    </View>
  );
}

function OfflineArt({ size }: { size: number }) {
  const s = size / 300;
  const phoneW = 128 * s;
  const phoneH = 210 * s;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Float distance={6}>
        <RaisedCard face="#2B3550" edge="#1A2136" radius={26 * s} depth={6} style={{ width: phoneW }} className="p-2">
          <View className="items-center justify-center gap-3 rounded-2xl bg-white" style={{ height: phoneH }}>
            <BookIcon size={62 * s} />
            <View className="h-2.5 w-3/5 overflow-hidden rounded-full bg-[#EEF1F6]">
              <View className="h-full w-4/5 rounded-full bg-[#58CC02]" />
            </View>
          </View>
        </RaisedCard>
      </Float>
      <Float delay={500} style={{ position: 'absolute', right: 34 * s, top: 46 * s }}>
        <LessonBadgeIcon size={60 * s} />
      </Float>
      <Float delay={900} style={{ position: 'absolute', left: 30 * s, bottom: 60 * s }}>
        <RaisedCard face="#FFFFFF" edge="#D5DBE8" radius={99} depth={4} className="flex-row items-center gap-1.5 px-3 py-1.5">
          <View className="size-2.5 rounded-full bg-[#AAB2C2]" />
          <Text className="font-black text-[#56648A]" style={{ fontSize: 14 * s }}>
            Offline
          </Text>
        </RaisedCard>
      </Float>
    </View>
  );
}

function firstName(name: string): string {
  const clean = name.includes('@') ? name.split('@')[0].split(/[.+_-]/)[0] : name;
  const first = clean.trim().split(/\s+/)[0] ?? '';
  return first ? first[0].toUpperCase() + first.slice(1) : '';
}
