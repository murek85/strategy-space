# Renderer 3D (wersje 0.52–0.96, 0.125–0.147.7)

## Noce na popiele (wersja 0.147.4, 2026-10-08)

- `light` (`three-renderer.js`): współczynnik nocny biomu (`snowNight`) — lód 1, popiół 2,2 (ciemny bazalt), pustynia 0,8 (od 0.147.5), motyw `lumen` 8 (od 0.147.7, czarnozielony mech `#15291f`), motyw `magma` 12 (od 0.147.6 — zastygła lawa ma kolor bazowy `#221716`, a tone mapping spłaszcza jasność, więc mniejsze wartości prawie nic nie zmieniały): księżyc × (1 + 0,35 × współczynnik), niebo nocą + 0,14 × współczynnik × (1 − dzień).
- `weatherLight`: siła cieni chmur × (0,15 + 0,85 × `smooth(−0,12; 0,15; wysokość słońca)`) — przy świetle księżyca prawie bez cieni.
- Kontrast nocą między terenem widzianym a widzianym wcześniej to mgła wojny (przyciemnienie `0,25 + 0,75 × widoczność`), bez zmian.

## Jasne noce na lodzie (wersja 0.147.3, 2026-10-08)

- `light` (`three-renderer.js`): na mapach o biomie `ice` (`snowNight`) księżyc × 1,35, a niebo nocą (`hemi`) + 0,14 × (1 − dzień) — śnieg odbija światło księżyca.

## Przejrzystsza śnieżyca i ulewa (wersja 0.147.2, 2026-10-08)

- `weather-3d.js`: mgła burzy (haze) — śnieg `siła × (0,3 + 0,12 × poryw)` (było 0,45 + 0,15), deszcz `0,25 × siła` (było 0,35); ściany nawiewanego śniegu (`snowVeil`) — krycie 0,3 (było 0,42), niskie zamiecie 0,4 (było 0,5); mgła przyziemna burzy — deszcz `0,6 × siła` (było 0,8), śnieg `0,45 × siła` (było 0,6).

## Jaśniejsze noce, przejrzystsze burze piaskowe (wersja 0.147.1, 2026-10-08)

- Noc (`light`, `three-renderer.js`): księżyc `1,3 × (0,45 + 0,55 × pełnia)` (było `0,55 × (0,25 + 0,75 × pełnia)`), kolor `#b4c7ee`; niebo nocą `hemi` 0,6 + 0,14 × pełnia (było 0,3), kolory `NIGHT_DEEP` `#26385f`, `NIGHT_AMBIENT` `#3a5282`, `NIGHT_GROUND` `#1d2532`; ekspozycja obrazu kinowego `1,22 + 0,65 × noc` (było 0,35).
- Burza piaskowa (`weather-3d.js`): mgła burzy `0,45 × siła` (było 0,7), kłęby pyłu przy ziemi z kryciem 0,15 (było 0,22).

## Hologramy dowodzenia (wersja 0.144.3, 2026-10-08)

- Nowy moduł `webgl3d/holo-3d.js` (`createHolo3D`, w liście modułów `tools/build-3d.js` przed `three-renderer.js`), wywoływany co klatkę po `syncMarks` z `selected`, `hidden`, `colorOf`, `space`, `hover`, `TYPES`. Wszystko addytywne, bez zapisu głębi.
- Zaznaczenie (zastępuje dawny płaski pierścień): pierścień `RingGeometry(0.76, 1.02)` z shaderem (linia zewnętrzna, 16 kresek biegnących wokół, 4 klamry) i otwarty walec (gradient ku górze, linia skanu `fract(czas × 0,5)`, poziome prążki) — wysokość: statek do kadłuba (unoszenie + 0,6 × promień), lotnictwo 92, budynek do 70, reszta 1,2 × promień + 8; kolor drużyny.
- Rozkazy (`move`, `attackMove` — punkt rozkazu; `attack` — cel): kreski (`InstancedMesh`, do 700) co 24 j. od jednostki do celu, przesuwane z czasem (40 j/s); znacznik celu (jeden na punkt, zaokrąglone do 20 j.): ośmiościan z krawędziami nad punktem (bujanie, obrót) i pulsujący pierścień; atak — obracający się, pulsujący celownik z 4 narożników wokół celu. Kolory: ruch `#8dffc8`, ruch z atakiem `#ffb070`, atak `#ff5a4a`.
- Przekaźniki: przy `capturing ≥ 0` i `progress > 0` wiązka (otwarty walec, impulsy `pow(fract(v × 5 − czas × 1,6), 8)`) od każdej jednostki przejmującej strony (lub sojuszniczej) w promieniu 100 do szczytu przekaźnika (teren + 46, w kosmosie 74), do 24 wiązek; zmiana właściciela — pierścień rosnący 20 → 240 i słup światła (gradient) przez 1,6 s.

## Żywe planety (wersja 0.144.2, 2026-10-08)

- Roślinność (`scatter-3d.js`): uniform `pushers[16]` (xz, zasięg, siła) w shaderze roślin (`windy`) — rośliny o skali instancji < 20 (bez drzew) w zasięgu są spłaszczane (wysokość × (1 − 0,75 f)) i rozchylane (xz × (1 + 0,5 f)); `three-renderer.js` `plantPushers()` — 16 najbliższych jednostek naziemnych (zasięg 1,5 × promień + 6), przekazywane w `scatter.tick`. Kratery (`blasts`, w `update`): drzewa w zasięgu 1,6 × rozmiar + 14 padają od krateru (obrót 1,35 rad wokół osi poziomej) i zostają; drobne rośliny w 55% tego zasięgu znikają.
- Kurz spod pojazdów (`vehicleDust`, `scene-fx-3d.js`): pojazdy naziemne o promieniu ≥ 9 jadące szybciej niż 8 j/s (prędkość z ruchu w symulacji); sucho — pył w kolorze gruntu (`SOIL`), deszcz (> 0,25) — grudki błota (cząstki stałe, spadają), śnieg/lód — biała zawierucha i grudki; częstość × prędkość × rozmiar. Z opcją „Ślady i dym” (`scars`).
- Mgła wojny (`buildMist`, `three-renderer.js`): trzy siatki na całą mapę (oczko 28) podniesione w shaderze wierzchołków nad teren o 12/30/54 (mapa wysokości z `fx.ground`), przezroczystość z mapy mgły wojny (nieznane ~0,4, widziane wcześniej ~0,07, pas granicy widoczności 0,35) × kłęby szumu dryfujące z czasem, wygaszenie przy krawędzi mapy; kolor `mistColor` = mgła sceny zmieszana z otoczeniem. Nie w kosmosie.
- Świt i zmierzch (`light`, `sky-3d.js`): kierunek słońca do wysokości 0,07 (było 0,12) — dłuższe cienie; `skyState.golden` (słońce od −0,06 do 0,3 nad horyzontem) — światło słońca ku `#ffae5e` (35%) i × 1,15, w gradacji tint świateł ku ciepłemu (50%) i nasycenie × 1,12; paleta nieba: różowy pas przed wschodem, głębszy fioletowy zenit, gorętszy horyzont.

## Kosmos w ruchu (wersja 0.144.1, 2026-10-08)

- Dopalacze: `syncModel` liczy dla statku `boost` (0…1) z ruchu w symulacji — przyspieszenie (Δprędkość / Δt / 1,5 × prędkość typu) i skręt (powyżej 0,6 rad/s, pełny przy 3,1) — skok od razu, zanik 1,2/s; `ships-3d.js` (`ship().update`): płomienie × (1 + 1,6 × boost) wzdłuż, × (1 + 0,5 × boost) wszerz, migotanie szybsze.
- Pył: materiał punktów pyłu (`buildNebula`) z `onBeforeCompile`: uniform `dustShips[16]` (xyz, zasięg = 2,4 × promień + 18) — drobina w zasięgu przesunięta od statku o 0,8 × (zasięg − odległość); `updateDustShips()` co klatkę (statki widoczne w pobliżu widoku).
- Trafienia w kadłub: przy trafieniu w kosmosie `hullHit(ef)` szuka trafionego (najbliższy obcy w promieniu 8 od celu strzału); bez osłony — `fx.shot("hull", …, { dx, dz })` (`scene-fx-3d.js`): błysk, 10–18 iskier w stożku ku strzelającemu, 3–5 odprysków poszycia (cząstki stałe), żarzący się ślad 0,7–1,1 s, światło iskier. Inne trafienia w kosmosie bez pyłu (`air`).
- Planety (`space-3d.js`): gazowy olbrzym — punkt próbkowania obracany wokół osi o kąt czas × prędkość pasa (±0,01 rad/s na zmianę co pas, + 0,006), więc wiry i wielka burza płyną z pasami; lodowy olbrzym — ciemna burza okrąża planetę (0,012 rad/s); wulkaniczny księżyc — obrót 0,008 rad/s i erupcje jezior lawy (`pow(sin(czas × 0,45 + szum × 53), 14)`, jezioro × 2,2, obrzeże × 0,6).

## Efekty walki (wersja 0.144, 2026-10-08)

- Falowanie gorącego powietrza (`post-3d.js`, przebieg `finish`): `heatShift(uv)` przesuwa próbkę obrazu o zmarszczki wędrujące w górę ekranu (częstotliwość względem promienia źródła, przesunięcie do 0,03 × promień); uniformy `heat[16]` (x, y, promień w wysokościach ekranu, siła) i `heatTime`. Źródła zbiera `heatSources()` (`three-renderer.js`): wybuchy (siła 1 − k, promień 1,2–2 × rozmiar), płonące budynki (< 30%) i duże pojazdy (< 20%) na planecie (0,55), lawa w pobliżu widoku (0,3), w kosmosie silniki okrętów o promieniu ≥ 18 w ruchu (0,35); rzutowane kamerą, 16 najsilniejszych (promień × siła). Tylko z obrazem kinowym i opcją `haze`.
- Wstrząs kamery (`shakeCamera`): nowy wybuch o rozmiarze ≥ 45 podbija amplitudę `near × (rozmiar − 35)/80` (near — bliskość ogniska widoku w promieniu 1,5 × odległości kamery); zanik `exp(−6 t)`; przesunięcie kamery o amplitudę × 0,006 × odległość i lekki przechył. Opcja `shake`. Fala uderzeniowa na planecie (`scene-fx-3d.js`): przy wybuchu ≥ 45 dodatkowy pierścień 22 obłoków jasnego pyłu (prędkość 170–240 × skala).
- Światło wybuchów (`nightLights`): pierwsze 10% życia wybuchu — biały błysk (`#fff0d8`), moc × (1 + 2 × hot), zasięg + 2,5 × rozmiar; iskry uszkodzeń dają światło `#c8dcff` na 0,15 s.
- Stopnie uszkodzeń (`damageSparks`, `scene-fx-3d.js`): jednostki i budynki o promieniu ≥ 9 poniżej 75% — snopy 6–12 iskier (na planecie spadają) z rozdartych miejsc (`spotOf`), częstość 0,3–1,6/s na miejsce; w kosmosie poniżej 50% blady strumień gazu; dym na planecie już od pojazdów o promieniu ≥ 10 (poniżej 35%).
- Przylot z nadprzestrzeni (`warpIn`): statek (`ship`, bez myśliwców), którego rekord powstał po 3. sekundzie gry i najwyżej 0,5 s przed pierwszym pokazaniem; przez 1,1 s model cofnięty o (1 − ease) × 900 wzdłuż kursu i rozciągnięty × (1 + 2,2 × (1 − ease)), smuga (`warpStreakGeometry` — dwie skrzyżowane płaszczyzny z gradientem) i błysk (`glareTexture`, `#bfe0ff`).
- Ustawienia grafiki (`scene-fx.js`, `menu.js`): `haze` — „Falowanie gorącego powietrza 3D”, `shake` — „Wstrząs kamery przy dużych wybuchach”.

## Pogoda na modelach (wersja 0.138.3, 2026-10-08)

- Wspólny materiał modeli (`PAINT` w `models-detail-3d.js`, wszystkie wypiekane modele: pojazdy, piechota, budynki, zwierzęta) ma blok `WEATHER_COAT` w układzie modelu: śnieg (`snowCover`) w zaspach od górnych ścian w dół, szerzej im grubszy, z poszarpaną krawędzią (szum), cienka warstwa na bokach; piasek (`sandCover`, nowy) — pył w kolorze gruntu planety (`soilColor`) na wszystkim, najgrubszy na wierzchu i nisko, z przygaszoną barwą, matowy; deszcz (`wetness`) — przyciemnienie, połysk, strużki spływające po bokach (szum przewijany zegarem `weatherClock`), krople połyskujące na wierzchu.
- `weather-3d.js`: `sandCover` rośnie w burzy piaskowej (pełny po ok. 20 s) i opada po niej (ok. 70 s); `models3d.setWeather(śnieg, mokrość, piasek, zegar)`. Mgiełka śnieżycy przy porywach 0,45–0,6 × siła.

## Zamieć (wersja 0.138.2, 2026-10-08)

- `weather-3d.js`, śnieżyca: płatki (`snow`, 10 000) pędzą z wiatrem (230 zamiast 60, opad 85), mniejsze i rozciągnięte; `snowStreaks` (9000) — długie smugi śniegu wzdłuż wiatru, lekko w dół, na wysokości 4–300 j., tylko w średniej odległości od kamery; `snowCurtains` (260) — wysokie białe kurtyny zadymki z przewijanym szumem; `snowDrift` (260) — niskie (26–56 j.), szybkie pasma śniegu zmiatanego przy ziemi. Porywy (`gust`, wspólny uniform: dwie wolne fale) zagęszczają smugi i kurtyny i podnoszą mgiełkę śnieżycy (0,5–0,75 × siła). Wszystkie warstwy miękko zanikają przy gruncie (0.138.1).

## Miękkie cząstki pogody (wersja 0.138.1, 2026-10-08)

- `weather-3d.js`, `layer` → `softened`: warstwa, która ustawia wierzchołki w świecie (`pos`), przekazuje punkt do pikseli (`vSoftWorld`); piksel czyta wysokość terenu pod sobą z mapy wysokości z ręczną interpolacją dwuliniową (tekstura ma filtr „nearest” — byłyby schodki) i zanika na ostatnich 26 j. nad gruntem. Dotyczy kurtyn pyłu, mgły w zagłębieniach, zasłon deszczu i pozostałych warstw z `pos` — znikły ostre linie przecięcia z zboczami.

## Płonące budynki (wersja 0.138, 2026-10-08)

- `scene-fx-3d.js`, `burnFires` (co klatkę, przy włączonych uszkodzeniach): płonący budynek (< 30% PW) lub duży pojazd (< 20%) ma stałe ogniska (`spotOf`, z id — na dachu i krawędziach; budynek 2–6 według wielkości i stopnia zniszczenia, pojazd 1–2); z każdego co klatkę z prawdopodobieństwem buchają języki ognia (14–24 na s), żar u nasady, iskry i dym stylu 2 (podświetlony ogniem). „Zajadłość” rośnie z utratą wytrzymałości: więcej ognisk, większe płomienie, więcej iskier i dymu. W kosmosie (wysokość stacji/statku): krótkie strugi ognia w losowych kierunkach i iskry, bez dymu; dym z uszkodzeń w kosmosie wyłączony.
- Język ognia (styl 1 cząstek ognia, czas `time` w materiale): dwie oktawy szumu przewijane w górę, kołyszący się i rwący czubek, szeroki u podstawy; barwa z „temperatury” (podstawa żółtobiała → pomarańcz → ciemna czerwień u szczytu, chłodniej z wiekiem cząstki).
- Światło ognia na budynek i otoczenie także w dzień (0,35 + noc zamiast tylko nocą).

## Ogień i wybuchy (wersja 0.137, 2026-10-08)

- Kula ognia (`fireballMaterial` w `three-renderer.js`): wierzchołki wypychane szumem 3D zawijanym trzema innymi szumami (domain warping) — kłęby zwijają się zamiast być grudkowatą kulą; w pikselu drobna turbulencja; temperatura z wieku, szumu i kąta patrzenia, barwa z rampy żaru (`blackbody`: ciemna czerwień → czerwień → pomarańcz → żółty → biel) z jasnością w HDR (rdzeń dla bloomu, umiarkowanie — bez prześwietlenia); chłodne partie przechodzą w brunatną sadzę; erozja otwiera dziury od najcieńszych miejsc. Blask na starcie słabszy (0,3).
- Grona wybuchów: w puli błysku dwie dodatkowe kule (`balls`), wybuchające 0,12 i 0,26 życia później obok pierwszej, mniejsze; większe wybuchy mają obie, małe żadnej.
- Iskry-smugi: do 14 cienkich promieni na wybuch po łukach balistycznych (w kosmosie prosto), biało-żółte gasnące do pomarańczu, przez pierwsze 55% życia (w `tracers`).
- `scene-fx-3d.js`: płonące odłamki (`burners`) — kilka na wybuch, lecą po łukach (w kosmosie prosto), zostawiają nieprzerwany ślad płomieni (cząstki rozłożone wzdłuż drogi z każdej klatki) i na planecie dym; dym z wybuchu i z odłamków ma styl 2 — młody żarzy się od spodu pomarańczem ognia.

## Głębia ostrości i smugi wybuchów (wersja 0.135, 2026-10-08)

