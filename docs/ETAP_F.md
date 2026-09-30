# Etap F — grafika, scenariusze, frakcje i kampania (wersje 0.35–)

Aktualizacja: 2026-09-27. Zakres wybrany przez użytkownika z propozycji rozwoju: efekty nowych mechanik i zapowiedź pogody; modyfikatory scenariuszy, nowe tryby i drużyny 2 na 2; wyraźniejsze różnice i wygląd frakcji oraz trzecia frakcja; mapa kampanii i akt III. Realizowane etapami, każdy jako osobna wersja.

## F1 — Efekty nowych mechanik i zapowiedź pogody (0.35)

### Efekty

Wspólny opis efektów w `fx-art.js` (`FxArt.shapes`): efekt to lista prostych kształtów (okrąg, koło, linia, łuk, krzyżyk), którą Canvas rysuje przez `FxArt.drawShapes`, a WebGL przez `FxArt.drawPixi` na grafice modeli — jeden rysunek, oba tryby identyczne. Efekty tworzy `game.fx(rodzaj, x, y, dane)`.

| Efekt | Kiedy |
|---|---|
| Rozbłysk na kopule (`shieldHit`) | Generator osłon przejmuje obrażenia: fala w miejscu trafienia i łuk kopuły (co najwyżej ~8 na sekundę na generator) |
| Leczenie (`heal`) | Punkt medyczny leczy piechura: zielony krzyżyk co 0,8 s |
| Iskry (`sparks`) | Robot rozbiera wrak; budynek montuje moduł |
| Pył (`dust`) | Każda porcja wydobytej rudy lub kryształów (także roboty przeciwnika) |
| Impuls (`emp`) | Ładunek sabotażystów wyłącza budynek |
| Rozbłysk artefaktu (`artifact`) | Podniesienie i upuszczenie artefaktu |

**Kratery.** Duży wybuch (od rozmiaru 60: zniszczone budynki i ciężkie maszyny, artyleria) zostawia krater — stan gry (`game.craters`, najwyżej 60, zapisywany), znika po 5 minutach, blednąc w ostatniej minucie. Canvas rysuje je w fazie gruntu, WebGL jako obiekty gruntu (ta sama grafika `FxArt.crater`). Wcześniejsze ślady spalenizny WebGL zostają.

### Zapowiedź pogody

- Każda burza nadciąga z jednego z ośmiu kierunków, stałego dla danej burzy (mapa, ziarno scenariusza, numer burzy): `game.stormFront(n)`, `game.stormOutlook`.
- Bez badań burzę widać 20 s wcześniej, z monitoringiem pogody (badanie + laboratorium) — 60 s wcześniej, z dokładnym czasem. Komunikat: „Nadciąga burza piaskowa z zachodu — za ok. 18 s.”; pasek pogody podaje kierunek.
- Na ekranie: pas w kolorze burzy (piasek, śnieg, deszcz) przy krawędzi, z której nadchodzi, strzałka i napis z odliczaniem; pas rośnie w miarę zbliżania się burzy. Od 0.42.1 zastąpiony wskaźnikiem kierunku (niżej).
- Na minimapie: front burzy — przerywana linia i pas, który przed burzą rośnie przy krawędzi, a przez pierwsze 12 s burzy przesuwa się przez całą mapę.

### Weryfikacja

- `tests/fx.test.js` — 4 testy: kratery (tylko duże wybuchy, zapis, wygasanie, uszkodzony zapis), efekty osłony, leczenia, montażu i wydobycia, prognoza burzy (kierunek, 20 i 60 s, komunikat, nadciąganie), zgodność z ustawieniem pogody scenariusza. `npm test` 200/200.
- `tests/render-webgl-browser.html` — PASS; `tests/render-browser.html` — PASS po zapisaniu nowego wzorca (3 sceny zmienione przez nowe efekty, 4 przez poprawkę tras z 0.34.2).
- Scena ze wszystkimi efektami i nadciągającą burzą porównana wzrokowo w Canvas i WebGL; front burzy na minimapie w trzech fazach.

## F2 — Modyfikatory scenariuszy i nowe tryby (0.36)

Reguły trybów w nowym module `scenario-challenges.js` (ładowany po `scenario-setup.js`, przed `enemy-ai.js`); opcje, opisy i kod operacji w `scenario-setup.js`.

### Modyfikatory z Kierunków

