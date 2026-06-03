// src/lib/coach.ts
// =============================================================
// HYBRID TRANSFORMATION — rule-based COACH (faza 1: progression sprožilci)
// Bere obstoječo logiko, NE podvaja pravil:
//  - dan & vaje:        todaysTraining (protocol.ts)
//  - zadnja izvedba:    lastSerijeFor (storage.ts) — najnovejša seja PRED
//                       datumom, kadarkoli (ne danes)
//  - predlog dviga:     progressionHint / parseRepCeiling (progression.ts)
//
// Pure-ish: localStorage bere posredno prek storage.ts (SSR-safe — na
// strežniku vrne prazno, zato so vse vaje "new"). Klicatelj (client stran)
// naj kliče v useEffect, da se izogne hydration mismatchu.
// =============================================================

import { todaysTraining } from "@/lib/protocol";
import { lastSerijeFor, toDateKey, type LoggedSet } from "@/lib/storage";
import { progressionHint, parseRepCeiling } from "@/lib/progression";

export type CoachKind = "increase" | "hold" | "new";

export interface CoachMsg {
  exerciseName: string;
  kind: CoachKind;
  suggestedWeight?: number; // samo "increase"
  targetReps: number;       // ciljne ponovitve (ceiling); 0 če vaja nima targetReps
  lastWeight?: number;      // "hold"/"increase": teža zadnje izvedbe
  text: string;
}

/** Najvišja teža v seji (za "hold" prikaz; seja je lahko mešanih tež). */
function topWeight(serije: LoggedSet[]): number {
  return serije.reduce((max, s) => (s.teza > max ? s.teza : max), 0);
}

/**
 * Coach sporočila za trening dan (privzeto danes). Recovery dan → []. Bonus
 * in cooldown vaje so izpuščene (faza 1: opcijske vaje ne nadlegujemo).
 */
export function getCoachMessages(date: Date = new Date()): CoachMsg[] {
  const day = todaysTraining(date);
  if (day.type !== "training") return [];

  const beforeDate = toDateKey(date); // izključi sam "date" → samo pretekle izvedbe
  const out: CoachMsg[] = [];

  for (const ex of day.exercises) {
    if (ex.cooldown || ex.bonus) continue;

    const ceiling = parseRepCeiling(ex.targetReps) ?? 0;
    const serije = lastSerijeFor(ex.name, beforeDate);

    // Vaja nikoli delana → "new".
    if (!serije || serije.length === 0) {
      out.push({
        exerciseName: ex.name,
        kind: "new",
        targetReps: ceiling,
        text: "Še nisi delal — začni z osnovno težo.",
      });
      continue;
    }

    const hint = progressionHint(serije, ex.targetReps, ex.progressionStep);

    if (hint) {
      // Cilj dosežen pri vseh serijah → predlagaj dvig.
      out.push({
        exerciseName: ex.name,
        kind: "increase",
        suggestedWeight: hint.suggestedWeight,
        targetReps: hint.ceiling,
        lastWeight: hint.currentWeight,
        text: `Dosegel cilj ${hint.ceiling} ponovitev → povečaj na ${hint.suggestedWeight} kg.`,
      });
    } else {
      // Delano, a cilj (še) ne dosežen → ostani pri trenutni teži.
      const w = topWeight(serije);
      out.push({
        exerciseName: ex.name,
        kind: "hold",
        targetReps: ceiling,
        lastWeight: w,
        text: `Nadaljuj pri trenutni teži (${w} kg).`,
      });
    }
  }

  return out;
}

/** Prioriteta za izbor najpomembnejšega sporočila (nižje = pomembnejše). */
const KIND_PRIORITY: Record<CoachKind, number> = {
  increase: 0,
  new: 1,
  hold: 2,
};

/**
 * Najpomembnejše sporočilo za dashboard kartico: increase > new > hold,
 * med enakimi prvo po vrstnem redu vaj. null, če ni nobenega (recovery/prazno).
 */
export function getTopCoachMessage(date: Date = new Date()): CoachMsg | null {
  const msgs = getCoachMessages(date);
  if (msgs.length === 0) return null;

  let best = msgs[0];
  for (const m of msgs) {
    if (KIND_PRIORITY[m.kind] < KIND_PRIORITY[best.kind]) best = m;
  }
  return best;
}