- `post-3d.js`: przebieg `dof` (tilt-shift, cel `dofTarget`), ustawienia `dof` (siła), `dofFocus`, `dofBand`; wykończenie bierze kolor z niego, gdy siła > 0. `three-renderer.js`: siła z przybliżenia, tylko w kosmosie, przełącznik `quality.dof` (`SceneFX.options.dof`). Smuga anamorficzna przy wybuchach w kosmosie (`streak` w puli błysków).

## Kosmos: głębia, światło, walka (wersja 0.134, 2026-10-08)

- `space-3d.js`: pole dalekich asteroid i drobin, konwoje, wrak stacji, mgiełka głębi (`hazed`), zorze, drobiny pierścieni, flara obiektywu.
- `three-renderer.js`: poświata planety (`sun2`), twarde światło, światła modeli jak nocą, bąbel osłony (`bubbles`), wybuch i fala uderzeniowa na wysokości (`ef.space`, `ef.lift`), dryfujące wraki (`collapse`), linie wysokości statków, wielowarstwowe mgławice.
- `scene-fx-3d.js`: cząstki wybuchu w próżni. `ships-3d.js`: iluminatory, ładowanie działa niszczyciela.

## Kosmos 3D (wersja 0.133, 2026-10-07)

- Nowy moduł `webgl3d/space-3d.js` (w paczce przed `three-renderer.js`): gazowy olbrzym z atmosferą, pierścienie, księżyc, sfera gwiazd, Drogi Mlecznej i mgławic, smuga flary — [opis](BITWA_NA_ORBICIE.md).
- `three-renderer.js` w kosmosie: teren przezroczysty (`spaceGround` w shaderze `fogged` — welon mgły, siatka taktyczna, ramka mapy, nakładka), bez `outskirts`, kopuła nieba ukryta, `camera.far` 60 000 i bez mgły odległości, bez cieni chmur, bloom 0,5.

## Kosmos: boje, surowce, smugi, lasery, pył (wersja 0.132, 2026-10-07)

- `models-3d.js`: `scenery("deposit", kind, n, space)` → `spaceDeposit` (asteroidy rudy, kieszeń mgławicy, odłamki kryształu, unoszące się 30 j.); `scenery("relay", …, space)` → boja (`buoy`, obracany pierścień z panelami jako „dish”). `scene-life-3d.js` przekazuje `space` i dopisuje je do kluczy modeli.
- `three-renderer.js`: smugi silników statków (mapa `trails`, segmenty w tym samym instancjonowanym `tracers`), lasery statków (wysokość lotu, wiązka niszczyciela), pył kosmiczny jako `THREE.Points` w grupie mgławic, napisy złóż i boi wyżej.
- `engine.js`: efekt strzału niesie `ship`, `shipTarget`, `lance` (tylko dla wyglądu).

## Stacje i mgławice (wersja 0.131, 2026-10-07)

- Budynki w kosmosie na platformach (`ships-3d.js`, `platform`; `models-3d.js` dokleja ją przy tworzeniu modelu, klucz wypieku z dopiskiem `|station`), uniesione przez `stationLift`; znaczniki wyżej o to samo.
- `buildNebula`: obłoki mgławic jako sprite'y z dodawanym światłem nad złożami gazu (tylko w kosmosie, budowane z terenem).
- `collapse`: ginące jednostki i budynki zaczynają od swojej wysokości (statki, stacje i lotnictwo nie skaczą na ziemię).

## Kosmos — bitwa na orbicie (wersja 0.130, 2026-10-07)

- Mapy z `space: true` ([Bitwa na orbicie](BITWA_NA_ORBICIE.md)): płaska płaszczyzna bitwy (`relief-3d.js`, `webgl/terrain-height.js`), teren bez ziarna PBR, mapy normalnych i cieni (malowany kosmos z `space-art.js`), bez rozrzuconych drobiazgów (`scatter-3d.js`), zwierząt i ptaków (`scene-life-3d.js`).
- Wygląd mapy w kosmosie (0.143): `look` misji ustawia w `space-3d.js` rodzaj planety (`planetUniforms.kind`: gaz / lód — od 0.143.3 przewrócony jak Uran, z pierścieniami zwróconymi ku kamerze / lawa — od 0.143.4 jak Io (siarka, kaldery, potoki lawy), kolory `c0`–`c3`, `atmo`), pierścienie (`ringA`/`ringB`/`ringAlpha`, `near`/`far`), kolory mgławic nieba (`neb1a`…`neb2b`), czarną dziurę (grupa `blackHole`; od 0.143.2 jeden obraz w shaderze zwrócony do kamery — cień, pierścień fotonowy, dysk i jego zagięty obraz), widoczność komety, konwojów, wraku i lodu; `three-renderer.js` — barwę słońca (`look.sun`) i poświaty (`look.glow`) oraz kolory obłoków `buildNebula`. Kamienie przeszkód biorą `look.rocks`; wraki okrętów to `models3d.scenery("obstacle", "hulk", …)` (od 0.143.1 kadłub z `loftGeo`, przełamany, z nadbudówką i dyszami; w `scene-life-3d.js` nie obracają się jak asteroidy).
- Asteroidy: przeszkody w kosmosie budowane jako `models3d.scenery("obstacle", "asteroids", …)` — skupisko kamieni na wysokości 26–116 j., powoli obracane wokół środka pola.
- Światło (`three-renderer.js`, `light`): twarde białe słońce z boku, niebieskie światło otoczenia, ciepłe odbicie od planety, czarne tło i mgła; gradacja `space`; bez mgły wysokościowej i promieni w obrazie kinowym. Niebo (`sky-3d.js`, świat `space`): zawsze gwiazdy, bez chmur, księżyc Kharona.
- Statki (`webgl3d/ships-3d.js`, w `BUILDERS` modeli): korweta, fregata, niszczyciel (`lancer`), krążownik; unoszą się `RTS.SPACE.hover` nad płaszczyzną (`syncModel`, kalkomania i pasek zdrowia wyżej).

## Detale modeli (wersja 0.128, 2026-10-07)

Etap 3 „rewolucji 3D”, proceduralnie, w materiale `PAINT` z `models-detail-3d.js` (wypiekane, nieruchome części wszystkich modeli — jedna łatka, bez nowych rysowań):

- Dane: pozycja i normalna w układzie modelu (`vObjPos`, `vObjN`; przy instancjonowaniu stałe względem modelu), wykończenie z wierzchołka (`vFinish`: szorstkość, metaliczność, okno), świecenie (`vGlow` — świecące części i okna pomijane).
- Płyty: siatka 9 × 6 jednostek na płaszczyźnie dominującej osi normalnej; spoiny z wygładzaniem (`fwidth`), wygaszane, gdy są cieńsze niż piksel; odcień płyty ±10% z hasza komórki (widoczny także z daleka); tylko na częściach metalowych.
- Starte krawędzie: fazki (normalna niezgodna z żadną osią) × plamy szumu 3D → jasny goły metal (mniej szorstki, bardziej metaliczny).
- Brud: pas kurzu u dołu (0–9 jednostek), pionowe zacieki na ścianach, pył osiadły na powierzchniach skierowanych w górę; kolor `soilColor` według biomu mapy (`three-renderer.js` `setGame`: piasek `#9a7d58`, popiół `#5a5450`, lód `#c9d3dc`).
- Wygaszanie 1000–2600 jednostek od kamery; śnieg i mokra powierzchnia nadal na wierzchu.
- Ustawienie `surface` w `scene-fx.js` (`models3d.setSurface(on, soil)` → `bakeModel.setSurface`).


## Napisy nakładki na ekranie (wersja 0.129.4, 2026-10-07)

- Wspólna lista `globalThis.BoardLabels` (ustawiana przez `three-game-renderer.js` na czas rysowania nakładki, potem `null`): napisy nakładki trafiają do niej zamiast na płótno — `render-canvas.js` (artefakt, szczyt, koszt muru), `faction-art.js` (odliczanie uderzenia orbitalnego) — i są rysowane razem z etykietami kampanii (`drawLabels`) na warstwie ekranu. Nazwy złóż, przekaźników i wraków to od dawna tabliczki 3D (`syncSigns`).

## Flaga punktu zbiórki (wersja 0.129.3, 2026-10-07)

- `three-renderer.js` (`syncRallies`): dla zaznaczonych budynków produkcyjnych z punktem zbiórki — maszt (walec 56 j., gałka), płachta 32 × 18 z siatką 8 × 3, której wierzchołki co klatkę falują (sinus wzdłuż płachty, mocniej na wolnym końcu, lekki opad), zwrócona od budynku; rzuca cień; pula modeli, zbędne ukryte.
- `render-canvas.js`: przy `objects3D` nakładka rysuje tylko przerywaną linię i okrąg (koło zamiast elipsy — leży na terenie), bez płaskiego masztu i flagi.

## Napisy celów kampanii (wersja 0.129.2, 2026-10-07)

- `act2-art.js` (`label`): gdy renderer ustawi `Act2Art.onLabel`, etykieta znacznika (`{ x, y, text, color, sub }` w punktach mapy) trafia do niego zamiast na warstwę nakładki.
- `three-game-renderer.js`: zbiera etykiety podczas rysowania nakładki (jak `onBeacon`) i rysuje je na warstwie ekranu (`drawLabels`) w miejscu `mapToScreen` punktu (30 j. nad gruntem): szklana karta, krawędź w kolorze znacznika, tytuł i podpis; pomija punkty poza ekranem i za kamerą. Wcześniej malowane na nakładce w rozdzielczości 0,4 i wtapiane w teren — rozmyte i pochylone.

## Snopy słońca (wersja 0.129.1, 2026-10-07)

- `sun-fx-3d.js`: snopy (wiązki z ziemi ku słońcu) wyłączone, gdy działa kinowy obraz z atmosferą (`imageRays` z `three-renderer.js`) — smugi daje wtedy `post-3d.js`; bez niego wygaszane według pochylenia kamery (kierunek patrzenia w dół 0,45–0,75 → do zera), bo z góry stały jako cienkie, równoległe białe kreski (zgłoszenie: zachód i wschód słońca, spokojna pogoda).

## Poprawki burz (wersja 0.127.1, 2026-10-07)

- `weather-3d.js` (`layer`): kolory wpisane w shaderach pogody są sRGB — przed zapisem zamieniane na liniowe (`pow 2.2`) i przepuszczane przez `colorspace_fragment`; na zwykłym ekranie wygląd bez zmian, w klatce HDR kinowego obrazu nie są już blade (mgła bierze kolor z nieba, już liniowy — bez zmiany).
- Ziarna piasku: krótsze (7–13), szersze (1,1), słabsze (0,2), wygaszane w odległości 500–950 (dalej cieńsze niż piksel migotały jako przerywane kreski).
- `sun-fx-3d.js`: snopy słońca znikają w gęstej burzy (zamglenie > 0,2–0,5) — z góry stały jako twarde, równoległe białe linie.
- `three-renderer.js`: gęstość mgły wysokościowej bez składnika pogody (pogoda ma własne zamglenie); poranna mgła słabnie w burzy.

## Atmosfera i woda (wersja 0.127, 2026-10-07)

Etap 4 „rewolucji 3D”, proceduralnie:

- Odbicia w wodzie (`three-renderer.js` `drawReflection`, `scene-fx-3d.js` `waterLook`): dla płaskiej wody (jeziora, szczeliny) najbliższej punktowi kamery (`water.levelNear`, zasięg 1,6 × odległość) lustrzana kamera pod powierzchnią rysuje scenę do `WebGLRenderTarget` HalfFloat w połowie rozdzielczości — z płaszczyzną odcinającą wszystko pod wodą (`renderer.clippingPlanes`), bez samej wody i nakładki interfejsu, bez odświeżania map cieni. Shader wody rzutuje swoje punkty macierzą `reflectMatrix` (przesunięcie o falowanie normalnej), miesza odbicie 0,28–0,85 według kąta (fresnel), tylko na tafli o poziomie `reflectLevel`; inne tafle — kolor nieba jak dotąd. Piana jaśniejsza, z „koronką” dalej od brzegu. Wyłączone przy niskiej jakości terenu i z „Połyskiem wody” wyłączonym.
- Mgła wysokościowa i perspektywa powietrzna (`post-3d.js`, w wykończeniu, przed mapowaniem tonów): całka gęstości malejącej wykładniczo z wysokością (`fogFalloff` 1/80, podstawa = 15. percentyl wysokości mapy) wzdłuż promienia od kamery do punktu z głębi; gęstość 0,0005 + mgła poranna/wieczorna + zamglenie pogody, najwyżej 55%; kolor mgły z koloru oddali, rozjaśniony i ocieplony w stronę słońca.
- Smugi światła: maska nieba wokół słońca (gdzie głębia = niebo) i rozmycie promieniste ku pozycji słońca na ekranie (40 próbek, zanik), w połowie rozdzielczości; tylko gdy słońce jest nad horyzontem i przed kamerą; słabsze w złej pogodzie.
- Ustawienia: `reflect`, `atmo` w `scene-fx.js` (oba tylko 3D; atmosfera razem z `cinema`).
- Nie zrobione: prawdziwe załamanie światła pod wodą (wymagałoby kopii sceny spod wody) i nowe, fizyczne niebo — zostaje dotychczasowe niebo z rozpraszaniem w mgle.


## Teren PBR (wersja 0.126, 2026-10-07)

Etap 2 „rewolucji 3D”, proceduralnie, w shaderze terenu (`fogged(..., terrain = true)` w `three-renderer.js`, blok `#ifdef TERRAIN` w `GROUND_COLOR`, nowe `GROUND_BUMP`):

- Dane: normalna świata z wierzchołka (`vTerrN`), pozycja (`vMapXY`, `vWorldY`), maska skały z rzeźby (`vRock`); mundury `pbrOn` (ustawienie `pbr` w `scene-fx.js`) i `pbrBiome` (0 piasek, 1 lód i śnieg, 2 popiół i gleba — z `biome` mapy).
- Barwa: płaty w dużej skali (fbm, ×0,74–1,2) i ciepło-chłodne odcienie; jaśniej wyżej, ciemniej nisko (według `mistBand`); skała tam, gdzie maska rzeźby albo nachylenie > ~0,3–0,55 — faktura `tTri` w trzech płaszczyznach ważonych normalną, warstwy wzdłuż wysokości, kolor z `rockTint`.
- Drobna struktura według planety: piasek — zmarszczki od wiatru z zaburzeniem (okres ~50 jednostek) i ziarno; lód — zaspy i pęknięcia (ciemniejsze, gładsze); popiół i gleba — grudki i żwir. Wygaszana z odległością (2200–4800).
- Rzeźba w świetle: `pbrH` jako mapa wysokości → normalna zaburzona z pochodnych ekranowych (bump mapping, siła 6–9, mocniej na skale), po `normal_fragment_maps`.
- Szorstkość: piasek 0,93, skała 0,82, lód 0,5 (0,28 w pęknięciach), popiół 0,97; mokry grunt, kałuże i śnieg nadal nadpisują (`GROUND_ROUGH`).
- Wyłączenie „Teren PBR 3D” przywraca dawny grunt.


## Kinowy obraz (wersja 0.125, 2026-10-07)

Etap 1 „rewolucji 3D” (wybór użytkownika; wszystko proceduralne, bez dodatków Three.js i plików). Moduł `webgl3d/post-3d.js` (`createPost3D`), podpięty w `three-renderer.js` (`cinematic()`):

- Scena rysowana do `WebGLRenderTarget` HalfFloat z MSAA (4 / 2 / 0 próbek wg jakości terenu) i teksturą głębi.
- Okluzja otoczenia: SSAO w połowie rozdzielczości — 16 próbek w półkuli wzdłuż normalnej (z pochodnych pozycji), test głębi, ograniczenie zasięgu, wygaszanie z odległością (`aoFade` = 2 × odległość kamery); rozmycie 3×3 z zachowaniem krawędzi głębi.
- Poświata: wycięcie jasnych miejsc (próg 1,2, miękkie kolano) i łańcuch 5 poziomów pomniejszeń z rozmyciem w górę (dodawanie). Piksele NaN/nieskończone z dowolnego shadera są zerowane — wcześniej rozmycie rozlewało je w białe smugi (burza piaskowa o zmierzchu).
- Wykończenie: ekspozycja (1,22 w dzień, do 1,57 w nocy), ACES (dopasowanie S. Hilla), gradacja (nasycenie, barwa cieni i świateł z `GRADES` według motywu/biomu, przejście do chłodnej nocy), sRGB, kontrast, winieta, dithering.
- Odbicia nieba: `PMREMGenerator.fromScene` z kuli w kolorach nieba, gruntu i słońca, odnawiane najwyżej co 0,5 s; `scene.environmentIntensity` 0,3–0,8; światło półkuli obniżone do 72%.
- Nakładka interfejsu (Canvas) mieszana w klatce HDR po zamianie sRGB → liniowe (`overlayLinear`).
- Cienie: pudło cieni 460–3000 (0,9 × odległość) i przesunięte w głąb kadru.
- Ustawienia (`scene-fx.js`): `cinema`, `ao` (tylko 3D), `bloom` (WebGL i 3D). Diagnostyka: `window.post3dView` = 1 (sama okluzja), 2 (sama poświata), 3 (piksele NaN/∞ na niebiesko, > 8 na czerwono).
- Do zrobienia: pomiar kosztu na stronie `tests/benchmark-browser.html` w widocznej karcie (w osadzonym podglądzie klatki stały).

Data: 2026-09-30. Status: w grze jako Ustawienia → Renderer → „3D (Three.js)”, obok samodzielnego prototypu `prototyp-3d.html`. Tylko grafika — symulacja, zasady, zapisy i gra sieciowa bez zmian.