- **Długość doby:** krótka (4 min), zwykła (6 min), długa (10 min), wieczny dzień. Ta sama krzywa nocy co w silniku, tylko na innym okresie.
- **Poziom startowy:** Przyczółek albo Kolonia (centrum II od startu — fabryka, laboratorium, hangar i warsztat od razu). Dowódca AI stawia wtedy fabrykę 90 s wcześniej.

### Król wzgórza

Przekaźnik najbliżej środka mapy staje się **Szczytem**. Każda sekunda jego posiadania liczy się stronie, która go trzyma; wygrywa pierwsza, która utrzyma go łącznie przez 1,5, 3 albo 5 min (ustawienie „Czas na Szczycie”). Zniszczenie wszystkich wrogich centrów nadal wygrywa. Dowódca AI wysyła połowę armii na Szczyt i trzyma go, a ataki kieruje na Szczyt, gdy go nie ma; klasyczne desanty w dwóch trzecich idą na Szczyt. Na planszy Szczyt ma obracający się pierścień w kolorze posiadacza z łukiem postępu i napis „♛ SZCZYT” (widoczne przez mgłę), na minimapie — pulsujący okrąg.

### Przetrwanie

Bez wrogiej bazy: od 90. sekundy z krawędzi mapy (z dala od bazy gracza, od 5. fali z dwóch stron) nadchodzą fale — 4 jednostki i o 2,2 więcej z każdą falą (maks. 45; łatwy ×0,75, trudny ×1,3), czołgi od 3., ciężkie maszyny od 6., myśliwce od 8., artyleria od 10. fali; odstęp 45 s, skracany do 30 s. Jednostki, które zniszczą cel, szukają kolejnego budynku. Gra kończy się utratą centrum: wynik podaje czas, liczbę pełnych fal i zniszczonych przeciwników, a najlepszy czas na każdej mapie i poziomie jest zapamiętywany (`pogranicze-records-v1`) i pokazywany w menu. Liczba graczy i rodzaj przeciwnika nie mają znaczenia.

### Kod operacji

Nowe litery trybu: `H` + sekundy na Szczycie (np. `H180`), `V` — Przetrwanie. Długość doby (`S/N/L/D`) i poziom startowy (`O/C`) są dopisywane do grupy złóż/fauny/pogody tylko wtedy, gdy różnią się od domyślnych (np. `NNNLC`) — wcześniejsze kody pozostają ważne.

### Weryfikacja

- `tests/challenges.test.js` — 8 testów: długość doby, poziom startowy (gracz i AI), Szczyt (wybór, wygrana, przegrana), dowódca AI na Szczycie, Przetrwanie (brak bazy, fale z krawędzi, skład, wynik, rekord), skalowanie fal z poziomem, kod operacji, zapis i odczyt. `npm test` 208/208.
- Symulacje: w Królu wzgórza średni dowódca zajmuje Szczyt po ok. 2 min i trzyma go; w Przetrwaniu bierny gracz przegrywa przy 3. fali.
- Przeglądarka: Szczyt w WebGL bez warstw zastępczych; menu (6 trybów, pole czasu Szczytu tylko w swoim trybie, kod operacji z nowymi literami), `tests/menu-browser.html` 37/37.

## F3 — Drużyny 2 na 2 (0.37)

Ustawienie „Drużyny”: **każdy na każdego** (dotychczasowe) albo **2 na 2 — Ty i sojusznik AI** (zawsze 4 graczy; niedostępne w Przetrwaniu). Kod operacji: przyrostek `-T`.

