# Kampania i oprawa: sceny łączności, wybory, filmy, menu i interfejs (wersje 0.99–0.122, 0.149–0.152.1, 0.169, 0.171; 2026-10-07–09)

Najnowsze zmiany na górze. Zakres: portrety i sceny łączności, wybory, głosy, intro, prologi i epilogi, ekrany końca i ładowania, menu, pauza, ekrany menu, interfejs gry, drzewo rozwoju, panel badań, ekran kampanii, odblokowanie do testów, filmy na pełnym ekranie.

## Nowe prologi aktów II–IV (wersja 0.171, 2026-10-09)

Prologi aktów II, III i IV (`act2-film.js`, `act3-film.js`, `act4-film.js`) były 20-sekundowymi zapowiedziami w 4 ujęciach. Teraz każdy opowiada historię prowadzącą do pierwszego rozdziału aktu: 8 ujęć o własnych długościach (`LENGTHS`, `lengths` w specyfikacji reżysera `CampaignFilm.kit.render`), razem 76 s. Ujęcia z poprzednich prologów zostały częściami nowych historii (`PART`), a tytuł aktu pojawia się dopiero w ostatnim ujęciu. Każdy prolog ma własną muzykę (`prologue2`–`prologue4`, zob. `docs/AUDIO.md`). Ekrany menu `intro2`–`intro4` biorą długość paska postępu z `duration` filmu, a podpis brzmi „Prolog aktu … · ok. 75 sekund”.

| Ujęcie | Akt II · Cena świtu | Akt III · Przebudzenie Roju | Akt IV · Inwazja |
|---|---|---|---|
| 1 | Po świcie: Khepri IV odzyskuje prąd, nadlatują transporty pomocy | Upadek Hefajstosa: wybuch i płonąca blizna (zniszczenie) albo gasnące światła i odlatujące wahadłowce (ewakuacja) | Rozejm nad cichym Pyrrhosem: okręty obu stron, „wspólne dowództwo” albo każdy własną drogą (decyzja z rozdziału VIII) |
| 2 | Sygnał w paśmie latarni | Rytm artefaktów na holomapie | Adm. Selen Vok na kanale Admiralicji: rozejm nieważny, Varn zdrajcą, rozkaz blokady |
| 3 | Lira odszyfrowuje wezwanie: ekipa badawcza z Khepri IV żyje | Laboratorium dr Tessy: struktura w krysztale rośnie — „klasyfikacja: organizm” | Flota Admiralicji zamyka orbitę Eos |
| 4 | Wiertnie Dominium na wydmach, paszczaki | Mapa taktyczna: fioletowe plamy Roju rozchodzą się od Lumerii V | Artefakt na orbicie odpowiada na nieznany sygnał |
| 5 | Pod piaskiem: odwiert dociera do dawnej sondy | Wezwanie Varna: wdzięczny (ewakuacja) albo chłodny (zniszczenie) | Szczelina i Wartownicy Otchłani |
| 6 | Hefajstos wysysa energię Vulkana IX | Floty Kolonii i Dominium nad Nivalis | Wartownicy strzelają do okrętów Kolonii i Dominium |
| 7 | Konwój na lodowej przełęczy Vesperu | Serce Roju pod magmą Pyrrhosa, uderzenie orbitalne | Brama przy czarnej dziurze Erebus |
| 8 | Lądowanie o zmierzchu przy stacji badawczej, „CENA ŚWITU” | Lądowanie na Lumerii V wśród pełzaczy, „PRZEBUDZENIE ROJU” | Flota Kolonii wychodzi ze skoku nad Eos, przed nią światła blokady, „INWAZJA” |

`Act3Film.prepare(choices)` i `Act4Film.prepare(choices)` (jak `FinaleFilm`) ustawiają decyzje kampanii przed odtworzeniem; menu podaje je z `campaignDetails().choices`. Akt III zmienia ujęcia i podpisy 1 i 5 (decyzja o Hefajstosie, `colony6`), akt IV — ujęcie i podpis 1 (propozycja Varna, `colony8`). `Act4Film.parts` (Wartownik, szczelina, czarna dziura z Bramą) zostają dla finału i epilogów. Zestaw filmowy dostał ogólną ramkę łączności `holo(who, label, …)` — z niej korzysta też `holoLira`.

## Nowy prolog kampanii — historia pogranicza (wersja 0.169, 2026-10-09)

Intro kampanii (`campaign-film.js`, `CampaignFilm`) opowiada teraz historię prowadzącą do rozpoczęcia aktu I: 15 ujęć o własnych długościach (`LENGTHS`), razem 150 s (ok. 2,5 minuty). Reżyser (`kit.render`) przyjmuje listę długości ujęć (`spec.lengths`); inne filmy (prologi aktów II–IV, epilogi, finał) zostają przy 5 s na ujęcie.

| # | Ujęcie | Czas | Co widać |
|---|---|---|---|
| 1 | Pogranicze | 9 s | głęboki kosmos, pasmo galaktyki, nazwy światów pojawiają się kolejno: Khepri, Eos, Vesper, Nadir |
| 2 | Wolne Kolonie | 10 s | statki osadników schodzą ku planecie, na jej nocnej stronie zapalają się miasta |
| 3 | Sieć latarni | 10 s | holomapa w warsztacie Liry, łącza sieci rosną przekaźnik po przekaźniku, hologram Liry |
| 4 | Szlaki | 9 s | łańcuch latarni, konwój i krążownik eskorty |
| 5 | Dominium | 10 s | czerwona stolica, armada w trzech szeregach, dekret: „pogranicze — prowincja zbuntowana” |
| 6 | Blokada | 10 s | drednot Dominium wchodzi w kadr, wiązki gaszą latarnie (alarm, wstrząs) |
| 7 | Sektor bez światła | 10 s | nocna strona Khepri gaśnie miasto po mieście, wskaźnik sieci spada do zera |
| 8 | Ultimatum | 10 s | czerwona transmisja na wszystkich kanałach, tekst pisany na żywo, odliczanie |
| 9 | Stacja Ciszy | 10 s | nocna kotlina Eos, martwa wieża latarni, jedno oświetlone okno, iskry przy maszcie — Lira przy pracy |
| 10 | Transmisja | 11 s | hologram Liry, przebieg głosu, trasa do archiwum na Vesperze, gasnące zasilanie nadajnika; **Lira mówi** |
| 11 | Ostatnia flota | 10 s | kryjówka w pasie asteroid, „Okręt desantowy Świt · Dowódca: Ty”, start |
| 12 | Przez blokadę | 10 s | przelot między drednotami, salwy chybiają, cisza radiowa (alarm) |
| 13 | Kotlina Eos | 11 s | ognisty wlot w atmosferę, potem lot nad wydmami Eos |
| 14 | Lądowanie | 10 s | pył przy Stacji Ciszy, ciemna wieża, Lira czeka; **Lira mówi** |
| 15 | Początek | 10 s | świt nad kotliną, wieża latarni wciąż ciemna, tytuł „ODZYSKANY ŚWIT · AKT I” |