## Założenia

- Symulacja zostaje 2D (`x, y`). Renderer umieszcza ją w 3D: X = x, Z = y, Y = wysokość terenu z `webgl/terrain-height.js`.
- W grze ten sam interfejs co renderery Canvas i PixiJS: `setGame`, `refreshFog`, `render(view)`, `toFlat`, `fromFlat`, `destroy`. `app.js` zachowuje kamerę, sterowanie i HUD.
- Biblioteka: Three.js 0.170.0 w `vendor/three.module.js` (moduł ES). Gra wczytuje renderer 3D dopiero po wybraniu go w Ustawieniach: przez serwer (`npm start`) jako moduły ES z `webgl3d/`, a ze strony otwartej z dysku (`file://`, gdzie moduły się nie wczytują) jako jeden zwykły skrypt `webgl3d/bundle-3d.js` (od 0.55). Bez WebGL gra przełącza się na WebGL (PixiJS) z komunikatem, a dalej — jak dotąd — na Canvas 2D.

## Pliki

| Plik | Rola |
|---|---|
| `webgl3d/three-game-renderer.js` | adapter do gry: kamera gry → kamera 3D, `toFlat`/`fromFlat`, nakładka interfejsu, warstwa ekranu, minimapa, słońce z gry |
| `webgl3d/three-renderer.js` | teren, modele (instancing), tektury, światło, cienie, mgła, znaczniki, efekty |
| `webgl3d/models-3d.js` | modele low-poly budowane w kodzie |
| `webgl3d/ships-3d.js` | statki bitwy na orbicie: korweta, fregata, niszczyciel, krążownik (0.130) |
| `webgl3d/scene-fx-3d.js` | woda, światła nocne, pogoda, dym i ogień (0.53), efekty map i strzałów (0.54) |
| `webgl3d/scene-life-3d.js` | zwierzyna, ptaki, ryby, latające wyspy, wraki (0.54), przeszkody (0.56), złoża i przekaźniki (0.58) |
| `webgl3d/weather-3d.js` | pogoda na karcie graficznej: deszcz z rozpryskami, śnieg, burza piaskowa, pioruny; mokry i zaśnieżony grunt (0.62) |
| `webgl3d/objectives-3d.js` | kopuły osłon, uderzenia orbitalne, artefakt, Szczyt, znaczniki misji (0.60) |
| `webgl3d/scatter-3d.js` | drobne obiekty na gruncie: kamienie, kępy trawy, zaspy, odłamki lodu, grzybki (0.58) |
| `webgl3d/bundle-3d.js` | WYGENEROWANY: Three.js i moduły `webgl3d/` jako jeden zwykły skrypt, dla gry otwartej z dysku (`npm run build:3d`, `tools/build-3d.js`) |
| `tests/render-3d-browser.html` | test w przeglądarce (0.57): sceny testów renderera, noc, kursor przy obrocie, instancing, tekstury, zwalnianie |
| `tests/bundle-3d.test.js` | paczka zgodna ze źródłami; każdy typ ma model w każdej odmianie i animuje się; modele przyrody |
| `prototyp-3d.html`, `webgl3d/prototype-3d.js` | samodzielny prototyp: kamera z obrotem i pochyleniem, galeria modeli, pora dnia |

## Co jest zrobione

- **Teren**: siatka z mapy wysokości, w kaflach po 60 komórek. Grunt maluje kod Canvas (fazy `terrain`, `ground`, `groundTop`). Kafel jest malowany na nowo tylko wtedy, gdy zmieni się etap złoża, właściciel przekaźnika, liczba wraków lub kraterów albo odkryty obszar (ok. 17 ms na kafel, najwyżej jeden kafel na pół sekundy).
- **Modele 3D** (`models-3d.js`) dla wszystkich 49 typów gry, w czterech odmianach:
  - Kolonie — jasne i obłe (kopuły, walce); Dominium — kanciaste i rdzawe (kliny, płyty). Kolor drużyny na pasach i światłach.
  - Rój — „obsydianowi strażnicy” jak w `swarm-art.js`: budynki to zestawy zwężających się monolitów ze szpicami i szwem (liczba i wysokość zależne od typu), małe jednostki to kliny na czterech nogach, pojazdy to kroczące (2–4 nogi) z kolcami broni, latające — ośmiościany ze skrzydłami; bez poświaty, jedynym kolorem jest pas drużyny.
  - Fauna: drapieżnik i rogacz lodowy (czworonogi, kły), pajęczak bazaltowy (osiem nóg, żarzące się szwy), paszczak wydmowy (krater z kręgiem zębów, gardziel wysuwa się przy ataku).
- **Animacje**: chód piechoty i kroczących, koła i gąsienice, obrót wieży do celu (niszczyciel czołgów — tylko w wąskim polu), odrzut lufy, przechył samolotów, wirniki dronów, ramiona robota i łazika przy pracy, ładunek robota, tłok ekstraktora tylko przy obsadzonym ekstraktorze, brama opuszcza się po otwarciu, anteny, wentylatory, radar, rdzenie energii. Budynek w budowie wyrasta z ziemi.
- **Instancing**: części modeli są w scenie tylko szkieletem transformacji (na warstwie, której nie widzi żadna kamera); co klatkę ich macierze trafiają do jednego `InstancedMesh` na parę geometria + materiał. Liczba wywołań rysowania zależy od liczby rodzajów części, nie od liczby jednostek.
- **Tektury** (obraz z gry leżący na ziemi, budynki na bryle z namalowanym dachem) zostają dla typów bez modelu (np. z przyszłych wtyczek). W prototypie przełącznik „Modele 3D” pokazuje tektury wszędzie — do porównania.
- **Światło**: słońce i księżyc z mapą cieni podążającą za kamerą; w grze z `game.night` i fazy doby (jak w rendererze WebGL). Zasięg cieni, mgła odległości i daleka płaszczyzna kamery skalują się z przybliżeniem.
- **Mgła wojny**: shader terenu przyciemnia i odbarwia to, czego nie widać (miękka krawędź). Modele, paski i efekty innych stron poza zasięgiem wzroku są ukryte.
- **Na planszy**: kręgi zaznaczenia, paski życia, strzały (linie), wybuchy (błyski).

## Woda, noc, pogoda, dym (wersja 0.53, 2026-10-01)

- **Woda** (`game.waters`, kształt z `RTS.waterRadius`): siatka na siatce terenu (co 12 jednostek), przezroczystość zanika od 70% promienia do brzegu, więc brzeg jest miękki. Jeziora i szczeliny lodowe na płaskim terenie to płaskie lustro tuż nad najwyższym punktem brzegu (zmarszczki z przewijanej mapy normalnych odbijają słońce); świecące rozlewiska i lawa leżą na korycie, bo płyną łańcuchami po pochyłości. Lawa: ciemna skorupa z żarzącymi się pęknięciami z szumu, przewijana i pulsująca. Zachodzące na siebie zbiorniki jednego rodzaju dzielą punkty siatki (jedna siatka na rodzaj), więc półprzezroczysta woda nie ciemnieje na zakładkach. Przepaście zostają ciemnym gruntem. Woda przechodzi przez shader mgły wojny.
- **Noc**: pod budynkami plamy ciepłego światła, przed pojazdami i piechotą stożki reflektorów (dwa rysowania instancjonowane, siła według `game.night`). Okna, lampy i rdzenie modeli świecą w nocy mocniej; świecące rozlewiska jaśnieją.
- **Pogoda** (`game.weather`): deszcz jako smugi z wiatrem i błyskawice (ten sam rytm co niebo Canvas i WebGL, rozjaśniają scenę), śnieg jako płatki, burza piaskowa jako niski pył pędzący nad ziemią. Mgiełka w kolorze pogody przybliża się i przyciemnia słońce. Cząsteczki krążą w pudełku wokół kamery.
- **Dym i ogień**: budynki poniżej 50% wytrzymałości dymią, poniżej 30% płoną; pojazdy poniżej 35% dymią, poniżej 20% płoną. Każdy wybuch rozrzuca iskry i kłęby dymu. Dwa systemy punktów (dym, ogień addytywnie), do 2500 cząsteczek każdy; nic nie jest pokazywane we mgle wojny.
- **Mgła wojny**: siatka widoczności powiększona 3× i dwukrotnie rozmyta — krawędź widzenia to łagodna krzywa zamiast schodków 40 × 40.
- **Okolica mapy**: za krawędzią mapy płaski teren w uśrednionym kolorze gruntu, rozpływający się w mgle odległości — kamera nie patrzy w pustkę.
- **Minimapa**: obrys tego, co widzi kamera 3D (trapez), zamiast prostokąta płaskiego widoku (`view.viewOutline` w `render-canvas.js`).
- **Nakładka interfejsu** jest przesyłana do karty graficznej tylko wtedy, gdy coś na niej narysowano (kontekst płótna zgłasza każde malowanie).
- Prototyp: `prototyp-3d.html?map=frost` (lub `magma`, `horizon`, `lumen`…) — inna mapa.

## Przyroda, efekty map, pociski (wersja 0.54, 2026-10-01)

- **Zwierzyna** (`game.wildlife()`): jelenie z porożem, zające, lisy (na lodzie białe), jaszczurki — modele budowane w kodzie, idą w kierunku, w którym dryfują. **Ptaki**: 18 nad mapą (ten sam wzór co w 2D), machają skrzydłami wysoko nad ziemią. **Ryby**: po siedem w zwykłych jeziorach, krążą pod powierzchnią.
- **Latające wyspy** (`MapArt.islands`): skalny stożek ostrzem w dół, wierzch z mchu i świecących grzybów (Lumeria) lub trawy i głazów (Aerion), kołysanie jak w 2D, prawdziwy cień na ziemi.
- **Wraki** (`game.debris`): zwęglone płyty i belki z żarzącym się kawałkiem; przez ostatnie sekundy zapadają się w ziemię.
- Wszystkie te modele idą przez ten sam instancing co jednostki; we mgle wojny są ukryte (wyspy zostają — są częścią krajobrazu, jak w 2D).
- **Efekty map** wokół kamery: świecące zarodniki nad Lumerią (jaśniejsze nocą), iskry z lawy Pyrrhosu, mgła wypełzająca z przepaści Aerionu.
- **Pociski**: smuga leci od lufy do celu przez czas życia strzału (rakiety wolniej, łukiem, z dymem), błysk u wylotu, iskry w miejscu trafienia.
- Prototyp: zakres map przez `?map=` (np. `skyfall`).

## Tabliczki, smugi, gra z dysku, testy (wersja 0.55, 2026-10-01)

- **Tabliczki**: nazwy i zasoby złóż („RUDA · 3937”, „KRYSZTAŁY · 900”) oraz nazwy i stan przekaźników („GREK / PRZEJMIJ”) stoją nad nimi jako napisy zawsze zwrócone do kamery, z cieniem dla czytelności; odświeżane tylko przy zmianie tekstu. Grunt w 3D jest malowany bez nich (`view.groundLabels = false` w `render-canvas.js`; tekst przekaźnika z `nodeLabel()`, złóż z `BoardArt.resourceLabel` / `crystalLabel`). Kafel gruntu odświeża się teraz tylko przy zmianie etapu złoża (`resourceLook` / `crystalLook`), a nie co 250 jednostek.
- **Smugi pocisków**: świecące belki (rozciągnięte prostopadłościany, jedno rysowanie instancjonowane) zamiast linii o grubości piksela; rakiety grubsze.
- **Gra z dysku**: `tools/build-3d.js` (bez zależności) skleja Three.js (jedna lista `export { … }` na końcu zamieniana na obiekt) i moduły `webgl3d/` (usunięte linie `import`, `export function` → `function`) w jedną funkcję; `app.js` przy `file://` lub nieudanym `import()` dołącza `webgl3d/bundle-3d.js` i używa `window.Board3D`. Sprawdzone: renderer z paczki rysuje grę na stronie, przeliczanie kursora wraca w to samo miejsce, Three.js nie trafia do `window`. Strony otwartej z dysku nie dało się sprawdzić w podglądzie (otwiera pliki jako statyczną kopię).
- **Testy** (`tests/bundle-3d.test.js`, w `npm test`): paczka zgodna ze źródłami (po zmianie `webgl3d/*.js` trzeba uruchomić `npm run build:3d`), każdy z 49 typów ma model w odmianie Kolonii, Dominium, Roju i dzikiej, który się buduje i animuje z poprawnymi przekształceniami; modele przyrody, wysp i wraków.

## Przeszkody, motywy, pomiar (wersja 0.56, 2026-10-01)

- **Przegląd map**: wszystkie 18 misji (scenariusze, kampania, akt II) uruchamiają się w 3D bez błędów i bez tektur — każdy obiekt ma model.
- **Przeszkody** (`game.obstacles`, prostokąty nieprzejezdnego terenu podniesione mapą wysokości) dostały bryły (`scenery("obstacle")` w `models-3d.js`, stawiane przez `scene-life-3d.js`, zawsze widoczne jak krajobraz): iglice skalne z mniejszymi kolcami (Aerion, Pyrrhos), olbrzymie świecące grzyby z blaszkami (gaje Lumerii), rozbity kadłub statku z żebrami i statecznikiem oraz rozrzucone płyty (wraki i szczątki Kessaru), żebra obcego truchła (derelict), ruiny filarów i murów, bryły żywicy, gniazda jaj, przetwórnia, głazy na skałach, występach i płaskowyżach w kolorze biomu. Wszystko mieści się w elipsie prostokąta przeszkody — nic nie wisi nad przejezdnym terenem.
- **Efekty motywów** (`themed-art.js`): piasek niesiony nisko nad wydmami (dunesea, goldsand), drobiny unoszące się nad polami wraków (derelict) i zamarzniętym rojem (frozenhive).
- **Pomiar**: `tests/benchmark-browser.html` ma wiersz „3D” (strona musi być podana przez serwer). Przy okazji: bufory cząsteczek, deszczu i śniegu wypełniane bez tworzenia tablic w każdej klatce, a do karty graficznej idzie tylko używana część buforów i macierzy instancji.

| 2026-10-01, 1920×1080, noc, ulewa, ~66 jednostek | kl./s | 95% klatek do | rysowanie CPU (śr. / 95%) |
|---|---|---|---|
| Canvas 2D | 82 | 17,7 ms | 4,3 / 5,7 ms |
| WebGL (PixiJS) | 130–152 | 11,8–17,6 ms | 5,3–6,6 / 10,6–13,5 ms |
| 3D przed poprawkami | 99 | 17,7 ms | 8,5 / 14,0 ms |
| 3D po poprawkach | 135 | 11,8 ms | 6,2 / 7,9 ms |

## Prześwitywanie, obrót kamery, test w przeglądarce (wersja 0.57, 2026-10-01)

- **Prześwitywanie**: latające wyspy, iglice i gaje wielkich grzybów są rysowane osobno (każdy z własnymi materiałami, poza instancingiem) i płynnie przygasają do ok. 25%, gdy na ekranie zasłaniają własną jednostkę, coś zaznaczonego albo punkt pod kursorem i stoją przed nim (`covers()` w `three-renderer.js`, `fadeTall()` w `scene-life-3d.js`). Cień na ziemi zostaje.
- **Obrót kamery w grze**: `,` i `.` (przytrzymane) obracają kamerę wokół środka widoku, `/` przywraca widok od południa (tylko w trybie 3D; `camera.yaw` w `app.js`, `rig.yaw` w adapterze). Strzałki przesuwają wtedy widok względem ekranu, nie osi mapy. Zaznaczanie, ramka, rozkazy i budowa działają bez zmian, bo płaska klatka logiki gry zostaje nieobrócona, a ekran przelicza się przez teren. Minimapa pokazuje obrócony obrys widoku. Skrót opisany w panelu rozkazów i w Bazie wiedzy.
- Sprawdzone w grze: po obrocie o ok. 1 rad ramka zaznacza oddział, rozkaz ruchu ustawia linię dokładnie wokół klikniętego punktu, strzałka w górę przesuwa widok w głąb ekranu.
- **Test w przeglądarce** `tests/render-3d-browser.html` (przez serwer): wszystkie sceny testów renderera (Morze Wydm, Lumeria nocą w ulewie, Rzeki Magmy z budową, Ostatni konwój ze znacznikami i murem, duża mapa z mgłą, 4 graczy, kampania, baza Roju) i bitwa 200 jednostek rysują się bez błędów i niepusto, każdy obiekt ma model 3D; noc ciemniejsza od dnia; kursor → plansza → kursor z błędem 0,002 px (prosto) i 0,028 px (obrót 1,2 rad); bitwa 206 modeli w 184 rysowaniach (42 paczki instancji); 5 przebiegów zmian map bez przyrostu tekstur; `destroy()` usuwa planszę. Wynik 2026-10-01: 30/30 PASS.

## Złoża, przekaźniki i teren 3D (wersja 0.58, 2026-10-01)

