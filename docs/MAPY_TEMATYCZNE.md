# Mapy tematyczne scenariuszy

Wdrożono 2026-09-26, wersja 0.19.

## Mapy zmienne w czasie — krok M5 (wersja 0.166, 2026-10-09)

Zasady: `world-rules.js` (w łańcuchu po `space-rules.js`, wartości w `RTS.WORLD`). Grafika: `world-art.js` (Canvas i PixiJS) i `webgl3d/world-3d.js` (3D). Plan M1–M5 jest tym samym zakończony.

- **Przypływy — Archipelag Thalassy.** Od 3. minuty co 4 minuty morze na minutę zalewa sześć mielizn (`tides` w układzie mapy: ciała wody nad brodami, skalowane z mapą). 15 s wcześniej ostrzeżenie „Przypływ za 15 s”, potem „Przypływ — mielizny pod wodą”, na koniec „Odpływ”. Przy wysokiej wodzie brody blokują jak morze, a jednostki stojące na nich wypływają na najbliższy brzeg. Na mieliźnie nie da się budować; złoża i przekaźniki nigdy na nią nie trafiają (także po zmianie ziarna i rozmiaru). Stan wynika z zegara gry — nic nie trafia do zapisu. 2D: woda wpływa na brody (z pulsującą zapowiedzią przy ostrzeżeniu); 3D: tafla morza nad brodami.
- **Pękający lód — Lodowe Archiwum.** Jezioro w środku jest skute lodem (woda `kind: "ice"`): lód niesie jednostki (silnik pomija go przy blokadzie), ciężkie maszyny (czołgi, ciężkie, artyleria, bastiony, niszczyciele, kolosy, transportery) zwalniają na nim do 60%. Wybuch od rozmiaru 36 wybija przerębel (promień 26–70) na 45 s: przerębel blokuje, jednostki naziemne w nim tracą 30% zdrowia i zostają wypchnięte, nie zostaje krater; przerębel zamarza po 45 s (blednie w ostatnich 10 s). Przerębla są w zapisie (`iceHoles`). 2D: tafla lodu ze śnieżnym brzegiem i pęknięciami, przerębel z białym obrzeżem i szczelinami; 3D: ciemna woda w pierścieniu lodu.
- **Szlak Komet — nowa mapa kosmiczna (`comets`).** Pas Ikara z dwoma szlakami komet (zachód–wschód i północ–południe), każdy przelot co 3 minuty. Warkocz (560 długości) rani statki, które się w nim znajdą (16/s, najpierw osłony), a głowa w promieniu 260 uzupełnia pola gazu do stanu z początku gry (40/s). 10 s przed przelotem ostrzeżenie. Kometę rysuje 2D (świecąca głowa, zakrzywiony warkocz) i 3D (głowa z poświatą i warkocz z pyłu).
- Silnik: woda rodzaju `ice` nie blokuje (`engine.js`, `blocked`), rzeźba 3D lekko zagłębia lód.
- Testy: `tests/world-rules.test.js` — przypływ (harmonogram, blokada, ostrzeżenia, wypłukanie na brzeg, brak budowy i złóż na brodach w 3 rozmiarach i 3 ziarnach), lód (przejście, spowolnienie, przerębel, obrażenia i wypchnięcie, brak krateru, zapis, zamarzanie), komety (oba szlaki, obrażenia w warkoczu, uzupełnianie gazu, ostrzeżenie).

## Nowe światy — krok M4 (wersja 0.165, 2026-10-09)

Dwa nowe światy jako **motywy** (`theme`) na istniejących biomach — biom decyduje o zasadach (pogoda, fauna), motyw o wyglądzie terenu. Grafika: `world-art.js` (wtyczka `MapArt` dla Canvas; PixiJS używa tej samej tekstury, 3D maluje z niej grunt i buduje własne modele).

