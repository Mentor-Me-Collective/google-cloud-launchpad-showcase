import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Lumi } from '@/components/lumi/lumi';
import { RaisedTile } from '@/components/raised';
import { edgeOf } from '@/features/student/progress';

/** Soft bubbles behind the profile header, so the gradient does not look flat. */
function Bubbles() {
  const bubbles = [
    { size: 180, top: -70, left: -60, opacity: 0.1 },
    { size: 120, top: 40, right: -40, opacity: 0.08 },
    { size: 70, bottom: 30, left: 24, opacity: 0.1 },
    { size: 34, top: 70, left: 110, opacity: 0.14 },
    { size: 22, bottom: 70, right: 90, opacity: 0.16 },
  ];
  return (
    <>
      {bubbles.map(({ size, opacity, ...place }, index) => (
        <View
          key={index}
          pointerEvents="none"
          style={{ position: 'absolute', width: size, height: size, borderRadius: size / 2, backgroundColor: '#FFFFFF', opacity, ...place }}
        />
      ))}
    </>
  );
}

/**
 * The header shared by the student and teacher profiles: a gradient with soft bubbles, a big
 * avatar with a role badge, the name, small chips and an optional card underneath (the student's
 * level, the teacher's summary).
 */
export function ProfileHero({
  title,
  name,
  initials,
  badge,
  chips,
  colors = ['#4A86FF', '#2F5BE0'],
  footer,
}: {
  title: string;
  name: string;
  initials: string;
  badge: ReactNode;
  chips: string[];
  colors?: [string, string];
  footer?: ReactNode;
}) {
  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ overflow: 'hidden', paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: 36, borderBottomRightRadius: 36 }}>
      <Bubbles />
      <View className="pt-safe-offset-3">
        <Text className="font-rounded text-3xl font-black text-white">{title}</Text>
      </View>

      <View className="mt-3 items-center gap-3">
        <View className="h-32 w-full items-center justify-center">
          <View className="size-32 items-center justify-center rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.22)' }}>
            <View className="size-[108px] items-center justify-center rounded-full bg-white" style={{ borderWidth: 4, borderColor: '#FFD43B' }}>
              <Text className="font-rounded text-4xl font-black text-accent">{initials}</Text>
            </View>
          </View>
          {/* Role badge on the avatar's lower right. */}
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: 30 }}>
            {badge}
          </View>
          <View pointerEvents="none" style={{ position: 'absolute', right: -4, bottom: -8 }}>
            <Lumi size={72} mood="happy" />
          </View>
        </View>

        <View className="w-full items-center gap-2 px-2">
          <Text
            className="text-center font-rounded text-2xl font-black leading-7 text-white"
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}>
            {name}
          </Text>
          <View className="flex-row flex-wrap items-center justify-center gap-2">
            {chips.filter(Boolean).map((chip, index) => (
              <View key={chip} className={`max-w-full rounded-full px-3 py-1 ${index === 0 ? 'bg-white' : 'bg-white/20'}`}>
                <Text
                  className={`text-xs ${index === 0 ? 'font-black uppercase tracking-wide text-accent' : 'font-bold text-white'}`}
                  numberOfLines={1}>
                  {chip}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {footer ? <View className="mt-1 w-full">{footer}</View> : null}
      </View>
    </LinearGradient>
  );
}

/** A see-through card inside the header, for the level bar or a short summary. */
export function HeroCard({ children }: { children: ReactNode }) {
  return (
    <View className="gap-2 rounded-3xl px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.28)' }}>
      {children}
    </View>
  );
}

/** A white progress bar for the header (the level). */
export function HeroProgress({ percent }: { percent: number }) {
  return (
    <View className="h-3 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.25)' }}>
      <View className="h-full rounded-full" style={{ width: `${Math.max(4, Math.min(100, percent))}%`, backgroundColor: '#FFD43B' }} />
    </View>
  );
}

/** A small round badge for the avatar (the role icon). */
export function AvatarBadge({ color, children }: { color: string; children: ReactNode }) {
  return (
    <RaisedTile face={color} edge={edgeOf(color, 0.7)} size={38} radius={19} depth={3}>
      {children}
    </RaisedTile>
  );
}

/** One profile metric: a big flat icon next to the number, and the label underneath across the
 * whole card, so long words like "Classrooms" never break in the middle. */
export function StatTile({ icon, value, label, color }: { icon: ReactNode; value: number | string; label: string; color: string }) {
  return (
    <View className="flex-1 gap-2 rounded-3xl border-2 border-border bg-background px-4 py-3.5" style={{ borderBottomWidth: 5 }}>
      <View className="flex-row items-center gap-2.5">
        {icon}
        <Text className="min-w-0 flex-1 font-rounded text-3xl font-black leading-9" style={{ color }} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
          {value}
        </Text>
      </View>
      <Text className="text-sm font-bold text-muted" numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {label}
      </Text>
    </View>
  );
}
