// src/lib/storage.ts
// =============================================================
// HYBRID TRANSFORMATION — sloj za beleženje (localStorage)
// Bere/piše dnevni log po datumu (YYYY-MM-DD).
//
// Ključi so usklajeni z obstoječo HYBRID HTML aplikacijo, da bi se
// podatki kasneje lahko prenesli brez migracije.
//
// Vse javne funkcije so SSR-safe: na strežniku (typeof window ===
// "undefined") branje vrne smiseln fallback, pisanje pa je no-op.
// =============================================================

import {
  HABITS,
  todaysTraining,
  type HabitId,
} from "@/lib/protocol";

/* ---------- Ključi (uskladi z obstoječo HTML app) ---------- */

/** Glavni ključ: zemljevid { [datum]: DayLog }. */
export const TRACKER_KEY = "bostjan_protocol_tracker_v2";

/** Rezerva za kasneje (makro cilji ipd.). Trenutno neuporabljen. */
export const MACROS_KEY = "bostjan_protocol_macros_v2";

/* ---------- Podatkovni model ---------- */

export type DayType = "training" | "recovery";

/** Zapis 6 navad iz HABITS (trening, prehrana, voda, spanec, dodatki, fokus). */
export type Habits = Record<HabitId, boolean>;

/** Vaja v dnevnem logu — posnetek vaje iz današnjega TrainingDay. */
export interface LoggedExercise {
  name: string;
  maxWeight?: number;
  /** Po setih; null = set obstaja, a brez vnosa ponovitev/teže. */
  sets?: (number | null)[];
}

export interface DayLog {
  date: string; // YYYY-MM-DD
  dayType: DayType;
  habits: Habits;
  mealsDone: string[]; // id-ji obrokov iz MEALS
  training: { exercises: LoggedExercise[] };
  waterMl: number;
  weightMorning?: number;
  waist?: number;
  note?: string;
}

/* ---------- Datumski pomočniki (lokalni čas, ne UTC) ---------- */

/** Pretvori Date v ključ "YYYY-MM-DD" po LOKALNEM času. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Današnji datum kot "YYYY-MM-DD". */
export function todayKey(): string {
  return toDateKey(new Date());
}

/** Razčleni "YYYY-MM-DD" v lokalni Date (za določitev dayType). */
function parseDateKey(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

/* ---------- Prazen log + privzetki ---------- */

function emptyHabits(): Habits {
  return Object.fromEntries(HABITS.map((h) => [h.id, false])) as Habits;
}

/** Prazen log za dani datum; dayType in vaje iz protocol.ts. */
export function emptyDayLog(date: string): DayLog {
  const day = todaysTraining(parseDateKey(date));
  return {
    date,
    dayType: day.type,
    habits: emptyHabits(),
    mealsDone: [],
    training: {
      exercises: day.exercises.map((ex) => ({
        name: ex.name,
        maxWeight: ex.defaultWeightKg,
        sets: [],
      })),
    },
    waterMl: 0,
  };
}

/**
 * Združi shranjen log s privzetki, da starejši/nepopolni zapisi vedno
 * vrnejo polno obliko (npr. ko dodamo novo navado ali polje).
 */
function withDefaults(raw: Partial<DayLog> | undefined, date: string): DayLog {
  const base = emptyDayLog(date);
  if (!raw) return base;
  return {
    ...base,
    ...raw,
    date,
    dayType: raw.dayType ?? base.dayType,
    habits: { ...base.habits, ...(raw.habits ?? {}) },
    mealsDone: Array.isArray(raw.mealsDone) ? raw.mealsDone : [],
    training: {
      exercises: Array.isArray(raw.training?.exercises)
        ? raw.training!.exercises
        : base.training.exercises,
    },
    waterMl: typeof raw.waterMl === "number" ? raw.waterMl : 0,
  };
}

/* ---------- Nizkonivojski dostop do localStorage ---------- */

function readAll(): Record<string, DayLog> {
  if (typeof window === "undefined") return {};
  try {
    const rawText = window.localStorage.getItem(TRACKER_KEY);
    if (!rawText) return {};
    const parsed = JSON.parse(rawText);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    // Pokvarjen JSON ali nedostopen storage — varno vrni prazno.
    return {};
  }
}

function writeAll(all: Record<string, DayLog>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRACKER_KEY, JSON.stringify(all));
  } catch {
    // npr. zaseden prostor / zaseben način — tiho ignoriraj.
  }
}