- **Strony.** Gracz (drużyna 0) i sojusznik (3) stoją przy jednej krawędzi mapy, przeciwnicy (1 i 4) przy drugiej. Silnik zna sojusze (`game.alliances`, `allied(a, b)`, `sideLeader(t)`) i zapisuje je w grze.
- **Bez bratobójczego ognia:** sojusznicy nigdy się nie ostrzeliwują (dotyczy też obu przeciwników); gracz nie może wskazać sojusznika jako celu — PPM na jego jednostce to ruch.
- **Wspólne widzenie:** mgła odsłania się także wokół jednostek i budynków sojusznika.
- **Przekaźniki stron:** przekaźnik przejęty przez sojusznika należy do strony gracza (daje dochód gracza, liczy się w trybach Utrzymanie przekaźników i Król wzgórza); jednostki gracza i sojusznika przy jednym przekaźniku nie blokują się nawzajem, podobnie dwóch przeciwników. Sojusznik dostaje swój dochód z przekaźników strony.
- **Zwycięstwo i porażka:** zwycięstwo, gdy padną oba wrogie centra (utrata sojusznika go nie przekreśla); porażka przy utracie własnego centrum. W Ekspedycji dostarczenie artefaktu przez sojusznika to wspólne zwycięstwo, a jednostki jednej strony przy artefakcie nie spierają się o niego.
- **Dowódcy AI** znają strony (`aiFoes`): sojusznik wybiera cele u przeciwników (według swojego poziomu), a przeciwnicy — u gracza i sojusznika. Bez drużyn dowódcy jak dotąd atakują tylko gracza. Ataki sojusznika są ogłaszane („Sojusznik atakuje: …”), ale nie zmieniają licznika ani odliczania ataków w panelu.
- Karta operacji: „2 na 2 z sojusznikiem”.

### Weryfikacja

- `tests/teams.test.js` — 7 testów: rozstawienie (3 mapy), brak ognia między sojusznikami i wspólne widzenie, przekaźniki stron, warunki zwycięstwa i porażki, cele dowódców i ataki sojusznika, Ekspedycja w drużynach, kod operacji i zapis. `npm test` 215/215.
- Symulacja 2 na 2 (średni): sojusznik zajmuje przekaźniki i atakuje przeciwników, przeciwnicy atakują obie bazy strony gracza.
- Przeglądarka: baza sojusznika widoczna dzięki wspólnemu widzeniu (WebGL, minimapa), menu z wyborem drużyn blokującym liczbę graczy na 4, `tests/menu-browser.html` 37/37.

## F4 — Wyraźniejsze różnice i wygląd frakcji (0.38)

Reguły w nowym module `factions-rules.js` (dane frakcji w `RTS.FACTION_KIT`, liczby w `RTS.FACTION_FX`), rysunki w `faction-art.js`. Jednostki i budynki innej frakcji są niedostępne (kolejka, budowa, drzewo rozwoju, karty).

| | Wolne Kolonie | Dominium |
|---|---|---|
| Cecha (nowa) | Budowa o 20% szybsza (także u dowódcy AI) | Budynki o 25% wytrzymalsze |
| Cecha (dotychczasowa) | Regeneracja poza walką, ruch +12%, koszt −10% | Mniejsze obrażenia w bezruchu, wytrzymałość +18%, obrażenia +8% |
| Jednostki | Zwiadowca; **Grenadierzy** (koszary, 110 metalu: zasięg 170, granat rani też sąsiadów celu w promieniu 45 za 40%); **Łazik serwisowy** (fabryka, 170: naprawia 2 pojazdy lub budynki w promieniu 150 po 18 PW/s, 1 metal za 6 PW) | Bastion; **Miotacze ognia** (koszary, 120: zasięg 85, szybki ogień, ×1,5 piechocie, ×1,3 budynkom, ×0,6 pojazdom, płomień rani sąsiadów za 50%); **Niszczyciel czołgów** (fabryka, 260: zasięg 300, 60 obrażeń, ×1,6 pojazdom, ×0,5 piechocie, nie strzela do lotnictwa) |
| Budynek | **Placówka polowa** (150): stawiana w dowolnym widocznym, wolnym miejscu; rozładunek rudy, widzenie 420, strefa budowy w promieniu 300 | **Stacja orbitalna** (400, Kolonia, 40 mocy): **uderzenie orbitalne** — wskazany zbadany punkt, po 3 s do 420 obrażeń w promieniu 110 (tylko wrogom), odnowienie 100 s |

