# Bitwa na orbicie

Aktualizacja: 2026-10-08. Wersje: 0.130 (mapa, statki, osłony), 0.131 (stacje, mgławice, asteroidy), 0.132 (boje, kosmiczne surowce, głębia planszy).

Pierwszy krok kierunku „Bitwy kosmiczne i transport między planetami” (zob. [Pomysły](POMYSLY.md)): mapa w kosmosie, na której zamiast pojazdów walczą statki. Zasady w `space-rules.js` (łańcuch modułów zasad, ostatni), wygląd 2D w `space-art.js`, modele 3D statków w `webgl3d/ships-3d.js`.

## Czytelność bitwy na tle kosmosu (0.155.1, 2026-10-09)

Zgłoszenie właściciela: budynki, statki i inne elementy na mapach kosmicznych są słabo widoczne. Sprawdzenie w grze (renderer 3D; Orbita Kharona, Wrota Pustki, Pierścienie Glacjalis), z porównaniem po wyłączaniu kolejnych warstw tła:
- planeta (Kharon) zajmowała pół widoku, a jej pasy chmur miały jasność szarych kadłubów — statki ginęły na jej tle (czarna dziura na Wrotach Pustki tak samo);
- skały głębokiego pola (420, setki–tysiące jednostek pod planszą) w perspektywie leżały „między” jednostkami, przyciemnione mgłą głębi prawie do czerni — wyglądały jak przeszkody albo statki;
- pierścienie przecinały pole bitwy ciemnymi łukami; Droga Mleczna, mgławice i blask słońca dokładały ruchliwe, nasycone tło.

Zmiany (`webgl3d/space-3d.js`, stałe `CALM`): planeta ×0,55, poświata ×0,45, pierścienie i drobiny pierścieni ×0,5 (mniej kryjące), czarna dziura ×0,6, Droga Mleczna ×0,55, mgławice (niebo i obłoki w oddali) ×0,5, blask słońca, smuga i odblaski obiektywu ×0,4 (tarcza słońca bez zmian). Głębokie pole: najbliższe skały 1400 zamiast 700 pod planszą, półprzezroczyste (0,5), drobiny słabsze. Nowa ciemna warstwa 30 jednostek pod planszą (krycie 0,5), wygaszana do zera 700 jednostek za brzegiem mapy — pole bitwy ma ciemne tło, a jego granica jest widoczna. Statki (`webgl3d/ships-3d.js`): paski strony z materiału świecącego w kolorze strony. Światło w kosmosie (`three-renderer.js`): rozproszone 0,62 zamiast 0,4 — zacienione burty nie toną w tle.


Trzy mapy scenariusza (`space-rules.js`, `MORE`), zarejestrowane jak orbita w `RTS.FRONTIER_MAPS` i `MISSIONS`; każda w innym świecie, z innym układem i burzami. Misja niesie `look` (wygląd 2D i 3D) i `storms` (kolejność burz; `stormNames` — własne nazwy). Orbita Kharona ma `look` domyślny (gazowy olbrzym, dalekie pierścienie).

| Mapa | Klucz | Świat (`look`) | Przeszkody | Burze |
|---|---|---|---|---|
| Pierścienie Glacjalis | `glacis` | lodowy olbrzym (`planet: "ice"`) przewrócony jak Uran, pierścienie otwarte wokół niego (`rings: "near"`), lodowe skały, błękitne mgławice i białe słońce; bez wraku stacji | trzy skośne pasma lodowych brył z przejściami (`band`) | jonowa, deszcz lodowych odłamków |
| Wrota Pustki | `abyss` | czarna dziura Erebus zamiast planety (`blackHole`: horyzont, dysk akrecyjny, wygięte łuki dysku, pierścień fotonowy), ciemny bazalt, czerwono-fioletowe mgławice, złote światło | pierścień gruzu z czterema przejściami wokół najbogatszego złoża (`ringOf`) | rozbłysk dysku (słoneczna), jonowa |
| Cmentarzysko Floty | `graveyard` | wulkaniczny księżyc Pyros jak Io (`planet: "lava"`: siarka, kaldery z jeziorami lawy, potoki lawy), czerwony karzeł, rdzawe mgławice | wraki okrętów (`kind: "hulk"`) w labirynt wokół centralnego dziedzińca | burza czerwonego karła (słoneczna), deszcz odłamków kadłubów |

