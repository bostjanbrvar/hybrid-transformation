"use client";

import { useEffect, useMemo, useState } from "react";
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
  exerciseHistory,
  allLoggedExerciseNames,
  type ExerciseSession,
} from "@/lib/storage";
import { TRAINING_DAYS } from "@/lib/protocol";

/* ---------- Konstante / pomožno ---------- */

const DAN_MS = 24 * 60 * 60 * 1000;

const VIJOLA = "#9333EA";
const VIJOLA_SVETLA = "#A855F7";
const SREBRO = "#F5F5F7";

type Razpon = 30 | 90 | "vse";

/**
 * Imena + cilji ponovitev iz protokola — samo trening dnevi (brez recovery)
 * in brez cooldown elementov. Statično, zato računamo enkrat ob nalaganju.
 */
const PROTOCOL_REPS = new Map<string, string | undefined>();
for (const day of Object.values(TRAINING_DAYS)) {
  if (day.type !== "training") continue;
  for (const ex of day.exercises) {
    if (ex.cooldown) continue;
    if (!PROTOCOL_REPS.has(ex.name)) PROTOCOL_REPS.set(ex.name, ex.targetReps);
  }
}
const PROTOCOL_NAMES = [...PROTOCOL_REPS.keys()];

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

function fmt(n: number, dec = 0): string {
  return n.toLocaleString("sl-SI", {
    minimumFractionDigits: dec,
    maximumFractionDigits: dec,
  });
}

/** Serija kot "37.5×12". */
function fmtSerija(teza: number, ponovitve: number): string {
  return `${fmt(teza, teza % 1 === 0 ? 0 : 1)}×${ponovitve}`;
}

/* ---------- Stran ---------- */

