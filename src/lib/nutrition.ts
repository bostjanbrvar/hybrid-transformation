export interface Ingredient {
  name: string;
  notes: string[];
}

export interface InfoBlock {
  title: string;
  points: string[];
}

export interface Meal {
  id: string;
  protocolId: string;  // stabilni id za localStorage (mealsDone), ROUTINE ref in opomnike (npr. "m-0340")
  time: string;        // "HH:MM" — bere ga Capacitor scheduler (KORAK 5)
  title: string;
  tagline: string;
  intro: string;
  formula: string;     // prikazano v zaprti kartici
  items: string[];     // kratek seznam sestavin za Danes zaslon + opomnike (protocol.ts MEALS)
  optional: string[];
  quickBenefits: string[];
  ingredients: Ingredient[];
  whyTop: InfoBlock;
  tips: InfoBlock;
  timing: string[];
  opinion: string;
  critical?: boolean;  // true => zlati akcent
  // Ocenjeni makri obroka (za "zaužito" števec). Ocena iz `items`, sredina
  // navedenih količin; kjer so proteinske alternative, reprezentativno povprečje.
  estKcal: number;
  estBeljakovine: number; // g
  estOH: number;          // g
  estMascobe: number;     // g
}

export interface Supplement {
  time: string;        // "HH:MM" ali opisni čas
  name: string;
  note?: string;
}

