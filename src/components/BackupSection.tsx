"use client";

// src/components/BackupSection.tsx
// =============================================================
// HYBRID TRANSFORMATION — UI za varnostno kopijo (izvoz / uvoz)
// Vgrajen na dnu /profil. Logika (zbiranje ključev, validacija, atomarni
// zapis) je v @/lib/backup — ta komponenta je samo prikaz + prožilci.
//
// IZVOZ na napravi — opomba o Android WebView:
//   Capacitor Android WebView privzeto NE registrira DownloadListenerja, zato
//   klasičen blob <a download> morda ne sproži shranjevanja datoteke. Zato:
//     1) najprej poskusimo Web Share API z datoteko (navigator.share({files})),
//        ki na napravi odpre "Deli" (shrani v Datoteke / pošlji) — če je na
//        voljo (feature-detect prek navigator.canShare).
//     2) sicer blob download (deluje na spletu / mobilnem brskalniku).
//     3) VEDNO ponudimo še "Kopiraj v odložišče" kot zajamčen fallback.
//   Če se na telefonu izkaže, da ne 1) ne 2) ne deluje, dodamo @capacitor/share
//   (trenutno brez novih odvisnosti — testira se na napravi).
// =============================================================

import { useRef, useState } from "react";
import { toDateKey } from "@/lib/storage";
import {
  backupToJson,
  parseBackup,
  applyBackup,
  type BackupFile,
  type BackupSummary,
} from "@/lib/backup";

type Status = { kind: "ok" | "err" | "info"; text: string } | null;

interface Pending {
  file: BackupFile;
  summary: BackupSummary;
}

