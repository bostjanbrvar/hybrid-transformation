"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import {
  getVseMeritve,
  drsecePovprecje,
  type Meritev,
  type MeritevPolje,
} from "@/lib/meritve";
import { getProfile, type Cilj } from "@/lib/profile";

/* ---------- Konstante / pomožno ---------- */

const DAN_MS = 24 * 60 * 60 * 1000;

const VIJOLA = "#9333EA";
const VIJOLA_SVETLA = "#A855F7";
const SREBRO = "#F5F5F7";
const ZELENA = "#22C55E";
const RDECA = "#F87171";

type Razpon = 30 | 90 | "vse";

interface Metrika {
  polje: MeritevPolje;
  label: string;
  enota: string;
  teza?: boolean;
}

const METRIKE: Metrika[] = [
  { polje: "tezaKg", label: "Teža", enota: "kg", teza: true },
  { polje: "pasCm", label: "Pas", enota: "cm" },
  { polje: "bicepsCm", label: "Biceps", enota: "cm" },
  { polje: "kvadricepsCm", label: "Kvadriceps", enota: "cm" },
];

function isoToMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y || 1970, (m || 1) - 1, d || 1).getTime();
}

const kratekDatumFmt = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "numeric",
});
const polnDatumFmt = new Intl.DateTimeFormat("sl-SI", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function fmtKratek(iso: string): string {
  return kratekDatumFmt.format(new Date(isoToMs(iso)));
}
function fmtPoln(iso: string): string {
  return polnDatumFmt.format(new Date(isoToMs(iso)));
}

function fmt(n: number, dec = 1): string {
  return n.toLocaleString("sl-SI", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

function fmtPredznak(n: number, enota: string, dec = 1): string {
  const sign = n > 0 ? "+" : n < 0 ? "−" : "";
  return `${sign}${fmt(Math.abs(n), dec)} ${enota}`;
}

/** Barva spremembe glede na cilj (samo za težo). */
function barvaCilj(delta: number, cilj: Cilj): string {
  if (cilj === "vzdrzevanje" || Math.abs(delta) < 0.05) return SREBRO;
  const dobro = cilj === "izguba_mascobe" ? delta < 0 : delta > 0;
  return dobro ? ZELENA : RDECA;
}

function povprecje(vrednosti: number[]): number | null {
  if (vrednosti.length === 0) return null;
  return vrednosti.reduce((a, b) => a + b, 0) / vrednosti.length;
}

/* ---------- Stran ---------- */

export default function AnalitikaMeritvePage() {
  // SSR-safe: vse beremo šele po montaži (recharts se renderira po mount).
  const [vse, setVse] = useState<Meritev[] | null>(null);
  const [cilj, setCilj] = useState<Cilj>("vzdrzevanje");
  const [razpon, setRazpon] = useState<Razpon>(90);

  useEffect(() => {
    setVse(getVseMeritve());
    setCilj(getProfile().cilj);
  }, []);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Analitika
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {vse === null ? (
          <Skeleton />
        ) : vse.length < 2 ? (
          <Prazno />
        ) : (
          <Analitika vse={vse} cilj={cilj} razpon={razpon} setRazpon={setRazpon} />
        )}
      </main>
    </div>
  );
}

/* ---------- Prazno / nalaganje ---------- */

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>
  );
}

function Prazno() {
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
      <p className="text-sm text-[#F5F5F7]/70">
        Vnesi vsaj 2 meritvi za prikaz trendov.
      </p>
      <Link
        href="/meritve"
        className="mt-4 inline-block rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
      >
        Vnesi meritev
      </Link>
    </section>
  );
}

/* ---------- Glavna analitika ---------- */

