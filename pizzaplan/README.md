# PizzaPlan

> Din pizzadej, planlagt for dig.

PizzaPlan svarer på ét spørgsmål: **"Jeg vil spise pizza på dette tidspunkt –
hvornår skal jeg starte, hvad skal jeg bruge, og hvad skal jeg gøre?"**

Brugeren angiver antal pizzaer, hvornår de skal spises, og cirka hvor varmt der
er i køkkenet. PizzaPlan vælger selv fermenteringsstrategi og gærmængde og
leverer en færdig indkøbs- og tidsplan. Ingen bagerprocenter, ingen login,
ingen internetforbindelse.

MVP'en dækker **napolitansk-inspireret hjemmedej** med instant tørgær.

## Kom i gang

```bash
npm install
npm start          # Expo – scan QR-koden med Expo Go
npm run ios
npm run android
```

Domænelaget kan køres og testes helt uden Expo:

```bash
npm test           # 90 tests af beregningsmotoren
npm run typecheck
npm run example    # printer et komplet eksempel fra input til færdig plan
```

`npm run web` kræver `npx expo install react-dom react-native-web` og er kun
tænkt som et hurtigt udviklingskig – dato- og tidsvælgeren er lavet til iOS og
Android.

## Projektstruktur

```
src/
  config/dough.ts          Alle standardværdier og grænser. Ingen magiske tal andre steder.
  types/index.ts           Datamodeller. Rene data, kender ikke til React.
  domain/
    ingredients.ts         Mel, vand, salt og gær ud fra bagerprocent
    fermentation.ts        Strategivalg, temperaturmodel og gærberegning
    schedule.ts            Kronologisk tidsplan, bygget baglæns fra spisetid
    classification.ts      "Du har god tid" / "Det bliver en hurtig dej"
    validation.ts          Fejl og advarsler ved urealistiske input
    explanation.ts         Korte forklaringer på dansk til "Hvorfor?"
    plan.ts                createDoughPlan() – den eneste indgang UI'et bruger
  utils/                   Tid og dansk formatering (al afrunding sker her)
  ui/
    theme.ts               Farver, afstande, typografi
    components/            Knapper, steppere, kort, tidslinje
    screens/               De fire skærme
    state/DraftContext.tsx Brugerens kladde og den senest beregnede plan
    navigation.tsx         Stack-navigation
  storage/                 Seam til lokal lagring (in-memory i MVP)
  notifications/           Ren funktion: plan -> lokale påmindelser (ikke aktiveret endnu)
docs/FERMENTERING.md       Modellens antagelser, tal og begrænsninger
scripts/example.ts         Komplet eksempel uden UI
```

**Regel:** beregningslogik ligger aldrig i en UI-komponent. Skærmene kalder
`createDoughPlan()` og viser resultatet.

## De fire skærme

1. **Start** – titel og én knap.
2. **Pizzaerne** – antal pizzaer og hvornår de skal være klar.
3. **Forholdene** – rumtemperatur, og avancerede indstillinger lukket som standard.
4. **Din dejplan** – klassificering, ingredienser med store tal og en kronologisk tidsplan.

## Beregningen kort fortalt

Ingredienser følger bagerprocent, hvor alt måles i forhold til melet:

```
samlet dejvægt = antal pizzaer × vægt pr. dejbold
mel            = samlet dejvægt / (1 + hydrering + salt + gær)
vand           = mel × hydrering
salt           = mel × salt
gær            = mel × gær
```

Der regnes med fuld præcision. Afrunding sker først i visningen, og en meget
lille gærmængde vises aldrig som 0 g – i stedet advarer appen om, at der skal
en præcisionsvægt til.

Gærmængden kommer fra fermenteringsmotoren, som oversætter planens faser til
"ækvivalente timer ved 20 °C" og slår en gærprocent op i en dokumenteret tabel.
Antagelser, tal og begrænsninger står i [docs/FERMENTERING.md](docs/FERMENTERING.md).

## Eksempel

6 pizzaer á 270 g, 62 % hydrering, 3 % salt, 22 °C, servering lørdag kl. 18,
bestilt torsdag aften:

```
Mel              981 g
Vand             608 g
Salt             29 g
Instant tørgær   1,73 g   (0,18 %)

Strategi         koldhævning: 2 t bulk, 39,5 t på køl, 3,5 t temperering
                 svarer til 11,5 timer ved 20 °C

I dag        20:15  Lav dejen
I dag        20:45  Dejen er færdigæltet
I dag        22:45  Lav dejbollerne
I dag        23:00  Sæt dejbollerne på køl
I overmorgen 14:30  Tag dejbollerne ud
I overmorgen 18:00  🍕 Bag pizza
```

Kør `npm run example` for at se hele udskriften.

## Privatliv

Appen indsamler intet. Ingen konto, ingen backend, ingen analytics, ingen
lokation. Det eneste, der gemmes, er de tal brugeren selv har tastet – og i
MVP'en kun så længe appen kører.

## Bevidst udeladt i MVP'en

Gemte opskrifter, historik, påmindelser, flere pizzastilarter, poolish og biga,
melprofiler, dejtemperatur, indkøbsliste og engelsk sprog. Arkitekturen er lavet
til at kunne rumme dem – men ingen af dem må komplicere den første version.

## Teknisk stack

React Native · Expo SDK 57 · TypeScript · React Navigation · Vitest