- Pola `look`: `planet` (`gas` / `ice` / `lava` / `none`), `blackHole`, `rocks` (`rock` / `ice` / `dark` / `hulk`), `nebula` (dwie trójki kolorów obłoków), `sky` (kolory mgławic nieba), `sun` i `glow` (kolor słońca i poświaty), `rings` (`far` / `near` / brak), `comet`, `convoys`, `derelict`, `ice`.
- 3D (`space-3d.js`): paleta planety i pierścieni z `look`, lodowy olbrzym oświetlony z boku (`ICE_LIGHT`), czarna dziura pod planszą w prawym górnym rogu; `three-renderer.js` bierze barwę słońca i poświaty z `look`. Wraki: `models3d.scenery("obstacle", "hulk", …)`.
- 2D (`space-art.js`): paleta tła, planety (gaz, lód, lawa), czarna dziura, kamienie i wraki. Ekran ładowania: światy `spaceIce`, `spaceVoid`, `spaceLava`.
- Testy: złoża wolne i osiągalne we wszystkich rozmiarach, piraci obecni, tylko własne burze mapy, trzy różne światy.
- Wulkaniczny księżyc (0.143.4, `space-3d.js`): promień 4200 w `(0,15 W, −9000, −10500)` (0.143.6 — pierwotna wielkość; w 0.143.4 było 1650, w 0.143.5 2600), światło z boku (`ICE_LIGHT`). Shader (`kind` 2): bazalt `c0`/`c1`, siarka (szum `p·2,6`), szron, kaldery z progu szumu `p·3,2` (obrzeże 0,58–0,65, jezioro 0,65–0,69), potoki lawy tylko tam, gdzie szum `p·1,8` > 0,5; kolory przyciemnione ×0,32 (liniowe). Świecenie `cracks × (1,2 − 0,75·dzień)`. Błyski burz i zorze tylko dla `kind` < 1,5. Pióropusze wulkanów (0.143.4–0.143.5) usunięte w 0.143.6.
- Lodowy olbrzym (0.143.3, `space-3d.js`): promień 1450 w `(0,2 W, −9800, −11000)`, nad górną krawędzią planszy. Oś planety i pierścieni ustawiana raz, w pierwszej klatce: w stronę kamery, odchylona o 0,6 rad (`openRings`), więc pierścienie otwierają się jak lekko spłaszczona elipsa, a pasma układają się wokół bieguna. Shader (`kind` 1): kaptur polarny i kołnierz chmur, smugi chmur metanowych wzdłuż pasm, ciemna burza z jasnymi obłokami na brzegu. Pierścienie: prążki gasną według `fwidth(r)`, gdy są drobniejsze niż piksel.
- Przekaźnik w kosmosie (0.143.8, `models-3d.js`, `buoy`): satelita na wysokości 50 — korpus (sześciokąt r 8, kołnierze, stożek ze światłem właściciela pod spodem, pas świateł), dwa radiatory, skrzydła po obu stronach (kratownica do 66, panele 18×14 przy 37 i 57 z ramami i siatką ogniw), obracająca się grupa (`dish`): pierścień R 24 z pasem świateł, 4 szprychy i moduły, maszt z anteną paraboliczną (`latheGeo`, pochylona o 0,9 rad, tuba i zastrzały); anteny i latarnia. Obrót 0,25 rad/s (na ziemi 0,6). Materiały `SPACE_DEP.buoy`/`strut`/`panel` jaśniejsze i mniej metaliczne (0,3–0,4).
- Złoża w kosmosie (0.143.7, `models-3d.js`, `spaceDeposit`): ruda — duża bryła (`SPACE_DEP.oreRock`/`oreDark`) z bryłkami metalu rozłożonymi po powierzchni (`metal`, co trzecia świecąca `vein`; 10 na największej skale), mniejsze skały i 10 odłamków wokół; gaz — jądro `gasCore` (4,5·k) w poświacie `gasHalo` (8·k), dwa spiralne ramiona po 12 obłoków (`gasPuff`/`gasPuffBlue`, przezroczystość 0,13–0,15, bez zapisu głębi, gładkie), 8 iskier `spark`, lód; kryształy — skała 14×10×13, do 8 kęp `SPACE_DEP.crystal` (świecący bursztyn) na obróconych osiach (wychylenie, obrót) wokół środka. Rozmiar maleje z etapem (k = 0,55–1). Galeria modeli pokazuje je w etapach 6 i 3.
- Czarna dziura (0.143.2, `space-3d.js`, grupa `blackHole`): jeden kwadrat zwrócony do kamery (kwaternion kamery co klatkę), cały obraz liczony w shaderze w jednostkach promienia cienia (obraz ±7): cień (alfa 1, przesłania tło; mieszanie z przemnożoną alfą `One` / `OneMinusSrcAlpha`), pierścień fotonowy na r ≈ 1,025, dysk spłaszczony ×0,075 (przednia połowa zakrywa cień, tylna chowa się za nim), zagięty obraz tylnej części dysku w pasie wokół cienia (szerokość 0,16 u dołu do 1,0 u góry), wirowanie `sFbm`, barwa od temperatury, Doppler (lewa strona jaśniejsza), pierścień Einsteina z gwiazd na r ≈ 2,6. Pozycja `(0,76 W, −9500, −8000)`, skala 1150.
- Wraki okrętów (0.143.1, `models-3d.js`, `kind === "hulk"`): kadłub z `loftGeo` (ośmiokątny przekrój: wąski pokład, barki, skośne burty, kil; dziób zwęża się i obniża). Szerokość `min(0,85 × krótszy bok, 0,17 × długość, 82)`. Wrak dłuższy niż 7 szerokości jest przełamany: rufa na miejscu, dziób w osobnej grupie odgięty za szczeliną z odłamkami; krótsze to sam dziób albo sama rufa (wg ziarna). Rufa: blok silników z trzema dyszami (w środkowej żar), schodkowa nadbudówka z mostkiem (okna `HULK.window`) i masztem z czerwonym światłem. Na całości wieże, szwy i panele pancerza w dwóch odcieniach (część brakuje), wyrwy z żarem, na przełomach wręgi, rury i świecący przekrój (`HULK.ember`). Materiały mało metaliczne (0,2–0,25), bo w kosmosie metal nie ma czego odbijać i czernieje. W `scene-life-3d.js` wraki tylko lekko się kołyszą (±0,015 rad), asteroidy dalej się obracają. Galeria modeli (`prototyp-modele.html`, Przyroda) pokazuje pięć wraków; `window.galleryCam` pozwala ustawić kamerę z konsoli.

