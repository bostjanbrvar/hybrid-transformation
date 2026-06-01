"use client";

import { useEffect, useState } from "react";
import {
  todaysTraining,
  nextMeal,
  RULES,
  HABITS,
  NUTRITION_RULES,
  type TrainingDay,
  type Meal,
} from "@/lib/protocol";

/* ---------- Pomožno ---------- */

const dateFormatter = new Intl.DateTimeFormat("sl-SI", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatToday(date: Date) {
  const text = dateFormatter.format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/* ---------- Stran ---------- */

export default function Home() {
  // Trening in obrok berejo trenutni čas, zato ju izračunamo šele po
  // montaži (na klientu) – tako se izognemo neskladju med strežnikom in
  // brskalnikom (hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
  }, []);

  const training: TrainingDay | null = now ? todaysTraining(now) : null;
  const meal: Meal | null = now ? nextMeal(now) : null;

  return (
    <div className="min-h-full w-full bg-gradient-to-b from-[#1b0d33] via-[#160a2b] to-[#0c0617] text-violet-50">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        {/* 1. Glava */}
        <header className="mb-1 px-1">
          <h1 className="text-3xl font-black tracking-tight text-white">
            HYBRID
          </h1>
          <p className="mt-1 text-sm font-medium text-violet-300/80">
            {now ? formatToday(now) : " "}
          </p>
        </header>

        {/* 2. Danes treniraš */}
        <TrainingCard training={training} />

        {/* 3. Naslednji obrok */}
        <MealCard meal={meal} />

        {/* 4. Voda */}
        <WaterCard targetL={RULES.waterTargetL} />

        {/* 5. Današnje navade */}
        <HabitsCard />

        {/* Mantra (iz RULES) */}
        <p className="mt-2 px-2 text-center text-xs italic text-violet-300/60">
          {RULES.mantra}
        </p>
      </main>
    </div>
  );
}

/* ---------- Kartica: ovojnica ---------- */

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl border border-white/10 bg-white/[0.06] p-5 shadow-lg shadow-black/20 backdrop-blur-sm ${className}`}
    >
      {children}
    </section>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-300/70">
      {children}
    </p>
  );
}

/* ---------- 2. Trening ---------- */

function TrainingCard({ training }: { training: TrainingDay | null }) {
  const isRecovery = training?.type === "recovery";
  const heading = isRecovery ? "Aktivni počitek" : "Trening";

  return (
    <Card>
      <CardLabel>Danes treniraš</CardLabel>

      {!training ? (
        <Placeholder lines={3} />
      ) : (
        <>
          <div className="mt-2 flex items-baseline justify-between gap-3">
            <h2 className="text-xl font-bold text-white">{heading}</h2>
            <span className="shrink-0 rounded-full bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200">
              {training.focus}
            </span>
          </div>
          <p className="mt-1 text-sm text-violet-200/70">{training.subtitle}</p>

          <ul className="mt-4 flex flex-col gap-2">
            {training.exercises.map((ex, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-violet-50">
                  {ex.name}
                </span>
                <span className="shrink-0 text-right text-xs text-violet-300/80">
                  {ex.defaultWeightKg != null && (
                    <span className="font-semibold text-violet-200">
                      {ex.defaultWeightKg} kg
                    </span>
                  )}
                  {ex.defaultWeightKg != null && ex.targetReps && " · "}
                  {ex.targetReps && <span>{ex.targetReps}</span>}
                </span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition active:scale-[0.98]"
          >
            Začni trening
          </button>
        </>
      )}
    </Card>
  );
}

/* ---------- 3. Obrok ---------- */

function MealCard({ meal }: { meal: Meal | null }) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel>Naslednji obrok</CardLabel>
        {meal?.critical && (
          <span className="rounded-full bg-rose-500/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-rose-300">
            Kritično
          </span>
        )}
      </div>

      {!meal ? (
        <Placeholder lines={3} />
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-2xl font-black tabular-nums text-white">
              {meal.time}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold text-white">
                {meal.name}
              </h2>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-violet-300/70">
                {meal.slot}
              </p>
            </div>
          </div>

          <ul className="mt-4 flex flex-col gap-1.5">
            {meal.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-violet-100/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}

/* ---------- 4. Voda ---------- */

function WaterCard({ targetL }: { targetL: number }) {
  const current = 0; // brez logike zaenkrat

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel>Voda</CardLabel>
        <span className="text-sm font-semibold tabular-nums text-violet-200">
          {current} / {targetL} L
        </span>
      </div>

      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all"
          style={{ width: `${(current / targetL) * 100}%` }}
        />
      </div>
    </Card>
  );
}

/* ---------- 5. Navade ---------- */

function HabitsCard() {
  // Samo UI – brez shranjevanja zaenkrat.
  const [done, setDone] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setDone((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <Card>
      <CardLabel>Današnje navade</CardLabel>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {HABITS.map((habit) => {
          const checked = !!done[habit.id];
          return (
            <button
              key={habit.id}
              type="button"
              onClick={() => toggle(habit.id)}
              aria-pressed={checked}
              className={`flex items-center gap-2.5 rounded-xl border px-3 py-3 text-left text-sm font-medium transition ${
                checked
                  ? "border-violet-400/50 bg-violet-500/20 text-white"
                  : "border-white/10 bg-black/20 text-violet-100/80"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  checked
                    ? "border-violet-300 bg-violet-400 text-violet-950"
                    : "border-white/25 bg-transparent"
                }`}
              >
                {checked && (
                  <svg
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="h-3.5 w-3.5"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.7 5.3a1 1 0 0 1 0 1.4l-8 8a1 1 0 0 1-1.4 0l-4-4a1 1 0 1 1 1.4-1.4L8 12.58l7.3-7.3a1 1 0 0 1 1.4 0Z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
              {habit.label}
            </button>
          );
        })}
      </div>

      {/* Prehranska pravila (iz NUTRITION_RULES) kot opomnik */}
      <ul className="mt-4 flex flex-col gap-1 border-t border-white/10 pt-3">
        {NUTRITION_RULES.map((rule, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-violet-300/70"
          >
            <span className="text-violet-400">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- Placeholder (pred montažo) ---------- */

function Placeholder({ lines }: { lines: number }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 animate-pulse rounded bg-white/10"
          style={{ width: `${90 - i * 15}%` }}
        />
      ))}
    </div>
  );
}
