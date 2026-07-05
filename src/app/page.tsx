"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
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
  setSerije,
  lastSerijeFor,
  dnevniVnos,
  type DayLog,
  type LoggedExercise,
  type LoggedSet,
} from "@/lib/storage";
import { getMakroCilj, type MakroRezultat } from "@/lib/makro";
import type { DnevniMakri } from "@/lib/nutrition";
import { progressionHint, type ProgressionHint } from "@/lib/progression";
import { getTopCoachMessage, type CoachMsg } from "@/lib/coach";
import { ExerciseEditor } from "@/components/ExerciseEditor";
import {
  isNative,
  isReminderSupported,
  getReminderPermission,
  isRemindersActive,
  enableReminders,
  disableReminders,
  resumeReminders,
} from "@/lib/reminderScheduler";

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
  // Makro cilj (iz kalkulatorja) — za "zaužito vs cilj" števec. null = ni cilja.
  const [makro, setMakro] = useState<MakroRezultat | null>(null);

  useEffect(() => {
    setNow(new Date());
    const key = todayKey();
    setToday(key);
    setLog(getDayLog(key));
    setMakro(getMakroCilj()?.rezultat ?? null);
  }, []);

  const training: TrainingDay | null = now ? todaysTraining(now) : null;
  const meal: Meal | null = now ? nextMeal(now) : null;
  // Ocenjeni zaužiti makri iz označenih obrokov (posodobi se ob vsakem toggle).
  const vnos: DnevniMakri | null = log ? dnevniVnos(log) : null;

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


  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        {/* 1. Glava */}
        <header className="mb-1 flex items-start justify-between px-1">
          <div>
          <h1 className="text-3xl font-black tracking-tight text-white">
            HYBRID
          </h1>
          <p className="mt-1 text-sm font-medium text-[#A855F7]/80">
            {now ? formatToday(now) : " "}
          </p>
          </div>
          <nav className="mt-1 flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/kalkulator"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Kalkulator
            </Link>
            <Link
              href="/prehrana"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Prehrana
            </Link>
            <Link
              href="/analitika-meritve"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Analitika
            </Link>
            <Link
              href="/napredek"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Napredek
            </Link>
            <Link
              href="/meritve"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Meritve
            </Link>
            <Link
              href="/profil"
              className="rounded-full border border-[#9333EA]/30 px-3 py-1.5 text-xs font-semibold text-[#A855F7] transition hover:border-[#A855F7]/60 hover:text-[#C084FC]"
            >
              Profil
            </Link>
          </nav>
        </header>

        {/* Primarna akcija: hitri vnos današnjih vaj */}
        <Link
          href="/danes"
          className="flex items-center justify-between rounded-3xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] px-5 py-4 text-white shadow-lg shadow-[#F5A623]/30 ring-1 ring-[#F5A623]/60 transition active:scale-[0.98]"
        >
          <span className="text-base font-black tracking-tight">
            Danes na vrsti
          </span>
          <span className="text-sm font-semibold text-white/80">Začni →</span>
        </Link>

        {/* Coach (rule-based namig) */}
        <CoachCard />

        {/* 2. Danes treniraš */}
        <TrainingCard
          training={training}
          logged={log?.training.exercises ?? null}
          today={today}
          onChange={setLog}
        />

        {/* 3. Naslednji obrok */}
        <MealCard
          meal={meal}
          done={meal ? !!log?.mealsDone.includes(meal.id) : false}
          ready={!!log}
          onToggle={handleToggleMeal}
        />

        {/* 3b. Zaužito vs cilj — samo če je makro cilj in vsaj en obrok označen */}
        {makro && vnos && log && log.mealsDone.length > 0 && (
          <MacroIntakeRow goal={makro} vnos={vnos} />
        )}

        {/* 4. Voda */}
        <WaterCard
          targetL={RULES.waterTargetL}
          waterMl={log?.waterMl ?? 0}
          ready={!!log}
          onChange={handleWater}
        />

        {/* 5. Današnje navade */}
        <HabitsCard habits={log?.habits ?? null} onToggle={handleToggleHabit} />

        {/* 6. Opomniki */}
        <RemindersCard />

        {/* Mantra (iz RULES) */}
        <p className="mt-2 px-2 text-center text-xs italic text-[#F5F5F7]/40">
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
      className={`rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40 ${className}`}
    >
      {children}
    </section>
  );
}

function CardLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
      {children}
    </p>
  );
}

/* ---------- Zaužito vs cilj (kompaktna vrstica) ---------- */

function fmt0(n: number): string {
  return Math.round(n).toLocaleString("sl-SI");
}