export default function NapredekPage() {
  // SSR-safe: imena vaj in zgodovino beremo šele po montaži.
  const [imena, setImena] = useState<string[] | null>(null);
  const [izbrana, setIzbrana] = useState<string | null>(null);
  const [razpon, setRazpon] = useState<Razpon>(90);

  useEffect(() => {
    const zZgodovino = allLoggedExerciseNames().sort((a, b) =>
      a.localeCompare(b, "sl"),
    );
    const ostale = PROTOCOL_NAMES.filter((n) => !zZgodovino.includes(n)).sort(
      (a, b) => a.localeCompare(b, "sl"),
    );
    // Vaje z zgodovino spredaj → privzeto izbrana je prva z zgodovino.
    const seznam = [...zZgodovino, ...ostale];
    setImena(seznam);
    setIzbrana(zZgodovino[0] ?? seznam[0] ?? null);
  }, []);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Napredek
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {imena === null ? (
          <Skeleton />
        ) : imena.length === 0 ? (
          <Prazno />
        ) : (
          <>
            <ChipIzbira imena={imena} izbrana={izbrana} onIzbira={setIzbrana} />

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

            {izbrana && <Vaja ime={izbrana} razpon={razpon} />}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Nalaganje / prazno ---------- */

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
      <p className="text-sm text-[#F5F5F7]/70">Ni vaj za prikaz.</p>
    </section>
  );
}

/* ---------- Izbira vaje (chipi) ---------- */

function ChipIzbira({
  imena,
  izbrana,
  onIzbira,
}: {
  imena: string[];
  izbrana: string | null;
  onIzbira: (ime: string) => void;
}) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {imena.map((ime) => (
        <button
          key={ime}
          type="button"
          onClick={() => onIzbira(ime)}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            izbrana === ime
              ? "border-[#A855F7]/60 bg-[#9333EA]/25 text-white"
              : "border-[#9333EA]/25 bg-black/30 text-[#F5F5F7]/70"
          }`}
        >
          {ime}
        </button>
      ))}
    </div>
  );
}

/* ---------- Ena vaja: grafa + časovnica ---------- */

function Vaja({ ime, razpon }: { ime: string; razpon: Razpon }) {
  const vsa = useMemo(() => exerciseHistory(ime), [ime]);

  const { filtrirane, ciljReps } = useMemo(() => {
    const ciljReps = PROTOCOL_REPS.get(ime);
    if (vsa.length === 0) return { filtrirane: [] as ExerciseSession[], ciljReps };
    const zadnjiMs = isoToMs(vsa[vsa.length - 1].date);
    const mejaMs =
      razpon === "vse" ? -Infinity : zadnjiMs - (razpon - 1) * DAN_MS;
    return {
      filtrirane: vsa.filter((s) => isoToMs(s.date) >= mejaMs),
      ciljReps,
    };
  }, [vsa, razpon, ime]);

  // Graf bere ISTE izračunane vrednosti kot bo KORAK 3 progression engine.
  const podatki = filtrirane.map((s) => ({
    datum: s.date,
    maxTeza: Number(s.maxTeza.toFixed(2)),
    volumen: Number(s.volumen.toFixed(2)),
  }));

  return (
    <>
      {/* Glava izbrane vaje */}
      <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
        <h2 className="text-xl font-bold text-white">{ime}</h2>
        <div className="mt-1 flex items-center gap-3 text-sm text-[#F5F5F7]/60">
          {ciljReps && (
            <span>
              Cilj:{" "}
              <span className="font-semibold text-[#A855F7]">{ciljReps}</span>
            </span>
          )}
          <span className="ml-auto text-xs">
            {vsa.length} {vsa.length === 1 ? "seja" : "sej"} skupaj
          </span>
        </div>
      </section>

      {vsa.length === 0 ? (
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
          <p className="text-sm text-[#F5F5F7]/60">
            Še ni zabeleženih serij za to vajo. Zabeleži trening na začetnem
            zaslonu.
          </p>
        </section>
      ) : podatki.length === 0 ? (
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
          <p className="text-sm text-[#F5F5F7]/60">
            V izbranem obdobju ni sej. Izberi širši razpon.
          </p>
        </section>
      ) : (
        <>
          <Graf
            naslov="Max teža (kg)"
            data={podatki}
            dataKey="maxTeza"
            barva={VIJOLA}
            enota="kg"
          />
          <Graf
            naslov="Volumen (teža × ponovitve)"
            data={podatki}
            dataKey="volumen"
            barva={VIJOLA_SVETLA}
            enota=""
          />
          <Casovnica seje={filtrirane} />
        </>
      )}
    </>
  );
}

/* ---------- En graf ---------- */

function Graf({
  naslov,
  data,
  dataKey,
  barva,
  enota,
}: {
  naslov: string;
  data: { datum: string; maxTeza: number; volumen: number }[];
  dataKey: "maxTeza" | "volumen";
  barva: string;
  enota: string;
}) {
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-4 shadow-lg shadow-black/40">
      <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        {naslov}
      </p>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 8, left: -16, bottom: 0 }}>
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
              formatter={(value) => [
                `${fmt(Number(value), enota === "kg" ? 1 : 0)}${enota ? " " + enota : ""}`,
                naslov,
              ]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              name={naslov}
              stroke={barva}
              strokeWidth={2.5}
              dot={{ r: 2, fill: barva }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}

/* ---------- Časovnica serij (najnovejši na vrhu) ---------- */

function Casovnica({ seje }: { seje: ExerciseSession[] }) {
  const obrnjene = [...seje].reverse();
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        Časovnica
      </p>
      <div className="flex flex-col gap-2.5">
        {obrnjene.map((s) => (
          <div key={s.date} className="rounded-2xl bg-black/20 p-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-semibold text-[#F5F5F7]">
                {fmtPoln(s.date)}
              </span>
              <span className="shrink-0 text-xs text-[#F5F5F7]/60">
                max{" "}
                <span className="font-semibold text-[#A855F7]">
                  {fmt(s.maxTeza, s.maxTeza % 1 === 0 ? 0 : 1)} kg
                </span>{" "}
                · vol {fmt(s.volumen)}
              </span>
            </div>
            <p className="mt-1.5 text-sm tabular-nums text-[#F5F5F7]/75">
              {s.serije.map((x) => fmtSerija(x.teza, x.ponovitve)).join("  ·  ")}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
