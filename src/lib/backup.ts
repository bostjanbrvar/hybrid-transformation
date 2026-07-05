// src/lib/backup.ts
// =============================================================
// HYBRID TRANSFORMATION — varnostna kopija (izvoz/uvoz)
//
// Vsi uporabnikovi podatki živijo SAMO v localStorage → izguba telefona =
// izguba vsega. Ta modul zbere vse app ključe v en JSON (s shemo + datumom),
// ga zna prebrati nazaj, validirati in ATOMARNO zapisati.
//
// EDINI vir resnice za "kateri ključi so del kopije" je BACKUP_KEYS spodaj.
// Ključi se NE zapisujejo na trdo — uvožene so konstante iz posameznih
// modulov (storage/profile/meritve/makro/reminders/reminderScheduler). Ko
// dodaš nov localStorage ključ kjerkoli, izvozi konstanto in jo dodaj sem.
//
// SSR-safe: vse funkcije, ki se dotikajo localStorage, varno delujejo tudi
// brez window (na strežniku vrnejo prazno / no-op).
// =============================================================

import { TRACKER_KEY } from "@/lib/storage";
import { PROFILE_KEY } from "@/lib/profile";
import { MERITVE_KEY } from "@/lib/meritve";
import { MAKRO_CILJ_KEY } from "@/lib/makro";
import { FIRED_KEY } from "@/lib/reminders";
import { ENABLED_KEY } from "@/lib/reminderScheduler";

/* ---------- Shema ---------- */

export const BACKUP_SCHEMA = "hybrid-backup";
export const BACKUP_VERSION = 1;

/** Vsi app localStorage ključi imajo to predpono — varnostni filter pri uvozu. */
const KEY_PREFIX = "bostjan_protocol_";

/** Registry ključev, ki so del kopije (label je za povzetek uporabniku). */
export const BACKUP_KEYS: { key: string; label: string }[] = [
  { key: TRACKER_KEY, label: "Dnevnik (trening, obroki, voda, teža)" },
  { key: PROFILE_KEY, label: "Profil" },
  { key: MERITVE_KEY, label: "Meritve" },
  { key: MAKRO_CILJ_KEY, label: "Makro cilj" },
  { key: ENABLED_KEY, label: "Opomniki (vklop)" },
  { key: FIRED_KEY, label: "Opomniki (dnevni dedup)" },
];

export interface BackupFile {
  schema: string;
  version: number;
  exportedAt: string; // ISO
  app: string;
  // Surove localStorage vrednosti (stringi) — točen round-trip brez izgub.
  data: Record<string, string>;
}

export interface BackupSummary {
  exportedAt: string;
  keyCount: number;
  dnevniVnosi: number; // št. dni v dnevniku
  meritve: number;     // št. zabeleženih meritev
  imaProfil: boolean;
  imaMakroCilj: boolean;
}

/* ---------- Izvoz ---------- */

/**
 * Sestavi kopijo iz trenutnega localStorage. Vključi le ključe, ki imajo
 * vrednost. Vrednosti so surovi stringi (kot v localStorage) za točen zapis.
 */
export function buildBackup(now: Date): BackupFile {
  const data: Record<string, string> = {};
  if (typeof window !== "undefined") {
    for (const { key } of BACKUP_KEYS) {
      try {
        const v = window.localStorage.getItem(key);
        if (v !== null) data[key] = v;
      } catch {
        // nedostopen storage — preskoči ključ
      }
    }
  }
  return {
    schema: BACKUP_SCHEMA,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    app: "hybrid-transformation",
    data,
  };
}

/** Kopija kot lepo oblikovan JSON string. */
export function backupToJson(now: Date): string {
  return JSON.stringify(buildBackup(now), null, 2);
}

/* ---------- Branje + validacija ---------- */

export type ParseResult =
  | { ok: true; file: BackupFile; summary: BackupSummary }
  | { ok: false; error: string };