function Analitika({
  vse,
  cilj,
  razpon,
  setRazpon,
}: {
  vse: Meritev[];
  cilj: Cilj;
  razpon: Razpon;
  setRazpon: (r: Razpon) => void;
}) {
  // Filter po razponu (glede na zadnji vnos kot sidro).
  const zadnjiMs = isoToMs(vse[vse.length - 1].datum);
  const mejaMs =
    razpon === "vse" ? -Infinity : zadnjiMs - (razpon - 1) * DAN_MS;
  const filtrirane = vse.filter((m) => isoToMs(m.datum) >= mejaMs);

  /* --- Glavna številka: teža + 7-dnevno povprečje (iz VSEH podatkov) --- */
  const tezaVnosi = vse.filter((m) => m.tezaKg != null);
  const trenutnaTeza =
    tezaVnosi.length > 0 ? tezaVnosi[tezaVnosi.length - 1].tezaKg! : null;

  const maFull = drsecePovprecje(vse, "tezaKg", 7);
  const trenutnoPovp = maFull.length > 0 ? maFull[maFull.length - 1] : null;

  // Sprememba povprečja vs. ~pred 7 dni.
  let tedenskaSprememba: number | null = null;
  if (trenutnoPovp) {
    const ciljMs = isoToMs(trenutnoPovp.datum) - 7 * DAN_MS;
    let prej: (typeof maFull)[number] | null = null;
    for (const p of maFull) {
      if (isoToMs(p.datum) <= ciljMs) prej = p;
    }
    if (prej) tedenskaSprememba = trenutnoPovp.vrednost - prej.vrednost;
  }

  return (
    <>
      {/* Glavna številka */}
      <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
          Trenutna teža
        </p>
        {trenutnaTeza == null ? (
          <p className="mt-2 text-sm text-[#F5F5F7]/50">Ni vnosov teže.</p>
        ) : (
          <>
            <div className="mt-1 flex items-baseline gap-3">
              <span className="text-4xl font-black tabular-nums text-white">
                {fmt(trenutnaTeza)}
              </span>
              <span className="text-lg font-semibold text-[#F5F5F7]/50">kg</span>
              {trenutnoPovp && (
                <span className="ml-auto text-right">
                  <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
                    7-dnevno povp.
                  </span>
                  <span className="block text-lg font-bold tabular-nums text-[#A855F7]">
                    {fmt(trenutnoPovp.vrednost)} kg
                  </span>
                </span>
              )}
            </div>
            {tedenskaSprememba != null && (
              <p
                className="mt-2 text-sm font-bold tabular-nums"
                style={{ color: barvaCilj(tedenskaSprememba, cilj) }}
              >
                {fmtPredznak(tedenskaSprememba, "kg/teden")}
              </p>
            )}
          </>
        )}
      </section>

      {/* Časovni filter */}
      <div className="flex gap-2">
        {([30, 90, "vse"] as Razpon[]).map((r) => (
          <button
            key={String(r)}
            type="button"
            onClick={() => setRazpon(r)}
            className={`flex-1 rounded-xl border py-2 text-xs font-bold transition ${
              razpon === r
                ? "border-[#A855F7]/50 bg-[#9333EA]/20 text-white"
                : "border-[#9333EA]/20 bg-black/30 text-[#F5F5F7]/70"
            }`}
          >
            {r === "vse" ? "Vse" : `${r} dni`}
          </button>
        ))}
      </div>

      {/* Trend grafi */}
      {METRIKE.map((metrika) => (
        <TrendGraf
          key={metrika.polje}
          metrika={metrika}
          vse={vse}
          filtrirane={filtrirane}
          mejaMs={mejaMs}
        />
      ))}

      {/* Primerjava */}
      <Primerjava
        vse={vse}
        filtrirane={filtrirane}
        cilj={cilj}
        zadnjiMs={zadnjiMs}
      />
    </>
  );
}

/* ---------- Trend graf (ena metrika) ---------- */