function MacroIntakeRow({
  goal,
  vnos,
}: {
  goal: MakroRezultat;
  vnos: DnevniMakri;
}) {
  const pct =
    goal.kalorije > 0
      ? Math.min(100, Math.round((vnos.kcal / goal.kalorije) * 100))
      : 0;

  return (
    <div className="rounded-2xl border border-[#9333EA]/15 bg-[#14101F] px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-[#A855F7]/80">
          Zaužito
        </span>
        <span className="text-sm font-semibold tabular-nums text-[#F5F5F7]">
          ~{fmt0(vnos.kcal)} / {fmt0(goal.kalorije)} kcal
        </span>
      </div>

      {/* Vijolična napredek vrstica (brez zlate — ni kritična oznaka) */}
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/30">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs tabular-nums text-[#F5F5F7]/70">
        <span>
          B ~{vnos.beljakovine}/{goal.beljakovine.gramov} g
        </span>
        <span className="text-[#F5F5F7]/25">·</span>
        <span>
          OH ~{vnos.oh}/{goal.ogljikoviHidrati.gramov} g
        </span>
        <span className="text-[#F5F5F7]/25">·</span>
        <span>
          M ~{vnos.mascobe}/{goal.mascobe.gramov} g
        </span>
      </p>

      <p className="mt-1 text-[10px] text-[#F5F5F7]/40">
        Ocena na podlagi jedilnika.
      </p>
    </div>
  );
}

/* ---------- Coach kartica (kompaktna) ---------- */