## Mapa „Orbita Kharona” (`MISSIONS.orbit`, `space: true`, motyw `space`)

- Dostępna w Scenariuszach i w grze wieloosobowej jak każda mapa scenariusza (wszystkie rozmiary, 2–4 graczy, wszystkie tryby, kod operacji).
- Pas asteroid (przeszkody `kind: "asteroids"`) przecina pole bitwy trzema korytarzami: północnym, środkowym i południowym, plus mniejsze pola na flankach. Ruda na asteroidach (najbogatsze złoże w środkowym korytarzu), gaz w obłokach mgławicy, kryształy. Układ jest rejestrowany w `RTS.FRONTIER_MAPS` i przechodzi przez `configureMission` z `frontier-maps.js` (przekaźniki, osadzanie jednostek), a generator scenariusza dokłada losowe asteroidy i dosuwa złoża do baz.
- Próżnia: brak pogody (`weather.intensity` zawsze 0, burza nigdy nie nadciąga), brak nocy (`night` = 0), brak fauny (jednostki drużyny 2 usuwane; zostają tylko strażnicy artefaktu w trybie Wyprawa). Pasek sytuacji pokazuje „ORBITA · Próżnia — bez pogody i nocy”.
- `game.space` — czy bitwa toczy się w kosmosie.

## Stacje i statki

- Budynki pozostają te same (gospodarka, drzewo rozwoju, AI i zapisy działają bez zmian), ale noszą nazwy orbitalne (`RTS.SPACE_NAMES`, `unitName` / `entityName`): stacja dowodzenia, stocznia lekka (koszary), stocznia ciężka (fabryka), platforma obronna, stacja przeładunkowa, kolektor mgławicy, reaktor i laboratorium orbitalne, dok myśliwców, dron górniczy (robot).
- Statki (`TYPES[x].ship`, osłona `TYPES[x].shield`):

| Statek | Klucz | PW | Osłona | Zasięg | Obrażenia / s | Koszt | Stocznia | Rola |
|---|---|---|---|---|---|---|---|---|
| Korweta | `corvette` | 130 | 50 | 180 | 20 | 75 | lekka | Szybka; ×1,5 niszczycielom, ×1,3 krążownikom, ×0,6 stacjom |
| Fregata | `frigate` | 260 | 110 | 240 | 24 | 140 | lekka | Łowca małych: ×1,7 korwetom, lotnictwu i dronom; ×0,7 krążownikom |
| Niszczyciel | `lancer` | 420 | 160 | 300 | 32 | 240 | ciężka | Działo liniowe: ×1,5 fregatom i krążownikom, ×0,45 korwetom |
| Krążownik | `cruiser` | 1050 | 380 | 330 | 45 | 480 | ciężka | Wymaga laboratorium; ×1,4 stacjom |

- Klucz `lancer`, bo `destroyer` to niszczyciel czołgów Dominium.
- Jednostek naziemnych nie da się budować w kosmosie (`developmentRequirement`), a statków poza nim. Każda jednostka naziemna, którą zasady tworzą w kosmosie (siły startowe, fale, wybór dowódcy AI), staje się statkiem swojej klasy (`spawn`): piechota i lekkie → korweta, rakietowiec i wsparcie → fregata, czołgi → niszczyciel, ciężkie i artyleria → krążownik. Myśliwce, bombowce i drony z doku zostają.
- Skróty Q / W / E / Y zamawiają w kosmosie korwetę, fregatę, niszczyciel i krążownik.

## Osłony

Osłona statku przyjmuje obrażenia przed kadłubem. Po `RTS.SPACE.shield.delay` (4 s) bez trafienia odnawia się o `rate` (12%) pojemności na sekundę. Trafienie w osłonę pokazuje zmarszczkę (`fx("shieldHit", …, { ship: true })`). Osłona jest zapisywana razem z jednostką.

## Burze kosmiczne (0.142)

- Burze zmieniają się po kolei (`RTS.SPACE.storms`: jonowa → słoneczna → deszcz asteroid); rodzaj i nazwa z numeru burzy — między burzami pogoda pokazuje następną, więc ostrzeżenie i prognoza (monitoring) ją nazywają.
- **Burza jonowa** — jak w 0.140 (tylko ona psuje celność: `accuracy` w kosmosie poza nią bez kary).
- **Burza słoneczna** (`SPACE.solar`): promieniowanie zabiera osłonom statków 4% pojemności na sekundę przy pełnej sile i (powyżej 0,3 siły) nie pozwala im się odnawiać. 3D: `solarWind` (złote smugi od strony słońca na wysokości −120…240 j.), słońce do ×1,9 i ciepłe światło otoczenia falami (`state.solar`); 2D: ciepła poświata i smugi.
- **Deszcz asteroid** (`SPACE.meteor`): po 20 s burzy (przy sile ≥ 0,4) uderzenia co 0,7 s ÷ siła w losowe miejsce planszy (losowanie gry — zgodne w sieci): wszystko w promieniu 60 + promień celu dostaje do 48 obrażeń (osłony biorą pierwsze), także piraci; efekt wybuchu (`meteor`). Gracz dostaje alarm przy pierwszym trafieniu jego sił w danej burzy. 3D: `meteors` — płonące odłamki spadające stromo (biała głowa, ognisty ogon); 2D: smugi.
- **Osłony przeciwmeteorytowe** (`RTS.RESEARCH.meteorShield`, laboratorium, 180 metalu / 40 gazu / 30 kryształów, 30 s): −80% obrażeń od deszczu asteroid; dostępne tylko na orbicie (gdzie indziej „Tylko na orbicie”), karta w badaniach (pole ORBITA) i w drzewie rozwoju pod laboratorium.
- Pasek sytuacji opisuje skutki bieżącej burzy. Od 0.142.1 także ostrzeżenie z monitoringu: silnik bierze zdanie o skutkach z `stormEffects(burza)` (na planetach „Ruch i celność będą ograniczone.”), a `space-rules.js` podaje skutki burzy kosmicznej według jej rodzaju.

