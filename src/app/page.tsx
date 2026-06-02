"use client";

import { useEffect, useRef, useState } from "react";
import {
  todaysTraining,
  nextMeal,
  RULES,
  HABITS,
  NUTRITION_RULES,
  type HabitId,
  type TrainingDay,
  type Meal,
} from "@/lib/protocol";
import {
  getDayLog,
  todayKey,
  toggleHabit,
  toggleMeal,
  setWater,
  setTrainingSet,
  setMaxWeight,
  type DayLog,
  type LoggedExercise,
} from "@/lib/storage";

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
  // Trening in obrok berejo trenutni čas, log pa localStorage – oboje
  // izračunamo/naložimo šele po montaži (na klientu), da se izognemo
  // neskladju med strežnikom in brskalnikom (hydration mismatch).
  const [now, setNow] = useState<Date | null>(null);
  const [today, setToday] = useState<string | null>(null);
  const [log, setLog] = useState<DayLog | null>(null);

  useEffect(() => {
    setNow(new Date());
    const key = todayKey();
    setToday(key);
    setLog(getDayLog(key));
  }, []);

  const training: TrainingDay | null = now ? todaysTraining(now) : null;
  const meal: Meal | null = now ? nextMeal(now) : null;

  function handleToggleHabit(habitId: HabitId) {
    if (!today) return;
    setLog(toggleHabit(today, habitId));
  }

  function handleWater(deltaMl: number) {
    if (!today || !log) return;
    setLog(setWater(today, log.waterMl + deltaMl));
  }

  function handleToggleMeal(mealId: string) {
    if (!today) return;
    setLog(toggleMeal(today, mealId));
  }

  function handleMaxWeight(exerciseName: string, weight: number) {
    if (!today) return;
    setLog(setMaxWeight(today, exerciseName, weight));
  }

  function handleSet(
    exerciseName: string,
    setIndex: number,
    value: number | null,
  ) {
    if (!today) return;
    setLog(setTrainingSet(today, exerciseName, setIndex, value));
  }

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
        <TrainingCard
          training={training}
          logged={log?.training.exercises ?? null}
          onWeight={handleMaxWeight}
          onSet={handleSet}
        />

        {/* 3. Naslednji obrok */}
        <MealCard
          meal={meal}
          done={meal ? !!log?.mealsDone.includes(meal.id) : false}
          ready={!!log}
          onToggle={handleToggleMeal}
        />

        {/* 4. Voda */}
        <WaterCard
          targetL={RULES.waterTargetL}
          waterMl={log?.waterMl ?? 0}
          ready={!!log}
          onChange={handleWater}
        />

        {/* 5. Današnje navade */}
        <HabitsCard habits={log?.habits ?? null} onToggle={handleToggleHabit} />

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

const SET_COUNT = 4; // S1–S4

