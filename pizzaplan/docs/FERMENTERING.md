# Fermenteringsmodellen i PizzaPlan

Dette dokument beskriver, hvad PizzaPlan regner med, hvorfor, og hvor
usikkerheden ligger. Modellen er **regelbaseret og dokumenteret** frem for at
være en formel, der ser præcis ud uden at kunne forsvares.

Alle tal i dokumentet findes ét sted i koden: `src/config/dough.ts`.
Selve logikken ligger i `src/domain/fermentation.ts` og er testet i
`src/domain/__tests__/fermentation.test.ts`.

---

## 0. Metode og forløb er to forskellige ting

Det er den skelnen, hele modellen er bygget op om, og den blandes ofte sammen.

**Metoden** er dejtypen:

| Metode | Italiensk | Hvad det er |
|--------|-----------|-------------|
| Direkte | *impasto diretto* | Mel, vand, salt og gær bliver til den endelige dej med det samme. Metoden bag den klassiske pizza napoletana. |
| Poolish | *impasto indiretto con poolish* | En våd fordej på 100 % hydrering modner først. |
| Biga | *impasto indiretto con biga* | En tør fordej modner først. |

**Forløbet** er, hvor dejen hæver: fremme ved stuetemperatur eller det meste af
tiden på køl.

"24 timer", "48 timer" og "72 timer" er **ikke dejtyper**. De beskriver
fermenteringsforløbet. En 24-timers direkte dej ved stuetemperatur og en
24-timers direkte dej på køl er samme metode med to forskellige forløb.

De to valg er derfor adskilt i både datamodel (`DoughMethod` og
`FermentationRoute`) og brugerflade. Timerne er ikke et valg – dem regner appen
ud fra spisetidspunktet.

Den klassiske napolitanske dej, som AVPN beskriver, er en **direkte dej med
hele fermenteringen ved kontrolleret stuetemperatur**, typisk 12-24 timer ved
omkring 18-22 °C med meget lidt gær. Det er præcis kombinationen
metode = direkte og forløb = stuetemperatur, og den er derfor loftet for et
stuetemperaturforløb i modellen (24 timer).

### Dejens tre faser

Uanset metode har den endelige dej de samme faser. De italienske navne bruges
kun i forklaringen på resultatskærmen – aldrig i selve trinnene:

| Fase | Hvad sker der |
|------|---------------|
| **Puntata** | Dejen hæver samlet efter æltningen. |
| **Staglio** | Dejen deles og formes til dejbolde. |
| **Appretto** | Dejbollerne hæver færdig frem til bagning. |

---

## 1. Grundidé: ækvivalente timer ved 20 °C

En dej hæver hurtigere, når den er varm, og langsommere, når den er kold.
I stedet for at regne på gæringskinetik oversætter PizzaPlan alle faser til
den samme målestok:

> Hvor mange timer ved 20 °C svarer denne plan til?

Det tal kalder vi **ækvivalente timer** (`equivalentHoursAt20`). Det bruges
derefter til at slå en gærmængde op.

```
ækvivalente timer = Σ (fasens timer × fasens hastighed)
```

### Hastighed ved stuetemperatur

```
hastighed(T) = 2 ^ ((T − 20) / 10)
```

Altså: **hævehastigheden fordobles for hver 10 °C**. Det er en klassisk
tommelfingerregel fra bageri- og hjemmebagningslitteraturen (en Q10-betragtning)
og er brugbar i intervallet omkring stuetemperatur.

| Temperatur | Hastighed |
|-----------|-----------|
| 12 °C | 0,57 |
| 16 °C | 0,76 |
| 20 °C | 1,00 |
| 22 °C | 1,15 |
| 25 °C | 1,41 |
| 30 °C | 2,00 |
| 32 °C | 2,30 |

**Antagelse og begrænsning.** Reglen er kun brugt mellem 12 °C og 32 °C
(`MODEL_TEMP_RANGE_C`). Angiver brugeren noget uden for det interval, regner
appen på den nærmeste grænse og **siger det tydeligt**. Vi ekstrapolerer
bevidst ikke kurven ned til køleskabstemperatur, for dér ændrer gærens
opførsel sig, og en ren fordoblingsregel ville give et misvisende resultat.

### Hastighed i køleskabet

Køl behandles som sine egne, separat dokumenterede faktorer:

