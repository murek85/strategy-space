# Kampania — portrety, sceny łączności i wybory (wersje 0.99–0.101, 2026-10-07)

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
