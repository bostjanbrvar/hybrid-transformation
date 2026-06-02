"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfile,
  izracunajStarost,
  AKTIVNOST_OPISI,
  CILJ_OPISI,
  type Profile,
} from "@/lib/profile";
import { getVseMeritve, drsecePovprecje } from "@/lib/meritve";
import {
  izracunajMakre,
  shraniMakroCilj,
  type MakroRezultat,
} from "@/lib/makro";

/* ---------- Pomožno ---------- */

function fmt0(n: number): string {
  return Math.round(n).toLocaleString("sl-SI");
}
function fmt1(n: number): string {
  return n.toLocaleString("sl-SI", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
}
function pct(d: number): string {
  return `${Math.round(d * 100)} %`;
}

interface TezaVir {
  tezaKg: number;
  vir: string;
}

/** Izbere težo: 7-dnevno povprečje (≥7 meritev) ali zadnjo surovo. */
function izberiTezo(): TezaVir | null {
  const vse = getVseMeritve();
  const tezaVnosi = vse.filter((m) => m.tezaKg != null);
  if (tezaVnosi.length === 0) return null;

  if (tezaVnosi.length >= 7) {
    const ma = drsecePovprecje(vse, "tezaKg", 7);
    if (ma.length > 0) {
      return {
        tezaKg: ma[ma.length - 1].vrednost,
        vir: "7-dnevno drseče povprečje",
      };
    }
  }
  return {
    tezaKg: tezaVnosi[tezaVnosi.length - 1].tezaKg!,
    vir: "zadnja meritev",
  };
}

function profilIzpolnjen(p: Profile): boolean {
  return (
    p.rojstniDatum.trim() !== "" &&
    p.visinaCm > 0 &&
    izracunajStarost(p.rojstniDatum) > 0
  );
}

/* ---------- Stran ---------- */

export default function KalkulatorPage() {
  const [stanje, setStanje] = useState<"nalaganje" | "ok" | "brezProfila" | "brezTeze">(
    "nalaganje",
  );
  const [profile, setProfile] = useState<Profile | null>(null);
  const [tezaVir, setTezaVir] = useState<TezaVir | null>(null);
  const [rezultat, setRezultat] = useState<MakroRezultat | null>(null);
  const [shranjeno, setShranjeno] = useState(false);

  // SSR-safe: vse beremo šele po montaži.
  useEffect(() => {
    const p = getProfile();
    if (!profilIzpolnjen(p)) {
      setStanje("brezProfila");
      return;
    }
    const t = izberiTezo();
    if (!t) {
      setStanje("brezTeze");
      return;
    }
    setProfile(p);
    setTezaVir(t);
    setRezultat(izracunajMakre(p, t.tezaKg));
    setStanje("ok");
  }, []);

  function uporabiVFeedbacku() {
    if (!profile || !rezultat) return;
    shraniMakroCilj(profile, rezultat, new Date().toISOString());
    setShranjeno(true);
  }

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        <header className="mb-1 flex items-center justify-between px-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Kalkulator
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        {stanje === "nalaganje" && (
          <div className="h-48 animate-pulse rounded-3xl bg-white/5" />
        )}

        {stanje === "brezProfila" && (
          <Prazno
            besedilo="Najprej izpolni profil (rojstni datum, višina) za izračun."
            gumbHref="/profil"
            gumbBesedilo="Odpri profil"
          />
        )}

        {stanje === "brezTeze" && (
          <Prazno
            besedilo="Za izračun potrebuješ vsaj eno meritev teže."
            gumbHref="/meritve"
            gumbBesedilo="Vnesi meritev"
          />
        )}

        {stanje === "ok" && profile && tezaVir && rezultat && (
          <>
            {/* Glavna kartica */}
            <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
                Dnevni cilj
              </p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-4xl font-black tabular-nums text-white">
                  {fmt0(rezultat.kalorije)}
                </span>
                <span className="text-lg font-semibold text-[#F5F5F7]/50">
                  kcal
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <MakroBlok
                  label="Beljakovine"
                  gramov={rezultat.beljakovine.gramov}
                  delez={rezultat.beljakovine.delez}
                  kcal={rezultat.beljakovine.kcal}
                  poudarjen
                />
                <MakroBlok
                  label="Maščobe"
                  gramov={rezultat.mascobe.gramov}
                  delez={rezultat.mascobe.delez}
                  kcal={rezultat.mascobe.kcal}
                />
                <MakroBlok
                  label="Ogljikovi h."
                  gramov={rezultat.ogljikoviHidrati.gramov}
                  delez={rezultat.ogljikoviHidrati.delez}
                  kcal={rezultat.ogljikoviHidrati.kcal}
                />
              </div>
            </section>

            {/* Vhodni podatki (transparentnost) */}
            <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
                Uporabljeni podatki
              </p>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <Vrstica
                  k="Teža"
                  v={`${fmt1(tezaVir.tezaKg)} kg`}
                  pod={tezaVir.vir}
                />
                <Vrstica k="BMR (Mifflin-St Jeor)" v={`${fmt0(rezultat.bmr)} kcal`} />
                <Vrstica
                  k="Aktivnost"
                  v={AKTIVNOST_OPISI[profile.aktivnost]}
                  pod={`TDEJ ${fmt0(rezultat.tdee)} kcal`}
                />
                <Vrstica k="Cilj" v={CILJ_OPISI[profile.cilj]} />
                <Vrstica k="Starost" v={`${rezultat.starost} let`} />
                <Vrstica k="Višina" v={`${profile.visinaCm} cm`} />
              </dl>
            </section>

            {/* Disclaimer */}
            <p className="px-2 text-center text-xs text-[#F5F5F7]/40">
              Izračun je informativen (Mifflin-St Jeor + standardni faktorji).
              Prilagodi glede na dejanski napredek iz meritev.
            </p>

            {/* Gumb */}
            <button
              type="button"
              onClick={uporabiVFeedbacku}
              className="w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
            >
              Uporabi v AI feedbacku
            </button>
            {shranjeno && (
              <p className="text-center text-sm font-semibold text-[#FFB800]">
                ✓ Cilj shranjen za AI feedback
              </p>
            )}
          </>
        )}
      </main>
    </div>
  );
}

