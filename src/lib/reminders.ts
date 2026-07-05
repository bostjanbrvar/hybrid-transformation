// src/lib/reminders.ts
// =============================================================
// HYBRID TRANSFORMATION — sloj opomnikov (Notification API)
//
// Uporablja navaden Notification API brskalnika — BREZ push in BREZ
// service workerja. Posledica: opomniki delujejo SAMO ko je zavihek
// odprt (lahko v ozadju, a brskalnik mora ohranjati stran živo). Ko je
// aplikacija/zavihek zaprt, se nič ne sproži. Glej povzetek v PR/chatu.
//
// Vse je SSR-safe: na strežniku (brez window/Notification) so funkcije
// no-op oz. vrnejo varne fallback vrednosti.
// =============================================================

import {
  MEALS,
  SUPPLEMENTS,
  RULES,
  todaysTraining,
} from "@/lib/protocol";
import { toDateKey } from "@/lib/storage";

/* ---------- Tipi ---------- */

export type ReminderKind = "meal" | "training" | "water" | "supplement";

export interface Reminder {
  id: string; // edinstven za dan (za dedup sproženih)
  time: string; // "HH:MM"
  title: string;
  body: string;
  kind: ReminderKind;
  ref?: string; // pri kind === "meal": protocolId obroka (za akcijski gumb)
}

/* ---------- Ključi ---------- */

/** Sproženi opomniki po datumu: { "YYYY-MM-DD": ["meal-m-0340", ...] }. */
export const FIRED_KEY = "bostjan_protocol_reminders_fired_v2";

/* ---------- Čas: pomočniki ---------- */

function toMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function fmtMin(total: number): string {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const HHMM_RE = /^\d{1,2}:\d{2}$/;

/* ---------- Podpora / dovoljenje ---------- */

export function isSupported(): boolean {
  return typeof window !== "undefined" && typeof Notification !== "undefined";
}

export function getPermission(): NotificationPermission {
  if (!isSupported()) return "denied";
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission> {
  if (!isSupported()) return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    // Starejši brskalniki (callback API) ali zavrnitev — vrni trenutno stanje.
    return Notification.permission;
  }
}

/* ---------- Sestava urnika za danes ---------- */

export function buildTodaySchedule(now: Date = new Date()): Reminder[] {
  const out: Reminder[] = [];

  // 1) Obroki
  for (const meal of MEALS) {
    const items = meal.items.slice(0, 3).join(", ");
    out.push({
      id: `meal-${meal.id}`,
      time: meal.time,
      title: `Čas za ${meal.name}`,
      body: items,
      kind: "meal",
      ref: meal.id, // protocolId (npr. "m-0340") za akcijski gumb "Pojedel"
    });
  }

  // 2) Trening (samo na trening dan), opomnik 5 min prej ob 03:55
  const training = todaysTraining(now);
  if (training.type === "training") {
    out.push({
      id: "training",
      time: "03:55",
      title: "Čez 5 min trening",
      body: training.focus,
      kind: "training",
    });
  }

  // 3) Voda: vsakih waterIntervalMin minut znotraj okna
  const from = toMin(RULES.waterWindow.from);
  const to = toMin(RULES.waterWindow.to);
  for (let m = from; m <= to; m += RULES.waterIntervalMin) {
    const time = fmtMin(m);
    out.push({
      id: `water-${time}`,
      time,
      title: "Voda",
      body: "Popij ~2,5 dl",
      kind: "water",
    });
  }

  // 4) Dodatki (samo tisti z uro v HH:MM formatu)
  SUPPLEMENTS.forEach((sup, i) => {
    if (!HHMM_RE.test(sup.time)) return;
    out.push({
      id: `supp-${i}-${sup.time}`,
      time: sup.time,
      title: `Dodatek: ${sup.name}`,
      body: sup.note ?? sup.name,
      kind: "supplement",
    });
  });

  return out;
}

/* ---------- Dedup sproženih (localStorage) ---------- */

function readFired(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FIRED_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeFired(all: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FIRED_KEY, JSON.stringify(all));
  } catch {
    // tiho ignoriraj
  }
}

function firedToday(dateKey: string): Set<string> {
  return new Set(readFired()[dateKey] ?? []);
}

function markFired(dateKey: string, id: string): void {
  const all = readFired();
  const arr = all[dateKey] ?? [];
  if (!arr.includes(id)) {
    arr.push(id);
    all[dateKey] = arr;
    writeFired(all);
  }
}

/* ---------- Sprožitev + zanka ---------- */

function fire(r: Reminder): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(r.title, { body: r.body, tag: r.id });
  } catch {
    // npr. omejitve okolja — tiho ignoriraj
  }
}

/** En pregled: sproži vse opomnike, ki se ujemajo s trenutno minuto. */
function tick(): void {
  if (!isSupported() || Notification.permission !== "granted") return;
  const now = new Date();
  const dateKey = toDateKey(now);
  const hhmm = fmtMin(now.getHours() * 60 + now.getMinutes());
  const fired = firedToday(dateKey);

  for (const r of buildTodaySchedule(now)) {
    if (r.time === hhmm && !fired.has(r.id)) {
      fire(r);
      markFired(dateKey, r.id);
    }
  }
}

let intervalId: ReturnType<typeof setInterval> | null = null;

/** Zaženi zanko (preverja vsako minuto). Idempotentno. */
export function startReminders(): void {
  if (typeof window === "undefined") return;
  if (intervalId !== null) return; // že teče
  tick(); // takojšen pregled ob vklopu
  intervalId = setInterval(tick, 60_000);
}

/** Ustavi zanko. */
export function stopReminders(): void {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

/** Ali zanka trenutno teče. */
export function isRunning(): boolean {
  return intervalId !== null;
}
