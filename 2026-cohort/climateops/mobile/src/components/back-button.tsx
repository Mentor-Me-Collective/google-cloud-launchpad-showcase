import { router } from 'expo-router';

import { Icon } from '@/components/icon';
import { Pressable } from '@/components/pressable';
import { Palette } from '@/constants/theme';

export function BackButton() {
  return (
    <Pressable
      onPress={() => router.back()}
      accessibilityRole="button"
      accessibilityLabel="Back"
      className="size-10 rounded-full bg-surface items-center justify-center"
    >
      <Icon sf="chevron.left" ion="chevron-back" size={17} color={Palette.navy} />
    </Pressable>
  );
}