## Napędy stacji (0.141.1)

- `ships-3d.js`, `platform`: pod pokładem 3 dysze (4 u dużych stacji) — dysza, jarzący się wylot i płomień w dół (jasny rdzeń i szersza osłona, dodawane światło; `PLUME` błękitny u Kolonii, pomarańczowy u Dominium), migoczący; blask rdzenia reaktora w dół; trzy cienkie, słabe dyski poświaty (`HALO`) szersze niż platforma — widać je spod krawędzi z góry. `platform` zwraca `update`, którą `models-3d.js` dokleja do animacji budynku. Od 0.141.2 także pod gondolą każdego z trzech ramion dokujących (większe stacje): mała dysza, jarzący się wylot, migoczący płomień w dół i mały dysk poświaty.

## Piraci (0.141)

- Strona neutralna (drużyna 2 — w kosmosie zamiast fauny): walczy ze wszystkimi i wszyscy z nią. Typy: **okręt piracki** (`pirate`: 170 PW, osłona 40, szybkość 145, zasięg 200, 20 obrażeń/s) i **kryjówka piratów** (`pirateBase`: 1600 PW, zasięg 280, 20 obrażeń/s).
- `placePirates` (po `configureSkirmish` w kosmosie): kryjówki na wolnym miejscu jak najdalej od wszystkich centrów dowodzenia (i od siebie), z dala od złóż i przekaźników; ustawienie „Fauna” (`RTS.SPACE.pirates`): nieliczna — 1 kryjówka, załoga 3, najazd co 120 s; zwykła — 1, 5, co 85 s; liczna — 2, 5, co 70 s. Na start po 2 okręty.
- `pirateTick`: kryjówka dobudowuje okręt co 18 s do pełnej załogi; pierwszy najazd po 110 s, potem co swój okres — na kolejną stronę (gracz i dowódcy AI na zmianę): banda (cała załoga bez jednego wartownika) dostaje rozkaz ataku z marszu na najbliższy kryjówce dron górniczy tej strony albo jej najbliższą stację; po 55 s albo poniżej 35% wytrzymałości okręt wraca do kryjówki. Gracz dostaje alarm „Piraci ruszają na najazd…”. Nagroda dla strony, która zniszczy: 35 metalu za okręt, 250 za kryjówkę (dowódcy AI do jego zapasu). Stan (`pirates`: następny najazd, kolejka stron) w zapisie.
- Wygląd: 3D (`ships-3d.js`, własne barwy) — okręt rdzawy, łatany, z niedopasowanymi płytami, żółto-czarnym pasem, kolcami taranów, działkiem i czerwonymi napędami; kryjówka — wydrążona asteroida z jarzącym się wejściem, przykręconymi modułami, masztem, dwoma działkami i obracającym się pierścieniem dokującym z migającymi czerwonymi sygnałami (bez platformy stacji). 2D (`space-art.js`) — ciemnoczerwony kadłub z żółtym pasem; kryjówka jako asteroida z modułem, pierścieniem i sygnałami.

## Burza jonowa (0.140)

- Pogoda kosmiczna (`space-rules.js`, getter `weather`): ten sam rytm, ustawienia scenariusza (spokojna/zwykła/surowa), ostrzeżenia i prognoza z monitoringu pogody co burze planetarne, ale `kind: "ion"`, nazwa „Burza jonowa” (`RTS.SPACE.ion`). Skutki: celność jak w burzy (do −30%, z naprowadzaniem ¼), bez spowolnienia (`movementFactor` w kosmosie znosi udział pogody), a gdy siła > `ion.shields` (0,3) — osłony statków się nie odnawiają (`ionStorm()`).
- 3D (`weather-3d.js`): `ionCurtains` — 70 wysokich, falujących wstęg plazmy (zieleń u dołu, fiolet u góry, turkusowe promienie), od 160 j. pod płaszczyzną w górę, z dodawanym światłem, migoczące; wyładowania jako błyski sceny (bez piorunów); bez mgły. `three-renderer.js`: `ionLevel` w shaderze płaszczyzny — siatka taktyczna migocze, rwie się w poziomych pasach i przechodzi w fiolet. 2D (`space-art.js`): pasma zorzy płynące przez widok.
- Pasek sytuacji: „✦ ORBITA · Burza jonowa · celność −X% · osłony nie odnawiają się” z prognozą; raport pauzy „Orbita · burza jonowa / spokojnie”.

## Otoczenie orbity (0.139)

