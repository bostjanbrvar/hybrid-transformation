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
import {
  LocalNotifications,
  type ActionPerformed,
} from "@capacitor/local-notifications";
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
import { getDayLog, todayKey, toggleMeal } from "@/lib/storage";

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

/* ---------- Akcijski gumbi na obrok-opomnikih ---------- */
//
// Obrok-opomnik dobi gumb "Pojedel ✓". Tap označi obrok kot pojeden v
// localStorage, brez odpiranja UI-ja (kolikor to platforma dopušča).
//
// KILLED-APP OBNAŠANJE (Android, @capacitor/local-notifications v8):
//   Na Androidu so akcijski gumbi VEDNO "foreground" — možnost `foreground`
//   obstaja le za iOS (glej definitions.d.ts). Zato tap na gumb NE izvede JS
//   v ozadju, ko je aplikacija ubita: Android namesto tega ZAŽENE aplikacijo
//   (hladni zagon), Capacitor pa dostavi dogodek `localNotificationActionPerformed`
//   šele, ko se JS naloži in registrira poslušalca. Dogodek se zadrži
//   (retainUntilConsumed), dokler ga poslušalec ne prevzame — zato ga hladni
//   zagon ujame, ČE je poslušalec registriran dovolj zgodaj.
//
//   Ker uporabljamo `server.url` (WebView naloži živo Vercel stran), se JS
//   kontekst ob tapu ustvari na novo, stran se naloži prek mreže, nato se
//   registrira poslušalec — in zadržani dogodek se sproži. Posledica: obrok se
//   NE označi "v ozadju pri mrtvi aplikaciji", ampak ob (samodejnem) zagonu, ki
//   ga sproži tap. To je pričakovana in edina zanesljiva pot na Androidu.
//
//   ZATO: initReminderActions() (registracija poslušalca) mora teči ZGODAJ ob
//   vsakem zagonu — kličemo ga na istem mestu kot resumeReminders (dashboard
//   mount), da hladni zagon iz opomnika ujame dostavo. Označevanje je
//   idempotentno (označi le, če še ni), da morebitna dvojna dostava ne škodi.
//
//   OPOZORILO: dejansko obnašanje je treba potrditi na napravi po rebuildu APK
//   (server.url + hladni zagon je odvisen od časovnice nalaganja strani).

/** ID akcijskega tipa; obrok-opomniki ga referencirajo prek actionTypeId. */
const MEAL_ACTIONS_ID = "MEAL_ACTIONS";
/** ID akcije znotraj tipa; primerja se z ActionPerformed.actionId. */
const MEAL_ACTION_POJEDEL = "pojedel";

let actionsInited = false;

/** Handler za tap na akcijski gumb (ali telo) obrok-opomnika. */
function onNotificationAction(event: ActionPerformed): void {
  if (event.actionId !== MEAL_ACTION_POJEDEL) return; // "tap" na telo ignoriramo
  const protocolId = event.notification?.extra?.protocolId;
  if (typeof protocolId !== "string" || !protocolId) return;

  // Označi za DANES; idempotentno — če je že pojeden, ne odznači (dvojna dostava).
  const dan = todayKey();
  const log = getDayLog(dan);
  if (!log.mealsDone.includes(protocolId)) {
    toggleMeal(dan, protocolId); // ponovna uporaba obstoječega helperja
  }
}

/**
 * Registrira akcijski tip + poslušalca dogodkov. IDEMPOTENTNO: teče le enkrat
 * na JS kontekst (actionsInited), zato večkratni klic (enable/resume/mount) ne
 * podvoji ne tipa ne poslušalca. No-op na webu. Kliči ZGODAJ ob zagonu.
 */
export async function initReminderActions(): Promise<void> {
  if (!isNative() || actionsInited) return;
  actionsInited = true; // pred await, da preprečimo vzporedno dvojno registracijo
  try {
    await LocalNotifications.registerActionTypes({
      types: [
        {
          id: MEAL_ACTIONS_ID,
          actions: [{ id: MEAL_ACTION_POJEDEL, title: "Pojedel ✓" }],
        },
      ],
    });
    await LocalNotifications.addListener(
      "localNotificationActionPerformed",
      onNotificationAction,
    );
  } catch {
    // Če registracija spodleti, ne blokiraj ostalega (opomniki še delujejo).
  }
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

  // Poskrbi, da je akcijski tip registriran PRED razporejanjem (idempotentno).
  await initReminderActions();
  await cancelAllNative();

  const urnik: Reminder[] = buildTodaySchedule(now);
  await LocalNotifications.schedule({
    notifications: urnik.map((r) => {
      const base = {
        id: numericId(r.id),
        title: r.title,
        body: r.body,
        schedule: { at: nextAt(now, r.time), allowWhileIdle: true },
      };
      // Samo obroki dobijo gumb "Pojedel" + protocolId v extra payloadu.
      // Dodatki/trening/voda ostanejo navadni opomniki.
      if (r.kind === "meal" && r.ref) {
        return {
          ...base,
          actionTypeId: MEAL_ACTIONS_ID,
          extra: { protocolId: r.ref },
        };
      }
      return base;
    }),
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
