import { router } from 'expo-router';
import { useThemeColor } from 'heroui-native';
import type { ReactNode } from 'react';
import { Text, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { PlayfulIcon } from '@/components/icon';
import { Fonts } from '@/constants/theme';
import { useCopy } from '@/lib/i18n';

type TeacherHeaderProps = {
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  back?: boolean;
  right?: ReactNode;
};

export function TeacherHeader({ title, subtitle, badge, back, right }: TeacherHeaderProps) {
  const foreground = useThemeColor('foreground');
  const copy = useCopy();

  return (
    <View className="flex-row items-center gap-3 px-5 pb-3 pt-safe-offset-3">
      {back ? (
        <AppButton
          label={copy.t('Back')}
          iconOnly
          flat
          variant="secondary"
          size="sm"
          icon={<PlayfulIcon name="arrow-left" size={22} color={foreground} />}
          onPress={() => router.back()}
        />
      ) : null}
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <Text className="text-2xl font-black text-foreground" style={{ fontFamily: Fonts?.rounded }} numberOfLines={1}>
            {copy.t(title)}
          </Text>
          {badge}
        </View>
        {subtitle ? (
          <Text className="text-sm font-semibold text-muted" numberOfLines={1}>
            {copy.t(subtitle)}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
}
