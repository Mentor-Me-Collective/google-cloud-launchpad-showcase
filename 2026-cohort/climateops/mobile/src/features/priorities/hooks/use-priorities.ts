import { useRef, useState } from 'react';
import type { LayoutChangeEvent, NativeScrollEvent, NativeSyntheticEvent, ScrollView } from 'react-native';

import { useHeatAlertStore } from '@/features/heat-alert/store/heat-alert-store';
import { usePrioritiesStore } from '@/features/priorities/store/priorities-store';

// Room the floating tab bar and home indicator take at the bottom of the screen.
const TAB_BAR_CLEARANCE = 132;

/** The Priorities screen: the server ranking, one expanded row, and keeping that row's buttons in view. */
export function usePriorities() {
  const useSample = useHeatAlertStore((s) => s.useSample);
  const { result, loading, error, load } = usePrioritiesStore();
  const [expanded, setExpanded] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const scrollY = useRef(0);
  const viewportHeight = useRef(0);
  const listY = useRef(0);

  // A cached ranking from the other alert source would be misleading, so hide it until the new one lands.
  const current = result && result.sample === useSample ? result : null;

  // When the opened row grows, scroll just far enough that its bottom (the "Open facility" button) clears the tab bar.
  const onRowLayout = (id: string) => (e: LayoutChangeEvent) => {
    if (id !== expanded) return;
    const { y, height } = e.nativeEvent.layout;
    const rowBottom = listY.current + y + height;
    const visibleBottom = scrollY.current + viewportHeight.current - TAB_BAR_CLEARANCE;
    if (rowBottom <= visibleBottom) return;
    scrollRef.current?.scrollTo({ y: rowBottom - viewportHeight.current + TAB_BAR_CLEARANCE, animated: true });
  };

  return {
    result: current,
    loading,
    error,
    refresh: () => load(useSample),
    expanded,
    toggle: (id: string) => setExpanded((open) => (open === id ? null : id)),
    scrollRef,
    onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      scrollY.current = e.nativeEvent.contentOffset.y;
    },
    onViewportLayout: (e: LayoutChangeEvent) => {
      viewportHeight.current = e.nativeEvent.layout.height;
    },
    onListLayout: (e: LayoutChangeEvent) => {
      listY.current = e.nativeEvent.layout.y;
    },
    onRowLayout,
  };
}
