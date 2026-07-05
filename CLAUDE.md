@AGENTS.md

# HYBRID Transformation

Slovenska hibridna trening/prehrana aplikacija: Next.js (App Router) + React + Tailwind + Recharts.
Osebni protokol (trening, prehrana, opomniki, beleženje napredka) za mobilno uporabo prek
Capacitor Android ovoja.

## Struktura

### `src/app` — routes (App Router)
- `page.tsx` — dashboard "Danes": današnji trening, naslednji obrok, voda, navade, coach namig, stikalo opomnikov. Vstopna točka + navigacija.
- `layout.tsx` — root layout (pisave, metadata), ovije v `RestTimerProvider`.
- `manifest.ts` — PWA web manifest.
- `danes/page.tsx` — vnos današnjega treninga (serije, progression namigi).
- `prehrana/page.tsx` — vodič prehrane (razširljive kartice obrokov, dodatki, pravila). Read-only.
- `coach/page.tsx` — rule-based coach (prioritizirana sporočila).
- `napredek/page.tsx` — napredek po vaji (grafi max teže/volumna, časovnica sej).
- `meritve/page.tsx` — vnos meritev (teža + obsegi).
- `analitika-meritve/page.tsx` — trend grafi meritev (Recharts).
- `profil/page.tsx` — urejanje profila.
- `kalkulator/page.tsx` — kalkulator kalorij/makrov (Mifflin-St Jeor), shrani makro cilj.

### `src/lib` — moduli (podatki + logika, brez UI)
- `protocol.ts` — zaklenjen protokol: pravila, dodatki, tedenski trening, rutina, navade + helperji. `MEALS` je **izpeljan pogled** iz `nutrition.ts` (čas/oznaka/ime/sestavine za Danes + opomnike).
- `nutrition.ts` — **enotni vir vsebine obrokov** (polna vsebina za `/prehrana` + `items`/`protocolId` za protocol.ts).
- `storage.ts` — dnevni log: SSR-safe localStorage CRUD (navade/obroki/voda/serije), legacy migracija, zgodovina/metrike po vaji.
- `profile.ts` — profil + fitnes matematika (BMR/TDEE).
- `makro.ts` — makro engine (kalorije + makri); `getMakroCilj` bere shranjeni cilj za coacha.
- `meritve.ts` — shramba meritev (CRUD po datumu + drseče povprečje).
- `progression.ts` — čisti progression engine (predlog dviga teže; brez shrambe).
- `coach.ts` — rule-based logika coacha.
- `reminders.ts` — web Notification-API sloj (urnik, dedup, poll 60 s). Fira samo ko je tab odprt.
- `reminderScheduler.ts` — poenoten vstop: native Capacitor local-notifications, sicer web fallback.

### `src/components`
- `ExerciseEditor.tsx` — urejevalnik serij (teža × ponovitve), deljen med `/` in `/danes`. Korak dviga teže je per-vaja iz `protocol.ts` (`progressionStep`).
- `RestTimerProvider.tsx` — kontekst za počitek timer med serijami.

## Pravila

- **Samo localStorage, brez backenda.** Vsi podatki (log, profil, meritve, makro cilj, dedup opomnikov) živijo v `localStorage`. Ni API-ja, baze ali strežniške seje. Vse funkcije v `src/lib` morajo biti SSR-safe (na strežniku brez `window` vrni fallback, pisanje = no-op).
- **`nutrition.ts` je enotni vir obrokov.** `protocol.ts` `MEALS` se izpelje iz njega. Vsebine obrokov ne podvajaj.
- **Capacitor `server.url` naloži živo Vercel stran.** Android WebView ne pakira statične kode — naloži `https://hybrid-transformation.vercel.app`.
  - **UI/logika popravki:** `git push` → Vercel deploy → naprava dobi spremembo ob naslednjem odprtju. **Brez rebuilda APK-ja.**
  - **Rebuild APK-ja samo za native spremembe:** `capacitor.config.ts`, Android manifest/gradle, Capacitor plugini, ikone, app ID.
- **Commiti: brez `Co-Authored-By` vrstice.**

## Inventura (checklist ob pregledu stanja)

Popoln pregled projekta mora pokriti:
- [ ] `src/app` — vse routes (`page.tsx`, `layout.tsx`, `manifest.ts`, podstrani)
- [ ] `src/lib` — vsi moduli (podatki + logika)
- [ ] `src/components` — deljene komponente
- [ ] `capacitor.config.ts` — appId, appName, `webDir`, `server.url`, plugini
- [ ] Android manifest (`android/app/src/main/AndroidManifest.xml` + merged/packaged) — permissioni, receiverji

## Preverjanje pred commitom

```
npx tsc --noEmit
npm run build
```
