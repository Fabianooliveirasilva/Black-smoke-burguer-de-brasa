import { describe, expect, it } from "vitest";
import { describeStatus, isOpenAt, isValidWindow, localClock, type OpeningWindow } from "@/server/hours";

// 2026-06-12 is a Friday. São Paulo is UTC−3.
const sp = (iso: string) => new Date(`${iso}-03:00`);
const hours: OpeningWindow[] = [
  { day: 5, open: "18:00", close: "01:00" }, // Friday, crosses midnight
  { day: 2, open: "18:00", close: "23:30" }, // Tuesday
];

describe("hours", () => {
  it("reads the local clock in America/Sao_Paulo regardless of server TZ", () => {
    expect(localClock(new Date("2026-06-12T23:30:00Z"))).toEqual({ day: 5, minutes: 20 * 60 + 30 });
  });
  it("is open inside a window and closed at the exact close minute", () => {
    expect(isOpenAt(sp("2026-06-12T18:00:00"), hours)).toBe(true);
    expect(isOpenAt(sp("2026-06-12T17:59:00"), hours)).toBe(false);
    expect(isOpenAt(sp("2026-06-09T23:30:00"), hours)).toBe(false);
  });
  it("handles windows that cross midnight into the next day", () => {
    expect(isOpenAt(sp("2026-06-13T00:45:00"), hours)).toBe(true); // Saturday early morning
    expect(isOpenAt(sp("2026-06-13T01:00:00"), hours)).toBe(false);
  });
  it("describes the next opening", () => {
    expect(describeStatus(sp("2026-06-12T12:00:00"), hours)).toEqual({ open: false, label: "Fechado · abre hoje às 18:00" });
    expect(describeStatus(sp("2026-06-13T12:00:00"), hours).label).toBe("Fechado · abre terça às 18:00");
    expect(describeStatus(sp("2026-06-12T19:00:00"), hours)).toEqual({ open: true, label: "Aberto · fecha às 01:00" });
  });
  it("validates HH:MM windows", () => {
    expect(isValidWindow({ day: 1, open: "18:00", close: "23:00" })).toBe(true);
    expect(isValidWindow({ day: 1, open: "24:00", close: "23:00" })).toBe(false);
    expect(isValidWindow({ day: 1, open: "18:00", close: "18:00" })).toBe(false);
  });
});
