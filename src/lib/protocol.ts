// src/lib/protocol.ts
// =============================================================
// HYBRID TRANSFORMATION — ZAKLENJEN PROTOKOL (single source of truth)
// Prehrana, rutina, trening in dodatki so fiksni. Ne spreminjaj brez razloga.
// Vse ostalo (Danes zaslon, opomniki, beleženje) bere iz tega objekta.
// =============================================================

import { meals as NUTRITION_MEALS } from "@/lib/nutrition";

/* ---------- Tipi ---------- */

export interface Meal {
  id: string;          // stabilni id (localStorage mealsDone, ROUTINE ref, opomniki)
  time: string;        // "HH:MM"
  slot: string;        // oznaka bloka (npr. "HITRI START")
  name: string;        // npr. "Pre-workout aktivacija"
  items: string[];     // glavne sestavine z gramažami (Danes zaslon + opomniki)
  critical?: boolean;  // obrok, ki se ga NE preskoči
}

export interface Supplement {
  time: string;        // "HH:MM" ali oznaka ("med treningom")
  name: string;
  note?: string;
}

export type WeekdayKey = "PON" | "TOR" | "SRE" | "CET" | "PET" | "VIKEND";

export interface Exercise {
  name: string;
  defaultWeightKg?: number; // privzeta izhodiščna teža (uporabnik prepiše)
  targetReps?: string;      // npr. "12 / 10 / 8 / 8"
  cooldown?: boolean;       // cool-down element (npr. orbitrek)
  progressionStep?: number; // korak dviga teže (kg) ob dosegu cilja; privzeto 1.25
  bonus?: boolean;          // opcijska dodatna vaja, ločena od glavnih 6
}

export interface TrainingDay {
  key: WeekdayKey;
  label: string;            // "Ponedeljek"
  focus: string;            // "Prsa & triceps"
  type: "training" | "recovery";
  subtitle: string;
  exercises: Exercise[];
}

export interface RoutineStep {
  time: string;
  title: string;
  kind: "meal" | "training" | "logistics";
  ref?: string;             // id obroka, če kind === "meal"
}

/* ---------- Pravila ---------- */

export const RULES = {
  waterTargetL: 3.5,            // 3–4 L/dan
  waterIntervalMin: 75,         // opomnik vsakih ~75 min
  waterWindow: { from: "05:00", to: "20:00" },
  reps: "8–12",                 // hipertrofija
  restSec: "60–90",
  durationMin: "45–70",
  progression: "+2 do +5 kg ob dosegu zgornje meje ponovitev",
  mantra: "Konsistentnost > popolnost. Disciplina je standard, ne občutek.",
} as const;

export const NUTRITION_RULES: string[] = [
  "Po treningu ješ takoj.",
  "04:45 obrok je obvezen.",
  "15:15 obroka ne preskoči.",
  "Protein pred spanjem je obvezen.",
  "Voda 3–4 L dnevno.",
  "Če si lačen, dodaj riž, krompir ali whey po potrebi.",
];

/* ---------- Dodatki ---------- */

export const SUPPLEMENTS: Supplement[] = [
  { time: "03:40", name: "Kreatin 5 g + ščepec soli", note: "elektroliti" },
  { time: "07:30", name: "Vitamin D3" },
  { time: "13:30", name: "Omega 3" },
  { time: "med treningom", name: "Elektroliti", note: "po potrebi" },
  { time: "21:00", name: "Magnezij" },
];

/* ---------- Prehrana (8 obrokov) ---------- */
// Enotni vir vsebine obrokov je nutrition.ts (polna vsebina za /prehrana).
// MEALS je izpeljan pogled za Danes zaslon + opomnike: čas, oznaka bloka,
// ime, kratek seznam sestavin. Časi in seznam sestavin morajo ostati
// identični, saj jih beleženje (mealsDone id) in opomniki neposredno berejo.

/** Obroki, ki se jih NE preskoči — kritičnost za Danes/opomnike (ločena od /prehrana zlatega akcenta). */
const CRITICAL_MEAL_IDS = new Set(["m-0445", "m-1515", "m-2100"]);

export const MEALS: Meal[] = NUTRITION_MEALS.map((m) => ({
  id: m.protocolId,
  time: m.time,
  slot: m.title,
  name: m.tagline,
  items: m.items,
  critical: CRITICAL_MEAL_IDS.has(m.protocolId),
}));

/* ---------- Trening (tedenski plan) ---------- */