- Mgławice wolumetryczne (`space-3d.js`, `buildNebula`): dwie — za planetą (fiolet, magenta) i głęboko pod bitwą (błękit, turkus); każda z 90 świecących warstw obłoków (tekstura z wielu plam) rozmieszczonych w elipsoidzie, 26 ciemnych pasm pyłu przed nimi i 140 młodych gwiazd w środku. Warstwy na różnych głębokościach rozsuwają się przy ruchu kamery.
- Lód z pierścieni: 46 obracających się bryłek lodu dryfujących powoli przez planszę na wysokości −140…120 j. (część między statkami), zawijanych na brzegach; tylko wygląd.
- Kometa: jasne jądro, koma, zakrzywiony warkocz pyłowy i prosty, niebieski warkocz jonowy — oba od słońca; przelatuje po niebie raz na 12 minut.
- Drony naprawcze: 36 świateł krążących wokół wraku stacji (migają na pomarańczowo) i 6 błysków spawania na jego kadłubie.

## Lotniskowiec (0.136)

- **Lotniskowiec** (`carrier`): 1400 PW, osłona 320, szybkość 48, obrona bezpośrednia (zasięg 220, 16 obrażeń/s), 560 metalu, 24 s, stocznia ciężka, wymaga laboratorium. Bonusy: ×0,5 stacjom; niszczyciel zadaje mu ×1,6, fregata ×0,7.
- **Myśliwiec pokładowy** (`fighter`, `flying`): 55 PW, szybkość 220, zasięg 130, 17 obrażeń/s, bez kosztu, nie da się go zbudować. Bonusy: ×1,4 dronom, ×1,2 korwetom, ×0,4 stacjom; fregata zadaje mu ×1,7, niszczyciel ×0,3, krążownik ×0,5.
- `carrierTick` (`space-rules.js`, w `tick`; wartości w `RTS.SPACE.carrier`): ukończony lotniskowiec co `launch` (6) s wypuszcza myśliwca zza rufy, aż ma ich `wing` (4) (`c.wing`, `f.mothership`); co 0,5 s każdy myśliwiec dostaje rozkaz ataku na najbliższego widocznego wroga w promieniu `reach` (520) od lotniskowca, a bez celu rozkaz lotu na swoje miejsce na okręgu `orbit` (75) wokół niego, obracającym się. Myśliwiec bez lotniskowca ginie po `orphan` (8) s. Myśliwce nie liczą się do limitu armii (`population`). Dowódca AI buduje lotniskowce w stoczni ciężkiej od chwili ciężkich jednostek, chętniej przeciw dużym okrętom.
- Poprawka: wspólna zasada celowania pozwala strzelać do celów latających tylko kilku typom — statki w kosmosie strzelają teraz do nich jak do innych (`canTarget`).
- Wygląd: 3D (`ships-3d.js`) — lotniskowiec z płaskim pokładem startowym, przerywaną linią pasa i światłami krawędzi zapalającymi się po kolei ku dziobowi, wyspa z oknami, masztem i kopułą, jarzący się wylot hangaru na dziobie, burtowe sponsony z czterema działkami, cztery napędy; myśliwiec — mała delta z kabiną, podwójnymi statecznikami i jednym napędem, na wysokości lotnictwa (90 j.), ze smugą silnika (bez „smug pary” lotnictwa planetarnego). 2D (`space-art.js`) — kadłub z pokładem, pasem, migającymi światłami i wyspą; myśliwiec jako mała delta. Karta „Lotniskowiec” w pasku dowodzenia.

## Teren w walce (0.131)

- **Mgławica** — obłok o promieniu `RTS.SPACE.nebula.radius` (230) wokół każdego złoża gazu (`inNebula`). Statek w obłoku dostaje obrażenia ×`nebula.cover` (0,75), ale jego osłona się tam nie odnawia — mgławica to kryjówka na przeczekanie ostrzału, nie miejsce na naprawę.
- **Osłona asteroid** — statek, którego obrys jest w odległości `asteroids.reach` (45) od pola asteroid (`byAsteroids`; tylko przeszkody, nie krawędź mapy ani mury), dostaje obrażenia ×`asteroids.cover` (0,8).
- Oba czynniki się mnożą (`spaceCover`) i dotyczą tylko statków; poza kosmosem nic się nie zmienia.

## Boje i surowce (0.132)

- **Boje przekaźnikowe** zamiast naziemnych stacji przekaźnikowych (zasady przejmowania bez zmian). 3D (`models-3d.js`, `buoy`; `relay(…, space)`): sześciokątny rdzeń 44 j. nad płaszczyzną, obracający się pierścień w kolorze właściciela z panelami słonecznymi na dwóch ramionach, anteny i sygnał; strefa przejmowania i pierścień postępu leżą na płaszczyźnie jak dotąd. 2D (`SpaceArt.relay`, wołane z `drawNode` w `render-canvas.js`): boja z panelami i pierścieniem; strefa, łuk przejmowania i napisy bez zmian.
- **Surowce** (bez zmian w zasadach; inaczej wyglądają i się nazywają — `BoardArt.resourceLabel` / `crystalLabel` w kosmosie):

