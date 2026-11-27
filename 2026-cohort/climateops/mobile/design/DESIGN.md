# ClimateOps — design plan

**Subject** heat readiness for buildings in Mott Haven & Melrose. **Who** one facility manager.
**Core action** check in a building's status today (AC, occupancy, staff). **Moment of use**
mid-morning on a hot day, walking between buildings, phone in one hand, glancing in bright light.

## Directions
1. Sky-ice civic dashboard — pale ice-blue page, cobalt accent, white cards, penguin mascot. ✔ (user's pick)
2. Heat-map dark ops console — near-black, ember reds, mono numerals. Lost: user chose 1.
3. Paper field-clipboard — off-white, pencil grey, stamp red. Lost: user chose 1.

## Palette (tokens in src/global.css)
- Ice `#E5F1FD` → background
- Snow `#FFFFFF` / `#F9FAFC` → surface
- Cobalt `#0B6DC4` → accent
- Harbor navy `#0E2A47` → foreground
- Slate `#6B7C93` → muted
- Signal green `#1A9E55` → success; Alarm red `#E0443A` → danger; Heat orange `#F28A1E` → warning
- Frost `#D6E8FA` → accent-soft (chips, pills)
Light only: the picture is light, so dark variant carries the same values.

## Type
SF Pro. Titles 24 bold navy, section heads 18 semibold, card titles 15 semibold, secondary 13,
meta 11. Big numerals bold (header count 40). Small caps-style uppercase captions in navy.

## Imagery
Penguin mascot in a cobalt hard hat cut from the user's designs. Building photos: realistic
daylight street-level photo of a Bronx brick building of that type, clear blue sky, eye level.

## Shell
```
┌ header: ❄ 6 BUILDINGS…   (HEAT ALERT pill) ┐
│ scrolling content under the glass tab bar  │
└ [Home] [Facilities] [Map] [Alerts]          ┘
```
Detail pushes over the tabs with its own back chevron.

## Screens — see .newly/brief.md and design/*.jpg (they are the spec).
Home drawn two ways: (a) stat grid first, (b) tasks card first, then the live list — kept (b), as picked.

## Signature moment
**Status stamp**: saving a building's status spins the snowflake in the save button, the AC pill
cross-fades to its new state, the heat-risk ring re-sweeps, a success haptic fires and an
"Updated 9:41 AM" stamp drops in. Celebration: when the last building is checked in today, the
home task ticks and the penguin banner turns to "Every building checked in today" once.

## Unmistakable
A heat app that feels like ice: cobalt snowflakes and a hard-hat penguin over real Bronx buildings.
