import Ionicons from '@expo/vector-icons/Ionicons';
import type MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { AddIcon } from '@solar-icons/react-native/linear/add';
import { AddCircleIcon } from '@solar-icons/react-native/linear/add-circle';
import { AltArrowLeftIcon } from '@solar-icons/react-native/linear/alt-arrow-left';
import { AtomIcon } from '@solar-icons/react-native/linear/atom';
import { ArrowRightIcon } from '@solar-icons/react-native/linear/arrow-right';
import { BellRingIcon } from '@solar-icons/react-native/linear/bell-ring';
import { BookIcon } from '@solar-icons/react-native/linear/book';
import { CloudDownloadIcon } from '@solar-icons/react-native/linear/cloud-download';
import { TrashBinMinimalisticIcon } from '@solar-icons/react-native/linear/trash-bin-minimalistic';
import { CheckCircleIcon } from '@solar-icons/react-native/linear/check-circle';
import { UserPlusIcon } from '@solar-icons/react-native/linear/user-plus';
import { UserMinusIcon } from '@solar-icons/react-native/linear/user-minus';
import { LightbulbIcon } from '@solar-icons/react-native/linear/lightbulb';
import { RefreshIcon } from '@solar-icons/react-native/linear/refresh';
import { ClipboardTextIcon } from '@solar-icons/react-native/linear/clipboard-text';
import { NotebookIcon } from '@solar-icons/react-native/linear/notebook';
import { HeartIcon } from '@solar-icons/react-native/linear/heart';
import { HeartCrackIcon } from '@solar-icons/react-native/linear/heart-crack';
import { FireIcon } from '@solar-icons/react-native/linear/fire';
import { AltArrowDownIcon } from '@solar-icons/react-native/linear/alt-arrow-down';
import { AltArrowUpIcon } from '@solar-icons/react-native/linear/alt-arrow-up';
import { HomeSmileAngleIcon } from '@solar-icons/react-native/linear/home-smile-angle';
import { LibraryIcon } from '@solar-icons/react-native/linear/library';
import { MagicWandIcon } from '@solar-icons/react-native/linear/magic-wand';
import { MagnifierIcon } from '@solar-icons/react-native/linear/magnifier';
import { PaletteRoundIcon } from '@solar-icons/react-native/linear/palette-round';
import { SendSquareIcon } from '@solar-icons/react-native/linear/send-square';
import { Translation2Icon } from '@solar-icons/react-native/linear/translation-2';
import { TuningIcon } from '@solar-icons/react-native/linear/tuning';
import { UsersGroupTwoRoundedIcon } from '@solar-icons/react-native/linear/users-group-two-rounded';
import { MapPointSchoolIcon } from '@solar-icons/react-native/linear/map-point-school';
import type { SFSymbol } from 'expo-symbols';

import { SymbolView } from './symbol-view';
import type { ComponentProps } from 'react';
import { Platform } from 'react-native';

type IconProps = {
  /** SF Symbol name on iOS. */
  sf: SFSymbol;
  /** Ionicons fallback on Android. */
  md: ComponentProps<typeof Ionicons>['name'];
  size?: number;
  color: string;
};

export function Icon({ sf, md, size = 20, color }: IconProps) {
  if (Platform.OS !== 'ios') return <Ionicons name={md} size={size} color={color} />;
  return <SymbolView name={sf} size={size} tintColor={color} type="hierarchical" />;
}

/** Solar icon used throughout the teacher experience.
 *
 * The public name intentionally stays compatible with the previous
 * MaterialCommunityIcons API so existing screens can migrate without a
 * breaking change. The visual source is now the official Solar Icons package.
 */
export function PlayfulIcon({
  name,
  size = 24,
  color,
}: {
  name: ComponentProps<typeof MaterialCommunityIcons>['name'];
  size?: number;
  color: string;
}) {
  const SolarIcon = SOLAR_ICONS[name] ?? AddIcon;
  return <SolarIcon size={size} color={color} strokeWidth={1.8} />;
}

const SOLAR_ICONS: Partial<Record<
  ComponentProps<typeof MaterialCommunityIcons>['name'],
  typeof AddIcon
>> = {
  'account-multiple-outline': UsersGroupTwoRoundedIcon,
  'account-school-outline': MapPointSchoolIcon,
  'account-group': UsersGroupTwoRoundedIcon,
  atom: AtomIcon,
  'arrow-right': ArrowRightIcon,
  'arrow-left': AltArrowLeftIcon,
  plus: AddIcon,
  'plus-circle-outline': AddCircleIcon,
  'bell-ring-outline': BellRingIcon,
  bookshelf: LibraryIcon,
  'book-plus-outline': BookIcon,
  creation: MagicWandIcon,
  magnify: MagnifierIcon,
  'home-heart': HomeSmileAngleIcon,
  'send-check-outline': SendSquareIcon,
  'palette-outline': PaletteRoundIcon,
  translate: Translation2Icon,
  'tune-variant': TuningIcon,
  'check-circle': CheckCircleIcon,
  'account-plus-outline': UserPlusIcon,
  'account-remove-outline': UserMinusIcon,
  'lightbulb-on-outline': LightbulbIcon,
  'refresh': RefreshIcon,
  'clipboard-text-outline': ClipboardTextIcon,
  'book-check-outline': NotebookIcon,
  'check-circle-outline': CheckCircleIcon,
  'cloud-download-outline': CloudDownloadIcon,
  'trash-can-outline': TrashBinMinimalisticIcon,
  heart: HeartIcon,
  'heart-broken-outline': HeartCrackIcon,
  fire: FireIcon,
  'chevron-down': AltArrowDownIcon,
  'chevron-up': AltArrowUpIcon,
};
