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

/* ---------- Podatkovni model ---------- */

export type DayType = "training" | "recovery";

/** Zapis 6 navad iz HABITS (trening, prehrana, voda, spanec, dodatki, fokus). */
export type Habits = Record<HabitId, boolean>;

/** Ena zabeležena serija: teža × ponovitve. */
export interface LoggedSet {
  teza: number;        // kg
  ponovitve: number;   // št. ponovitev
}

/** Vaja v dnevnem logu — posnetek vaje iz današnjega TrainingDay. */
export interface LoggedExercise {
  name: string;
  /** Serije po vrsti; vsaka nosi svojo težo in ponovitve. */
  serije?: LoggedSet[];
  /** @deprecated legacy (HTML app / v1) — bere se le ob migraciji. */
  maxWeight?: number;
  /** @deprecated legacy (HTML app / v1) — array ponovitev; bere se le ob migraciji. */
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
        serije: [],
      })),
    },
    waterMl: 0,
  };
}

/**
 * Pretvori vajo v nov format (serije[]). Idempotentno:
 *  - če `serije` že obstaja, vrne kopijo brez sprememb;
 *  - sicer iz legacy `maxWeight` + `sets` zgradi serije (vsak ne-null set =
 *    ena serija { teza: maxWeight, ponovitve: set }). Tako se stari treningi
 *    ohranijo s pravimi podatki, ne kot prazne/ničelne serije.
 * Defenzivno: neveljavne vrednosti → preskočene, nikoli ne vrže napake.
 */
function migrateExercise(ex: LoggedExercise): LoggedExercise {
  if (Array.isArray(ex.serije)) {
    return {
      name: ex.name,
      serije: ex.serije
        .filter((s) => s && typeof s === "object")
        .map((s) => ({
          teza: Number(s.teza) || 0,
          ponovitve: Number(s.ponovitve) || 0,
        })),
    };
  }
  const serije: LoggedSet[] = [];
  if (Array.isArray(ex.sets)) {
    for (const reps of ex.sets) {
      if (reps == null || !Number.isFinite(Number(reps))) continue;
      serije.push({ teza: Number(ex.maxWeight) || 0, ponovitve: Number(reps) });
    }
  }
  return { name: ex.name, serije };
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
        ? raw.training!.exercises.map(migrateExercise)
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
    ex = { name, serije: [] };
    log.training.exercises.push(ex);
  }
  if (!Array.isArray(ex.serije)) ex.serije = [];
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

/** Zamenja CEL seznam serij za vajo (uporabno za "isto kot zadnjič"). */
export function setSerije(
  date: string,
  exerciseName: string,
  serije: LoggedSet[],
): DayLog {
  const log = getDayLog(date);
  const ex = findOrCreateExercise(log, exerciseName);
  ex.serije = serije.map((s) => ({
    teza: Math.max(0, Number(s.teza) || 0),
    ponovitve: Math.max(0, Number(s.ponovitve) || 0),
  }));
  saveDayLog(log);
  return log;
}

/**
 * Vrne serije iz ZADNJEGA treninga (kadarkoli, ne glede na dan v tednu),
 * kjer ima vaja s tem imenom vsaj eno zabeleženo serijo. Išče strogo PRED
 * `beforeDate` (YYYY-MM-DD), od najnovejšega nazaj. Vrne null, če je ni.
 * Legacy zapisi se prek getDayLog/withDefaults migrirajo, zato so zajeti.
 */
export function lastSerijeFor(
  exerciseName: string,
  beforeDate: string,
): LoggedSet[] | null {
  const all = readAll();
  const dates = Object.keys(all)
    .filter((d) => d < beforeDate)
    .sort()
    .reverse();
  for (const d of dates) {
    const log = withDefaults(all[d], d);
    const ex = log.training.exercises.find((e) => e.name === exerciseName);
    if (ex?.serije && ex.serije.length > 0) {
      return ex.serije.map((s) => ({ ...s }));
    }
  }
  return null;
}

/* ---------- Zgodovina / napredek po vaji ---------- */

/** Ena seja vaje z izračunanima metrikama (skupni vir za graf + progression). */
export interface ExerciseSession {
  date: string;        // YYYY-MM-DD
  serije: LoggedSet[];
  maxTeza: number;     // najtežja serija seje (kg)
  volumen: number;     // Σ (teza × ponovitve) čez vse serije
}

/** Max teža + skupni volumen za seznam serij. Edini izračun teh metrik. */
export function sessionMetrics(serije: LoggedSet[]): {
  maxTeza: number;
  volumen: number;
} {
  let maxTeza = 0;
  let volumen = 0;
  for (const s of serije) {
    if (s.teza > maxTeza) maxTeza = s.teza;
    volumen += s.teza * s.ponovitve;
  }
  return { maxTeza, volumen };
}

/**
 * Zgodovina ene vaje skozi vse datume, naraščajoče po datumu. Vključi le
 * seje z vsaj eno serijo. Legacy zapisi se migrirajo prek withDefaults.
 */
export function exerciseHistory(name: string): ExerciseSession[] {
  const all = readAll();
  const out: ExerciseSession[] = [];
  for (const date of Object.keys(all).sort()) {
    const log = withDefaults(all[date], date);
    const ex = log.training.exercises.find((e) => e.name === name);
    if (ex?.serije && ex.serije.length > 0) {
      const serije = ex.serije.map((s) => ({ ...s }));
      out.push({ date, serije, ...sessionMetrics(serije) });
    }
  }
  return out;
}

/** Unikatna imena vseh vaj, ki imajo v zgodovini vsaj eno zabeleženo serijo. */
export function allLoggedExerciseNames(): string[] {
  const all = readAll();
  const names = new Set<string>();
  for (const date of Object.keys(all)) {
    const log = withDefaults(all[date], date);
    for (const ex of log.training.exercises) {
      if (ex.serije && ex.serije.length > 0) names.add(ex.name);
    }
  }
  return [...names];
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
