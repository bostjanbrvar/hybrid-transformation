"use client";

// src/app/povzetek/page.tsx
// =============================================================
// HYBRID TRANSFORMATION — povzetek dneva ("Konec dneva")
// Mobile-first kartica: obroki, skupni makro seštevek vs cilj, navade/voda/
// trening in rule-based ocena dneva (oceniDan). SSR-safe: localStorage bere
// šele po montaži (kot ostale strani).
// =============================================================

import { useEffect, useState } from "react";
import Link from "next/link";
import { getDayLog, todayKey, dnevniVnos, type DayLog } from "@/lib/storage";
import { getMakroCilj, type MakroRezultat } from "@/lib/makro";
import { meals } from "@/lib/nutrition";
import { HABITS, RULES } from "@/lib/protocol";
import { tedenskiPregled, type TedenskiPregled } from "@/lib/teden";
import { oceniDan } from "@/lib/ocena";

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatDan(d: Date): string {
  const t = dateFormatter.format(d);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function fmt0(n: number): string {
  return Math.round(n).toLocaleString("sl-SI");
}

export default function PovzetekPage() {
  const [now, setNow] = useState<Date | null>(null);
  const [log, setLog] = useState<DayLog | null>(null);
  const [goal, setGoal] = useState<MakroRezultat | null>(null);
  const [teden, setTeden] = useState<TedenskiPregled | null>(null);

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setLog(getDayLog(todayKey()));
    setGoal(getMakroCilj()?.rezultat ?? null);
    setTeden(tedenskiPregled(d));
  }, []);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Konec dneva
            </h1>
            <p className="mt-0.5 text-sm font-medium text-[#A855F7]/80">
              {now ? formatDan(now) : " "}
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {!log ? <Skeleton /> : <Povzetek log={log} goal={goal} teden={teden} />}
      </main>
    </div>
  );
}

function Povzetek({
  log,
  goal,
  teden,
}: {
  log: DayLog;
  goal: MakroRezultat | null;
  teden: TedenskiPregled | null;
}) {
  const checked = new Set(log.mealsDone);
  const pojedeni = meals.filter((m) => checked.has(m.protocolId)); // v časovnem vrstnem redu
  const nepojedeni = meals.filter((m) => !checked.has(m.protocolId));

  const vnos = dnevniVnos(log);
  const navadeCheck = HABITS.reduce((n, h) => n + (log.habits[h.id] ? 1 : 0), 0);
  const jeTreningDan = log.dayType === "training";
  const treningOpravljen = !!log.habits.trening;
  const vodaL = log.waterMl / 1000;

  const ocena = oceniDan({
    obrokiCheck: log.mealsDone.length,
    obrokiVsi: meals.length,
    navadeCheck,
    navadeVse: HABITS.length,
    jeTreningDan,
    treningOpravljen,
  });

  const treningStatus = jeTreningDan
    ? treningOpravljen
      ? "✓ opravljen"
      : "ni opravljen"
    : "počitek";

  return (
    <>
      {/* Obroki */}
      <Card label="Obroki">
        {pojedeni.length === 0 ? (
          <p className="mt-3 text-sm text-[#F5F5F7]/50">
            Danes še ni označenih obrokov.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-1.5">
            {pojedeni.map((m) => (
              <li
                key={m.protocolId}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[#A855F7]">
                    {m.time}
                  </span>
                  <span className="truncate text-sm font-medium text-[#F5F5F7]">
                    {m.title}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[#F5F5F7]/60">
                  ~{m.estKcal} kcal
                </span>
              </li>
            ))}
          </ul>
        )}

        {nepojedeni.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5">
            {nepojedeni.map((m) => (
              <li
                key={m.protocolId}
                className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 opacity-40"
              >
                <span className="flex min-w-0 items-baseline gap-2">
                  <span className="shrink-0 text-xs font-bold tabular-nums text-[#F5F5F7]/60">
                    {m.time}
                  </span>
                  <span className="truncate text-sm font-medium text-[#F5F5F7]/70 line-through">
                    {m.title}
                  </span>
                </span>
                <span className="shrink-0 text-xs tabular-nums text-[#F5F5F7]/40">
                  ~{m.estKcal} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Skupni seštevek */}
      <Card label="Skupni seštevek">
        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-black tabular-nums text-white">
            ~{fmt0(vnos.kcal)}
          </span>
          <span className="text-lg font-semibold text-[#F5F5F7]/50">
            {goal ? `/ ${fmt0(goal.kalorije)} kcal` : "kcal"}
          </span>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          <MacroBar
            label="Beljakovine"
            consumed={vnos.beljakovine}
            goalG={goal ? goal.beljakovine.gramov : null}
          />
          <MacroBar
            label="Ogljikovi h."
            consumed={vnos.oh}
            goalG={goal ? goal.ogljikoviHidrati.gramov : null}
          />
          <MacroBar
            label="Maščobe"
            consumed={vnos.mascobe}
            goalG={goal ? goal.mascobe.gramov : null}
          />
        </div>

        {!goal && (
          <p className="mt-3 text-xs text-[#F5F5F7]/40">
            Za primerjavo s ciljem izračunaj makre v kalkulatorju.
          </p>
        )}
        <p className="mt-2 text-[10px] text-[#F5F5F7]/40">
          Ocena na podlagi jedilnika.
        </p>
      </Card>

      {/* Navade / voda / trening */}
      <Card label="Dan v številkah">
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat k="Navade" v={`${navadeCheck}/${HABITS.length}`} />
          <Stat
            k="Voda"
            v={`${vodaL.toLocaleString("sl-SI", { maximumFractionDigits: 2 })} / ${RULES.waterTargetL} L`}
          />
          <Stat k="Trening" v={treningStatus} />
          {teden && <Stat k="Streak" v={`${teden.streak} dni`} />}
        </div>
      </Card>

      {/* Ocena dneva */}
      <Card label="Ocena dneva">
        <div className="mt-2 flex items-end justify-between gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-5xl font-black tabular-nums text-[#A855F7]">
              {ocena.ocena}
            </span>
            <span className="text-xl font-semibold text-[#F5F5F7]/40">/ 10</span>
          </div>
          <span className="pb-1 text-base font-bold text-white">
            {ocena.verdikt}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] transition-all"
            style={{ width: `${ocena.ocena * 10}%` }}
          />
        </div>
      </Card>
    </>
  );
}

/* ---------- Pod-komponente ---------- */

function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        {label}
      </p>
      {children}
    </section>
  );
}

function MacroBar({
  label,
  consumed,
  goalG,
}: {
  label: string;
  consumed: number;
  goalG: number | null;
}) {
  const pct = goalG && goalG > 0 ? Math.min(100, Math.round((consumed / goalG) * 100)) : 0;
  const reached = goalG != null && consumed >= goalG;

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#F5F5F7]/70">{label}</span>
        <span className="tabular-nums text-[#F5F5F7]/85">
          ~{consumed}
          {goalG != null ? ` / ${goalG}` : ""} g
        </span>
      </div>
      {goalG != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-black/30">
          <div
            className={`h-full rounded-full transition-all ${
              reached
                ? "bg-gradient-to-r from-[#9333EA] to-[#A855F7]"
                : "bg-[#9333EA]/50"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}

function Stat({ k, v }: { k: string; v: string }) {
  return (
    <div className="rounded-xl bg-black/20 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
        {k}
      </p>
      <p className="mt-0.5 text-sm font-bold tabular-nums text-[#F5F5F7]">{v}</p>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>
  );
}