- **Złoża jako modele** (`scenery("deposit")` w `models-3d.js`), etap po etapie jak w `art.js` (0 = wyczerpane … 6 = pełne; ten sam układ skał i graniastosłupów): ruda — skały z błyszczącymi grudkami metalu, mniej i mniejsze z każdym etapem, wykopy po wydobytym; gaz — krater z obrzeżem i świecącą gardzielą, pęknięcia na kopcu świecące słabiej, gdy pole się wyczerpuje, i fioletowa para (gęsta nad pompującym ekstraktorem, `gasFlowing` z renderera Canvas); kryształy — przejrzyste złote graniastosłupy ze szpicami, na końcu ułamane kikuty. Model wymieniany przy zmianie etapu.
- **Przekaźniki**: sześciokątny cokół, trójnożny maszt z obracającą się anteną i światłem w kolorze właściciela, przerywany krąg strefy przejmowania (promień 95) i pierścień zapełniający się kolorem przejmującego; oba kręgi idą po zboczach. Właściciel widoczny tylko w zasięgu wzroku lub dla własnych (jak w 2D).
- Grunt w 3D jest malowany bez złóż i przekaźników (`view.groundDeposits = false` w `render-canvas.js`), a kafle gruntu nie odświeżają się już przy wydobyciu ani odkrywaniu mapy (tylko przy wrakach i kraterach).
- **Rzeźba terenu**: do mapy wysokości dochodzą łagodne pagórki i drobne nierówności z szumu zależnego od mapy (3 oktawy, kilka jednostek wysokości, tylko wygląd — ruch i widoczność bez zmian; jednostki, budynki i woda stoją na tej samej wysokości). Normalne i cieniowanie liczone z całej mapy (bez szwów między kaflami): strome stoki i zagłębienia ciemniejsze, grzbiety jaśniejsze (kolor wierzchołków).
- **Faktura biomu**: powtarzalna mapa normalnych (co ok. 110 jednostek) — zmarszczki wiatru w piasku, ziarno popiołu, gładki lód z rysami; łapie niskie słońce o świcie i zmierzchu.
- **Drobne obiekty** (`scatter-3d.js`): 3–4,4 tys. na mapę, z ziarna mapy (tak samo u każdego gracza), w kępach, z dala od wody, przeszkód, złóż, przekaźników i krawędzi; jedno rysowanie instancjonowane na rodzaj. Piasek: kamienie i suche kępy; lód: zaspy, kamienie, odłamki lodu; popiół: ciemne kamienie, kępy, odłamki; Lumeria: kępy, świecące grzybki. Chowane pod budynkami (także postawionymi w trakcie gry). Mgła wojny przyciemnia je jak grunt (shader mgły działa teraz też dla obiektów instancjonowanych).
- Wydajność (benchmark, noc, ulewa, 1920×1080): 3D 118 kl./s, 95% klatek do 11,8 ms, rysowanie CPU 7,6 / 8,7 ms (WebGL w tym przebiegu: 163 kl./s). Przyczyny i poprawki w trakcie: kursor przy prześwitywaniu wyznaczany był promieniem przez cały teren w każdej klatce (0,9 ms) — teraz liczy się tylko na ekranie; drobne kamienie nie rzucają cieni (tysiące obiektów w mapie cieni kosztowały kartę graficzną więcej, niż było widać).

## Goły grunt, ustawienia jakości, kamera (wersja 0.59, 2026-10-01)

- **Goły grunt**: w 3D grunt jest malowany bez dekoracji, które są już bryłami 3D — bez ok. 1700 namalowanych kamyków z cieniami (`BoardArt.terrain`), ok. 1650 kępek roślin (`PlanetArt.terrain`), namalowanych skał, występów, gniazd, żywicy, ruin, przetwórni i wraku z ich cieniami 2D (`render-canvas.js`, `AdvancedArt`, `SceneFX`, `MapArt`, `ThemedArt`) i bez nazwy planety. Zostają kolor podłoża, plamy, koryta i brzegi wód, drogi, oznaczenia bazy; pod przeszkodą miękka plama w kolorze skały biomu. Przełącznik `canvasRenderer.setBareGround()` (włącza renderer 3D, wyłącza przy zamknięciu, więc WebGL i Canvas dostają pełny malunek); malarze czytają `RTS.bareGround` tylko w trakcie malowania terenu.
- **Skały**: zwykłe skały i występy to zwarte stosy dużych głazów w kolorze biomu (ciemniejsze i jaśniejsze), na długich wałach rozłożone równo wzdłuż osi (7–30 głazów zależnie od wydłużenia), tak że wzniesienie czyta się jako skała, a nie gładki wał.
- **Ustawienia jakości 3D** (Ustawienia → Grafika planszy, istniejące pola): „Detale terenu i roślinność” — gęstość drobnych obiektów (100 / 55 / 25%), mapa cieni (4096 / 2048 / 1024), rozdzielczość renderowania (do 2 / 1,5 / 1 piksela na punkt); „Cząsteczki pogody” — deszcz, śnieg, pył, dym, iskry, para i efekty map (100 / 50 / 25%); przełączniki: cienie od słońca, oświetlenie nocne (plamy i reflektory), woda (powierzchnie), ślady zniszczeń (dym i ogień), wysokość terenu (rzeźba z szumu i faktura), błyski burzy. W trybie 3D wyszarzone zostają tylko poświata, objętość i pochylenie 2,5D. Zmiana rzeźby lub gęstości przebudowuje mapę; reszta działa od razu. Pomiar (1920×1080, noc, ulewa): pełna klatka z oczekiwaniem na kartę ok. 9,5 ms na każdym poziomie — na tym komputerze wąskim gardłem jest stały koszt sceny, ustawienia pomogą słabszym kartom (wypełnianie pikseli, mapa cieni).
- **Kamera**: obrót także myszą — Alt + przeciąganie środkowym przyciskiem; przesuwanie środkowym przyciskiem trzyma chwycony punkt terenu pod kursorem (korekta raz na klatkę, na świeżo narysowanym widoku, więc szybka mysz nie przestrzeliwuje — pierwsza wersja liczyła korektę przy każdym zdarzeniu i wyrzucała kamerę na skraj mapy); kąt obrotu zapisuje się w zapisie gry i wczytuje; pochylenie zależy od przybliżenia: z daleka ok. 60° (przegląd), z bliska ok. 40°. Sprawdzone w grze: magazyn przeciągnięty środkowym przyciskiem ląduje dokładnie pod kursorem, Alt + środkowy obraca widok, zapis przywraca kąt.

## Cele i moce, budowa, zniszczenie (wersja 0.60, 2026-10-01)

- **Cele i moce jako obiekty 3D** (`objectives-3d.js`, nad nakładką 2D, która zostawia pierścienie, postęp i napisy; te same reguły widoczności): kopuła nad działającym generatorem osłon (krawędź świeci z ładunkiem i rozbłyskuje przy trafieniu, czerwona przy przeciążeniu); kolumna światła uderzenia orbitalnego, zwężająca się i jaśniejąca do chwili trafienia; złoty kryształ artefaktu unoszący się i obracający nad miejscem lub nad niosącym, z promieniem, gdy leży; słup światła Szczytu w kolorze posiadacza z obracającym się pierścieniem; słupy światła nad znacznikami misji aktu II. Promienie mają miękkie boki (jasny rdzeń, gasnące krawędzie).
- Znaczniki aktu II: `Act2Art` zgłasza każde wywołanie `beacon()` przez `Act2Art.onBeacon` — adapter zbiera je podczas rysowania nakładki i przekazuje rendererowi (`setBeacons`), bez powielania logiki misji. Płaski romb artefaktu nie jest rysowany w 3D (`view.objects3D`).
- **Budowa**: wokół wznoszącego się budynku rusztowanie (słupy, rygle na trzech poziomach, migające światło ostrzegawcze), znika po ukończeniu.
- **Zniszczenie**: gdy w miejscu znikającego modelu gra zgłasza wybuch, model zapada się przez 1,2 s — budynek osiada i przechyla się, pojazd i kroczący przewracają się na bok i grzęzną; potem zostaje wrak. Jednostki znikające bez wybuchu (np. wsiadające do transportera) znikają jak dotąd.

## Czytelność drużyn i trafienia (wersja 0.61, 2026-10-01)

- **Kręgi drużyn**: pod każdą jednostką naziemną (bez fauny) krąg w kolorze jej strony (`game.colorFor`), jedno rysowanie instancjonowane; pomijany we mgle wojny. Kolor drużyny na samych modelach to wąskie pasy — z daleka trudno było odróżnić swoich od przeciwnika.
- **Rozbłysk trafienia**: paczki instancji mają kolor na instancję (mnoży materiał); trafiony model rozjaśnia się na czas `e.hit` (0,15 s od każdego trafienia). Zapadające się modele zniszczonych ciemnieją (zwęglenie).
- Koszt: jeden dodatkowy bufor koloru na paczkę, przesyłany tylko w używanej części; bitwa 206 modeli — 211 rysowań (+1 za kręgi).
- **Rój z bliska**: obsydian monolitów ma lekki połysk (światło wydobywa ściany głazów, które wcześniej zlewały się w czarne sylwetki), a pod szpicem każdego monolitu jasna obwódka; nadal ciemny, zgodnie ze stylem Roju z 2D.

## Pogoda 3D (wersja 0.62, 2026-10-01)

- **Bez pogody 2D**: warstwa ekranu w 3D rysuje już tylko słońce, księżyc i gwiazdy (`PlanetArt.atmosphere(…, withWeather = false)`, `view.weather3D`); wcześniej na planszę 3D nakładały się płaskie płatki, smugi deszczu, piorun i ziarna piasku z 2D.
- **Animacja na karcie graficznej** (`weather-3d.js`): każda kropla, płatek i ziarno ma ziarno losowe, a pozycję liczy shader z czasu (zero pracy procesora na cząsteczkę); wysokość gruntu z tekstury mapy wysokości, więc deszcz kończy się na terenie. Cząsteczki krążą w pudełku wokół kamery i gasną przy jego brzegach oraz tuż przy obiektywie.
- **Deszcz**: do 9000 ukośnych smug z wiatrem, rozpryski-pierścienie na ziemi; grunt w ulewie ciemnieje i lśni w słońcu (szorstkość spada), potem schnie (ok. 45 s).
- **Śnieg**: do 7000 kołyszących się płatków; śnieg osiada na zwróconych ku górze powierzchniach terenu i drobnych obiektów, narasta w śnieżycy i topnieje po niej (ok. 90 s).
- **Burza piaskowa**: ziarna pędzące nisko z wiatrem i szerokie zasłony pyłu; mgiełka ogranicza dal, ale nie zasłania jednostek w kadrze.
- **Pioruny**: w rytmie nieba 2D (co 17 s w silnej ulewie) rozgałęziony piorun 3D uderza w teren w pobliżu widoku, a światło punktowe rozświetla okolicę.
- Ustawienia: „Cząsteczki pogody” zmieniają liczbę cząsteczek, „Błyski burzy” wyłączają pioruny.
- Pomiar (benchmark, noc, ulewa, 1920×1080): 3D 103 kl./s, CPU 8,3 / 11,2 ms (wcześniejsze przebiegi 102–135 kl./s).

## Bez 2D: mury, ślady, wraki, siedliska, poświata, światła, wybuchy, podgląd budowy (wersja 0.63, 2026-10-01)

Ostatnie elementy malowane na gruncie 2D przeszły do 3D. Grunt planszy 3D maluje się raz (`view.ground3D`: bez `PlanetArt.ground`, `MapArt.effects`, kraterów, odłamków, wraków, siedlisk i murów 2D), więc wszystko, co się zmienia, musi być obiektem 3D.

- **Mury** (`marks-3d.js`): odcinek muru między sąsiednimi murami, bramami i wieżyczkami jednej strony (30–70 jednostek, nie przez otwartą bramę), z koroną; o połowę niższy, gdy któryś koniec jest w budowie. Wcześniej był namalowany na gruncie i nie zmieniał się po zniszczeniu.
- **Ślady i kratery** (`marks-3d.js`): naklejki dopasowane do nachylenia stoku, jedno wywołanie rysowania dla wszystkich: gąsienice, odciski stóp (gasnące z życiem śladu), kratery z ciemnym lejem, jaśniejszym wałem i osmaleniem (gasnące przez `CRATER_LIFE`). Na lodzie ślady są niebieskawe.
- **Siedliska stworzeń**: przerywany krąg i rozrzucone kości 3D wokół legowiska widocznego zagrożenia.
- **Wraki do odzysku**: model wraku (`scene-life-3d.js`) i napis „WRAK · wartość” jak nad złożami; znikają po odzysku.
- **Poświata mapy** (`scene-fx-3d.js`): gaje (turkus), świecące jeziora i lawa (pomarańcz, słabo także w dzień) rzucają kolorowe światło na grunt, najmocniej w nocy.
- **Światła nocne**: oprócz plam światła pod wszystkimi budynkami sześć świateł punktowych przy oświetlonych budynkach najbliżej środka widoku oświetla modele obok (stała liczba świateł, więc shadery się nie przebudowują).
- **Wybuchy**: kula ognia rosnąca i stygnąca od białożółtej do ciemnoczerwonej oraz fala uderzeniowa biegnąca po gruncie, zamiast płaskiego rozbłysku. Iskry i dym jak dotąd z `scene-fx-3d.js`.
- **Podgląd budowy**: pod kursorem półprzezroczysty model budowanego obiektu, zielony albo czerwony, gdy budowa jest niemożliwa (`setPlacements`, te same reguły co nakładka: ekstraktor przyciąga się do złoża gazu, zastępowanie budynku, przeciągany mur).
- Sprawdzone w przeglądarce: test renderera 3D (wszystkie scenariusze), noc na Świetlistym Gąszczu i Rzekach Magmy, wybuchy, mur z bramą i wieżyczką, krater, ślady gąsienic, napis wraku, podgląd koszar w grze.

## Szczegółowe modele z kodu (wersja 0.64, 2026-10-02)

Jednostki i budynki Kolonii i Dominium są zbudowane od nowa w `webgl3d/models-detail-3d.js` (Rój, przyroda, złoża i sceneria zostają w `models-3d.js`). Dalej bez plików z modelami: kształty powstają w kodzie, więc gra otwarta z dysku działa jak dotąd.

- **Zestaw kształtów**: fazowane bryły, profile boczne wyciągane na szerokość (kadłuby z pochyłym pancerzem), bryły przez pierścienie punktów (wieże, kadłuby samolotów), bryły obrotowe ze ścianką (kominy, chłodnie, talerze anten), gąsienice jako pierścień z kołami jezdnymi, napędowym i napinającym w środku, lufy z przeciwodrzutem i hamulcem wylotowym, reflektory, anteny, włazy, rury.
- **Jednostki**: piechota z nogami (udo, goleń, nakolannik, but), pancerzem, ładownicami, hełmem (okrągły w Koloniach, kanciasty z grzebieniem w Dominium) i bronią każdego typu. Czołgi, ciężka maszyna, artyleria i niszczyciel na gąsienicach, wozy kołowe z błotnikami, łazik z dźwigiem, zbieracz z zasobnikiem i wiertłem, krocząca maszyna z kolanami i tłokami, samoloty z kadłubem, kabiną, statecznikami i dyszami.
- **Budynki**: fundament z pasem ostrzegawczym i słupkami, okna (świecą nocą), kominy, wentylatory, rury, lampy, maszty. Kolonie mają łukowe hale i kopuły, Dominium kanciaste bloki z blankami.
- **Ruch**: koła i gąsienice toczą się z przejechaną drogą, anteny kołyszą się w jeździe, zbieracz wierci, flaga powiewa, dźwigi jeżdżą. Renderer przechyla pojazdy i kroczące maszyny zgodnie ze stokiem pod nimi (piechota stoi prosto).
- **Scalanie części** (`createBaker`): przy tworzeniu modelu wszystkie nieruchome części jednej ruchomej grupy (kadłub, wieża, lufa, koło…) łączą się w jedną bryłę z jednym wspólnym materiałem „lakieru”. Kolor, chropowatość, metaliczność i świecenie (okna, lampy, rdzenie energii) każdej części są zapisane w wierzchołkach, a świecenie rośnie nocą jak w pozostałych materiałach. To, które części się ruszają, ustala próbna animacja świeżego modelu (jazda, celowanie, strzał, budowa, praca, ładunek, otwarta brama). Takie same zestawy części (np. wszystkie koła jezdne) mają jedną wspólną bryłę, więc całe wojsko dalej rysuje się w kilkudziesięciu partiach instancingu.
- **Wystawa**: `prototyp-modele.html` pokazuje wszystkie modele jednej frakcji obok siebie. Ruch i ogień, noc, kliknięcie przybliża model.
- Pomiary: czołg 3,8 tys. trójkątów i 19 brył po scaleniu (14 to koła). Armia 10 typów: 45 partii. Test bitwy 206 modeli: 238 rysowań (limit 250), 87 partii. W grze (Cichy Horyzont, początek): 169 kl./s, 74 rysowania.

## Reflektory 3D (wersja 0.65, 2026-10-04)

Wcześniej światła jednostek były płaskimi teksturami 2D: rozjaśniony prostokąt z namalowanym wachlarzem, płaski na wysokości środka plamy, który nie oświetlał modeli.

