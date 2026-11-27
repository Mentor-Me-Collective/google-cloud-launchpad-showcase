import type { ImageSourcePropType } from 'react-native';
import { Text, View } from 'react-native';

import { Chevron } from '@/components/chevron';
import { Image } from '@/components/image';
import { Pressable } from '@/components/pressable';

type PenguinBannerProps = {
  art: ImageSourcePropType;
  title: string;
  subtitle: string;
  trailingArt?: ImageSourcePropType;
  onPress?: () => void;
};

/** The pale-blue mascot banner from the picked design. */
export function PenguinBanner({ art, title, subtitle, trailingArt, onPress }: PenguinBannerProps) {
  const body = (
    <View className="flex-row items-center rounded-2xl bg-banner overflow-hidden h-16 pr-4 gap-3">
      <Image source={art} className="h-16 w-16" contentFit="contain" />
      <View className="flex-1 gap-0.5">
        <Text className="text-[16px] font-semibold text-accent" numberOfLines={1}>
          {title}
        </Text>
        <Text className="text-[12px] text-muted" numberOfLines={2}>
          {subtitle}
        </Text>
      </View>
      {trailingArt ? <Image source={trailingArt} className="h-16 w-28" contentFit="cover" /> : null}
      {onPress && !trailingArt ? <Chevron /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title}>
      {body}
    </Pressable>
  );
}
