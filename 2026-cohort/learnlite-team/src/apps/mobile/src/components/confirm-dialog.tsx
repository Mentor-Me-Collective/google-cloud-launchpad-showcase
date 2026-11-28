import { useThemeColor } from 'heroui-native';
import type { ComponentProps } from 'react';
import { Modal, Text, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { PlayfulIcon } from '@/components/icon';
import { RaisedTile, tint } from '@/components/raised';
import { edgeOf } from '@/features/student/progress';

type ConfirmDialogProps = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  /** Only tells something (no choice to make): shows a single button. On by default when both
   * labels are the same. */
  notice?: boolean;
  icon?: ComponentProps<typeof PlayfulIcon>['name'];
  onConfirm: () => void;
  onCancel: () => void;
};

/** The app's pop-up for confirmations and notices: a big raised icon on top, a centred title and
 * message, and chunky buttons, in the same playful language as the rest of LearnLite. */
// A short, calm entrance: a small grow and fade, with no bounce.
const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.94 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: Easing.out(Easing.cubic) },
}).duration(180);

export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  notice,
  icon = 'lightbulb-on-outline',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const accent = useThemeColor('accent');
  const single = notice ?? cancelLabel === confirmLabel;
  const tone = danger ? '#FF6B4A' : single ? '#58CC02' : accent.startsWith('#') && accent.length === 7 ? accent : '#2F6BFF';
  const iconName = single && icon === 'lightbulb-on-outline' ? 'check-circle-outline' : icon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View className="flex-1 items-center justify-center bg-black/50 px-6">
        {visible ? (
          <Animated.View entering={ENTER} className="w-full max-w-[400px]" style={{ paddingTop: 40 }}>
            <View className="items-center gap-4 rounded-[32px] border-2 border-border bg-background px-5 pb-5 pt-14" style={{ borderBottomWidth: 6 }}>
              {/* Soft halo behind the icon, for a bit of depth. */}
              <View
                pointerEvents="none"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 64, borderTopLeftRadius: 30, borderTopRightRadius: 30, backgroundColor: tint(tone, 0.9) }}
              />
              <View className="items-center gap-1.5">
                <Text className="text-center font-rounded text-2xl font-black leading-7 text-foreground">{title}</Text>
                {message ? <Text className="text-center text-base leading-6 text-muted">{message}</Text> : null}
              </View>

              <View className="w-full gap-2 pt-1">
                <AppButton
                  label={confirmLabel}
                  variant={danger ? 'danger' : single ? 'success' : 'primary'}
                  onPress={onConfirm}
                />
                {single ? null : <AppButton label={cancelLabel} variant="secondary" onPress={onCancel} />}
              </View>
            </View>

            {/* The icon sits half outside the card. */}
            <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' }}>
              <View className="rounded-[30px] bg-background p-2">
                <RaisedTile face={tone} edge={edgeOf(tone, 0.72)} size={72} radius={24} depth={5}>
                  <PlayfulIcon name={iconName} size={38} color="#FFFFFF" />
                </RaisedTile>
              </View>
            </View>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}
