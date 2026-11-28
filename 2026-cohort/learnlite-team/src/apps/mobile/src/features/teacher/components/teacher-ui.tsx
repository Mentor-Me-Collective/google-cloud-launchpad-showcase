import type Ionicons from '@expo/vector-icons/Ionicons';
import { useThemeColor } from 'heroui-native';
import type { ComponentProps, ReactNode } from 'react';
import { Text, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Lumi } from '@/components/lumi/lumi';
import { AppButton } from '@/components/app-button';
import { Pressable } from '@/components/pressable';
import { useCopy } from '@/lib/i18n';

import { ACTIVITY_META, type ActivityType, type Block } from '../types';
import { blockLabel, initials } from '../utils';

const AVATAR_COLORS = ['#2F6BFF', '#7C5CFF', '#FF8A1F', '#1CB0A8', '#E0559A', '#58CC02'];

function hash(text: string): number {
  let value = 0;
  for (const char of text) value = (value * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(value);
}

export function ChipSelect<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <AppButton
            key={option.value}
            label={option.label}
            variant={selected ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => onChange(option.value)}
          />
        );
      })}
    </View>
  );
}

type BadgeTone = 'accent' | 'success' | 'warning' | 'muted';

const BADGE_TONE: Record<BadgeTone, { bg: string; text: string }> = {
  accent: { bg: 'bg-accent/15', text: 'text-accent' },
  success: { bg: 'bg-success/15', text: 'text-success' },
  warning: { bg: 'bg-warning/20', text: 'text-warning' },
  muted: { bg: 'bg-surface-secondary', text: 'text-muted' },
};

export function StatusBadge({ label, tone = 'muted' }: { label: string; tone?: BadgeTone }) {
  const style = BADGE_TONE[tone];
  const copy = useCopy();
  return (
    <View className={`rounded-full px-2.5 py-1 ${style.bg}`}>
      <Text className={`text-[10px] font-black uppercase tracking-wide ${style.text}`}>{copy.t(label)}</Text>
    </View>
  );
}

export function Avatar({
  name,
  size = 44,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const fill = color ?? AVATAR_COLORS[hash(name) % AVATAR_COLORS.length];
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: fill }}>
      <View className="flex-1 items-center justify-center">
        <Text className="font-rounded font-black text-white" style={{ fontSize: Math.max(11, size * 0.36) }}>
          {initials(name)}
        </Text>
      </View>
    </View>
  );
}

export function StatCard({
  value,
  label,
  icon,
  color,
}: {
  value: string;
  label: string;
  icon: ReactNode;
  /** Colour of the number. */
  color?: string;
}) {
  return (
    <View
      className="min-w-0 flex-1 flex-row items-center gap-2 rounded-3xl border-2 border-border bg-background px-3 py-3"
      style={{ borderBottomWidth: 5 }}>
      <View className="size-11 items-center justify-center">{icon}</View>
      <View className="min-w-0 flex-1">
        <Text className="font-rounded text-2xl font-black leading-7 tabular-nums text-foreground" style={color ? { color } : undefined}>
          {value}
        </Text>
        <Text
          className="text-xs font-semibold leading-4 text-muted"
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}>
          {label}
        </Text>
      </View>
    </View>
  );
}

export function WeeklyChart({ values }: { values: number[] }) {
  const copy = useCopy();
  const days = copy.locale === 'es' ? ['L', 'M', 'M', 'J', 'V', 'S', 'D'] : ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const max = Math.max(...values, 1);

  return (
    <View className="h-32 flex-row items-end gap-2">
      {values.map((value, index) => (
        <View key={`${days[index]}-${index}`} className="flex-1 items-center justify-end gap-1.5">
          <View
            className={`w-full rounded-t-lg ${value > 0 ? 'bg-accent' : 'bg-border'}`}
            style={{ height: 8 + Math.round((value / max) * 86) }}
          />
          <Text className="text-[10px] font-bold text-muted">{days[index]}</Text>
        </View>
      ))}
    </View>
  );
}

export function ActivityTypeCard({
  type,
  onPress,
}: {
  type: ActivityType;
  onPress: () => void;
}) {
  const muted = useThemeColor('muted');
  const copy = useCopy();
  const meta = ACTIVITY_META[type];

  return (
    <Pressable
      onPress={onPress}
      className="flex-row items-center gap-3 rounded-2xl border border-border bg-surface p-3.5">
      <View
        className="size-11 items-center justify-center rounded-xl"
        style={{ backgroundColor: `${meta.tint}1F` }}>
        <Icon sf={meta.icon} md={meta.md} size={22} color={meta.tint} />
      </View>
      <View className="flex-1 gap-0.5">
        <Text className="text-base font-bold text-foreground">{copy.t(meta.label)}</Text>
        <Text className="text-sm text-muted">{copy.t(meta.short)}</Text>
      </View>
      <Icon sf="chevron.right" md="chevron-forward" size={18} color={muted} />
    </Pressable>
  );
}

const BLOCK_META: Record<
  'theory' | 'material' | 'link',
  { icon: ComponentProps<typeof Icon>['sf']; md: ComponentProps<typeof Ionicons>['name']; tint: string }
> = {
  theory: { icon: 'book.closed.fill', md: 'book', tint: '#2F6BFF' },
  material: { icon: 'doc.fill', md: 'document', tint: '#F08A24' },
  link: { icon: 'link', md: 'link', tint: '#3FB6E8' },
};

export function BlockRow({
  block,
  onPress,
  onRemove,
}: {
  block: Block;
  onPress: () => void;
  onRemove?: () => void;
}) {
  const muted = useThemeColor('muted');
  const warning = useThemeColor('warning');
  const copy = useCopy();
  const meta =
    block.kind === 'activity' && block.activityType
      ? ACTIVITY_META[block.activityType]
      : BLOCK_META[block.kind as 'theory' | 'material' | 'link'];

  return (
    <View className="flex-row items-center gap-2">
      <Pressable onPress={onPress} className="flex-1 flex-row items-center gap-3 py-3">
        <View
          className="size-10 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${meta.tint}1F` }}>
          <Icon sf={meta.icon} md={meta.md} size={19} color={meta.tint} />
        </View>
        <View className="flex-1 gap-0.5">
          <Text className="text-base font-semibold text-foreground" numberOfLines={1}>
            {block.title || copy.t('Untitled')}
          </Text>
          <Text className="text-xs text-muted">{copy.t(blockLabel(block))}</Text>
        </View>
        <Icon sf="chevron.right" md="chevron-forward" size={16} color={muted} />
      </Pressable>
      {onRemove ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={copy.t('Delete block')}
          onPress={onRemove}
          className="size-9 items-center justify-center rounded-full bg-warning/15">
          <Icon sf="trash" md="trash-outline" size={15} color={warning} />
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  title,
  message,
  icon,
}: {
  title: string;
  message: string;
  icon: ReactNode;
}) {
  return (
    <View className="items-center gap-2 rounded-3xl border-2 border-dashed border-border px-5 py-6">
      <Lumi size={92} mood="thinking" />
      <Text className="font-rounded text-lg font-black text-foreground">{title}</Text>
      <Text className="text-center text-sm font-semibold text-muted">{message}</Text>
    </View>
  );
}

/** Lays cards out two per row, each pair sharing the full width. */
export function StatGrid({ children }: { children: ReactNode[] }) {
  const items = children.filter(Boolean);
  const rows: ReactNode[][] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View className="gap-3">
      {rows.map((row, index) => (
        <View key={index} className="flex-row gap-3">
          {row}
        </View>
      ))}
    </View>
  );
}
