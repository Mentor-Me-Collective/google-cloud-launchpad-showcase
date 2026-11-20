import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { Palette } from '@/constants/theme';

export default function AppTabs() {
  // `disableAutomaticContentInsets` on every Trigger: the screens' safe-area utility
  // classes are the one inset mechanism.
  return (
    <NativeTabs backgroundColor={Palette.white} tintColor={Palette.accent}>
      <NativeTabs.Trigger name="index" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="house.fill" md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="facilities" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Facilities</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="building.2" md="apartment" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="map" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Map</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="map" md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="priorities" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Priorities</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="list.number" md="format_list_numbered" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="alerts" disableAutomaticContentInsets>
        <NativeTabs.Trigger.Label>Alerts</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="bell" md="notifications" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