export const TRAINING_DAYS: Record<WeekdayKey, TrainingDay> = {
  PON: {
    key: "PON",
    label: "Ponedeljek",
    focus: "Prsa & triceps",
    type: "training",
    subtitle: "Spremljaj svojo moč in napredek pri vsaki vaji.",
    exercises: [
      { name: "Potisk za prsa", defaultWeightKg: 35, targetReps: "12 / 10 / 8 / 8" },
      { name: "Potisk za prsa pod naklonom", defaultWeightKg: 35 },
      { name: "Razpiranje za prsa (fly)", defaultWeightKg: 25 },
      { name: "Triceps potisk", defaultWeightKg: 25, targetReps: "12 / 10" },
      { name: "Triceps izteg nad glavo", defaultWeightKg: 20, targetReps: "12" },
      { name: "Potiski na bradlji (dips)", targetReps: "12", progressionStep: 5 },
      { name: "Orbitrek (cool-down)", cooldown: true },
    ],
  },
  TOR: {
    key: "TOR",
    label: "Torek",
    focus: "Hrbet & biceps",
    type: "training",
    subtitle: "Fokus na širino hrbta, debelino hrbta in biceps zaključek.",
    exercises: [
      { name: "Lat pulldown", targetReps: "12", progressionStep: 5 },
      { name: "Veslanje sede", targetReps: "12", progressionStep: 5 },
      { name: "Reverse fly", targetReps: "12", progressionStep: 5 },
      { name: "Biceps curl", targetReps: "12", progressionStep: 5 },
      { name: "Hammer curl", targetReps: "12", progressionStep: 5 },
      { name: "Neutral grip pull down", targetReps: "12", progressionStep: 5 },
      { name: "Seated wrist curl", targetReps: "12", progressionStep: 5, bonus: true },
    ],
  },
  SRE: {
    key: "SRE",
    label: "Sreda",
    focus: "Aktivni počitek",
    type: "recovery",
    subtitle: "Dan za regeneracijo, pretok krvi in mobilnost.",
    exercises: [
      { name: "30–45 min hoje" },
      { name: "Mobilnost 10–15 min" },
      { name: "Lahek reset telesa" },
    ],
  },
  CET: {
    key: "CET",
    label: "Četrtek",
    focus: "Noge & trebuh",
    type: "training",
    subtitle: "Moč nog, stabilnost in jedro.",
    exercises: [
      { name: "Leg press", targetReps: "12", progressionStep: 5 },
      { name: "Leg extension", targetReps: "12", progressionStep: 5 },
      { name: "Hamstring curl", targetReps: "12", progressionStep: 5 },
      { name: "Meča", targetReps: "12", progressionStep: 5 },
      { name: "Trebušne vaje", targetReps: "12", progressionStep: 5 },
      { name: "Mrtvi dvig z iztegnjenimi nogami", targetReps: "12", progressionStep: 5 },
    ],
  },
  PET: {
    key: "PET",
    label: "Petek",
    focus: "Ramena & roke",
    type: "training",
    subtitle: "Ramenski volumen in zaključek za roke.",
    exercises: [
      { name: "Shoulder press", targetReps: "12", progressionStep: 5 },
      { name: "Lateral raise", targetReps: "12", progressionStep: 5 },
      { name: "Rear delt fly", targetReps: "12", progressionStep: 5 },
      { name: "Biceps curl", targetReps: "12", progressionStep: 5 },
      { name: "Triceps pushdown", targetReps: "12", progressionStep: 5 },
      { name: "Front raise", targetReps: "12", progressionStep: 5 },
      { name: "Rotator cuff external rotation", targetReps: "12", progressionStep: 5, bonus: true },
    ],
  },
  VIKEND: {
    key: "VIKEND",
    label: "Sobota / Nedelja",
    focus: "Celo telo + počitek",
    type: "recovery",
    subtitle: "Sobota po občutku, nedelja regeneracija in priprava na nov teden.",
    exercises: [
      { name: "Sobota: trening po občutku (krožni / pump)" },
      { name: "Nedelja: regeneracija + priprava na ponedeljek" },
    ],
  },
};

/* ---------- Dnevna rutina (časovnica za Danes zaslon + opomnike) ---------- */

export const ROUTINE: RoutineStep[] = [
  { time: "03:40", title: "Hitri start", kind: "meal", ref: "m-0340" },
  { time: "04:00", title: "Trening (po dnevu v tednu)", kind: "training" },
  { time: "04:45", title: "Po treningu", kind: "meal", ref: "m-0445" },
  { time: "05:00", title: "Odhod v službo (hrana s sabo)", kind: "logistics" },
  { time: "07:30", title: "Malica 1", kind: "meal", ref: "m-0730" },
  { time: "10:30", title: "Malica 2", kind: "meal", ref: "m-1030" },
  { time: "13:30", title: "Glavni obrok", kind: "meal", ref: "m-1330" },
  { time: "15:15", title: "Recovery po službi", kind: "meal", ref: "m-1515" },
  { time: "18:30", title: "Večerja", kind: "meal", ref: "m-1830" },
  { time: "21:00", title: "Pred spanjem", kind: "meal", ref: "m-2100" },
];

/* ---------- Navade (dnevni tracker) ---------- */

export const HABITS = [
  { id: "trening", label: "Trening" },
  { id: "prehrana", label: "Prehrana" },
  { id: "voda", label: "Voda" },
  { id: "spanec", label: "Spanec" },
  { id: "dodatki", label: "Dodatki" },
  { id: "fokus", label: "Fokus" },
] as const;

export type HabitId = (typeof HABITS)[number]["id"];

/* ---------- Pomožne funkcije ---------- */

const DAY_INDEX_TO_KEY: WeekdayKey[] = [
  "VIKEND", // 0 = nedelja
  "PON",
  "TOR",
  "SRE",
  "CET",
  "PET",
  "VIKEND", // 6 = sobota
];

/** Vrne ključ treninga za dani datum (privzeto danes). */
export function trainingKeyForDate(date = new Date()): WeekdayKey {
  return DAY_INDEX_TO_KEY[date.getDay()];
}

/** Vrne današnji trening. */
export function todaysTraining(date = new Date()): TrainingDay {
  return TRAINING_DAYS[trainingKeyForDate(date)];
}

/** Vrne naslednji obrok glede na trenutno uro (ali prvi jutrišnji, če je dan mimo). */
export function nextMeal(now = new Date()): Meal {
  const mins = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };
  const upcoming = MEALS.find((meal) => toMin(meal.time) >= mins);
  return upcoming ?? MEALS[0];
}