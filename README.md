# SpraySimDK

Interaktiv spraytørringssimulator til undervisningsbrug på **Kold College** (Mejeri & Fødevareteknologi).

## Funktioner

- **Realtidssimulation** af spraytørring baseret på masse- og energibalance
- **Klæbrighedsanalyse** med GAB-sorptionsisotherm og Gordon-Taylor glasovergangsmodel
- **Procesdiagram** (P&I) med farvekodet klæbrighedsstatus
- **7 cases** fra grundlæggende til ekspertniveau
- **Scenariesammenligning** – gem og sammenlign op til 4 scenarier
- **Kalibreringspanel** – juster fysiske konstanter
- **Tosproget** (dansk/engelsk)

## Kom i gang

```bash
npm install
npm run dev
```

## Test

```bash
npm run test
```

## Ansvarsfraskrivelse

Dette er et **forenklet undervisningsværktøj**. Resultaterne må ikke bruges til dimensionering af anlæg eller fødevaresikkerhedsbeslutninger.

## Teknisk stack

- React 18 + TypeScript + Vite
- Tailwind CSS
- Recharts
- Zustand
- Vitest

## Fysikmoduler

| Modul | Beskrivelse |
|-------|-------------|
| `psychrometrics.ts` | Magnus-formel for mættet damptryk, absolut og relativ fugtighed |
| `sorption.ts` | GAB-sorptionsisotherm |
| `glassTransition.ts` | Gordon-Taylor glasovergang + klæbepunkt |
| `massBalance.ts` | Massebalance over tørrertårnet |
| `energyBalance.ts` | Energibalance (iterativ løser) |
| `simulator.ts` | Samlet simulering med bisektionsløser |
| `quality.ts` | Kvalitetsindeks og ISi (heuristik) |
| `safety.ts` | ATEX sikkerhedsindikator (vejledende) |
| `energy.ts` | Energi-KPI'er |

## Brugergrænsefladekomponenter

| Komponent | Beskrivelse |
|-----------|-------------|
| `ProcessDiagram.tsx` | SVG P&I-diagram med farvekodet status |
| `ParameterPanel.tsx` | Grupperede sliders og inputfelter |
| `KPIPanel.tsx` | Nøgletals-dashboard |
| `StickyCurve.tsx` | Klæbrighedskurve (Recharts) |
| `ScenarioComparison.tsx` | Scenariesammenligning |
| `CaseLibrary.tsx` | Casebibliotek med 7 cases |
| `CalibrationPanel.tsx` | Kalibreringskonstanter |
