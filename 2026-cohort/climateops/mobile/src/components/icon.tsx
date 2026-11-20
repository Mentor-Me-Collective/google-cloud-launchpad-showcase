import Ionicons from '@expo/vector-icons/Ionicons';
import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';

type IconProps = {
  sf: SFSymbol;
  ion: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color: string;
};

export function Icon({ sf, ion, size = 18, color }: IconProps) {
  return (
    <SymbolView
      name={sf}
      size={size}
      tintColor={color}
      type="monochrome"
      fallback={<Ionicons name={ion} size={size} color={color} />}
    />
  );
}
