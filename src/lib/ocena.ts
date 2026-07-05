// src/lib/ocena.ts
// =============================================================
// HYBRID TRANSFORMATION — ocena dneva (rule-based 1–10)
//
// Čista funkcija oceniDan(): nobenih odvisnosti od localStorage, zato je
// trivialno testabilna (glej harness). Klicatelj (/povzetek) sestavi vhod iz
// današnjega DayLoga.
//
// FORMULA (utežena vsota, rezultat 1–10):
//   obrokiPct  = označeni obroki / vsi obroki   (0..1)     · utež 40 %
//   navadePct  = označene navade / vse navade    (0..1)     · utež 40 %
//   treningTocka:                                            · utež 20 %
//       - počivalni dan  → 1 (počitek je pravilen = "spoštovan")
//       - trening dan    → 1 če je trening označen, sicer 0
//   raw   = 0.4*obrokiPct + 0.4*navadePct + 0.2*treningTocka   (0..1)
//   ocena = round(raw * 10), omejeno na [1, 10]
//
// Popoln dan = 10; prazen trening dan → 1 (nič), prazen počivalni dan → 2
// (samo trening točka). Verdikt po pragovih spodaj.
// =============================================================

export const OCENA_UTEZI = { obroki: 0.4, navade: 0.4, trening: 0.2 } as const;

export interface DanVhod {
  obrokiCheck: number; // označeni obroki danes
  obrokiVsi: number;   // vsi obroki (npr. 8)
  navadeCheck: number; // označene navade
  navadeVse: number;   // vse navade (npr. 6)
  jeTreningDan: boolean;
  treningOpravljen: boolean; // navada "trening" označena
}

export interface DanOcena {
  ocena: number;   // 1..10
  verdikt: string; // enovrstična sodba
}

/** Verdikt glede na oceno (pragovi iz specifikacije). */
export function verdiktZaOceno(ocena: number): string {
  if (ocena >= 9) return "Vrhunski dan";
  if (ocena >= 7) return "Odličen dan";
  if (ocena >= 5) return "Soliden dan";
  return "Jutri nov dan";
}

/** Rule-based ocena dneva 1–10 + verdikt. Čista funkcija. */
export function oceniDan(v: DanVhod): DanOcena {
  const obrokiPct = v.obrokiVsi > 0 ? Math.min(1, v.obrokiCheck / v.obrokiVsi) : 0;
  const navadePct = v.navadeVse > 0 ? Math.min(1, v.navadeCheck / v.navadeVse) : 0;
  // Počivalni dan: točka je samodejno dodeljena (počitek je pravilna izbira).
  const treningTocka = v.jeTreningDan ? (v.treningOpravljen ? 1 : 0) : 1;

  const raw =
    OCENA_UTEZI.obroki * obrokiPct +
    OCENA_UTEZI.navade * navadePct +
    OCENA_UTEZI.trening * treningTocka;

  const ocena = Math.max(1, Math.min(10, Math.round(raw * 10)));
  return { ocena, verdikt: verdiktZaOceno(ocena) };
}
