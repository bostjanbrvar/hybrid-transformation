"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { todaysTraining } from "@/lib/protocol";
import { getCoachMessages, type CoachMsg } from "@/lib/coach";

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

type CoachView = {
  forDate: Date;       // dan, za katerega coachamo
  restToday: boolean;  // je danes počitek (in coachamo jutri)?
  noTraining: boolean; // ni treninga niti jutri (oba počitek)
  msgs: CoachMsg[];
};

/* ---------- Stran ---------- */

export default function CoachPage() {
  // SSR-safe: localStorage beremo šele po montaži (kot ostale strani).
  const [view, setView] = useState<CoachView | null>(null);

  useEffect(() => {
    const now = new Date();
    const today = todaysTraining(now);

    if (today.type === "training") {
      setView({ forDate: now, restToday: false, noTraining: false, msgs: getCoachMessages(now) });
      return;
    }

    // Recovery danes → coach za jutri.
    const jutri = new Date(now);
    jutri.setDate(jutri.getDate() + 1);
    const jutriDay = todaysTraining(jutri);

    if (jutriDay.type === "training") {
      setView({ forDate: jutri, restToday: true, noTraining: false, msgs: getCoachMessages(jutri) });
    } else {
      setView({ forDate: jutri, restToday: true, noTraining: true, msgs: [] });
    }
  }, []);

  const increase = view?.msgs.filter((m) => m.kind === "increase") ?? [];
  const fresh = view?.msgs.filter((m) => m.kind === "new") ?? [];
  const hold = view?.msgs.filter((m) => m.kind === "hold") ?? [];

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Coach</h1>
            {view && (
              <p className="mt-0.5 text-sm font-medium text-[#A855F7]/80">
                {view.restToday ? "Jutri: " : ""}
                {formatDan(view.forDate)}
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

        {!view ? (
          <Skeleton />
        ) : view.restToday && view.noTraining ? (
          <Info
            emoji="😴"
            title="Počitek"
            text="Danes in jutri počitek — ni vaj za coachat."
          />
        ) : (
          <>
            {view.restToday && (
              <div className="rounded-2xl border border-[#9333EA]/20 bg-[#14101F] px-4 py-3 text-sm text-[#F5F5F7]/70">
                😴 Danes počitek — spodaj predlogi za jutrišnji trening.
              </div>
            )}

            {view.msgs.length === 0 ? (
              <Info
                emoji="🤔"
                title="Ni predlogov"
                text="Za ta dan ni vaj za coachat."
              />
            ) : (
              <>
                {increase.length > 0 && (
                  <Section title="Čas za dvig" accent>
                    {increase.map((m) => (
                      <IncreaseCard key={m.exerciseName} msg={m} />
                    ))}
                  </Section>
                )}

                {fresh.length > 0 && (
                  <Section title="Nove vaje">
                    {fresh.map((m) => (
                      <PlainCard key={m.exerciseName} msg={m} />
                    ))}
                  </Section>
                )}

                {hold.length > 0 && (
                  <Section title="Ostani pri teži" muted>
                    {hold.map((m) => (
                      <PlainCard key={m.exerciseName} msg={m} muted />
                    ))}
                  </Section>
                )}
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Sekcija ---------- */

function Section({
  title,
  accent = false,
  muted = false,
  children,
}: {
  title: string;
  accent?: boolean;
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2
        className={`px-1 text-[11px] font-semibold uppercase tracking-widest ${
          accent ? "text-[#A855F7]" : muted ? "text-[#F5F5F7]/40" : "text-[#A855F7]/80"
        }`}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

/* ---------- Kartice sporočil ---------- */

function IncreaseCard({ msg }: { msg: CoachMsg }) {
  const step =
    msg.suggestedWeight != null && msg.lastWeight != null
      ? Math.round((msg.suggestedWeight - msg.lastWeight) * 100) / 100
      : null;

  return (
    <div className="rounded-2xl border border-[#9333EA]/40 bg-[#9333EA]/10 p-4">
      <div className="flex items-start justify-between gap-3">
        <p className="text-base font-bold text-white">{msg.exerciseName}</p>
        {step != null && (
          <span className="shrink-0 rounded-full bg-[#9333EA] px-3 py-1 text-sm font-black text-white">
            +{step} kg
          </span>
        )}
      </div>
      <p className="mt-1.5 text-sm text-[#F5F5F7]/80">{msg.text}</p>
      {msg.lastWeight != null && msg.suggestedWeight != null && (
        <p className="mt-2 text-xs font-semibold text-[#A855F7]">
          {msg.lastWeight} kg → {msg.suggestedWeight} kg
        </p>
      )}
    </div>
  );
}

function PlainCard({ msg, muted = false }: { msg: CoachMsg; muted?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-[#9333EA]/15 bg-[#14101F] p-4 ${
        muted ? "opacity-80" : ""
      }`}
    >
      <p className="text-base font-bold text-[#F5F5F7]">{msg.exerciseName}</p>
      <p className="mt-1.5 text-sm text-[#F5F5F7]/70">{msg.text}</p>
    </div>
  );
}

/* ---------- Stanja ---------- */

function Info({ emoji, title, text }: { emoji: string; title: string; text: string }) {
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
      <p className="text-3xl">{emoji}</p>
      <h2 className="mt-2 text-xl font-bold text-white">{title}</h2>
      <p className="mt-1 text-sm text-[#F5F5F7]/60">{text}</p>
    </section>
  );
}

function Skeleton() {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-24 animate-pulse rounded-2xl bg-white/5" />
      ))}
    </div>
  );
}
