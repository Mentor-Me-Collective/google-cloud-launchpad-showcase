import Svg, { Circle, Defs, G, Line, Polygon, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';

import { Palette } from '@/constants/theme';
import type { Facility } from '@/features/facilities/types/facility';
import { acWorking } from '@/features/facilities/utils/facility-derive';
import { MAP_H, MAP_W, QUARTER_MILE, polyPoints, project } from '@/features/map/utils/projection';

type DistrictMapProps = {
  facilities: Facility[];
  selectedID: string | null;
  onSelect: (id: string) => void;
  heatLayer: boolean;
  zoom: number;
};

const HARLEM: [number, number][] = [
  [40.828, -73.932], [40.828, -73.9325], [40.82, -73.933], [40.812, -73.9335], [40.803, -73.934], [40.803, -73.927],
  [40.806, -73.9285], [40.81, -73.9295], [40.816, -73.9305], [40.822, -73.9312], [40.828, -73.931],
];
const SOUTH_WATER: [number, number][] = [
  [40.803, -73.927], [40.8052, -73.924], [40.8058, -73.918], [40.8048, -73.911], [40.8053, -73.904], [40.8045, -73.9],
  [40.803, -73.9], [40.803, -73.927],
];
const PARK: [number, number][] = [[40.8125, -73.9135], [40.8125, -73.9085], [40.8072, -73.9085], [40.8072, -73.9135]];
const STREETS: { label: string; from: [number, number]; to: [number, number] }[] = [
  { label: 'E 138 St', from: [40.8078, -73.9285], to: [40.8078, -73.902] },
  { label: 'E 149 St', from: [40.8163, -73.93], to: [40.8163, -73.902] },
  { label: 'E 161 St', from: [40.8255, -73.929], to: [40.8255, -73.902] },
  { label: 'Third Ave', from: [40.8065, -73.9275], to: [40.828, -73.9165] },
  { label: "St Ann's Ave", from: [40.8065, -73.9152], to: [40.828, -73.9132] },
  { label: 'Willis Ave', from: [40.806, -73.9238], to: [40.8185, -73.9208] },
];
const HEAT_ZONES = [
  { lat: 40.8155, lng: -73.9165, r: 330, color: Palette.danger, opacity: 0.42 },
  { lat: 40.8215, lng: -73.919, r: 260, color: Palette.warning, opacity: 0.45 },
  { lat: 40.809, lng: -73.922, r: 250, color: Palette.warning, opacity: 0.4 },
  { lat: 40.824, lng: -73.909, r: 220, color: Palette.heat, opacity: 0.45 },
];
const LABELS = [
  { text: 'MOTT HAVEN', lat: 40.8098, lng: -73.9235 },
  { text: 'MELROSE', lat: 40.8205, lng: -73.9115 },
  { text: 'PORT MORRIS', lat: 40.8062, lng: -73.906 },
];

function Snowflake({ x, y, size }: { x: number; y: number; size: number }) {
  return (
    <G>
      {[0, 60, 120].map((deg) => {
        const rad = (deg * Math.PI) / 180;
        const dx = Math.cos(rad) * size;
        const dy = Math.sin(rad) * size;
        return <Line key={deg} x1={x - dx} y1={y - dy} x2={x + dx} y2={y + dy} stroke={Palette.white} strokeWidth={size / 3.2} strokeLinecap="round" />;
      })}
    </G>
  );
}

/** A drawn map of Mott Haven and Melrose with a pin at each building's real coordinates. */
export function DistrictMap({ facilities, selectedID, onSelect, heatLayer, zoom }: DistrictMapProps) {
  const focus = facilities.find((f) => f.facility_id === selectedID);
  const center = focus ? project(focus.latitude, focus.longitude) : { x: MAP_W * 0.55, y: MAP_H * 0.5 };
  const w = MAP_W / zoom;
  const h = MAP_H / zoom;
  const vx = Math.min(Math.max(center.x - w / 2, 0), MAP_W - w);
  const vy = Math.min(Math.max(center.y - h / 2, 0), MAP_H - h);
  const k = 1 / Math.sqrt(zoom);
  const scaleStart = project(40.8042, -73.9305);

  return (
    <Svg width="100%" height="100%" viewBox={`${vx} ${vy} ${w} ${h}`} preserveAspectRatio="xMidYMid slice">
      <Defs>
        {HEAT_ZONES.map((z, i) => (
          <RadialGradient key={i} id={`heat-${i}`} cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={z.color} stopOpacity={z.opacity} />
            <Stop offset="1" stopColor={z.color} stopOpacity={0} />
          </RadialGradient>
        ))}
      </Defs>
      <Rect x={0} y={0} width={MAP_W} height={MAP_H} fill={Palette.land} />
      <Polygon points={polyPoints(PARK)} fill={Palette.park} />
      {STREETS.map((s) => {
        const a = project(...s.from);
        const b = project(...s.to);
        return <Line key={s.label} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={Palette.street} strokeWidth={14} strokeLinecap="round" />;
      })}
      {heatLayer
        ? HEAT_ZONES.map((z, i) => {
            const c = project(z.lat, z.lng);
            return <Circle key={i} cx={c.x} cy={c.y} r={z.r} fill={`url(#heat-${i})`} />;
          })
        : null}
      <Polygon points={polyPoints(HARLEM)} fill={Palette.water} />
      <Polygon points={polyPoints(SOUTH_WATER)} fill={Palette.water} />
      {STREETS.map((s) => {
        const a = project(...s.from);
        return (
          <SvgText key={s.label} x={a.x + 18} y={a.y - 10} fontSize={20 * k} fill={Palette.muted}>
            {s.label}
          </SvgText>
        );
      })}
      {LABELS.map((l) => {
        const p = project(l.lat, l.lng);
        return (
          <SvgText key={l.text} x={p.x} y={p.y} fontSize={30 * k} fontWeight="700" fill={Palette.navy} opacity={0.7} textAnchor="middle" letterSpacing={2}>
            {l.text}
          </SvgText>
        );
      })}
      <SvgText x={project(40.818, -73.9318).x} y={project(40.818, -73.9318).y} fontSize={22 * k} fill={Palette.accent} fontStyle="italic">
        Harlem River
      </SvgText>
      <G>
        <Line x1={scaleStart.x} y1={scaleStart.y} x2={scaleStart.x + QUARTER_MILE} y2={scaleStart.y} stroke={Palette.navy} strokeWidth={6} />
        <SvgText x={scaleStart.x} y={scaleStart.y - 12} fontSize={20 * k} fill={Palette.navy}>
          ¼ mi
        </SvgText>
      </G>
      {facilities.map((f) => {
        const p = project(f.latitude, f.longitude);
        const selected = f.facility_id === selectedID;
        const r = (selected ? 34 : 26) * k;
        const fill = acWorking(f) ? Palette.accent : Palette.muted;
        return (
          <G key={f.facility_id} onPress={() => onSelect(f.facility_id)}>
            <Circle cx={p.x} cy={p.y} r={r + 22} fill={Palette.white} opacity={0.01} />
            <Circle cx={p.x} cy={p.y} r={r + 5 * k} fill={Palette.white} />
            <Circle cx={p.x} cy={p.y} r={r} fill={fill} />
            {acWorking(f) ? null : <Circle cx={p.x + r * 0.75} cy={p.y - r * 0.75} r={9 * k} fill={Palette.danger} stroke={Palette.white} strokeWidth={3 * k} />}
            <Snowflake x={p.x} y={p.y} size={r * 0.55} />
          </G>
        );
      })}
    </Svg>
  );
}