- **Uderzenie orbitalne w interfejsie:** przycisk po zaznaczeniu stacji („Uderzenie orbitalne” / czas do gotowości), potem LPM na celu; PPM lub Esc anuluje. Czerwony znacznik z odliczaniem widać na planszy (własne uderzenia i widoczne wrogie); wrogie uderzenie w widocznym miejscu wywołuje ostrzeżenie.
- **Dowódcy AI:** szkolą jednostki swojej frakcji (grenadierzy i miotacze częściej przeciw piechocie, niszczyciel przeciw pojazdom), Kolonie stawiają placówkę polową zamiast magazynu, Dominium na średnim (9. min) i trudnym (6. min) buduje stację orbitalną i uderza w największe skupisko co najmniej 4 wrogich jednostek (trudny — gdy go brak, w budynek, najchętniej wieżyczkę).
- **Wygląd frakcji:** oprócz dotychczasowych detali centrum, koszar, fabryki i laboratorium — na wszystkich pozostałych budynkach i pojazdach: Kolonie mają kopułki z oknem, panele słoneczne i turkusowy pas (pojazdy: przeszklona kabina), Dominium kanciaste płyty na bokach, kolec na dachu i czerwone szewrony (pojazdy: płyta taranu i szewron). Nowe modele: grenadierzy z granatnikiem, miotacze z butlami i płomykiem, łazik z żurawiem i pomarańczowym kogutem przy naprawie, niskoprofilowy niszczyciel z długą lufą, placówka z kopułą i obracającym się radarem, stacja z anteną i lampką gotowości. Wszystko rysowane w Canvas i tą samą drogą w WebGL; wiązki napraw łazika jak w warsztacie; efekt płomienia (`flame`) we wspólnych efektach.

### Weryfikacja

- `tests/factions.test.js` — 7 testów: dostępność tylko dla własnej frakcji, cechy pasywne (budowa, wytrzymałość jednokrotnie), odłamki i płomień, niszczyciel, łazik (tylko pojazdy i budynki, za metal), placówka (budowa w dowolnym widocznym miejscu, rozładunek, strefa), uderzenie orbitalne (wymagania, opóźnienie, tylko wrogowie, odnowienie, zapis), dowódcy AI (stacja, uderzenie w skupisko, placówka). `tests/development.test.js`: drzewo rozwoju sprawdzane dla obu frakcji. `npm test` 222/222.
- Symulacja: trudny dowódca Dominium po 8 min ma stację orbitalną, miotaczy ognia i bastion; dowódca Kolonii — placówkę, grenadierów i zwiadowców.
- Przeglądarka: scena z budynkami i jednostkami obu frakcji, łazikiem w trakcie naprawy i znacznikiem uderzenia w WebGL bez warstw zastępczych; `tests/render-webgl-browser.html` PASS; `tests/menu-browser.html` 37/37 (w tym modele w bazie wiedzy). Wzorzec `tests/render-browser.html` zapisany ponownie na czystej stronie i sprawdzony po przeładowaniu (poprzedni z F1 był zapisany na stronie, na której podmieniano na próbę funkcje rysujące, więc nie nadawał się do porównań).

## F5 — Trzecia frakcja: Rój Kryształowy (0.39)

Obce, krystaliczne organizmy przebudzone przez artefakty. Reguły w `swarm-rules.js`, rysunki w `swarm-art.js`; liczby w `RTS.SWARM`.

- **Cechy:** koszt −15%, wytrzymałość −10%, ruch +8%; jednostki regenerują się stale (1,5 PW/s, 2 s po trafieniu), budynki po 6 s spokoju (3 PW/s); wylęganie o 15% szybsze (gracz i dowódca AI). Dostępne są też wspólne jednostki i budynki.
- **Pełzacz** (koszary, 45 metalu): szybki (150), walczy wręcz; po śmierci wybucha — 40 obrażeń wrogim jednostkom naziemnym w promieniu 50.
- **Pluwacz** (koszary, 95): zasięg 200; kwas ×1,4 przeciw budynkom; trafiony cel przez 4 s otrzymuje o 15% więcej obrażeń od wszystkich (korozja).
- **Kolos** (fabryka, 480): 1400 PW, stała regeneracja 6 PW/s, uderzenie rani też jednostki obok celu (40% w promieniu 50).
- **Monolit rezonansowy** (budynek, 300, 20 mocy): wrogie jednostki naziemne w promieniu 260 poruszają się o 35% wolniej; ukryci sabotażyści w jego zasięgu są odsłaniani.
- **Frakcja przeciwnika** — nowe ustawienie scenariusza: „Przeciwna do Twojej” (jak dotąd; gracz Roju spotyka Dominium) albo wybrana frakcja dla wszystkich wrogich stron; sojusznik w 2 na 2 zawsze ma frakcję gracza.
- **Dowódca AI Roju** szkoli pełzacze (więcej przeciw piechocie), pluwacze (przeciw pojazdom) i od 5.–7. minuty kolosy, a monolit stawia przed bazą (średni: 7. min, trudny: 4. min).
- **Wygląd:** w 0.39 fioletowo-różowe kryształy na wspólnych modelach; od 0.42 własne modele Obsydianowych Strażników (niżej).
- **Nazwy stron w komunikatach** (`game.sideName`): wrogą stronę nazywa jej frakcja (wcześniej zawsze „Dominium” — także wtedy, gdy grało się Dominium przeciw Koloniom), sojusznik to „Sojusznik”; komunikaty z czasownikami przeredagowane tak, by pasowały do każdej nazwy. Podpis przekaźnika na planszy pokazuje nazwę strony.