- Kwestie Liry (`CampaignFilm.lines`) mówi jej głos z motywem, jak w scenach łączności.
- Muzyka: tryb `prologue` (`audio.js`, `prologueStep`), części na ujęciach filmu (`PROLOGUE`, sekundy) — opis w [AUDIO.md](AUDIO.md).
- Pasek postępu i podpis („Prolog · ok. 2,5 minuty”) biorą długość z filmu. Intro nadal odtwarza się tylko przy pierwszym wejściu w kampanię, potem z przycisku „Intro kampanii” przy akcie I.

## Szuflada celów: bez przewijania, ukryta pod raportem (wersja 0.152.1, 2026-10-08)

- Poziome przewijanie szuflady: `#wave-progress` („Planowany atak”) dostawał szerokość ponad 100% (`1 − pozostały czas / okres`, gdy termin minął — u dowódcy AI z odległym lub minionym atakiem; zmierzone 1131 px przy panelu 240 px). `app.js`: wartość ograniczona do 0–100%; `hud-compact.css`: `.intel-panel` bez przewijania w poziomie, `.thin-track` przycina wypełnienie.
- Szuflada i panel orbity pod nakładką: `app.js` `watchOverlay` — `MutationObserver` na atrybucie `hidden` nakładki `#overlay` ustawia `body.overlay-open`; `hud-compact.css` ukrywa wtedy `.sidebar` i `.orbit-panel` (`visibility: hidden`) — przy odprawie, raporcie zwycięstwa / porażki, decyzjach i ekranie lądowania Inwazji; po zamknięciu wracają.

## Okna potwierdzenia w stylu gry (wersja 0.151.2, 2026-10-08)

- Nowy moduł `game-dialog.js` (`GameDialog.confirm({ eyebrow, title, text, sections, facts, ok, cancel, tone })` → `Promise<boolean>`): modalny `<dialog>` w warstwie górnej, karta w stylu pokładu (`hud.css`: `.game-dialog`, odcień `tone-warn` dla ostrzeżeń). Esc i kliknięcie w tło — anuluj, Enter — potwierdź; fokus na „Anuluj”. Teksty wstawiane jako tekst, nigdy HTML. Klawisze w oknie nie trafiają do skrótów gry (także osłona w obsłudze klawiatury `app.js`).
- `app.js`: `confirmInGame` — w bitwie jednoosobowej pauza na czas decyzji (jak przy dawnym `confirm()`), w sieciowej bez pauzy; `confirmDoctrine` — efekt doktryny, sekcja „Zostanie zablokowana do końca operacji” z drugą doktryną frakcji, koszt (metal, gaz, kryształy) i czas.
- `menu.js`: import zapisów (Ustawienia → Aplikacja i zapisy) pyta w tym samym oknie: plik, liczba wpisów, pochodzenie.
- `window.confirm` zostaje tylko jako zapas, gdy modułu brak. Sprawdzone w przeglądarce: okno doktryny, pauza w czasie decyzji, Anuluj / Przyjmij / Esc (bez menu pauzy).

## Pasek ładowania bez zamrożenia (wersja 0.151.1, 2026-10-08)

- Objaw (zgłoszony w aplikacji Electron, występuje też w przeglądarce): pasek ekranu ładowania stał, po czym od razu pojawiała się mapa. Przyczyna: `launchWithScreen` (`app.js`) buduje misję synchronicznie (`restart`), a pierwsza klatka renderera 3D buduje świat — główny wątek jest zajęty ok. 0,5 s dwa razy (pomiar `longtask` w aplikacji: 562 i 503 ms; w przeglądarce 585 i 465 ms), a pasek był przesuwany przez `requestAnimationFrame` (`loading-screen.js`), który w tym czasie nie działa.
- `style.css`: pasek (`.loading-bar b`) wypełnia się animacją CSS `loading-fill` samego `transform: scaleX` (9 s, zwalnia ku 85%), a po pasku biegnie odblask `loading-glint` (`::after`, `translateX`, 1,4 s w kółko) — animacje `transform` Chromium wykonuje w wątku kompozytora, więc trwają także podczas blokady. Przy ograniczonych animacjach (`.reduced`) bez odblasku.
- `loading-screen.js`: procent i etap czyta ze stanu paska (`getComputedStyle(...).transform`); po `done()` zatrzymuje animację w bieżącym miejscu i przejściem 0,4 s doprowadza pasek do 100%, potem zamyka ekran jak dotąd.
- Samokontrola aplikacji (`npm run app:check`) raportuje też długie blokady wątku przy starcie mapy (`blocks`). Dalsze skrócenie samych blokad (podział budowy świata 3D na kroki) — propozycja.

## Szersze kafle produkcji (wersja 0.150.2, 2026-10-08)

- `hud-compact.css`: `--deck-slot: 132px` (było 112) — kafel ok. 145 px w oknie 962 px (4 w rzędzie), ok. 135–145 px na szerokich ekranach.

## Jednakowe kafle produkcji (wersja 0.150.1, 2026-10-08)

- `app.js`, `paginateDeck`: `--deck-columns` to liczba kolumn mieszczących się w rzędzie (szerokość / `--deck-slot`), a nie mniejsza z niej i liczby kafli zakładki — wcześniej zakładka z mniejszą liczbą kafli niż miejsc (armia, 9 kafli przy 11 miejscach na ekranie 1920 px) rozciągała kafle (ok. 142 px wobec 116 px w Budowie i Badaniach). Teraz reszta rzędu zostaje pusta.

## Równe strzałki stronicowania (wersja 0.149.4, 2026-10-08)

- `hud-compact.css`: znaki ‹ › w `#deck-prev` / `#deck-next` ukryte (`font-size: 0`, etykiety `aria-label` bez zmian); strzałka to `::before` — kwadrat 6 px z dwiema krawędziami 1,5 px obrócony o 135° / −45°, pionowo na środku, poziomo przesunięty o 20% ku grotowi (optyczne wyśrodkowanie szewronu).

## Odstęp przy stronicowaniu (wersja 0.149.3, 2026-10-08)

- `hud-compact.css`: rząd stronicowania 24 px (było 20), przyciski 20 px (były 26 — nachodziły na pasek kolejki), `.deck-pagination` wyśrodkowane w rzędzie — ok. 6 px odstępu od kafli i od paska postępu.

