import { useThemeColor } from 'heroui-native';
import { memo, startTransition, useCallback, useEffect, useRef, useState, type ComponentType } from 'react';
import { View } from 'react-native';
import PagerView from 'react-native-pager-view';
import Animated, { Easing, interpolate, type SharedValue, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Pressable, pressHaptic } from '@/components/pressable';
import { PageActiveContext, useTabStore } from '@/lib/tab-store';

export type PagerTab = {
  name: string;
  label: string;
  /** A coloured, illustrated icon (see game-icons). */
  Icon: ComponentType<{ size?: number }>;
  Screen: ComponentType;
};

const BAR_HEIGHT = 62;

/**
 * The tabs as pages of a pager: the finger drags the current screen out and the next one comes
 * in under it, like turning a page. Screens are mounted only once they are next to the page
 * being shown, so opening the app does not build all of them at the same time.
 */
export function TabsPager({ tabs, initialName }: { tabs: PagerTab[]; initialName: string }) {
  const insets = useSafeAreaInsets();
  const background = useThemeColor('background');
  const surface = useThemeColor('surface');
  const pager = useRef<PagerView>(null);
  const start = Math.max(0, tabs.findIndex((tab) => tab.name === initialName));
  const [selected, setSelected] = useState(start);
  const position = useSharedValue(start);

  // The highlight follows the page the pager reports as selected, and nothing else. An earlier
  // version tracked the raw scroll events, and a stale or out-of-order one could leave the
  // wrong tab lit (Profile while moving to Classrooms). Driving it from one value that always
  // ends on the selected page makes that impossible.
  //
  // The highlight moves FIRST, on the UI thread, the moment the pager picks the page. Only then
  // does React render, at low priority: mounting the next screen is heavy, and when the
  // highlight waited for that render it lit up about two seconds late.
  const shown = useRef(start);
  const select = useCallback(
    (index: number) => {
      if (shown.current === index) return;
      shown.current = index;
      position.set(withTiming(index, { duration: 180, easing: Easing.out(Easing.cubic) }));
      const name = tabs[index]?.name;
      if (name) useTabStore.getState().setCurrent(name);
      pressHaptic();
      startTransition(() => setSelected(index));
    },
    [position, tabs],
  );

  // Another screen asked for a tab (for example "Join a classroom" on the home screen).
  const requested = useTabStore((state) => state.requested);
  // A request left over from an earlier session must not move a freshly mounted pager.
  const handled = useRef(requested?.n ?? 0);
  useEffect(() => {
    if (!requested || requested.n === handled.current) return;
    handled.current = requested.n;
    const index = tabs.findIndex((tab) => tab.name === requested.name);
    if (index !== -1) pager.current?.setPage(index);
  }, [requested, tabs]);

  return (
    <View style={{ flex: 1, backgroundColor: background }}>
      <PagerView
        ref={pager}
        style={{ flex: 1 }}
        initialPage={start}
        overScrollMode="never"
        offscreenPageLimit={1}
        onPageSelected={(event) => select(event.nativeEvent.position)}>
        {tabs.map((tab, index) => (
          <View key={tab.name} style={{ flex: 1 }} collapsable={false}>
            {Math.abs(index - selected) <= 1 ? (
              <PageActiveContext.Provider value={index === selected}>
                <tab.Screen />
              </PageActiveContext.Provider>
            ) : null}
          </View>
        ))}
      </PagerView>

      <View
        pointerEvents="box-none"
        style={{ position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: surface, paddingBottom: insets.bottom }}>
        <TabBar
          tabs={tabs}
          position={position}
          onPress={(index) => {
            // Light the tab on the tap itself, then let the pager slide there.
            select(index);
            pager.current?.setPage(index);
          }}
        />
      </View>
    </View>
  );
}

function TabBar({
  tabs,
  position,
  onPress,
}: {
  tabs: PagerTab[];
  position: SharedValue<number>;
  onPress: (index: number) => void;
}) {
  const [width, setWidth] = useState(0);
  const border = useThemeColor('border');
  const slot = width / tabs.length;
  // A rounded box behind the active tab that slides from tab to tab.
  const box = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * slot }] }));

  return (
    <View
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      style={{ height: BAR_HEIGHT, flexDirection: 'row', borderTopWidth: 2, borderTopColor: border }}>
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[{ position: 'absolute', top: 6, bottom: 6, left: 0, width: slot, alignItems: 'center' }, box]}>
          <View style={{ flex: 1, width: Math.min(slot - 16, 64), borderRadius: 16, borderWidth: 2, borderColor: '#84C6FF', backgroundColor: 'rgba(132,198,255,0.18)' }} />
        </Animated.View>
      ) : null}
      {tabs.map((tab, index) => (
        <TabButton key={tab.name} tab={tab} index={index} position={position} onPress={onPress} />
      ))}
    </View>
  );
}

const TabButton = memo(function TabButton({
  tab,
  index,
  position,
  onPress,
}: {
  tab: PagerTab;
  index: number;
  position: SharedValue<number>;
  onPress: (index: number) => void;
}) {
  // The active icon is a bit bigger and fully opaque; the others rest slightly faded.
  const icon = useAnimatedStyle(() => {
    const on = interpolate(position.get(), [index - 1, index, index + 1], [0, 1, 0], 'clamp');
    return { opacity: 0.55 + on * 0.45, transform: [{ scale: 0.92 + on * 0.12 }] };
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityLabel={tab.label}
      onPress={() => onPress(index)}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={icon}>
        <tab.Icon size={34} />
      </Animated.View>
    </Pressable>
  );
});
