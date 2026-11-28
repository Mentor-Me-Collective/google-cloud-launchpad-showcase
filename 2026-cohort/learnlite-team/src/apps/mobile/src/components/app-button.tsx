import { useThemeColor } from 'heroui-native';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Text, View } from 'react-native';

import { Fonts } from '@/constants/theme';
import { Pressable } from '@/components/pressable';

export type AppButtonVariant = 'primary' | 'secondary' | 'dark' | 'danger' | 'success';

type AppButtonProps = {
  label: string;
  onPress: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  variant?: AppButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  uppercase?: boolean;
  iconOnly?: boolean;
  /** Circular utility controls can opt out of the chunky lower edge. */
  flat?: boolean;
  className?: string;
  /** Game moments only (answer feedback): a fixed face/label colour instead of a theme variant. */
  colors?: { face: string; label: string; edge?: string };
};

/** The single action-button language used across LearnLite.
 * Text actions use a real lower layer (not a CSS shadow): it stays crisp on
 * native and web, then the face settles down when pressed. Small circular
 * utility controls can opt into the flatter treatment with `flat`. */
export function AppButton({
  label,
  onPress,
  icon,
  disabled,
  variant = 'primary',
  size = 'md',
  uppercase = false,
  iconOnly = false,
  flat = false,
  className,
  colors,
}: AppButtonProps) {
  const accent = useThemeColor('accent');
  const accentForeground = useThemeColor('accent-foreground');
  const background = useThemeColor('background');
  const border = useThemeColor('border');
  const foreground = useThemeColor('foreground');
  const surface = useThemeColor('surface');
  const success = useThemeColor('success');
  const successForeground = useThemeColor('success-foreground');
  const warning = useThemeColor('warning');
  const warningForeground = useThemeColor('warning-foreground');
  const [pressed, setPressed] = useState(false);

  const themed = {
    primary: { face: accent, edge: shade(accent), label: accentForeground },
    secondary: { face: surface, edge: border, label: foreground },
    dark: { face: foreground, edge: shade(foreground), label: background },
    danger: { face: warning, edge: shade(warning), label: warningForeground },
    success: { face: success, edge: shade(success), label: successForeground },
  }[variant];
  // A disabled button is NOT dimmed with opacity: the face and its raised edge are two stacked
  // layers, and phones fade each layer on its own, so the edge shows through the face. It gets
  // solid "locked" colours instead, like a game's greyed-out button.
  const isLight = background.toLowerCase() === '#ffffff';
  const locked = isLight
    ? { face: '#E5E5E5', edge: '#CDCDCD', label: '#A5A5A5' }
    : { face: '#223A72', edge: '#162A58', label: '#6B7EAD' };
  const palette = disabled
    ? locked
    : colors
      ? { face: colors.face, edge: colors.edge ?? shade(colors.face), label: colors.label }
      : themed;
  const dimensions = {
    sm: { face: 44, radius: 18, padding: 16, text: 'text-sm', depth: 5 },
    md: { face: 58, radius: 21, padding: 20, text: 'text-base', depth: 8 },
    lg: { face: 66, radius: 24, padding: 24, text: 'text-lg', depth: 9 },
  }[size];
  // The raised edge is the same shape as the face, shifted down. A thick edge under a small pill or
  // circle reads as two overlapping circles, so small and round buttons get a thinner one.
  const depth = flat ? 0 : iconOnly ? Math.min(dimensions.depth, 5) : dimensions.depth;
  const faceRadius = iconOnly ? dimensions.face / 2 : dimensions.radius;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      isDisabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      className={className ?? ''}>
      <View className="relative" style={{ paddingBottom: depth, position: 'relative' }}>
        {/* The base is a complete button shape shifted down. The face covers
            its top and sides, leaving only the lower raised edge visible. */}
        {!flat ? (
          <View
            pointerEvents="none"
            style={{
              backgroundColor: palette.edge,
              borderRadius: faceRadius,
              bottom: 0,
              left: 0,
              position: 'absolute',
              right: 0,
              top: depth,
            }}
          />
        ) : null}
        <View
          className="flex-row items-center justify-center gap-2"
          style={{
            backgroundColor: palette.face,
            borderRadius: faceRadius,
            // Icon buttons are a fixed circle. Text buttons are a MINIMUM height so a long label
            // wraps onto more lines and the button grows, instead of spilling out of a fixed box.
            ...(iconOnly ? { height: dimensions.face } : { minHeight: dimensions.face, paddingVertical: 10 }),
            paddingHorizontal: iconOnly ? 0 : dimensions.padding,
            width: iconOnly ? dimensions.face : undefined,
            zIndex: 1,
            transform: [{ translateY: pressed ? Math.ceil(depth * 0.6) : 0 }],
          }}>
          {icon}
          {iconOnly ? null : (
            <Text
              className={`${dimensions.text} font-black tracking-wide ${uppercase ? 'uppercase' : ''}`}
              style={{ color: palette.label, fontFamily: Fonts?.rounded, flexShrink: 1, textAlign: 'center' }}>
              {label}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

function shade(color: string): string {
  const match = color.match(/^#([\da-f]{6})$/i);
  if (!match) return color;

  const value = Number.parseInt(match[1], 16);
  const red = Math.round(((value >> 16) & 0xff) * 0.72);
  const green = Math.round(((value >> 8) & 0xff) * 0.72);
  const blue = Math.round((value & 0xff) * 0.72);
  return `#${[red, green, blue].map((part) => part.toString(16).padStart(2, '0')).join('')}`;
}
