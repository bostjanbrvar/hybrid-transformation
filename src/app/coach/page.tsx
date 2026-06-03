"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

/* ---------- Stran ---------- */

export default function CoachPage() {
  // SSR-safe: localStorage beremo šele po montaži (kot ostale strani).
  const [now, setNow] = useState<Date | null>(null);
  const [msgs, setMsgs] = useState<CoachMsg[]>([]);

  useEffect(() => {
    const d = new Date();
    setNow(d);
    setMsgs(getCoachMessages(d));
  }, []);

  const increase = msgs.filter((m) => m.kind === "increase");
  const newOrHold = msgs.filter((m) => m.kind === "new" || m.kind === "hold");
  const neglected = msgs.filter((m) => m.kind === "neglected");
  const today = msgs.filter((m) => m.kind === "today");
  const encourage = msgs.filter((m) => m.kind === "streak" || m.kind === "volume");

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Coach</h1>
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

        {!now ? (
          <Skeleton />
        ) : msgs.length === 0 ? (
          <Info emoji="🤔" title="Ni predlogov" text="Za danes ni sporočil." />
        ) : (
          <>
            {increase.length > 0 && (
              <Section title="Čas za dvig" accent>
                {increase.map((m, i) => (
                  <IncreaseCard key={`inc-${i}`} msg={m} />
                ))}
              </Section>
            )}

            {newOrHold.length > 0 && (
              <Section title="Vaje">
                {newOrHold.map((m, i) => (
                  <MsgCard key={`nh-${i}`} msg={m} muted={m.kind === "hold"} />
                ))}
              </Section>
            )}

            {neglected.length > 0 && (
              <Section title="Zapostavljene skupine">
                {neglected.map((m, i) => (
                  <MsgCard key={`neg-${i}`} msg={m} icon="⏳" />
                ))}
              </Section>
            )}

            {today.length > 0 && (
              <Section title="Danes">
                {today.map((m, i) => (
                  <MsgCard key={`tod-${i}`} msg={m} icon="📅" />
                ))}
              </Section>
            )}

            {encourage.length > 0 && (
              <Section title="Spodbude">
                {encourage.map((m, i) => (
                  <MsgCard key={`enc-${i}`} msg={m} icon="🔥" />
                ))}
              </Section>
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
  children,
}: {
  title: string;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      <h2
        className={`px-1 text-[11px] font-semibold uppercase tracking-widest ${
          accent ? "text-[#A855F7]" : "text-[#A855F7]/80"
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

function MsgCard({
  msg,
  muted = false,
  icon,
}: {
  msg: CoachMsg;
  muted?: boolean;
  icon?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-[#9333EA]/15 bg-[#14101F] p-4 ${
        muted ? "opacity-80" : ""
      }`}
    >
      {msg.exerciseName && (
        <p className="text-base font-bold text-[#F5F5F7]">{msg.exerciseName}</p>
      )}
      <p
        className={`flex items-start gap-2 text-sm ${
          msg.exerciseName ? "mt-1.5 text-[#F5F5F7]/70" : "text-[#F5F5F7]/90"
        }`}
      >
        {icon && <span className="shrink-0">{icon}</span>}
        <span>{msg.text}</span>
      </p>
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