## Kafle produkcji w jednym rzędzie (wersja 0.149.2, 2026-10-08)

- `hud-compact.css`: `--deck-rows: 1`, `--deck-slot: 112px` — jeden rząd wyższych kafli; nazwa do dwóch linii (`-webkit-line-clamp: 2`), koszt, pod nim czas (`em` blokowo), klawisz w prawym górnym rogu, symbol 18 px.
- Zakładki produkcji (`.deck-tabs`) stoją na linii `border-bottom: 1px solid var(--hud-edge)` nagłówka `.production-heading`, jak zakładki szuflady (`.intel-tabs`).

## Małe kafle produkcji (wersja 0.149.1, 2026-10-08)

- `hud-compact.css`: karty w siatce dwóch rzędów (`--deck-rows: 2`, szerokość miejsca `--deck-slot: 138px`); kafel to symbol 16 px, nazwa w jednej linii, koszt i czas, klawisz z prawej. Opis (`.card-description`), stan (`.card-status`) i etykieta dziedziny badania ukryte na kaflu. Niedostępny kafel ma przygaszoną nazwę, zablokowany (`.locked`) — bursztynowy pasek z lewej.
- `app.js`, `paginateDeck`: liczba kolumn z `--deck-slot`, na stronę `kolumny × --deck-rows` (najwyżej 12 kolumn).
- `app.js`, `setupCardTip` / `renderCardTip`: okno `#card-tip` nad kaflem — nazwa i klawisz, opis (`data-description`), parametry jednostki z `TYPES`, budynek / powód niedostępności (bursztynowo, gdy kafel wyłączony lub zablokowany), wskazówka budowy (`data-tip`, zamiast natywnego `title`), pełny koszt. Kafel pod kursorem wyznacza `elementFromPoint` przy `pointermove` (wyłączone przyciski nie dostają zdarzeń myszy), także fokus klawiatury; okno odświeża się z `updateHud`, znika przy kliknięciu i zmianie zakładki.

## Zwarty interfejs bitwy (wersja 0.149, 2026-10-08)

Wybrana koncepcja: smukła dolna konsola (B) z pływającą szufladą nad planszą (z koncepcji A). Pomiar przed zmianą (okno 962×914): pasek górny 82 px, panel boczny 230 px, konsola 216 px — plansza 51% okna.

- Nowy arkusz `hud-compact.css`, dołączany w `index.html` jako ostatni — tylko nadpisuje układ pozostałych arkuszy (zmienne `--hud-top: 46px`, `--hud-bottom: 158px`).
- Plansza na całą szerokość (`.workspace` → sama `.battlefield`). `.sidebar` (zakładki Cele / Logistyka / Kolejki / Oddział) to szuflada `position: absolute` nad planszą: 262 px, z lewej, pod nagłówkiem mapy (od 130 px), nad rzędem grup (do 98 px od dołu), półprzezroczysta z rozmyciem; pasek „łączność aktywna” z zegarem ukryty.
- Zwijanie (`app.js`, `setupSidebar`): kliknięcie otwartej zakładki dodaje klasę `.collapsed` (zostają same zakładki), każda zakładka rozwija; stan w `localStorage` (`hud.drawerCollapsed`).
- Pasek górny: logo pomniejszone, liczby 17 px, przyciski 28 px.
- Konsola: panel oddziału 318 px bez nagłówka sekcji, rozkazy w trzech kolumnach (przyciski 19 px; kolejność Wszystkie, Roboty, Statystyki / Zatrzymaj, Pozycja, Patrol / Eskorta), formacja jednym rzędem bez etykiety; produkcja z rzędem stronicowania (`24px 1fr 20px 5px`) i niższymi kartami.
- Wynik: 962×914 — plansza ok. 78% okna; 1280×720 — plansza 1280×516 (ok. 72%, wcześniej ok. 48%). Menu główne i pauza bez zmian.

## Raport końca operacji bez pasków (wersja 0.131.1, 2026-10-07)

- `style.css` (`.briefing.end-report`): karta ma wysokość obszaru planszy (nie okna), więc treść bywała o kilkadziesiąt pikseli wyższa i pokazywały się oba paski przewijania (pionowy zwężał kartę o piksel, stąd poziomy). Kafelki liczb w jednym rzędzie (`minmax(84px, 1fr)`), `overflow-x: hidden`, paski ukryte (`scrollbar-width: none`, `::-webkit-scrollbar`), przewijanie kółkiem zostaje.

## Wybór rozdziału z podglądem (wersja 0.122, 2026-10-07)

Mapa galaktyki na ekranie kampanii jest wyłączona (wersje 0.118–0.121); klasa `GalaxyMap.Map` zostaje w `galaxy-map.js`, ale menu jej nie używa.

- `menu.js`: ekran `campaign` to `.campaign-select` — lista `.campaign-list` i podgląd `#mission-preview`; `mountGalaxy()` podpina podgląd do najechania i fokusu na rozdziałach, `showMission(id)` rysuje kartę (numer w kolorze stanu, planeta, dane świata, wymaganie, opis, cel, przycisk odprawy działający jak kliknięcie rozdziału); ostatnio pokazany rozdział zapamiętany w `previewMission`.
- `galaxy-map.js`: `GalaxyMap.portrait(canvas, { reduced })` — sam obracający się podgląd świata pod celownikiem (`show(name)`, `destroy()`), na rysowaniu z `Map.prototype.drawPortrait`.
- `menu.css`: usunięte style mapy i układu pełnoekranowego; dwie kolumny (lista, podgląd), poniżej 980 px podgląd nad listą.

## Mapa galaktyki na pełnym ekranie (wersja 0.121, 2026-10-07)

- `menu.js`: klasa `map-screen` na `#command-menu` dla ekranu `campaign`; `fitGalaxy` nie ustala wysokości mapy w tym układzie; wcięcia mapy od 981 px.
- `menu.css` (od 981 px): okno kampanii `position: fixed` na całym ekranie, ukryte logo, stopka i tło menu; tytuł i kanał w lewym górnym rogu, lista od 104 px, przycisk powrotu w lewym dolnym rogu, karta planety po prawej (16 px od krawędzi), legenda na dole.
- `galaxy-map.js`: przybliżenie przy wybranej planecie od 1 do 1,14 zależnie od szerokości wolnego pasa (520–1220 px).

## Filmy na pełnym ekranie (wersja 0.120, 2026-10-07)