function findOrCreateExercise(log: DayLog, name: string): LoggedExercise {
  let ex = log.training.exercises.find((e) => e.name === name);
  if (!ex) {
    ex = { name, sets: [] };
    log.training.exercises.push(ex);
  }
  return ex;
}

/* ---------- Javni API ---------- */

/** Vrne log za datum (privzeto danes). Če ne obstaja, vrne prazen log. */
export function getDayLog(date: string = todayKey()): DayLog {
  if (typeof window === "undefined") return emptyDayLog(date);
  return withDefaults(readAll()[date], date);
}

/** Vrne vse shranjene loge (zemljevid po datumu). */
export function getAllDayLogs(): Record<string, DayLog> {
  return readAll();
}

/** Shrani celoten log za log.date. */
export function saveDayLog(log: DayLog): void {
  const all = readAll();
  all[log.date] = log;
  writeAll(all);
}

/** Preklopi eno navado in vrne posodobljen log. */
export function toggleHabit(date: string, habitId: HabitId): DayLog {
  const log = getDayLog(date);
  log.habits = { ...log.habits, [habitId]: !log.habits[habitId] };
  saveDayLog(log);
  return log;
}

/** Preklopi obrok (pojeden/ne) in vrne posodobljen log. */
export function toggleMeal(date: string, mealId: string): DayLog {
  const log = getDayLog(date);
  const done = new Set(log.mealsDone);
  if (done.has(mealId)) done.delete(mealId);
  else done.add(mealId);
  log.mealsDone = [...done];
  saveDayLog(log);
  return log;
}

/** Nastavi popito vodo (ml, ne-negativno) in vrne posodobljen log. */
export function setWater(date: string, ml: number): DayLog {
  const log = getDayLog(date);
  log.waterMl = Math.max(0, Math.round(ml || 0));
  saveDayLog(log);
  return log;
}

/**
 * Nastavi vrednost posameznega seta (npr. ponovitve ali teža) za vajo.
 * value === null pomeni "set obstaja, brez vnosa". Array se po potrebi
 * razširi z null-i do setIndex.
 */
export function setTrainingSet(
  date: string,
  exerciseName: string,
  setIndex: number,
  value: number | null,
): DayLog {
  const log = getDayLog(date);
  const ex = findOrCreateExercise(log, exerciseName);
  const sets = ex.sets ?? [];
  while (sets.length <= setIndex) sets.push(null);
  sets[setIndex] = value;
  ex.sets = sets;
  saveDayLog(log);
  return log;
}

/** Nastavi maksimalno (delovno) težo za vajo. */
export function setMaxWeight(
  date: string,
  exerciseName: string,
  weight: number,
): DayLog {
  const log = getDayLog(date);
  const ex = findOrCreateExercise(log, exerciseName);
  ex.maxWeight = weight;
  saveDayLog(log);
  return log;
}

/** Nastavi jutranjo težo (kg). */
export function setWeightMorning(date: string, kg: number): DayLog {
  const log = getDayLog(date);
  log.weightMorning = kg;
  saveDayLog(log);
  return log;
}

/** Nastavi obseg pasu (cm). */
export function setWaist(date: string, cm: number): DayLog {
  const log = getDayLog(date);
  log.waist = cm;
  saveDayLog(log);
  return log;
}

/** Nastavi dnevno opombo. */
export function setNote(date: string, note: string): DayLog {
  const log = getDayLog(date);
  log.note = note;
  saveDayLog(log);
  return log;
}
