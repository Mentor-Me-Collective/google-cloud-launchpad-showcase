/**
 * Filled, colourful icons for the game layer (streak, XP, hearts, lesson path).
 * Line icons stay for UI chrome; these are for rewards and status, where colour carries meaning.
 */
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

type IconProps = { size?: number };

/** Flat, two-tone flame (the streak). `dim` greys it out when the streak is not alive. Drawn
 * without gradients: gradient ids are shared across the page and collided on web. */
export function FlameIcon({ size = 24, dim = false }: IconProps & { dim?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M24 4.5c3 0 5.2 3.2 9.2 7.4C38.4 17.3 41.5 22 41.5 28c0 8.9-7.6 15.5-17.5 15.5S6.5 36.9 6.5 28c0-7 2.2-11.9 4.3-14.5 1.1-1.3 3-1 3.5.6l1 3.3c1.8-4.6 4.6-9.3 6.6-11.6.6-.8 1.3-1.3 2.1-1.3Z"
        fill={dim ? '#C9CFDB' : '#F49A2B'}
      />
      <Path
        d="M24 21.5c2.2 3.2 6.2 6.2 6.2 11a6.2 6.2 0 0 1-12.4 0c0-4.8 4-7.8 6.2-11Z"
        fill={dim ? '#E4E8F0' : '#F9CB45'}
      />
    </Svg>
  );
}

/** A frozen streak: an ice crystal with icicles and sparkles. */
export function IceIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path
        d="M12 14.5 19 9l3.2 4.2L28.4 5l6 7.6 3.6 9.6v12l-3 2.2-1.2 5.6-2-5.4-3.6 1.6-1.8 6-2.2-5.8-5-1-2.8 3.8-1-5.6-4-3.2-.4-8.6L12 14.5Z"
        fill="#A6D8FF"
        stroke="#86C8FF"
        strokeWidth={2.4}
        strokeLinejoin="round"
      />
      <Path d="M19.5 17.5 28 12.5l5 9.8-3.6 9.8-9.2-.6-4-7.4 3.3-6.6Z" fill="#6DB8F5" />
      <Path d="M25 20.5c1.6 2.4 3.8 4.2 3.8 6.6a3.8 3.8 0 0 1-7.6 0c0-2.4 2.2-4.2 3.8-6.6Z" fill="#5FD0F0" />
      <Path d="m14.5 16.5 2.6 2.6-2.6 2.6-2.6-2.6 2.6-2.6Z" fill="#FFFFFF" />
      <Path d="m34.5 28 2 2-2 2-2-2 2-2Z" fill="#FFFFFF" />
    </Svg>
  );
}

/** A red flag on a pole (missions / assignments). */
export function MissionIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 40.5c9.4 0 15 1.4 15 3s-5.6 2.5-15 2.5-15-1-15-2.5 5.6-3 15-3Z" fill="#8DDB5F" />
      <Path d="M14 6v37" stroke="#5B6B8C" strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M15.5 8H37l-5 7.5 5 7.5H15.5V8Z" fill="#FF6B4A" stroke="#FF6B4A" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M19.5 12.5h8" stroke="#FFA58F" strokeWidth={3} strokeLinecap="round" />
      <Path d="M14 4.5a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Z" fill="#F9CB45" />
    </Svg>
  );
}

/** A red gem (XP). */
export function GemIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 6.5 39 15v18l-15 8.5L9 33V15l15-8.5Z" fill="#EF5A5A" stroke="#EF5A5A" strokeWidth={5} strokeLinejoin="round" />
      <Path d="m14.5 21 11-7v14l-11-7Z" fill="#F7A9A9" stroke="#F7A9A9" strokeWidth={3} strokeLinejoin="round" />
    </Svg>
  );
}

