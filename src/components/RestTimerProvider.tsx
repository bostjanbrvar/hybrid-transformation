// src/components/RestTimerProvider.tsx
// =============================================================
// HYBRID TRANSFORMATION — počitek timer (web verzija)
// React Context + sticky pas na dnu zaslona. Sproži se ob shranjeni
// novi seriji (ExerciseEditor kliče start()). Mobile-first.
// SSR-safe: window / navigator / AudioContext samo v handlerjih/effectih.
// =============================================================

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";

export const DEFAULT_REST_SECONDS = 60;

type RestTimerContextValue = {
  secondsLeft: number | null; // null = neaktiven (pas skrit)
  totalSeconds: number;
  isRunning: boolean;
  justFinished: boolean;
  start: (seconds?: number) => void;
  addTime: (delta: number) => void;
  skip: () => void;
  stop: () => void;
  reset: () => void;
};

const RestTimerContext = createContext<RestTimerContextValue | null>(null);

export function useRestTimer() {
  const ctx = useContext(RestTimerContext);
  if (!ctx) {
    throw new Error("useRestTimer mora biti znotraj <RestTimerProvider>");
  }
  return ctx;
}

export function RestTimerProvider({ children }: { children: React.ReactNode }) {
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [totalSeconds, setTotalSeconds] = useState(DEFAULT_REST_SECONDS);
  const [isRunning, setIsRunning] = useState(false);
  const [justFinished, setJustFinished] = useState(false);

  // Web Audio (brez asset datoteke) + auto-hide časovnik.
  const audioCtxRef = useRef<AudioContext | null>(null);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Ustvari/resume AudioContext — kliče se med uporabnikovim tapom (start),
  // zato je gesture-unlock zanesljiv tudi na mobilnih brskalnikih.
  const ensureAudio = useCallback(() => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const Ctx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctx) return null;
        audioCtxRef.current = new Ctx();
      }
      if (audioCtxRef.current.state === "suspended") {
        void audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }, []);

  // Kratek dvojni beep prek oscilatorja (brez zvočne datoteke).
  const beep = useCallback(() => {
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    try {
      if (ctx.state === "suspended") void ctx.resume();
      const playTone = (startAt: number, freq: number, dur: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, startAt);
        gain.gain.exponentialRampToValueAtTime(0.3, startAt + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, startAt + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(startAt);
        osc.stop(startAt + dur);
      };
      const now = ctx.currentTime;
      playTone(now, 880, 0.15);
      playTone(now + 0.2, 1175, 0.2);
    } catch {
      // tiho ignoriraj — beep ni kritičen
    }
  }, []);

  const start = useCallback(
    (seconds: number = DEFAULT_REST_SECONDS) => {
      ensureAudio(); // gesture unlock med tapom
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
        hideTimeoutRef.current = null;
      }
      setTotalSeconds(seconds);
      setSecondsLeft(seconds);
      setIsRunning(true);
      setJustFinished(false);
    },
    [ensureAudio],
  );

  const addTime = useCallback((delta: number) => {
    setSecondsLeft((prev) => (prev === null ? prev : Math.max(0, prev + delta)));
  }, []);

  const skip = useCallback(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
    setSecondsLeft(null);
    setIsRunning(false);
    setJustFinished(false);
  }, []);

  const reset = useCallback(() => {
    setSecondsLeft(totalSeconds);
    setIsRunning(true);
    setJustFinished(false);
  }, [totalSeconds]);

  // Odštevanje: tik na sekundo, dokler teče in je > 0.
  useEffect(() => {
    if (!isRunning) return;
    const id = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev === null) return prev;
        return prev <= 1 ? 0 : prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [isRunning]);

  // Konec počitka: beep + vibracija + auto-hide po ~2.5 s.
  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return;
    setIsRunning(false);
    setJustFinished(true);
    beep();
    if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
      navigator.vibrate([200, 100, 200]);
    }
    hideTimeoutRef.current = setTimeout(() => {
      setSecondsLeft(null);
      setJustFinished(false);
      hideTimeoutRef.current = null;
    }, 2500);
  }, [secondsLeft, isRunning, beep]);

  // Počisti viseči auto-hide časovnik ob unmountu.
  useEffect(() => {
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
    };
  }, []);

  return (
    <RestTimerContext.Provider
      value={{
        secondsLeft,
        totalSeconds,
        isRunning,
        justFinished,
        start,
        addTime,
        skip,
        stop: skip,
        reset,
      }}
    >
      {children}
      <RestTimerBar />
    </RestTimerContext.Provider>
  );
}

/* ---------- Sticky pas na dnu ---------- */

function RestTimerBar() {
  const { secondsLeft, totalSeconds, justFinished, addTime, skip } =
    useRestTimer();

  if (secondsLeft === null) return null;

  const pct =
    totalSeconds > 0
      ? Math.min(100, Math.max(0, (secondsLeft / totalSeconds) * 100))
      : 0;
  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;
  const label = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const stepBtn =
    "h-11 min-w-14 rounded-xl bg-[#9333EA]/15 px-3 text-sm font-bold text-[#A855F7] active:scale-95";

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-[#9333EA]/30 bg-[#14101F]/95 shadow-lg shadow-black/50 backdrop-blur"
      style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.5rem)" }}
    >
      {/* Progress bar */}
      <div className="h-1 w-full bg-black/40">
        <div
          className="h-full bg-gradient-to-r from-[#9333EA] to-[#A855F7] transition-all duration-1000 ease-linear"
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mx-auto flex w-full max-w-[480px] items-center justify-between gap-3 px-4 pt-2.5">
        {justFinished ? (
          <p className="flex-1 text-center text-lg font-black text-[#A855F7]">
            Počitek končan ✓
          </p>
        ) : (
          <>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#A855F7]/70">
                Počitek
              </span>
              <span className="text-3xl font-black tabular-nums leading-none text-white">
                {label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => addTime(-15)}
                className={stepBtn}
              >
                −15s
              </button>
              <button
                type="button"
                onClick={() => addTime(15)}
                className={stepBtn}
              >
                +15s
              </button>
              <button
                type="button"
                onClick={skip}
                className="h-11 rounded-xl bg-[#9333EA] px-4 text-sm font-bold text-white active:scale-95"
              >
                Preskoči
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
