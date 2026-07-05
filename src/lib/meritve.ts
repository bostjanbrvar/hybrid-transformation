// src/lib/meritve.ts
// =============================================================
// HYBRID TRANSFORMATION — MERITVE (lasten časovni vir za analitiko)
//
// Dnevna teža + tedenski obsegi. To je SVOJ store, ločen od dnevnega
// loga (storage.ts). Analitika v naslednjem koraku bere SAMO od tukaj.
// (storage.ts weightMorning/waist puščamo pri miru — brez migracije.)
//
// Hranjeno kot mapa datum→Meritev pod ključem bostjan_protocol_meritve_v1.
// SSR-safe: branje/pisanje preverja typeof window.
// =============================================================

import { toDateKey } from "@/lib/storage";

/* ---------- Tip ---------- */

export interface Meritev {
  datum: string; // ISO "YYYY-MM-DD" (ključ)
  tezaKg?: number;
  pasCm?: number;
  bicepsCm?: number;
  kvadricepsCm?: number;
  opomba?: string;
}

/** Numerična polja meritve (za drseče povprečje ipd.). */
export type MeritevPolje = "tezaKg" | "pasCm" | "bicepsCm" | "kvadricepsCm";

/* ---------- Ključ ---------- */

export const MERITVE_KEY = "bostjan_protocol_meritve_v1";

/* ---------- Nizkonivojski dostop ---------- */

function readAll(): Record<string, Meritev> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(MERITVE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Meritev>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MERITVE_KEY, JSON.stringify(all));
  } catch {
    // tiho ignoriraj (poln prostor / zaseben način)
  }
}

/* ---------- API ---------- */

/** Vrne meritev za datum (ali undefined, če je ni). */
export function getMeritev(datum: string): Meritev | undefined {
  return readAll()[datum];
}

/**
 * Upsert po datumu z MERGE: definirana polja prepišejo, prazna (undefined)
 * NE brišejo obstoječih. Za popolno odstranitev uporabi deleteMeritev.
 */
export function saveMeritev(meritev: Meritev): Meritev {
  const all = readAll();
  const obstojec = all[meritev.datum] ?? { datum: meritev.datum };

  // Definirana polja prepišejo, undefined NE prepiše obstoječih.
  const zdruzen: Meritev = { ...obstojec, datum: meritev.datum };
  if (meritev.tezaKg !== undefined) zdruzen.tezaKg = meritev.tezaKg;
  if (meritev.pasCm !== undefined) zdruzen.pasCm = meritev.pasCm;
  if (meritev.bicepsCm !== undefined) zdruzen.bicepsCm = meritev.bicepsCm;
  if (meritev.kvadricepsCm !== undefined)
    zdruzen.kvadricepsCm = meritev.kvadricepsCm;
  if (meritev.opomba !== undefined) zdruzen.opomba = meritev.opomba;

  all[meritev.datum] = zdruzen;
  writeAll(all);
  return zdruzen;
}

/** Vse meritve, sortirane po datumu NARAŠČAJOČE. */
export function getVseMeritve(): Meritev[] {
  return Object.values(readAll()).sort((a, b) =>
    a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0,
  );
}

/** Izbriše meritev za datum. */
export function deleteMeritev(datum: string): void {
  const all = readAll();
  if (datum in all) {
    delete all[datum];
    writeAll(all);
  }
}

/* ---------- Analitika: drseče povprečje ---------- */

export interface TockaPovprecja {
  datum: string;
  vrednost: number;
}

const DAN_MS = 24 * 60 * 60 * 1000;

/**
 * 7-dnevno (privzeto) drseče povprečje izbranega polja.
 * Preskoči prazne vrednosti; za vsako merjeno točko povpreči vrednosti
 * znotraj zadnjih `okno` koledarskih dni (vključno s tisto točko).
 */
export function drsecePovprecje(
  meritve: Meritev[],
  polje: MeritevPolje,
  okno = 7,
): TockaPovprecja[] {
  const tocke = meritve
    .filter((m) => typeof m[polje] === "number")
    .map((m) => ({ datum: m.datum, v: m[polje] as number }))
    .sort((a, b) => (a.datum < b.datum ? -1 : a.datum > b.datum ? 1 : 0));

  const out: TockaPovprecja[] = [];
  for (let i = 0; i < tocke.length; i++) {
    const konecMs = new Date(tocke[i].datum).getTime();
    const zacetekMs = konecMs - (okno - 1) * DAN_MS;
    let vsota = 0;
    let n = 0;
    for (let j = i; j >= 0; j--) {
      if (new Date(tocke[j].datum).getTime() < zacetekMs) break;
      vsota += tocke[j].v;
      n += 1;
    }
    out.push({ datum: tocke[i].datum, vrednost: vsota / n });
  }
  return out;
}

/* ---------- Pomožno ---------- */

/** Današnji datum kot "YYYY-MM-DD" (lokalni čas). */
export function danesDatum(): string {
  return toDateKey(new Date());
}