- `menu.js`: klasa `film-screen` na `#command-menu` dla ekranów `intro`, `intro2`, `intro3` i `interlude`.
- `menu.css`: dawne reguły pełnoekranowego intro (`[data-screen="intro"]`) przeniesione na `.film-screen`; przycisk pominięcia każdego filmu to `.menu-content > .menu-action`.

## Odblokowanie kampanii do testów (wersja 0.119, 2026-10-07)

- `CampaignProgress.toggleUnlockAll()` (`campaign.js`): zapisuje dotychczasowy stan w `pogranicze-campaign-backup-v1` i oznacza wszystkie rozdziały jako ukończone; ponowne wywołanie przywraca kopię i ją usuwa. Test: `tests/campaign-unlock.test.js`.
- `app.js`: Ctrl+Shift+L, gdy menu jest otwarte — przełącza odblokowanie, odświeża ekran główny, wyboru gry lub kampanii i pokazuje komunikat (`menu.notice`, styl `.menu-notice`).

## Mapa galaktyki (wersja 0.118, 2026-10-07)

- `galaxy-map.js`: kamera `cam`/`goal` (punkt skupienia i przybliżenie 1,14 przy wybranym świecie, ograniczone do mapy; `aim()`, `view()`), wygładzana w pętli; paralaksa za kursorem (`tilt`); warstwy: daleka galaktyka (`paintBackdrop`), bliższy pył i jasne gwiazdy (`paintDust`), oddychające mgławice, migoczące gwiazdy, układy z kamerą; winieta ciemniejsza pod kartami. `setInsets(l, r)` — wolny pas między kartami (światy w `place()` w tym pasie, większe: `0.026`). Regiony aktów (`drawActs`, kolory: turkus, bursztyn, fiolet; podpis, przygaszony zablokowany akt). Trasa: ukończona (ciągła z poświatą), następna (bursztynowa, biegnąca, sonda po krzywej), zablokowana (kropki). Numery rozdziałów (`ch.num`) w kółkach w kolorze stanu, następny z pulsującym pierścieniem; narożniki celownika przy wybranym świecie. `setPortrait(canvas)` — podgląd wybranego świata w karcie (siatka, obrót, pierścienie, księżyce, celownik, odczyt skanu).
- `menu.js` (`mountGalaxy`, `showWorld`): rozdziały z aktem i numerem; zwijana lista (`galaxy-toggle`, `list-folded`, pamiętane w `galaxyFolded`) i przeliczanie wcięć mapy przy zmianie układu; karta-dossier (dane świata, postęp rozdziałów, numery, wyróżniony przycisk odprawy następnego rozdziału); legenda trasy zamiast długiego opisu (opis w podpowiedzi).
- `menu.css`: powyżej 1280 px mapa wypełnia okno, lista i karta absolutnie nad nią (szkło), legenda na dole; poniżej — dotychczasowy układ. Ograniczone animacje: kamera bez wygładzania, bez pulsowania.

## Panel badań (wersja 0.117, 2026-10-07)

- `app.js` (`deck("research")`): karty `research-card` z etykietą dziedziny (`RESEARCH_FIELDS`), krótkim opisem (pełny w `data-description`/podpowiedzi), kosztem (metal, gaz, kryształy, czas) i paskiem `research-progress`; kolejność: w toku, dostępne i brak zasobów, zablokowane, ukończone (stan z `researchStatus`). `updateHud`: `data-state` na karcie, w trwającym badaniu procent, pozostały czas i tempo przy niedoborze mocy, szerokość paska; bez badania `queue-status` = „ZBADANE x / n · BRAK BADANIA”.
- `hud.css`: krawędź i odznaka w kolorze stanu (`--state`), przerywana ramka zablokowanych, turkusowe ukończone (bez kosztu), bursztynowe pulsujące badanie w toku, kolorowe etykiety dziedzin.

## Drzewo rozwoju (wersja 0.116, 2026-10-07)

- `development.js`: odznaka stanu (`STATES`) i koszt (`dev-cost`: metal, gaz, kryształy, czas) w każdym węźle; klasy `is-required` (wymaganie wybranego węzła) i `is-unlocked` (węzły, których wymaganiem jest wybrany) z etykietą `dev-link`; zakładki z licznikiem pozycji otwartych (gotowe, dostępne, w toku, brak zasobów) do wszystkich (`TAB_NAMES`); surowce w stopce jako kafelki; legenda (`dev-legend`).
- `development.css`: szkło, narożniki (`::before`) i linia skanu (`::after`) okna, migająca dioda nad tytułem, zakładki jak w menu, krawędź węzła w kolorze stanu (`--state`), przerywana ramka zablokowanych, pulsowanie badań w toku (`dev-work`), świecące połączenia ze strzałką (`.dev-arrow`, `.dev-leaves`), panel szczegółów z siatką pod podglądem i głównym przyciskiem jak w menu. Ograniczone animacje wyłączają ruch.

## Karty paska dowodzenia (wersja 0.129.5, 2026-10-07)

- `hud.css`: `.production .unit-card` przycina zawartość (`overflow: hidden`, `isolation: isolate`) — reguła z `expansion.css` (`overflow: visible`, zaokrąglenie 7 px) miała wyższą wagę niż `.unit-card` i błysk (`::after`) wychodził poza kartę; świecąca krawędź (`::before`) dziedziczy zaokrąglenie z lewej strony.

## Interfejs gry (wersja 0.115, 2026-10-07)

Arkusz `hud.css` (ładowany ostatni w `index.html`) zmienia tylko wygląd interfejsu bitwy — rozmiary i układ zostają z `style.css` i `expansion.css`:

- Górny pasek: szkło, świecąca dolna krawędź (`::after`), pas skanowania (`::before`, `hud-sweep`), migająca dioda misji, cyfry surowców w kroju konsoli z poświatą; przyciski ikon i narzędzia mapy jako szkło z podświetleniem.
- Panel boczny: szkło, etykiety sekcji ze świecącą kreską, zakładki jak w menu (`intel-tabs`, także `deck-tabs` talii), kwadratowe znaczniki celów (wykonane świecą), wywiad taktyczny jako bursztynowa karta.
- Pole bitwy: narożniki celownika (`.battlefield::after`), minimapa w szklanej ramce z narożnikami, dok grup.
- Komunikaty (`toast`): szklane karty z podświetloną lewą krawędzią (łączność w bursztynie).
- Pasek dowodzenia: szkło, świecąca górna krawędź, karty jednostek z zapalaną krawędzią i błyskiem (jak przyciski menu), świecące paski kolejki.
- Odprawa i raport nad planszą (`.briefing`): szkło z narożnikami. Ograniczone animacje wyłączają ruch.
- `api.situation()` (pauza): gdy `act2Objectives()` zwraca pustą listę, cele biorą się z rozdziału lub scenariusza.

