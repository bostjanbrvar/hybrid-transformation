"use client";

import { useState } from "react";
import Link from "next/link";
import {
  meals,
  supplements,
  rules,
  type Meal,
  type Ingredient,
  type InfoBlock,
} from "@/lib/nutrition";

/* ---------- Stran ---------- */

export default function PrehranaPage() {
  // En obrok odprt naenkrat (čistejše na mobilu). null = vsi zaprti.
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-start justify-between gap-3 px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Prehrana
            </h1>
            <p className="mt-0.5 text-sm font-medium text-[#A855F7]/80">
              Sistem za maksimalno energijo, moč in regeneracijo
            </p>
          </div>
          <Link
            href="/"
            className="shrink-0 text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {/* Obroki */}
        <div className="flex flex-col gap-3">
          {meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              open={openId === meal.id}
              onToggle={() =>
                setOpenId((cur) => (cur === meal.id ? null : meal.id))
              }
            />
          ))}
        </div>

        {/* Dodatki */}
        <section className="mt-2 rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
            💊 Dodatki
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {supplements.map((s, i) => (
              <li
                key={i}
                className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2.5"
              >
                <span className="text-sm font-medium text-[#F5F5F7]">
                  {s.name}
                  {s.note && (
                    <span className="text-[#F5F5F7]/45"> ({s.note})</span>
                  )}
                </span>
                <span className="shrink-0 rounded-full bg-[#9333EA]/20 px-2.5 py-1 text-xs font-semibold tabular-nums text-[#A855F7]">
                  {s.time}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Performance pravila */}
        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
          <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
            ⚙️ Performance pravila
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-[#F5F5F7]/90">
                <span className="mt-0.5 shrink-0 font-bold text-[#A855F7]">✔</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </section>
      </main>
    </div>
  );
}

/* ---------- Kartica obroka ---------- */

function MealCard({
  meal,
  open,
  onToggle,
}: {
  meal: Meal;
  open: boolean;
  onToggle: () => void;
}) {
  const gold = meal.critical === true;

  // Akcenti: kritični obrok (15:15) zlato, ostali vijolično/nevtralno.
  const cardBorder = gold ? "border-[#F5A623]/50" : "border-[#9333EA]/20";
  const timeBadge = gold
    ? "bg-[#F5A623]/20 text-[#FFB800]"
    : "bg-[#9333EA]/20 text-[#A855F7]";
  const titleColor = gold ? "text-[#FFB800]" : "text-white";
  const ring = gold ? "ring-1 ring-[#F5A623]/40" : "";

  return (
    <section
      className={`overflow-hidden rounded-3xl border ${cardBorder} ${ring} bg-[#14101F] shadow-lg shadow-black/40`}
    >
      {/* Glava kartice (klik = razširi/skrči) */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-start justify-between gap-3 p-5 text-left active:scale-[0.99]"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-bold tabular-nums ${timeBadge}`}
            >
              {meal.time}
            </span>
            {gold && (
              <span className="shrink-0 rounded-full bg-[#F5A623]/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#FFB800]">
                Kritično
              </span>
            )}
          </div>
          <h2 className={`mt-2 text-lg font-black tracking-tight ${titleColor}`}>
            {meal.title}
          </h2>
          <p className="text-xs font-semibold uppercase tracking-wider text-[#A855F7]/70">
            {meal.tagline}
          </p>
          <p className="mt-2 text-sm text-[#F5F5F7]/70">{meal.formula}</p>
        </div>
        <Chevron open={open} gold={gold} />
      </button>

      {/* Razširjena vsebina */}
      {open && (
        <div className="flex flex-col gap-4 border-t border-[#9333EA]/15 px-5 pb-5 pt-4">
          <p className="text-sm leading-relaxed text-[#F5F5F7]/85">{meal.intro}</p>

          {/* Hitre koristi */}
          {meal.quickBenefits.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {meal.quickBenefits.map((b, i) => (
                <span
                  key={i}
                  className="rounded-full bg-[#9333EA]/15 px-3 py-1 text-xs font-medium text-[#F5F5F7]/85"
                >
                  {b}
                </span>
              ))}
            </div>
          )}

          {/* Opcijsko */}
          {meal.optional.length > 0 && (
            <div className="rounded-xl bg-black/20 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
                👉 Opcijsko
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {meal.optional.map((o, i) => (
                  <li key={i} className="text-sm text-[#F5F5F7]/80">
                    {o}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Sestavine */}
          <div className="flex flex-col gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
              Sestavine
            </p>
            {meal.ingredients.map((ing, i) => (
              <IngredientItem key={i} ing={ing} />
            ))}
          </div>

          {/* Zakaj TOP */}
          <InfoSection block={meal.whyTop} />

          {/* Tips */}
          <InfoSection block={meal.tips} />

          {/* Timing */}
          {meal.timing.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
                ⏱️ Timing
              </p>
              <ul className="mt-1.5 flex flex-col gap-1">
                {meal.timing.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#F5F5F7]/80">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Realno mnenje */}
          <div className="rounded-xl border border-[#9333EA]/20 bg-[#9333EA]/10 p-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]">
              🧠 Realno mnenje
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-[#F5F5F7]/90">
              {meal.opinion}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Pod-komponente ---------- */

function IngredientItem({ ing }: { ing: Ingredient }) {
  return (
    <div className="rounded-xl bg-black/20 p-3">
      <p className="text-sm font-bold text-[#F5F5F7]">{ing.name}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {ing.notes.map((n, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#F5F5F7]/70">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#A855F7]/70" />
            <span>{n}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InfoSection({ block }: { block: InfoBlock }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        {block.title}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {block.points.map((p, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-[#F5F5F7]/85">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#A855F7]" />
            <span>{p}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chevron({ open, gold }: { open: boolean; gold: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      className={`mt-1 h-5 w-5 shrink-0 transition-transform ${
        open ? "rotate-180" : ""
      } ${gold ? "text-[#FFB800]" : "text-[#A855F7]"}`}
      aria-hidden="true"
    >
      <path
        d="M5 7.5 10 12.5 15 7.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