### Weryfikacja

- `tests/swarm.test.js` — 7 testów: grywalność i koszty, szybsze wylęganie (gracz i AI), ustawienie frakcji przeciwnika (także 2 na 2), pełzacz, pluwacz, kolos, regeneracja, monolit, dowódca AI Roju. Znaleziony i poprawiony błąd: trafienie w chwili 0 (`lastDamaged` = 0) było traktowane jak brak trafienia. `npm test` 229/229.
- Przeglądarka: baza Roju (gracz i przeciwnik) w WebGL bez warstw zastępczych; `tests/render-webgl-browser.html` PASS; `tests/render-browser.html` zgodny ze wzorcem (Rój nie zmienia dotychczasowych scen); `tests/menu-browser.html` 37/37; gra Rojem w 2 na 2 — konsola bez błędów. Poprawione przy okazji: gracz Roju widział kartę Bastionu Dominium.

## F6 — Mapa kampanii i akt III „Przebudzenie Roju” (0.40)

Moduł `campaign-act3.js`: rozdziały VII–IX zbudowane na mechanizmach scenariuszy (dowódca AI, tryby, drużyny, frakcje) z interfejsem aktu II (łączność radiowa, cele, odznaka celu dodatkowego, premia +200 metalu za odznakę z poprzedniego rozdziału, epilog, raport). Teren zapożyczony z map scenariuszy (aliasy układów, ten sam motyw grafiki). Nowi rozmówcy: Kmdr Aris Varn (Dominium) i Szept Roju.

| Rozdział | Planeta (teren) | Zasady | Cel dodatkowy |
|---|---|---|---|
| **VII · Przebudzenie** | Lumeria V (Świetlisty Gąszcz) | Ekspedycja po artefakt przeciw Rojowi (średni), start: Kolonia, 900 metalu | Dostarcz artefakt przed 12. minutą |
| **VIII · Sojusz z konieczności** | Nivalis (Biały Przesmyk) | 2 na 2: sojusznik — Dominium Varna, przeciw dwóm gniazdom Roju; Król wzgórza (3 min) albo zniszczenie obu gniazd | Baza Varna przetrwa |
| **IX · Serce Roju** | Pyrrhos (Rzeki Magmy) | Podbój przeciw Rojowi; Serce (centrum Roju) wytrzymalsze o 50%; na start gotowa stacja orbitalna Dominium i 2 reaktory | Zwycięstwo przed 20. minutą |

- **Łączność** reaguje na zdarzenia: pierwszy kontakt z Rojem, przejęcie artefaktu przez gracza lub Rój, zajęcie i utrata Szczytu, zagrożenie i upadek bazy Varna, pierwsze uderzenie orbitalne, osłabienie Serca.
- Postęp kampanii zapisuje rozdziały VII–IX i ich odznaki; ekran końcowy rozdziału IX: „Koniec aktu III”. Panel pokazuje nagłówek „Przebudzenie Roju” i opis rozdziału.
- **Mapa kampanii** (ekran Kampania): gwiezdna trasa przez osiem planet wszystkich aktów — ukończone odcinki ciągłe, następny rozdział złoty przerywany, zablokowane przygaszone; pod planetą kropka dla każdego jej rozdziału (ukończony / dostępny / zablokowany) i odznaki ◆. Kliknięcie planety otwiera jej pierwszy rozdział do rozegrania (albo ostatni rozegrany). Lista rozdziałów pod mapą, z nową sekcją „Akt III · Przebudzenie Roju”.
- Balans rozdziałów jest wstępny: finał ustawiony na średni poziom Roju (na trudnym bierny gracz przegrywał po 3 min — zbyt ostro na zakończenie aktu).

### Weryfikacja