## Ekrany menu jako panele taktyczne (wersja 0.114, 2026-10-07)

- Okna (`menu-window` z `windowed()` oraz baza wiedzy, `menu.css`): szklane tło z rozmyciem, narożniki (gradienty w `::before`), linia skanu przy otwarciu (`::after`, `win-scan`), wejście `win-open`; nad tytułem kanał ekranu z `EYEBROWS` w `menu.js` i migająca dioda, pod tytułem świecąca kreska; nagłówki `h2` w oknach jako etykiety HUD (▸ i linia).
- Tło (`menu-backdrop.js`): `setWorld(mission)` — barwy planety (lądy, nocna strona, atmosfera wg `theme`, potem `biome`) przechodzą płynnie do świata misji, celownik (narożniki, przerywany pierścień, „CEL · planeta”, odczyt orbity i skanu) zamyka się na planecie; wywoływane dla odprawy, scenariuszy (także przy zmianie mapy), dziennika i potwierdzenia startu; `null` wraca do świata pokładu.
- Ustawienia (`tabbed()`): sekcje rozdzielone nagłówkami stają się panelami z paskiem zakładek (`role=tab`, zapamiętana zakładka w `settingsTab`); suwaki wypełnione do wartości (`--fill`), przełączniki i listy w stylu interfejsu.
- Sloty: karty `slot-card` z miniaturą planety (`data-world`), misją, planetą, czasem T+ i datą; wolne (przerywany okrąg) i uszkodzone (kreskowanie) wyróżnione.
- „Co nowego”: oś czasu (linia w tle przewijanym razem z treścią, kropki przy wpisach, trzy najnowsze świecą, pierwszy z plakietką „NOWOŚĆ”).
- Potwierdzenia (`slot-confirm`, `replace`) i `save-error`: klasa `menu-dialog` — karta ostrzeżenia w bursztynie (błąd zapisu w czerwieni) ze znakiem ⚠.
- Odprawa: cel operacji jako ramka z ◎ (`menu-objective`), fakty jako kafelki. Ograniczone animacje wyłączają ruch okien.

## Pauza taktyczna (wersja 0.113, 2026-10-07)

- Ekran `pause` (`menu.js`): na `body` klasa `menu-over-game` — górny pasek i plansza zostają widoczne pod menu, które ma półprzezroczyste, rozmyte tło (gradient ciemniejszy z lewej, pod przyciskami); tło kosmiczne menu ukryte, pas skanowania w bursztynie; tytuł „Pauza taktyczna” z mrugającym znakiem Ⅱ; linia z misją, planetą i czasem T+.
- Raport sytuacyjny (`situationHtml`, dane z `api.situation()` w `app.js`): kafelki (metal, gaz, kryształy, jednostki bojowe, roboty, przekaźniki), cele (z `act2Objectives()` albo cel rozdziału/scenariusza; wykonane, nieudane, dodatkowe), planowany atak wroga z odliczaniem (`nextWave`), pora dnia i pogoda, liczba budynków, ostatnia linia łączności (akty II–III). Na wąskim ekranie ukryty; ograniczone animacje wyłączają ruch.

## Menu główne (wersja 0.112, 2026-10-07)

`menu-backdrop.js` (`MenuBackdrop.create(menu)`): jedna kanwa (z warstwą interfejsu) tworzona raz i dokładana przez `menu.js` po każdym przerysowaniu ekranu (`has-backdrop` na `#command-menu`; dawne gwiazdy i planeta z CSS ukryte).

- Scena (narzędzia `CampaignFilm.kit`, „cover”): mgławice, gwiazdy w trzech głębiach z paralaksą za kursorem (wygładzoną), rozbłysk słońca, planeta (r 132, oświetlona od strony menu, chmury dryfujące, światła miast na nocnej stronie, krawędź atmosfery) z dwiema orbitami i księżycem (przed lub za planetą), łańcuch sześciu latarni z wędrującym impulsem, konwój co 32 s, krążownik w oddali; przyciemnienie z lewej (pod tekstem menu) i winieta.
- Wydajność: ok. 30 klatek/s; nie rysuje, gdy menu jest ukryte, podczas filmów (`intro`, `intro2`, `intro3`, `interlude`) ani przy ograniczonych animacjach (wtedy jeden kadr).
- CSS (`menu.css`): narożniki interfejsu, przesuwający się pas skanowania, poświata logo i tytułu; przyciski — szkło z rozmyciem, lewa krawędź zapalana przy najechaniu, poświata, przesunięcie, przebiegający błysk, pulsujący przycisk główny; karta ostatniej operacji i szerokie okna jako szkło z cieniem. Ograniczone animacje wyłączają ruch.

## Ekran ładowania (wersja 0.111, 2026-10-07)

`loading-screen.js` (`LoadingScreen.show({ eyebrow, title, planet, biome, reduced, minTime }) → { done(), close() }`).

- Tło (narzędzia `CampaignFilm.kit`, skalowane „cover” na cały ekran): smugi gwiazd z centrum — długie na początku, coraz krótsze, gdy statek zwalnia — mgławica w kolorze świata, planeta misji (kolory biomu) rosnąca od środka, rozbłysk, winieta; narożniki interfejsu.
- Karta: rodzaj operacji, nazwa misji, planeta, pasek postępu (idzie z czasem, czeka na 85%, aż praca się skończy, potem dochodzi do 100%), etap i procent, losowa wskazówka (10 wskazówek).
- `app.js`: `launchWithScreen` (`api.start`) — ekran najpierw, misja budowana dwie klatki później (ekran zdąży się narysować), `done()` po trzech klatkach planszy, minimum 1,8 s; `loadWithScreen` (`api.load`, `api.loadSlot`) — po wczytaniu zapisu, minimum 1,2 s; ekran startowy gry (minimum 1,4 s, do zdarzenia `load`). Zamknięcie: płynne wygaszenie; kliknięcie po zakończeniu pracy; zapasowo na zegarze (karta w tle wstrzymuje klatki animacji).
- Ograniczone animacje: tło jako jeden kadr, wygaszenie natychmiastowe.

## Ekrany zwycięstwa i porażki (wersja 0.110, 2026-10-07)

`end-screen.js` (`EndScreen.mount(nakładka, { victory, biome, reduced })`, `EndScreen.countUp`) i `decorateEnd(victory)` w `app.js` — dla każdego końca bitwy (scenariusz, rozdział kampanii, gra sieciowa), po raporcie i ewentualnym epilogu aktu.

