export const MAP_W = 1000;
export const MAP_H = 1030;
const BOUNDS = { minLng: -73.932, maxLng: -73.9, minLat: 40.803, maxLat: 40.828 };

export function project(lat: number, lng: number) {
  const x = ((lng - BOUNDS.minLng) / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W;
  const y = ((BOUNDS.maxLat - lat) / (BOUNDS.maxLat - BOUNDS.minLat)) * MAP_H;
  return { x, y };
}

export function polyPoints(points: [number, number][]) {
  return points
    .map(([lat, lng]) => {
      const p = project(lat, lng);
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(' ');
}

/** About a quarter mile in map units at this latitude. */
export const QUARTER_MILE = (0.00477 / (BOUNDS.maxLng - BOUNDS.minLng)) * MAP_W;
