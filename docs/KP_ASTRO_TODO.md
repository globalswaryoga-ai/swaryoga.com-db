# KP Astro TODO

## In Progress

- [ ] Add input completeness warnings before final/timeline generation.

## Page Design

- [x] Add small hide/unhide toolkit cards on the Astrologer Workspace page.
- [x] Add Fortuna Method reference card.
- [x] Add Fortuna 12 Houses reference card.
- [x] Add Malefic / Benefic reference card.
- [x] Add Prediction Template reference card.
- [x] Improve Astrologer Workspace layout with chart work area, sticky actions, and Bhav progress status.
- [x] Make the Bhav-wise Karyesh work area more complete with generated analysis rows, not only editable fields.

## Karyesh Logic

- [x] Store Karyesh template fields per Bhav.
- [x] Auto-fill CSL R/D, Star of CSL, Owner of Star, and Owner Signification when chart data is available.
- [x] Show Bhav sign, Bhav sub lord, sub lord R/D, sub lord star lord, and star lord R/D in one managed view.
- [x] Show planet in house, planet owned houses, star lord house/ownership, sub lord house/ownership.
- [x] Show conjunction and opposition in the Karyesh managed view.
- [x] Auto-compare favorable/supporting houses vs opposing/denial houses.
- [x] Generate a suggested Karyesh result that the astrologer can edit manually.
- [x] Add one-click "Apply Suggested Result" to copy generated Karyesh result/conclusion into editable fields.

## Prediction Flow

- [x] Use saved Karyesh template logic in Final Prediction.
- [x] Use saved Karyesh template logic in Horary Judgment.
- [x] Add Age Timeline report generation and display.
- [x] Add timeline PDF export support.
- [ ] Add input completeness warnings before final/timeline generation.
- [ ] Show AI provider used for each generated report.
- [ ] Add report history view with generated date, language, and report type.

## Data And Safety

- [x] Add `reportType` support for KP reports.
- [ ] Add tenant/user isolation before opening KP Astro beyond superadmin.
- [ ] Add export/import backup for KP chart data.
- [ ] Add chart search and filters by name, DOB, date, and report availability.

## Chart Style, Tables & Language (reference-software parity)

- [x] North/South chart style as a button toggle instead of a dropdown (workspace + horary-workspace).
- [x] Houses & Planets table: add a Planets-view mode (Sign, Position, Star, Sign/Star/Sub Lord, Nature, Occupies, Owns), toggled the same way as the Houses view.
- [x] New Planetary Aspects table (Conjunction/Semi-sextile/Semi-square/Sextile/Square/Trine/Sesquisquare/Quincunx/Opposition grid, degree-based with orbs).
- [x] New Planet Signification and Strength table (Star Lord/Sub Lord/Conjunction Lords/Opposition Lords/Self, each Dep+Own) with a Select House filter (significator finder for a chosen Bhav).
- [x] Wire Houses & Planets / Planetary Aspects / Signification & Strength into the horary workspace too (previously only in the main birth-chart workspace).
- [x] Hindi/English toggle for the interactive workspace UI (table headers, toggle labels, Nature values) — separate from the AI final-prediction report language, which already supported many more languages.
- [ ] Nature (Malefic/Benefic) rule note: per-planet table uses natural/fixed classification (Moon by waxing/waning, Mercury by conjunction); Bhav/Karyesh work area uses the existing functional per-ascendant rule (kendra+trikona+2nd = supportive) — confirm both against your reference tool if any label looks off, the exact "Conjunction/Opposition Lords" convention in the Signification & Strength table was reverse-engineered without full certainty.
- [ ] Consider translating planet/sign/star names themselves (currently left in standard English/Sanskrit form in both languages).