- **Prawdziwe reflektory** (`scene-fx-3d.js`, `nightLights`): stała pula 8 świateł typu spot dla pojazdów naziemnych (promień 12 i więcej) najbliżej środka widoku. Światło świeci z przodu kadłuba wzdłuż kierunku jazdy, w dół, na teren przed pojazdem, i oświetla teren oraz wszystkie modele w snopie (bez cieni). Liczba świateł się nie zmienia, więc shadery nie są przebudowywane.
- **Latarki piechoty**: druga stała pula 6 świateł typu spot dla żołnierzy najbliżej środka widoku: wąski (0,26 rad), krótki (90) i chłodno biały snop z wysokości piersi, z własnym, cieńszym stożkiem w powietrzu. Pozostali żołnierze mają wąski wachlarz na terenie.
- **Snop w powietrzu**: przed każdym takim reflektorem otwarty stożek, addytywny, gasnący z długością i ku krawędzi. Nocą ledwie widoczny, w ulewie, śnieżycy i burzy piaskowej wyraźny (siła rośnie z natężeniem pogody).
- **Światło na terenie**: pozostałe pojazdy (wachlarz), latarki piechoty (węższy i krótszy wachlarz), plamy pod budynkami i poświata map są siatkami 12 × 12, które shader wierzchołków układa na terenie (dwuliniowo z tekstury mapy wysokości, tej samej co pogoda: `weather3d.ground`).
- Przełącznik „Oświetlenie dnia i nocy, światła” w ustawieniach grafiki wyłącza też reflektory. Pomiar: Cichy Horyzont nocą w burzy piaskowej, 8 reflektorów: 168 kl./s, 107 rysowań; z 6 latarkami piechoty: 168 kl./s, 88 rysowań (inna liczba jednostek w kadrze).

## Teren 3D: trawa i kamienie (wersja 0.66, 2026-10-05)

Grunt planszy 3D to wciąż jedna malowana tekstura (barwy, plamy, zmarszczki wydm, pęknięcia lawy, żyły) pod rzeźbą terenu, ale bez rzeczy, które powinny mieć bryłę.

- **Bez obiektów 2D na gruncie** (`RTS.bareGround` podczas malowania gruntu 3D): źdźbła trawy (Lumeria, Aerion), kamyki i kości (wydmy, złote piaski, bliźniacze słońca), okruchy skał (Pyrrhos), trawa i kamyki przy brzegach jezior (`scene-fx.js`), żarzące się okruchy popiołu, rysy lodu i linie szronu (zamarznięty rój), rysy na skalnym gruncie przeszkód, linie grzbietów wydm, przerywane ślady dróg, plac z płytami i obrysami pod HQ, drobinki szumu.
- **Rozrzut 3D** (`webgl3d/scatter-3d.js`, napisany od nowa): kępy trawy (9 zakrzywionych źdźbeł), wysoka trawa, trzcina z kolbami, paprocie, krzaki (gałązki i liście), kamienie okrągłe i kanciaste (bryły z losowo przesuniętymi wierzchołkami), płyty skalne, żwir, zaspy, odłamki lodu, świecące grzyby, kości, złom, żarzące się okruchy. Zestaw i kolory zależą od biomu i motywu mapy.
- **Rozmieszczenie**: pole łąk z ziarna mapy — trawa rośnie tam, gdzie pole jest wysokie, żwir i kamienie na gołym gruncie między łąkami, wszystko w skupiskach. Brzegi jezior: trzcina i kamyki w pasie wzdłuż wody (na lodzie same kamyki). Na grzbietach wydm też (blokują ruch, ale to piasek). Każdy obiekt ma własny odcień (kolor instancji).
- **Wiatr**: trawa, trzcina, paprocie i krzaki kołyszą się w shaderze wierzchołków (`tick()` co klatkę); w burzy piaskowej i ulewie mocniej, w śnieżycy trochę mocniej.
- Gęstość: ok. 17–23 tys. obiektów na mapę 3360 × 2160 (wcześniej 4–9 tys.), ustawienie „Detale terenu i roślinność” dalej ją zmniejsza. Cienie rzucają tylko większe rzeczy. Pomiar: 160–164 kl./s na mapach Cichy Horyzont, Świetlisty Gąszcz, Wiszące Szczyty i Biały Przesmyk (ok. 0,85–0,97 mln trójkątów), test bitwy 206 modeli: 241 rysowań (limit 250).

## Dokładniejsza przyroda (wersja 0.67, 2026-10-05)

- **Moduł `webgl3d/nature-detail-3d.js`** (z zestawem kształtów z `models-detail-3d.js`): zwierzęta, ptaki, ryby, bestie oraz kształty skał, iglic, kryształów i grzybów dla przeszkód i złóż (`models-3d.js`).
- **Zwierzęta**: tułów jako bryła przez pierścienie, brzuch, szyja, głowa z pyskiem, nosem, oczami i uszami (szpiczaste, długie, okrągłe), nogi z udem, kolanem, goleniem i kopytem lub łapą (chód), ogon (merda); jeleń z rozgałęzionym porożem, lis z puszystą kitą z białą końcówką (polarny biały), zając z długimi uszami, jaszczurka z grzebieniem na grzbiecie, palcami i wygiętym ogonem. Ptak: tułów, głowa, dziób, skrzydła z dwóch części (zewnętrzna macha mocniej), ogon wachlarzem. Ryba: tułów, oczy, płetwa grzbietowa, płetwa ogonowa.
- **Bestie**: drapieżnik (kolce na grzbiecie, róg, szczęka z kłami, świecące oczy), mamut (garb, kudły, trąba, zakrzywione ciosy), bazaltowy pająk (tułów i odwłok, żarzące się szwy, żuwaczki, osiem nóg z dwóch części), wydmowa paszcza (krater z bryłek piasku, żebrowana gardziel, zakrzywione zęby).
- **Skały**: sześć wspólnych kształtów nieregularnych kamieni (wierzchołki dwudziestościanu wypchnięte i wciśnięte, kilka dużych wypukłości, spłaszczony spód) dla głazów przeszkód i złóż rudy i gazu; iglice jako skręcone, nierówne graniastosłupy. Kryształy: sześcioboczne z ostrym grotem, w skupiskach z mniejszymi u podstawy. Olbrzymie grzyby: wygięty trzon z rozszerzoną stopą, kapelusz z rantem, blaszki pod spodem, jasne kropki.
- **Drzewa** (rozrzut, `scatter-3d.js`): pień i korona jako osobne rysowania instancji; liściaste i świerki (Aerion), ośnieżone świerki (lód), akacje i suche drzewa (piasek), zwęglone kikuty (popiół, Pyrrhos), świecące drzewa grzybowe (Lumeria). Korony kołyszą się z wiatrem. Z dala od baz (HQ 320, inne budynki 140) i przekaźników (160), żeby było gdzie budować.
- **Scalanie**: zwierzęta, ptaki i ryby (jeden kształt na gatunek), złoża (jeden na rodzaj i etap) i wysokie przeszkody (iglice, gaje — rysowane pojedynczo, żeby mogły prześwitywać) są scalane jak jednostki; kopie materiałów prześwitujących przeszkód zachowują wykończenie i świecenie lakieru.
- **Wystawa** `prototyp-modele.html`: zakładka „Przyroda” (zwierzęta, bestie, złoża w etapach 6/3/1/0, przeszkody).
- Pomiar: Wiszące Szczyty, 1280 × 720, pełna klatka z kartą graficzną 7,9 ms (mediana), ok. 1,07 mln trójkątów; test bitwy 206 modeli: 237 rysowań (wcześniej 241).

## Wraki, ruiny i wyspy (wersja 0.68, 2026-10-05)

- **Moduł `webgl3d/props-detail-3d.js`** (zestaw kształtów z `models-detail-3d.js`, kamienie i kończyny z `nature-detail-3d.js`): przeszkody inne niż skała, latające wyspy i wraki zniszczonych jednostek. Rozmiary z podniesionego gruntu przeszkody (w × h), więc nic nie wisi nad terenem, po którym da się chodzić.
- **Rozbity statek**: kadłub przez pierścienie (spłaszczony spód, zwężenie ku dziobowi), szwy paneli, pas, szklana kabina; wyrwana rufa z żebrami, stępką i oderwanymi płytami; urwany statecznik; silnik leżący obok z dyszą i obręczami; piasek i kamienie przy kadłubie, szczątki dookoła. **Pole szczątków**: wygięte płyty z żebrowaniem, poskręcane belki, rury z kołnierzem, obudowy maszyn.
- **Truchło obcego**: kręgosłup z kręgów zwężający się w ogon, łukowate żebra zawinięte do środka (największe pośrodku), czaszka z oczodołami, szczęką i zakrzywionymi rogami.
- **Ruiny**: dwa mury z warstw kamieni (przesunięte co drugą warstwę, górne wykruszone), cztery kolumny z bazą (wysokie z kapitelem, niskie złamane, bęben leżący obok), łuk, gruz. **Żywica**: bursztynowe bryły z zatopionymi drobinami i zaciekami. **Jaja**: obręcz gniazda, żyły, jaja jako bryły obrotowe, pęknięte otwarte ze światłem w środku. **Przetwórnia**: hala z dachem i oświetlonymi oknami, dwa zbiorniki z obręczami i drabinami, rury, kominy, pomost do zasobnika, lampy.
- **Latające wyspy**: trzy nieregularne skały wiszące ostrzem w dół (płaska strona do góry), pokrywa mchu lub trawy z miękkim brzegiem, korzenie zwisające za krawędź; na wierzchu grzyby (Lumeria) albo sosenki i głazy (Aerion).
- **Wraki jednostek**: przewrócony, osmalony kadłub z wieżą i lufą, porozrzucane płyty, koło, żarzący się węgielek — z jednostkowych kształtów skalowanych, więc każdy wrak w bitwie dzieli te same bryły (instancing).
- **Scalanie**: każda przeszkoda poza skałami (skała, wychodnia, płaskowyż dzielą kształty kamieni) i każda wyspa jest scalana w kilka brył. Test bitwy 206 modeli: 239 rysowań (limit 250); Wydmy Bliźniaczych Słońc: 164 kl./s.
- **Wystawa** `prototyp-modele.html` → Przyroda: nowe przeszkody, obie wyspy, wraki trzech rozmiarów.

## Światło budynków (wersja 0.69, 2026-10-05)

Wcześniej każdy budynek nocą dostawał jedną okrągłą plamę z tekstury (gradient od środka, którego nie widać, bo tam stoi budynek), w jednym kolorze dla wszystkich.

- **Poświata okien** (`scene-fx-3d.js`, tekstura `spill` liczona w kodzie): kwadratowy obrys budynku (podstawa modelu ok. 1,6 × promień), najjaśniej przy ścianach (trochę mocniej pośrodku ścian, gdzie są okna), gasnąca na zewnątrz z zaokrąglonymi narożnikami; ułożona na terenie jak pozostałe światła.
- **Wejście i lampy**: jaśniejsza, ciepła plama przed frontem budynku (+X, tam są drzwi, bramy i wrota modeli), a budynki o promieniu 40 i więcej mają słabsze plamy przy tylnych narożnikach.
- **Kolor według budynku**: ciepły (baza), chłodny biały (laboratorium, stacja łączności), turkus energii (reaktor, akumulator, generator osłon), ogień (kuźnia), biel (punkt medyczny).
- **Prawdziwe lampy**: 8 zamiast 6, nad wejściem i trochę przed ścianą, w kolorze budynku; oświetlają front i jednostki przed nim.
- Test renderera 3D: noc ciemniejsza od dnia (11 wobec 53), bitwa 239 rysowań. Cichy Horyzont nocą z bazą: 158 kl./s.

## Okna budynków (wersja 0.70, 2026-10-05)

Wcześniej okna były płytkami turkusowego, świecącego szkła (tego samego co celowniki pojazdów), świecącymi jednakowo w dzień i w nocy.

- **Budowa okna** (`windows()` w `models-detail-3d.js`): ciemna rama, szyba, parapet; okna od 3 jednostek wysokości albo 3,5 szerokości mają szprosy (pion i poziom).
- **Materiały okien** (zestaw strony w `models-3d.js`): `window` (ciepłe wnętrze; w Dominium pomarańczowe), `windowCool` (chłodne ekrany), `windowOff` (ciemne). Szyba za dnia to ciemne szkło o niskiej chropowatości i wysokiej metaliczności (odbija niebo i słońce). Które okna są ciemne (ok. 20%) i chłodne (ok. 12%), wynika z położenia okna, więc wzór jest stały dla budynku.
- **Świecenie tylko nocą**: materiały okien mają znacznik `nightOnly`; ich świecenie idzie krzywą `windowCurve(night)` (zero w dzień, od zmierzchu rośnie do pełnego w nocy), a nie wspólnym czynnikiem świateł (0,6 + 1,6 × noc), który zostaje dla lamp, rdzeni energii i celowników. W scalonym lakierze znacznik jest trzecią składową atrybutu `finish`, a shader wybiera między `glowScale` i `windowScale`.
- Okna w ten sam sposób: świetliki warsztatu i hali fabryki (z ramą i szprosami), sterówka wieży hangaru (ze słupkami w narożnikach), okienka bramy koszar, kabina dźwigu placu odzysku. Kopuły (HQ, laboratorium) i celowniki pojazdów zostają szklane.
- Test renderera 3D przechodzi (noc 11 wobec dnia 53, bitwa 239 rysowań).

## Rój w 3D (wersja 0.71, 2026-10-05)

- **Moduł `webgl3d/swarm-detail-3d.js`** (zestaw kształtów z `models-detail-3d.js`) zastępuje proste bryły Roju w `models-3d.js` (te same funkcje: budynki, strażnicy, pełzacz, kroczące, latacze; te same odmiany jednostek w `SWARM_UNITS`).
- **Odłamki**: wspólne kształty pięciościennych, zwężających się kamieni o nierównych ścianach z ukośnie wyszczerbionym szczytem i ostrzem (trzy całe, dwa odłamane nisko).
- **Budynki**: schodkowy sześciokątny cokół (dwa poziomy), centralny monolit z pięcioma rowkami, pasem drużyny i jasną wargą pod koroną; pierścień mniejszych monolitów odchylonych na zewnątrz (część odłamanych) z opaskami drużyny; odłamki leżące u podstawy. Rdzeń (HQ): sześć monolitów i przypory do środka. Monolit: pięć odłamków krążących powoli wokół pasa i falujących w górę i w dół. Wieżyczka i obrona przeciwlotnicza: korona ostrzy na podstawie, obracana do celu.
- **Jednostki**: tułów jako kanciasta bryła (sześcioboczne pierścienie), płyty barkowe, pas drużyny, soczewka w ciemnej oprawie, garb; nogi z udem, kolanem i goleniem zakończonym ostrzem; kolce (rakietowiec, robot), grzbiet z ostrzy (pluwacz). Pełzacz: trzy segmenty pancerza, żuwaczki, sześć nóg. Kroczące maszyny: długi tułów z rowkiem i grzebieniem, płyty boczne, garb (kolos), czujniki; nogi z kolanami i stopą z odłamka; broń: kolec, podwójne ostrza, szpikulec. Latacze: tułów, dwie pary skrzydeł jak ostrza, kolec ogonowy.
- **Obsydian**: jaśniejszy i gładki (szorstkość 0,3), prawie niemetaliczny — przy metaliczności bez mapy otoczenia ściany wychodziły czarne i nie było widać faset. Bez poświaty; kolor drużyny jest jedynym kolorem.
- Test renderera 3D: baza Roju rysuje się (jasność 85), bitwa 239 rysowań.

## Budynki specjalne aktu III (wersja 0.72, 2026-10-05)

Akt III nie ma własnych typów budynków: Serce Roju to brama Roju w rozdziale IX, gniazda — bramy Roju w rozdziale VIII, stacja orbitalna — budynek Dominium (`uplink`), Szczyt — przekaźnik trybu król wzgórza. W 3D dostały własne modele (`webgl3d/act3-detail-3d.js`, z odłamkami i kończynami `swarm-detail-3d.js`).

- **Misja na planszy**: `models3d.setMission(game.missionId)` (renderer przy `setGame`); brama Roju w `colony9` buduje się jako Serce, w `colony8` jako gniazdo. Scalanie ma osobny klucz dla wariantu.
- **Serce Roju**: dwupoziomowy siedmiokątny cokół ze świecącymi szczelinami, osiem wielkich odłamków odchylonych do środka (klatka), z opaskami drużyny; rdzeń — kryształ z przesuniętymi wierzchołkami świecący kolorem drużyny w osłonie z obsydianowych płyt — bije podwójnym uderzeniem i się obraca; sześć żył z rdzenia do ziemi ze świecącą nicią; sześć odłamków krąży wokół klatki.
- **Gniazdo Roju**: kopiec pięciu obsydianowych brył, cztery otwory z obrzeżem, pierścień drużyny u podstawy, wieniec dwunastu kolców, strąki, anteny z odłamków (kołyszą się).
- **Stacja orbitalna** (każda, nie tylko w akcie III): ośmiokątna stopniowana platforma z pasem ostrzegawczym, sterownia z oknami, cztery baterie kondensatorów, kratownicowy maszt z dwoma pierścieniami celowniczymi i emiterem, antena talerzowa na obrotowej podstawie. Naładowanie (`info.charge` 0…1 z `e.strikeReady` i czasu odnowienia uderzenia) zapala kolejne kondensatory, przyspiesza pierścienie w trakcie ładowania, a gotowe uderzenie zapala emiter.
- **Szczyt**: na przekaźniku trybu król wzgórza wieża zagłuszacza — sześciokątny cokół, sześć zbieżnych słupów, cztery świecące talerze, kryształ rezonatora obracający się na szczycie.
- Wystawa `prototyp-modele.html` → Przyroda: rząd „akt III”. Nowy test (`tests/bundle-3d.test.js`): Serce i gniazdo różnią się od zwykłej bramy, stacja animuje się przy każdym naładowaniu, Szczyt ma wieżę. Test bitwy: 239 rysowań.

## Obiekty aktu II (wersja 0.73, 2026-10-05)