| Mapa | Świat | Teren | Gdzie |
|---|---|---|---|
| Archipelag Thalassy (`thalassa`) | ocean (`theme: "ocean"`, biom `ash`: sztormy z deszczem, pajęczaki na plażach) | dwie szerokie, zakrzywione cieśniny morza wokół wyspy środkowej z najbogatszymi złożami i dwie krótkie cieśniny od zachodu i wschodu; mielizny (brody ok. 180) na przekątnej pierścienia i w cieśninach — wszystkie szlaki przez brody | scenariusze i sieć |
| Kryształowe Grzbiety (`crystals`) | Nivalis (`theme: "crystal"`, biom `ice`: śnieżyce, rogacze lodowe) | dwa łuki grzbietów z kolumn kryształu (nowa przeszkoda `crystal`) wokół odsłoniętego płaskowyżu z najbogatszymi kryształami; wejścia ze wschodu i zachodu i wąskie przełęcze w środku łuków; szczeliny lodowca bliżej narożników | XIII · Ostatnia orbita (dotąd Biały Przesmyk) |

- **Morze**: woda rodzaju `kind: "sea"` — blokuje jak jezioro; 2D: plaże, mokry piasek, płycizny, głębia i linia przyboju (rysowane jako jedna linia brzegowa z nakładających się ogniw), palmy i trawy na lądzie, odblaski fal; 3D: własna powierzchnia wody (`WATER.sea` w `scene-fx-3d.js`, płaska jak jezioro), zagłębienie w rzeźbie (`relief-3d.js`, `webgl/terrain-height.js`), roślinność wysp (`scatter-3d.js`: trawa, paprocie, drzewa liściaste) i trzciny z kamykami na brzegach.
- **Kolumny kryształu**: przeszkoda `kind: "crystal"` — 2D: kępy sześciokątnych pryzmatów w błękicie i fiolecie, iskry, nocna poświata (także światło w PixiJS); 3D: pryzmaty z ostrymi szczytami na oszronionym pagórku, świecące (więcej nocą); grunt motywu — szron z żyłkami kryształu, w 3D odłamki kryształu w śniegu.
- Kolory motywów w tle menu, scenach łączności, ekranie ładowania i gradacji 3D.
- **Wydajność**: silnik trzyma akweny w siatce komórek 256 (`watersNear`, gdy jest ich ponad 24) — mapa z morzem ze 124 ogniw liczy się jak inne mapy (symulacja 4 graczy, 4 min: 8,4 s wobec 7,3 s na Rzekach Magmy).
- **XIII**: bazy na stałych miejscach (Kolonie SW, Vok NE). Symulacja (`node tools/act4-sim.js --chapters colony13`, Biały Przesmyk → Kryształowe Grzbiety): łatwy — zwycięstwo 5:14 → 5:14; średni — porażka 17:09 → 15:09; trudny — porażka 9:49 → 9:46. **Uwaga:** na średnim bot przegrywa także na starej mapie (w H7 wygrywał ledwo, 16:52): po desancie nie przełamuje bazy Vok i nie dochodzi do decyzji. To ograniczenie bota (czeka na 28 jednostek poza obroną bazy przy limicie 60); próby łagodniejszego strojenia (mniejsza armia i garnizon Vok, niższy próg natarcia bota) nie dały zwycięstwa. **Naprawione w 0.166.2** — przyczyna i strojenie: [AKT_IV.md](AKT_IV.md), „Balans rozdziału XIII”.
- Testy: `tests/campaign-maps.test.js` — morze (ponad 60 ogniw, ponad 20% mapy w trzech rozmiarach, cały ląd osiągalny), siatka akwenów zgodna z pełną listą (4000 punktów), XIII wśród kolumn kryształu z otwartymi wejściami.

## Nowe mapy kampanii — krok M3 (wersja 0.164, 2026-10-09)