/** Varno prešteje ključe v JSON objektu/polju; 0 ob napaki. */
function countEntries(raw: string | undefined): number {
  if (!raw) return 0;
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v.length;
    if (v && typeof v === "object") return Object.keys(v).length;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * Prebere in POPOLNOMA validira besedilo kopije. Vrne povzetek za potrditev.
 * NE zapiše ničesar. Zavrne: neveljaven JSON, napačna shema, novejša verzija,
 * manjkajoč/napačen `data`, ali ključ brez pričakovane predpone (varnost).
 */
export function parseBackup(text: string): ParseResult {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return { ok: false, error: "Datoteka ni veljaven JSON." };
  }
  if (!obj || typeof obj !== "object") {
    return { ok: false, error: "Datoteka ni veljavna kopija." };
  }

  const o = obj as Record<string, unknown>;
  if (o.schema !== BACKUP_SCHEMA) {
    return { ok: false, error: "To ni HYBRID varnostna kopija." };
  }
  if (typeof o.version !== "number" || o.version < 1) {
    return { ok: false, error: "Neveljavna verzija kopije." };
  }
  if (o.version > BACKUP_VERSION) {
    return {
      ok: false,
      error: `Kopija je iz novejše različice (v${o.version}). Posodobi aplikacijo.`,
    };
  }
  if (!o.data || typeof o.data !== "object" || Array.isArray(o.data)) {
    return { ok: false, error: "Kopija nima podatkov (data)." };
  }

  const rawData = o.data as Record<string, unknown>;
  const data: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawData)) {
    if (!key.startsWith(KEY_PREFIX)) {
      return { ok: false, error: `Nepričakovan ključ v kopiji: ${key}` };
    }
    if (typeof value !== "string") {
      return { ok: false, error: `Ključ ${key} nima veljavne vrednosti.` };
    }
    data[key] = value;
  }

  const file: BackupFile = {
    schema: BACKUP_SCHEMA,
    version: o.version,
    exportedAt: typeof o.exportedAt === "string" ? o.exportedAt : "",
    app: typeof o.app === "string" ? o.app : "",
    data,
  };

  const summary: BackupSummary = {
    exportedAt: file.exportedAt,
    keyCount: Object.keys(data).length,
    dnevniVnosi: countEntries(data[TRACKER_KEY]),
    meritve: countEntries(data[MERITVE_KEY]),
    imaProfil: data[PROFILE_KEY] != null,
    imaMakroCilj: data[MAKRO_CILJ_KEY] != null,
  };

  return { ok: true, file, summary };
}

/* ---------- Uvoz (atomarno) ---------- */

/**
 * Zapiše vse ključe iz kopije. ATOMARNO: pred pisanjem naredi posnetek
 * obstoječih vrednosti; če katerikoli setItem spodleti, povrne posnetek
 * (rollback) → nikoli delnega zapisa. Obstoječih ključev, ki jih v kopiji
 * NI, ne briše (uvoz je prepis prisotnih ključev, ne popolna zamenjava).
 */
export function applyBackup(file: BackupFile): { ok: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { ok: false, error: "Uvoz ni na voljo (ni brskalnika)." };
  }

  const entries = Object.entries(file.data);
  // Posnetek prejšnjih vrednosti za morebiten rollback.
  const snapshot: { key: string; prev: string | null }[] = entries.map(
    ([key]) => ({ key, prev: window.localStorage.getItem(key) }),
  );

  const written: string[] = [];
  try {
    for (const [key, value] of entries) {
      window.localStorage.setItem(key, value);
      written.push(key);
    }
    return { ok: true };
  } catch {
    // Rollback vseh že zapisanih ključev na prejšnje stanje.
    for (const { key, prev } of snapshot) {
      if (!written.includes(key)) continue;
      try {
        if (prev === null) window.localStorage.removeItem(key);
        else window.localStorage.setItem(key, prev);
      } catch {
        // best-effort rollback
      }
    }
    return {
      ok: false,
      error: "Zapis ni uspel (poln prostor?). Podatki so nespremenjeni.",
    };
  }
}
