// src/lib/icons.ts
// =============================================================
// HYBRID TRANSFORMATION — emoji ikone kartic (samo prikaz)
//
// EN vir resnice za emoji ikone kartic na dashboardu. Vzorec je enak kot
// ATTR_ICON iz VZPON: preprosta mapa ključ→emoji. Uporaba na prikazu:
//   {CARD_ICON["trening"] ?? ""}
// Če ključa ni, se vrne undefined → fallback prazen string (brez ikone).
// =============================================================

/** Emoji ikona za posamezno kartico dashboarda. Ključ → unicode emoji. */
export const CARD_ICON: Record<string, string> = {
  trening: "🏋️", // weightlifter
  prehrana: "🍽️", // plate with cutlery
  meritve: "📏", // straight ruler
  coach: "🧠", // brain
  povzetek: "📊", // bar chart
  "tedenski pregled": "📅", // calendar
  razpored: "📋", // clipboard (notes/seznam)
  heatmap: "🔥", // fire
  opomniki: "⏰", // alarm clock
};
