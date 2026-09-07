# PizzaPlan

> Din pizzadej, planlagt for dig.

PizzaPlan svarer på ét spørgsmål: **"Jeg vil spise pizza på dette tidspunkt –
hvornår skal jeg starte, hvad skal jeg bruge, og hvad skal jeg gøre?"**

Brugeren angiver antal pizzaer, hvornår de skal spises, og cirka hvor varmt der
er i køkkenet. PizzaPlan vælger selv hævetid og gærmængde og leverer en færdig
indkøbs- og tidsplan. Ingen bagerprocenter, ingen login, ingen internetforbindelse.

Dejen dækker **napolitansk-inspireret hjemmedej** med instant tørgær, og
brugeren kan vælge:

| Valg | Muligheder |
|------|------------|
| **Metode** (dejtypen) | Direkte dej · Poolish · Biga |
| **Forløb** (hvor den hæver) | Lad PizzaPlan vælge · Stuetemperatur · Køleskab |

De to ting holdes bevidst adskilt. "24 timer" og "48 timer" er ikke dejtyper,
men fermenteringsforløb – og antallet af timer regner appen selv ud fra
spisetidspunktet.

## Kom i gang

```bash
npm install
npm start          # Expo – scan QR-koden med Expo Go
npm run ios
npm run android
```

Domænelaget kan køres og testes helt uden Expo:

```bash
npm test           # 142 tests af beregningsmotoren
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
3. **Forholdene** – rumtemperatur, dejtype, hævning, og avancerede indstillinger lukket som standard.
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

Ved en indirekte metode deles mel, vand og gær mellem fordejen og den endelige
dej. Saltet kommer altid i den endelige dej.

Gærmængden kommer fra fermenteringsmotoren, som oversætter planens faser til
"ækvivalente timer ved 20 °C" og slår en gærprocent op i en dokumenteret tabel.
Oven på modellen ligger en hård regel: **en dej, der hæver et døgn eller mere,
får aldrig mere end 0,4 g instant tørgær pr. kg mel.** Er mængden for lille til
en køkkenvægt, foreslår appen at fortynde gæren i vandet.
Fordejen har sin egen gærberegning ud fra sin egen modningstid, og gæren i den
endelige dej sættes ned, fordi en moden fordej selv bidrager med hævekraft.
Antagelser, tal og begrænsninger står i [docs/FERMENTERING.md](docs/FERMENTERING.md).

Dejens faser hedder på italiensk *puntata* (samlet hævning efter æltning),
*staglio* (dejen deles i bolde) og *appretto* (bollerne hæver færdig). Navnene
står i forklaringen på resultatskærmen, aldrig i selve trinnene.

## Eksempel

6 pizzaer á 270 g, 62 % hydrering, 3 % salt, 22 °C, servering lørdag kl. 18,
bestilt torsdag aften. Direkte dej, appen vælger forløbet:

```
Mel              981 g
Vand             608 g
Salt             29 g
Instant tørgær   0,39 g   (0,40 g pr. kg mel)

Strategi         koldhævning: 2 t bulk, 39,5 t på køl, 3,5 t temperering
                 svarer til 11,5 timer ved 20 °C

I dag        20:15  Lav dejen
I dag        20:45  Dejen er færdigæltet
I dag        22:45  Lav dejbollerne
I dag        23:00  Sæt dejbollerne på køl
I overmorgen 14:30  Tag dejbollerne ud
I overmorgen 18:00  🍕 Bag pizza
```

Samme bestilling som klassisk **direkte dej ved stuetemperatur** giver 24 timer
og 0,27 g gær. Som **poolish** deles dejen i en fordej på 294 g mel, 294 g vand
og 0,29 g gær, der modner 10,5 time, før resten røres i.

Kør `npm run example` for at se alle fire varianter i deres helhed.

## Privatliv

Appen indsamler intet. Ingen konto, ingen backend, ingen analytics, ingen
lokation. Det eneste, der gemmes, er de tal brugeren selv har tastet – og i
MVP'en kun så længe appen kører.

## Bevidst udeladt i MVP'en

Gemte opskrifter, historik, påmindelser, flere pizzastilarter, surdej
(lievito madre), melprofiler, dejtemperatur, indkøbsliste og engelsk sprog. Arkitekturen er lavet
til at kunne rumme dem – men ingen af dem må komplicere den første version.

## Teknisk stack

React Native · Expo SDK 57 · TypeScript · React Navigation · Vitest
