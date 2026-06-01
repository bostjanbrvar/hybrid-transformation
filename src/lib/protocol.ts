// src/lib/protocol.ts
// =============================================================
// HYBRID TRANSFORMATION — ZAKLENJEN PROTOKOL (single source of truth)
// Prehrana, rutina, trening in dodatki so fiksni. Ne spreminjaj brez razloga.
// Vse ostalo (Danes zaslon, opomniki, beleženje) bere iz tega objekta.
// =============================================================

/* ---------- Tipi ---------- */

export type Tag = string;

export interface Meal {
  id: string;
  time: string;        // "HH:MM"
  slot: string;        // oznaka bloka (npr. "HITRI START")
  name: string;        // npr. "Pre-workout aktivacija"
  desc: string;        // kratek opis namena
  items: string[];     // glavne sestavine z gramažami
  optional?: string[]; // opcijsko / po potrebi
  tags: Tag[];
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

export const MEALS: Meal[] = [
  {
    id: "m-0340",
    time: "03:40",
    slot: "HITRI START",
    name: "Pre-workout aktivacija",
    desc: "Minimalističen, hiter in učinkovit jutranji pre-workout obrok.",
    items: [
      "Banana 120 g",
      "Whey protein 30 g",
      "Voda 4–5 dl",
      "Ščepec soli",
      "Kreatin 5 g",
    ],
    optional: ["Barcaffè kava 1–2 žlički (5–10 g) + 1,5–2 dl vode"],
    tags: ["takojšnja energija", "več moči na treningu", "fokus kot laser"],
  },
  {
    id: "m-0445",
    time: "04:45",
    slot: "PO TRENINGU",
    name: "Takojšnja regeneracija",
    desc: "Prvi korak po treningu za obnovo, zaščito mišic in hitro vračanje energije.",
    items: [
      "Whey 30 g",
      "Banana 120 g",
      "Voda 3–4 dl",
      "Med 10–15 g",
      "Ščepec soli",
    ],
    optional: ["3–5 navadnih riževih vafljev (30–40 g)"],
    tags: ["začetek regeneracije", "zaščita in rast mišic", "hitro polnjenje energije"],
    critical: true,
  },
  {
    id: "m-0730",
    time: "07:30",
    slot: "MALICA 1",
    name: "Stabilna energija",
    desc: "Popoln prehod iz hitre regeneracije v stabilno energijo za delo in fokus.",
    items: [
      "Skuta 200–250 g",
      "Ovseni kosmiči 60 g",
      "Sadje 100–150 g",
      "Med 10 g",
      "Kokosovo mleko 30–50 ml",
      "Voda 1–2 dl",
    ],
    optional: ["Cimet ali ščepec soli"],
    tags: ["stabilna energija", "fokus brez padca", "dovolj proteinov"],
  },
  {
    id: "m-1030",
    time: "10:30",
    slot: "MALICA 2",
    name: "Anti-catabolic",
    desc: "Pametna malica za zaščito mišic, stabilno energijo in fokus brez padca.",
    items: ["Sadje 150 g", "Oreščki 30 g"],
    optional: ["Whey protein 30 g (z 200–300 ml vode)"],
    tags: ["zaščita mišic", "stabilna energija", "fokus brez crash-a"],
  },
  {
    id: "m-1330",
    time: "13:30",
    slot: "GLAVNI OBROK",
    name: "Anabolni fuel",
    desc: "Glavni obrok dneva za maksimalno energijo, regeneracijo in rast mišic.",
    items: [
      "Protein: piščanec/puran 180–200 g · tuna/losos/goveje 150–180 g · ali 4–5 jajc",
      "OH: riž 80–100 g (surovo) · krompir 200–300 g · testenine/ajda/kruh 80–100 g",
      "Zelenjava: bučke 100–150 g + korenje 50–100 g + gobe 50–100 g",
      "Solata + paradižnik 150–250 g",
      "Olivno olje 10–15 g",
    ],
    tags: ["glavni vir energije", "rast mišic", "odlična prebava"],
  },
  {
    id: "m-1515",
    time: "15:15",
    slot: "RECOVERY",
    name: "Po službi (kritično)",
    desc: "Ključni obrok za prehod iz dela nazaj v energijo, regeneracijo in stabilen večer.",
    items: ["Jajca 3–4", "Riž 60 g ali kruh 80 g"],
    optional: ["1 kos sadja (banana ali jabolko) + malo zelenjave"],
    tags: ["prepreči energy crash", "regeneracija", "mišična podpora"],
    critical: true,
  },
  {
    id: "m-1830",
    time: "18:30",
    slot: "VEČERJA",
    name: "Stabilizacija",
    desc: "Umirjen, uravnotežen obrok za stabilno energijo in pripravo na regeneracijo ponoči.",
    items: [
      "Protein: tuna/piščanec/puran 150 g · ali 3 cela jajca + 1 beljak",
      "OH: riž 60–70 g · krompir 180–220 g · kruh 60–70 g",
      "Zelenjava 200 g (bučke + korenje + gobe) ali solata + paradižnik",
      "Olivno olje 5–8 g",
    ],
    tags: ["stabilna energija do večera", "dodatni protein za mišice", "boljša priprava na noč"],
  },
  {
    id: "m-2100",
    time: "21:00",
    slot: "PRED SPANJEM",
    name: "Nočna regeneracija",
    desc: "Zadnji obrok dneva za zaščito mišic in regeneracijo čez noč.",
    items: ["Skuta 200–250 g", "Voda 1–2 dl"],
    optional: ["Arašidovo maslo 15 g ali oreščki 20 g", "Cimet ali kakav"],
    tags: ["slow protein", "regeneracija čez noč", "zaščita mišic"],
    critical: true,
  },
];

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
      { name: "Lat pulldown" },
      { name: "Veslanje sede" },
      { name: "Reverse fly" },
      { name: "Biceps curl" },
      { name: "Hammer curl" },
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
      { name: "Leg press" },
      { name: "Leg extension" },
      { name: "Hamstring curl" },
      { name: "Meča" },
      { name: "Trebušne vaje" },
    ],
  },
  PET: {
    key: "PET",
    label: "Petek",
    focus: "Ramena & roke",
    type: "training",
    subtitle: "Ramenski volumen in zaključek za roke.",
    exercises: [
      { name: "Shoulder press" },
      { name: "Lateral raise" },
      { name: "Rear delt fly" },
      { name: "Biceps curl" },
      { name: "Triceps pushdown" },
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