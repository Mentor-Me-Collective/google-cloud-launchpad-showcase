import type { FacilityFilter } from '@/features/facilities/types/facility';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { PenguinBanner } from '@/components/penguin-banner';
import { Pressable } from '@/components/pressable';
import { SearchField } from '@/components/search-field';
import { StatCell } from '@/components/stat-cell';
import { StatusBarStrip } from '@/components/status-bar-strip';
import { Palette } from '@/constants/theme';
import { FacilityCard } from '@/features/facilities/components/facility-card';
import { HeatAlertPill } from '@/features/facilities/components/heat-alert-pill';
import { SectionHeader } from '@/features/facilities/components/section-header';
import { SyncState } from '@/features/facilities/components/sync-state';
import { SORT_LABELS, useFacilitiesScreen } from '@/features/facilities/hooks/use-facilities-screen';
import { fadeIn, reflow } from '@/lib/motion';

function Dot({ className }: { className: string }) {
  return <View className={`size-2.5 rounded-full ${className}`} />;
}

const LIST_TITLE: Record<FacilityFilter, string> = {
  all: 'All Facilities',
  'ac-on': 'AC working',
  'ac-down': 'AC down',
  real: 'Real facilities',
  demo: 'Demo facilities',
};

export default function FacilitiesScreen() {
  const { visible, counts, query, setQuery, filter, setFilter, sort, cycleSort } = useFacilitiesScreen();

  return (
    <View className="flex-1 bg-background">
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="px-4 pt-safe-offset-2 pb-safe-offset-22 gap-4"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="flex-row items-center justify-between gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-[26px] font-bold text-foreground">Facilities</Text>
          <Text className="text-[12px] text-muted" numberOfLines={1}>
            {counts.all} buildings • Keeping South Bronx cool
          </Text>
        </View>
        <HeatAlertPill />
      </View>

      <View className="flex-row items-center gap-2">
        <SearchField value={query} onChangeText={setQuery} placeholder="Search facilities, addresses, or neighborhoods" />
        <Pressable
          onPress={cycleSort}
          accessibilityRole="button"
          accessibilityLabel={`Sort by, now ${SORT_LABELS[sort]}`}
          className="size-11 rounded-xl bg-frost items-center justify-center"
        >
          <Icon sf="slider.horizontal.3" ion="options" size={18} color={Palette.accent} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="px-4 gap-2">
        <Chip label={`All (${counts.all})`} active={filter === 'all'} onPress={() => setFilter('all')} />
        <Chip label={`AC on (${counts.acOn})`} active={filter === 'ac-on'} onPress={() => setFilter('ac-on')} leading={<Dot className="bg-success" />} />
        <Chip label={`AC down (${counts.acDown})`} active={filter === 'ac-down'} onPress={() => setFilter('ac-down')} leading={<Dot className="bg-danger" />} />
        <Chip
          label={`Real (${counts.real})`}
          active={filter === 'real'}
          onPress={() => setFilter('real')}
          leading={<Icon sf="building.2" ion="business" size={13} color={filter === 'real' ? Palette.white : Palette.navy} />}
        />
        <Chip
          label={`Demo (${counts.demo})`}
          active={filter === 'demo'}
          onPress={() => setFilter('demo')}
          leading={<Icon sf="flask" ion="flask" size={13} color={filter === 'demo' ? Palette.white : Palette.navy} />}
        />
      </ScrollView>

      <PenguinBanner
        art={require('@/assets/images/art/penguin-wave.png')}
        trailingArt={require('@/assets/images/art/city.png')}
        title="Every building matters"
        subtitle="Comfortable communities start with working AC."
      />

      <OpsCard>
        <Text className="text-[18px] font-bold text-foreground">Portfolio at a glance</Text>
        <View className="flex-row">
          <StatCell icon={<Icon sf="building.2" ion="business" size={20} color={Palette.accent} />} value={`${counts.all}`} label="Total facilities" />
          <View className="w-px bg-border" />
          <StatCell icon={<Dot className="bg-success size-3" />} value={`${counts.acOn}`} label="AC working" />
          <View className="w-px bg-border" />
          <StatCell icon={<Icon sf="person.3.fill" ion="people" size={20} color={Palette.accent} />} value={`${counts.people}`} label="People inside" />
          <View className="w-px bg-border" />
          <StatCell icon={<Icon sf="snowflake" ion="snow" size={20} color={Palette.accent} />} value={`${counts.vulnerable}`} label="Serve vulnerable" />
        </View>
      </OpsCard>

      <SectionHeader
        title={LIST_TITLE[filter]}
        trailing={
          <Pressable onPress={cycleSort} accessibilityRole="button" className="flex-row items-center gap-1.5 rounded-xl bg-frost px-3 h-9">
            <Icon sf="arrow.up.arrow.down" ion="swap-vertical" size={13} color={Palette.accent} />
            <Text className="text-[13px] font-semibold text-accent">{SORT_LABELS[sort]}</Text>
          </Pressable>
        }
      />
      <SyncState />
      {visible.length === 0 && counts.all > 0 ? (
        <OpsCard>
          <Text className="text-[14px] text-foreground">No buildings match “{query || 'this filter'}”.</Text>
          <Pressable
            onPress={() => {
              setQuery('');
              setFilter('all');
            }}
            accessibilityRole="button"
            className="self-start"
          >
            <Text className="text-[14px] font-semibold text-accent">Clear search</Text>
          </Pressable>
        </OpsCard>
      ) : null}
      {visible.map((f) => (
        <Animated.View key={f.facility_id} entering={fadeIn} layout={reflow}>
          <FacilityCard facility={f} />
        </Animated.View>
      ))}
    </ScrollView>
    <StatusBarStrip />
    </View>
  );
}