Cele aktu II (`game.act2`) były na planszy 3D tylko słupami światła z napisami (Act2Art beacons). Teraz mają modele (`webgl3d/act2-detail-3d.js`), stawiane przez `scene-life-3d.js` po odkryciu miejsca; słupy, pierścienie i napisy zostają.

- **Lądowisko ewakuacyjne** (IV, VI): betonowa płyta, pas ostrzegawczy, okrąg i litera H, dwanaście świateł biegnących w kółko, budka kontrolna z oknem i pasem, latarnia, rękaw wiatrowy kołyszący się na wietrze.
- **Obóz badaczy** (IV): trzy namioty z drążkami, skrzynie, generator z kominem, maszt z anteną (obraca się) i migającym światłem, lampy, stół z ekranami.
- **Archiwum sondy** (IV): na wpół zakopana obca sonda (kadłub przez pierścienie, stateczniki, świecąca kopułka i szwy), wydmy piasku; trzy pierścienie danych pojawiają się przy 0, 1/3 i 2/3 odczytu i kręcą się szybciej wraz z postępem.
- **Rdzeń danych** (IV): wrak z płyt i rury, świecący rdzeń z obręczami unoszący się i obracający; widoczny, gdy rdzeń leży na miejscu albo we wraku transportera.
- **Postoje konwoju** (V): betonowy plac, szlabany biało-czerwone, dwa maszty z reflektorami, tablica. **Latarnia Kestrel**: wieża w czerwone pasy, dom latarnika, galeria z balustradą, laterna, obracająca się lampa z dwoma snopami światła (słabymi w dzień, wyraźnymi nocą).
- **Kompleks Hefajstos** (VI): na węzłach sterujących maszyny według nazwy — ZAWÓR (gruba rura z kołnierzami, korpus, koło zaworu obracające się z przejmowaniem), TURBINA (obudowa z obręczami, wirnik szybki, gdy węzeł należy do Dominium), ŁĄCZNIK (trzy słupy, kule i wyładowania między nimi); rurociągi od Serca popiołu do każdego z tych węzłów, na podporach, po terenie.
- Wystawa `prototyp-modele.html` → Przyroda: rząd „akt II”. Nowy test (`tests/bundle-3d.test.js`) buduje i animuje wszystkie obiekty, rurociąg i maszyny węzłów. Test bitwy: 239 rysowań.

## Akt I (wersja 0.74, 2026-10-05)

Akt I (Szkolenie, I · Iskra na Eos, II · Archiwum pod lodem, III · Świt nad Nadir) toczy się zwykłymi jednostkami i budynkami; jego cele to przekaźniki. Fabuła (Stacja Ciszy, Latarnia Eos, archiwum w lodzie, Cytadela Węzła) nie miała na planszy obiektów. `webgl3d/act1-detail-3d.js`:

- **Przekaźnik** (wszystkie mapy): dwupoziomowy sześciokątny cokół, trzy szafki aparatury ze światłami w kolorze właściciela i kablami do masztu, kratownicowy maszt trójnożny ze stężeniami na czterech poziomach, latarnia właściciela na szczycie, anteny prętowe, obrotowa antena talerzowa (czasza, zastrzały, odbiornik, przeciwwaga). Strefa przejmowania i pierścień postępu zostały; przekaźnik jest teraz scalany, a części na ziemi (renderer kładzie je na terenie po jednej) mają znacznik `keep` i nie są scalane (nowa reguła w `createBaker`).
- **Punkty orientacyjne** na skałach map aktu I (`scene-life-3d.js` wybiera raz na grę skałę najbliżej środka mapy; w rozdziale I także skałę najbliżej centrum gracza), zamiast stosu głazów, z mniejszymi kamieniami na obrzeżu:
  - Szkolenie: **poligon Liry** — cztery tarcze strzeleckie, beczki, worki z piaskiem, drewniana wieża obserwacyjna, pachołki.
  - I: **Latarnia Eos** — kratownicowa wieża 150 jednostek z galerią i obracającą się laterną, panele słoneczne; ciemna (z rzadkim mignięciem), zapala się, gdy cele misji są spełnione (`game.campaignReady()`). **Stacja Ciszy** — kopuła zawalona w jednej trzeciej, odpadłe panele, na wpół zasypane moduły, skrzynie, zgięty maszt, wydmy.
  - II: **wrota archiwum** — półksiężyc lodowych bloków, stalowa rama ze świecącymi znakami, wrota z żebrami i znakiem, schody; wrota unoszą się po spełnieniu celów.
  - III: **Cytadela Węzła** — schodkowa ośmiokątna platforma, czterościenny obelisk ze świecącymi szwami, kable; trzy pierścienie energii pojawiają się przy każdej trzeciej części przejętych węzłów, korona zapala się przy wszystkich.
- Wystawa `prototyp-modele.html` → Przyroda: rząd „akt I”. Nowy test: przekaźnik zachowuje 60 części na ziemi i pokazuje postęp przejmowania, punkty orientacyjne budują się i reagują na stan. Test bitwy: 237 rysowań (przekaźniki scalone).

## Woda, mgła i pogoda (wersja 0.75, 2026-10-05)

- **Woda** (`scene-fx-3d.js`, `waterLook` na shaderze mgły wojny; jeziora, szczeliny lodu, świecące rozlewiska — nie lawa): fale w shaderze wierzchołków (tylko z dala od brzegu), druga warstwa zmarszczek z mapy normalnych w innej skali i kierunku (mniej powtarzalnego wzoru), odbicie nieba pod kątem (fresnel, kolor tła sceny), jaśniejsze płycizny (przezroczystość brzegu służy za głębokość), piana na linii brzegu z dwóch warstw szumu, kręgi od kropel w deszczu (trzy warstwy komórek, każda kropla w swoim miejscu i chwili).
- **Kałuże** (tylko teren, `TERRAIN` w `fogged()`): w ulewie na płaskim gruncie, gdzie szum ziarna mapy przekracza próg obniżany przez wilgotność — ciemne, prawie lustrzane (szorstkość 0,04), odbijające kolor nieba, z kręgami od kropel, gdy pada; wysychają razem z gruntem. Mokry grunt poza kałużami błyszczy umiarkowanie.
- **Śnieg na terenie i rozrzucie**: osiada najpierw płatami (szum), przy większej pokrywie wszędzie; iskierki połyskują i zmieniają się co chwilę. **Na modelach** (lakier `models-detail-3d.js`): ściany zwrócone do góry bieleją ze śniegiem (dachy, kadłuby, wieże; nie okna), w deszczu modele są ciemniejsze i błyszczące (`models3d.setWeather`).
- **Mgiełka** (`weather-3d.js`): 160 szerokich, miękkich płatów sunących nisko nad terenem z wiatrem, w kolorze nieba; w deszczu, śnieżycy i (słabiej) nocą, znika tuż przy kamerze.
- **Deszcz**: krople cieńsze, dłuższe w ulewie; zasłony deszczu — wysokie pasma smug w oddali (250 płatów obracanych do kamery, smugi spływające w dół); pierścienie rozbryzgów słabsze.
- **Pioruny**: rdzeń i niebieska poświata (druga warstwa, czterokrotnie szersza), pięć szybkich rozbłysków w jednym uderzeniu zamiast jednego, błysk z góry (światło kierunkowe bez cieni) oprócz światła punktowego, iskry i dym w miejscu uderzenia.
- Test renderera 3D przechodzi (noc z ulewą, bitwa 237 rysowań). Pomiar: Popielny Szlak w ulewie, 1280 × 720: 167–169 kl./s.

## Znaczniki rozkazów (wersja 0.75.1, 2026-10-05)

- **Błąd**: od 0.63 grunt planszy 3D maluje się raz (`ground3D`, podpis gruntu pusty), a przerywane trasy zaznaczonych jednostek z kółkiem celu były malowane w fazie `ground` (`render-canvas.js`), więc przestały się pojawiać. Pierścień kliknięcia rozkazu (efekt `command`) był rysowany w fazie `units`, której plansza 3D nie używa.
- **Poprawka**: `drawPaths()` (trasy i kółko celu) oraz `drawOrderMarks()` (trasy i pierścienie rozkazów ruchu i ataku) rysuje faza `overlay`, gdy widok ma `objects3D` (nakładka planszy 3D, odświeżana co klatkę i kładziona na terenie) — grubszymi, jaśniejszymi liniami, bo nakładka ma niższą rozdzielczość. Plansza 2D i WebGL rysują trasy jak dotąd w fazie `ground`.
- Sprawdzone w grze (Świetlisty Gąszcz, oddział sześciu jednostek, rozkaz ruchu).

## Samoloty (wersja 0.75.2, 2026-10-05)

- **Ślady**: silnik (`engine.js`) nie zapisuje śladów gąsienic i stóp dla jednostek latających (`flying`) — dotyczy wszystkich renderów.
- **Reflektory w powietrzu** (`scene-fx-3d.js`): cztery reflektory (`AIR_SPOTS`) przy samolotach najbliższych środka widoku, ustawione przez `aim()` na wysokości lotu (88 nad terenem): smuga światła (stożek mgiełki) biegnie w powietrzu od nosa w dół i do przodu, na ziemi leży plama światła. Siła rośnie z nocą, smuga gęstnieje w deszczu i śniegu.
- **Światła pozycyjne** (`models-detail-3d.js`, `navLights`): czerwone na końcu lewego skrzydła, zielone na prawym, biały stroboskop na ogonie migający krótko co ok. sekundę (przesunięty o identyfikator jednostki) — myśliwiec, bombowiec, dron.
- **Smugi silników**: krótki żar z dyszy (nie dron) i jasna para rozpływająca się za lecącym samolotem (`airTrails`, tylko jednostki w ruchu blisko widoku).

## Samoloty: modele (wersja 0.76, 2026-10-05)

- **Narzędzia** (`models-detail-3d.js`): `fuselage()` — kadłub przez pierścienie z przesunięciem w pionie (12 boków u Kolonii, 6 u Dominium); `wingGeo()` — skrzydło lub usterzenie przez przekroje profilu lotniczego (krawędź natarcia, grubszy wierzch, cienka krawędź spływu) z cięciwą, grubością, rozpiętością i wzniosem na każdym przekroju; `jet()` — silnik w gondoli (pierścień wlotu, ciemny wentylator, kołpak, dysza, żar); `missile()` — rakieta na pylonie; `canopy()` — przyciemniana kabina (`k.canopy`, słaba poświata przyrządów) z ramą.
- **Myśliwiec**: przycięta delta (Dominium: ostra delta z przednim usterzeniem), usterzenie poziome, dwa stateczniki pionowe pochylone na zewnątrz z pasem barwy drużyny, boczne wloty, owiewka radaru z rurką Pitota, cztery rakiety, dysza z dopalaczem.
- **Bombowiec**: skrzydła z wzniosem i załamaniem, cztery silniki na pylonach, usterzenie T (Dominium nisko), klapy, drzwi komory bombowej, wieżyczka grzbietowa obracana do celu (`aim`), tylny strzelec, przeszklenie bombardiera.
- **Dron**: korpus z pasem drużyny, okno kamery, głowica kamery rozglądająca się, cztery wirniki w osłonach z krzyżakiem i silnikiem, łopaty po trzy, płozy; w locie pochyla się do przodu.
- Części nieruchome są scalane jak dotąd — bitwa w teście nadal 237 rysowań.

## Pojazdy naziemne (wersja 0.77, 2026-10-05)

- **Nowe części** (`models-detail-3d.js`): `smokeLaunchers()`, `stowage()` (skrzynia z pasami), `jerry()` (kanister), `towHooks()`, `driverHatch()` (właz z trzema peryskopami na pochyłej płycie), `grille()`, `mirror()`, `bullbar()`, `windscreen()` (przyciemniana szyba `k.canopy` w ramie, słupek, dwie wycieraczki, pochylenie), `arch()` (łukowe nadkole). Kładą części prosto w rodzicu, bez własnych grup, bo scalanie łączy części nieruchome w obrębie rodzica — nowe grupy dodawałyby paczki rysowania.
- **Gąsienice**: ogniwa także na dolnym odcinku, dwie rolki podtrzymujące pod górnym, grzebień prowadzący. **Koła**: 12 klocków bieżnika na oponie (obracają się z kołem, w jego scalonej części — za darmo), nadkola łukowe zamiast płaskich błotników.
- **Gąsienicowe**: czołg — osłony boczne z płyt, skrzynie i kanistry, właz kierowcy, zapasowe ogniwa, haki, wyrzutnie dymne, kosz z relingami i zwiniętą plandeką na tyle wieży, karabin dowódcy, karabin sprzężony; czołg ciężki — skrzynie, właz, haki, wyrzutnie, kanistry na tyle wieży; artyleria — właz, skrzynie, hak, pociski na pokładzie, wyrzutnie i skrzynka kierowania ogniem z okienkiem; niszczyciel — wyrzutnie, skrzynie, kanistry, haki, zapasowe ogniwa.
- **Kołowe**: szyby `windscreen()` zamiast świecących `k.glass` (ciężarówka, transporter, łazik, zbieracz, przeciwlotniczy, zwiadowca), boczne okna przyciemniane; atrapy chłodnic, lusterka, zderzak i stopnie ciężarówki, zbiorniki paliwa, lampy na belce dachowej; transporter — płyty pancerza na burtach, relingi i bagaż na dachu, kanistry i klamki na rampie, wyrzutnie; zwiadowca — belka lamp na klatce, wydechy, kanistry, felga koła zapasowego.
- Bitwa w teście: nadal 237 rysowań.

## Słońce, księżyc i noc (wersja 0.78, 2026-10-05)

- **Niebo** (`webgl3d/sky-3d.js`): kopuła wokół kamery (shader, bez mgły), rysowana po nieprzezroczystych obiektach z testem głębokości, więc liczona tylko tam, gdzie niebo widać (+1 rysowanie). Gradient horyzont → zenit z palety zależnej od wysokości słońca (noc, niebieska godzina, zachód, złota godzina, dzień); tarcza słońca, korona i szeroka poświata, mocniejsza wzdłuż horyzontu o zachodzie; nocą gwiazdy (siatka komórek na sferze, migotanie), pas galaktyki i księżyc — tarcza oświetlona z boku (faza przed pełnią), ciemniejsze morza, halo; chmury w perspektywie, oświetlone słońcem albo światłem księżyca, gęstsze w złą pogodę. Mgła pogody i błysk pioruna barwią też kopułę; w zamieci i ulewie gwiazdy, księżyc i słońce znikają.
- **Światło** (`three-renderer.js`, `light()`): jedno światło z cieniem jest słońcem albo księżycem. Słońce: kolor z palety (białe → złote → pomarańczowe → czerwone), siła maleje od wysokości 0,3 do −0,12; księżyc: chłodny, z własnego kierunku nisko nad horyzontem (ok. 17°, długie cienie), od −0,05 do −0,3; zmiana w niebieskiej godzinie, gdy oba są słabe. Światło otoczenia: niebieskie nocą, błękitne w dzień, ocieplone kolorem horyzontu o zmierzchu; odbicie od ziemi ciemnieje nocą. Mgiełka w oddali i tło mają kolor horyzontu; woda odbija tę barwę.
- **Cienie chmur**: `cloudShade()` wstawia do shaderów (teren, rozrzut, woda — przez `fogged()`; modele — w lakierze `models-detail-3d.js`) przyciemnienie światła kierunkowego według tego samego szumu co chmury na niebie, w punkcie świata (z macierzy widoku); płyną z wiatrem, słabsze przy zachmurzeniu (`options.cloudShadows: false` wyłącza).
- Test renderera 3D przechodzi (bitwa 238 rysowań).

## Reflektory budynków (wersja 0.79, 2026-10-05)

- **Reflektory** (`scene-fx-3d.js`, `FLOODS` = 10): po dwa na przednich narożnikach najbliższych oświetlonych budynków (na wysokości ok. 0,55 promienia), skierowane o ±0,6 rad od frontu i w dół, szerokie (kąt 0,62, miękka krawędź 0,8), w kolorze budynku (`BUILDING_LIGHT`); widoczna smuga jak przy pojazdach (`beamAt()` — wspólne ustawianie światła i smugi, `aim()` z niego korzysta). Budynki bez prawdziwych reflektorów rzucają na ziemię te same wachlarze jako naklejki.
- **Światło fasady** (`LAMPS` = 5, było 8): punktowe przed frontem, blisko ściany (1,25 promienia + 8), z mocą w jednostkach fizycznych jak reflektory (480 zamiast 1,8 — dawne światło przy drzwiach było praktycznie niewidoczne) — oświetla ściany budynku i jednostki przed nim.
- **Na ziemi**: kwadratowa poświata wokół podstawy (naklejka `spill`) i plama przed drzwiami zastąpione miękką, okrągłą poświatą okien.
- Liczba świateł w scenie: 15 zamiast 8 dla budynków (cieniowanie bez zmian w liczbie rysowań; bitwa w teście 238).

## Bez ostrych snopów światła (wersja 0.79.1, 2026-10-05)

- **Błąd**: reflektory dostaje tylko 10 najbliższych narożników budynków; pozostałe dostawały naklejkę-wachlarz (tekstura `cone`: trójkąt z twardymi krawędziami, jaśniejsza od prawdziwego światła). Przy ruchu kamery budynek przechodził między reflektorem a naklejką i przez chwilę świecił „zwykłym snopem”.
- **Poprawka**: budynek bez prawdziwego reflektora rzuca miękką, owalną plamę (`pools`) tam, gdzie reflektor oświetla ziemię, słabiej (0,12 × noc). Tekstura `cone` (dalsze pojazdy, latarki) liczona piksel po pikselu: miękkie brzegi w poprzek wachlarza, początek nieco przed lampą, zanik z odległością.
- Światło księżyca pada z wysokości ok. 40° w stronę tarczy (tarcza na niebie dalej nisko, ok. 17°): przy niskim świetle wzgórza rzucały cienie przez pół mapy.

