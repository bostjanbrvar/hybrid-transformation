"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getProfile,
  saveProfile,
  izracunajStarost,
  AKTIVNOST_OPISI,
  CILJ_OPISI,
  SPOL_OPISI,
  DEFAULT_PROFILE,
  type Profile,
  type Spol,
  type Aktivnost,
  type Cilj,
} from "@/lib/profile";
import { BackupSection } from "@/components/BackupSection";

/* ---------- Skupni razredi (HYBRID temni stil) ---------- */

const fieldClass =
  "w-full rounded-xl border border-[#9333EA]/30 bg-black/40 px-3 py-2.5 text-sm font-medium text-[#F5F5F7] outline-none transition focus:border-[#A855F7]";

const labelClass = "text-xs font-semibold text-[#A855F7]/80";

export default function ProfilPage() {
  // SSR-safe: profil naložimo iz localStorage šele po montaži.
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(getProfile());
    setReady(true);
  }, []);

  // Vsaka sprememba polja prekliče potrditev shranjevanja.
  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function handleSave() {
    saveProfile(profile);
    setSaved(true);
  }

  const starost = izracunajStarost(profile.rojstniDatum);

  return (
    <div className="min-h-full w-full bg-black text-[#F5F5F7]">
      <main className="mx-auto flex w-full max-w-[480px] flex-col gap-4 px-4 pb-16 pt-8">
        {/* Glava */}
        <header className="mb-1 flex items-center justify-between px-1">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Profil
          </h1>
          <Link
            href="/"
            className="text-sm font-medium text-[#A855F7] transition hover:text-[#C084FC]"
          >
            ← Nazaj
          </Link>
        </header>

        <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
          {!ready ? (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 animate-pulse rounded-xl bg-white/10"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Ime */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Ime</span>
                <input
                  type="text"
                  value={profile.ime}
                  onChange={(e) => update("ime", e.target.value)}
                  placeholder="Tvoje ime"
                  className={`${fieldClass} placeholder:text-[#F5F5F7]/30`}
                />
              </label>

              {/* Spol */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Spol</span>
                <select
                  value={profile.spol}
                  onChange={(e) => update("spol", e.target.value as Spol)}
                  className={fieldClass}
                >
                  {(Object.keys(SPOL_OPISI) as Spol[]).map((s) => (
                    <option key={s} value={s} className="bg-[#14101F]">
                      {SPOL_OPISI[s]}
                    </option>
                  ))}
                </select>
              </label>

              {/* Rojstni datum + starost */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Rojstni datum</span>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={profile.rojstniDatum}
                    onChange={(e) => update("rojstniDatum", e.target.value)}
                    className={`${fieldClass} flex-1 [color-scheme:dark]`}
                  />
                  <span className="shrink-0 rounded-xl bg-[#9333EA]/20 px-3 py-2 text-sm font-semibold text-[#A855F7]">
                    {profile.rojstniDatum ? `${starost} let` : "— let"}
                  </span>
                </div>
              </label>

              {/* Višina */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Višina (cm)</span>
                <input
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={Number.isFinite(profile.visinaCm) ? profile.visinaCm : ""}
                  onChange={(e) =>
                    update(
                      "visinaCm",
                      e.target.value === "" ? 0 : Number(e.target.value),
                    )
                  }
                  className={fieldClass}
                />
              </label>

              {/* Aktivnost */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Raven aktivnosti</span>
                <select
                  value={profile.aktivnost}
                  onChange={(e) =>
                    update("aktivnost", e.target.value as Aktivnost)
                  }
                  className={fieldClass}
                >
                  {(Object.keys(AKTIVNOST_OPISI) as Aktivnost[]).map((a) => (
                    <option key={a} value={a} className="bg-[#14101F]">
                      {AKTIVNOST_OPISI[a]}
                    </option>
                  ))}
                </select>
              </label>

              {/* Cilj */}
              <label className="flex flex-col gap-1.5">
                <span className={labelClass}>Cilj</span>
                <select
                  value={profile.cilj}
                  onChange={(e) => update("cilj", e.target.value as Cilj)}
                  className={fieldClass}
                >
                  {(Object.keys(CILJ_OPISI) as Cilj[]).map((c) => (
                    <option key={c} value={c} className="bg-[#14101F]">
                      {CILJ_OPISI[c]}
                    </option>
                  ))}
                </select>
              </label>

              {/* Shrani */}
              <button
                type="button"
                onClick={handleSave}
                className="mt-2 w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
              >
                Shrani
              </button>

              {saved && (
                <p className="text-center text-sm font-semibold text-[#FFB800]">
                  ✓ Shranjeno
                </p>
              )}
            </div>
          )}
        </section>

        <p className="px-2 text-center text-xs text-[#F5F5F7]/40">
          Teža ni del profila — beleži se dnevno.
        </p>

        {/* Varnostna kopija (izvoz/uvoz vseh podatkov) */}
        <BackupSection />
      </main>
    </div>
  );
}