| Mapa | Wygląd | Teren | Rozdział |
|---|---|---|---|
| Doki Eos (`eosdocks`) | orbita pustynnej Eos | stocznia Kolonii: długie pomosty doków (nowa przeszkoda `dock`) tworzą pochylnię przez środek z najbogatszym złożem, wieże cumownicze i pola asteroid wyznaczają korytarze na flankach; burze słoneczne i deszcz odłamków | X · Blokada Eos (dotąd Orbita Kharona) |
| Szkarłatna Mgławica (`crimson`) | czerwona mgławica nad gazowym olbrzymem | ok. 64% pola w obłokach mgławicy (trudniej trafić, osłony się nie odnawiają), czysty korytarz po przekątnej od narożnika do narożnika, ciemne pola asteroid — mapa zasadzek; burze jonowe i rozbłyski | scenariusze i sieć |

- X: Kolonie startują na południowym zachodzie, stacja blokady Admiralicji na północnym wschodzie (`RTS.CAMPAIGN_MAPS.colony10`).
- Balans X (`node tools/act4-sim.js --chapters colony10`, Orbita Kharona → Doki Eos): łatwy — wygrana 2:31 → 2:31; średni — wygrana 4:41 → 4:05; trudny — wygrana 8:01 → 8:51.
- Szczegóły techniczne (przeszkoda `dock`, obłoki `nebulae`, planeta `desert`): [BITWA_NA_ORBICIE.md](BITWA_NA_ORBICIE.md). Paczka 3D przebudowana (`npm run build:3d`).
- Testy: `tests/campaign-maps.test.js` — X na Dokach z pustynną Eos; Mgławica: pokrycie obłokami powyżej 55% w trzech rozmiarach, czysty korytarz, obłoki po wczytaniu zapisu takie same i poza zapisem, brak obłoków na lądzie.

## Nowe mapy kampanii — krok M2 (wersja 0.163, 2026-10-09)

| Mapa | Świat / wygląd | Teren | Rozdział |
|---|---|---|---|
| Wypalona Dolina (`ashvalley`) | Eos, pył / `dunesea` | Dolina Latarni z rozdziału I po desancie: rozbity krążownik w trzech sekcjach na miejscu latarni (przejścia między nimi), szczątki zestrzelonych kapsuł, ocalałe ruiny i oazy | XI · Kapsuły nad Eos (dotąd Cichy Horyzont) |
| Bastion Admiralicji (`bastion`) | Nadir, popiół / `derelict` | dwa bastiony w narożnikach NE i SW, każdy za murem z bramą zachodnią i południową (odpowiednio wschodnią i północną) i wieżą na rogu; przez środek Popielny Szlak z wieżami przetwarzania, ścianami narośli i złożami | XII · Twierdza Admiralicji (dotąd Popielny Szlak) |

- XI: gracz ląduje tam, gdzie w rozdziale I stała jego baza (SW), Admiralicja okopała się w NE.
- XII: Twierdza Admiralicji w bastionie NE, Kolonie w opuszczonym bastionie SW; stacja uplink w połowie Popielnego Szlaku.
- W scenariuszu na Bastionie dwie pierwsze strony zawsze startują w bastionach (`prefer` w definicji mapy), trzecia i czwarta — w otwartych narożnikach.
- Balans (`node tools/act4-sim.js --chapters colony11,colony12`, przed → po):

  | Rozdział | Łatwy | Średni | Trudny |
  |---|---|---|---|
  | XI | wygrana 2:20 → 2:21 | wygrana 2:45 → 2:46 | porażka 9:18 → 9:49 |
  | XII | wygrana 2:36 → 2:35 | wygrana 3:20 → 2:51 | porażka 7:46 → 9:53 |

  XII jest nieco łatwiejszy, bo mur chroni też bazę gracza; strojenie aktu (H7) zostaje bez zmian.
- Testy: `tests/campaign-maps.test.js` obejmuje obie mapy (symetria, dostępność, stałe bazy XI i XII, wrak w XI, osiągalna stacja uplink, bastiony w scenariuszu).

## Nowe mapy kampanii — krok M1 (wersja 0.162, 2026-10-09)

