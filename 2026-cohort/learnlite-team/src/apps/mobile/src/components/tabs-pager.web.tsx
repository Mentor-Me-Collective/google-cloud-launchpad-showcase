import type { ComponentProps, ComponentType } from 'react';

import type { Icon } from '@/components/icon';

export type PagerTab = {
  name: string;
  label: string;
  sf: ComponentProps<typeof Icon>['sf'];
  md: ComponentProps<typeof Icon>['md'];
  Screen: ComponentType;
};

/** The pager is native-only (the web keeps its own tab bar), so there is nothing to show here. */
export function TabsPager(_props: { tabs: PagerTab[]; initialName: string }) {
  return null;
}