- Tło: kanwa pod raportem na cały obszar planszy (scena 960 × 400 skalowana „cover”), narzędzia `CampaignFilm.kit`. Zwycięstwo: niebo od granatu do bursztynu, mgławice, gwiazdy, wschód słońca z rozbłyskiem nad planetą w kolorach biomu mapy (światła miast), latarnie, transportowce i krążownik w przelocie, unoszące się iskry. Porażka: niebo od czerni do czerwieni, poszarpana linia zabudowań na horyzoncie z ogniami, słupy dymu, żar, pulsująca czerwień na krawędziach, napis „SYGNAŁ UTRACONY” w tle i pasy zakłóceń. Ziarno, winieta; zatrzymuje się, gdy nakładka znika.
- Karta (`.end-report.victory / .defeat`): półprzezroczyste szkło z rozmyciem, złota albo czerwona krawędź, baner pisany jak w terminalu (porażka — pulsujący), tytuł z poświatą, symbol pulsujący, statystyki jako kafelki z liczbami narastającymi od zera (czas pomijany), kolejne kafelki wjeżdżają po sobie; szerokość 560 px (840 px z epilogiem), przewijanie w obszarze planszy.
- Raport scenariusza: czas operacji, zniszczone cele, przekaźniki, wydobyty metal, jednostki na koniec.
- Ograniczone animacje (ustawienie menu i `prefers-reduced-motion`): tło jako jeden kadr, bez animacji karty i liczników.

## Zakończenia aktów (wersja 0.109, 2026-10-07)

`epilogue-films.js` (`Epilogues.film(rozdział, gra)`, 4 × 5 s, reżyser `CampaignFilm.kit.render`). W raporcie po zwycięstwie w rozdziale III, VI i IX (`showEpilogue` w `app.js`): film nad raportem (okno raportu poszerzone do 840 px, przewijane w obszarze planszy), podpis ujęcia, zatrzymanie na ostatnim kadrze (tytuł), przycisk „Odtwórz epilog ponownie”; muzyka przechodzi na motyw intro; ograniczone animacje — kadry stoją.

| Akt | Ujęcia | Od czego zależy |
|---|---|---|
| I (rozdział III) | cytadela Nadiru przechyla się i płonie, myśliwce Kolonii nad nią; latarnie zapalają się po kolei, łączone wiązkami, „SIEĆ LATARNI” rośnie do 100%; nocna strona Khepri IV — światła miast wracają; wschód nad flotą, tytuł „ODZYSKANY ŚWIT / KONIEC AKTU I” | — |
| II (rozdział VI) | kompleks Hefajstos: przeciążenie (błysk, fala uderzeniowa) albo gaśnięcie rdzenia i odlot transportera z technikami; po bitwie: krater z dymem albo ciemny kompleks, popiół; laboratorium Liry: artefakt pod kopułą zaczyna pulsować, odpowiedź z Lumerii V; flota, tytuł „CENA ŚWITU” z dopiskiem „Popiół Hefajstosa” albo „Wdzięczność Dominium” | decyzja o kompleksie (`act2.choice`) |
| III (rozdział IX) | Serce Roju gaśnie, kryształy pękają, Rój rozsypuje się w pył; artefakty na mapie milkną jeden po drugim („BRAK SYGNAŁU”); nad Pyrrhosem floty Kolonii i Dominium razem z myśliwcami (zaufanie) albo rozchodzące się (dystans); wspólny świt, tytuł „ŚWIT — TYM RAZEM WSPÓLNY / KONIEC KAMPANII” | decyzja wobec Varna (`campaignLegacy.colony8`) |

Sprawdzenie: kadry wszystkich wariantów na stronie gry; w grze rozdział III → zwycięstwo → raport z epilogiem (podpisy, zatrzymanie na tytule, powtórka); bez błędów w konsoli.

## Sceny łączności i prolog aktu III (wersja 0.108, 2026-10-07)

**Sceny łączności** (`interludes.js`, na narzędziach `CampaignFilm.kit`): tło — mgławica, gwiazdy, planeta rozdziału (kolory według motywu mapy albo biomu) od strony przeciwnej do rozmówcy, powolny najazd; holograficzny panel rozmówcy (210 px) z portretem mówiącym, liniami skanowania, narożnikami, imieniem, rolą i wskaźnikiem sygnału — strona i kolor: Kolonie po lewej (turkus i kolory postaci), Dominium po prawej (czerwień, zakłócenia częste), Varn (bursztyn), Rój (fiolet, zakłócenia); panel danych po drugiej stronie: nagłówek kanału („SZYFR KOLONII”, „PRZECHWYCONO · KANAŁ DOMINIUM”, „SYGNAŁ NIEZNANY · ŹRÓDŁO: ARTEFAKTY”), kwestia pisana na żywo (zawijana, z kursorem) i fala głosu zależna od ruchu ust; wykończenie kadru (`kit.finish`: korekcja barwna strony, winieta, ziarno, pasy) z nagłówkiem „ŁĄCZNOŚĆ · planeta”, nazwą rozdziału i numerem kwestii na pasach; szum między kwestiami, wejście i wyjście przez czerń. API bez zmian (`Interludes.film(id)`).

**Prolog aktu III** (`act3-film.js`, `Act3Film`, 4 × 5 s, reżyser `kit.render`): 1 — holograficzna mapa pogranicza, pięć artefaktów (kryształy) pulsujących coraz bardziej w jednym rytmie, łączące je wiązki, „RYTM ARTEFAKTÓW: ZSYNCHRONIZOWANY”; 2 — Lumeria V nocą: kryształowa grota oddychająca fioletem, pełzacze Roju (kryształowe ciała, nogi w ruchu, świecące oczy) wychodzące na gąszcz świecących grzybów, zarodniki; 3 — Nivalis: krążownik Kolonii i okręt flagowy Varna obok siebie, myśliwce obu stron, chmura Roju nadciągająca z prawej; 4 — Pyrrhos: Serce Roju pulsujące pod skorupą (żyły magmy i fioletu), kryształy, Rój wznoszący się, uderzenie orbitalne, wstrząs kamery, tytuł „PRZEBUDZENIE ROJU / AKT III”. Menu: ekran `intro3` (jak `intro2`), odtwarzany raz przed rozdziałem VII (potem scena łączności i odprawa), przycisk „Prolog aktu III” w liście kampanii po ukończeniu rozdziału VI; Esc i „Pomiń prolog” przechodzą dalej.

`kit.render` przyjmuje też długość ujęcia (`spec.length`, domyślnie 5 s); `kit.finish` jest dostępny dla innych filmów.

Sprawdzenie: ujęcia scen (II, VI, VII) i prologu aktu III na stronie gry, przepływ w menu (rozdział VII → prolog → scena → odprawa, przycisk prologu) — bez błędów w konsoli; `tests/menu-browser.html` 37/37; `npm test` 285/285.