- `tests/act3.test.js` — 7 testów: rozdziały i teren, ustawienia (frakcje, sojusznik Dominium, stacja orbitalna, Serce), zwycięstwo i termin w VII, Szczyt / gniazda / baza Varna w VIII, finał IX, odznaki i zapis postępu, zapis i odczyt rozdziału. `npm test` 236/236.
- Przeglądarka: mapa kampanii z symulowanym postępem (akt I–II ukończone, odznaki), kliknięcie planety otwiera odprawę rozdziału VII, rozdział startuje z celami, łącznością i premią za odznakę, konsola bez błędów; `tests/menu-browser.html` 37/37, `tests/render-browser.html` zgodny ze wzorcem, `tests/render-webgl-browser.html?gpu=webgpu` PASS. Przywrócony postęp kampanii i zapis w przeglądarce testowej.

## Stan etapu F

Wszystkie wybrane punkty wdrożone (0.35–0.40). Otwarte: balans (frakcje, Rój, rozdziały aktu III) na podstawie rozgrywek; nagrane głosy i portrety rozmówców; mgła wojny dla dowódców AI.

## F7 — Mapa galaktyki (0.41)

Na życzenie użytkownika płaski schemat trasy zastąpiła mapa galaktyki w duchu strategii kosmicznych (moduł `galaxy-map.js`, ekran Kampania w `menu.js`).

- **Galaktyka:** głęboka przestrzeń, dwa ramiona spirali z rozmytych mgławic, jasne jądro, gwiazdy (część migocze).
- **Układy planetarne:** każdy świat krąży po orbicie wokół własnego słońca (Kessar — dwa słońca krążące wokół siebie); orbity są rysowane, ruch jest powolny.
- **Planety rysowane proceduralnie według klimatu** — obracająca się tekstura powierzchni, osobna warstwa chmur, cień od strony przeciwnej do słońca, poświata atmosfery: pustynie z wydmami i kraterami (Eos, Khepri IV, Helion II, Kessar z solniskami), lód ze szczelinami i czapami polarnymi (Vesper, Nivalis z kryształami), popiół i lawa z żarzącymi się pęknięciami (Nadir, Vulkan IX), rzeki magmy (Pyrrhos), świecąca dżungla (Lumeria V), świat chmur z wiszącymi szczytami (Aerion).
- **Dodatki:** pierścienie (Vesper, Aerion; tylna połowa za planetą, przednia przed nią), księżyce (chowające się za planetą), pasy asteroid wokół słońc (Vulkan IX, Pyrrhos).
- **Trasa kampanii** między układami: ukończone odcinki ciągłe, droga do następnego rozdziału — płynące złote kreski, zablokowane przygaszone. Pod planetą kropki jej rozdziałów (ukończony / dostępny — pulsuje / zablokowany) i odznaki ◆; światy tylko ze scenariuszy są opisane „świat scenariuszy”.
- **Układ ekranu (0.41.1):** po lewej akty i rozdziały, na środku galaktyka, po prawej wybrana planeta — trzy kolumny o wspólnej wysokości dopasowanej do okna, boczne przewijane osobno. Na średnich ekranach (981–1280 px) lista zostaje po lewej, a panel planety przechodzi pod mapę (mapa w proporcji 2 : 1); na wąskich wszystko w jednej kolumnie: mapa, planeta, lista.
- **Połączenie z listą:** panel wybranego świata (nazwa, klimat, opis, rozdziały ze stanem, odznaką i przyciskiem „Odprawa”, a także scenariusze na tej planecie z przyciskiem „Zagraj”, który otwiera Scenariusze z tą mapą), pod nim lista rozdziałów aktów I–III. Kliknięcie świata zaznacza go, podświetla jego rozdziały na liście i przewija do nich; najechanie lub przejście klawiaturą na rozdział w liście podświetla jego planetę. Na starcie zaznaczony jest świat następnego rozdziału.
- Mapa i lista mają wspólną wysokość dopasowaną do okna menu (lista przewija się osobno); na wąskich ekranach wszystko układa się w kolumnę. Animacja działa tylko na tym ekranie (zatrzymywana przy przejściu dalej) i nie działa przy ograniczonym ruchu.

### Weryfikacja