| Surowiec | Nazwa na planszy | 3D (`spaceDeposit`) | 2D (`SpaceArt`, zamiast `BoardArt.resource` / `crystal`) |
|---|---|---|---|
| Ruda | ASTEROIDA RUDY | skupisko asteroid 30 j. nad płaszczyzną z metalicznymi bryłkami | asteroidy z jasnymi żyłami i migoczącym połyskiem |
| Gaz | MGŁAWICA | świecące, półprzejrzyste kule fioletu i błękitu z jasnym sercem, lodowe drobiny wokół | pulsujący obłok z wirującymi pasmami; przy wydobyciu strumień ku górze |
| Kryształy | ODŁAMKI KRYSZTAŁU | mała asteroida najeżona złotymi kryształami | asteroida ze złotymi odłamkami |

- Etapy wyczerpania jak na planecie (0 wyczerpane … 6 pełne): mniej i mniejsze bryły, mniejszy obłok, mniej odłamków. Napisy nad złożami i bojami wyżej (unoszą się).

## Kosmos 3D (0.133)

Moduł `webgl3d/space-3d.js` (`createSpace3D`, grupa w scenie widoczna tylko na mapach kosmicznych; `three-renderer.js` woła `setGame` i co klatkę `update`). Wszystko proceduralne, w shaderach (szum 3D `SPACE_NOISE`), bez tekstur.

- **Przezroczysta płaszczyzna bitwy**: teren w kosmosie jest przezroczysty (`transparent`, bez zapisu głębi, uniform `spaceGround`); w shaderze terenu zamiast malowanego podłoża zostaje: welon mgły wojny (znane ×0,42, nieznane ciemniej, najwyżej 0,62), delikatna siatka taktyczna co 400 j. tam, gdzie strona widzi, świecąca cienka ramka wzdłuż granicy mapy i warstwa nakładki (rozkazy, zaznaczenia, plany budowy). Pas ziemi wokół mapy (`outskirts`) ukryty. Malowany kosmos z `space-art.js` zostaje dla planszy 2D i minimapy.
- **Gazowy olbrzym**: kula o promieniu 6500 j., środek 9500 j. pod płaszczyzną i 8500 j. na północ od mapy. Pasy chmur z turbulencją i dryfem prądów, drobne smugi, wiry, wielka burza (owal z zawirowaniem), miękki terminator, ciepłe pasmo zmierzchu, poświata krawędzi (Fresnel) i powłoka atmosfery (`halo`, dodawane światło). Oświetlona **zza siebie** (`backLight`, licencja artystyczna — planeta jest daleko): strona pod bitwą w nocy, ze śladem pasów i błyskami piorunów w burzach, jasny sierp wzdłuż dalekiej krawędzi — plansza zostaje czytelna.
- **Pierścienie**: pierścień 1,3–2,05 R z pasmami, przerwami i jasnymi pierścionkami, przechylony tak, że część przy bitwie schodzi w dół, a daleka wznosi się za planetą; cień planety liczony promieniem do światła.
- **Księżyc** z kraterami, mały i daleko.
- **Sfera kosmosu** (zamiast kopuły nieba `sky-3d.js`, która jest wtedy ukryta; podąża za kamerą, także pod horyzontem): trzy warstwy gwiazd z migotaniem i odcieniem, pas Drogi Mlecznej z jasnymi zgęstkami i ciemnymi pasmami pyłu, dwie mgławice (różowa i turkusowa) z włóknami, słońce — tarcza, korona, szeroka poświata.
- **Smuga flary** (sprite z dodawanym światłem) przez słońce, gdy jest w kadrze.
- Kamera w kosmosie widzi do 60 000 j., bez mgły odległości; brak cieni chmur na modelach; mocniejszy bloom.

## Głębia ostrości i smugi wybuchów (0.135)

- **Głębia ostrości** (`post-3d.js`, przebieg `dof` przed wykończeniem obrazu): typu tilt-shift — pas ±0,12 wysokości kadru wokół linii skupienia (0,47) jest ostry, dalej obraz rozmywa się coraz mocniej (do 7 px; nad pasem, czyli w dalszej części planszy, mocniej niż pod nim), także w narożnikach; rozmycie to dysk 18 próbek na spirali złotego kąta, jasne punkty ważą trochę więcej (plamki jak z obiektywu). Siła z przybliżenia kamery: 0,35 przy oddaleniu do 1 przy zbliżeniu (`three-renderer.js`). Tylko w kosmosie; przełącznik `dof` w Ustawieniach → Grafika (`scene-fx.js`, `menu.js`). Rozmycie jest w przestrzeni ekranu celowo: rozkazy i zaznaczenia leżą na przezroczystej płaszczyźnie bitwy, a głębia pod nią to daleka planeta — rozmycie według głębi rozmazałoby je.
- Od 0.142.2 łagodniej: pas ostrości ±0,2, narastanie na 0,4 wysokości kadru, do 5 px, narożniki ×0,45 od 0,6 odległości, siła 0,15–0,5.
- **Smugi wybuchów** (`three-renderer.js`): przy wybuchu w kosmosie sprite z teksturą cienkiej poziomej linii (jasny środek, gasnące końce), błękitnawy, z dodawanym światłem, przez pierwsze 45% życia wybuchu — rozbłyska od razu, wydłuża się i gaśnie.

## Głębia, światło, walka, otoczenie (0.134)