## Prolog aktu II (wersja 0.107, 2026-10-07)

`act2-film.js` przepisany na narzędziach intro: `campaign-film.js` udostępnia `CampaignFilm.kit` (rysowanie: planety, gwiazdy, mgławice, statki, wiązki, latarnie, rozbłyski) i reżysera `kit.render(ctx, czas, ograniczony, spec)` — kadr, ruch kamery, interfejs, tytuł, wykończenie i przejścia według `spec` (`shots`, `titles`, `places`, `captions`, `tints`, `label`, `alarm` — ujęcia z alarmem, wstrząsem i czerwonym błyskiem, `receive` — ujęcia odbioru transmisji). Intro aktu I używa tego samego reżysera.

Ujęcia (4 × 5 s, te same podpisy): 1 — latarnie zapalają się po kolei w całym sektorze, z pustynnej planety rozchodzą się pierścienie sygnału, w interfejsie przebieg „SYGNAŁ · 0.3 Hz · POWTARZANY”, konwój; 2 — zmierzch nad Khepri IV: niebo od fioletu do pomarańczu, słońce z rozbłyskiem, trzy plany wydm z grzbietami w świetle, kratownicowe wiertnie Dominium (migające lampy, żarzące się wiertło, kłęby pyłu), płyty grzbietu paszczaka wynurzające się i znikające w piasku, nawiewany piasek; 3 — przełęcz Vesperu: góry, droga pod górę, trzy konwojowce z żarzącymi się rdzeniami i reflektorami przecinającymi śnieżycę, śnieg w dwóch głębiach, oddychająca biel; 4 — Vulkan IX: schodkowy kompleks podświetlony od tyłu, krawędzie i okna w żarze, rdzeń pulsujący, wiązki energii ciągnięte z planety do rdzenia i w niebo, rzeki lawy, popiół i iskry, krążące okręty i krążownik Dominium, wstrząs kamery, tytuł „CENA ŚWITU / AKT II”.

Sprawdzenie: ujęcia na stronie `tests/film-browser.html` (z dołączonym `act2-film.js`) i oba filmy w menu — bez błędów w konsoli; `tests/menu-browser.html` 37/37.

## Intro kampanii (wersja 0.106, 2026-10-07)

`campaign-film.js` przepisany: 6 ujęć po 5 s (to samo API `draw(ctx, czas, ograniczony) → { scene, caption }`, te same podpisy), w stylu przerywników gier sci-fi.

- Kadr: pasy kinowe, najazd kamery (1,2% na sekundę), wstrząs pod ostrzałem, przejścia przez czerń, czerwony błysk przy pierwszym trafieniu; korekcja barwna ujęcia (`soft-light`), winieta, ziarno (24 klatki/s), przesuwający się pas jasności.
- Interfejs: narożniki kadru, kod czasu T+, miejsce ujęcia, znacznik NAGR./ALARM/ODBIÓR, współrzędne; tytuł pisany litera po literze z kursorem i zakłóceniem RGB, linia pod nim i numer ujęcia.
- Elementy: mgławice (miękkie gradienty dodawane), gwiazdy w paralaksie z migotaniem, planety (oświetlona strona, strona nocna, kontynenty, smugi chmur, światła miast tylko po stronie nocnej, poświata i podświetlona krawędź atmosfery, pierścienie), krążowniki (warstwy kadłuba, panele, mostek, rzędy okien, migające światła pozycyjne, smugi silników), transportowce z kontenerami, myśliwce, wiązki laserów, latarnie, rozbłysk anamorficzny z odbiciami.
- Ujęcia: 1 — pierścieniowa planeta, łańcuch latarni z wędrującym impulsem, konwój i krążownik eskorty; 2 — krążownik Dominium wsuwa się w kadr, lasery gaszą latarnie jedna po drugiej, myśliwce; 3 — nocna strona Khepri IV, miasta gasną, „SIEĆ LATARNI” spada do 0%, ostatni transport; 4 — hologram Liry (mówiący portret z `portraits.js`, gdy jest wczytany; inaczej sylwetka), linie skanowania, zakłócenia, fala głosu i trasa Eos → Vesper rysująca się na mapie; 5 — przelot przez lodowe kaniony (cztery plany gór z ośnieżonymi grzbietami, mgła, smugi śniegu); 6 — wschód słońca nad krawędzią planety z rozbłyskiem, latarnie zapalają się po kolei, flota, tytuł „ODZYSKANY ŚWIT”.
- Ograniczone animacje: kadr ze środka ujęcia, bez ruchu kamery, migotania, wstrząsów, ziarna i przejść.
- Sprawdzenie: `tests/film-browser.html` (arkusz sześciu ujęć) i intro w menu — bez błędów w konsoli.

## Głos łączności (wersja 0.101, 2026-10-07)

Moduł `audio-radio.js` (po `audio.js`) dodaje do `GameAudio` metody `speak(kto, tekst, { motif })`, `radioSyllables(kto, tekst)` i `radioMotif(kto, czas)`.

- **Sylaby z tekstu**: słowa dzielone na 1–4 sylaby (po ok. 3 litery), wysokość z hasha sylaby w zakresie głosu postaci (ta sama linia brzmi zawsze tak samo), długość z tempa postaci, przerwy między słowami dłuższe po interpunkcji; najwyżej 4 s na linię. Ostatnia trzecia część linii opada (zdanie oznajmujące) albo rośnie (pytanie).
- **Głosy** (`GameAudio.RADIO_VOICES`): Lira 330 Hz, trójkąt, 11 sylab/s; Tessa 270 Hz, sinus, 8/s, vibrato; Vale 140 Hz, piła, 9/s; Koss 175 Hz, prostokąt, 10/s, drżenie; Varn 108 Hz, piła, 7/s, mocny przester; Nasłuch Dominium 200 Hz, prostokąt, 12/s — modulacja pierścieniowa 37 Hz i wypadające sylaby; Szept Roju — akord sinusów (1 : 1,5 : 2,01) o powolnym narastaniu, bez trzasków nadajnika.
- **Tor radiowy**: przester (tanh), filtr pasmowy w paśmie postaci, szum przez całą linię, trzask włączenia (pomijany, gdy właśnie zagrał sygnał „radio” gry) i wyłączenia nadajnika.
- **Motywy** (`GameAudio.RADIO_MOTIFS`): 3–4 nuty na postać (Lira — wznosząca kwarta i oktawa, Koss — opadająca molowa, Varn — niski, z półtonem, Dominium — dwa dźwięki na przemian, Szept — tryton i septyma); w scenie łączności przed rozdziałem, przy pierwszej kwestii postaci.
- Głośność według kanału komunikatów (`alerts`); wyciszenie gry wycisza też głosy; limit jednoczesnych głosów jak dla efektów.
- Testy: `tests/audio-radio.test.js` (głosy i motywy wszystkich postaci, długość linii, powtarzalność, niższy głos Varna, rosnące pytanie). Przeglądarka: każdy głos odtworzony na WebAudio bez błędów, węzły zwolnione po linii.

