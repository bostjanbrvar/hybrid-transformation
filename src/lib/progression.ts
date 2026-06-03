// src/lib/progression.ts
// =============================================================
// HYBRID TRANSFORMATION — progression engine (čista logika)
// Predlaga dvig teže, ko so v zadnji seji vse serije pri ISTI teži in vse
// ponovitve dosegle ciljni "ceiling". Modul je pure: NE bere localStoragea —
// serije prejme od klicatelja (ki uporabi lastSerijeFor / exerciseHistory).
// =============================================================

import type { LoggedSet } from "@/lib/storage";

/** Privzeti korak dviga (kg), če vaja nima nastavljenega progressionStep. */
export const DEFAULT_PROGRESSION_STEP = 1.25;

export interface ProgressionHint {
  currentWeight: number;   // enotna teža zadnje seje
  ceiling: number;         // ciljne ponovitve (višja številka iz targetReps)
  step: number;            // uporabljen korak dviga
  suggestedWeight: number; // currentWeight + step
}

/**
 * Vrne višjo ciljno ponovitev iz niza targetReps ("12 / 10 / 8 / 8" → 12,
 * "12 / 10" → 12, "10" → 10). null, če ni nobene števke.
 */
export function parseRepCeiling(targetReps?: string): number | null {
  if (!targetReps) return null;
  const nums = targetReps.match(/\d+/g);
  if (!nums || nums.length === 0) return null;
  return Math.max(...nums.map(Number));
}

/**
 * Predlog dviga teže glede na zadnjo sejo vaje. Vrne hint SAMO, kadar:
 *  - serije obstajajo,
 *  - vaja ima targetReps (sicer ni cilja),
 *  - VSE serije so pri isti teži (sicer še delaš proti vrhu), IN
 *  - VSE ponovitve so >= ceiling.
 * Sicer vrne null (= ni predloga, namig se ne prikaže).
 */
export function progressionHint(
  serije: LoggedSet[],
  targetReps?: string,
  step: number = DEFAULT_PROGRESSION_STEP,
): ProgressionHint | null {
  if (!serije || serije.length === 0) return null;

  const ceiling = parseRepCeiling(targetReps);
  if (ceiling == null) return null;

  const w = serije[0].teza;
  if (w <= 0) return null; // brez teže (npr. lastna teža) ne predlagamo dviga

  const istaTeza = serije.every((s) => Math.abs(s.teza - w) < 0.001);
  if (!istaTeza) return null;

  const vseDosegleCilj = serije.every((s) => s.ponovitve >= ceiling);
  if (!vseDosegleCilj) return null;

  return {
    currentWeight: w,
    ceiling,
    step,
    suggestedWeight: Math.round((w + step) * 100) / 100,
  };
}
