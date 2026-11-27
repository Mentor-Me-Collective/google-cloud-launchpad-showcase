import { View } from 'react-native';

/** Solid band under the clock and battery so scrolled content never shows through. */
export function StatusBarStrip() {
  return <View className="absolute inset-x-0 top-0 pt-safe bg-background" />;
}
