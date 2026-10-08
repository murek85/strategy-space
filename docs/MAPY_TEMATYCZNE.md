# Mapy tematyczne scenariuszy

Wdrożono 2026-09-26, wersja 0.19.

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
