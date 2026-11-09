/** Opening hours in America/Sao_Paulo. A close time earlier than open means "past midnight". */
export interface OpeningWindow {
  day: number; // 0 = domingo
  open: string; // "HH:MM"
  close: string; // "HH:MM"
}

export const TIMEZONE = "America/Sao_Paulo";
export const DAY_NAMES = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Day-of-week and minutes since midnight in the store timezone. */
export function localClock(date: Date, timeZone = TIMEZONE) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export function isOpenAt(date: Date, hours: OpeningWindow[]): boolean {
  const { day, minutes } = localClock(date);
  const yesterday = (day + 6) % 7;
  return hours.some((w) => {
    const open = toMinutes(w.open);
    const close = toMinutes(w.close);
    if (close > open) return w.day === day && minutes >= open && minutes < close;
    // crosses midnight
    return (w.day === day && minutes >= open) || (w.day === yesterday && minutes < close);
  });
}

export function windowsForDay(hours: OpeningWindow[], day: number) {
  return hours.filter((w) => w.day === day).sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
}

export function isValidWindow(w: OpeningWindow) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(w.open) && /^([01]\d|2[0-3]):[0-5]\d$/.test(w.close) && w.open !== w.close;
}

/** Human status line, e.g. "Aberto · fecha às 23:30" or "Fechado · abre sexta às 18:00". */
export function describeStatus(date: Date, hours: OpeningWindow[]): { open: boolean; label: string } {
  const { day, minutes } = localClock(date);
  const yesterday = (day + 6) % 7;
  const current = hours.find((w) => {
    const o = toMinutes(w.open);
    const c = toMinutes(w.close);
    if (c > o) return w.day === day && minutes >= o && minutes < c;
    return (w.day === day && minutes >= o) || (w.day === yesterday && minutes < c);
  });
  if (current) return { open: true, label: `Aberto · fecha às ${current.close}` };
  for (let offset = 0; offset < 8; offset++) {
    const d = (day + offset) % 7;
    const next = windowsForDay(hours, d).find((w) => offset > 0 || toMinutes(w.open) > minutes);
    if (next) {
      const when = offset === 0 ? "hoje" : offset === 1 ? "amanhã" : DAY_NAMES[d].toLowerCase();
      return { open: false, label: `Fechado · abre ${when} às ${next.open}` };
    }
  }
  return { open: false, label: "Fechado" };
}

/** Groups windows per weekday for display (Mon→Sun). */
export function weeklySchedule(hours: OpeningWindow[]) {
  return [1, 2, 3, 4, 5, 6, 0].map((d) => ({ day: d, name: DAY_NAMES[d], windows: windowsForDay(hours, d) }));
}
