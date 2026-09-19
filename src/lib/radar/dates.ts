import {
  addDays,
  addMonths,
  addWeeks,
  addYears,
  differenceInCalendarDays,
  eachDayOfInterval,
  endOfMonth,
  format,
  getDay,
  isSameMonth,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import type { Frequency } from "./types";

export function todayIso(from = new Date()): string {
  return format(from, "yyyy-MM-dd");
}

export function parseDay(iso: string): Date {
  return parseISO(iso);
}

export function formatDay(iso: string, pattern = "d MMM"): string {
  return format(parseISO(iso), pattern);
}

export function formatPretty(iso: string): string {
  return format(parseISO(iso), "EEE, d MMM");
}

export function daysUntil(iso: string, from = new Date()): number {
  return differenceInCalendarDays(parseISO(iso), startOfDay(from));
}

export function advanceDue(nextDue: string, frequency: Frequency): string {
  const d = parseISO(nextDue);
  switch (frequency) {
    case "weekly":
      return format(addWeeks(d, 1), "yyyy-MM-dd");
    case "monthly":
      return format(addMonths(d, 1), "yyyy-MM-dd");
    case "quarterly":
      return format(addMonths(d, 3), "yyyy-MM-dd");
    case "yearly":
      return format(addYears(d, 1), "yyyy-MM-dd");
    case "one-time":
      return nextDue;
  }
}

export function addDaysIso(iso: string, days: number): string {
  return format(addDays(parseISO(iso), days), "yyyy-MM-dd");
}

export function isoOffset(days: number, from = new Date()): string {
  return format(addDays(startOfDay(from), days), "yyyy-MM-dd");
}

export function inMonth(iso: string, month: Date): boolean {
  return isSameMonth(parseISO(iso), month);
}

export function monthOffset(from: Date, months: number): Date {
  return addMonths(from, months);
}

export function endOfMonthIso(month: Date): string {
  return format(endOfMonth(month), "yyyy-MM-dd");
}

export function monthGrid(month: Date): { date: Date; iso: string; inMonth: boolean }[] {
  const start = startOfMonth(month);
  const end = endOfMonth(month);
  const weekday = (getDay(start) + 6) % 7;
  const leading = Array.from({ length: weekday }, (_, i) => {
    const d = new Date(start);
    d.setDate(d.getDate() - (weekday - i));
    return d;
  });
  const days = eachDayOfInterval({ start, end });
  const trailingCount = (7 - ((leading.length + days.length) % 7)) % 7;
  const trailing = Array.from({ length: trailingCount }, (_, i) => {
    const d = new Date(end);
    d.setDate(d.getDate() + i + 1);
    return d;
  });
  return [...leading, ...days, ...trailing].map((date) => ({
    date,
    iso: format(date, "yyyy-MM-dd"),
    inMonth: isSameMonth(date, month),
  }));
}

export function nextPayday(paydayDay: number, from = new Date()): string {
  const day = Math.min(Math.max(paydayDay, 1), 28);
  const y = from.getFullYear();
  const m = from.getMonth();
  let candidate = new Date(y, m, day);
  if (startOfDay(candidate) <= startOfDay(from)) {
    candidate = new Date(y, m + 1, day);
  }
  return format(candidate, "yyyy-MM-dd");
}

export function occurrencesThrough(
  nextDue: string,
  frequency: Frequency,
  untilIso: string,
  remainingEmis = 0,
): string[] {
  const dates: string[] = [];
  let d = nextDue;
  let left = remainingEmis > 0 ? remainingEmis : Number.POSITIVE_INFINITY;
  let guard = 0;
  while (guard < 48 && left > 0 && d <= untilIso) {
    dates.push(d);
    if (frequency === "one-time") break;
    d = advanceDue(d, frequency);
    left -= 1;
    guard += 1;
  }
  return dates;
}