**Głębia i skala** (`space-3d.js`):
- Pole dalekich asteroid: 420 skał (instancje jednej nieregularnej bryły) na głębokości 700–4300 j. pod płaszczyzną, większe im głębiej, kilka bardzo dużych, wolno się obracają; 1800 lodowych drobin na 300–3100 j.
- Konwoje: trzy szeregi statków (razem do 18) na długich prostych trasach 1100–2600 j. w dół, z poświatą silnika i mrugającym światłem.
- Wrak stacji pierścieniowej (pierścień z modułami, szprychy — jedna złamana, piasta, odłamki przy pęknięciu) na 2300 j. w dół, obracający się, z kilkoma mrugającymi lampami.
- Mgiełka głębi (`hazed`): materiały pod płaszczyzną z każdą setką jednostek w dół bardziej przechodzą w ciemny błękit.

**Światło** (`three-renderer.js`, `ships-3d.js`, `space-3d.js`):
- Próżnia: słońce 3,1, światło rozproszone 0,4 — głębokie cienie.
- Poświata planety: drugie światło kierunkowe (`sun2`) w kolorze `#ff9a5c` od dołu, na spody kadłubów i stacji.
- Światła modeli w kosmosie jak nocą (`setNight(0.8)`): okna stacji, lampy; rzędy iluminatorów na burtach statków (`ports`).
- Flara obiektywu: sześć duchów (krążki, heksagony, pierścienie) na linii od słońca przez środek kadru, gdy słońce jest w kadrze; obok anamorficzna smuga.

**Walka**:
- Bąbel osłony 3D (efekt `shieldHit` z `ship`): przezroczysta kula wokół statku, jasna krawędź (Fresnel), rozbłysk w kierunku trafienia z heksagonalnymi komórkami, gaśnie z efektem.
- Wybuch w próżni: `space-rules.js` dopisuje do efektu wybuchu wysokość (`space`, `lift`: statek, stacja, dron); kula ognia na tej wysokości, nie unosi się; fala uderzeniowa jako płaski dysk w płaszczyźnie bitwy, szersza; w `scene-fx-3d.js` iskry we wszystkich kierunkach, żarzące się kawałki i ciemne odłamki kadłuba dryfujące 3–5 s bez grawitacji; bez dymu, kurzu i kraterów (`craters` czyszczone w kosmosie).
- Wraki: od 0.135.2 zniszczony statek się rozpada (`breakUp` / `animateBreak` w `three-renderer.js`, z `collapse`, 3,5 s): dwie kopie jego części (siatki z macierzami względem modelu, sklonowane materiały dwustronne z płaszczyzną przycięcia — `renderer.localClippingEnabled`), każda przycięta skośną płaszczyzną w miejscu pęknięcia; dziób odlatuje wzdłuż osi do przodu i lekko w górę, rufa do tyłu i w dół, obie obracają się w przeciwne strony i opadają, pod koniec maleją; na krawędziach pęknięcia pulsuje i gaśnie żar (sprite); 14 odłamków (czworościany, płytki, ośmiościany; co czwarty żarzący się) rozlatuje się we wszystkich kierunkach, wirując i malejąc. Oryginalny model jest ukryty; wrak sprzątany na końcu i przy zmianie mapy. Od 0.135.3 tak samo rozpadają się stacje (z platformą; także pas barier i śluza): przez 4,5 s, połowy rozchodzą się i obracają wolniej (×0,55), 22 odłamki zamiast 14, wolniejsze (×0,6).
- Działo niszczyciela: blask u wylotu rośnie od strzału do strzału (`cooldown`) i rozbłyskuje przy strzale.

**Otoczenie i czytelność**:
- Zorze: kurtyny zieleni i fioletu wokół biegunów planety, falujące, widoczne tylko przy krawędzi tarczy po stronie nocnej.
- Pierścienie z drobin: 6000 punktów lodu w płaszczyźnie pierścieni.
- Mgławice wielowarstwowe: po 12 warstw na złoże (gładkie i „obłoczne” tekstury z wielu plam), od 60 j. pod płaszczyzną do 110 j. nad nią — rozsuwają się przy ruchu kamery.
- Linie wysokości: od każdego statku i drona cienka linia w dół do jego punktu na płaszczyźnie taktycznej i mały krzyżyk tam (zielone swoich, czerwone wrogów). Od 0.135.1 to `THREE.LineSegments` o grubości jednego piksela, przygaszone i gasnące ku górze (`altLines` w `three-renderer.js`) — wcześniej świecące promienie jak pociski, które przy oddaleniu robiły się grubymi białymi „kołkami”.

## Dron górniczy (0.132.1)

- Robot (`worker`) na orbicie ma własny wygląd dla każdej frakcji: 3D `ships.miner` (`webgl3d/ships-3d.js`, wybierany w `builderOf` w `models-3d.js`, gdy misja jest w kosmosie) — kapsuła z kabiną i pasem koloru strony, cztery dysze na ramionach (płomień dłuższy w ruchu), ładownia, chwytaki na dziobie; przy pracy wiązka górnicza w dół i ruch chwytaków. Unosi się 22 j. (`DRONE_HOVER` w `three-renderer.js`), niżej niż okręty; zostawia słabe smugi silników.
- 2D (`SpaceArt.body` → `drone`): kapsuła z czterema świecącymi dyszami, chwytaki, ładownia złota z urobkiem, wiązka do złoża przy pracy.
- `space-rules.js` czyści ślady gąsienic (`tracks`) w kosmosie. Ekran ładowania (`loading-screen.js`, świat `space`) pokazuje gazowego olbrzyma.

## Głębia planszy (0.132)

