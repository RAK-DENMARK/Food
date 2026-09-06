# Fermenteringsmodellen i PizzaPlan

Dette dokument beskriver, hvad PizzaPlan regner med, hvorfor, og hvor
usikkerheden ligger. Modellen er **regelbaseret og dokumenteret** frem for at
være en formel, der ser præcis ud uden at kunne forsvares.

Alle tal i dokumentet findes ét sted i koden: `src/config/dough.ts`.
Selve logikken ligger i `src/domain/fermentation.ts` og er testet i
`src/domain/__tests__/fermentation.test.ts`.

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
| Nedkøling | de første 2 | 0,35 | En bøtte dejbolde er ikke kold med det samme. Dejen fortsætter med at hæve mærkbart, mens den køler ned. |
| Gennemkølet | resten | 0,12 | Ved 4–6 °C hæver dejen groft sagt otte gange langsommere end ved 20 °C. |

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
komme i gang) og vælger derefter selv. Brugeren skal ikke tage stilling til
18, 24 eller 48 timer.

| Betingelse | Strategi | Forløb |
|-----------|----------|--------|
| Under 2,5 time | ingen | Appen siger ærligt nej og beder om et senere tidspunkt. |
| 2,5–4 timer | `very-short-room` | Alt ved stuetemperatur, mere gær. |
| 4–10 timer | `same-day-room` | Alt ved stuetemperatur samme dag. |
| 10–20 timer | `room-temp` | Alt ved stuetemperatur. Et køleophold ville blive for kort til at gøre gavn. |
| Over 20 timer | `cold-ferment` | 2 timers bulk ved stuetemperatur, dejbolde på køl, udtagning og temperering før bagning. |

Yderligere regler:

- **Planen bliver aldrig længere end 48 timer** (`preferredMaxTotalHours`),
  selv om brugeren har en uges varsel. Så starter man fredag aften i stedet for
  at få besked på at gå i gang med det samme onsdag.
- **Et køleophold skal være mindst 8 timer** (`minFridgeHours`), ellers
  vælges stuetemperatur i stedet. Et kort ophold i køleskabet giver mest af alt
  en kold dej og ikke den langsomme modning, man er ude efter.
- **Temperering** (dejen ud af køleskabet):
  `4 timer / hastighed(rumtemperatur)`, begrænset til 2–8 timer.
  Ved 22 °C giver det 3,5 time, ved 16 °C giver det 5,25 time.

Æltning regnes som 30 minutter, og der går et kvarter fra dejbollerne er formet,
til de står i køleskabet. Begge dele er praktiske skøn for et hjemmekøkken.

---

## 4. Fra tid til gærmængde

Gærmængden slås op i en tabel over ankerpunkter og interpoleres logaritmisk
mellem dem (fordi sammenhængen i praksis er tæt på omvendt proportional:
dobbelt så lang tid ≈ halvt så meget gær).

Tallene er **bagerprocent instant tørgær (IDY)** af melvægten:

| Ækvivalente timer ved 20 °C | IDY |
|---:|---:|
| 2 | 0,80 % |
| 4 | 0,45 % |
| 6 | 0,32 % |
| 8 | 0,25 % |
| 12 | 0,17 % |
| 18 | 0,11 % |
| 24 | 0,085 % |
| 36 | 0,055 % |
| 48 | 0,040 % |
| 72 | 0,028 % |

**Hvor kommer tallene fra?** De er kalibreret, så de rammer det, der reelt
bruges i velafprøvede hjemmeopskrifter og i pizzamiljøet: en dej med få timer
ved stuetemperatur ligger omkring en halv procent gær, et døgn ved
stuetemperatur ligger under en tiendedel procent, og en to-døgns koldhævet dej
lander typisk mellem 0,1 og 0,2 % IDY.

**Det er ærligt sagt modellens svageste led.** Tabellen er praksisbaseret, ikke
måledata, og der er reel spredning mellem gode opskrifter. Derfor:

- ligger den som en tabel ét sted og ikke som en formel spredt i koden,
- er den nem at erstatte med bedre tal uden at røre hverken UI eller tidsplan,
- er der tests, der låser dens vigtigste egenskaber fast: den er monoton
  faldende, og fordobles tiden, halveres gærmængden nogenlunde.

Gærprocenten begrænses til mellem 0,02 % og 1 % (`YEAST_PERCENT_LIMITS`).

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
- fordej (poolish, biga)
- surdej

---

## 6. Sådan ændrer man modellen

1. Justér tal i `src/config/dough.ts`.
2. Kør `npm test`. Testene beskriver modellens egenskaber, ikke tilfældige tal,
   så de bør stadig passe, hvis ændringen er fornuftig.
3. Opdatér dette dokument, så koden og forklaringen følges ad.

Hverken UI eller tidsplan behøver at blive rørt. Fermenteringsmotoren kan
udskiftes helt, så længe `selectFermentationStrategy()` og
`calculateYeastPercent()` beholder deres signaturer.