/** A green badge with a tick (finished lessons). */
export function LessonBadgeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24 5c3.4 0 4.6 2.6 7.4 3.4 2.8.8 5.6-.6 7.6 1.6s.8 4.8 1.6 7.6c.8 2.8 3.4 4 3.4 7.4s-2.6 4.6-3.4 7.4c-.8 2.8.6 5.6-1.6 7.6s-4.8.8-7.6 1.6C28.6 42.4 27.4 45 24 45s-4.6-2.6-7.4-3.4c-2.8-.8-5.6.6-7.6-1.6s-.8-4.8-1.6-7.6C6.6 29.6 4 28.4 4 25s2.6-4.6 3.4-7.4c.8-2.8-.6-5.6 1.6-7.6s4.8-.8 7.6-1.6C19.4 7.6 20.6 5 24 5Z" fill="#6CC644" />
      <Path d="M24 11a14 14 0 1 1 0 28 14 14 0 0 1 0-28Z" fill="#8DDB5F" />
      <Path d="m17 25.5 5 5 9.5-10" fill="none" stroke="#FFFFFF" strokeWidth={4.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** A blue graduation cap with a yellow tassel (classrooms). */
export function CapIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M13 22v9c0 4 5 7 11 7s11-3 11-7v-9H13Z" fill="#3563D9" stroke="#3563D9" strokeWidth={3} strokeLinejoin="round" />
      <Path d="M24 8 4 18l20 10 20-10L24 8Z" fill="#4A86FF" stroke="#4A86FF" strokeWidth={3} strokeLinejoin="round" />
      <Path d="m24 12-11 5.5" stroke="#8FB4FF" strokeWidth={3} strokeLinecap="round" />
      <Path d="M38 21v10" stroke="#F9CB45" strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M38 30.5a3 3 0 1 1 0 6 3 3 0 0 1 0-6Z" fill="#F9CB45" />
    </Svg>
  );
}

/** A purple school backpack (students). */
export function StudentsIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M17.5 12V9.5a6.5 6.5 0 0 1 13 0V12h-3.6V9.5a2.9 2.9 0 0 0-5.8 0V12h-3.6Z" fill="#5B3FD9" />
      <Path d="M14 12h20a7 7 0 0 1 7 7v18a7 7 0 0 1-7 7H14a7 7 0 0 1-7-7V19a7 7 0 0 1 7-7Z" fill="#7C5CFF" />
      <Path d="M7 20a8 8 0 0 1 8-8h18a8 8 0 0 1 8 8v1.5c-5 2.8-11 4-17 4s-12-1.2-17-4V20Z" fill="#9A82FF" />
      <Path d="M15 30h18a3.5 3.5 0 0 1 3.5 3.5v5A3.5 3.5 0 0 1 33 42H15a3.5 3.5 0 0 1-3.5-3.5v-5A3.5 3.5 0 0 1 15 30Z" fill="#B9A6FF" />
      <Path d="M22 21h4a1.5 1.5 0 0 1 1.5 1.5v4A1.5 1.5 0 0 1 26 28h-4a1.5 1.5 0 0 1-1.5-1.5v-4A1.5 1.5 0 0 1 22 21Z" fill="#F9CB45" />
      <Path d="M17 34h14" stroke="#9A82FF" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** An orange book (modules). */
export function BookIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M14 6h20a5 5 0 0 1 5 5v26a5 5 0 0 1-5 5H14a5 5 0 0 1-5-5V11a5 5 0 0 1 5-5Z" fill="#FF8A1F" />
      <Path d="M14 34h25v3a5 5 0 0 1-5 5H14a4 4 0 0 1 0-8Z" fill="#FFE3C2" />
      <Path d="M15 11v17" stroke="#FFB566" strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M27 6h7v11l-3.5-2.6L27 17V6Z" fill="#F9CB45" />
    </Svg>
  );
}

/** A flat golden star. */
export function StarIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M24.0 7.0L29.1 18.5L41.6 19.8L32.2 28.2L34.9 40.5L24.0 34.1L13.1 40.5L15.8 28.2L6.4 19.8L18.9 18.5Z" fill="#F9CB45" stroke="#F9CB45" strokeWidth={4} strokeLinejoin="round" />
      <Path d="M24 13.5 20.6 21l-4.6.6" fill="none" stroke="#FFE58A" strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function HeartIcon({ size = 24, empty = false }: IconProps & { empty?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        d="M12 20.6s-7.6-4.6-9.6-9.2C.8 7.8 3 3.6 7 3.6c2.1 0 3.7 1.1 5 2.8 1.3-1.7 2.9-2.8 5-2.8 4 0 6.2 4.2 4.6 7.8-2 4.6-9.6 9.2-9.6 9.2Z"
        fill={empty ? '#D9DEE8' : '#FF4B6E'}
      />
      {!empty ? <Path d="M6.4 7.4c.6-1 1.6-1.5 2.6-1.4" fill="none" stroke="#FFC2CF" strokeWidth={1.6} strokeLinecap="round" /> : null}
    </Svg>
  );
}

export function CheckIcon({ size = 24, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="m5 12.5 4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function LockIcon({ size = 24, color = '#AAB2C2' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M5.5 10.5h13a1 1 0 0 1 1 1v8a1.5 1.5 0 0 1-1.5 1.5H6A1.5 1.5 0 0 1 4.5 19.5v-8a1 1 0 0 1 1-1Z" fill={color} />
      <Circle cx="12" cy="15.5" r="1.6" fill="#FFFFFF" />
    </Svg>
  );
}