/* ---------- Podkomponente ---------- */

function MakroBlok({
  label,
  gramov,
  delez,
  kcal,
  poudarjen = false,
}: {
  label: string;
  gramov: number;
  delez: number;
  kcal: number;
  poudarjen?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-3 ${
        poudarjen
          ? "border border-[#A855F7]/40 bg-[#9333EA]/15"
          : "border border-[#9333EA]/15 bg-black/20"
      }`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#A855F7]/70">
        {label}
      </p>
      <p className="mt-1 text-xl font-black tabular-nums text-white">
        {fmt0(gramov)}
        <span className="text-sm font-semibold text-[#F5F5F7]/50"> g</span>
      </p>
      <p className="text-xs tabular-nums text-[#F5F5F7]/50">
        {pct(delez)} · {fmt0(kcal)} kcal
      </p>
    </div>
  );
}

function Vrstica({ k, v, pod }: { k: string; v: string; pod?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-[#9333EA]/10 pb-2 last:border-0 last:pb-0">
      <span className="text-[#F5F5F7]/70">{k}</span>
      <span className="text-right">
        <span className="block font-semibold text-[#F5F5F7]">{v}</span>
        {pod && (
          <span className="block text-xs text-[#A855F7]/70">{pod}</span>
        )}
      </span>
    </div>
  );
}

function Prazno({
  besedilo,
  gumbHref,
  gumbBesedilo,
}: {
  besedilo: string;
  gumbHref: string;
  gumbBesedilo: string;
}) {
  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-6 text-center shadow-lg shadow-black/40">
      <p className="text-sm text-[#F5F5F7]/70">{besedilo}</p>
      <Link
        href={gumbHref}
        className="mt-4 inline-block rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
      >
        {gumbBesedilo}
      </Link>
    </section>
  );
}