export function BackupSection() {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [busy, setBusy] = useState(false);

  /* ---------- Izvoz ---------- */

  async function handleExport() {
    setStatus(null);
    try {
      const now = new Date();
      const json = backupToJson(now);
      const filename = `hybrid-backup-${toDateKey(now)}.json`;

      // 1) Web Share API z datoteko (najbolje na napravi).
      const file = new File([json], filename, { type: "application/json" });
      const nav = navigator as Navigator & {
        canShare?: (data?: unknown) => boolean;
      };
      if (typeof nav.share === "function" && nav.canShare?.({ files: [file] })) {
        try {
          await nav.share({ files: [file], title: "HYBRID varnostna kopija" });
          setStatus({ kind: "ok", text: "Kopija pripravljena za deljenje." });
          return;
        } catch (err) {
          // Uporabnik lahko prekliče deljenje (AbortError) — to ni napaka.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // sicer pademo na download
        }
      }

      // 2) Blob download (splet / mobilni brskalnik).
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus({ kind: "ok", text: `Izvoženo: ${filename}` });
    } catch {
      setStatus({
        kind: "err",
        text: "Izvoz ni uspel. Poskusi 'Kopiraj v odložišče'.",
      });
    }
  }

  async function handleCopy() {
    setStatus(null);
    try {
      const json = backupToJson(new Date());
      await navigator.clipboard.writeText(json);
      setStatus({ kind: "ok", text: "Kopirano v odložišče." });
    } catch {
      setStatus({ kind: "err", text: "Kopiranje ni uspelo." });
    }
  }

  /* ---------- Uvoz ---------- */

  function pickFile() {
    setStatus(null);
    setPending(null);
    fileInputRef.current?.click();
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.target;
    const f = input.files?.[0];
    // Ponastavi vrednost, da izbira iste datoteke znova sproži onChange.
    input.value = "";
    if (!f) return;

    setStatus(null);
    try {
      const text = await f.text();
      const res = parseBackup(text);
      if (!res.ok) {
        setStatus({ kind: "err", text: res.error });
        return;
      }
      setPending({ file: res.file, summary: res.summary });
    } catch {
      setStatus({ kind: "err", text: "Datoteke ni bilo mogoče prebrati." });
    }
  }

  function confirmImport() {
    if (!pending) return;
    setBusy(true);
    const res = applyBackup(pending.file);
    if (!res.ok) {
      setBusy(false);
      setPending(null);
      setStatus({ kind: "err", text: res.error ?? "Uvoz ni uspel." });
      return;
    }
    // Uspeh → osveži app, da vse strani preberejo nove podatke.
    setStatus({ kind: "ok", text: "Uvoženo. Osvežujem…" });
    window.location.reload();
  }

  function cancelImport() {
    setPending(null);
    setStatus(null);
  }

  const fmtDate = (iso: string) => {
    if (!iso) return "neznano";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "neznano"
      : d.toLocaleString("sl-SI", {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  /* ---------- Prikaz ---------- */

  return (
    <section className="rounded-3xl border border-[#9333EA]/20 bg-[#14101F] p-5 shadow-lg shadow-black/40">
      <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#A855F7]/80">
        🔒 Varnostna kopija
      </h2>
      <p className="mt-2 text-sm text-[#F5F5F7]/70">
        Vsi podatki so shranjeni le na tej napravi. Redno izvozi kopijo, da je
        ob izgubi telefona ne izgubiš.
      </p>

      {/* Skrit izbirnik datoteke za uvoz */}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={handleFile}
        className="hidden"
      />

      {!pending ? (
        <div className="mt-4 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={handleExport}
            className="w-full rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98]"
          >
            Izvozi podatke
          </button>
          <button
            type="button"
            onClick={pickFile}
            className="w-full rounded-2xl border border-[#9333EA]/40 bg-[#9333EA]/10 py-3 text-sm font-bold text-[#A855F7] transition active:scale-[0.98]"
          >
            Uvozi podatke
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="mt-0.5 text-center text-xs font-medium text-[#F5F5F7]/45 underline underline-offset-2 transition hover:text-[#A855F7]"
          >
            ali kopiraj v odložišče
          </button>
        </div>
      ) : (
        /* Potrditev uvoza (pred prepisom) */
        <div className="mt-4 flex flex-col gap-3 rounded-2xl border border-[#F5A623]/40 bg-[#F5A623]/10 p-4">
          <p className="text-sm font-bold text-[#FFB800]">
            ⚠️ Prepis podatkov
          </p>
          <dl className="flex flex-col gap-1.5 text-sm">
            <Row k="Datum kopije" v={fmtDate(pending.summary.exportedAt)} />
            <Row k="Sklopov podatkov" v={String(pending.summary.keyCount)} />
            <Row k="Dnevni vnosi" v={String(pending.summary.dnevniVnosi)} />
            <Row k="Meritve" v={String(pending.summary.meritve)} />
            <Row k="Profil" v={pending.summary.imaProfil ? "da" : "ne"} />
            <Row
              k="Makro cilj"
              v={pending.summary.imaMakroCilj ? "da" : "ne"}
            />
          </dl>
          <p className="text-xs text-[#F5F5F7]/60">
            Trenutni podatki teh sklopov bodo prepisani.
          </p>
          <div className="mt-1 flex gap-2">
            <button
              type="button"
              onClick={confirmImport}
              disabled={busy}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#9333EA] to-[#A855F7] py-3 text-sm font-bold text-white shadow-lg shadow-[#9333EA]/30 transition active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Uvažam…" : "Potrdi in prepiši"}
            </button>
            <button
              type="button"
              onClick={cancelImport}
              disabled={busy}
              className="rounded-2xl border border-[#9333EA]/30 px-4 py-3 text-sm font-semibold text-[#F5F5F7]/70 transition active:scale-[0.98] disabled:opacity-60"
            >
              Prekliči
            </button>
          </div>
        </div>
      )}

      {status && (
        <p
          className={`mt-3 text-center text-sm font-semibold ${
            status.kind === "err" ? "text-[#F87171]" : "text-[#FFB800]"
          }`}
        >
          {status.text}
        </p>
      )}
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-[#F5F5F7]/70">{k}</dt>
      <dd className="font-semibold text-[#F5F5F7]">{v}</dd>
    </div>
  );
}
