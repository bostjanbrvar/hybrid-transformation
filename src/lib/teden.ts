// src/lib/teden.ts
// =============================================================
// HYBRID TRANSFORMATION — tedenski pregled (zadnjih 7 dni)
//
// Agregira zadnjih 7 dni (današnji vključen) v kompakten povzetek za
// dashboard: trening dnevi vs načrtovani, % pojedenih obrokov, % navad in
// streak zaporednih "aktivnih" dni.
//
// `agregirajTeden` je ČISTA funkcija (brez localStorage) — jo testira harness.
// `tedenskiPregled` je tanek bralec, ki sestavi 7 dni prek obstoječih helperjev
// (getDayLog/toDateKey/trainingKeyForDate) in kliče agregacijo. SSR-safe: bere
// localStorage posredno prek getDayLog (na strežniku vrne prazne loge).
// =============================================================

import { getDayLog, toDateKey, type DayLog } from "@/lib/storage";
import { TRAINING_DAYS, trainingKeyForDate, HABITS } from "@/lib/protocol";
import { meals } from "@/lib/nutrition";

const OKNO_DNI = 7;                    // velikost okna
const OBROKI_NA_DAN = meals.length;    // 8 obrokov/dan (denominator za %)
const NAVADE_NA_DAN = HABITS.length;   // 6 navad/dan (denominator za %)

/**
 * Prag za "aktiven dan" v streaku: vsaj 4 od 6 navad (~2/3 dneva). Dovolj
 * visoko, da pomeni resničen trud, a dopušča en-dva spregledana vnosa.
 */
export const STREAK_PRAG = 4;

/** En dan okna: shranjen log + ali je bil to načrtovan trening dan. */
export interface DanVnos {
  log: DayLog;
  trening: boolean; // TRAINING_DAYS[...].type === "training"
}

export interface TedenskiPregled {
  dni: number;             // dni v oknu (7)
  treningDnevi: number;    // dni z označeno navado "trening"
  plannedTraining: number; // načrtovani trening dnevi v oknu (ne-počivalni)
  obrokiPct: number;       // označeni obroki / (8 * dni) v %
  navadePct: number;       // označene navade / (6 * dni) v %
  streak: number;          // zaporedni aktivni dnevi do danes (cap = 7)
  prazno: boolean;         // true = vseh 7 dni brez kakršnekoli aktivnosti
}

/** Št. označenih navad v dnevu (šteje le znane navade iz HABITS). */
function steviloNavad(log: DayLog): number {
  return HABITS.reduce((n, h) => n + (log.habits[h.id] ? 1 : 0), 0);
}

/** Ali je dan sploh imel kakšno aktivnost (za "prazen teden" detekcijo). */
function aktivnost(log: DayLog): boolean {
  return (
    steviloNavad(log) > 0 ||
    log.mealsDone.length > 0 ||
    log.waterMl > 0 ||
    log.training.exercises.some((e) => (e.serije?.length ?? 0) > 0)
  );
}

/**
 * Čista agregacija čez dane dni (urejeni od najstarejšega do DANES = zadnji).
 * Streak se šteje od zadnjega dneva nazaj do prvega dneva pod pragom.
 */
export function agregirajTeden(days: DanVnos[]): TedenskiPregled {
  const dni = days.length;
  let treningDnevi = 0;
  let plannedTraining = 0;
  let obrokiChecked = 0;
  let navadeChecked = 0;

  for (const d of days) {
    if (d.trening) plannedTraining++;
    if (d.log.habits.trening) treningDnevi++;
    // clamp na 8/dan, da morebitni podvojeni/zastareli id-ji ne dvignejo >100 %
    obrokiChecked += Math.min(d.log.mealsDone.length, OBROKI_NA_DAN);
    navadeChecked += steviloNavad(d.log);
  }

  const obrokiDenom = OBROKI_NA_DAN * dni;
  const navadeDenom = NAVADE_NA_DAN * dni;

  let streak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    if (steviloNavad(days[i].log) >= STREAK_PRAG) streak++;
    else break;
  }

  return {
    dni,
    treningDnevi,
    plannedTraining,
    obrokiPct: obrokiDenom ? Math.round((obrokiChecked / obrokiDenom) * 100) : 0,
    navadePct: navadeDenom ? Math.round((navadeChecked / navadeDenom) * 100) : 0,
    streak,
    prazno: days.every((d) => !aktivnost(d.log)),
  };
}

/** Sestavi zadnjih 7 dni (danes vključen) iz localStorage in agregira. */
export function tedenskiPregled(now: Date = new Date()): TedenskiPregled {
  const days: DanVnos[] = [];
  for (let i = OKNO_DNI - 1; i >= 0; i--) {
    // lokalni datum i dni nazaj (JS normalizira negativni dan v mesecu)
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    const log = getDayLog(toDateKey(d));
    const trening = TRAINING_DAYS[trainingKeyForDate(d)].type === "training";
    days.push({ log, trening });
  }
  return agregirajTeden(days);
}

/* ---------- Heatmap navad (12 tednov, GitHub stil) ---------- */

const HEAT_TEDNI = 12; // stolpcev (tednov), poravnano na ponedeljek

export interface HeatCelica {
  datum: string;          // "YYYY-MM-DD"
  count: number;          // označene navade tega dne (0..6)
  level: 0 | 1 | 2 | 3;   // barvni razred: 0 / 1–2 / 3–4 / 5–6
  jeDanes: boolean;
  prihodnost: boolean;    // datum po danes (prazna celica v zadnjem stolpcu)
}

/** Razred (0..3) glede na št. označenih navad. Dokumentirani pragovi. */
function heatLevel(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0; // 0
  if (count <= 2) return 1; // 1–2
  if (count <= 4) return 2; // 3–4
  return 3; // 5–6
}

/**
 * Čista tvorba mreže: 12 stolpcev (tednov) × 7 vrstic (pon→ned), poravnano na
 * ponedeljek tekočega tedna nazaj. `count(datum)` vrne št. navad za dan (0 če
 * ni podatka). Zadnji stolpec ima lahko prihodnje (prazne) celice. Testabilno.
 */
export function heatmapMreza(
  now: Date,
  count: (datum: string) => number,
): HeatCelica[][] {
  const danesKey = toDateKey(now);
  // ponedeljek tekočega tedna
  const pon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  pon.setDate(pon.getDate() - ((pon.getDay() + 6) % 7));
  // začetek mreže: 11 tednov pred tem ponedeljkom
  const start = new Date(
    pon.getFullYear(),
    pon.getMonth(),
    pon.getDate() - (HEAT_TEDNI - 1) * 7,
  );

  const tedni: HeatCelica[][] = [];
  for (let c = 0; c < HEAT_TEDNI; c++) {
    const teden: HeatCelica[] = [];
    for (let r = 0; r < 7; r++) {
      const d = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate() + c * 7 + r,
      );
      const datum = toDateKey(d);
      const prihodnost = datum > danesKey;
      const n = prihodnost ? 0 : count(datum);
      teden.push({
        datum,
        count: n,
        level: heatLevel(n),
        jeDanes: datum === danesKey,
        prihodnost,
      });
    }
    tedni.push(teden);
  }
  return tedni;
}

/** Heatmap iz localStorage (zadnjih 12 tednov navad). SSR-safe prek getDayLog. */
export function habitHeatmap(now: Date = new Date()): HeatCelica[][] {
  return heatmapMreza(now, (datum) => steviloNavad(getDayLog(datum)));
}