Poprawka: pierwsza klatka sceny łączności mogła mieć ujemny czas (znacznik `requestAnimationFrame` sprzed startu) — scena zaczyna od zera.

## Wybory i rozgałęzienia (wersja 0.100, 2026-10-07)

Reguły w `campaign-choices.js` (`RTS.CAMPAIGN_DECISIONS`). Każda decyzja pojawia się raz w trakcie swojego rozdziału (warunek `when`, linia łączności), gra staje, a okno pokazuje dwie opcje z opisem skutków; wyboru nie można cofnąć. Stan w zapisie gry (`campaignDecision`), po zwycięstwie — w postępie kampanii (`choices`, obok `colony6`). Skutki stosuje `applyCampaignChoices` raz, na starcie rozdziału (razem z poziomem i premią za odznakę; `campaignLegacy` w zapisie). Odprawa rozdziału pokazuje ramkę „Skutki decyzji” (albo informację, gdzie decyzja zapadnie).

| Rozdział decyzji · warunek | Opcja | Skutek (rozdziały) |
|---|---|---|
| I · Kody Dominium · 2 przekaźniki gracza | Nadaj apel do kolonistów | II–III: 2 piechurów i rakietowiec na start; dowódca AI +150 metalu |
| | Zachowaj kody w tajemnicy | II–III: przechwycone rozkazy 45 s przed atakiem (zamiast 25 s); okolica bazy wroga (500) odkryta |
| III · Upadek cytadeli · centrum wroga < 40% | Zabezpiecz arsenał | IV–VI: +250 metalu i czołg na start |
| | Ocal jeńców | IV–VI: budynki wroga −10% wytrzymałości; posiłki dwa razy (co najmniej 120 s odstępu) |
| VIII · Propozycja Varna · Szczyt 60 s albo 5. minuta | Przyjmij propozycję | IX: 2 bastiony Dominium; uderzenie orbitalne ładuje się o 30% szybciej; epilog — rozejm |
| | Zachowaj dystans | IX: +400 metalu i artyleria; epilog — kruchy rozejm, każdy swoją drogą |

Linie łączności na starcie rozdziałów z dziedzictwem decyzji mówią, co się zmieniło (Lira, Tessa, Vale, Koss, Varn). Testy: `tests/campaign-choices.test.js` (5).

## Portrety i sceny łączności (wersja 0.99)

Realizuje formę z [Kierunków rozwoju §8](KIERUNKI_ROZWOJU.md): krótkie sceny 2D z portretami i dialogi radiowe w grze. Informacje krytyczne nadal są dostępne jako tekst (podpis sceny, treść w okienku łączności i dzienniku).

## Portrety (`portraits.js`)

- Rysowane w kodzie na kanwie (bez plików graficznych): popiersie na ekranie łączności — tło w kolorze postaci, siatka, linie skanowania, przesuwający się jasny pas, ramka z narożnikami.
- Postacie: **Lira** (słuchawki z mikrofonem, gogle na czole, podgolone turkusowe włosy, kurtka Kolonii), **dr Mira Tessa** (siwy kok, okrągłe okulary, fartuch z kołnierzykiem), **kpt. Oren Vale** (krótko ostrzyżony, zarost, blizna, mundur z naramiennikami), **Adrian Koss** (łysy, gogle spawalnicze, pomarańczowy kombinezon, zmęczone brwi), **kmdr Aris Varn** (zaczesane włosy z siwymi skroniami, wysoki kołnierz, insygnia Dominium), **Nasłuch Dominium** (godło w zakłóceniach), **Szept Roju** (kryształowe odłamki wokół pulsującego jądra).
- Animacja: mruganie, lekkie kołysanie, usta w rytmie sylab podczas mówienia (`Portraits.mouth`). API: `draw(ctx, kto, x, y, rozmiar, t, mowa)`, `canvas(kto, rozmiar)`, `talk(kanwa, kto, sekundy)`, `still(kto, rozmiar)` (obraz do list), `speakerOf("Imię: tekst")`.

## W grze (`app.js`)

- Powiadomienie zaczynające się od imienia rozmówcy (`RTS.ACT2_SPEAKERS`) — z łączności aktów II–III i ze zdarzeń kampanii (0.98) — pokazuje się jako okienko łączności: mówiący portret 56 px, imię w kolorze postaci i treść, przez 6,5 s (inne komunikaty bez zmian).
- Dziennik celów aktów II–III: ostatnia linia łączności z portretem 34 px.

## Sceny przed rozdziałami (`interludes.js`)

- Dla każdego rozdziału I–IX 3–4 kwestie po ok. 4,6 s (13–18 s): duży portret mówiącego (Kolonie po lewej, Dominium i Rój po prawej) z tabliczką imienia i roli oraz wskaźnikiem sygnału, w tle gwiazdy i zbliżająca się planeta rozdziału w barwach biomu; nagłówek „ŁĄCZNOŚĆ · planeta”. Podpis pod sceną: imię i kwestia (czytniki ekranu — `aria-live`).
- Odtwarzana raz przed pierwszą odprawą rozdziału (zapamiętane na urządzeniu: `pogranicze-interludes-v1`), w rozdziale IV po prologu aktu II; „Pomiń scenę” i Esc przechodzą do odprawy, przycisk „Scena łączności” w odprawie odtwarza ją ponownie. Ograniczony ruch (`reduced`) — bez animacji i wygaszeń.
- Treść scen dopowiada fabułę między rozdziałami (Eos → Vesper → Nadir, Tessa pod piaskiem Khepri, konwój Vale’a, Koss w kompleksie Hefajstos, przebudzenie Roju, sojusz z Varnem).

## Weryfikacja

- `tests/interludes.test.js`: każdy rozdział I–IX ma scenę 3–4 kwestii znanych rozmówców. `npm test` 276/276.
- Przeglądarka: scena przed rozdziałem II i VI (portret Kossa mówi, podpis zmienia się z kwestią), pomijanie i przycisk powtórki w odprawie, okienko łączności z portretem Liry w grze i portret w dzienniku celów; konsola bez błędów; `tests/menu-browser.html` 37/37.