Plan rozbudowy map (propozycja z 0.161): M1 — trzy mapy dla rozdziałów I–III; M2 — Bastion Admiralicji i zniszczona Dolina Latarni dla XI–XII; M3 — Doki Eos (X) i Szkarłatna Mgławica; M4 — nowe biomy (ocean, kryształ), Archipelag Thalassy, Kryształowe Grzbiety, mapa dla XIII; M5 — Szlak Komet, przypływy i pękający lód.

M1 (`campaign-maps.js`, rejestrowane w `RTS.FRONTIER_MAPS`, więc działają też jako scenariusze, w grze sieciowej i w podglądzie `tests/maps-browser.html`):

| Mapa | Świat / wygląd | Teren | Rozdział |
|---|---|---|---|
| Dolina Latarni (`lanterns`) | Eos, pył / `dunesea` | otwarta kotlina: niskie grzbiety wydm z wieloma przejściami, wzgórza, ruiny osady, oazy na krańcach, bogate złoża w środku | I · Iskra na Eos |
| Lodowe Archiwum (`vesper`) | Vesper, lód / `frozenhive` | skute jezioro przez środek (obejście brzegiem północnym albo południowym), szczeliny lodowca z krańców, ruiny stacji, narośle | II · Archiwum pod lodem |
| Ruiny Nadiru (`nadir`) | Nadir, popiół / `derelict` | miasto Prekursorów: siatka kwartałów z wąskimi ulicami, aleja i bulwar z placem cytadeli w środku, wieże przetwarzania na dwóch placach | III · Świt nad Nadir |

- Każdy układ jest symetryczny względem obrotu o pół obrotu wokół środka mapy, więc przeciwległe narożniki są równe w scenariuszu (2–4 graczy, trzy rozmiary).
- W rozdziałach bazy stoją na stałych miejscach (`RTS.CAMPAIGN_MAPS`): I — gracz na południowym zachodzie, Dominium na północnym wschodzie; II — północny zachód / południowy wschód; III — zachód / wschód (cytadela). Dotąd narożniki losowało ziarno, a teren był kilkoma prostokątami skał. `advanced-rules.js`: `baseSpots()` (domyślnie narożniki z ziarna) i wywołanie `applyCampaignMap()` przed rozstawieniem baz.
- Fauna rozdziałów mieszka w legowiskach mapy (`habitats`).
- Gładkie skały (bez `kind`) przy środku niosą w 3D pomniki aktu I (latarnia Eos, brama archiwum, obelisk cytadeli), a w rozdziale I skała przy bazie gracza — Stację Ciszy.
- Szkolenie zostaje na dotychczasowym poligonie. Zapisy rozpoczętych rozdziałów I–III wczytują się na starym terenie (teren jest w zapisie).
- Tempo (symulacja biernego gracza, poziom średni): porażka po 379 / 440 / 354 s wobec 318 / 418 / 374 s na starych układach.
- Testy: `tests/campaign-maps.test.js` (symetria, dostępność złóż, przekaźników i baz w scenariuszach 2 i 4 graczy; stałe bazy, 8 przekaźników, legowiska, skała pomnika i zapis w rozdziałach). Zaktualizowane: `tests/themed-maps.test.js` (rozdziały I–III mają własny teren), `tests/campaign-ai.test.js` (centrum biernego gracza podtrzymywane podczas sprawdzania produkcji AI).

## Każde złoże do wykorzystania (wersja 0.151.3, 2026-10-08) — wszystkie mapy

