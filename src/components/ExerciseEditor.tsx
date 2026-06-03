// src/components/ExerciseEditor.tsx
// =============================================================
// HYBRID TRANSFORMATION — urejevalnik vaje (serije teža × ponovitve)
// Polno kontroliran: serije + onCommit prihajata od starša; vsa sprememba
// gre prek onCommit (= setSerije). Deljen med dashboardom (/) in /danes.
// =============================================================

import type { LoggedSet } from "@/lib/storage";
import type { ProgressionHint } from "@/lib/progression";
import { useRestTimer } from "@/components/RestTimerProvider";

const WEIGHT_STEPS = [1.25, 2.5]; // pari gumbov: male mišice / večje vaje

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function ExerciseEditor({
  exercise,
  serije,
  suggestion,
  hint,
  onCommit,
  onConfirmUnchanged,
}: {
  exercise: { name: string; defaultWeightKg?: number; targetReps?: string; cooldown?: boolean; bonus?: boolean };
  serije: LoggedSet[];
  suggestion: LoggedSet[] | null;
  hint: ProgressionHint | null;
  onCommit: (serije: LoggedSet[]) => void;
  /** Če podano: serije so predizpolnjene a še NE shranjene — pokaže "✓ Kot zadnjič". */
  onConfirmUnchanged?: () => void;
}) {
  const { start } = useRestTimer();

  if (exercise.cooldown) {
    return (
      <div className="rounded-2xl bg-black/20 p-3">
        <p className="text-sm font-semibold text-[#F5F5F7]">{exercise.name}</p>
        <p className="mt-1 text-xs italic text-[#F5F5F7]/40">Cool-down</p>
      </div>
    );
  }

  const hasRows = serije.length > 0;

  function patch(idx: number, p: Partial<LoggedSet>) {
    onCommit(serije.map((s, i) => (i === idx ? { ...s, ...p } : s)));
  }
  function adjustTeza(idx: number, delta: number) {
    patch(idx, { teza: Math.max(0, round2(serije[idx].teza + delta)) });
  }
  function adjustReps(idx: number, delta: number) {
    patch(idx, { ponovitve: Math.max(0, serije[idx].ponovitve + delta) });
  }
  function addRow() {
    const last = serije[serije.length - 1];
    onCommit([...serije, last ? { ...last } : { teza: 0, ponovitve: 0 }]);
    // Nova serija shranjena → sproži počitek timer (60 s). Resetira tekočega.
    start();
  }
  function removeRow(idx: number) {
    onCommit(serije.filter((_, i) => i !== idx));
  }
  function useSuggestion() {
    if (suggestion) onCommit(suggestion.map((s) => ({ ...s })));
  }
  // Progression: en tap → prva serija pri predlagani (višji) teži.
  function startAtSuggested() {
    if (hint) onCommit([{ teza: hint.suggestedWeight, ponovitve: 0 }]);
  }

  return (
    <div className="rounded-2xl bg-black/20 p-3">
      {/* Glava vaje: ime + cilj (targetReps) + namig privzete teže. */}
      <div className="flex items-start justify-between gap-3">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#F5F5F7]">
          {exercise.name}
          {exercise.bonus && (
            <span className="shrink-0 rounded-full bg-[#9333EA]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#A855F7]">
              Bonus
            </span>
          )}
        </p>
        {(exercise.targetReps || exercise.defaultWeightKg != null) && (
          <span className="shrink-0 text-right text-[11px] text-[#F5F5F7]/55">
            {exercise.targetReps && (
              <span className="font-semibold text-[#A855F7]">
                Cilj: {exercise.targetReps}
              </span>
            )}
            {exercise.targetReps && exercise.defaultWeightKg != null && " · "}
            {exercise.defaultWeightKg != null && <span>~{exercise.defaultWeightKg} kg</span>}
          </span>
        )}
      </div>

      {/* Predizpolnjeno iz zadnjič, a še ne shranjeno — viden indikator. */}
      {onConfirmUnchanged && hasRows && (
        <p className="mt-2 text-[11px] font-medium text-[#F5A623]/80">
          ● Predizpolnjeno iz zadnjič — popravi ali potrdi
        </p>
      )}

      {/* Progression namig: nevsiljiv predlog dviga teže (ne spreminja samodejno). */}
      {hint && (
        <div className="mt-2.5 rounded-xl border border-[#22C55E]/30 bg-[#22C55E]/10 p-2.5">
          <p className="text-xs font-semibold text-[#22C55E]">
            ✅ Cilj dosežen pri vseh serijah ({hint.currentWeight} kg) — predlagam{" "}
            {hint.suggestedWeight} kg
          </p>
          {!hasRows && (
            <button
              type="button"
              onClick={startAtSuggested}
              className="mt-2 w-full rounded-xl bg-[#22C55E]/15 py-2.5 text-sm font-bold text-[#22C55E] active:scale-[0.98]"
            >
              Začni pri {hint.suggestedWeight} kg
            </button>
          )}
        </div>
      )}

      {/* Predlog iz zadnjega treninga — viden samo dokler ni nobene serije. */}
      {!hasRows && suggestion && (
        <div className="mt-3 rounded-xl border border-dashed border-[#9333EA]/30 bg-black/20 p-2.5">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[#F5F5F7]/40">
            Zadnjič
          </p>
          <p className="mt-1 text-sm text-[#F5F5F7]/45">
            {suggestion.map((s) => `${s.teza}×${s.ponovitve}`).join("  ·  ")}
          </p>
          <button
            type="button"
            onClick={useSuggestion}
            className="mt-2 w-full rounded-xl bg-[#9333EA]/20 py-2.5 text-sm font-bold text-[#A855F7] active:scale-[0.98]"
          >
            Isto kot zadnjič
          </button>
        </div>
      )}

      {/* Zabeležene serije. */}
      {hasRows && (
        <div className="mt-3 flex flex-col gap-2.5">
          {serije.map((s, idx) => (
            <div key={idx} className="rounded-xl bg-black/30 p-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#A855F7]/80">
                  Serija {idx + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeRow(idx)}
                  aria-label={`Odstrani serijo ${idx + 1}`}
                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#F5F5F7]/40 active:scale-90"
                >
                  ✕
                </button>
              </div>

              {/* Teža — pari gumbov 1.25 in 2.5 + direktni vnos. */}
              <div className="mt-2 flex items-center justify-center gap-1.5">
                {WEIGHT_STEPS.slice().reverse().map((step) => (
                  <button
                    key={`mt-${step}`}
                    type="button"
                    onClick={() => adjustTeza(idx, -step)}
                    className="h-11 min-w-12 rounded-lg bg-[#9333EA]/15 px-2 text-sm font-bold text-[#A855F7] active:scale-95"
                  >
                    −{step}
                  </button>
                ))}
                <div className="flex min-w-20 flex-col items-center px-1">
                  <input
                    type="number"
                    inputMode="decimal"
                    step="0.25"
                    min="0"
                    value={String(s.teza)}
                    onChange={(e) =>
                      patch(idx, { teza: Math.max(0, Number(e.target.value) || 0) })
                    }
                    className="w-20 rounded-lg border border-[#9333EA]/30 bg-black/40 px-1 py-1.5 text-center text-base font-bold text-[#F5F5F7] outline-none focus:border-[#A855F7]"
                  />
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#F5F5F7]/40">
                    kg
                  </span>
                </div>
                {WEIGHT_STEPS.map((step) => (
                  <button
                    key={`pt-${step}`}
                    type="button"
                    onClick={() => adjustTeza(idx, step)}
                    className="h-11 min-w-12 rounded-lg bg-[#9333EA]/15 px-2 text-sm font-bold text-[#A855F7] active:scale-95"
                  >
                    +{step}
                  </button>
                ))}
              </div>

              {/* Ponovitve — −/+ po 1 + direktni vnos. */}
              <div className="mt-2 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustReps(idx, -1)}
                  className="h-11 w-12 rounded-lg bg-white/5 text-lg font-bold text-[#F5F5F7] active:scale-95"
                >
                  −
                </button>
                <div className="flex min-w-20 flex-col items-center px-1">
                  <input
                    type="number"
                    inputMode="numeric"
                    min="0"
                    value={String(s.ponovitve)}
                    onChange={(e) =>
                      patch(idx, {
                        ponovitve: Math.max(0, Math.round(Number(e.target.value) || 0)),
                      })
                    }
                    className="w-20 rounded-lg border border-[#9333EA]/30 bg-black/40 px-1 py-1.5 text-center text-base font-bold text-[#F5F5F7] outline-none focus:border-[#A855F7]"
                  />
                  <span className="mt-0.5 text-[10px] font-medium uppercase tracking-wider text-[#F5F5F7]/40">
                    pon.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => adjustReps(idx, 1)}
                  className="h-11 w-12 rounded-lg bg-white/5 text-lg font-bold text-[#F5F5F7] active:scale-95"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Akcije: potrdi predizpolnjeno / dodaj serijo / prepis zadnjega. */}
      <div className="mt-2.5 flex gap-2">
        {onConfirmUnchanged && hasRows && (
          <button
            type="button"
            onClick={onConfirmUnchanged}
            className="flex-1 rounded-xl bg-[#9333EA]/20 py-2.5 text-sm font-bold text-[#A855F7] active:scale-[0.98]"
          >
            ✓ Kot zadnjič
          </button>
        )}
        <button
          type="button"
          onClick={addRow}
          className="flex-1 rounded-xl bg-[#9333EA]/15 py-2.5 text-sm font-bold text-[#A855F7] active:scale-[0.98]"
        >
          + Dodaj serijo
        </button>
        {hasRows && suggestion && (
          <button
            type="button"
            onClick={useSuggestion}
            className="rounded-xl bg-white/5 px-3 py-2.5 text-xs font-semibold text-[#F5F5F7]/70 active:scale-[0.98]"
          >
            Kot zadnjič
          </button>
        )}
      </div>
    </div>
  );
}
