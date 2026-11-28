import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

/**
 * A solid "game" tile with a raised lower edge, drawn as two stacked layers: the edge is the
 * same shape shifted down, and the face sits on top. This replaces `borderBottomWidth` on rounded
 * views, which Android draws inside the shape (it looks like a cut shadow) and which shows through
 * when the face is translucent.
 */
export function RaisedTile({
  face,
  edge,
  size,
  radius = 16,
  depth = 4,
  children,
  style,
}: {
  face: string;
  edge: string;
  size: number;
  radius?: number;
  depth?: number;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ width: size, height: size + depth }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: depth, height: size, borderRadius: radius, backgroundColor: edge }}
      />
      <View
        style={{ width: size, height: size, borderRadius: radius, backgroundColor: face, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/** Mixes a #RRGGBB colour with white: amount 0 keeps the colour, 1 is white. */
export function tint(color: string, amount: number): string {
  const match = color.match(/^#([\da-f]{6})$/i);
  if (!match) return color;
  const value = Number.parseInt(match[1], 16);
  const part = (shift: number) => {
    const c = (value >> shift) & 0xff;
    return Math.round(c + (255 - c) * amount).toString(16).padStart(2, '0');
  };
  return `#${part(16)}${part(8)}${part(0)}`;
}

/** A card of any size with the same raised lower edge as RaisedTile. `className` styles the face. */
export function RaisedCard({
  face,
  edge,
  radius = 20,
  depth = 4,
  className,
  children,
  style,
}: {
  face: string;
  edge: string;
  radius?: number;
  depth?: number;
  className?: string;
  children?: ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ paddingBottom: depth }, style]}>
      <View
        pointerEvents="none"
        style={{ position: 'absolute', left: 0, right: 0, top: depth, bottom: 0, borderRadius: radius, backgroundColor: edge }}
      />
      <View className={className} style={{ borderRadius: radius, backgroundColor: face }}>
        {children}
      </View>
    </View>
  );
}