- Problem: ekstraktor stoi dokładnie na złożu gazu (`canBuild` w `engine.js`), a część złóż leżała w przeszkodzie (asteroida, skała) lub bliżej niż pozwalają zasady przy rudzie, kryształach, przekaźniku, innym złożu albo budynku — nie dało się ich nigdy zabudować. Diagnoza (wszystkie mapy scenariuszy × 3 rozmiary × 4 ziarna): 20 z 816 złóż — Orbita Kharona i Cmentarzysko (asteroida rudy obok), Pierścienie Glacjalis (w przeszkodzie), Rzeki Magmy (ruda obok), Słoneczna Dolina i Bliźniacze Słońca (na nieruchomym Paszczaku — złoża przesunięte przy skalowaniu mapy); w kampanii rozdziały I i II (ruda obok).
- Nowy moduł `deposit-rules.js` (ostatni moduł reguł): po `configureMission` (każda misja i rozdział) i `configureSkirmish` (scenariusze — skalowanie i generowanie mapy) `settleDeposits()` przesuwa złoże gazu, na którym ekstraktor nie spełnia zasad, do najbliższego wolnego miejsca (pierścienie co 20 do 400 wokół, 16 kierunków; `gasSiteFree` — zasady `canBuild` z małym zapasem, bez zasięgu gracza); złoże rudy lub kryształów, do którego robot nie może podejść (`oreReachable`), tak samo. Jednostki i fauna ruchoma są pomijane (odejdą lub zginą), budynki i nieruchome stworzenia się liczą. Deterministyczne — jednakowe w grze sieciowej; poprawne złoża zostają na miejscu.
- Zasięg bez zmian: ekstraktor nadal tylko w zasięgu centrum (380) lub własnego przekaźnika (240).
- Testy: `tests/deposits.test.js` (3) — każda mapa scenariuszy, rozmiar i ziarno oraz każdy rozdział kampanii: ekstraktor mieści się na każdym złożu gazu, każde złoże rudy jest osiągalne; wymuszony przypadek (złoże w skale i przy rudzie) przesunięty, deterministycznie; poprawne złoża nietknięte. Cztery nowe mapy w Gra jednoosobowa → Scenariusze, dostępne we wszystkich trybach (Podbój, Utrzymanie przekaźników, Obrona) i rozmiarach (mała, średnia, duża).

Mapy są inspirowane klimatem filmów science fiction — bioluminescencyjne dżungle i latające góry oraz pustynie pod dwoma słońcami i światy lawy — ale mają własne nazwy, planety i projekty. Nie używają nazw, postaci ani elementów chronionych marek.

## Mapy

| Mapa | Planeta | Teren | Znaczenie taktyczne |
|---|---|---|---|
| **Świetlisty Gąszcz** | Lumeria V | Kręta świetlista rzeka przez środek mapy, dwa rozlewiska, 12 olbrzymich drzew, unoszące się wyspy nad zakolami. Nocą drzewa, woda i świetliki jarzą się mimo zmroku | Rzekę da się przejść tylko trzema brodami. Drzewa blokują ruch i dają piechocie osłonę jak skały |
| **Wiszące Szczyty** | Aerion | Krzyż bezdennych rozpadlin z mgłą; nad nimi odwrócone skalne szczyty z trawą, pnączami i wodospadami; skalne iglice | Cztery płaskowyże połączone czterema mostami w pierścień. Lotnictwo przelatuje nad przepaściami |
| **Wydmy Bliźniaczych Słońc** | Kessar | Jałowa pustynia ze zmarszczkami wydm, sześć nieregularnych płaskowyżów, oaza, rozbity krążownik (dziób, nadbudówka z wieżyczkami, silniki) z odłamkami, drugie słońce na niebie | Kaniony między płaskowyżami; kadłub przecina środek z dwoma przejściami między pękniętymi sekcjami. Kryształy przy wraku |
| **Rzeki Magmy** | Pyrrhos | Dwie rzeki lawy z płytami zastygłej skorupy, kaldera w środku, obsydianowe iglice, żarzące się pęknięcia; nocą lawa oświetla okolicę, unoszą się iskry | Pas centralny z najbogatszymi złożami dostępny dwiema bazaltowymi przeprawami przez każdą rzekę |

Każda mapa ma własną nazwę zjawiska pogodowego (Tropikalna ulewa, Burza w chmurach, Burza piaskowa, Burza wulkaniczna). Pogoda, fauna, drapieżniki i muzyka korzystają z bazowego biomu mapy (popiół lub pył). Na mapach jałowych (szczyty, pustynia, lawa) nie rośnie roślinność biomu; szczyty dostają własną trawę.