export function PlayIcon({ size = 24, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M8 5.5v13a1 1 0 0 0 1.5.9l10.2-6.5a1 1 0 0 0 0-1.7L9.5 4.6A1 1 0 0 0 8 5.5Z" fill={color} />
    </Svg>
  );
}

export function SparkIcon({ size = 24, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 2.5c.5 4.6 2.9 7 7.5 7.5-4.6.5-7 2.9-7.5 7.5-.5-4.6-2.9-7-7.5-7.5 4.6-.5 7-2.9 7.5-7.5Z" fill={color} />
    </Svg>
  );
}

export function CrossIcon({ size = 24, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" fill="none" stroke={color} strokeWidth={3.4} strokeLinecap="round" />
    </Svg>
  );
}

/** A flat target with a dart (accuracy). */
export function TargetIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={23} cy={25} r={19} fill="#EF5A5A" />
      <Circle cx={23} cy={25} r={13} fill="#FFFFFF" />
      <Circle cx={23} cy={25} r={8} fill="#EF5A5A" />
      <Circle cx={23} cy={25} r={3} fill="#FFFFFF" />
      <Path d="M23 25 39 9" stroke="#3563D9" strokeWidth={3.4} strokeLinecap="round" />
      <Path d="m36 6 1.5 4.5L42 12l-3 3-4.5-1.5L33 9l3-3Z" fill="#4A86FF" />
    </Svg>
  );
}

/** A flat golden trophy. `dim` greys it out. */
export function TrophyIcon({ size = 24, dim = false }: IconProps & { dim?: boolean }) {
  const cup = dim ? '#C9CFDB' : '#F9CB45';
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M14 10H9.5a1.5 1.5 0 0 0-1.5 1.5V14a7.5 7.5 0 0 0 7 7.5M34 10h4.5a1.5 1.5 0 0 1 1.5 1.5V14a7.5 7.5 0 0 1-7 7.5" fill="none" stroke={cup} strokeWidth={3.4} strokeLinecap="round" />
      <Path d="M14 6h20v11a10 10 0 0 1-20 0V6Z" fill={cup} />
      <Path d="M19.5 10v6.5" stroke={dim ? '#E4E8F0' : '#FFE58A'} strokeWidth={3.2} strokeLinecap="round" />
      <Path d="M21 26.5h6V35h-6z" fill={dim ? '#AAB2C2' : '#E8A600'} />
      <Path d="M16 35h16a3.5 3.5 0 0 1 3.5 3.5V42h-23v-3.5A3.5 3.5 0 0 1 16 35Z" fill={dim ? '#AAB2C2' : '#F49A2B'} />
    </Svg>
  );
}