- **Pył kosmiczny** (3D, `buildNebula`): ok. 2600 słabych punktów (biało-niebieskich i ciepłych) na wysokości 6–226 j. — przesuwają się względem siebie i namalowanych gwiazd, gdy kamera się rusza.
- **Smugi silników** (3D; od 0.133.1 wstęga): za rufą każdego statku i drona jedna ciągła wstęga przez jego pozycje z ostatnich 0,7 s (najwyżej 24 punkty, co 5 j.) — zwrócona do kamery, miękka w przekroju (tekstura gradientu), najszersza i najjaśniejsza przy dyszach, zwężająca się i gasnąca ku końcowi; wszystkie smugi w jednej siatce (`trailMesh` w `three-renderer.js`), rozdzielone zdegenerowanymi parami wierzchołków. Błękitna u Kolonii i strony patrzącego, pomarańczowa u Dominium i wroga. (W 0.132 smuga składała się z odcinków pocisków, każdy z jasną głową — wyglądała jak przerywany sznur.)
- **Lasery** (3D): statki strzelają z wysokości lotu do wysokości celu (efekt strzału ma `ship`, `shipTarget`, `lance` z `engine.js`) — szybkie impulsy, a niszczyciel długą wiązką od działa do celu, gasnącą w czasie strzału; błękitne od strony patrzącego, pomarańczowe od wroga.
- **Malowane tło** (`space-art.js`): odległe galaktyki (spirale z jasnym jądrem), włókna mgławic, wiry burz na tarczy planety, pierścienie wokół planety (pasma z przerwami i drobinami) z cieniem planety po stronie nocnej.

## Przeciwnik

`aiPickUnit` w kosmosie: stocznia lekka buduje korwety (więcej, gdy wróg ma duże okręty) i fregaty (więcej przeciw korwetom i lotnictwu), stocznia ciężka — niszczyciele i, od chwili ciężkich jednostek poziomu, krążowniki. Koszt i czas budowy liczone dla statku.

## Wygląd

- 2D (`space-art.js`, wtyczka `MapArt`): głęboki kosmos z pasmem galaktyki, mgławice nad złożami gazu, gwiazdy (część migocze), gazowy olbrzym Kharon pod południową krawędzią — pasy chmur, oko burzy, strona nocna i poświata atmosfery. Pola asteroid jako skupiska kraterowanych skał. Statki z góry: kadłub w barwach frakcji, pas koloru strony, płomienie silników (dłuższe w ruchu), migotanie osłony po trafieniu.
- 3D: płaska płaszczyzna bitwy (`relief-3d.js`, `webgl/terrain-height.js`), malowany kosmos jako teren bez ziarna PBR, mapy normalnych i cieni; asteroidy unoszą się 26–116 j. nad płaszczyzną i powoli dryfują (`models-3d.js`, `scene-life-3d.js`); brak rozrzuconych kamieni, zwierząt i ptaków. Niebo czarne, pełne gwiazd, bez chmur, z księżycem Kharona; twarde białe słońce z boku, przyciemnione niebieskie światło otoczenia i ciepłe odbicie od planety; bez mgły wysokościowej i promieni; własna gradacja barw `space`.
- Stacje (0.131): w 3D każdy budynek poza murem i bramą stoi na platformie (`ships.platform` z `webgl3d/ships-3d.js`, dodawanej w `models-3d.js` przy tworzeniu modelu, gdy misja jest w kosmosie): ośmiokątny pokład z pierścieniem świateł, zwężający się spód z jarzącym się rdzeniem i rozpórkami, a u większych stacji trzy ramiona dokujące z gondolami, pasem koloru strony i czerwonym sygnałem. Renderer unosi stację o `0,8 × promień + 10` j. (`stationLift`), wyżej stawia też jej znaczniki. W 2D pod budynkiem leży ośmiokątny pokład z migającymi światłami (`SpaceArt.body`, potem rysuje się budynek).
- Mgławice (0.131): w 3D świecące obłoki (sprite'y z dodawanym światłem, fiolet i błękit) na wysokości 30–100 j. nad każdym złożem gazu (`buildNebula` w `three-renderer.js`); w 2D statki w obłoku są półprzezroczyste.
- Zniszczone statki i stacje w 3D spadają ze swojej wysokości (`collapse`; dotyczy też lotnictwa).
- Modele statków (`webgl3d/ships-3d.js`): kadłuby Kolonii zaokrąglone z błękitnymi napędami, Dominium sześciokątne z pomarańczowymi; korweta z płetwami i dwoma napędami, fregata z gondolami i wieżą podwójną, niszczyciel zbudowany wokół działa liniowego wystającego przed dziób, krążownik z nadbudówką, trzema wieżami i hangarami. Statki unoszą się `RTS.SPACE.hover` (34 j.) nad płaszczyzną, kołyszą się, wieże śledzą cel, płomienie rosną w ruchu, światła pozycyjne mrugają.

## Dalsze kroki

- Strażnicy artefaktu właściwi dla kosmosu (dziś zostają stworzenia planety).
- Lotniskowiec wypuszczający myśliwce; mgławice ograniczające widzenie.
- Desant z orbity na planetę — wdrożony w 0.152 jako tryb „Inwazja”, zob. [Desant z orbity](DESANT_Z_ORBITY.md); dalej transport w kampanii — zob. [Pomysły](POMYSLY.md).
