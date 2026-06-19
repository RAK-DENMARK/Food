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

## Phase 4: Multiplayer – Klasse & Lærer

### Kom i gang (fuld stack)

```bash
# Start både Vite frontend og Node.js backend parallelt
npm run dev:all
```

Eller separat:

```bash
npm run dev          # Vite frontend på http://localhost:5173
npm run dev:server   # Node.js backend på http://localhost:3001
```

### Elever tilslutter sig

1. Åbn simulatoren i browseren
2. Klik på fanen **"Klasse & Lærer"**
3. Skriv dit navn og klassekoden (f.eks. `KOLD2024`)
4. Klik **Deltag**

### Lærertilgang

- Vælg rolle: **Lærer** i join-formularen
- Lærerkode (standard): `laerer2024`
- Kan ændres via miljøvariablen `TEACHER_TOKEN`
- Lærerdashboard viser alle tilsluttede elever live med KPI'er
- Læreren kan injicere parameterændringer og fejlscenarier i individuelle elevsessioner

### Produktion (deployment)

```bash
npm run build           # Byg frontend til dist/
npm run start:server    # Kør Express-serveren (serverer også frontend på port 3001)
```

Sæt `PORT` og `TEACHER_TOKEN` som miljøvariabler efter behov.

### Offline/enkeltbrugertilstand

Hvis backend-serveren ikke kører, virker simulatoren normalt som enkeltbrugerapp (eksisterende funktionalitet bevares).

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
