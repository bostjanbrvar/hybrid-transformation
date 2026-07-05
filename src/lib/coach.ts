// src/lib/coach.ts
// =============================================================
// HYBRID TRANSFORMATION — rule-based COACH
//  - faza 1: progression sprožilci (increase / new / hold)
//  - faza 2: zapostavljene skupine, pozitivne spodbude (streak/volume),
//            today-sporočilo z forward-look na počitek dneh
//
// Bere SAMO obstoječe podatke (LoggedSet zgodovina + definicije vaj +
// današnji datum). NIČ migracij, NIČ novih localStorage ključev.
// SSR-safe: localStorage bere posredno prek storage.ts (na strežniku prazno);
// klicatelj (client stran) naj kliče v useEffect.
// =============================================================

import {
  todaysTraining,
  trainingKeyForDate,
  TRAINING_DAYS,
  type WeekdayKey,
} from "@/lib/protocol";
import {
  lastSerijeFor,
  toDateKey,
  getAllDayLogs,
  getDayLog,
  exerciseHistory,
  type LoggedSet,
} from "@/lib/storage";
import { progressionHint, parseRepCeiling } from "@/lib/progression";
import { getMakroCilj } from "@/lib/makro";

/** Prag (dni) za "zapostavljeno skupino". Split vrti skupino ~7 dni; 10 ujame
 *  šele dejansko izpuščen cikel (8 bi sprožil že ob enodnevnem zamiku). */
export const NEGLECT_THRESHOLD_DAYS = 10;

export type CoachKind =
  | "increase"
  | "hold"
  | "new"
  | "neglected"
  | "makro"
  | "today"
  | "streak"
  | "volume";

export interface CoachMsg {
  kind: CoachKind;
  text: string;
  priority: number;         // nižje = pomembnejše (sort + dashboard top)
  exerciseName?: string;    // samo progression
  suggestedWeight?: number; // samo "increase"
  targetReps?: number;      // ciljne ponovitve (progression)
  lastWeight?: number;      // "hold"/"increase"
}

/** Prioriteta po vrstah (nižje = pomembnejše). */
const PRIORITY: Record<CoachKind, number> = {
  increase: 1,
  new: 2,
  hold: 2,
  neglected: 3,
  makro: 3,
  today: 4,
  streak: 5,
  volume: 5,
};

/* ---------- Skupine (izpeljano iz TRAINING_DAYS, brez spremembe protokola) ---------- */

/** Trening skupine za "zapostavljenost" (= 4 trening dnevi). */
const TRAINING_GROUPS: { key: WeekdayKey; label: string }[] = [
  { key: "PON", label: "Prsi" },
  { key: "TOR", label: "Hrbet" },
  { key: "CET", label: "Noge" },
  { key: "PET", label: "Ramena" },
];

/** Kratka oblika fokusa za today-sporočilo (vključno z recovery besedilom). */
const FOCUS_PHRASE: Record<WeekdayKey, string> = {
  PON: "prsi in triceps",
  TOR: "hrbet in biceps",
  CET: "noge in trebuh",
  PET: "ramena in roke",
  SRE: "aktivni počitek",
  VIKEND: "počitek",
};

/** Imena vaj skupine (brez cooldowna) — za detekcijo "kdaj nazadnje trenirana". */
function groupExerciseNames(key: WeekdayKey): string[] {
  return TRAINING_DAYS[key].exercises.filter((e) => !e.cooldown).map((e) => e.name);
}

/* ---------- Datumski pomočniki (lokalni čas) ---------- */

function parseKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() + n);
  return x;
}

/** Polni dnevi med dvema "YYYY-MM-DD" ključema (a − b). */
function dayDiff(aKey: string, bKey: string): number {
  return Math.round((parseKey(aKey).getTime() - parseKey(bKey).getTime()) / 86400000);
}

/** Ponedeljek tedna, ki vsebuje dani datum (lokalna polnoč). */
function weekStart(d: Date): Date {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const off = (x.getDay() + 6) % 7; // pon=0 ... ned=6
  x.setDate(x.getDate() - off);
  return x;
}

