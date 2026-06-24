// 2026 Myanmar Public Holidays + weekend calculation, embedded for the AI chatbot.
// No database required — this is static reference data for the year 2026.

export interface Holiday {
  /** Day of month (start day if a range) */
  day: number;
  /** End day if the holiday spans multiple days */
  endDay?: number;
  name: string;
}

/** Public holidays for 2026, keyed by month number (1-12). */
export const MM_PUBLIC_HOLIDAYS_2026: Record<number, Holiday[]> = {
  1: [
    { day: 4, name: "Independence Day" },
    { day: 12, name: "Kayin New Year" },
  ],
  2: [{ day: 12, name: "Union Day" }],
  3: [
    { day: 2, name: "Peasants Day" },
    { day: 3, name: "Full Moon of Tabaung" },
    { day: 27, name: "Armed Forces Day" },
  ],
  4: [
    { day: 12, endDay: 16, name: "Thingyan Festival" },
    { day: 17, name: "Myanmar New Year" },
  ],
  5: [
    { day: 1, name: "May Day" },
    { day: 31, name: "Full Moon of Kason" },
  ],
  6: [],
  7: [
    { day: 19, name: "Martyrs Day" },
    { day: 29, name: "Full Moon of Waso" },
  ],
  8: [],
  9: [],
  10: [{ day: 24, endDay: 26, name: "Thadingyut Festival" }],
  11: [
    { day: 23, name: "National Day" },
    { day: 24, name: "Tazaungdaing Festival" },
  ],
  12: [{ day: 25, name: "Christmas Day" }],
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Count Saturdays and Sundays in a given month of 2026. */
export function countWeekends2026(month: number): { saturdays: number; sundays: number; total: number } {
  const daysInMonth = new Date(2026, month, 0).getDate();
  let saturdays = 0;
  let sundays = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(2026, month - 1, d).getDay();
    if (dow === 6) saturdays++;
    if (dow === 0) sundays++;
  }
  return { saturdays, sundays, total: saturdays + sundays };
}

function expandHolidayDays(h: Holiday): number[] {
  const days: number[] = [];
  for (let d = h.day; d <= (h.endDay ?? h.day); d++) days.push(d);
  return days;
}

/**
 * Build a compact, AI-readable reference string covering every month of 2026:
 * weekend counts and named public holidays. The model uses this to answer
 * "How many off days this month?" type questions without guessing.
 */
export function buildHolidayContext2026(): string {
  const lines: string[] = [
    "2026 OFF-DAY REFERENCE (authoritative — use these exact numbers, do not recalculate differently):",
  ];

  for (let m = 1; m <= 12; m++) {
    const w = countWeekends2026(m);
    const holidays = MM_PUBLIC_HOLIDAYS_2026[m] ?? [];

    // Public holiday days that fall on a weekend should not be double-counted.
    const weekendDaySet = new Set<number>();
    const daysInMonth = new Date(2026, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dow = new Date(2026, m - 1, d).getDay();
      if (dow === 0 || dow === 6) weekendDaySet.add(d);
    }

    let holidayDayCount = 0;
    const holidayLabels: string[] = [];
    for (const h of holidays) {
      const expanded = expandHolidayDays(h);
      const weekdayDays = expanded.filter((d) => !weekendDaySet.has(d));
      holidayDayCount += weekdayDays.length;
      const label =
        h.endDay && h.endDay !== h.day
          ? `${h.name} (${h.day}-${h.endDay})`
          : `${h.name} (${h.day})`;
      holidayLabels.push(label);
    }

    const totalOff = w.total + holidayDayCount;
    const holidayText =
      holidayLabels.length > 0
        ? `${holidayDayCount} day(s) — ${holidayLabels.join(", ")}`
        : "0 days";

    lines.push(
      `${MONTH_NAMES[m - 1]} 2026: Weekends ${w.total} days (${w.saturdays} Sat + ${w.sundays} Sun). ` +
        `Public Holidays: ${holidayText}. Total off-days: ${totalOff}.`,
    );
  }

  lines.push(
    "",
    'When a user asks "How many off days in this month?" / "ဒီလ ပိတ်ရက် ဘယ်နှစ်ရက်ရှိလဲ", detect the month they mean ' +
      "(default to the current month if unspecified), then reply with the total combined count broken down as " +
      '"Weekends: X days" and "Public Holidays: Y days (with names)". Reply in Myanmar or English matching the user\'s language. ' +
      "Public holidays already falling on a Saturday/Sunday are excluded from the holiday count to avoid double-counting.",
  );

  return lines.join("\n");
}