| Fase | Timer | Hastighed | Begrundelse |
|------|-------|-----------|-------------|
| Nedkøling | de første 2 | 0,55 | En bøtte dejbolde er ikke kold med det samme. Dejen fortsætter med at hæve mærkbart, mens den køler ned. |
| Gennemkølet | resten | 0,35 | Ved 4–6 °C hæver dejen cirka tre gange langsommere end ved 20 °C. |

Tallet 0,35 fortjener en begrundelse, for det siges ofte, at koldhævning er
otte gange langsommere. Det passer ikke med, hvad der faktisk sker i et
køleskab: en dej med 0,2 % gær er overhævet efter tre døgn på køl, og det
kunne den ikke være, hvis hastigheden var en ottendedel. 0,35 er samtidig
præcis, hvad fordoblingsreglen giver, når den føres fra 20 °C ned til 5 °C.
Modellen bruger altså den samme kurve begge steder, i stedet for at bryde den
for køleskabets skyld.

**Antagelse.** Køleskabet regnes som 5 °C (`FERMENTATION.fridgeTempC`).
Køleskabets faktiske temperatur er ikke et brugerinput i MVP'en, men modellen
er bygget, så det kan tilføjes uden at ændre resten.

---

## 2. Rumtemperatur er ikke dejtemperatur

Dette er modellens vigtigste bevidste forenkling.

Dejens temperatur afhænger af melets og vandets temperatur, af friktionen i
æltningen og af rummet. Den kan sagtens ligge 2–4 °C over rumtemperaturen lige
efter æltning.

PizzaPlan **bruger rumtemperaturen som pejlemærke for dejens temperatur**.
Det er godt nok til at vælge en fornuftig plan, men det er ikke
laboratoriepræcist. Derfor:

- viser appen aldrig fermenteringstal med falsk præcision,
- står der på resultatskærmen, at planen er et udgangspunkt, ikke en facitliste,
- er `FermentationPhase` bygget med et `tempC`-felt pr. fase, så en rigtig
  dejtemperatur (og en vandtemperaturberegning) kan tilføjes senere uden at
  rive modellen ned.

---

## 3. Valg af strategi

Appen kender den tilgængelige tid fra nu til servering (minus et kvarter til at
komme i gang). Brugeren vælger metode og eventuelt forløb; alt andet regner
appen selv.

### Mindstetid pr. metode

| Metode | Mindst | Hvorfor |
|--------|-------:|---------|
| Direkte | 2,5 time | Under det er en pizzadej ikke realistisk. |
| Poolish | 16 timer | Fordejen skal nå at modne, før dejen kan laves. |
| Biga | 22 timer | En tør fordej modner langsommere end en våd. |

Er der ikke tid nok, siger appen det – og foreslår den direkte dej i stedet for
bare at afvise.

### Valg af forløb

| Brugerens valg | Resultat |
|----------------|----------|
| Lad PizzaPlan vælge | Køl, hvis der er mindst 20 timer tilbage til hovedfermenteringen. Ellers stuetemperatur. |
| Stuetemperatur | Hele hævningen står fremme, højst 24 timer i alt. |
| Køleskab | Kræver plads til mindst 8 timers køl oven i bulk og temperering. Ellers siger appen fra og henviser til stuetemperatur. |

Yderligere regler:

- **Et koldt forløb planlægges aldrig længere end 48 timer**
  (`preferredMaxTotalHours`), et stuetemperaturforløb aldrig længere end 24
  (`ROOM_MAX_TOTAL_HOURS`). Har brugeren en uges varsel, får hen en senere
  starttid – ikke besked på at gå i gang med det samme.
- **Et køleophold skal være mindst 8 timer** (`minFridgeHours`), ellers
  vælges stuetemperatur i stedet. Et kort ophold i køleskabet giver mest af alt
  en kold dej og ikke den langsomme modning, man er ude efter.
- **Temperering** (dejen ud af køleskabet):
  `4 timer / hastighed(rumtemperatur)`, begrænset til 2–8 timer.
  Ved 22 °C giver det 3,5 time, ved 16 °C giver det 5,25 time.

Æltning regnes som 30 minutter, og der går et kvarter fra dejbollerne er formet,
til de står i køleskabet. Begge dele er praktiske skøn for et hjemmekøkken.

---

## 3b. Fordeje

Vælger brugeren poolish eller biga, lægges fordejens modning FORAN hele
forløbet. Fordejen står altid ved stuetemperatur.