/* ---------- Slovenske sklanjatve ---------- */

function dniWord(n: number): string {
  if (n === 1) return "dnem";
  if (n === 2) return "dnevoma";
  return "dnevi"; // 3+ (3 dnevi, 5 dnevi, 11 dnevi)
}

function treningiWord(n: number): string {
  if (n === 1) return "trening";
  if (n === 2) return "treninga";
  if (n === 3 || n === 4) return "treningi";
  return "treningov";
}

/* ---------- Tedenske statistike ---------- */

/** Število unikatnih dni z ≥1 serijo + skupni volumen v [startKey, endKey]. */
function weekStats(
  allDateKeys: string[],
  startKey: string,
  endKey: string,
): { days: number; volume: number } {
  let days = 0;
  let volume = 0;
  for (const key of allDateKeys) {
    if (key < startKey || key > endKey) continue;
    const log = getDayLog(key); // migrirano (withDefaults)
    let hasSet = false;
    for (const ex of log.training.exercises) {
      if (!ex.serije || ex.serije.length === 0) continue;
      hasSet = true;
      for (const s of ex.serije) volume += s.teza * s.ponovitve;
    }
    if (hasSet) days += 1;
  }
  return { days, volume };
}

/* ---------- Posamezne kategorije ---------- */

function topWeight(serije: LoggedSet[]): number {
  return serije.reduce((max, s) => (s.teza > max ? s.teza : max), 0);
}

/** Faza 1: progression sporočila za trening dan. */
function progressionMessages(date: Date): CoachMsg[] {
  const day = todaysTraining(date);
  if (day.type !== "training") return [];

  const beforeDate = toDateKey(date); // samo pretekle izvedbe (ne danes)
  const out: CoachMsg[] = [];

  for (const ex of day.exercises) {
    if (ex.cooldown || ex.bonus) continue;

    const ceiling = parseRepCeiling(ex.targetReps) ?? 0;
    const serije = lastSerijeFor(ex.name, beforeDate);

    if (!serije || serije.length === 0) {
      out.push({
        kind: "new",
        priority: PRIORITY.new,
        exerciseName: ex.name,
        targetReps: ceiling,
        text: "Še nisi delal — začni z osnovno težo.",
      });
      continue;
    }

    const hint = progressionHint(serije, ex.targetReps, ex.progressionStep);
    if (hint) {
      out.push({
        kind: "increase",
        priority: PRIORITY.increase,
        exerciseName: ex.name,
        suggestedWeight: hint.suggestedWeight,
        targetReps: hint.ceiling,
        lastWeight: hint.currentWeight,
        text: `Dosegel cilj ${hint.ceiling} ponovitev → povečaj na ${hint.suggestedWeight} kg.`,
      });
    } else {
      const w = topWeight(serije);
      out.push({
        kind: "hold",
        priority: PRIORITY.hold,
        exerciseName: ex.name,
        targetReps: ceiling,
        lastWeight: w,
        text: `Nadaljuj pri trenutni teži (${w} kg).`,
      });
    }
  }
  return out;
}

/** Faza 2: zapostavljene skupine (zadnja izvedba > prag dni). */
function neglectedMessages(date: Date): CoachMsg[] {
  const todayKeyStr = toDateKey(date);
  const out: CoachMsg[] = [];

  for (const group of TRAINING_GROUPS) {
    let lastKey: string | null = null;
    for (const name of groupExerciseNames(group.key)) {
      const hist = exerciseHistory(name);
      const last = hist.length ? hist[hist.length - 1].date : null;
      if (last && last < todayKeyStr && (!lastKey || last > lastKey)) {
        lastKey = last;
      }
    }
    // Skupina nikoli (pred danes) trenirana → ne prikaži.
    if (!lastKey) continue;

    const n = dayDiff(todayKeyStr, lastKey);
    if (n > NEGLECT_THRESHOLD_DAYS) {
      out.push({
        kind: "neglected",
        priority: PRIORITY.neglected,
        text: `${group.label} zadnjič treniran pred ${n} ${dniWord(n)}`,
      });
    }
  }
  return out;
}

