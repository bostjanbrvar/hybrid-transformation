"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMeritev,
  saveMeritev,
  getVseMeritve,
  deleteMeritev,
  danesDatum,
  type Meritev,
} from "@/lib/meritve";

/* ---------- Skupni razredi (HYBRID temni stil) ---------- */

const fieldClass =
  "w-full rounded-xl border border-[#9333EA]/30 bg-black/40 px-3 py-2.5 text-sm font-medium text-[#F5F5F7] outline-none transition focus:border-[#A855F7]";

const labelClass = "text-xs font-semibold text-[#A855F7]/80";

/* ---------- Pomožno ---------- */

const datumFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: "short",
  day: "numeric",
  month: "short",
});

function formatDatum(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const text = datumFormatter.format(new Date(y, m - 1, d));
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function num(s: string): number | undefined {
  const t = s.trim();
  if (t === "") return undefined;
  const v = Number(t.replace(",", "."));
  return Number.isFinite(v) ? v : undefined;
}

function str(n: number | undefined): string {
  return n == null ? "" : String(n);
}

/** Sestavi kratek povzetek vnesenih vrednosti za seznam. */
function povzetek(m: Meritev): string {
  const deli: string[] = [];
  if (m.tezaKg != null)
    deli.push(`${m.tezaKg.toLocaleString("sl-SI")} kg`);
  if (m.pasCm != null) deli.push(`pas ${m.pasCm}`);
  if (m.bicepsCm != null) deli.push(`biceps ${m.bicepsCm}`);
  if (m.kvadricepsCm != null) deli.push(`kvadriceps ${m.kvadricepsCm}`);
  return deli.join(" · ");
}

export default function MeritvePage() {
  const [ready, setReady] = useState(false);
  const [datum, setDatum] = useState("");
  const [teza, setTeza] = useState("");
  const [pas, setPas] = useState("");
  const [biceps, setBiceps] = useState("");
  const [kvadriceps, setKvadriceps] = useState("");
  const [opomba, setOpomba] = useState("");
  const [saved, setSaved] = useState(false);
  const [vse, setVse] = useState<Meritev[]>([]);

  // SSR-safe: vse beremo šele po montaži.
  useEffect(() => {
    const d = danesDatum();
    setDatum(d);
    napolni(d);
    setVse(getVseMeritve());
    setReady(true);
  }, []);

  // Napolni polja iz shranjene meritve za dani datum (ali izprazni).
  function napolni(d: string) {
    const m = getMeritev(d);
    setTeza(str(m?.tezaKg));
    setPas(str(m?.pasCm));
    setBiceps(str(m?.bicepsCm));
    setKvadriceps(str(m?.kvadricepsCm));
    setOpomba(m?.opomba ?? "");
  }

  function spremeniDatum(d: string) {
    setDatum(d);
    napolni(d);
    setSaved(false);
  }

  function handleSave() {
    if (!datum) return;
    saveMeritev({
      datum,
      tezaKg: num(teza),
      pasCm: num(pas),
      bicepsCm: num(biceps),
      kvadricepsCm: num(kvadriceps),
      opomba: opomba.trim() === "" ? undefined : opomba.trim(),
    });
    setVse(getVseMeritve());
    napolni(datum); // odraža združeno stanje (merge ohrani prejšnja polja)
    setSaved(true);
  }

  function handleDelete(d: string) {
    deleteMeritev(d);
    setVse(getVseMeritve());
    if (d === datum) napolni(datum);
    setSaved(false);
  }

  const zadnje = [...vse].reverse().slice(0, 14);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        {/* Glava */}
        <header className="mb-1 flex items-center justify-between px-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Meritve
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {/* Vnos */}
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
          {!ready ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-white/10"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Datum (omogoča naknadni vnos za pretekli dan) */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Datum</span>
                <input
                  type="date"
                  value={datum}
                  max={danesDatum()}
                  onChange={(e) => spremeniDatum(e.target.value)}
                  className={`${fieldClass} [color-scheme:dark]`}
                />
              </label>

              {/* Teža — dnevno */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Teža (kg) — dnevno</span>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  value={teza}
                  onChange={(e) => {
                    setTeza(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="npr. 82,5"
                  className={`${fieldClass} placeholder:text-[#F5F5F7]/30`}
                />
              </label>

              {/* Obsegi — tedensko */}
              <div className="rounded-2xl border border-[#9333EA]/15 bg-black/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
                  Obsegi (cm) — tedensko
                </p>
                <p className="mt-1 text-xs text-[#F5F5F7]/50">
                  Zjutraj, na tešče, sproščena mišica.
                </p>

                <div className="mt-3 grid grid-cols-3 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
                      Pas
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={pas}
                      onChange={(e) => {
                        setPas(e.target.value);
                        setSaved(false);
                      }}
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
                      Biceps
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={biceps}
                      onChange={(e) => {
                        setBiceps(e.target.value);
                        setSaved(false);
                      }}
                      className={fieldClass}
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
                      Kvadriceps
                    </span>
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      min="0"
                      value={kvadriceps}
                      onChange={(e) => {
                        setKvadriceps(e.target.value);
                        setSaved(false);
                      }}
                      className={fieldClass}
                    />
                  </label>
                </div>
              </div>

              {/* Opomba */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Opomba</span>
                <input
                  type="text"
                  value={opomba}
                  onChange={(e) => {
                    setOpomba(e.target.value);
                    setSaved(false);
                  }}
                  placeholder="počutje, spanec, ..."
                  className={`${fieldClass} placeholder:text-[#F5F5F7]/30`}
                />
              </label>

              <button
                type="button"
                onClick={handleSave}
                className="mt-1 w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
              >
                Shrani meritev
              </button>

              {saved && (
                <p className="text-center text-sm font-semibold text-[#FFB800]">
                  ✓ Shranjeno
                </p>
              )}
            </div>
          )}
        </section>

        {/* Zgodovina */}
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
            Zadnje meritve
          </p>

          {!ready ? (
            <div className="mt-3 flex flex-col gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 animate-pulse rounded-xl bg-white/10"
                />
              ))}
            </div>
          ) : zadnje.length === 0 ? (
            <p className="mt-3 text-sm text-[#F5F5F7]/50">
              Še ni meritev. Vnesi prvo zgoraj.
            </p>
          ) : (
            <ul className="mt-3 flex flex-col gap-2">
              {zadnje.map((m) => (
                <li
                  key={m.datum}
                  className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5"
                >
                  <button
                    type="button"
                    onClick={() => spremeniDatum(m.datum)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block text-sm font-semibold text-[#F5F5F7]">
                      {formatDatum(m.datum)}
                    </span>
                    <span className="block truncate text-xs text-[#F5F5F7]/60">
                      {povzetek(m) || "—"}
                      {m.opomba ? ` · ${m.opomba}` : ""}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m.datum)}
                    aria-label={`Izbriši meritev ${m.datum}`}
                    className="shrink-0 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-[#F5F5F7]/60 transition hover:border-[#F5A623]/50 hover:text-[#FFB800]"
                  >
                    Izbriši
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