| | Poolish | Biga |
|---|---|---|
| Andel af den samlede melmængde | 30 % | 40 % |
| Fordejens hydrering | 100 % | 45 % |
| Modning ved 20 °C | 12 timer | 14 timer |
| Grænser | 6–18 timer | 10–24 timer |
| Gærkorrektion | 1,0 | 2,0 |

**Gærkorrektionen** skyldes, at en tør fordej hæver mærkbart langsommere end en
våd ved samme temperatur, fordi der er mindre vand til rådighed for gæren.
Uden korrektionen ville bigaen ikke være moden, når planen siger, den er. Med
den lander en biga på cirka 0,15 % af sit eget mel ved 16 timer og 18 °C,
hvilket svarer til, hvad der bruges i praksis.

Modningstiden skaleres med rumtemperaturen på samme måde som resten af
modellen: `baseHours / hastighed(rumtemperatur)`. Ved 18 °C bliver en biga
derfor cirka 16 timer, hvilket svarer til den traditionelle anvisning.

**Salt kommer aldrig i fordejen** – det ville bremse modningen. Alt saltet
tilsættes ved æltningen af den endelige dej.

**Vandbudget.** Fordejen tager sin del af den samlede vandmængde. En poolish på
100 % hydrering kan tage så meget, at resten af dejen bliver knastør. Derfor
skrues fordejens andel automatisk ned, hvis den endelige dej ellers ville komme
under 40 % hydrering (`MIN_FINAL_DOUGH_HYDRATION`). Ved standardopskriften på
62 % binder den regel ikke.

**Fordejen er klar, når den ser klar ud.** Tiden er et pejlemærke. Derfor står
der et modenhedstegn i selve trinnet: en poolish er klar, når overfladen bobler
og midten lige er begyndt at synke.

---

## 4. Fra tid til gærmængde

Gærmængden slås op i en tabel over ankerpunkter og interpoleres logaritmisk
mellem dem (fordi sammenhængen i praksis er tæt på omvendt proportional:
dobbelt så lang tid ≈ halvt så meget gær).

Tallene er **bagerprocent instant tørgær (IDY)** af melvægten. Sidste kolonne
er den samme mængde omregnet til gram pr. kg mel, som er sådan man i praksis
taler om det:

| Ækvivalente timer ved 20 °C | IDY | g pr. kg mel |
|---:|---:|---:|
| 2 | 0,80 % | 8,0 |
| 4 | 0,40 % | 4,0 |
| 6 | 0,25 % | 2,5 |
| 8 | 0,18 % | 1,8 |
| 12 | 0,10 % | 1,0 |
| 18 | 0,050 % | 0,50 |
| 24 | 0,032 % | 0,32 |
| 36 | 0,020 % | 0,20 |
| 48 | 0,014 % | 0,14 |
| 72 | 0,009 % | 0,09 |

**Kurven er stejlere end omvendt proportional.** Dobbelt så lang tid kræver
mindre end den halve gærmængde – ved lange hævetider omkring en tredjedel.
Grunden er, at gæren formerer sig undervejs: en lang hævning skal startes med
langt færre celler, fordi de når at blive til mange. En ren halveringsregel
giver derfor alt for meget gær i den lange ende, og det er præcis dér, en dej
bliver ødelagt.

**Hvor kommer tallene fra?** Ankeret er den klassiske napolitanske dej: et døgn
ved omkring 20 °C med cirka 1 g frisk gær pr. kg mel, altså omkring 0,3 g
instant tørgær. Derfra er kurven lagt, så den også rammer de kortere deje, man
kender fra praksis: cirka 1 g/kg til et halvt døgn og nogle få gram/kg til en
dej, der skal være klar samme dag.

**Det er ærligt sagt stadig modellens svageste led.** Tabellen er
praksisbaseret, ikke måledata, og der er reel spredning mellem gode opskrifter.
Derfor:

- ligger den som en tabel ét sted og ikke som en formel spredt i koden,
- er den nem at erstatte med bedre tal uden at røre hverken UI eller tidsplan,
- er der tests, der låser den fast mod kendte referencedeje, ikke bare mod sig
  selv.

### Det faste loft: 0,4 g pr. kg mel

Oven på modellen ligger en hård regel:

> En dej, der hæver i **et døgn eller mere**, får aldrig mere end
> **0,4 g instant tørgær pr. kg mel**.