function CoachCard() {
  // SSR-safe: top sporočilo bere localStorage, zato šele po montaži.
  const [top, setTop] = useState<CoachMsg | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTop(getTopCoachMessage());
    setReady(true);
  }, []);

  const label =
    ready && top
      ? top.kind === "increase" && top.suggestedWeight != null
        ? `${top.exerciseName}: čas za ${top.suggestedWeight} kg`
        : top.text
      : "Coach";

  const isIncrease = ready && top?.kind === "increase";

  return (
    <Link
      href="/coach"
      className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 transition active:scale-[0.98] ${
        isIncrease
          ? "border-[#9333EA]/40 bg-[#9333EA]/10"
          : "border-[#9333EA]/20 bg-[#14101F]"
      }`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-[#A855F7]/80">
          Coach
        </span>
        <span className="truncate text-sm font-semibold text-[#F5F5F7]">
          {label}
        </span>
      </span>
      <span className="shrink-0 text-sm font-semibold text-[#A855F7]">→</span>
    </Link>
  );
}

/* ---------- 2. Trening ---------- */

function TrainingCard({
  training,
  logged,
  today,
  onChange,
}: {
  training: TrainingDay | null;
  logged: LoggedExercise[] | null;
  today: string | null;
  onChange: (log: DayLog) => void;
}) {
  const isRecovery = training?.type === "recovery";
  const heading = isRecovery ? "Aktivni počitek" : "Trening";

  const [open, setOpen] = useState(false);

  // Zabeležene serije po vaji (vir resnice za vnos). Napolnimo enkrat iz
  // shranjenega loga; vse spremembe gredo skozi commit() → localStorage.
  const [draft, setDraft] = useState<Record<string, LoggedSet[]>>({});
  const seeded = useRef(false);

  // Predlogi iz ZADNJEGA treninga te vaje (bled placeholder, dokler ni vnosa).
  const [suggest, setSuggest] = useState<Record<string, LoggedSet[]>>({});
  // Predlogi dviga teže (progression engine) na podlagi zadnje seje.
  const [hints, setHints] = useState<Record<string, ProgressionHint>>({});

  // Enkraten seed po mountu: zabeležene serije (draft), predlogi zadnjega
  // treninga (suggest) in predlogi dviga (hints). Vse vrednosti so na voljo
  // hkrati (parent jih nastavi v istem effectu), zato seedamo v enem effectu.
  useEffect(() => {
    if (!logged || seeded.current) return;
    const d: Record<string, LoggedSet[]> = {};
    for (const ex of logged) {
      d[ex.name] = (ex.serije ?? []).map((s) => ({ ...s }));
    }
    setDraft(d);

    if (training && !isRecovery && today) {
      const s: Record<string, LoggedSet[]> = {};
      const h: Record<string, ProgressionHint> = {};
      for (const ex of training.exercises) {
        if (ex.cooldown) continue;
        const last = lastSerijeFor(ex.name, today);
        if (last && last.length) s[ex.name] = last;
        const hint = progressionHint(last ?? [], ex.targetReps, ex.progressionStep);
        if (hint) h[ex.name] = hint;
      }
      setSuggest(s);
      setHints(h);
    }
    seeded.current = true;
  }, [logged, training, isRecovery, today]);

  // Edina pot pisanja: posodobi lokalni draft + zapiši cel seznam serij.
  function commit(name: string, serije: LoggedSet[]) {
    setDraft((prev) => ({ ...prev, [name]: serije }));
    if (today) onChange(setSerije(today, name, serije));
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
            <span className="shrink-0 rounded-full bg-[#9333EA]/20 px-3 py-1 text-xs font-semibold text-[#A855F7]">
              {training.focus}
            </span>
          </div>
          <p className="mt-1 text-sm text-[#F5F5F7]/60">{training.subtitle}</p>

          {/* Recovery dan: samo seznam aktivnosti, brez vnosa serij. */}
          {isRecovery ? (
            <ul className="mt-4 flex flex-col gap-2">
              {training.exercises.map((ex, i) => (
                <li
                  key={i}
                  className="rounded-xl bg-black/20 px-3 py-2.5 text-sm font-medium text-[#F5F5F7]"
                >
                  {ex.name}
                </li>
              ))}
            </ul>
          ) : !open ? (
            /* Zaprt pregled vaj. */
            <ul className="mt-4 flex flex-col gap-2">
              {training.exercises
                .filter((ex) => !ex.bonus)
                .map((ex, i) => (
                  <li
                    key={i}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-[#F5F5F7]">
                      {ex.name}
                    </span>
                    <span className="shrink-0 text-right text-xs text-[#F5F5F7]/60">
                      {ex.defaultWeightKg != null && (
                        <span className="font-semibold text-[#A855F7]">
                          {ex.defaultWeightKg} kg
                        </span>
                      )}
                      {ex.defaultWeightKg != null && ex.targetReps && " · "}
                      {ex.targetReps && <span>{ex.targetReps}</span>}
                    </span>
                  </li>
                ))}

              {/* Bonus / opcijske vaje — ločene v pregledu */}
              {training.exercises.some((ex) => ex.bonus) && (
                <li className="mt-1 border-t border-[#9333EA]/15 pt-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-[#A855F7]/70">
                    ✦ Bonus · opcijsko
                  </p>
                </li>
              )}
              {training.exercises
                .filter((ex) => ex.bonus)
                .map((ex, i) => (
                  <li
                    key={`bonus-${i}`}
                    className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium text-[#F5F5F7]/90">
                      {ex.name}
                      <span className="shrink-0 rounded-full bg-[#9333EA]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
                        Bonus
                      </span>
                    </span>
                    <span className="shrink-0 text-right text-xs text-[#F5F5F7]/60">
                      {ex.defaultWeightKg != null && (
                        <span className="font-semibold text-[#A855F7]">
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
              {training.exercises
                .filter((ex) => !ex.bonus)
                .map((ex, i) => (
                  <ExerciseEditor
                    key={i}
                    exercise={ex}
                    serije={draft[ex.name] ?? []}
                    suggestion={suggest[ex.name] ?? null}
                    hint={hints[ex.name] ?? null}
                    onCommit={(serije) => commit(ex.name, serije)}
                  />
                ))}

              {/* Bonus / opcijske vaje — ločene, isti vnos flow */}
              {training.exercises.some((ex) => ex.bonus) && (
                <>
                  <div className="mt-1 border-t border-[#9333EA]/15 pt-4">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
                      ✦ Bonus · opcijsko
                    </p>
                    <p className="mt-0.5 text-xs text-[#F5F5F7]/45">
                      Ni del glavnih vaj — dodaj po želji.
                    </p>
                  </div>
                  {training.exercises
                    .filter((ex) => ex.bonus)
                    .map((ex, i) => (
                      <ExerciseEditor
                        key={`bonus-${i}`}
                        exercise={ex}
                        serije={draft[ex.name] ?? []}
                        suggestion={suggest[ex.name] ?? null}
                        hint={hints[ex.name] ?? null}
                        onCommit={(serije) => commit(ex.name, serije)}
                      />
                    ))}
                </>
              )}
            </div>
          )}

          {/* Na recovery dan ni vnosa, zato tudi ni gumba. */}
          {!isRecovery && (
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#F5A623]/30 ring-1 ring-[#F5A623]/60 transition active:scale-[0.98]"
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
          <span className="rounded-full bg-[#F5A623]/20 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[#FFB800]">
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
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
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
                ? "border-[#A855F7]/50 bg-[#9333EA]/20 text-white"
                : "border-[#9333EA]/20 bg-black/30 text-[#F5F5F7]/90"
            }`}
          >
            {done ? "✓ Pojedeno" : "Pojedel"}
          </button>

          <ul className="mt-4 flex flex-col gap-1.5">
            {meal.items.map((item, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-[#F5F5F7]/90"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]" />
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
    "flex h-10 w-14 shrink-0 items-center justify-center rounded-xl border border-[#9333EA]/30 bg-black/30 text-sm font-bold text-[#F5F5F7] transition active:scale-[0.95] disabled:opacity-50";

  return (
    <Card>
      <div className="flex items-center justify-between">
        <CardLabel>Voda</CardLabel>
        <span className="text-sm font-semibold tabular-nums text-[#A855F7]">
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
            className="h-full rounded-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] transition-all"
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
                  ? "border-[#A855F7]/50 bg-[#9333EA]/20 text-white"
                  : "border-[#9333EA]/15 bg-black/30 text-[#F5F5F7]/80"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition ${
                  checked
                    ? "border-[#A855F7] bg-[#9333EA] text-black"
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
      <ul className="mt-4 flex flex-col gap-1 border-t border-[#9333EA]/15 pt-3">
        {NUTRITION_RULES.map((rule, i) => (
          <li
            key={i}
            className="flex items-start gap-2 text-xs text-[#F5F5F7]/60"
          >
            <span className="text-[#A855F7]">•</span>
            <span>{rule}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

/* ---------- 6. Opomniki ---------- */

function RemindersCard() {
  // supported === null pomeni "še ne vemo" (pred montažo) → SSR-safe.
  const [supported, setSupported] = useState<boolean | null>(null);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [on, setOn] = useState(false);
  const [native, setNative] = useState(false);

  useEffect(() => {
    void (async () => {
      const sup = isReminderSupported();
      setSupported(sup);
      setNative(isNative());
      if (sup) {
        setPermission(await getReminderPermission());
        // Če je uporabnik opomnike prej vklopil, jih ob zagonu app znova
        // razporedi za naslednji nastop (drugače native opomniki po prvem dnevu
        // odmrejo). resumeReminders je no-op, če izbira ni vklopljena.
        const active = await resumeReminders();
        setOn(active || (await isRemindersActive()));
      }
    })();
  }, []);

  async function enable() {
    const perm = await enableReminders();
    setPermission(perm);
    if (perm === "granted") setOn(await isRemindersActive());
  }

  async function toggle() {
    if (on) {
      await disableReminders();
      setOn(false);
      return;
    }
    if (permission === "granted") {
      await enableReminders();
      setOn(await isRemindersActive());
    } else {
      await enable();
    }
  }

  const statusText =
    permission === "granted"
      ? "Dovoljeno"
      : permission === "denied"
        ? "Zavrnjeno"
        : "Ni odločeno";

  const statusClass =
    permission === "granted"
      ? "bg-emerald-500/20 text-emerald-200"
      : permission === "denied"
        ? "bg-rose-500/20 text-rose-300"
        : "bg-white/10 text-[#F5F5F7]/80";

  return (
    <Card>
      <CardLabel>Opomniki</CardLabel>

      {supported === null ? (
        <Placeholder lines={2} />
      ) : !supported ? (
        <p className="mt-3 text-sm text-[#F5F5F7]/70">
          Tvoj brskalnik ne podpira opomnikov.
        </p>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-sm text-[#F5F5F7]/90">Stanje dovoljenja</span>
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusClass}`}
            >
              {statusText}
            </span>
          </div>

          {permission === "denied" ? (
            <p className="mt-3 text-xs text-[#F5F5F7]/60">
              Opomniki so zavrnjeni. Omogoči jih v nastavitvah{" "}
              {native ? "naprave (aplikacija HYBRID)" : "brskalnika za to stran"}
              .
            </p>
          ) : permission !== "granted" ? (
            <button
              type="button"
              onClick={() => void enable()}
              className="mt-4 w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
            >
              Vklopi opomnike
            </button>
          ) : (
            <button
              type="button"
              onClick={toggle}
              aria-pressed={on}
              className={`mt-4 flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-bold transition active:scale-[0.98] ${
                on
                  ? "border-[#A855F7]/50 bg-[#9333EA]/20 text-white"
                  : "border-[#9333EA]/20 bg-black/30 text-[#F5F5F7]/80"
              }`}
            >
              <span>{on ? "Opomniki vklopljeni" : "Opomniki izklopljeni"}</span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  on ? "bg-[#9333EA]" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                    on ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </span>
            </button>
          )}

          <p className="mt-3 text-xs text-[#F5F5F7]/40">
            {native
              ? "Delujejo tudi v ozadju (nativni opomniki na napravi)."
              : "Delujejo le, ko je ta zavihek odprt."}
          </p>
        </>
      )}
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