Od wersji 0.130 dochodzi mapa w kosmosie **Orbita Kharona** (orbita gazowego olbrzyma Kharon; pas asteroid z trzema korytarzami; statki zamiast pojazdów) — opis w [Bitwa na orbicie](BITWA_NA_ORBICIE.md).

## Zasady terenu

- Rzeki, rozpadliny i lawa to łańcuchy nakładających się owalnych obszarów (`waters` z polem `kind`: `glow`, `chasm`, `lava`). Blokują ruch naziemny jak jeziora; lotnictwo je przelatuje. Brody i mosty to celowe przerwy w łańcuchu.
- Nowe przeszkody (`obstacles` z polem `kind`: `grove`, `spire`, `mesa`, `wreck`, `debris`) zachowują dotychczasowe zasady kolizji i osłony. Zwykłe jeziora i skały są rysowane jak dotąd.
- Lawa i rozpadliny nie zadają obrażeń — różnią się wyglądem, nie mechaniką.
- Skalowanie do małej i dużej mapy przesuwa i proporcjonalnie zmniejsza elementy tak samo jak na pozostałych mapach; na dużej dochodzą standardowe dodatkowe złoża, skały i jeziora.

## Zmiany techniczne

- `frontier-maps.js`: definicje map i ich układów; łańcuchy terenu z brodami; przeniesienie jednostek i siedlisk, które wypadłyby w nowym terenie; przekaźniki rozstawiane przy nowych złożach.
- `map-art.js`: warstwa statyczna w teksturze terenu (podłoże, rzeki, rozpadliny, lawa, drzewa, iglice, płaskowyże, wrak), animacje pod jednostkami (mgła), latające wyspy nad jednostkami, warstwa świecenia po nocnym oświetleniu oraz drugie słońce. Pozostałe moduły grafiki pomijają nowe rodzaje terenu.
- Minimapa pokazuje teraz wodę, lawę i rozpadliny w kolorach rodzaju terenu (wcześniej woda nie była na niej rysowana). Podgląd mapy w menu również.
- `blocked()` sprawdza najpierw prostokąt ograniczający każdego obszaru wodnego — kształt brzegu nigdy go nie przekracza, więc wynik się nie zmienia, a nowe mapy z kilkudziesięcioma elipsami nie spowalniają wyszukiwania drogi.
- Nazwa pogody może być zdefiniowana w misji (`weatherName`); flaga `barren` wyłącza roślinność biomu.

## Weryfikacja

- `tests/frontier-maps.test.js`: 4 testy — definicje i pogoda; szczelność rzek, rozpadlin i lawy poza brodami (0 przepuszczalnych wierszy) oraz trasy przez przejścia; zachowanie rodzajów terenu po konfiguracji, zmianie rozmiaru i zapisie; osłona przy drzewach i przelot lotnictwa nad przepaścią. Test układów w `tests/scenario-modes.test.js` obejmuje teraz wszystkie mapy scenariuszy: 8 map × 3 rozmiary × 2 i 4 graczy. Pełny `npm test`: 149 testów, wszystkie przechodzą. `tests/menu-browser.html`: 37/37.
- Nowa strona `tests/maps-browser.html`: podgląd całej mapy i środka w skali 1:1 bez mgły wojny, przełącznik rozmiaru i nocy, automatyczna kontrola rysowania wszystkich map (24/24).
- W grze: wczytanie każdej nowej mapy bez błędów konsoli. Płynność przy przybliżeniu ok. 1,6 w lokalnej przeglądarce: Popielny Szlak (odniesienie) 107 klatek/s; Świetlisty Gąszcz 101, Wiszące Szczyty 79, Wydmy 134, Rzeki Magmy 87; najgorsza klatka 18 ms na wszystkich mapach, także na odniesieniu. Czas JavaScriptu na klatkę 1,2–3,0 ms wobec 2,5 ms; różnicę daje rysowanie półprzezroczystych warstw przez przeglądarkę.
- Balans map (odległości, liczba przejść, rozmieszczenie złóż) wymaga prawdziwych rozgrywek.