function TrainingCard({
  training,
  logged,
  onWeight,
  onSet,
}: {
  training: TrainingDay | null;
  logged: LoggedExercise[] | null;
  onWeight: (exerciseName: string, weight: number) => void;
  onSet: (exerciseName: string, setIndex: number, value: number | null) => void;
}) {
  const isRecovery = training?.type === "recovery";
  const heading = isRecovery ? "Aktivni počitek" : "Trening";

  const [open, setOpen] = useState(false);

  // Lokalno stanje vnosnih polj (kontrolirani inputi), da tipkanje teče
  // gladko; ob spremembi tudi takoj zapišemo v localStorage prek onWeight/onSet.
  const [weights, setWeights] = useState<Record<string, string>>({});
  const [reps, setReps] = useState<Record<string, string[]>>({});
  const seeded = useRef(false);

  // Napolni polja iz shranjenega loga – enkrat, ko je log na voljo (po mount-u).
  useEffect(() => {
    if (!logged || seeded.current) return;
    const w: Record<string, string> = {};
    const r: Record<string, string[]> = {};
    for (const ex of logged) {
      w[ex.name] = ex.maxWeight != null ? String(ex.maxWeight) : "";
      const s = ex.sets ?? [];
      r[ex.name] = Array.from({ length: SET_COUNT }, (_, i) =>
        s[i] != null ? String(s[i]) : "",
      );
    }
    setWeights(w);
    setReps(r);
    seeded.current = true;
  }, [logged]);

  function changeWeight(name: string, raw: string) {
    setWeights((prev) => ({ ...prev, [name]: raw }));
    const trimmed = raw.trim();
    if (trimmed === "") return; // praznega ne zapišemo (ohrani prejšnjo težo)
    const value = Number(trimmed);
    if (Number.isFinite(value)) onWeight(name, value);
  }

  function changeSet(name: string, idx: number, raw: string) {
    setReps((prev) => {
      const row = prev[name] ?? Array.from({ length: SET_COUNT }, () => "");
      const next = row.map((v, i) => (i === idx ? raw : v));
      return { ...prev, [name]: next };
    });
    const trimmed = raw.trim();
    if (trimmed === "") {
      onSet(name, idx, null); // prazno = null
      return;
    }
    const value = Number(trimmed);
    if (Number.isFinite(value)) onSet(name, idx, value);
  }

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

          {/* Recovery dan: samo seznam aktivnosti, brez vnosa serij. */}
          {isRecovery ? (
            <ul className="mt-4 flex flex-col gap-2">
              {training.exercises.map((ex, i) => (
                <li
                  key={i}
                  className="rounded-xl bg-black/20 px-3 py-2.5 text-sm font-medium text-violet-50"
                >
                  {ex.name}
                </li>
              ))}
            </ul>
          ) : !open ? (
            /* Zaprt pregled vaj. */
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
          ) : (
            /* Odprt vnos serij. */
            <div className="mt-4 flex flex-col gap-3">
              {training.exercises.map((ex, i) => (
                <div key={i} className="rounded-2xl bg-black/20 p-3">
                  <p className="text-sm font-semibold text-violet-50">
                    {ex.name}
                  </p>

                  {ex.cooldown ? (
                    <p className="mt-1 text-xs italic text-violet-300/60">
                      Cool-down
                    </p>
                  ) : (
                    <>
                      <label className="mt-3 flex items-center justify-between gap-3">
                        <span className="text-xs font-medium text-violet-200/80">
                          Max teža (kg)
                        </span>
                        <input
                          type="number"
                          inputMode="decimal"
                          step="0.5"
                          min="0"
                          value={weights[ex.name] ?? ""}
                          onChange={(e) => changeWeight(ex.name, e.target.value)}
                          className="w-24 rounded-lg border border-white/15 bg-black/30 px-2 py-1.5 text-right text-sm font-semibold text-white outline-none focus:border-violet-400/60"
                        />
                      </label>

                      <div className="mt-3 grid grid-cols-4 gap-2">
                        {Array.from({ length: SET_COUNT }, (_, s) => (
                          <label key={s} className="flex flex-col gap-1">
                            <span className="text-center text-[10px] font-semibold uppercase tracking-wider text-violet-300/70">
                              S{s + 1}
                            </span>
                            <input
                              type="number"
                              inputMode="numeric"
                              min="0"
                              placeholder="–"
                              value={reps[ex.name]?.[s] ?? ""}
                              onChange={(e) =>
                                changeSet(ex.name, s, e.target.value)
                              }
                              className="w-full rounded-lg border border-white/15 bg-black/30 px-1 py-1.5 text-center text-sm font-semibold text-white outline-none placeholder:text-violet-300/30 focus:border-violet-400/60"
                            />
                          </label>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Na recovery dan ni vnosa, zato tudi ni gumba. */}
          {!isRecovery && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-violet-500 to-fuchsia-500 py-3 text-sm font-bold text-white shadow-lg shadow-violet-900/40 transition active:scale-[0.98]"
            >
              {open ? "Skrij trening" : "Začni trening"}
            </button>
          )}
        </>
      )}
    </Card>
  );
}

/* ---------- 3. Obrok ---------- */

function MealCard({
  meal,
  done,
  ready,
  onToggle,
}: {
  meal: Meal | null;
  done: boolean;
  ready: boolean;
  onToggle: (mealId: string) => void;
}) {
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

          <button
            type="button"
            disabled={!ready}
            onClick={() => onToggle(meal.id)}
            aria-pressed={done}
            className={`mt-3 w-full rounded-2xl border py-2.5 text-sm font-bold transition active:scale-[0.98] disabled:opacity-50 ${
              done
                ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-200"
                : "border-white/15 bg-black/20 text-violet-100/90"
            }`}
          >
            {done ? "✓ Pojedeno" : "Pojedel"}
          </button>

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

const WATER_STEP_ML = 250; // 2,5 dl

function WaterCard({
  targetL,
  waterMl,
  ready,
  onChange,
}: {
  targetL: number;
  waterMl: number;
  ready: boolean;
  onChange: (deltaMl: number) => void;
}) {
  const targetMl = targetL * 1000;
  const currentL = waterMl / 1000;
  const pct = Math.min(100, (waterMl / targetMl) * 100);

  const buttonClass =
    "flex h-10 w-14 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-black/20 text-sm font-bold text-violet-100 transition active:scale-[0.95] disabled:opacity-50";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel>Voda</CardLabel>
        <span className="text-sm font-semibold tabular-nums text-violet-200">
          {currentL.toLocaleString("sl-SI", { maximumFractionDigits: 2 })} /{" "}
          {targetL} L
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          aria-label="Odštej 2,5 dl"
          disabled={!ready || waterMl <= 0}
          onClick={() => onChange(-WATER_STEP_ML)}
          className={buttonClass}
        >
          −2,5 dl
        </button>

        <div className="h-3 flex-1 overflow-hidden rounded-full bg-black/30">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>

        <button
          type="button"
          aria-label="Dodaj 2,5 dl"
          disabled={!ready}
          onClick={() => onChange(WATER_STEP_ML)}
          className={buttonClass}
        >
          +2,5 dl
        </button>
      </div>
    </Card>
  );
}

/* ---------- 5. Navade ---------- */

function HabitsCard({
  habits,
  onToggle,
}: {
  habits: DayLog["habits"] | null;
  onToggle: (habitId: HabitId) => void;
}) {
  return (
    <Card>
      <CardLabel>Današnje navade</CardLabel>

      <div className="mt-3 grid grid-cols-2 gap-2">
        {HABITS.map((habit) => {
          const checked = !!habits?.[habit.id];
          return (
            <button
              key={habit.id}
              type="button"
              disabled={!habits}
              onClick={() => onToggle(habit.id)}
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
