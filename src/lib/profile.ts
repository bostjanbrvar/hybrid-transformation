// src/lib/profile.ts
// =============================================================
// HYBRID TRANSFORMATION — PROFIL (statični / počasni osebni podatki)
//
// Profil drži SAMO podatke, ki se spreminjajo redko (ime, spol, rojstni
// datum, višina, raven aktivnosti, cilj). Teža NE spada sem — je dnevna
// meritev in se beleži ločeno (DayLog).
//
// SSR-safe: branje/pisanje preverja typeof window.
// =============================================================

export type Spol = "M" | "Ž";

export type Aktivnost =
  | "sedece"
  | "lahko"
  | "zmerno"
  | "aktivno"
  | "zelo_aktivno";

export type Cilj = "misicna_masa" | "vzdrzevanje" | "izguba_mascobe";

export interface Profile {
  ime: string;
  spol: Spol;
  rojstniDatum: string; // ISO "YYYY-MM-DD"
  visinaCm: number;
  aktivnost: Aktivnost;
  cilj: Cilj;
}

/* ---------- Ključ ---------- */

const PROFILE_KEY = "bostjan_protocol_profile_v1";

/* ---------- Mifflin-St Jeor množitelji aktivnosti ---------- */
// Standardni PAL faktorji — kalkulator (TDEE) jih kasneje samo uporabi.
export const AKTIVNOST_MNOZITELJI: Record<Aktivnost, number> = {
  sedece: 1.2,
  lahko: 1.375,
  zmerno: 1.55,
  aktivno: 1.725,
  zelo_aktivno: 1.9,
};

/* ---------- Slovenske oznake za dropdowne ---------- */

export const AKTIVNOST_OPISI: Record<Aktivnost, string> = {
  sedece: "Sedeče (malo ali brez vadbe)",
  lahko: "Lahka aktivnost (1–3× / teden)",
  zmerno: "Zmerna aktivnost (3–5× / teden)",
  aktivno: "Aktivno (6–7× / teden)",
  zelo_aktivno: "Zelo aktivno (fizično delo ali 2× dnevno)",
};

export const CILJ_OPISI: Record<Cilj, string> = {
  misicna_masa: "Mišična masa",
  vzdrzevanje: "Vzdrževanje",
  izguba_mascobe: "Izguba maščobe",
};

export const SPOL_OPISI: Record<Spol, string> = {
  M: "Moški",
  Ž: "Ženska",
};

/* ---------- Privzetki ---------- */

export const DEFAULT_PROFILE: Profile = {
  ime: "",
  spol: "M",
  rojstniDatum: "",
  visinaCm: 180,
  aktivnost: "zmerno",
  cilj: "misicna_masa",
};

/* ---------- API ---------- */

/** Vrne shranjen profil (združen s privzetki). Brez shranjenega → privzetki. */
export function getProfile(): Profile {
  if (typeof window === "undefined") return { ...DEFAULT_PROFILE };
  try {
    const raw = window.localStorage.getItem(PROFILE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

/** Shrani profil. */
export function saveProfile(profile: Profile): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch {
    // npr. zaseden prostor / zaseben način — tiho ignoriraj.
  }
}

/* ---------- Pomožno ---------- */

/** Izračuna starost v letih iz ISO rojstnega datuma. Neveljaven datum → 0. */
export function izracunajStarost(
  rojstniDatum: string,
  zdaj: Date = new Date(),
): number {
  if (!rojstniDatum) return 0;
  const d = new Date(rojstniDatum);
  if (Number.isNaN(d.getTime())) return 0;

  let leta = zdaj.getFullYear() - d.getFullYear();
  const meseci = zdaj.getMonth() - d.getMonth();
  if (meseci < 0 || (meseci === 0 && zdaj.getDate() < d.getDate())) {
    leta -= 1;
  }
  return leta < 0 ? 0 : leta;
}