Przeglądarka (1400 × 900 i 760 × 900): mapa z tymczasowym postępem kampanii (akty I–II, odznaki), wybór świata na mapie (panel, podświetlenie i przewinięcie listy), podświetlenie planety z listy, przejście do scenariusza z panelu, brak przewijania w poziomie; `tests/menu-browser.html` 37/37; `npm test` 236/236. Postęp kampanii w przeglądarce testowej przywrócony.

## Wygląd Roju: Obsydianowi Strażnicy (0.42)

Kierunek wybrany przez użytkownika z arkuszy koncepcyjnych: wariant C-A „Czyste monolity”, w wersji matowej (bez cyjanowej poświaty) i bez dodatkowych grotów nad obeliskiem. Rysunki w `swarm-art.js` (pierwsze w łańcuchu `Act2Art.body`, więc Canvas i WebGL pokazują to samo).

- **Monolit** — podstawowy element: zwężająca się przednia ściana, ciemniejsza ściana boczna, spiczasty czubek oświetlony z lewej, pionowy i poziome szwy wycięte w kamieniu (ciemna bruzda z jasną krawędzią), cień w prawo w dół jak w pozostałych modelach, pasek w kolorze drużyny u podstawy. Budynki stoją na bazaltowej płycie o zarysie fundamentu.
- **Budynki** (nazwa Roju): centrum — Brama Roju (wielki monolit między dwoma bazaltowymi blokami), koszary — Para strażnic, fabryka — Ściana odlewni (cztery monolity), wieżyczka — Obelisk, magazyn — Skarbiec, ekstraktor — Studnia gazu, reaktor — Iglica mocy, laboratorium — Archiwum, akumulator — Kamienie mocy, warsztat — Łuk naprawczy (monolity z nadprożem), hangar — Gniazdo lotu, bateria przeciwlotnicza — Iglice przeciwlotnicze, punkt medyczny — Menhir odnowy, generator osłon — Kołnierz osłon, plac odzysku — Rumowisko; monolit rezonansowy — wysoka iglica ze słabymi szarymi pierścieniami. Mury i bramy bez zmian.
- **Jednostki:** piechota to kanciaste strażniki na dwóch parach nóg z polerowaną soczewką (robot — Kamieniarz, piechota — Strażnik, rakietowiec — Grotownik, sabotażyści — Cienie, pluwacz z kolcem, pełzacz — płaski klin na sześciu nogach); pojazdy to czteronożni kroczący (czołg — Kroczący, ciężka maszyna — Ciężki kroczący z płytami, artyleria — Kroczący z iglicą, transporter — Nosiciel na sześciu nogach, wóz przeciwlotniczy — Kroczący przeciwlotniczy z parą soczewek, kolos — wielki kroczący z płytą na grzbiecie); lotnictwo to obsydianowe groty (Grot lotny, Płyta lotna, Odłamek zwiadu).
- Na modelach Roju nie ma wykończenia Kolonii ani Dominium; znaczniki modułów i wyłączenia (etap E) zostają.
- **Nazwy:** `RTS.SWARM_NAMES`; `game.unitName(type, team)` podaje nazwę według frakcji strony (karty, kolejki, komunikaty, drzewo rozwoju), `game.entityName(e)` — według frakcji obiektu (podpisy budynków na planszy w Canvas i WebGL, panel zaznaczenia). Podgląd w drzewie rozwoju korzysta teraz z pełnego łańcucha rysunków (widać modele frakcji).

### Weryfikacja

- `tests/swarm.test.js` — nowy test nazw (gracz Roju, wróg Dominium, gracz Kolonii); `npm test` 237/237.
- Nowa scena „Rój · obsydianowa baza” w `tests/render-scenes.js`: `tests/render-browser.html` PASS (8 scen, obraz powtarzalny), `tests/render-webgl-browser.html` PASS (WebGL, modele natywne jak Canvas, bez warstw zastępczych). Wzorzec Canvas trzeba zapisać ponownie (nowa scena).

## Wskaźnik burzy (0.42.1)

Pas z odliczaniem (F1) zastąpił wariant B wybrany z arkusza koncepcyjnego, z jedną zmianą użytkownika: kierunki ukośne pokazywane są w rogu. Rysunek w `FxArt.stormEdge` (`fx-art.js`).