## Wersja 0.20 — odświeżone klasyczne mapy

Wdrożono 2026-09-26. Cztery pierwotne mapy scenariuszy dostały nowy teren i klimat; rozdziały kampanii aktu I na tych samych światach — tylko nowy wygląd. Inspiracja klimatem pustynnych planet z czerwiami i horroru o obcym statku; nazwy i projekty są własne.

| Mapa | Klimat | Nowy teren |
|---|---|---|
| **Cichy Horyzont** (Khepri IV) | morze wydm | Dwa grzbiety wydm (po dwa przejścia), otwarty erg z paszczakami, 8 skalnych wysp, bruzdy po czerwiach, falujące wydmy ruszane wiatrem, kręgi „znaku czerwia” wokół widocznych paszczaków |
| **Słoneczna Dolina** (Helion II) | złote wydmy | Kanion między skalnymi ścianami z przejściami na różnych wysokościach, dwie oazy na dnie, wydmy na flankach |
| **Popielny Szlak** (Vulkan IX) | wrak obcego statku | Żebrowany kadłub w kształcie podkowy otwarty na południe, w środku jaja, kryształy i siedlisko pajęczaków; pola jaj, żywiczne ściany, dwie dymiące wieże przetwarzania atmosfery; jaja pulsują nocą, wieże migają |
| **Biały Przesmyk** (Nivalis) | zamarznięta placówka | Szczeliny lodowca z mostami na północy i południu, ruiny modułów w centrum, zamrożone narośla i kokony, rogacze między ruinami |

Nowe rodzaje terenu: `dune`, `crevasse` (blokujące jak woda, lotnictwo przelatuje) oraz `outcrop`, `derelict`, `eggs`, `resin`, `processor`, `ruin` (przeszkody z osłoną jak skały). Na tych mapach nie rośnie roślinność biomu.

**Kampania** (Szkolenie, Iskra na Eos, Archiwum pod lodem, Świt nad Nadir): podłoże i efekty w klimacie wydm, zamarzniętej placówki lub wraku, zwykłe skały otrzymują nawiany piasek, żywiczne żyły albo śnieg. Układ terenu, złoża, jednostki i przebieg bez zmian — porównanie z wersją sprzed zmian: identyczny stan startowy (poza nowym pustym polem `mapVersion`) i identyczna 3-minutowa symulacja wszystkich czterech misji.

**Zapisy:** nowy teren powstaje przy konfiguracji scenariusza, więc każda gra z menu Scenariusze dostaje nową wersję mapy (`mapVersion: 2` w zapisie). Zapisy scenariuszy na tych czterech mapach sprzed zmiany są odrzucane: ekran główny pokazuje „Zapis pochodzi ze starszej wersji mapy … Rozpocznij nową operację”, a slot jest oznaczony „Starsza wersja mapy”. Zapisy kampanii, nowych map tematycznych i pozostałe działają jak dotąd. Sam konstruktor gry (używany przez testy silnika) zachowuje klasyczny układ.

**Weryfikacja:** `tests/themed-maps.test.js` — 5 testów (nowy teren po konfiguracji, klasyczny układ konstruktora i kampanii, szczelność grzbietów i szczelin poza przejściami, dostęp do wnętrza wraku w trzech rozmiarach, odrzucanie starych zapisów przy zachowaniu pozostałych). Układy wszystkich map sprawdza również `tests/scenario-modes.test.js` (4 mapy × 3 rozmiary × 2 i 4 graczy). Pełny `npm test`: 154 testy, wszystkie przechodzą; `tests/menu-browser.html` 37/37. `tests/maps-browser.html` pokazuje teraz też rozdziały kampanii. W grze: wczytanie Martwego Statku, Morza Wydm i Świtu nad Nadir bez błędów, 99–170 klatek/s. Balans nowych układów wymaga rozgrywek.
