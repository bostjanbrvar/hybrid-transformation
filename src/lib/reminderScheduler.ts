// src/lib/reminderScheduler.ts
// =============================================================
// HYBRID TRANSFORMATION — enotni razporejevalnik opomnikov
//
// EN skupni vstopni klic, ki izbere pravo pot glede na platformo:
//  - Capacitor native  → @capacitor/local-notifications (delujejo tudi
//    ko je app zaprta/v ozadju, nativno razporejeni na napravi)
//  - Web (Vercel/brskalnik) → obstoječi Notification API fallback
//    (startReminders/stopReminders iz reminders.ts)
//
// URNIK: buildTodaySchedule() iz reminders.ts je EDINI vir resnice.
// Ta modul ga samo prebere in razporedi — logike urnika NE podvaja.
// =============================================================

import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import {
  buildTodaySchedule,
  isSupported as isWebSupported,
  getPermission as getWebPermission,
  requestPermission as requestWebPermission,
  startReminders,
  stopReminders,
  isRunning,
  type Reminder,
} from "@/lib/reminders";

/* ---------- Platforma ---------- */

/** Ali tečemo v Capacitor native ovoju (Android/iOS). */
export function isNative(): boolean {
  return typeof window !== "undefined" && Capacitor.isNativePlatform();
}

/* ---------- Persistenca uporabnikove izbire ---------- */

// Zapomni si, da je uporabnik VKLOPIL opomnike, da jih lahko ob vsakem zagonu
// app znova razporedimo (native opomniki so nastavljeni le za naslednji nastop
// vsakega časa in po prvem dnevu odmrejo, če jih ne re-scheduliramo).
export const ENABLED_KEY = "bostjan_protocol_reminders_enabled_v1";

function readEnabledPref(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(ENABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeEnabledPref(enabled: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (enabled) window.localStorage.setItem(ENABLED_KEY, "1");
    else window.localStorage.removeItem(ENABLED_KEY);
  } catch {
    // tiho ignoriraj (poln prostor / zaseben način)
  }
}

/* ---------- Stabilni številčni ID-ji ---------- */

// @capacitor/local-notifications zahteva številčne (Java int) ID-je, ne
// stringov kot "meal-m-0340". Deterministično preslikamo string → stabilna
// pozitivna številka (djb2 hash), da re-scheduliranje istega opomnika vedno
// vrne isti ID — brez dvojnikov in z možnostjo preklica starih.
export function numericId(id: string): number {
  let h = 5381;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) + h + id.charCodeAt(i)) | 0;
  }
  // Pozitivno in znotraj varnega int razpona (< 2^31 - 1).
  return (h >>> 0) % 2_000_000_000;
}

/* ---------- Native pot (local-notifications) ---------- */

/** Pretvori "HH:MM" v naslednji nastop (danes; če je mimo, jutri ob isti uri). */
function nextAt(now: Date, hhmm: string): Date {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(now);
  d.setHours(h || 0, m || 0, 0, 0);
  if (d.getTime() <= now.getTime()) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Prekliče VSE čakajoče (pending) native notifikacije. */
async function cancelAllNative(): Promise<void> {
  const pending = await LocalNotifications.getPending();
  if (pending.notifications.length > 0) {
    await LocalNotifications.cancel({
      notifications: pending.notifications.map((n) => ({ id: n.id })),
    });
  }
}

/**
 * Native re-scheduliranje: NAJPREJ prekliče vse obstoječe pending, da se ne
 * kopičijo iz dneva v dan, nato razporedi današnji urnik.
 */
async function scheduleNative(now: Date): Promise<NotificationPermission> {
  const perm = await LocalNotifications.requestPermissions();
  if (perm.display !== "granted") return "denied";

  await cancelAllNative();

  const urnik: Reminder[] = buildTodaySchedule(now);
  await LocalNotifications.schedule({
    notifications: urnik.map((r) => ({
      id: numericId(r.id),
      title: r.title,
      body: r.body,
      schedule: { at: nextAt(now, r.time), allowWhileIdle: true },
    })),
  });

  return "granted";
}

/* ---------- Enotni API ---------- */

/** Ali so opomniki na tej platformi sploh podprti. */
export function isReminderSupported(): boolean {
  return isNative() ? true : isWebSupported();
}

/** Trenutno stanje dovoljenja (poenoteno: granted | denied | default). */
export async function getReminderPermission(): Promise<NotificationPermission> {
  if (isNative()) {
    const p = await LocalNotifications.checkPermissions();
    if (p.display === "granted") return "granted";
    if (p.display === "denied") return "denied";
    return "default"; // prompt / prompt-with-rationale
  }
  return getWebPermission();
}

/** Ali so opomniki trenutno aktivni (web: zanka teče; native: obstaja pending). */
export async function isRemindersActive(): Promise<boolean> {
  if (isNative()) {
    const pending = await LocalNotifications.getPending();
    return pending.notifications.length > 0;
  }
  return isRunning();
}

/**
 * EN skupni vstopni klic: zaprosi za dovoljenje in (re)razporedi opomnike.
 * Native → local-notifications (cancel + schedule). Web → Notification API.
 * Pokliči tudi ob vsakem odprtju app za dnevno re-scheduliranje (native).
 */
export async function enableReminders(
  now: Date = new Date(),
): Promise<NotificationPermission> {
  if (isNative()) {
    const perm = await scheduleNative(now);
    writeEnabledPref(perm === "granted");
    return perm;
  }
  const perm = await requestWebPermission();
  if (perm === "granted") {
    startReminders();
    writeEnabledPref(true);
  }
  return perm;
}

/** Izklop: native prekliče vse pending, web ustavi zanko. */
export async function disableReminders(): Promise<void> {
  writeEnabledPref(false);
  if (isNative()) {
    await cancelAllNative();
    return;
  }
  stopReminders();
}

/**
 * Ob zagonu aplikacije: če je uporabnik opomnike prej vklopil IN je dovoljenje
 * še vedno odobreno, jih znova razporedi za naslednji nastop vsakega časa.
 * Idempotentno — enableReminders najprej prekliče obstoječe (native) oz. je
 * startReminders varen za ponovni klic (web). Sicer no-op.
 * Vrne true, če so opomniki po klicu aktivni.
 */
export async function resumeReminders(
  now: Date = new Date(),
): Promise<boolean> {
  if (!isReminderSupported()) return false;
  if (!readEnabledPref()) return false;
  const perm = await getReminderPermission();
  if (perm !== "granted") return false;
  await enableReminders(now);
  return true;
}
