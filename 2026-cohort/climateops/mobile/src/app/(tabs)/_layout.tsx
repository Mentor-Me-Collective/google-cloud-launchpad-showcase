import AppTabs from '@/components/app-tabs';
import { usePrioritiesSync } from '@/features/priorities/hooks/use-priorities-sync';

export default function TabsLayout() {
  usePrioritiesSync();
  return <AppTabs />;
}