- **Bez przyciemniania planszy.** Na krawędzi, z której nadchodzi burza, jest cienka linia w kolorze pogody (piasek, śnieg, deszcz) na ciemnym podkładzie, jaśniejsza w środku; przy kierunkach ukośnych — „L” z obu krawędzi wychodzące z rogu.
- **Szewrony** płyną od krawędzi (albo z rogu, po przekątnej) do środka ekranu.
- **Zegar:** ciemne koło z liczbą sekund i pierścieniem pozostałego czasu ostrzeżenia; w czasie nadciągania burzy — ikona pogody, a całość wygasa. Pod zegarem (w dolnej połowie ekranu — nad nim) podpis na ciemnej pigułce, np. „BURZA PIASKOWA · Z ZACHODU”, zawsze w całości na ekranie (wcześniej napis przy lewej i prawej krawędzi był ucinany).
- Wskaźnik omija interfejs planszy: nagłówek i przyciski przybliżenia u góry, legendę u dołu, a w prawym dolnym rogu — minimapę (róg południowo-wschodni stoi nad nią).
- Linia krawędzi to prostokąty z gradientem wypełnienia (odtwarzanie WebGL nie obsługuje gradientu obrysu), więc WebGL rysuje wskaźnik natywnie.

### Weryfikacja

- Przeglądarka: wszystkie 8 kierunków w Canvas na widoku 1280 × 720 z zaznaczonymi obszarami minimapy, przycisków, nagłówka i legendy — bez nachodzenia.
- `tests/render-webgl-browser.html` — nowe sprawdzenie „prognoza burzy natywnie z 8 kierunków” (także w czasie nadciągania); PASS. `tests/render-browser.html` PASS; `npm test` 237/237.


## Wybory z konsekwencjami: akt II → akt III (0.50)

Decyzja z rozdziału VI (los kompleksu Hefajstos, zapisana w postępie kampanii jako `choices.colony6`) zmienia teraz akt III. Skutki opisuje `RTS.ACT3_LEGACY` w `campaign-act3.js`; `game.applyCampaignChoices(choices)` stosuje je raz na start każdego rozdziału VII–IX (aplikacja wywołuje ją razem z premią za odznakę), a wybór zapisuje się w stanie rozdziału (`act2.legacy`), więc wczytanie gry nie stosuje go drugi raz.

| Decyzja w akcie II | Skutek w akcie III |
|---|---|
| **Odłącz i ewakuuj personel** → „Wdzięczność Dominium” | Uratowani technicy byli ludźmi Dominium. **Jednostki:** fabryka Kolonii buduje **niszczyciel czołgów** Dominium (wygląd Dominium, kolor gracza; także w drzewie rozwoju). **Sojusznicy:** w VIII baza Varna dostaje 2 niszczyciele i bastion; w IX do gracza dołącza eskorta 2 niszczycieli. |
| **Zniszcz instalację** → „Popiół Hefajstosa” | Rój czerpał energię z kompleksu: **gniazda i Serce Roju** mają o **25% mniej wytrzymałości**; rdzenie z ruin dają **+250 metalu** na start każdego rozdziału. Varn stracił elektrownię — bez posiłków i planów. |

- Na start rozdziału wybrana ścieżka ma własną linię łączności (Tessa, Varn lub Lira), a epilog aktu III (rozdział IX) — własne zdanie.
- **Odprawa** rozdziałów VII–IX pokazuje ramkę „Skutki aktu II” z nazwą i opisem skutku (albo informację, że decyzji brak).
- Bez zapisanej decyzji (np. postęp sprzed wersji 0.40) akt III działa jak dotąd.
- Mechanizm „użyczonej jednostki”: `game.loanedUnit(typ)` — sprawdzany przy produkcji (`enqueue`), w wymaganiach rozwoju i w kartach produkcji.

### Weryfikacja

- `tests/act3-legacy.test.js` — 4 testy: brak decyzji (nic się nie zmienia), ewakuacja (produkcja niszczyciela z wyglądem Dominium, posiłki Varna w VIII, eskorta w IX, epilog), zniszczenie (−25% gniazd i Serca we wszystkich rozdziałach, +250 metalu, bez posiłków), zapis i wczytanie (skutek nie działa drugi raz, uszkodzona wartość jest odrzucana). `npm test` 254/254.
- Przeglądarka: postęp kampanii z ewakuacją — odprawa rozdziału VII z ramką skutków, w bitwie linia łączności Tessy i karta niszczyciela czołgów w produkcji; `tests/development-browser.html` 68/68, `tests/menu-browser.html` 37/37. Przywrócony zapis w przeglądarce testowej.
