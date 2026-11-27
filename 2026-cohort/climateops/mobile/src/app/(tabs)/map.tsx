import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Chevron } from '@/components/chevron';
import { Chip } from '@/components/chip';
import { Icon } from '@/components/icon';
import { OpsCard } from '@/components/ops-card';
import { PenguinBanner } from '@/components/penguin-banner';
import { Pill } from '@/components/pill';
import { Pressable } from '@/components/pressable';
import { StatusBarStrip } from '@/components/status-bar-strip';
import { Palette } from '@/constants/theme';
import { FacilityCard } from '@/features/facilities/components/facility-card';
import { OpsHeader } from '@/features/facilities/components/ops-header';
import { SectionHeader } from '@/features/facilities/components/section-header';
import { SyncState } from '@/features/facilities/components/sync-state';
import { acWorking, formatUpdated, isDemo } from '@/features/facilities/utils/facility-derive';
import { DistrictMap } from '@/features/map/components/district-map';
import { useMapScreen } from '@/features/map/hooks/use-map-screen';
import { fadeIn, fadeOut, reflow } from '@/lib/motion';

function ZoomButton({ sf, ion, label, onPress, enabled }: { sf: "plus" | "minus"; ion: "add" | "remove"; label: string; onPress: () => void; enabled: boolean }) {
  return (
    <Pressable onPress={onPress} isDisabled={!enabled} accessibilityRole="button" accessibilityLabel={label} className="size-11 items-center justify-center">
      <Icon sf={sf} ion={ion} size={20} color={enabled ? Palette.navy : Palette.border} />
    </Pressable>
  );
}

export default function MapScreen() {
  const m = useMapScreen();

  return (
    <View className="flex-1 bg-background">
    <ScrollView className="flex-1 bg-background" contentContainerClassName="px-4 pt-safe-offset-2 pb-safe-offset-22 gap-4">
      <OpsHeader />
      <PenguinBanner
        art={require('@/assets/images/art/penguin.png')}
        title="Find a cooler, safer South Bronx"
        subtitle="Tap a snowflake for a building's status and heat risk."
      />

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4" contentContainerClassName="px-4 gap-2">
        <Chip
          label="Heat vulnerability"
          active={m.heatLayer}
          onPress={m.toggleHeatLayer}
          leading={<Icon sf="square.3.layers.3d" ion="layers" size={13} color={m.heatLayer ? Palette.white : Palette.navy} />}
        />
        <Chip label="AC on" active={m.acOnly} onPress={m.toggleAcOnly} leading={<View className="size-2.5 rounded-full bg-success" />} />
        <Chip
          label={m.scopeLabel}
          active={m.scope !== 'all'}
          onPress={m.cycleScope}
          leading={<Icon sf="building.2" ion="business" size={13} color={m.scope !== 'all' ? Palette.white : Palette.navy} />}
        />
      </ScrollView>

      <View className="h-96 rounded-2xl overflow-hidden border border-border bg-surface">
        <DistrictMap facilities={m.visible} selectedID={m.selected?.facility_id ?? null} onSelect={m.select} heatLayer={m.heatLayer} zoom={m.zoom} />

        {m.heatLayer ? (
          <View className="absolute top-3 left-3 w-44 rounded-xl bg-surface/95 p-3 gap-1.5">
            <Text className="text-[12px] font-semibold text-foreground">Heat vulnerability</Text>
            <View className="flex-row h-2 rounded-full overflow-hidden">
              <View className="flex-1 bg-heat/50" />
              <View className="flex-1 bg-warning/50" />
              <View className="flex-1 bg-danger/50" />
              <View className="flex-1 bg-danger/80" />
            </View>
            <View className="flex-row justify-between">
              <Text className="text-[9px] text-muted">Low</Text>
              <Text className="text-[9px] text-muted">Very high</Text>
            </View>
          </View>
        ) : null}

        <View className="absolute top-3 right-3 rounded-xl bg-surface/95">
          <ZoomButton sf="plus" ion="add" label="Zoom in" onPress={m.zoomIn} enabled={m.canZoomIn} />
          <View className="h-px bg-border" />
          <ZoomButton sf="minus" ion="remove" label="Zoom out" onPress={m.zoomOut} enabled={m.canZoomOut} />
        </View>

        {m.selected ? (
          <Animated.View key={m.selected.facility_id} entering={fadeIn} exiting={fadeOut} className="absolute bottom-3 left-3 right-3">
            <Pressable
              onPress={() => router.push({ pathname: '/facility/[id]', params: { id: m.selected?.facility_id ?? '' } })}
              accessibilityRole="button"
              className="flex-row items-center gap-3 rounded-xl bg-surface p-3"
            >
              <View className={acWorking(m.selected) ? 'size-9 rounded-full bg-accent items-center justify-center' : 'size-9 rounded-full bg-muted items-center justify-center'}>
                <Icon sf="snowflake" ion="snow" size={18} color={Palette.white} />
              </View>
              <View className="flex-1 gap-0.5">
                <Text className="text-[14px] font-semibold text-foreground" numberOfLines={1}>
                  {m.selected.name}
                </Text>
                <Text className="text-[11px] text-muted" numberOfLines={1}>
                  {acWorking(m.selected) ? 'AC on' : 'AC down'} · {m.selected.neighborhood} · {formatUpdated(m.selected.status_updated_at)}
                </Text>
              </View>
              <Pill label={isDemo(m.selected) ? 'Demo' : 'Real'} tone={isDemo(m.selected) ? 'demo' : 'accent'} />
              <Chevron />
            </Pressable>
          </Animated.View>
        ) : (
          <View className="absolute bottom-3 left-3 rounded-full bg-surface/95 px-3 py-1.5 flex-row items-center gap-1.5">
            <View className="size-2.5 rounded-full bg-accent" />
            <Text className="text-[10px] text-foreground">AC on</Text>
            <View className="size-2.5 rounded-full bg-muted" />
            <Text className="text-[10px] text-foreground">AC down</Text>
          </View>
        )}
      </View>
      <Text className="text-[10px] text-muted">Drawn district map. Pins use each building’s recorded coordinates; heat zones are illustrative.</Text>

      <SectionHeader title="Buildings on the map" trailing={<Pill label={`${m.visible.length} shown`} tone="accent" />} />
      <SyncState />
      {m.visible.length === 0 ? (
        <OpsCard>
          <Text className="text-[14px] text-foreground">No buildings match these filters.</Text>
        </OpsCard>
      ) : null}
      {m.visible.map((f) => (
        <Animated.View key={f.facility_id} entering={fadeIn} layout={reflow}>
          <FacilityCard facility={f} />
        </Animated.View>
      ))}
    </ScrollView>
    <StatusBarStrip />
    </View>
  );
}