Reglen står i `MAX_YEAST_PERCENT_LONG_PLAN` og håndhæves af
`capYeastForLongPlan()`. Den er ikke en konsekvens af modellen – den er et
værn omkring den. Skulle ankertabellen eller en temperaturfaktor blive
fejlkalibreret, kan resultatet stadig ikke blive en overgæret dej. En dej med
for lidt gær skal bare have en time mere; en dej, der er hævet for langt, er
tabt.

I praksis binder loftet kun i kanterne: et døgn ved 20-22 °C lander af sig selv
på 0,28-0,32 g/kg, mens et køligt køkken eller et langt køleforløb rammer
loftet. En test kører alle kombinationer af tid, temperatur og forløb igennem
og kontrollerer, at ingen af dem kommer over.

### Når gæren ikke kan vejes

Med de rigtige mængder kan et almindeligt køkkenvægt ikke veje gæren til en
lang hævning: 0,3 g vises som 0 g. Derfor foreslår appen fortynding – 1 g gær
i 100 ml af opskriftens vand giver 0,01 g pr. ml, så 0,3 g bliver til 30 ml af
blandingen. Det er en langt mere præcis metode end at gætte på et knivspids.

Gærprocenten begrænses til mellem 0,02 % og 1 % (`YEAST_PERCENT_LIMITS`).

### Gær ved en fordej

Gæren deles i to, og de to dele beregnes hver for sig:

1. **Fordejens gær** slås op i den samme tabel ud fra fordejens EGEN
   modningstid, og regnes som bagerprocent af fordejens mel. En poolish på
   10-12 timer ved stuetemperatur lander derved omkring 0,17 % af poolishens
   mel, hvilket svarer til gængs praksis.
2. **Den endelige dejs gær** slås op ud fra hovedfermenteringen (alt efter
   æltningen) og ganges derefter med `PREFERMENT_LEAVENING_CREDIT` = 0,3.
   Loftet på 0,4 g/kg gælder også her.

Faktoren på 0,3 er begrundelsen værd: en moden fordej på 30-40 % af melet er i
praksis en gærkultur og står for hovedparten af hævekraften. Uden nedsættelsen
ville dejen hæve for hurtigt. Tallet er et bevidst rundt skøn, ikke et
måleresultat.

Resultatet er, at hovedparten af gæren i en indirekte dej ligger i fordejen,
og at den samlede mængde bliver højere end i den tilsvarende direkte dej. Det
er som det skal være: en del af gærens arbejde bruges på at modne fordejen.
Loftet på 0,4 g/kg gælder derfor den endelige dej og ikke fordejens egen gær,
som er styret af sin egen, langt kortere modningstid.

### Gærtyper

MVP'en understøtter kun **instant tørgær (IDY)**. Instant tørgær og almindelig
aktiv tørgær er ikke det samme produkt og kan ikke bruges i forholdet 1:1.
Derfor findes `YEAST_FACTORS` som en eksplicit tabel med IDY som eneste post –
en ny gærtype kræver en bevidst omregningsregel, ikke bare et nyt navn i UI'et.

---

## 5. Hvad modellen ikke tager højde for

Bevidst udeladt i MVP'en, men arkitekturen er lavet til at kunne rumme det:

- melets styrke og proteinindhold
- den faktiske dejtemperatur efter æltning og vandtemperaturberegning
- hydreringens effekt på hævehastigheden
- køleskabets faktiske temperatur
- fordeling mellem bulk og dejbolde ud over de faste regler ovenfor
- fordejens egen temperatur (den regnes som rumtemperatur)
- lievito madre og anden surdej
- lang biga ved lav temperatur (48 timer ved 4-6 °C)

---

## 6. Sådan ændrer man modellen

1. Justér tal i `src/config/dough.ts`.
2. Kør `npm test`. Testene beskriver modellens egenskaber, ikke tilfældige tal,
   så de bør stadig passe, hvis ændringen er fornuftig.
3. Opdatér dette dokument, så koden og forklaringen følges ad.

Hverken UI eller tidsplan behøver at blive rørt. Fermenteringsmotoren kan
udskiftes helt, så længe `selectFermentationStrategy()` og
`calculateYeastPercent()` beholder deres signaturer.

En ny metode kræver tre ting: en post i `DoughMethod`, en post i `PREFERMENTS`
(hvis den bruger fordej) og en tekst i `METHOD_TEXTS` i `explanation.ts`.
Resten af kæden – ingredienser, tidsplan og skærme – tager selv højde for den.
