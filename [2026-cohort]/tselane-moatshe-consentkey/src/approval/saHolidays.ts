/**
 * South African public holidays (Public Holidays Act 36 of 1994), computed so
 * no yearly list has to be maintained.
 *
 * Fixed dates, plus Good Friday and Family Day (Easter Monday), which move
 * with Easter. When a holiday falls on a Sunday, the following Monday is also
 * a public holiday. One-off holidays declared by proclamation (for example an
 * election day) cannot be computed: add them with SCHOOL_HOLIDAYS.
 *
 * Dates are `YYYY-MM-DD` (UTC), the same form the escalation code compares.
 */

/** Easter Sunday for a Gregorian year (anonymous Gregorian algorithm). */
function easterSunday(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3 = March, 4 = April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

const iso = (d: Date): string => d.toISOString().slice(0, 10);

function addDays(d: Date, n: number): Date {
  const out = new Date(d.getTime());
  out.setUTCDate(out.getUTCDate() + n);
  return out;
}

export function southAfricanPublicHolidays(year: number): string[] {
  const fixed: Array<[number, number]> = [
    [1, 1], // New Year's Day
    [3, 21], // Human Rights Day
    [4, 27], // Freedom Day
    [5, 1], // Workers' Day
    [6, 16], // Youth Day
    [8, 9], // National Women's Day
    [9, 24], // Heritage Day
    [12, 16], // Day of Reconciliation
    [12, 25], // Christmas Day
    [12, 26], // Day of Goodwill
  ];
  const days = new Set<string>();
  for (const [month, day] of fixed) {
    const date = new Date(Date.UTC(year, month - 1, day));
    days.add(iso(date));
    if (date.getUTCDay() === 0) days.add(iso(addDays(date, 1)));
  }
  const easter = easterSunday(year);
  days.add(iso(addDays(easter, -2))); // Good Friday
  days.add(iso(addDays(easter, 1))); // Family Day
  return [...days].sort();
}

/** Holidays for a span of years, inclusive. */
export function southAfricanPublicHolidaysBetween(fromYear: number, toYear: number): string[] {
  const out: string[] = [];
  for (let y = fromYear; y <= toYear; y++) out.push(...southAfricanPublicHolidays(y));
  return out;
}