## Wszystkie światła nocy naraz (wersja 0.80, 2026-10-05)

- **Błąd**: światła nocy były stałą pulą świateł Three.js (8 reflektorów pojazdów, 6 latarek, 4 reflektory samolotów, 10 reflektorów i 5 świateł fasad budynków) dawaną obiektom najbliższym środka kamery; reszta miała naklejki na ziemi. Przy ruchu kamery światła przeskakiwały z obiektu na obiekt — teren i modele nagle jaśniały lub ciemniały.
- **Teraz** (`webgl3d/night-lights-3d.js`): każde światło klatki to wiersz w teksturze (pozycja i zasięg, kierunek i stożek, kolor × moc; do 128 najbliższych środka widoku, wygaszane ku brzegowi siatki). Siatka 48 × 48 komórek wokół środka widoku (rozmiar komórki rośnie z oddaleniem) wymienia światła sięgające komórki — do 24, przy nadmiarze odpadają najsłabsze w tej komórce. `nightLightShade()` dodaje w shaderach terenu, rozrzutu, wody (`fogged()`) i modeli (lakier) światło rozproszone tych świateł: zanik jak w Three.js (moc / odległość^1,3, łagodne odcięcie przy zasięgu), miękkie stożki, te same moce co dawne światła. Smugi w powietrzu — jedno rysowanie instancjonowane dla wszystkich reflektorów.
- `scene-fx-3d.js` tylko zbiera światła klatki (`lights.spot()`, `lights.point()`): budynki — dwa reflektory na przednich narożnikach i światło fasady, pojazdy — reflektor, piechota — latarka, samoloty — reflektor z nosa. Na ziemi zostały tylko miękka poświata okien i blask mapy (gaje, świecące stawy, lawa); usunięte naklejki wachlarzy i kwadratowej poświaty.
- W scenie nie ma już świateł punktowych i reflektorów Three.js poza słońcem/księżycem i błyskiem pioruna. Test: bitwa 238 rysowań; prototyp ok. 170 kl./s.

## Strzały samolotów (wersja 0.80.1, 2026-10-05)

- **Błąd**: efekt strzału (`game.effects`, `kind: "shot"`) ma tylko punkt strzelca i celu, więc plansza 3D rysowała każdy strzał od 14 nad ziemią do 10 nad ziemią — samoloty (lecące 90 nad ziemią) strzelały spod siebie, a strzały w samoloty trafiały w ziemię.
- **Silnik** (`engine.js`): strzał niesie `air` (strzelec lata), `airTarget` (cel lata) i `bomb` (bombowiec); renderery 2D ich nie używają.
- **Plansza 3D** (`three-renderer.js`): strzał z samolotu startuje z wysokości lotu, myśliwca — z nosa (16 przed środkiem), dwiema cieńszymi, krótszymi smugami po bokach, po prostej (bez łuku); bombowiec zrzuca bombę spadającą z przyspieszeniem (wysokość ∝ k²), z dymem, bez błysku wylotu, z wybuchem jak rakieta; strzał w samolot kończy się na jego wysokości (iskry w powietrzu).

## Wybuchy (wersja 0.81, 2026-10-05)

- **Kula ognia** (`three-renderer.js`): dwudziestościan (podział 4) z shaderem — powierzchnia przesunięta szumem (duże kłęby i mniejsze na nich, kłębiące się w górę), kolor z „temperatury” (szum, zwrot ku kamerze, czas: biało-gorący środek → żółty → pomarańczowy → ciemnoczerwony → dym), miękkie brzegi (objętość, nie skorupa), rozpad od chłodniejszych części; rośnie szybko (krzywa sześcienna), wznosi się i wydłuża ku górze. Każdy wybuch ma własny zarodek szumu.
- **Fala uderzeniowa**: cienki, miękki pierścień na ziemi (shader na kwadracie), **rozbłysk**: duszek z gradientem przez pierwsze ~0,15 s.
- **Cząstki** (`scene-fx-3d.js`): iskry (szybkie, opadające), żar (wolny, z oporem, 1,2–2,2 s), odłamki (ciemne, rzucone w górę, spadające), słup dymu (kłęby z opóźnieniem do 0,7 s, ciemne, rosnące), fala pyłu przy ziemi (w kolorze ziemi, rozchodzi się i zwalnia). Cząstki dostały opóźnienie (ujemny wiek — czeka niewidoczna) i opór (`drag`); liczba rośnie z wielkością wybuchu.
- **Światło**: przez pierwsze ~0,35 s wybuch jest światłem punktowym na liście świateł nocy (`night-lights-3d.js`), także w dzień — oświetla teren i modele wokół.
- **W powietrzu**: silnik zaznacza wybuch zniszczonego samolotu (`air`); kula, rozbłysk i cząstki są na wysokości lotu (bez pierścienia i pyłu), odłamki spadają.

## Ukształtowanie terenu (wersja 0.82, 2026-10-06)

- **Rzeźba** (`webgl3d/relief-3d.js`): własna mapa wysokości planszy 3D, komórka 6 jednostek (było 12, wspólne z rendererem WebGL; `webgl/terrain-height.js` bez zmian). Pagórki: garby z szumu z przesunięciem dziedziny (bez siatki), grzbiety z szumu „grzbietowego” na części z nich, drobne nierówności; siła zależna od biomu (lód 0,75, pył 1, popiół 1,25). Przeszkody: **mesa** — urwisko od nieco wewnątrz krawędzi prostokąta (zaokrąglone rogi, krawędź poszarpana szumem) na zewnątrz, trzy półki warstw, płaski wierzch z lekkim garbem, piarg u stóp; **wychodnia, skała** — strome, guzowate pagóry; **iglica** — ostry szczyt z poszarpanym obrysem, grzbietami i żlebami; gaje, jaja, wraki, ruiny itd. — łagodne kopce jak dotąd; wody jak dotąd, wydma ma grzbiet.
- **Skała**: na komórkę udział gołej skały (strome zbocza, urwiska, szczyty) → atrybut wierzchołków `rock`; shader terenu (`GROUND_COLOR`, `TERRAIN`) miesza kolor ziemi z kamieniem: średni kolor ziemi mapy (`rockTint`, ciemniejszy i szarszy — rozciągnięty malunek ziemi nie pasuje do ściany), poziome warstwy wg wysokości, ziarno wzdłuż ściany i w pionie; na skale nie ma kałuż.
- Kafle terenu nadal 720 × 720 (tyle samo rysowań), 4 razy więcej wierzchołków. Test: bitwa 238 rysowań, kursor → plansza → kursor: błąd poniżej 0,1 px; prototyp ok. 155–160 kl./s.

## Drzewa i roślinność (wersja 0.83, 2026-10-06)

- **Cieniowanie w geometrii** (`scatter-3d.js`): rośliny i kora mają kolory wierzchołków (`paint()`, `merge()` przenosi kolor) mnożone przez kolor materiału i odcień egzemplarza — źdźbła ciemne u nasady, korony ciemniejsze od spodu i w środku, końce gałęzi jaśniejsze, kora ciemniejsza przy ziemi. Bez nowych rysowań.
- **Drzewa**: sosna — 7 pięter, co drugi punkt obrzeża wciągnięty (postrzępione końce), obrzeże opadające, piętra obrócone; śnieg leży na co drugim piętrze; liściaste — pień z korzeniami i trzema konarami, korona z 12 guzowatych skupisk na kopule; akacja — pień rozgałęziony w cztery konary, parasol z pięciu płaskich, postrzępionych warstw (spód ciemny); martwe — pień, korzenie i gałęzie rozgałęziające się dwukrotnie; grzyb — blaszki pod kapeluszem, korzenie.
- **Rośliny**: trawa 11 źdźbeł, wysoka trawa 14 z kłosami, paproć — 7 pierzastych liści (oś z listkami malejącymi ku końcowi), krzew — 13 skupisk liści na łodyżkach, trzciny z brązowymi kolbami; **kwiaty** (nowe, dwa rodzaje: różowo-żółte, biało-fioletowe; materiał biały, kolory w wierzchołkach) na łąkach Aerionu i trawiastych map pyłu, paprocie także na Aerionie.
- **Galeria** (`prototyp-modele.html`, Przyroda): rząd drzew i roślin (`scatter.specimens()`).

## Zwierzęta i ptaki (wersja 0.84, 2026-10-06)

- **Czworonogi** (`nature-detail-3d.js`, `quadruped()`): tułów z 8 przekrojów po 12 boków (zad, udźce, talia, klatka, kłąb), szyja z dwóch odcinków zgiętych w połowie, głowa z 6 przekrojów (czaszka, policzki, kufa, nos), oczy z błyskiem; nogi: masa łopatki lub udźca, odcinek górny do łokcia (z tyłu kolana), osobny staw z odcinkami dolnymi (przód: przedramię i nadpęcie, tył: podudzie ze stawem skokowym do tyłu i śródstopie), kopyto (zwężony walec) albo łapa. Chód: pary po przekątnej, dolne odcinki składają się w wymachu; kicanie (`hop`) — tylne nogi razem, przednie razem, łuk tułowia; w spoczynku oddech, uszy strzygą co jakiś czas. Opcje: `bib`, `muzzle`, `rump`, `earTip`, `paws`, `haunch`, `hop` (dotychczasowe drapieżniki i mamut działają jak dotąd, z nowym tułowiem i nogami).
- **Jeleń**: lustro, poroże z wygiętej tyki z czterema odnogami; **lis**: śliniak i gardło, kufa, końce uszu, skarpetki, łapy, puszysty ogon z 6 przekrojów; **zając**: duże udźce, łapy, końce uszu, kicanie.
- **Jaszczurka**: płaski tułów, głowa-klin, wyłupiaste oczy, plamy, osobny ogon (wije się przeciwnie do tułowia), nogi z łokciem w bok i czterema palcami na ziemi. **Ptak**: okrągły tułów, jaśniejsza pierś i spód skrzydeł, dziób z dwóch części, schowane nogi, ogon z 7 piór, skrzydło z zaokrągloną krawędzią i dłonią z 5 lotkami; lot: ok. 60% czasu machanie (dłoń opóźniona), reszta szybowanie. **Ryba**: płetwy piersiowe, rozwidlony ogon, jaśniejszy brzuch.

## Tylne nogi zająca (wersja 0.84.1, 2026-10-06)

- `quadruped()`: opcja `longFeet` — tylna noga zająca: udo jako spłaszczona elipsoida przy boku (`haunch` 1,1), kolano wysunięte do przodu, podudzie skośnie w dół do nisko położonego stawu skokowego, długa stopa (0,3 długości tułowia) płasko na ziemi do przodu, mała łapa na końcu; opcja `shoulder` zmniejsza łopatki (zając 0,6).

## Efekty wydobycia (wersja 0.85, 2026-10-06)

- **Kto wydobywa** (`scene-fx-3d.js`, `findMiners()`): roboty z rozkazem `gather` lub `gas` blisko widoku, które faktycznie pracują — ten sam test co animacja narzędzi na planszy 2D (`canvasRenderer.entityWorking`, przekazany z `three-renderer.js` jako `working`); punkt pracy: między robotem a złożem, do 16 przed robotem.
- **Przy pracy** (`miningFx()`): ruda — iskry (ok. 42/s, opadające), kurz skalny (wznoszący się, z oporem), co ok. 0,4 s odłamek rudy łukiem do kosza; kryształ — złote i białe odpryski, jasny pył; gaz — para z zaworu pompy. Nocą migocące światło wiertła na liście świateł nocy (`night-lights-3d.js`).
- **Nad złożami** (w widoku, odkrytymi i widocznymi): ruda — srebrzyste drobiny i lekki kurz, kryształy — złote iskierki wznoszące się powoli (jaśniejsze nocą); liczba zależy od zasobu złoża.

## Kosz robota górniczego (wersja 0.85.1, 2026-10-06)

- `models-detail-3d.js`, `worker()`: kosz zawsze widoczny (dno, cztery rozchylone ściany, obręcz, żebra, zawias z tyłu); ładunek w środku z `e.cargo` (pojemność 30) i `e.cargoKind`: usypisko (spłaszczona kula, rośnie w górę) i do 7 brył pojawiających się kolejno — kanciaste grudy rudy (dwudziestościan, matowy metal i stal) albo złote odłamki (`k.crystal`, nowy materiał zestawu w `models-3d.js`). Części ładunku mają `userData.keep` (nie są scalane, renderer je pokazuje i skaluje).

## Krople deszczu na ziemi (wersja 0.85.2, 2026-10-06)

- **Rozbryzgi** (`weather-3d.js`, `splashes`): 2400 pionowych kwadratów zwróconych do kamery (zamiast 1600 płaskich pierścieni); każdy cykl losuje nowy punkt terenu (skrót z ziarna i numeru cyklu), przypięty do świata, nie do kamery; widoczny przez pierwsze 28% cyklu: pięć kropelek wyrzuconych łukiem w górę i na boki oraz cienki prysk przy ziemi, gasnące.
- **Kręgi**: w kałużach (`GROUND_GLOW`) i na wodzie (`waterLook`) cieńsze, o losowej największej średnicy, gasnące szybciej (kwadrat), o połowę słabsze.

## Śnieg na terenie (wersja 0.85.3, 2026-10-06)

- **Wygląd** (`three-renderer.js`, `GROUND_COLOR`): pokrywa z trzech oktaw szumu (próg do 1,05 − 1,15 × pokrywa, więc zostają gołe miejsca), mniej na skale (`vRock`) i stromiznach; kolor śniegu od niebieskawego (zagłębienia) do białego, zmarszczki wiatru (fala z szumem), drobna zmienność; na brzegu płatu cienki śnieg (szarawa mieszanka z ziemią); iskierki rzadsze (próg 0,993) i mniejsze.
- **Błąd**: `vUpward` (jak bardzo powierzchnia patrzy w górę) z normalnej przeliczonej przez Three.js dla instancji — dzielonej przez kwadrat skali — był dla kamieni rozrzutu (skala 3–13) bliski zeru, więc nie leżał na nich śnieg (ani kałuże). Teraz normalna jest normalizowana.
- `fogged()`: własny klucz programu (rodzaj materiału i źródło `onBeforeCompile`), żeby materiały ziemi i inne nie dzieliły programu.

## Burza piaskowa (wersja 0.85.4, 2026-10-06)

- **Ziarna** (`weather-3d.js`, `sand`): 7000 smug (kwadrat rozciągnięty wzdłuż wiatru, długość 10–20, szerokość 1,1, zwrócony bokiem do kamery), nisko nad ziemią (większość do kilku jednostek), z podskokiem (saltacja); gasną tuż przy kamerze.
- **Kłęby pyłu** (`curtains`): 240 szerokich płatów (260–480 × 110–210) przy ziemi, z szumem w trzech oktawach przesuwanym z wiatrem i w górę; gęstsze u dołu, kolor od ciemniejszego piasku u dołu do jasnego u góry, postrzępione brzegi.
- **Strugi na ziemi** (`three-renderer.js`, `GROUND_COLOR`, `sandLevel`): wydłużony wzdłuż wiatru szum przesuwany szybko — jaśniejsze pasma piasku na płaskim terenie.

## Mgła (wersja 0.86, 2026-10-06)

- **Ławice mgły** (`weather-3d.js`, `mist`): 220 szerokich, niskich płatów (260–500 × 40–90) z szumu w trzech oktawach, wolno dryfujących; gęstsze i wyższe w zagłębieniach (teren niżej od średniej z czterech punktów o 160 dalej), gasnące przy kamerze; kolor nieba.
- **Mgła na ziemi** (`three-renderer.js`, `GROUND_GLOW`, `TERRAIN`): płaty dryfującego szumu na niższych partiach mapy — od 15. percentyla wysokości (najgęściej) do mediany (`mistBand`) — blady welon w kolorze nieba, widoczny także z góry. Ilość (`mistLevel`): świt i zmierzch (do 0,45), noc (0,3), deszcz i śnieg; ławice dostają tę samą ilość świtu i zmierzchu (`fx.update` → `mistLevel`).
- **Mgła wojny** (`fogged()`): granica widoczności przesunięta wolno dryfującym szumem (poszarpana, zmienna), odkryte-niewidoczne obszary w chłodnej szarości, nieznane pod ciemną zasłoną z szumu (`fogTime`), która się przesuwa.

## Dym i ogień (wersja 0.87, 2026-10-06)

- **Cząstki** (`scene-fx-3d.js`, `particleSystem()`): nowy atrybut `misc` — wiek (0…1), ziarno, styl. Dym: styl 0 — kłąb z szumu (dwie oktawy) w obróconych ziarnem współrzędnych, „kłębiący się” z wiekiem, postrzępiony brzeg, cieniowanie jaśniejsze u góry; styl 1 — twarda kropka (odłamki, grudy rudy). Ogień: styl 0 — miękka kropka (iskry, żar, błyski); styl 1 — język ognia (zwężający się ku górze, migoczący brzeg z szumu), barwa z wieku: żółto-pomarańczowa → pomarańczowa → ciemnoczerwona.
- **Płonące budynki i pojazdy**: dym szary z uszkodzonych, z płonących dwa razy gęstszy i ciemny, dryfujący z wiatrem (z oporem); trzy języki ognia na 0,1 s, iskry ulatujące w górę; nocą migocące światło ognia (dwa sinusy) na liście świateł nocy.

