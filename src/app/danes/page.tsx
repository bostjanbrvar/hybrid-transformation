"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  TRAINING_DAYS,
  trainingKeyForDate,
  todaysTraining,
  type WeekdayKey,
} from "@/lib/protocol";
import {
  getDayLog,
  todayKey,
  setSerije,
  lastSerijeFor,
  type DayLog,
  type LoggedSet,
} from "@/lib/storage";
import { progressionHint, type ProgressionHint } from "@/lib/progression";
import { ExerciseEditor } from "@/components/ExerciseEditor";

/* ---------- Pomožno ---------- */

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

function formatDan(date: Date) {
  const t = dateFormatter.format(date);
  return t.charAt(0).toUpperCase() + t.slice(1);
}

// Trening dnevi (za "Vseeno treniram" izbiro skupine) — brez recovery.
const TRENING_DNEVI = Object.values(TRAINING_DAYS).filter(
  (d) => d.type === "training",
);

/* ---------- Stran ---------- */

export default function DanesPage() {
  // SSR-safe: čas in log beremo šele po montaži (kot dashboard/napredek).
  const [now, setNow] = useState<Date | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [log, setLog] = useState<DayLog | null>(null);

  // Če je počitek in vseeno treniram → izbrana skupina.
  const [override, setOverride] = useState<WeekdayKey | null>(null);

  // Urejljive serije, status "predizpolnjeno a ne shranjeno", in namigi dviga.
  const [draft, setDraft] = useState<Record<string, LoggedSet[]>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [hints, setHints] = useState<Record<string, ProgressionHint>>({});
  const seededGroups = useRef<Set<string>>(new Set());

  useEffect(() => {
    setNow(new Date());
    const key = todayKey();
    setToday(key);
    setLog(getDayLog(key));
  }, []);

  const baseKey = now ? trainingKeyForDate(now) : null;
  const groupKey = override ?? baseKey;
  const training = groupKey ? TRAINING_DAYS[groupKey] : null;
  const isRecovery = training?.type === "recovery";

  // Seed izbrane skupine (enkrat na skupino): predizpolni iz zadnje seje,
  // izračunaj namige dviga. NE zapisujemo — shrani se šele ob spremembi.
  useEffect(() => {
    if (!today || !log || !training || training.type !== "training") return;
    if (seededGroups.current.has(training.key)) return;

    const d: Record<string, LoggedSet[]> = {};
    const p: Record<string, boolean> = {};
    const h: Record<string, ProgressionHint> = {};
    for (const ex of training.exercises) {
      if (ex.cooldown) continue;
      const saved = log.training.exercises.find((e) => e.name === ex.name)?.serije;
      const prefill = lastSerijeFor(ex.name, today);
      if (saved && saved.length) {
        d[ex.name] = saved.map((s) => ({ ...s }));
        p[ex.name] = false; // že shranjeno (npr. začeto na dashboardu)
      } else if (prefill && prefill.length) {
        d[ex.name] = prefill.map((s) => ({ ...s }));
        p[ex.name] = true; // predizpolnjeno, še ne shranjeno
      } else {
        d[ex.name] = [];
        p[ex.name] = false; // brez zgodovine → prazna polja
      }
      const hint = progressionHint(prefill ?? [], ex.targetReps, ex.progressionStep);
      if (hint) h[ex.name] = hint;
    }

    seededGroups.current.add(training.key);
    setDraft((prev) => ({ ...prev, ...d }));
    setPending((prev) => ({ ...prev, ...p }));
    setHints((prev) => ({ ...prev, ...h }));
  }, [today, log, training]);

  // Edina pot pisanja: isti setSerije flow kot dashboard (brez novih ključev).
  function commit(name: string, serije: LoggedSet[]) {
    if (!today) return;
    setDraft((prev) => ({ ...prev, [name]: serije }));
    setLog(setSerije(today, name, serije));
    setPending((prev) => ({ ...prev, [name]: false }));
  }
  function confirmUnchanged(name: string) {
    commit(name, draft[name] ?? []);
  }

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Danes na vrsti
            </h1>
            {now && (
              <p className="mt-0.5 text-sm font-medium text-[#A855F7]/80">
                {formatDan(now)}
              </p>
            )}
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {!now || !training ? (
          <Skeleton />
        ) : isRecovery ? (
          <Pocitek now={now} onTreniram={(key) => setOverride(key)} />
        ) : (
          <>
            {/* Skupina dneva */}
            <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-xl font-bold text-white">{training.label}</h2>
                <span className="shrink-0 rounded-full bg-[#9333EA]/20 px-3 py-1 text-xs font-semibold text-[#A855F7]">
                  {training.focus}
                </span>
              </div>
              <p className="mt-1 text-sm text-[#F5F5F7]/60">{training.subtitle}</p>
              {override && (
                <button
                  type="button"
                  onClick={() => setOverride(null)}
                  className="mt-3 text-xs font-semibold text-[#F5F5F7]/50 underline underline-offset-2"
                >
                  ← nazaj na počitek
                </button>
              )}
            </section>

            {/* Vaje s predizpolnjenimi serijami */}
            <div className="flex flex-col gap-3">
              {training.exercises.map((ex, i) => (
                <ExerciseEditor
                  key={`${ex.name}-${i}`}
                  exercise={ex}
                  serije={draft[ex.name] ?? []}
                  suggestion={null}
                  hint={hints[ex.name] ?? null}
                  onCommit={(s) => commit(ex.name, s)}
                  onConfirmUnchanged={
                    pending[ex.name] ? () => confirmUnchanged(ex.name) : undefined
                  }
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Nalaganje ---------- */

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5" />
      ))}
    </div>
  );
}

/* ---------- Počitek ---------- */

function Pocitek({
  now,
  onTreniram,
}: {
  now: Date;
  onTreniram: (key: WeekdayKey) => void;
}) {
  const [izbira, setIzbira] = useState(false);

  const jutri = new Date(now);
  jutri.setDate(jutri.getDate() + 1);
  const jutriTrening = todaysTraining(jutri);

  return (
    <>
      <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
        <p className="text-3xl">😴</p>
        <h2 className="mt-2 text-xl font-bold text-white">Danes počitek</h2>
        <p className="mt-1 text-sm text-[#F5F5F7]/60">
          Regeneracija, pretok krvi in mobilnost.
        </p>
        <p className="mt-4 text-sm text-[#F5F5F7]/70">
          Jutri na vrsti:{" "}
          <span className="font-semibold text-[#A855F7]">
            {jutriTrening.type === "training" ? jutriTrening.focus : "počitek"}
          </span>
        </p>
      </section>

      {!izbira ? (
        <button
          type="button"
          onClick={() => setIzbira(true)}
          className="rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#F5A623]/30 ring-1 ring-[#F5A623]/60 transition active:scale-[0.98]"
        >
          Vseeno treniram
        </button>
      ) : (
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-4 shadow-lg shadow-black/40">
          <p className="mb-3 px-1 text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
            Izberi skupino
          </p>
          <div className="flex flex-col gap-2">
            {TRENING_DNEVI.map((d) => (
              <button
                key={d.key}
                type="button"
                onClick={() => onTreniram(d.key)}
                className="flex items-center justify-between rounded-xl bg-black/30 px-4 py-3 text-left active:scale-[0.98]"
              >
                <span className="text-sm font-semibold text-[#F5F5F7]">
                  {d.label}
                </span>
                <span className="text-xs font-semibold text-[#A855F7]">
                  {d.focus}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