/** Faza 3: makro cilj — na trening dan spomni na beljakovine. Samo če je cilj
 *  shranjen (iz kalkulatorja); brez cilja ni sporočila. */
function makroMessages(date: Date): CoachMsg[] {
  const cilj = getMakroCilj();
  if (!cilj) return [];
  if (todaysTraining(date).type !== "training") return [];

  const bel = cilj.rezultat.beljakovine.gramov;
  const kcal = cilj.rezultat.kalorije;
  return [
    {
      kind: "makro",
      priority: PRIORITY.makro,
      text: `Trening dan: zadeni ${bel} g beljakovin (dnevni cilj ${kcal} kcal).`,
    },
  ];
}

/** Faza 2: today-sporočilo z forward-look na počitek dneh (ena pot). */
function todayMessage(date: Date): CoachMsg {
  const dayKey = trainingKeyForDate(date);
  const day = TRAINING_DAYS[dayKey];

  let text: string;
  if (day.type === "training") {
    text = `Danes je dan za ${FOCUS_PHRASE[dayKey]}`;
  } else {
    const tomorrowKey = trainingKeyForDate(addDays(date, 1));
    text = `Danes ${FOCUS_PHRASE[dayKey]} · jutri ${FOCUS_PHRASE[tomorrowKey]}`;
  }
  return { kind: "today", priority: PRIORITY.today, text };
}

/** Faza 2: pozitivne spodbude (doslednost + volumen vs prejšnji teden). */
function encouragementMessages(date: Date): CoachMsg[] {
  const out: CoachMsg[] = [];
  const allKeys = Object.keys(getAllDayLogs());
  if (allKeys.length === 0) return out;

  const curStart = weekStart(date);
  const cur = weekStats(allKeys, toDateKey(curStart), toDateKey(addDays(curStart, 6)));
  const prev = weekStats(
    allKeys,
    toDateKey(addDays(curStart, -7)),
    toDateKey(addDays(curStart, -1)),
  );

  // a) doslednost
  if (cur.days >= 3) {
    out.push({
      kind: "streak",
      priority: PRIORITY.streak,
      text: `Ta teden ${cur.days} ${treningiWord(cur.days)} · odlična doslednost`,
    });
  }

  // b) volumen — samo če je prejšnji teden imel podatke in je rast pozitivna
  if (prev.volume > 0 && cur.volume > prev.volume) {
    const pct = Math.round(((cur.volume - prev.volume) / prev.volume) * 100);
    if (pct > 0) {
      out.push({
        kind: "volume",
        priority: PRIORITY.volume,
        text: `Skupni volumen +${pct}% proti prejšnjemu tednu`,
      });
    }
  }

  return out;
}

/* ---------- Javni API ---------- */

/**
 * Vsa coach sporočila za dan (privzeto danes), razvrščena po prioriteti
 * (increase > new/hold > neglected > today > spodbude). Today-sporočilo je
 * vedno prisotno (tudi na počitek dneh, z forward-look na jutri).
 */
export function getCoachMessages(date: Date = new Date()): CoachMsg[] {
  const msgs: CoachMsg[] = [
    ...progressionMessages(date),
    ...neglectedMessages(date),
    ...makroMessages(date),
    todayMessage(date),
    ...encouragementMessages(date),
  ];
  // Stabilen sort po prioriteti (ohrani vrstni red znotraj iste prioritete).
  return msgs
    .map((m, i) => ({ m, i }))
    .sort((a, b) => a.m.priority - b.m.priority || a.i - b.i)
    .map((x) => x.m);
}

/**
 * Najpomembnejše sporočilo za dashboard kartico (najnižja prioriteta).
 * null, če ni nobenega (praktično vedno obstaja vsaj today-sporočilo).
 */
export function getTopCoachMessage(date: Date = new Date()): CoachMsg | null {
  const msgs = getCoachMessages(date);
  return msgs.length ? msgs[0] : null;
}