export const meals: Meal[] = [
  {
    id: "hitri-start",
    protocolId: "m-0340",
    time: "03:40",
    title: "HITRI START",
    tagline: "Pre-workout aktivacija",
    intro: "Minimalističen, hiter in učinkovit jutranji pre-workout obrok.",
    formula:
      "Banana 120 g + whey 30 g + voda 4–5 dl + ščepec soli + kreatin 5 g · ☕ Barcaffè kava 5–10 g + 1,5–2 dl vode",
    items: [
      "Banana 120 g",
      "Whey protein 30 g",
      "Voda 4–5 dl",
      "Ščepec soli",
      "Kreatin 5 g",
    ],
    // est: banana 120 g (~107 kcal, 27 OH) + whey 30 g (~120 kcal, 24 P); voda/sol/kreatin ~0.
    estKcal: 230,
    estBeljakovine: 25,
    estOH: 30,
    estMascobe: 2,
    optional: [],
    quickBenefits: ["⚡ takojšnja energija", "💪 več moči na treningu", "🧠 fokus kot laser"],
    ingredients: [
      {
        name: "Banana (120 g)",
        notes: [
          "Hiter vir ogljikovih hidratov.",
          "Dvigne energijo v 10–15 minutah.",
          "Napolni glikogen za moč.",
        ],
      },
      {
        name: "Whey protein (30 g)",
        notes: [
          "Takoj dostopne aminokisline.",
          "Zaščiti mišice pred razgradnjo.",
          "Pripravi telo na rast.",
        ],
      },
      {
        name: "Voda + ščepec soli",
        notes: [
          "Hidracija + elektroliti.",
          "Boljši 'pump' in kontrakcija mišic.",
          "Prepreči padec energije med treningom.",
        ],
      },
      {
        name: "Kreatin (5 g)",
        notes: [
          "Poveča moč in eksplozivnost.",
          "Deluje dolgoročno, timing pa je še vedno dober.",
          "Podpira regeneracijo.",
        ],
      },
      {
        name: "Barcaffè kava",
        notes: [
          "Kofein = fokus + energija.",
          "Poveča zmogljivost.",
          "'Laser' koncentracija.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta kombinacija TOP",
      points: [
        "⚡ Hitra energija (banana + kofein)",
        "💪 Zaščita mišic (whey)",
        "🧠 Mentalni fokus (kava)",
        "🔋 Fizična moč (kreatin + sol)",
        "👉 Praktično popoln minimalističen pre-workout.",
      ],
    },
    tips: {
      title: "Kako ga narediti še bolj brutalnega",
      points: [
        "➕ 5–10 g medu – še hitrejši boost kot banana.",
        "➕ cimet (ščepec) – stabilizira sladkor v krvi.",
        "➕ par kapljic limone – boljša svežina in absorpcija.",
      ],
    },
    timing: [
      "Spij 20–30 min pred treningom.",
      "Če treniraš takoj, zmanjšaj količino vode, da ni težko v želodcu.",
    ],
    opinion:
      "To ni samo 'ok' — to je 90 % boljše kot večina ljudi dela zjutraj. V kombinaciji z dobrim zajtrkom po treningu in konsistentnim treningom napreduješ zelo hitro.",
  },
  {
    id: "po-treningu",
    protocolId: "m-0445",
    time: "04:45",
    title: "PO TRENINGU",
    tagline: "Takojšnja regeneracija",
    intro: "Prvi korak po treningu za obnovo, zaščito mišic in hitro vračanje energije.",
    formula: "Whey 30 g + banana 120 g + voda 3–4 dl + med 10–15 g + ščepec soli",
    items: [
      "Whey 30 g",
      "Banana 120 g",
      "Voda 3–4 dl",
      "Med 10–15 g",
      "Ščepec soli",
    ],
    // est: whey 30 g (~120 kcal, 24 P) + banana 120 g (~107) + med ~12 g (~38); voda/sol ~0. Riž. vaflji so opcijski (ne šteti).
    estKcal: 270,
    estBeljakovine: 25,
    estOH: 40,
    estMascobe: 2,
    optional: ["3–5 navadnih riževih vafljev (30–40 g)"],
    quickBenefits: ["🚀 začetek regeneracije", "💪 zaščita in rast mišic", "🔋 hitro polnjenje energije"],
    ingredients: [
      {
        name: "Whey protein (30 g)",
        notes: [
          "Telo po treningu hitro potrebuje aminokisline.",
          "Pomaga ustaviti mišično razgradnjo.",
          "Podpre obnovo in rast mišic.",
        ],
      },
      {
        name: "Banana (120 g)",
        notes: [
          "Hiter vir ogljikovih hidratov po treningu.",
          "Pomaga obnoviti porabljeno energijo.",
          "Telesu da prvi 'refuel' po naporu.",
        ],
      },
      {
        name: "Med (10–15 g)",
        notes: [
          "Doda zelo hitro dostopen sladkor.",
          "Pospeši vračanje energije po treningu.",
          "Skupaj z banano ustvari hiter regeneracijski boost.",
        ],
      },
      {
        name: "Voda + ščepec soli",
        notes: [
          "Nadomesti del tekočine in mineralov po treningu.",
          "Pomaga pri hidraciji in boljšem počutju.",
          "Podpre hitrejše okrevanje telesa.",
        ],
      },
      {
        name: "Riževi vaflji (opcijsko)",
        notes: [
          "Dodaten hiter vir ogljikovih hidratov.",
          "Primerni, če je bil trening intenziven ali daljši.",
          "Pomagajo še hitreje napolniti energijske zaloge.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta kombinacija TOP po treningu",
      points: [
        "🚀 Takojšen začetek regeneracije",
        "💪 Mišice dobijo beljakovine točno ob pravem času",
        "🔋 Ogljikovi hidrati hitro vrnejo energijo",
        "💧 Hidracija pomaga telesu nazaj v ravnotežje",
      ],
    },
    tips: {
      title: "Kdaj dodati riževe vaflje",
      points: [
        "Če treniraš zelo intenzivno.",
        "Če imaš cilj mišična masa.",
        "Če je do naslednjega pravega obroka še več časa.",
      ],
    },
    timing: [
      "Najbolje v roku 15–30 minut po treningu.",
      "To ni glavni zajtrk, ampak hitra regeneracijska faza.",
      "Pravi zajtrk naj sledi kmalu za tem.",
    ],
    opinion:
      "Pameten post-workout obrok — združi hitre beljakovine, hitre OH in hidracijo. Z rednim vnosom po jutranjem treningu je regeneracija hitrejša, treningi pa kakovostnejši.",
  },
  {
    id: "malica-1",
    protocolId: "m-0730",
    time: "07:30",
    title: "MALICA 1",
    tagline: "Stabilna energija",
    intro: "Popoln prehod iz hitre regeneracije v stabilno energijo za delo in fokus.",
    formula:
      "Skuta 200–250 g + ovseni kosmiči 60 g + sadje 100–150 g + med 10 g + kokosovo mleko 30–50 ml + voda 1–2 dl",
    items: [
      "Skuta 200–250 g",
      "Ovseni kosmiči 60 g",
      "Sadje 100–150 g",
      "Med 10 g",
      "Kokosovo mleko 30–50 ml",
      "Voda 1–2 dl",
    ],
    // est: skuta ~225 g (~225 kcal, 29 P, 9 M) + ovseni 60 g (~222, 36 OH) + sadje ~125 g (~69) + med 10 g (~30) + kokos. mleko ~40 ml (~80, 8 M).
    estKcal: 625,
    estBeljakovine: 39,
    estOH: 69,
    estMascobe: 21,
    optional: ["cimet ali ščepec soli"],
    quickBenefits: ["🔋 stabilna energija", "🧠 fokus brez padca", "💪 dovolj proteinov"],
    ingredients: [
      {
        name: "Skuta (200–250 g)",
        notes: [
          "Odličen vir počasnih beljakovin (casein).",
          "Podaljša občutek sitosti.",
          "Podpira stabilno rast mišic čez dan.",
        ],
      },
      {
        name: "Ovseni kosmiči (60 g)",
        notes: [
          "Kompleksni OH za dolgotrajno energijo.",
          "Preprečijo hiter padec sladkorja v krvi.",
          "Idealni za stabilen fokus.",
        ],
      },
      {
        name: "Sadje (100–150 g)",
        notes: [
          "Doda naravne sladkorje in vitamine.",
          "Izboljša okus in prebavljivost obroka.",
          "Podpre energijo brez crasha.",
        ],
      },
      {
        name: "Med (10 g)",
        notes: [
          "Majhen hiter energijski boost.",
          "Uravnoteži kombinacijo počasnih OH.",
          "Izboljša okus brez pretiravanja.",
        ],
      },
      {
        name: "Kokosovo mleko (30–50 ml)",
        notes: [
          "Zdrave maščobe za dodatno energijo.",
          "Podaljša občutek sitosti.",
          "Izboljša teksturo in okus.",
        ],
      },
      {
        name: "Cimet / sol (opcijsko)",
        notes: [
          "Cimet pomaga stabilizirati sladkor v krvi.",
          "Sol izboljša hidracijo in okus.",
          "Majhna izboljšava, velik efekt.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta kombinacija TOP",
      points: [
        "🔋 Stabilna energija brez nihanja",
        "🧠 Fokus ostane visok več ur",
        "💪 Dovolj beljakovin za mišice",
        "⚖️ Ravnovesje med OH, beljakovinami in maščobami",
      ],
    },
    tips: {
      title: "Kdaj je ta obrok ključen",
      points: [
        "Po jutranjem treningu (nadaljevanje regeneracije).",
        "Pred delom ali mentalnim naporom.",
        "Ko želiš energijo brez padca.",
      ],
    },
    timing: [
      "Približno 2–3 ure po post-workout shake-u.",
      "Idealno kot prvi 'pravi' obrok dneva.",
    ],
    opinion:
      "Eden najboljših obrokov za stabilno energijo in fokus. Z rednim vnosom imaš več energije čez dan in manj potrebe po sladkarijah.",
  },
  {
    id: "malica-2",
    protocolId: "m-1030",
    time: "10:30",
    title: "MALICA 2",
    tagline: "Anti-catabolic",
    intro: "Pametna malica za zaščito mišic, stabilno energijo in fokus brez padca.",
    formula: "Sadje 150 g + oreščki 30 g",
    items: ["Sadje 150 g", "Oreščki 30 g"],
    // est: sadje 150 g (~83 kcal, 20 OH) + oreščki 30 g (~186 kcal, 16 M, 6 P). Whey je opcijski (ne šteti).
    estKcal: 270,
    estBeljakovine: 7,
    estOH: 25,
    estMascobe: 16,
    optional: ["whey protein 30 g (z 200–300 ml vode) — po potrebi"],
    quickBenefits: ["🛡️ zaščita mišic", "⚖️ stabilna energija", "🧠 fokus brez crash-a"],
    ingredients: [
      {
        name: "Sadje (150 g)",
        notes: [
          "Da telesu hiter, a naraven vir energije.",
          "Pomaga ohraniti zbranost med delom.",
          "Prispeva vitamine, minerale in svežino.",
        ],
      },
      {
        name: "Oreščki (30 g)",
        notes: [
          "Dodajo zdrave maščobe in podaljšajo energijo.",
          "Upočasnijo dvig in padec sladkorja.",
          "Pomagajo pri sitosti med obroki.",
        ],
      },
      {
        name: "Whey protein (30 g) – po potrebi",
        notes: [
          "Uporabi, ko bo naslednji pravi obrok pozneje.",
          "Doda hiter vir aminokislin za zaščito mišic.",
          "Odličen, če tisti dan težje dosežeš dovolj beljakovin.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta kombinacija TOP",
      points: [
        "🛡️ Zmanjša mišični razpad med dolgimi odmiki",
        "⚖️ Bolj stabilna energija kot samo sadje",
        "🧠 Ohranja fokus brez teže v želodcu",
        "💪 Po potrebi hitro dvigne vnos beljakovin",
      ],
    },
    tips: {
      title: "Kdaj dodati whey",
      points: [
        "Če je do kosila še več ur.",
        "Če si tisti dan bolj aktiven.",
        "Če gradiš mišično maso in želiš boljši proteinski vnos.",
      ],
    },
    timing: [
      "Idealno sredi dopoldneva kot most med zajtrkom in kosilom.",
      "Naj bo lahek, a funkcionalen.",
    ],
    opinion:
      "Zelo pametna malica — ni 'junk', ampak ti da točno to, kar potrebuješ: energijo, sitost in zaščito mišic. Z whey-em ob pravih dnevih še bolj učinkovita za maso.",
  },
  {
    id: "glavni-obrok",
    protocolId: "m-1330",
    time: "13:30",
    title: "GLAVNI OBROK",
    tagline: "Anabolni fuel",
    intro: "Glavni obrok dneva za maksimalno energijo, regeneracijo in rast mišic.",
    formula:
      "Protein: piščanec/puran 180–200 g · tuna 150–180 g · pusto mleto goveje 150–180 g · losos 150–180 g · jajca 4–5 | OH: riž 80–100 g (surovo) ali krompir 200–300 g ali testenine/ajda/kruh 80–100 g | Zelenjava: bučke 100–150 g + korenje 50–100 g + gobe 50–100 g | Solata + paradižnik 150–250 g | Olivno olje 10–15 g",
    items: [
      "Protein: piščanec/puran 180–200 g · tuna/losos/goveje 150–180 g · ali 4–5 jajc",
      "OH: riž 80–100 g (surovo) · krompir 200–300 g · testenine/ajda/kruh 80–100 g",
      "Zelenjava: bučke 100–150 g + korenje 50–100 g + gobe 50–100 g",
      "Solata + paradižnik 150–250 g",
      "Olivno olje 10–15 g",
    ],
    // est: povprečje proteinskih možnosti (piščanec/tuna/losos/goveje/jajca) ~277 kcal, 38 P, 13 M + OH vir ~90 g surovo / ~250 g krompir ~277 kcal, 60 OH + zelenjava+solata ~100 kcal + olje ~12 g (~110, 13 M).
    estKcal: 765,
    estBeljakovine: 51,
    estOH: 79,
    estMascobe: 28,
    optional: [],
    quickBenefits: ["🔥 glavni vir energije", "🧬 rast mišic", "🥗 odlična prebava"],
    ingredients: [
      {
        name: "Protein (meso / ribe / jajca)",
        notes: [
          "Glavni gradnik mišic.",
          "Podpira regeneracijo po treningu.",
          "Pomaga pri dolgoročni rasti mišične mase.",
        ],
      },
      {
        name: "Ogljikovi hidrati (riž / krompir / testenine…)",
        notes: [
          "Največji vir energije v dnevu.",
          "Napolnijo glikogen za telo in možgane.",
          "Podpirajo moč, fokus in produktivnost.",
        ],
      },
      {
        name: "Zelenjava",
        notes: [
          "Vitamini, minerali in vlaknine.",
          "Podpira prebavo in zdravje črevesja.",
          "Izboljša absorpcijo hranil.",
        ],
      },
      {
        name: "Solata + paradižnik",
        notes: [
          "Dodatna vlaknina za stabilno prebavo.",
          "Pomaga pri sitosti.",
          "Osveži celoten obrok.",
        ],
      },
      {
        name: "Olivno olje",
        notes: [
          "Zdrave maščobe za hormone.",
          "Podaljša energijo.",
          "Izboljša okus in absorpcijo vitaminov.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta obrok ključen",
      points: [
        "🔥 Največ energije v dnevu",
        "🧬 Glavni anabolni signal za mišice",
        "⚡ Podpora za preostanek dneva",
        "🥗 Stabilna prebava in počutje",
      ],
    },
    tips: {
      title: "Kako ga optimizirati",
      points: [
        "Protein glede na cilj (lean = piščanec, masa = govedina/losos).",
        "OH glede na aktivnost (več treninga = več OH).",
        "Ne izpuščaj zelenjave – ključ za dolgoročno zdravje.",
      ],
    },
    timing: [
      "Največji obrok dneva.",
      "Idealno sredi dneva, ko telo potrebuje največ energije.",
      "Po njem moraš čutiti energijo, ne zaspanosti.",
    ],
    opinion:
      "Če ta obrok zadaneš pravilno, si naredil 50 % uspeha dneva. To je obrok, ki loči povprečen napredek od vrhunskega rezultata.",
  },
  {
    id: "recovery",
    protocolId: "m-1515",
    time: "15:15",
    title: "RECOVERY",
    tagline: "Po službi (kritično)",
    intro: "Ključni obrok za prehod iz dela nazaj v energijo, regeneracijo in stabilen večer.",
    formula: "Jajca 3–4 + riž 60 g ali kruh 80 g",
    items: ["Jajca 3–4", "Riž 60 g ali kruh 80 g"],
    // est: jajca ~3,5 (~273 kcal, 22 P, 19 M) + OH vir riž 60 g / kruh 80 g povpr. (~214 kcal, 43 OH). Sadje/zelenjava opcijsko (ne šteto).
    estKcal: 485,
    estBeljakovine: 28,
    estOH: 45,
    estMascobe: 21,
    optional: ["1 kos sadja (banana ali jabolko)", "malo zelenjave"],
    quickBenefits: ["⚠️ prepreči energy crash", "🔄 regeneracija", "💪 mišična podpora"],
    ingredients: [
      {
        name: "Jajca (3–4)",
        notes: [
          "Kakovosten vir beljakovin in zdravih maščob.",
          "Podpre regeneracijo po dnevu.",
          "Pomaga stabilizirati energijo.",
        ],
      },
      {
        name: "Riž / kruh",
        notes: [
          "Vrne energijo po fizični in mentalni utrujenosti.",
          "Prepreči padec sladkorja v krvi.",
          "Pripravi telo na večer.",
        ],
      },
      {
        name: "Sadje (banana ali jabolko)",
        notes: [
          "Doda hiter energijski boost.",
          "Pomaga proti utrujenosti po službi.",
          "Izboljša počutje in fokus.",
        ],
      },
      {
        name: "Zelenjava",
        notes: [
          "Podpira prebavo in ravnovesje.",
          "Doda vlaknine in mikrohranila.",
          "Pomaga, da obrok ni 'težak'.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta obrok KRITIČEN",
      points: [
        "⚠️ Prepreči popoldanski energy crash",
        "🔄 Telo preklopi nazaj v regeneracijo",
        "💪 Ohranja mišično maso",
        "🧠 Stabilizira fokus za preostanek dneva",
      ],
    },
    tips: {
      title: "Največja napaka",
      points: [
        "Preskakovanje tega obroka.",
        "Vodi v prenajedanje zvečer.",
        "In padec energije + motivacije.",
      ],
    },
    timing: [
      "Takoj po službi ali ko prideš domov.",
      "Ne odlašaj – to je kritična točka dneva.",
    ],
    opinion:
      "Če zadaneš ta obrok, je tvoj večer 100 % bolj kontroliran. Če ga zgrešiš, gre večina ljudi v slab izbor hrane in izgubi disciplino.",
    critical: true,
  },
  {
    id: "vecerja",
    protocolId: "m-1830",
    time: "18:30",
    title: "VEČERJA",
    tagline: "Stabilizacija",
    intro: "Umirjen, uravnotežen obrok za stabilno energijo in pripravo na regeneracijo ponoči.",
    formula:
      "Protein: tuna/piščanec/puran 150 g ali 3 cela jajca + 1 beljak | OH: riž 60–70 g ali krompir 180–220 g ali kruh 60–70 g | Zelenjava 200 g (bučke + korenje + gobe) ali solata + paradižnik | Olivno olje 5–8 g",
    items: [
      "Protein: tuna/piščanec/puran 150 g · ali 3 cela jajca + 1 beljak",
      "OH: riž 60–70 g · krompir 180–220 g · kruh 60–70 g",
      "Zelenjava 200 g (bučke + korenje + gobe) ali solata + paradižnik",
      "Olivno olje 5–8 g",
    ],
    // est: protein povpr. (tuna/piščanec/puran 150 g / 3 jajca+beljak) ~189 kcal, 32 P + OH vir ~187 kcal, 39 OH + zelenjava 200 g (~50) + olje ~6,5 g (~57, 7 M).
    estKcal: 490,
    estBeljakovine: 40,
    estOH: 49,
    estMascobe: 16,
    optional: [],
    quickBenefits: ["⚡ stabilna energija do večera", "💪 dodatni protein za mišice", "😴 boljša priprava na noč"],
    ingredients: [
      {
        name: "Protein (tuna / piščanec / puran / jajca)",
        notes: [
          "Podpira regeneracijo po dnevu.",
          "Ohranja mišično maso čez noč.",
          "Ni pretežek za prebavo.",
        ],
      },
      {
        name: "Ogljikovi hidrati",
        notes: [
          "Dajo umirjeno, stabilno energijo.",
          "Pomagajo telesu, da se sprosti.",
          "Preprečijo večerni crash.",
        ],
      },
      {
        name: "Zelenjava",
        notes: [
          "Lahka za prebavo.",
          "Podpira črevesje in regeneracijo.",
          "Daje občutek sitosti brez teže.",
        ],
      },
      {
        name: "Olivno olje",
        notes: [
          "Zdrave maščobe za hormone.",
          "Podaljša energijo čez večer.",
          "Izboljša absorpcijo hranil.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta obrok pomemben",
      points: [
        "⚡ Stabilizira energijo po dnevu",
        "💪 Doda zadnji protein za mišice",
        "😴 Pripravi telo na regeneracijo ponoči",
        "🧠 Pomaga umiriti telo in fokus",
      ],
    },
    tips: {
      title: "Kako ga prilagoditi",
      points: [
        "Če hujšaš → manj OH.",
        "Če gradiš mišice → malo več OH.",
        "Če si utrujen → dodaj malo več zelenjave.",
      ],
    },
    timing: [
      "Približno 2–3 ure pred spanjem.",
      "Ne jej prepozno, da ne motiš spanja.",
    ],
    opinion:
      "Ta obrok določa, kako boš spal in kako se boš zbudil. Dobra večerja = boljši recovery + boljši naslednji dan.",
  },
  {
    id: "pred-spanjem",
    protocolId: "m-2100",
    time: "21:00",
    title: "PRED SPANJEM",
    tagline: "Nočna regeneracija",
    intro: "Zadnji obrok dneva za zaščito mišic in regeneracijo čez noč.",
    formula: "Skuta 200–250 g + voda 1–2 dl",
    items: ["Skuta 200–250 g", "Voda 1–2 dl"],
    // est: skuta ~225 g (~225 kcal, 29 P, 9 M). Opcijski dodatki (maslo/oreščki) niso šteti.
    estKcal: 225,
    estBeljakovine: 29,
    estOH: 8,
    estMascobe: 9,
    optional: ["arašidovo maslo 15 g ali oreščki 20 g", "cimet ali kakav (opcijsko)"],
    quickBenefits: ["🌙 slow protein", "🔄 regeneracija čez noč", "💪 zaščita mišic"],
    ingredients: [
      {
        name: "Skuta (200–250 g)",
        notes: [
          "Počasen vir beljakovin (casein).",
          "Hrani mišice več ur med spanjem.",
          "Zmanjša nočni razpad mišic.",
        ],
      },
      {
        name: "Arašidovo maslo / oreščki",
        notes: [
          "Zdrave maščobe upočasnijo prebavo.",
          "Podaljšajo sproščanje aminokislin.",
          "Pomagajo pri hormonskem ravnovesju.",
        ],
      },
      {
        name: "Cimet / kakav (opcijsko)",
        notes: [
          "Cimet pomaga stabilizirati sladkor v krvi.",
          "Kakav izboljša okus in razpoloženje.",
          "Majhen dodatek, velik efekt.",
        ],
      },
    ],
    whyTop: {
      title: "Zakaj je ta obrok ključen",
      points: [
        "🌙 Mišice dobijo hranila čez celo noč",
        "🔄 Pospeši regeneracijo med spanjem",
        "💪 Zmanjša mišični razpad",
        "😴 Pomaga pri boljšem spancu",
      ],
    },
    tips: {
      title: "Največja napaka",
      points: [
        "Spanje brez beljakovin.",
        "Telo ostane brez 'gradbenega materiala'.",
        "Regeneracija je slabša.",
      ],
    },
    timing: [
      "30–60 minut pred spanjem.",
      "Naj bo lahek, ne preobilen obrok.",
    ],
    opinion:
      "Z rednim vnosom je regeneracija opazno boljša. To je skrivnost, ki jo večina ljudi ignorira.",
  },
];

export const supplements: Supplement[] = [
  { time: "03:40", name: "Kreatin 5 g + ščepec soli", note: "elektroliti" },
  { time: "07:30", name: "Vitamin D3" },
  { time: "13:30", name: "Omega 3" },
  { time: "med treningom", name: "Elektroliti", note: "po potrebi" },
  { time: "21:00", name: "Magnezij" },
];

export const rules: string[] = [
  "Po treningu ješ takoj.",
  "04:45 obrok je obvezen.",
  "15:15 obroka ne preskoči.",
  "Protein pred spanjem je obvezen.",
  "Voda 3–4 L dnevno.",
  "Če si lačen, dodaj riž, krompir ali whey po potrebi.",
];

/* ---------- Ocenjeni dnevni vnos (zaužito) ---------- */

export interface DnevniMakri {
  kcal: number;
  beljakovine: number; // g
  oh: number;          // g
  mascobe: number;     // g
}

/** Obrok po protocolId (mealsDone hrani protocolId-je, npr. "m-0340"). */
const MEAL_BY_PROTOCOL_ID: Record<string, Meal> = Object.fromEntries(
  meals.map((m) => [m.protocolId, m]),
);

/**
 * Sešteje OCENJENE makre obrokov z danimi protocolId-ji (npr. log.mealsDone).
 * Neznani id-ji se tiho preskočijo. Čista funkcija — brez localStorage.
 */
export function sestejMakre(protocolIds: string[]): DnevniMakri {
  const out: DnevniMakri = { kcal: 0, beljakovine: 0, oh: 0, mascobe: 0 };
  for (const id of protocolIds) {
    const m = MEAL_BY_PROTOCOL_ID[id];
    if (!m) continue;
    out.kcal += m.estKcal;
    out.beljakovine += m.estBeljakovine;
    out.oh += m.estOH;
    out.mascobe += m.estMascobe;
  }
  return out;
}