## Woda i ryby (wersja 0.88, 2026-10-06)

- **Błędy**: (1) tafla jeziora była płaska tylko przy brzegu równym do 8 jednostek, inaczej leżała na dnie; (2) płaszczyzna terenu wokół mapy (`buildOutskirts`, 3 poniżej najniższego punktu brzegu mapy) leżała pod całą mapą i od 0.82 (głębsze dna) przykrywała środek jezior. Teraz: tafla zawsze płaska (przy nierównym brzegu na najniższym punkcie brzegu), rzeźba (`relief-3d.js`) wyrównuje pagórki pod jeziorem do najniższego punktu brzegu (równe dno), a teren wokół mapy to pierścień z otworem na mapę.
- **Wygląd** (`waterLook`): głębia ciemniejsza i bardziej niebieska, płycizny turkusowe z migotaniem światła nad dnem, iskry słońca (odbicie kierunku słońca/księżyca, `waterSunDir`, `waterSun` z renderera) na falkach wg szumu, piana przy brzegu przesuwająca się tam i z powrotem.
- **Ryby** (`scene-life-3d.js`): po 8 w jeziorze, dwie ławice wędrujące gładkimi torami (sumy sinusów), każda ryba krąży wokół swojej ławicy; 2–3,4 pod taflą (poziom jak w `scene-fx-3d.js`), zwrot wg ruchu; co 20–40 s skok (1,1 s, łuk do 13 nad taflą, nos w górę, potem w dół) z pluskiem (`fx.shot("splash")`: krople i trochę piany) przy wyjściu i wejściu.

## Lawa i świecące jeziora (wersja 0.89, 2026-10-06)

- **Lawa** (`scene-fx-3d.js`, `lavaLook()`, zamiast przewijanej tekstury pęknięć): komórki Voronoi (ruchome punkty, przesunięte z prądem i zniekształcone szumem) — płyty ciemnej skorupy, pęknięcia przy granicach komórek (szersze, gdzie goręcej); plamy płynnej skały z szumu niskiej częstotliwości; pulsowanie; chłodniej przy brzegu (zanik brzegu). Bąble (ok. 6/s nad lawą w widoku): błysk, krople rzucone w górę, kłąb dymu.
- **Świecące jeziora** (`waterLook`, `GLOW_POOL`): ciemniejsza toń, smugi bioluminescencji (wąskie pasma szumu z zawirowaniem domeny), pulsowanie, świecąca obwódka; jasność `glowPool` rośnie nocą.
- **Światło**: każda lawa i każde świecące jezioro w widoku jest światłem punktowym na liście świateł nocy (lawa migocze), w dzień słabiej; poświata lawy na ziemi (naklejka) słabsza.

## Kratery i ślady wybuchów (wersja 0.90, 2026-10-06)

- **Naklejka krateru** (`marks-3d.js`, rodzaj 2): lej (do 0,45 promienia) — ściana wewnętrzna jaśniejsza po stronie zwróconej do słońca (`sun` z renderera), dno ciemne; poza wałem poszarpane promienie wyrzuconej ziemi (szum po kącie) i sadza; świeży (wiek < 8% życia) żarzy się plamami na dnie. Nowy atrybut `aAge`; kolor ziemi wg biomu (`soil`).
- **Wał i kamienie**: wał z toczonego profilu (pierścień, wysokość poszarpana po obwodzie) w kolorze ziemi biomu, opadający w miarę blednięcia krateru; 7 osmalonych kamieni wokół każdego krateru (instancje).
- **Tlenie się** (`scene-fx-3d.js`): przez 25 s od powstania z krateru unosi się cienki dym i co jakiś czas iskra.
- **Ślady sadzy** (rodzaj 4): wybuchy bez krateru na ziemi (w polu widzenia) zostawiają postrzępioną plamę sadzy, bladnącą przez 60 s (do 80 naraz; przechowywane w rendererze, nie w grze).

## Pociski i trafienia (wersja 0.91, 2026-10-06)

- **Smugi** (`three-renderer.js`, `tracers`): kwadrat wzdłuż lotu obracany w shaderze wokół osi lotu do kamery (dwustronny), szerokość ×3 na poświatę: rdzeń biało-gorący (pow 6), poświata w kolorze strzału, jasność rośnie ku czubkowi.
- **Wylot** (`scene-fx-3d.js`, `shotFx`): gwiazda płomienia (nowy styl ognia 2: jasny środek, promienie obrócone ziarnem) i kłębek dymu; nocą światło punktowe przez pierwsze 40% życia strzału (lista świateł nocy).
- **Trafienie**: błysk (styl 2), iskry (więcej przy rakiecie), na ziemi pył w kolorze biomu (`SOIL`: pył, popiół, lód); w powietrzu (`air` — strzał w samolot) bez pyłu. Rakieta: kilka języków ognia i kłąb ciemnego dymu. Smuga rakiety: gęstszy dym i płomyk.

## Słońce i księżyc (wersja 0.92, 2026-10-06)

- **Snopy światła** (`sun-fx-3d.js`, nowy moduł): 140 instancji kwadratów (jedno rysowanie) rozsianych w kwadracie widoku wokół punktu kamery, nieruchomych względem mapy; oś wzdłuż kierunku słońca (długość 520–1040), obrócone wokół osi do kamery. Jasność: prześwit między chmurami nad punktem (ta sama funkcja pokrycia `cloudCover` co niebo i cienie chmur — `cloudGlsl()`, `cloudUniforms()` z `sky-3d.js`) × rozpraszanie w przód (najjaśniej patrząc w słońce) × wygaszenie na brzegach widoku. Siła: złota godzina (wysokość słońca 0,02–0,55) i zamglenie lub pył (`haze`, mgła o świcie), do 0,1; nocą brak.
- **Refleks obiektywu**: 8 sprajtów (poświata, pierścienie, sześciokąty z tekstur rysowanych na kanwie) na linii słońce → środek ekranu i dalej, bez testu głębi. Widoczny, gdy słońce jest przed kamerą i blisko ekranu, a 14 próbek wzdłuż promienia nie trafia w teren; zanika na brzegach ekranu, w zamgleniu i o zachodzie; płynne wygaszanie (współczynnik `seen`).
- **Fazy księżyca** (`sky-3d.js`, `moonPhase`, 0 nów → 0,5 pełnia): oświetlenie tarczy od kierunku zależnego od fazy, światło popielate 0,035, halo zależne od pełni. Faza przesuwa się o 1/8 z każdym dniem gry.
- **Noc a faza**: natężenie księżyca 0,55 × (0,25 + 0,75 × pełnia); światło otoczenia i jego barwa od głębokiego granatu (`#1c2a4e`, nów) do zwykłej nocy (pełnia).
- **Cienie chmur nocą**: cień chmur mnoży każde światło kierunkowe, więc działa także przy księżycu.

## Gwiazdy, Droga Mleczna i zorza (wersja 0.93, 2026-10-06)

- **Gwiazdy** (`sky-3d.js`, `skyStars`): dwie warstwy siatki komórek na sferze — gęsta słabych (300 komórek, gęstsza w pasie Drogi Mlecznej) i rzadsza jasnych (75) z krzyżykiem promieni. Kolor z temperatury (czerwony, żółty, biały, niebieski), jasność `pow(los, 3)` (mało jasnych). Gwiazda ma co najmniej piksel szerokości, a mniejsza jest proporcjonalnie ciemniejsza (bez migotania przy ruchu). Rozmiar piksela na niebie (`fwidth`) liczony raz, w jednolitym przepływie sterowania — pochodne po wczesnym `return` były niezdefiniowane i rysowały kanciaste artefakty. Mruganie: dwie sinusoidy, amplituda 0,18 w zenicie → 0,73 przy horyzoncie.
- **Obrót nieba**: kierunek gwiazd i galaktyki obracany wokół nachylonej osi bieguna (0,0035 rad/s).
- **Droga Mleczna**: pas wokół wielkiego koła (Gauss szerokości 0,12–0,21, szerszy przy jądrze), jasne jądro w jednym kierunku (cieplejsze), obłoki i ciemne pasma pyłu z szumu 3D (`skyNoise3`, `skyFbm3`; szum 2D rzutowany ze sfery dawał podłużne smugi), przygaszana przez pełnię.
- **Meteory**: 3 sloty o okresach 8, 13, 18 s, każdy aktywny przez 8% okresu; początek i kierunek z hasha numeru przelotu, smuga o szerokości piksela z gasnącym ogonem.
- **Satelity**: 2 punkty po orbitach (wielkie koła nachylone), okresy przejścia 110 i 180 s, widoczne nad horyzontem.
- **Zorza** (uniform `aurora`): kurtyny na płaszczyźnie nad kamerą (`d.xz / h`) falujące sinusami i szumem, promienie z szumu po azymucie (pionowe w świecie, zbiegają do zenitu), od zielonej u dołu do czerwieni i fioletu u góry, w paśmie wysokości 0,03–0,65. Renderer (`weatherLight`): na mapach o biomie `ice` nocą, falująca w czasie, słabsza w zamgleniu; przesuwa barwę światła otoczenia ku zieleni (`AURORA_GREEN`) i lekko je wzmacnia.

## Chmury, zmierzch i obce niebo (wersja 0.94, 2026-10-06)

- **Cirrusy** (`sky-3d.js`): druga warstwa na wyższej płaszczyźnie (`d.xz / (h + 0.05)`), szum rozciągnięty w obróconym kierunku (smugi), dryf 1,75× szybszy niż chmur niskich, chowa się przy zachmurzeniu > 0,5.
- **Światło zmierzchu na chmurach**: barwa `dusk` (czerwono-pomarańczowa → złota z wysokością słońca), najmocniej w stronę słońca; dla niskich chmur przy wysokości słońca −0,12…0,22, dla cirrusów −0,2…0,3 (dłużej). Grube środki chmur ciemniejsze (spód). Nocą brzegi chmur (`c·(1−c)`) przy księżycu srebrzyste.
- **Cień planety i pas Wenus**: o zmierzchu i świcie (słońce −0,16…0,1), naprzeciw słońca (azymut) — niebieskoszary pas od horyzontu do wysokości rosnącej, gdy słońce opada (0,02–0,18), nad nim różowy pas.
- **Obce niebo** (`sky.setTheme(theme)`, z `setGame`): `WORLDS` po motywie mapy. Drugie słońce (`twinsun`: obrócone o 0,3 rad wokół pionu i niżej o 0,07 od pierwszego, pomarańczowe, mniejsza tarcza z poświatą); w rendererze drugie światło kierunkowe bez cieni (`sun2`, zawsze w scenie — intensywność 0 na innych mapach, więc shadery się nie zmieniają). Ciała (do 2: planeta, księżyce) — tarcza oświetlona od słońca z terminatorem, pasy z szumu, poświata atmosfery na brzegu, opcjonalny nachylony pierścień (za tarczą u góry, przed nią u dołu, z przerwą); za dnia przygaszone (1 − 0,55·widoczność słońca), w zamgleniu znikają. Motywy: `skyfall`, `derelict`, `frozenhive` (z pierścieniem), `magma` (wielka czerwona), `dunesea`, `lumen` (dwa księżyce).

## Pochylanie kamery w grze (wersja 0.95, 2026-10-06)

- **Pochylenie** (`camera.tilt`, 0…1, `app.js`): PageUp / PageDown (0,8 na sekundę, przytrzymane), Alt + środkowy przycisk — ruch w pionie (0,004 na piksel; w górę = ku horyzontowi), ruch w poziomie obraca jak dotąd. `/` zeruje obrót i pochylenie. Zapisywane w zapisie gry razem z obrotem; poza trybem 3D zerowane.
- **Kamera** (`three-game-renderer.js`): kąt z przybliżenia (1,05 → 0,7) obniżany przez pochylenie do 0,1 rad — horyzont i niebo w kadrze.
- **Wskazywanie** (`three-renderer.js`, `screenToMap`): promień w niebo (nie trafia w teren i wznosi się) wskazuje punkt na płaszczyźnie ziemi z kierunkiem obniżonym do −0,05, zamiast punktu za kamerą.

## Zachowania zwierząt (wersja 0.96, 2026-10-06)

- **Mózgi** (`scene-life-3d.js`, `brains`): `game.wildlife()` (co 2 s) daje każdemu zwierzęciu dom i rodzaj; nowe zaczynają w domu, a znikają, gdy zniknie z listy (budynek obok domu). Dalej ruch liczy renderer (tylko wygląd, poza symulacją gry; plansze 2D pokazują dawny wzór).
- **Rodzaje** (`BEASTS`): zasięg wokół domu (jeleń 560, lis 480, zając 320, jaszczurka 220), prędkość chodu i biegu, promień strachu, szybkość skrętu, czas odpoczynku, stado (jelenie: grupy, przewodnik = pierwszy z grupy, reszta celuje w okolicę jego celu i zwalnia, gdy ktoś został > 160 z tyłu), pasienie się (szansa przy odpoczynku), zrywy (zając, jaszczurka: 0,5–1,6 s biegu, 0,4–1,4 s bezruchu), wspinanie (jaszczurka).
- **Stany**: odpoczynek (pasienie się lub rozglądanie) → wędrówka do losowego punktu, do którego da się dojść (`walkable`: na mapie, `game.blocked` — woda, mury, przeszkody — z dala od budynków, bez stromego zbocza) → odpoczynek; ucieczka przed najbliższą jednostką, strzałem lub wybuchem (sprawdzane co 0,2–0,35 s; stado ucieka razem), potem czujność (łeb w górę, uszy postawione, rozglądanie się). Smycz: dalej niż 1,4 zasięgu od domu — powrót.
- **Sterowanie**: płynny skręt do celu, co 0,15 s próbka przed sobą; gdy nie da się przejść — skręt o ±0,5…2,4 rad, w ostateczności zawrócenie i nowy cel; przyspieszanie (60/s², w ucieczce 220/s²).
- **Modele** (`nature-detail-3d.js`): szyja jako osobny staw (pasienie się: w dół o `graze`, czujność: w górę), krok liczony z przebytej drogi (`stride`, wykładnik 0,65 — w biegu dłuższe kroki); jaszczurka nieruchoma, gdy stoi.

## W grze

- **Kamera**: kamera gry (`camera.x`, `camera.y`, `zoom` → `scale`) steruje kamerą 3D. Patrzy na środek widoku z pochylenia ok. 54°, z odległości, przy której środek ekranu ma tyle pikseli na jednostkę mapy co widok 2D. Przesuwanie, przybliżenie, Home i minimapa działają jak dotąd; obrotu i pochylenia w grze nie ma.
- **Wskazywanie**: `toFlat()` rzuca kursor na teren i podaje, gdzie ten punkt mapy leży w płaskiej klatce, na której pracuje logika gry; `fromFlat()` przelicza z powrotem. Kliknięcie, ramka zaznaczenia (sprawdzana przez `fromFlat`, jak przy pochyleniu 2,5D), rozkazy i budowa działają bez zmian w `app.js`.
- **Interfejs na planszy** (faza Canvas `overlay`: podgląd budowy, punkty zbiórki, znaczniki, zasięgi) jest malowany na płaskiej klatce dwa razy większej niż ekran, w rozdzielczości 0,4, i nakładany na teren w shaderze. Faza `screen` (ramka zaznaczenia, winieta, atmosfera, krawędź burzy) jest malowana na zwykłym płótnie 2D nad planszą 3D, z rogami ramki przeliczonymi przez `fromFlat`.
- **Ustawienia**: opcje efektów PixiJS są w trybie 3D wyłączone (plansza 3D ma własne światło i cienie).

## Pomiary (2026-09-30)

- Ekran → plansza → ekran: błąd poniżej 0,001 px.
- Galeria prototypu (115 modeli widocznych naraz, z cieniami): bez instancingu ok. 1040 wywołań i 6,5 ms na klatkę razem z kartą graficzną; z instancingiem 107 wywołań i 3,7 ms (najgorsza 5,9 ms).
- 415 modeli (galeria + 300 jednostek): 107 wywołań, 230 tys. trójkątów, 8,5 ms na klatkę (5,4 ms procesora).
- W grze (Cichy Horyzont, początek bitwy): ok. 169 kl./s (mediana klatki 5,9 ms) razem z nakładką interfejsu.
- 0.53, w grze (Rzeki Magmy, noc i burza wulkaniczna, płonące koszary): mediana klatki 5,9 ms, 95% klatek do 11,7 ms.
- 0.54, w grze (Wiszące Szczyty, początek bitwy, przyroda i wyspy): mediana klatki 5,9 ms, 95% klatek do 6,0 ms.
- Sprawdzone w grze: zaznaczanie ramką, rozkaz ruchu trafia w kliknięte miejsce, podgląd budowy pod kursorem, przełączanie 3D ↔ WebGL w trakcie gry. Powrót do WebGL przy stronie otwartej z dysku nie był sprawdzany w przeglądarce.

## Dalej

1. Domyślny renderer 3D (po ocenie gracza), WebGL (PixiJS) jako zapasowy.
2. Kampania: znaczniki misji i obiekty specjalne aktu II/III w 3D zamiast nakładki na terenie; animowane sceny kampanii.
3. Szlif modeli z bliska (Rój, akt III, budowle specjalne).