function TrendGraf({
  metrika,
  vse,
  filtrirane,
  mejaMs,
}: {
  metrika: Metrika;
  vse: Meritev[];
  filtrirane: Meritev[];
  mejaMs: number;
}) {
  const { polje, label, enota, teza } = metrika;
  const vnosi = filtrirane.filter((m) => m[polje] != null);
  if (vnosi.length < 2) return null;

  // Za težo: 7-dnevno povprečje računamo iz VSEH podatkov (točnost ob robu
  // okna), nato filtriramo na razpon.
  type Tocka = { datum: string; surovo: number; povprecje?: number };
  let podatki: Tocka[];

  if (teza) {
    const maMap = new Map(
      drsecePovprecje(vse, "tezaKg", 7).map((p) => [p.datum, p.vrednost]),
    );
    podatki = vnosi.map((m) => ({
      datum: m.datum,
      surovo: m[polje] as number,
      povprecje: maMap.has(m.datum)
        ? Number(maMap.get(m.datum)!.toFixed(2))
        : undefined,
    }));
  } else {
    podatki = vnosi.map((m) => ({
      datum: m.datum,
      surovo: m[polje] as number,
    }));
  }

  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-4 shadow-lg shadow-black/40">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        {label} ({enota})
      </p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={podatki}
            margin={{ top: 5, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid stroke="#ffffff14" vertical={false} />
            <XAxis
              dataKey="datum"
              tickFormatter={fmtKratek}
              tick={{ fill: SREBRO, fontSize: 10, opacity: 0.5 }}
              stroke="#ffffff20"
              minTickGap={24}
            />
            <YAxis
              domain={["auto", "auto"]}
              tick={{ fill: SREBRO, fontSize: 10, opacity: 0.5 }}
              stroke="#ffffff20"
              width={44}
              tickFormatter={(v: number) => fmt(v, 0)}
            />
            <Tooltip
              contentStyle={{
                background: "#14101F",
                border: "1px solid #9333EA80",
                borderRadius: 12,
                color: SREBRO,
                fontSize: 12,
              }}
              labelFormatter={(l) => fmtPoln(String(l))}
              formatter={(value, name) => [`${fmt(Number(value))} ${enota}`, name]}
            />
            {teza ? (
              <>
                <Line
                  type="monotone"
                  dataKey="surovo"
                  name="Dnevno"
                  stroke={VIJOLA_SVETLA}
                  strokeWidth={1}
                  strokeOpacity={0.35}
                  dot={false}
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="povprecje"
                  name="7-dnevno povp."
                  stroke={VIJOLA}
                  strokeWidth={2.5}
                  dot={false}
                  connectNulls
                  isAnimationActive={false}
                />
              </>
            ) : (
              <Line
                type="monotone"
                dataKey="surovo"
                name={label}
                stroke={VIJOLA}
                strokeWidth={2}
                dot={{ r: 2, fill: VIJOLA }}
                isAnimationActive={false}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ---------- Primerjava ---------- */

function Primerjava({
  vse,
  filtrirane,
  cilj,
  zadnjiMs,
}: {
  vse: Meritev[];
  filtrirane: Meritev[];
  cilj: Cilj;
  zadnjiMs: number;
}) {
  const kartice: React.ReactNode[] = [];

  // Začetek → Zdaj (prvi vs. zadnji vnos v razponu) za vsako metriko.
  for (const { polje, label, enota, teza } of METRIKE) {
    const vnosi = filtrirane.filter((m) => m[polje] != null);
    if (vnosi.length < 2) continue;
    const zacetek = vnosi[0][polje] as number;
    const zdaj = vnosi[vnosi.length - 1][polje] as number;
    const delta = zdaj - zacetek;
    const pct = zacetek !== 0 ? (delta / zacetek) * 100 : 0;
    const barva = teza ? barvaCilj(delta, cilj) : SREBRO;

    kartice.push(
      <div
        key={polje}
        className="rounded-2xl border border-[#9333EA]/15 bg-black/20 p-3"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
          {label}
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-[#F5F5F7]">
          {fmt(zacetek)} → {fmt(zdaj)} {enota}
        </p>
        <p className="text-xs font-bold tabular-nums" style={{ color: barva }}>
          {fmtPredznak(delta, enota)} ({fmtPredznak(pct, "%")})
        </p>
      </div>,
    );
  }

  // Zadnji teden vs. predzadnji teden (samo teža, povprečji).
  const tezaVnosi = vse.filter((m) => m.tezaKg != null);
  const zadnjiTeden = povprecje(
    tezaVnosi
      .filter((m) => {
        const t = isoToMs(m.datum);
        return t > zadnjiMs - 7 * DAN_MS && t <= zadnjiMs;
      })
      .map((m) => m.tezaKg!),
  );
  const predzadnjiTeden = povprecje(
    tezaVnosi
      .filter((m) => {
        const t = isoToMs(m.datum);
        return t > zadnjiMs - 14 * DAN_MS && t <= zadnjiMs - 7 * DAN_MS;
      })
      .map((m) => m.tezaKg!),
  );

  let tedenskaKartica: React.ReactNode = null;
  if (zadnjiTeden != null && predzadnjiTeden != null) {
    const delta = zadnjiTeden - predzadnjiTeden;
    tedenskaKartica = (
      <div className="rounded-2xl border border-[#9333EA]/15 bg-black/20 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
          Teža: teden vs. prejšnji
        </p>
        <p className="mt-1 text-sm font-semibold tabular-nums text-[#F5F5F7]">
          {fmt(predzadnjiTeden)} → {fmt(zadnjiTeden)} kg
        </p>
        <p
          className="text-xs font-bold tabular-nums"
          style={{ color: barvaCilj(delta, cilj) }}
        >
          {fmtPredznak(delta, "kg")}
        </p>
      </div>
    );
  }

  if (kartice.length === 0 && !tedenskaKartica) return null;

  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        Primerjava
      </p>
      <div className="grid grid-cols-2 gap-2">
        {kartice}
        {tedenskaKartica}
      </div>
    </section>
  );
}