export function MedalIcon({ size = 24, place }: IconProps & { place: 1 | 2 | 3 }) {
  const tone = { 1: ['#FFC800', '#E8A600'], 2: ['#D5DCE6', '#A9B4C4'], 3: ['#F0A868', '#C97A3A'] }[place];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M7 2h4l2 6H9L7 2ZM13 2h4l-2 6h-4l2-6Z" fill="#2F6BFF" />
      <Circle cx="12" cy="15" r="7" fill={tone[0]} stroke={tone[1]} strokeWidth={1.6} />
      <Path d={place === 1 ? 'M11.2 12.6 12.6 11.8V18' : place === 2 ? 'M10.2 13a2 2 0 0 1 3.8.6c0 1.6-3.8 2.4-3.8 4.4h3.9' : 'M10.3 12.4h3.4l-1.9 2.2a1.9 1.9 0 1 1-1.6 3.1'} fill="none" stroke="#FFFFFF" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CalendarIcon({ size = 24, color = '#56648A' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M5 6.5h14a1.5 1.5 0 0 1 1.5 1.5v11A1.5 1.5 0 0 1 19 20.5H5A1.5 1.5 0 0 1 3.5 19V8A1.5 1.5 0 0 1 5 6.5Z" fill="none" stroke={color} strokeWidth={2} />
      <Path d="M3.5 10.5h17M8 4v4M16 4v4" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}

export function ClassroomIcon({ size = 24, color = '#FFFFFF' }: IconProps & { color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 3 2.5 8 12 13l9.5-5L12 3Z" fill={color} />
      <Path d="M6 10.4v4.4c0 1.6 2.7 3.2 6 3.2s6-1.6 6-3.2v-4.4L12 13.6 6 10.4Z" fill={color} opacity={0.85} />
      <Path d="M20.5 8.5v5" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

/** Tab icon: a little house with a red roof (Learn / home). */
export function HomeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M8.5 20h31v20a3.5 3.5 0 0 1-3.5 3.5H12A3.5 3.5 0 0 1 8.5 40V20Z" fill="#F9CB45" />
      <Path d="M24 7.5 6 21.5h36L24 7.5Z" fill="#EF5A5A" stroke="#EF5A5A" strokeWidth={4} strokeLinejoin="round" />
      <Path d="M19 43.5V34a5 5 0 0 1 10 0v9.5H19Z" fill="#B7743A" />
      <Path d="M12.5 28.5a1.5 1.5 0 0 1 1.5-1.5h2.5a1.5 1.5 0 0 1 1.5 1.5V31a1.5 1.5 0 0 1-1.5 1.5H14a1.5 1.5 0 0 1-1.5-1.5v-2.5ZM30 28.5a1.5 1.5 0 0 1 1.5-1.5H34a1.5 1.5 0 0 1 1.5 1.5V31a1.5 1.5 0 0 1-1.5 1.5h-2.5A1.5 1.5 0 0 1 30 31v-2.5Z" fill="#FFFFFF" />
      <Path d="M14.5 16 20 11.5" stroke="#F7A9A9" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** Tab icon: a blue planet with green land (Community). */
export function GlobeIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={19} fill="#4A86FF" />
      <Path d="M13 14.5c3.2-1.6 7-.8 8.2 2.2 1.2 3-1 5.2-4 6.2s-3.6 4.4-6 3.6c-2.4-.8-2.6-5.6-1.4-8.2.8-1.8 1.8-3 3.2-3.8Z" fill="#6CC644" />
      <Path d="M29 26c3.4-.4 7 1.6 7 5s-3.4 6.4-6.6 6.4-4.6-2.8-4-5.8c.4-2.6 1.4-5.2 3.6-5.6Z" fill="#6CC644" />
      <Path d="M30 10.5c2.2.4 4.4 1.8 4.6 3.6.2 1.6-1.6 2.4-3.2 1.8-1.8-.6-3-2.6-1.4-5.4Z" fill="#6CC644" />
      <Path d="M12.5 33.5a15 15 0 0 0 6 5.5" stroke="#8FB4FF" strokeWidth={3} strokeLinecap="round" />
    </Svg>
  );
}

/** Tab icon: a round purple avatar (Profile). */
export function ProfileIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Circle cx={24} cy={24} r={19.5} fill="#CFC2FF" />
      <Circle cx={24} cy={19.5} r={7.5} fill="#7C5CFF" />
      <Path d="M10.6 37.8C12.6 31.6 17.8 28 24 28s11.4 3.6 13.4 9.8a19.5 19.5 0 0 1-26.8 0Z" fill="#7C5CFF" />
      <Path d="M20.5 16.5a4 4 0 0 1 3-2.2" stroke="#A996FF" strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

/** Tab icon: three coloured bars (the teacher's Panel). */
export function DashboardIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M8 42h32" stroke="#5B6B8C" strokeWidth={3.6} strokeLinecap="round" />
      <Path d="M10 27a3 3 0 0 1 3-3h3a3 3 0 0 1 3 3v12h-9V27Z" fill="#6CC644" />
      <Path d="M21 15a3 3 0 0 1 3-3h1a3 3 0 0 1 3 3v24h-7V15Z" fill="#4A86FF" />
      <Path d="M30 21a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v18h-8V21Z" fill="#F49A2B" />
      <Path d="M24.5 16v6" stroke="#8FB4FF" strokeWidth={2.6} strokeLinecap="round" />
      <Path d="M38 5.5 39.4 8.6 42.5 10 39.4 11.4 38 14.5 36.6 11.4 33.5 10 36.6 8.6Z" fill="#F9CB45" />
    </Svg>
  );
}

/** Three stacked coloured blocks (content blocks of a module). */
export function BlocksIcon({ size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M9 27h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H9a3 3 0 0 1-3-3V30a3 3 0 0 1 3-3Z" fill="#4A86FF" />
      <Path d="M27 27h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H27a3 3 0 0 1-3-3V30a3 3 0 0 1 3-3Z" fill="#6CC644" />
      <Path d="M18 9h12a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H18a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3Z" fill="#F9CB45" />
      <Path d="M10 31v5M28 31v5M19 13v5" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}
