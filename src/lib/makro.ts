// src/lib/makro.ts
// =============================================================
// HYBRID TRANSFORMATION — MAKRO MOTOR
//
// Sestavi dnevni kalorijski in makro cilj iz:
//  - profila (Mifflin-St Jeor BMR, aktivnost, cilj) — profile.ts
//  - telesne teže (7-dnevno povprečje ali zadnja meritev) — meritve.ts
// Brez ročnega vnosa teže.
//
// Konkretne vrednosti (kalorijni faktor, beljakovine g/kg, delež maščob)
// so definirane v profile.ts — to je njihov edini vir.
// =============================================================

import {
  izracunajStarost,
  izracunajBMR,
  izracunajTDEE,
  CILJ_NASTAVITVE,
  MASCOBE_DELEZ_KCAL,
  type Profile,
} from "@/lib/profile";

/* ---------- Tipi ---------- */

export interface Makro {
  gramov: number;
  kcal: number;
  delez: number; // 0..1 glede na skupne kalorije
}

export interface MakroRezultat {
  starost: number;
  tezaKg: number;
  bmr: number;
  tdee: number;
  kalorije: number;
  beljakovine: Makro;
  mascobe: Makro;
  ogljikoviHidrati: Makro;
}

/* ---------- Izračun ---------- */

/** Izračuna kalorije + makre iz profila in telesne teže (kg). */
export function izracunajMakre(profile: Profile, tezaKg: number): MakroRezultat {
  const starost = izracunajStarost(profile.rojstniDatum);
  const bmr = izracunajBMR(profile.spol, starost, profile.visinaCm, tezaKg);
  const tdee = izracunajTDEE(bmr, profile.aktivnost);

  const nast = CILJ_NASTAVITVE[profile.cilj];
  const kalorije = Math.round(tdee * nast.kalorijniFaktor);

  // Beljakovine: g/kg telesne teže.
  const belG = Math.round(nast.beljakovineGkg * tezaKg);
  const belKcal = belG * 4;

  // Maščobe: delež kalorij.
  const masKcal = Math.round(kalorije * MASCOBE_DELEZ_KCAL);
  const masG = Math.round(masKcal / 9);

  // Ogljikovi hidrati: preostanek (ne negativno).
  const ohKcal = Math.max(0, kalorije - belKcal - masKcal);
  const ohG = Math.round(ohKcal / 4);

  const delez = (kcal: number) => (kalorije > 0 ? kcal / kalorije : 0);

  return {
    starost,
    tezaKg,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    kalorije,
    beljakovine: { gramov: belG, kcal: belKcal, delez: delez(belKcal) },
    mascobe: { gramov: masG, kcal: masKcal, delez: delez(masKcal) },
    ogljikoviHidrati: { gramov: ohG, kcal: ohKcal, delez: delez(ohKcal) },
  };
}

/* ---------- Shranjen cilj (za AI / rule-based coach) ---------- */

const MAKRO_CILJ_KEY = "bostjan_protocol_makro_cilj_v1";

export interface ShranjenMakroCilj {
  posodobljeno: string; // ISO datum/čas
  cilj: Profile["cilj"];
  rezultat: MakroRezultat;
}

/** Shrani izračunani makro cilj, da ga lahko coach kasneje uporabi. */
export function shraniMakroCilj(
  profile: Profile,
  rezultat: MakroRezultat,
  zdaj: string,
): void {
  if (typeof window === "undefined") return;
  const zapis: ShranjenMakroCilj = {
    posodobljeno: zdaj,
    cilj: profile.cilj,
    rezultat,
  };
  try {
    window.localStorage.setItem(MAKRO_CILJ_KEY, JSON.stringify(zapis));
  } catch {
    // tiho ignoriraj
  }
}

/** Prebere shranjeni makro cilj (ali null). */
export function getMakroCilj(): ShranjenMakroCilj | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(MAKRO_CILJ_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}
