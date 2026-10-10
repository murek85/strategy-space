# Plan rozwoju prototypu

Aktualizacja: 2026-10-09. Aktualna wersja: 0.171.17.

Ten plik jest punktem wejścia do dokumentacji: opisuje bieżący stan, otwarte kierunki i historię wersji. Instrukcja gry i sterowanie: [README](../README.md).

## Stan projektu

Ukończone etapy z [Kierunków rozwoju](KIERUNKI_ROZWOJU.md): **A — Rozwój kolonii**, **B — Armia i baza**, **C — akt II kampanii, tryby i rozmiary map**, **D — Oprawa**, **E — Wsparcie i moduły**, **F — scenariusze, frakcje, akt III**. Dowódca AI działa w scenariuszach (0.34) i w wybranych rozdziałach kampanii (0.97). Gra wieloosobowa 1 na 1 przez WebRTC (0.46–0.49, płynność gospodarza 0.123). Renderery: Canvas 2D, WebGL/WebGPU (PixiJS, 0.21–0.44) i 3D (Three.js, 0.52–0.96).

Gra zawiera trzy frakcje (Wolne Kolonie, Dominium, Rój Kryształowy), osiem map scenariuszy dla 2–4 uczestników (także drużyny 2 na 2) w sześciu trybach (Podbój, Utrzymanie przekaźników, Obrona, Ekspedycja, Król wzgórza, Przetrwanie) i trzech rozmiarach, z ziarnem mapy, kodem operacji i ustawieniami (złoża, fauna, pogoda, długość doby — także wieczny dzień i wieczna noc, poziom startowy). Kampania „Odzyskany Świt” ma szkolenie i dziewięć rozdziałów w trzech aktach, z decyzjami fabularnymi, celami dodatkowymi, scenami łączności z głosami syntezowanymi, filmowymi prologami i epilogami oraz poziomem trudności. Gospodarka: metal, gaz, kryształy, moc z akumulatorem, handel, roboty budujące i wydobywające; rozwój: dwa poziomy centrum, badania i drzewo rozwoju (F2). Oprawa: proceduralna grafika 2D i 3D z dobą, pogodą, niebem i fauną, muzyka filmowa (Tone.js), menu i interfejs w stylu pokładu dowodzenia.

## Mapa dokumentacji

| Dokument | Rodzaj | Status |
|---|---|---|
| [Kierunki rozwoju](KIERUNKI_ROZWOJU.md) | Koncepcja etapów A–D | Etapy ukończone; poziom III i doktryny — propozycje |
| [Etap A — Rozwój kolonii](ETAP_A_ROZWOJ_KOLONII.md) | Opis wdrożenia | Ukończony 2026-09-24 |
| ↳ [Drzewo rozwoju](DRZEWO_ROZWOJU.md), [Panel gospodarki](PANEL_GOSPODARKI.md), [Poziomy centrum](POZIOMY_CENTRUM.md), [Akumulator](AKUMULATOR_ENERGII.md), [Warsztat](WARSZTAT_POLOWY.md) | Podetapy A | Wdrożone (wygląd drzewa odnowiony w 0.116 — [opis](KAMPANIA_OPRAWA.md)) |
| [Etap B — Armia i baza](ETAP_B_ARMIA_I_BAZA.md) | Opis wdrożenia | Ukończony, wersja 0.15 |
| [Etap D — Oprawa](ETAP_D_OPRAWA.md) | Opis wdrożenia i pomiary | Ukończony, wersja 0.16 |
| [Etap C — Akt II kampanii](ETAP_C_DRUGI_AKT.md) | Opis wdrożenia | Ukończony, wersja 0.17 |
| [Etap C — Tryby i rozmiary map](ETAP_C_TRYBY_I_MAPY.md) | Opis wdrożenia | Ukończony, wersja 0.18 |
| [Etap E — Wsparcie i moduły](ETAP_E_WSPARCIE_I_MODULY.md) | Opis wdrożenia | Ukończony, wersja 0.32 |
| [Scenariusze: Ekspedycja, ziarno, ustawienia](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md) | Opis wdrożenia | Ukończone, wersja 0.33 |
| [AI przeciwnika](AI_PRZECIWNIKA.md) | Opis wdrożenia i symulacje | Wdrożone w 0.34; styl frakcji 0.51; kampania 0.97–0.98, 0.102; mgła wojny 0.129 |
| [Etap F](ETAP_F.md) | Opis wdrożenia (grafika, scenariusze, frakcje, kampania) | Ukończony w 0.35–0.42; wybory 0.50; wieczna noc 0.124 |
| [Mapy tematyczne](MAPY_TEMATYCZNE.md) | Opis wdrożenia | Wdrożone, wersje 0.19–0.20 |
| [Renderer WebGL](RENDERER_WEBGL.md) | Propozycja, prototyp, etapy 2–5, cała plansza natywnie, pomiary | Wdrożone w 0.21–0.44 (WebGL/WebGPU z trybem awaryjnym Canvas 2D) |
| [Renderer 3D](RENDERER_3D.md) | Opis wdrożenia | Wdrożone w 0.52–0.96 (Three.js: teren, modele, światło, pogoda, niebo, przyroda, kamera); kinowy obraz 0.125, teren PBR 0.126, atmosfera i woda 0.127, detale modeli 0.128 — cztery etapy „rewolucji 3D” zrealizowane |
| [Dźwięk i muzyka](AUDIO.md) | Opis wdrożenia | Próbki i Tone.js od 0.45; muzyka filmowa 0.103–0.105 |
| [Gra wieloosobowa](MULTIPLAYER.md) | Opis wdrożenia | Wdrożone w 0.46–0.49; płynność gospodarza 0.123 |
| [Kampania — oprawa](KAMPANIA_OPRAWA.md) | Opis wdrożenia | Sceny łączności, wybory, głosy, filmy, menu, pauza, interfejs gry, drzewo i panel badań, wybór rozdziału (0.99–0.122); zwarty interfejs bitwy (0.149) |
| [Wersja 0.12](WERSJA_0_12.md), [0.13](WERSJA_0_13.md), [0.14](WERSJA_0_14.md) | Notatki wydań | Wdrożone |
| [Etap G](ETAP_G.md) | Plan (2026-10-08) | Ukończony: G1 (AI nowych mechanik) 0.150, G3 (aplikacja Electron) 0.151, G2 (desant z orbity) 0.152, G4 (lobby, 2 na 2, powrót do bitwy) 0.153 |
| [Desant z orbity](DESANT_Z_ORBITY.md) | Opis wdrożenia | Tryb „Inwazja” (0.152) |
| [Akt IV „Inwazja”](AKT_IV.md) | Ukończony (2026-10-09) | Pięć rozdziałów X–XIV: Admiralicja Dominium (adm. Vok) i Wartownicy Otchłani. H3 (frakcja Wartowników) ukończony w 0.154, H1–H2 (rozdziały X–XI) w 0.156, H4 (XII) w 0.157, H5 (XIII) w 0.158, H6 (XIV, prolog i epilog) w 0.159, H7 (balans) w 0.160 |
| [Aplikacja na Windows](APLIKACJA.md) | Opis wdrożenia | Electron, instalator, zapisy do pliku (0.151) |
| [Pomysły](POMYSLY.md) | Lista możliwości | Aktualne statusy pomysłów |
| [Gospodarka i rozwój](GOSPODARKA_I_ROZWOJ.md) | Koncepcja z 0.3–0.8 | Historyczna; niemal całość wdrożona |
| [Grafika planszy](GRAFIKA_PLANSZY.md) | Koncepcja i realizacja 2D | Historyczna; pakiety 2D wdrożone, 3D wdrożone później jako [renderer 3D](RENDERER_3D.md) |
| [Menu główne](MENU_GLOWNE.md) | Koncepcja z 0.4 | Historyczna; obecny wygląd menu — [opis](KAMPANIA_OPRAWA.md) |

## Otwarte kierunki

Wpis nie oznacza zlecenia realizacji ani terminu. Wybrane do realizacji: [Etap G](ETAP_G.md) (G1 AI nowych mechanik → G2 desant z orbity → G3 aplikacja Electron → G4 lobby, ponowne dołączenie, 2 na 2).

| Kierunek | Źródło | Status |
|---|---|---|
| Twierdza i doktryny dalej: balans kosztów i efektów po rozgrywkach z ludźmi, specjalistyczne lotnictwo i osłony dla poziomu III (doktryny w rękach AI — wdrożone w 0.150) | [Poziomy centrum](POZIOMY_CENTRUM.md) | Propozycja |
| AI dalej: budynki wsparcia, moduły i jednostki specjalne w rękach AI; strojenie dowódcy w kampanii z rozgrywek (mgła wojny dla AI — wdrożona w 0.129) | [AI przeciwnika](AI_PRZECIWNIKA.md), [Etap E](ETAP_E_WSPARCIE_I_MODULY.md) | Propozycja |
| Bohaterowie | [Pomysły](POMYSLY.md) | Propozycja |
| Scenariusze dalej: edytor map, wyzwania z ziarnem i tabele wyników; balans Ekspedycji, Króla wzgórza i Przetrwania | [Kierunki §9](KIERUNKI_ROZWOJU.md), [Etap F](ETAP_F.md) | Propozycja |
| Kampania: nagrane głosy (dziś syntezowane, 0.101), balans aktów II–III | [Kampania — oprawa](KAMPANIA_OPRAWA.md) | Propozycja |
| Oprawa: dźwięki leczenia, osłony i sabotażu; dalsza czytelność efektów walki (OPR-02) | [Etap E](ETAP_E_WSPARCIE_I_MODULY.md), [Pomysły](POMYSLY.md) | Propozycja |
| Balans trzech frakcji, kosztów i dochodu pasywnego (BAL-01, GOS-03) | [Pomysły](POMYSLY.md), [Etap F](ETAP_F.md) | Wymaga rozgrywek porównawczych |
| Bitwy kosmiczne i transport między planetami | [Bitwa na orbicie](BITWA_NA_ORBICIE.md), [Desant z orbity](DESANT_Z_ORBITY.md), [Pomysły](POMYSLY.md) | W toku: bitwa na orbicie (0.130–0.142), desant z orbity — tryb Inwazja (0.152); dalej transport w kampanii, inwazja w grze sieciowej |

## Testy

`npm test` uruchamia wszystkie pliki `tests/*.test.js` wbudowanym runnerem Node (`node --test`), również gdy któryś z nich zawiedzie. Stan 2026-10-07 (0.124): 287 testów, wszystkie przechodzą. Strony `tests/*-browser.html` są kontrolami w przeglądarce: menu (`menu-browser.html`, 37 sprawdzeń), drzewo rozwoju (`development-browser.html`, 68), renderery (`render-browser.html` — Canvas 2D, `render-webgl-browser.html` — WebGL/WebGPU, `render-3d-browser.html` — 3D), filmy kampanii (`film-browser.html`, arkusz kadrów), mapy (`maps-browser.html`), płynność (`benchmark-browser.html`) oraz audio, grafika i pogoda.

Przy każdym kolejnym etapie należy uruchomić pełny zestaw, nie tylko testy ukierunkowane. Po etapach A, B i D trzy starsze testy pozostały niezaktualizowane (wymaganie Kolonii dla fabryki, nowe pola bilansu mocy, szkolenie bez fauny); poprawiono je 2026-09-26.

## Historia wersji

| Wersja | Zakres |
|---|---|
| 0.1 | Podstawowa bitwa, ruch i walka, trzy typy wojsk, przekaźniki, wieżyczki, desanty AI, minimapa, zwycięstwo i porażka |
| Poprawka 0.1 | Czytelny kursor renderowany na stronie |
| 0.2 | Roboty, wydobycie i naprawy, koszary i fabryki, mgła wojny, badania, zapis lokalny |
| 0.3 | Grupy 1–9, punkty zbiórki, równoległe kolejki, alarm ataku na bazę, migracja zapisów 0.2 |
| 0.4 | Proceduralne efekty dźwiękowe, powiadomienia, stereo, wyciszenie i zapamiętywanie głośności |
| 0.5 | Menu główne, Gra jednoosobowa z odprawą, kontynuowanie, baza wiedzy, ustawienia, menu pauzy i ochrona zapisu |
| 0.6 | Magazyny polowe, gaz i ekstraktory, bezczynne roboty, większe ładownie i migracja zapisów |
| 0.8 | Reaktory, moc, laboratoria, kryształy, trzy biomy i pierwszy rozdział kampanii |
| 0.9 | Duże mapy, trzy rozdziały kampanii, pięć slotów, ciężka maszyna, artyleria, mury, bramy, woda i fauna |
| 0.10 | Budowa przez roboty, osłona piechoty, utrzymanie pozycji, opad i akumulacja pogody, pożar oraz cztery motywy muzyczne |
| 0.11 | Pogoda wpływająca na walkę, cykl dnia i nocy, badania pogodowe, ptaki i ryby, pięć aranżacji muzycznych |
| 0.12 | Dwie frakcje, scenariusze 2–4 uczestników z trudnością, lotnictwo i hangar, uzbrojone roboty, przeciągane mury — [notatki](WERSJA_0_12.md) |
| 0.13 | Mury pod kątem i w okręgu, rozbiórka, osobne mapy kampanii i prolog — [notatki](WERSJA_0_13.md) |
| 0.14 | Księżyc i światła lotnictwa, sześć ujęć prologu, narożne bazy, dźwięki pracy, zakładki bazy wiedzy, siedliska zagrożeń — [notatki](WERSJA_0_14.md) |
| Etap A (24.09) | Drzewo rozwoju, panel gospodarki, poziomy centrum, akumulator, warsztat, trzy technologie, szkolenie Próba kolonii — [opis](ETAP_A_ROZWOJ_KOLONII.md) |
| 0.15 | Etap B: transporter, bateria przeciwlotnicza, formacje, sylwetki frakcji, radio, statystyki oddziału — [opis](ETAP_B_ARMIA_I_BAZA.md) |
| 0.16 | Etap D: muzyka warstwowa, mikser kategorii, etapy budowy, jakość grafiki, licznik renderowania — [opis](ETAP_D_OPRAWA.md) |
| 0.17 | Etap C, akt II „Cena świtu”: rozdziały IV–VI, dialogi radiowe, dziennik celów, cele dodatkowe z odznakami, decyzja w rozdziale VI, podsumowanie misji, prolog aktu II — [opis](ETAP_C_DRUGI_AKT.md) |
| 0.18 | Etap C, scenariusze: tryby Podbój, Utrzymanie przekaźników i Obrona; mapy małe, średnie i duże z generowaną zawartością; szybsze A* — [opis](ETAP_C_TRYBY_I_MAPY.md) |
| 0.19 | Cztery mapy tematyczne: Świetlisty Gąszcz, Wiszące Szczyty, Wydmy Bliźniaczych Słońc, Rzeki Magmy; rzeki, rozpadliny i lawa z przejściami; woda na minimapie — [opis](MAPY_TEMATYCZNE.md) |
| 0.20 | Klasyczne mapy scenariuszy z nowym terenem (wydmy, kanion, wrak obcego statku, zamarznięta placówka); kampania aktu I w nowym klimacie bez zmian układu; odrzucanie zapisów sprzed zmiany — [opis](MAPY_TEMATYCZNE.md) |
| 0.21 | Renderer WebGL (PixiJS) w grze: mapa świateł dnia i nocy, cienie od słońca, poświata, połysk wody, miękka mgła; wybór renderera i efektów w Ustawieniach, automatyczny powrót do Canvas 2D — [opis](RENDERER_WEBGL.md) |
| 0.22 | Etap 4 renderera: objętość budynków w świetle słońca i księżyca, sadza, pęknięcia i pożary uszkodzonych budynków, wypalony grunt, deszcz i śnieg na GPU, piorun rozświetlający planszę, mniej warstw — [opis](RENDERER_WEBGL.md) |
| 0.23 | Etap 5 renderera: wysokość terenu z rzeźbą i cieniami gór, opcjonalna perspektywa 2,5D, eksperymentalny WebGPU; poprawki migotania przy przesuwaniu, miękka mgła — [opis](RENDERER_WEBGL.md) |
| 0.24 | Grunt jako natywne obiekty PixiJS (złoża, przekaźniki, kałuże, jeziora, ślady, ścieżki); plansza WebGL 1,7–2,6× szybsza — [opis](RENDERER_WEBGL.md) |
| 0.25 | Modele jednostek i budynków jako natywne obiekty PixiJS (wygląd według stanu, animacje, skala według przybliżenia), natywne cienie, zaznaczenia, paski, efekty walki, siedliska i mury; bitwa 120 jednostek 1,7× szybsza — [opis](RENDERER_WEBGL.md) |
| 0.26 | Zwierzyna, ptaki, ryby i latające wyspy jako natywne obiekty PixiJS; warstwa Canvas nad modelami tylko dla nieba z wtyczek — [opis](RENDERER_WEBGL.md) |
| 0.27 | Poświata i efekty map (z wtyczkami) nagrywane i odtwarzane jako obiekty PixiJS, z automatycznym powrotem do Canvas; przez Canvas już tylko interfejs na planszy — [opis](RENDERER_WEBGL.md) |
| 0.28 | Interfejs na planszy nagrywany i odtwarzany jako obiekty PixiJS (tekst, przekształcenia, kreski, gradienty, przycinanie, obrazy); żadna warstwa Canvas nie jest przesyłana — [opis](RENDERER_WEBGL.md) |
| 0.29 | Latarki piechoty i reflektory pojazdów w WebGL znowu jako stożki (jak w Canvas), oświetlające teren; wyraźne światła nawigacyjne samolotów — [opis](RENDERER_WEBGL.md) |
| 0.30 | Domknięcie renderera: pomiar płynności w pętli gry (`tests/benchmark-browser.html`), równiejsze klatki w bitwach, cień wyspy na ziemi, iskry lawy bez przeskoków, poprawka pamięci, WebGPU jako pełnoprawny tryb — [opis](RENDERER_WEBGL.md) |
| 0.31 | Poprawka: szara plansza na mapach kampanii w WebGL/WebGPU; awaria natywnej części renderera przełącza ją na Canvas — [opis](RENDERER_WEBGL.md) |
| 0.32 | Etap E: punkt medyczny, generator osłon, plac odzysku, wóz przeciwlotniczy, dron zwiadowczy, sabotażyści, moduły koszar, fabryki i wieżyczek — [opis](ETAP_E_WSPARCIE_I_MODULY.md) |
| 0.33 | Scenariusze: tryb Ekspedycja po artefakt, ziarno mapy, kod operacji, gotowe ustawienia, czas obrony, pula punktów, złoża, fauna, pogoda — [opis](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md) |
| 0.34 | Dowódca AI w scenariuszach: gospodarka, płatna produkcja, budowa i odbudowa, obrona, przekaźniki, planowane ataki; poziomy łatwy, średni, trudny — [opis](AI_PRZECIWNIKA.md) |
| 0.34.1 | Poprawka płynności: tekstury złóż według progu i osobny napis ilości, ziarna burzy piaskowej jako cząstki PixiJS, wydobycie AI porcjami — [opis](RENDERER_WEBGL.md) |
| 0.34.2 | Poprawka zwalniania: A* zawsze wchodzi do kratki celu, przejezdność kratek liczona raz na szukanie, robot bez trasy nie szuka co klatkę i przerywa zadanie — [opis](RENDERER_WEBGL.md) |
| 0.35 | Etap F1: efekty nowych mechanik, kratery, zapowiedź burzy z kierunkiem na ekranie i minimapie — [opis](ETAP_F.md) |
| 0.36 | Etap F2: tryby Król wzgórza i Przetrwanie, długość doby, poziom startowy — [opis](ETAP_F.md) |
| 0.37 | Etap F3: drużyny 2 na 2 z sojusznikiem AI — [opis](ETAP_F.md) |
| 0.38 | Etap F4: nowe jednostki, budynki i cechy frakcji, uderzenie orbitalne, wygląd frakcji — [opis](ETAP_F.md) |
| 0.39 | Etap F5: trzecia frakcja — Rój Kryształowy, frakcja przeciwnika, nazwy stron — [opis](ETAP_F.md) |
| 0.40 | Etap F6: akt III „Przebudzenie Roju” (rozdziały VII–IX) i mapa kampanii — [opis](ETAP_F.md) |
| 0.41 | Mapa galaktyki w kampanii: układy planetarne, planety według klimatu, pierścienie, księżyce, pasy asteroid, powiązanie z listą rozdziałów — [opis](ETAP_F.md) |
| 0.41.1 | Ekran kampanii w trzech kolumnach: akty, galaktyka, wybrana planeta — [opis](ETAP_F.md) |
| 0.42 | Nowy wygląd Roju: Obsydianowi Strażnicy (czarne monolity, wariant C-A, matowy) i nazwy budynków oraz jednostek Roju — [opis](ETAP_F.md) |
| 0.42.1 | Nowy wskaźnik nadciągającej burzy: linia na krawędzi (w rogu dla kierunków ukośnych), szewrony i okrągły zegar — [opis](ETAP_F.md) |
| 0.43 | WebGL/WebGPU: objętość w świetle słońca i księżyca także dla jednostek (pojazdy z wieżą, piechota), sadza na uszkodzonych pojazdach — [opis](RENDERER_WEBGL.md) |
| 0.44 | Nowy wygląd złóż: ruda, gaz i kryształy w 6 etapach wyczerpania, światło i nocna poświata, odpryski przy wydobyciu, mocniejszy wypływ gazu przy ekstraktorze — [opis](RENDERER_WEBGL.md) |
| 0.45 | Dźwięk wyższej jakości: próbki (Kenney, CC0), muzyka na Tone.js, pogłos, dźwięk zależny od odległości, tło otoczenia i wiatr przed burzą — [opis](AUDIO.md) |
| 0.45.1 | Przełącznik jakości dźwięku (wysoka / klasyczna) i diagnostyka dźwięku w ustawieniach — [opis](AUDIO.md) |
| 0.45.2 | Tone.js wczytywany dopiero po pierwszym kliknięciu — koniec ostrzeżenia „The AudioContext was not allowed to start” — [opis](AUDIO.md) |
| 0.45.3 | Lżejszy zespół muzyczny: jeden wspólny pogłos muzyki, stary zespół usuwany zaraz po wyciszeniu — dźwięk na mapie wraca — [opis](AUDIO.md) |
| 0.46 | Gra wieloosobowa 1 na 1 (WebRTC bez serwera): kody zaproszenia, lobby z zasadami, silnik z osobną gospodarką i mgłą dla każdego gracza, synchronizacja lockstep z sumami kontrolnymi — [opis](MULTIPLAYER.md) |
| 0.46.1 | Czat — [opis](MULTIPLAYER.md) |
| 0.46.2 | Płynność gry wieloosobowej — [opis](MULTIPLAYER.md) |
| 0.47 | Wspólna pauza — [opis](MULTIPLAYER.md) |
| 0.47.1 | Panel wybranego oddziału — [opis](MULTIPLAYER.md) |
| 0.47.2 | Czat obok lobby — [opis](MULTIPLAYER.md) |
| 0.48 | Rewanż — [opis](MULTIPLAYER.md) |
| 0.49 | Handel zasobami — [opis](MULTIPLAYER.md) |
| 0.50 | Wybory z konsekwencjami — [opis](ETAP_F.md) |
| 0.51 | Styl gry AI zależny od frakcji — [opis](AI_PRZECIWNIKA.md) |
| 0.52 | Plansza 3D (eksperymentalnie) — [opis](RENDERER_3D.md) |
| 0.53 | Woda, noc i pogoda w 3D — [opis](RENDERER_3D.md) |
| 0.54 | Żywa planeta w 3D — [opis](RENDERER_3D.md) |
| 0.55 | Tabliczki, wyraźne pociski i 3D z dysku — [opis](RENDERER_3D.md) |
| 0.56 | Krajobraz 3D — [opis](RENDERER_3D.md) |
| 0.57 | Obrót kamery i prześwitujące wyspy — [opis](RENDERER_3D.md) |
| 0.58 | Złoża i teren w 3D — [opis](RENDERER_3D.md) |
| 0.59 | Czysty grunt, jakość i kamera 3D — [opis](RENDERER_3D.md) |
| 0.60 | Cele i zniszczenia w 3D — [opis](RENDERER_3D.md) |
| 0.61 | Czytelność bitwy w 3D — [opis](RENDERER_3D.md) |
| 0.62 | Pogoda 3D — [opis](RENDERER_3D.md) |
| 0.63 | Plansza 3D bez płaskich elementów 2D — [opis](RENDERER_3D.md) |
| 0.64 | Szczegółowe modele 3D — [opis](RENDERER_3D.md) |
| 0.65 | Reflektory i latarki 3D — [opis](RENDERER_3D.md) |
| 0.66 | Teren 3D: trawa i kamienie — [opis](RENDERER_3D.md) |
| 0.67 | Dokładniejsza przyroda 3D — [opis](RENDERER_3D.md) |
| 0.68 | Wraki, ruiny i wyspy 3D — [opis](RENDERER_3D.md) |
| 0.69 | Światło budynków nocą — [opis](RENDERER_3D.md) |
| 0.70 | Okna budynków — [opis](RENDERER_3D.md) |
| 0.71 | Rój w 3D — [opis](RENDERER_3D.md) |
| 0.72 | Budynki specjalne aktu III w 3D — [opis](RENDERER_3D.md) |
| 0.73 | Obiekty aktu II w 3D — [opis](RENDERER_3D.md) |
| 0.74 | Akt I w 3D — [opis](RENDERER_3D.md) |
| 0.75 | Woda, mgła i pogoda w 3D — [opis](RENDERER_3D.md) |
| 0.75.1 | Znaczniki rozkazów w 3D — [opis](RENDERER_3D.md) |
| 0.75.2 | Samoloty bez śladów, reflektory w powietrzu — [opis](RENDERER_3D.md) |
| 0.76 | Nowe modele samolotów — [opis](RENDERER_3D.md) |
| 0.77 | Dokładniejsze pojazdy naziemne — [opis](RENDERER_3D.md) |
| 0.78 | Słońce, księżyc i noc — [opis](RENDERER_3D.md) |
| 0.79 | Reflektory budynków — [opis](RENDERER_3D.md) |
| 0.79.1 | Bez ostrych snopów światła — [opis](RENDERER_3D.md) |
| 0.80 | Wszystkie światła nocy naraz — [opis](RENDERER_3D.md) |
| 0.80.1 | Strzały samolotów w powietrzu — [opis](RENDERER_3D.md) |
| 0.81 | Wybuchy — [opis](RENDERER_3D.md) |
| 0.82 | Ukształtowanie terenu — [opis](RENDERER_3D.md) |
| 0.83 | Drzewa i roślinność — [opis](RENDERER_3D.md) |
| 0.84 | Zwierzęta i ptaki — [opis](RENDERER_3D.md) |
| 0.84.1 | Tylne nogi zająca — [opis](RENDERER_3D.md) |
| 0.85 | Efekty wydobycia — [opis](RENDERER_3D.md) |
| 0.85.1 | Kosz robota górniczego — [opis](RENDERER_3D.md) |
| 0.85.2 | Krople deszczu na ziemi — [opis](RENDERER_3D.md) |
| 0.85.3 | Śnieg na terenie — [opis](RENDERER_3D.md) |
| 0.85.4 | Burza piaskowa — [opis](RENDERER_3D.md) |
| 0.86 | Mgła — [opis](RENDERER_3D.md) |
| 0.87 | Dym i ogień — [opis](RENDERER_3D.md) |
| 0.88 | Woda i ryby — [opis](RENDERER_3D.md) |
| 0.89 | Lawa i świecące jeziora — [opis](RENDERER_3D.md) |
| 0.90 | Kratery i ślady wybuchów — [opis](RENDERER_3D.md) |
| 0.91 | Pociski i trafienia — [opis](RENDERER_3D.md) |
| 0.92 | Słońce i księżyc — [opis](RENDERER_3D.md) |
| 0.93 | Gwiazdy, Droga Mleczna i zorza — [opis](RENDERER_3D.md) |
| 0.94 | Chmury, zmierzch i obce niebo — [opis](RENDERER_3D.md) |
| 0.95 | Pochylanie kamery w grze — [opis](RENDERER_3D.md) |
| 0.96 | Zachowania zwierząt — [opis](RENDERER_3D.md) |
| 0.97 | Dowódca AI w kampanii — [opis](AI_PRZECIWNIKA.md) |
| 0.98 | Żywsze misje kampanii — [opis](AI_PRZECIWNIKA.md) |
| 0.99 | Portrety i sceny łączności — [opis](KAMPANIA_OPRAWA.md) |
| 0.100 | Wybory i rozgałęzienia kampanii — [opis](KAMPANIA_OPRAWA.md) |
| 0.101 | Głos łączności — [opis](KAMPANIA_OPRAWA.md) |
| 0.102 | Styl Dominium w kampanii — [opis](AI_PRZECIWNIKA.md) |
| 0.103 | Nowa muzyka — [opis](AUDIO.md) |
| 0.104 | Odsłuch muzyki w ustawieniach — [opis](AUDIO.md) |
| 0.105 | Cztery niepokojące motywy — [opis](AUDIO.md) |
| 0.106 | Nowe intro kampanii — [opis](KAMPANIA_OPRAWA.md) |
| 0.107 | Nowy prolog aktu II — [opis](KAMPANIA_OPRAWA.md) |
| 0.108 | Sceny łączności i prolog aktu III — [opis](KAMPANIA_OPRAWA.md) |
| 0.109 | Filmowe zakończenia aktów — [opis](KAMPANIA_OPRAWA.md) |
| 0.110 | Ekrany zwycięstwa i porażki — [opis](KAMPANIA_OPRAWA.md) |
| 0.111 | Ekran ładowania — [opis](KAMPANIA_OPRAWA.md) |
| 0.112 | Menu główne w stylu filmów — [opis](KAMPANIA_OPRAWA.md) |
| 0.113 | Pauza taktyczna — [opis](KAMPANIA_OPRAWA.md) |
| 0.114 | Ekrany menu jako panele taktyczne — [opis](KAMPANIA_OPRAWA.md) |
| 0.115 | Interfejs gry w stylu pokładu dowodzenia — [opis](KAMPANIA_OPRAWA.md) |
| 0.116 | Nowe drzewo rozwoju — [opis](KAMPANIA_OPRAWA.md) |
| 0.117 | Nowy panel badań — [opis](KAMPANIA_OPRAWA.md) |
| 0.118 | Nowa mapa galaktyki w kampanii — [opis](KAMPANIA_OPRAWA.md) |
| 0.119 | Odblokowanie kampanii do testów — [opis](KAMPANIA_OPRAWA.md) |
| 0.120 | Prologi i sceny łączności na pełnym ekranie — [opis](KAMPANIA_OPRAWA.md) |
| 0.121 | Mapa galaktyki na pełnym ekranie — [opis](KAMPANIA_OPRAWA.md) |
| 0.122 | Wybór rozdziału z podglądem zamiast mapy galaktyki — [opis](KAMPANIA_OPRAWA.md) |
| 0.123 | Płynna gra sieciowa u gospodarza — [opis](MULTIPLAYER.md) |
| 0.124 | Wieczna noc — [opis](ETAP_F.md) |
| 0.125 | Kinowy obraz planszy 3D: okluzja otoczenia, poświata, tony ACES, gradacja, odbicia nieba, ostrzejsze cienie — [opis](RENDERER_3D.md) |
| 0.126 | Teren PBR w 3D: materiały gruntu według nachylenia, wysokości i planety, skała w trzech płaszczyznach, rzeźba w świetle — [opis](RENDERER_3D.md) |
| 0.127 | Atmosfera i woda w 3D: odbicia w jeziorach, mgła wysokościowa i perspektywa powietrzna, smugi światła słońca, jaśniejsza piana — [opis](RENDERER_3D.md) |
| 0.127.1 | Czystsze burze w 3D: kolory pogody w obrazie HDR, delikatniejsze ziarna piasku, bez snopów słońca w gęstej burzy — [opis](RENDERER_3D.md) |
| 0.128 | Detale modeli 3D: płyty pancerza, starte krawędzie, kurz planety, zacieki — [opis](RENDERER_3D.md) |
| 0.129 | Mgła wojny dla dowódcy AI: własne widzenie, pamięć wywiadu, zwiad — [opis](AI_PRZECIWNIKA.md) |
| 0.129.1 | Bez białych kresek o świcie i zmierzchu: snopy słońca zastąpione smugami w obrazie, z góry niewidoczne — [opis](RENDERER_3D.md) |
| 0.129.2 | Ostre napisy celów kampanii w 3D: etykiety znaczników na ekranie nad celem zamiast na terenie — [opis](RENDERER_3D.md) |
| 0.129.3 | Flaga punktu zbiórki w 3D: maszt z falującą płachtą zamiast płaskiej flagi na ziemi — [opis](RENDERER_3D.md) |
| 0.129.4 | Wszystkie napisy nakładki w 3D na ekranie: artefakt, szczyt, uderzenie orbitalne, koszt muru — [opis](RENDERER_3D.md) |
| 0.129.5 | Karty paska dowodzenia: efekt najechania w obrysie karty, krawędź po zaokrągleniach — [opis](KAMPANIA_OPRAWA.md) |
| 0.130 | Bitwa na orbicie I: mapa „Orbita Kharona”, statki z osłonami, stacje, flota AI, kosmos w 2D i 3D — [opis](BITWA_NA_ORBICIE.md) |
| 0.131 | Bitwa na orbicie II: platformy stacji, mgławice (osłona, brak odnawiania osłon), osłona asteroid — [opis](BITWA_NA_ORBICIE.md) |
| 0.131.1 | Raport zwycięstwa i porażki bez pasków przewijania, liczby w jednym rzędzie — [opis](KAMPANIA_OPRAWA.md) |
| 0.132 | Bitwa na orbicie III: boje przekaźnikowe, kosmiczne surowce, smugi silników, lasery, pył, pierścienie planety — [opis](BITWA_NA_ORBICIE.md) |
| 0.132.1 | Dron górniczy na orbicie (model 3D i 2D, wiązka górnicza), bez śladów gąsienic w kosmosie, gazowy olbrzym na ekranie ładowania — [opis](BITWA_NA_ORBICIE.md) |
| 0.133 | Kosmos jak z filmu: przezroczysta płaszczyzna bitwy, gazowy olbrzym 3D z pierścieniami i księżycem pod bitwą, sfera gwiazd, Drogi Mlecznej i mgławic — [opis](BITWA_NA_ORBICIE.md) |
| 0.133.1 | Smugi silników jako ciągła, miękka wstęga zamiast przerywanych odcinków — [opis](BITWA_NA_ORBICIE.md) |
| 0.134 | Głębia, światło i walka w kosmosie: warstwy pod bitwą, konwoje, wrak stacji, poświata planety, iluminatory, flara, bąble osłon, wybuchy w próżni, wraki, zorze, linie wysokości — [opis](BITWA_NA_ORBICIE.md) |
| 0.135 | Głębia ostrości (tilt-shift) w kosmosie z przełącznikiem w ustawieniach, anamorficzne smugi wybuchów — [opis](BITWA_NA_ORBICIE.md) |
| 0.135.1 | Linie wysokości statków jako cienkie linie zamiast świecących „kołków” — [opis](BITWA_NA_ORBICIE.md) |
| 0.135.2 | Rozpad zniszczonych statków na dwie połowy i odłamki — [opis](BITWA_NA_ORBICIE.md) |
| 0.135.3 | Rozpad zniszczonych stacji w kosmosie (wolniej, więcej odłamków) — [opis](BITWA_NA_ORBICIE.md) |
| 0.136 | Lotniskowiec z myśliwcami pokładowymi; statki strzelają do celów latających — [opis](BITWA_NA_ORBICIE.md) |
| 0.137 | Realistyczny ogień i wybuchy: kula ognia z barwą żaru i sadzą, grona wybuchów, iskry-smugi, płonące odłamki, dym podświetlony ogniem — [opis](RENDERER_3D.md) |
| 0.138 | Ogień płonących budynków: stałe ogniska, nowy kształt płomienia, iskry, dym podświetlony ogniem, światło w dzień; strugi ognia w kosmosie — [opis](RENDERER_3D.md) |
| 0.138.1 | Miękkie cząstki pogody: kurtyny pyłu, mgły i deszczu bez ostrych linii przy terenie — [opis](RENDERER_3D.md) |
| 0.138.2 | Zamieć: płatki i smugi śniegu z wiatrem, kurtyny zadymki, śnieg zmiatany przy ziemi, porywy — [opis](RENDERER_3D.md) |
| 0.138.3 | Pogoda na modelach: śnieg, piasek i mokrość na pojazdach, piechocie, budynkach i zwierzętach — [opis](RENDERER_3D.md) |
| 0.139 | Otoczenie orbity: wolumetryczne mgławice, lód z pierścieni, kometa, drony naprawcze — [opis](BITWA_NA_ORBICIE.md) |
| 0.140 | Burza jonowa: pogoda kosmiczna z prognozą, celność, osłony bez odnawiania, kurtyny plazmy — [opis](BITWA_NA_ORBICIE.md) |
| 0.141 | Piraci: kryjówki, załogi, najazdy na gracza i AI, nagrody — [opis](BITWA_NA_ORBICIE.md) |
| 0.141.1 | Napędy pod stacjami: płomienie dysz i poświata spod platformy — [opis](BITWA_NA_ORBICIE.md) |
| 0.141.2 | Silniki pod gondolami ramion dokujących stacji — [opis](BITWA_NA_ORBICIE.md) |
| 0.142 | Burza słoneczna i deszcz asteroid na zmianę z jonową; badanie osłon przeciwmeteorytowych — [opis](BITWA_NA_ORBICIE.md) |
| 0.142.1 | Ostrzeżenia burz w kosmosie opisują ich skutki, bez wzmianki o ruchu — [opis](BITWA_NA_ORBICIE.md) |
| 0.142.2 | Łagodniejsza głębia ostrości w kosmosie — [opis](BITWA_NA_ORBICIE.md) |
| 0.143 | Trzy nowe mapy w kosmosie: Pierścienie Glacjalis, Wrota Pustki, Cmentarzysko Floty — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.1 | Nowy model wraków okrętów na Cmentarzysku Floty; wraki nie obracają się — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.2 | Czarna dziura Erebus w stylu Gargantui — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.3 | Lodowy olbrzym Glacjalis przewrócony jak Uran, z otwartymi pierścieniami — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.4 | Wulkaniczny księżyc Pyros jak Io, z pióropuszami wulkanów — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.5 | Większy Pyros, delikatniejsze pióropusze — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.6 | Pyros w pierwotnej wielkości, bez pióropuszy — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.7 | Nowe modele złóż w kosmosie: mgławica, asteroida rudy, kryształy — [opis](BITWA_NA_ORBICIE.md) |
| 0.143.8 | Przekaźnik w kosmosie jako satelita przekaźnikowy — [opis](BITWA_NA_ORBICIE.md) |
| 0.144 | Efekty walki: falowanie powietrza, wstrząs kamery, błysk wybuchu, stopnie uszkodzeń, przylot z nadprzestrzeni — [opis](RENDERER_3D.md) |
| 0.144.1 | Kosmos w ruchu: dopalacze, pył rozstępujący się przed statkami, trafienia w kadłub, animowane planety — [opis](RENDERER_3D.md) |
| 0.144.2 | Żywe planety: roślinność reagująca na ruch, kurz spod pojazdów, mgła wojny, świt i zmierzch — [opis](RENDERER_3D.md) |
| 0.144.3 | Hologramy dowodzenia: zaznaczenie, linie i znaczniki rozkazów, celownik ataku, wiązki i rozbłysk przekaźnika — [opis](RENDERER_3D.md) |
| 0.145 | Muzyka kosmosu: cztery motywy w duchu „Interstellar” — [opis](AUDIO.md) |
| 0.146 | WAL-01: skały blokują ostrzał bezpośredni; wybór celu na czystej linii, obchodzenie skały przy rozkazie ataku — [opis](#wal-01--skały-blokujące-ostrzał) |
| 0.147 | Centrum III — Twierdza i doktryny frakcji (po dwie, wybór ostateczny) — [opis](POZIOMY_CENTRUM.md) |
| 0.147.1 | Jaśniejsze noce na mapach naziemnych, przejrzystsze burze piaskowe — [opis](RENDERER_3D.md) |
| 0.147.2 | Przejrzystsza śnieżyca i ulewa — [opis](RENDERER_3D.md) |
| 0.147.3 | Jaśniejsze noce na mapach lodowych — [opis](RENDERER_3D.md) |
| 0.147.4 | Czytelne noce na mapach popielnych; bez cieni chmur w świetle księżyca — [opis](RENDERER_3D.md) |
| 0.147.5 | Jaśniejsze noce na mapach pustynnych — [opis](RENDERER_3D.md) |
| 0.147.6 | Czytelne noce na mapach magmowych — [opis](RENDERER_3D.md) |
| 0.147.7 | Noce w kampanii sprawdzone; czytelny nocą Świetlisty Gąszcz — [opis](RENDERER_3D.md) |
| 0.147.8 | Dyskretne zaznaczenie jednostek: bez kolumny światła, delikatniejszy pierścień — [opis](RENDERER_3D.md) |
| 0.147.9 | Delikatniejsze paski życia w widoku 3D — [opis](RENDERER_3D.md) |
| 0.148 | DOW-01: rozkazy patrolu i eskorty — [opis](ETAP_B_ARMIA_I_BAZA.md) |
| 0.149 | Zwarty interfejs bitwy: plansza na całą szerokość, szuflada celów nad mapą, niższe paski — [opis](KAMPANIA_OPRAWA.md) |
| 0.149.1 | Małe kafle produkcji z oknem informacji po najechaniu — [opis](KAMPANIA_OPRAWA.md) |
| 0.149.2 | Kafle produkcji w jednym, wyższym rzędzie — [opis](KAMPANIA_OPRAWA.md) |
| 0.149.3 | Odstęp przy stronicowaniu kafli produkcji — [opis](KAMPANIA_OPRAWA.md) |
| 0.149.4 | Równe strzałki stronicowania — [opis](KAMPANIA_OPRAWA.md) |
| 0.150 | Etap G1: AI używa Twierdzy, doktryn, patroli i eskorty; symulacje `tools/ai-sim.js` — [opis](AI_PRZECIWNIKA.md) |
| 0.150.1 | Jednakowe kafle produkcji we wszystkich zakładkach — [opis](KAMPANIA_OPRAWA.md) |
| 0.150.2 | Szersze kafle produkcji — [opis](KAMPANIA_OPRAWA.md) |
| 0.151 | Etap G3: aplikacja Electron, instalator Windows, eksport i import zapisów — [opis](APLIKACJA.md) |
| 0.151.1 | Pasek ładowania animowany w wątku kompozytora — bez zamrożenia przy budowie mapy — [opis](KAMPANIA_OPRAWA.md) |
| 0.151.2 | Okna potwierdzenia w stylu gry (doktryna, import zapisów) — [opis](KAMPANIA_OPRAWA.md) |
| 0.151.3 | Każde złoże do wykorzystania: złoża gazu w przeszkodach lub przy innych złożach przesuwane na wolne miejsce — [opis](MAPY_TEMATYCZNE.md) |
| 0.152 | Etap G2: desant z orbity — tryb „Inwazja” (orbita, potem planeta; kapsuły, uderzenie i skan z orbity) — [opis](DESANT_Z_ORBITY.md) |
| 0.152.1 | Szuflada celów bez poziomego przewijania, ukryta pod raportem końca — [opis](KAMPANIA_OPRAWA.md) |
| 0.153 | Etap G4: serwer lobby, lista gier, 2 na 2 przez sieć z komputerem na wolnym miejscu, powrót do bitwy po zerwaniu połączenia — [opis](MULTIPLAYER.md) |
| 0.171.17 | Testy i narzędzia: test renderera 3D krok po kroku z postępem, podgląd burz z listą skryptów z `index.html`, testy `weatherCloseness`, `closestTo`, listy reguł i ścieżek serwera — [opis](RENDERER_3D.md) |
| 0.171.16 | Poprawki gry sieciowej z przeglądu: wykrywanie martwych połączeń, powrót przy starym połączeniu i bez zamrażania innych, pierwsze miejsce dla gracza, wersja gry w połączeniu, tekst z serwera, Origin i maska WebSocket, serwer bez `.git`, chwilowe rozłączenia, atomowy import, dokładniejsza suma kontrolna — [opis](MULTIPLAYER.md) |
| 0.171.15 | Poprawki grafiki 3D z przeglądu: nakładka po zmianie rozmiaru, rozrzut pod budynkami bez zacięć, zwalnianie zasobów przy zmianie mapy, rzadsze odbudowy środowiska, mniej alokacji, bez pustego światła i martwego kodu kafli — [opis](RENDERER_3D.md) |
| 0.171.14 | Poprawki dźwięku z przeglądu: osobne głosy mowy, jedna linia naraz, głosy Vok i Bramy, wyciszanie przy zmianie motywu, wstrzymanie dźwięku i filmu poza oknem, wznawianie motywu bitwy, muzyka powtórki epilogu, szybsze wejście bitwy, bas, obcięcie szczytów, bufor szumu, pule głosów, jakość „klasyczna” — [opis](AUDIO.md) |
| 0.171.13 | Poprawki interfejsu z przeglądu: klawisze przy oknach i polach, populacja gracza w HUD-zie, import zapisów, fokus w panelu handlu, okna potwierdzenia, progi kompaktowego HUD-u, mniej pracy na klatkę, jedna wersja gry — [opis](MENU_GLOWNE.md) |
| 0.171.12 | Poprawki kampanii z przeglądu: kapsuły X → XI, decyzja „stocznia”, losy techników Hefajstosa, propozycja Varna, nazwy w akcie IV, odprawa XIV, prolog aktu II, barwy Dominium, licznik Szczytu, teksty i język — [opis](AKT_IV.md) |
| 0.171.11 | Poprawki rozgrywki z przeglądu: atak z marszem po pościgu, reguła opancerzenia (rakiety, piechota, działo przeciwpancerne), odbudowa robotników i ruda komputera, przekaźniki strony w 2 na 2, zabójstwa, pamięć widoku komputera w zapisie — [opis](AI_PRZECIWNIKA.md) |
| 0.171.10 | Z przeglądu gry: serwer lobby odporny na złe wiadomości i przejęcie gospodarza, decyzja fabularna blokuje wznowienie bitwy, wskazywanie terenu w 3D marszem po mapie wysokości — [opis](MULTIPLAYER.md) |
| 0.171.9 | Głosy w prologach aktów II–IV (Lira, Tessa, Varn wg decyzji, Vok), płynniejsze przejścia muzyki, poprawione ujęcia; bez `intro:20` — [opis](KAMPANIA_OPRAWA.md) |
| 0.171.8 | Testy grafiki 3D: burze z bliska, kosmos, niebo nad horyzontem, błędy shaderów; podgląd `tests/weather-browser.html`; `closestTo` w `app.js` dla zdarzeń bez elementu — [opis](RENDERER_3D.md) |
| 0.171.7 | Kosmos i pogoda 3D: nasycone mgławice nieba, przerwy w Szkarłatnej Mgławicy, siatka gaśnie pod chmurami, końce spirali gazu; zasłony burz rzedną od średniego przybliżenia, pogoda ciemnieje nocą, słabsze snopy budynków z bliska, wspólna funkcja zbliżenia — [opis](RENDERER_3D.md) |
| 0.171.6 | Mgławice nieba w kosmosie: zawinięty szum z jasnym sercem i pasmami pyłu nad horyzontem; przestrzenne mgławice w trzech ramionach, dryfujące, bez uciętych brzegów — [opis](RENDERER_3D.md) |
| 0.171.5 | Miękkie chmury mgławicy przy złożach gazu: obłoki z okrągłą maską i włóknami, dryfujące warstwy; płaty i pasma pyłu na tle 2D — [opis](RENDERER_3D.md) |
| 0.171.4 | Miękkie chmury gazu przy złożach w kosmosie (kłęby gasną ku krawędziom, świecą addytywnie) — [opis](RENDERER_3D.md) |
| 0.171.3 | Snopy reflektorów w deszczu i piasku bez świetlnych klinów na przybliżeniu: miękko przy gruncie, słabsze przy bliskiej kamerze — [opis](RENDERER_3D.md) |
| 0.171.2 | Wyraźniejszy obraz w burzy na przybliżeniu: zasłony, smugi i mgła rzedną, mgła odsuwa się przy bliskiej kamerze — [opis](RENDERER_3D.md) |
| 0.171.1 | Zaznaczenie budynków bez kolumny światła (biała kropkowana elipsa nad budynkiem) — [opis](RENDERER_3D.md) |
| 0.171 | Nowe prologi aktów II–IV: po 8 ujęć, 76 s, historie prowadzące do pierwszego rozdziału aktu, akty III–IV zależne od decyzji; własna muzyka `prologue2`–`prologue4` (`act2-film.js`, `act3-film.js`, `act4-film.js`, `audio.js`, `menu.js`) — [opis](KAMPANIA_OPRAWA.md) |
| 0.170 | Nowy film finału kampanii: 13 ujęć, 122 s, co stało się po wojnie, zależnie od decyzji; dłuższa muzyka `finale` (`campaign-finale.js`, `audio.js`, `menu.js`) — [opis](AKT_IV.md) |
| 0.169 | Nowy prolog kampanii: 15 ujęć, 150 s, historia prowadząca do aktu I, głos Liry, muzyka `prologue` (`campaign-film.js`, `audio.js`, `menu.js`) — [opis](KAMPANIA_OPRAWA.md) |
| 0.168.6 | Kampania: szkolenie na początku aktu I, zaraz po intro (`menu.js`) — [opis](MENU_GLOWNE.md) |
| 0.168.5 | Intro kampanii tylko przy pierwszym wejściu (zapamiętane), przycisk „Intro kampanii” przy akcie I (`menu.js`) — [opis](MENU_GLOWNE.md) |
| 0.168.4 | Nowa muzyka intro: otwarcie w stylu „Interstellar”, 30 s i 20 s pod prologi aktów (`audio.js`, `menu.js`) — [opis](AUDIO.md) |
| 0.168.3 | Muzyka finału kampanii: motyw zwycięstwa w stylu „Interstellar” zsynchronizowany z filmem (`audio.js`, `menu.js`) — [opis](AUDIO.md) |
| 0.168.2 | Menu: wszystkie listy wyboru w jednym stylu — własna strzałka, ciemne opcje, podświetlenie, pola zablokowane (`menu.css`) |
| 0.168.1 | Odprawa: lista poziomu trudności kampanii w stylu pozostałych pól menu (`menu.css`) |
| 0.168 | Muzyka pozostałych map: Wydmy, Szron, Szczyty, Oaza, Sygnał, Konwój; Szkolenie — Latarnie (`audio.js`, `app.js`) — [opis](AUDIO.md) |
| 0.167.4 | Muzyka Bastionu Admiralicji: sygnał trąbki, ostinato smyczków, dalekie działa — [opis](AUDIO.md) |
| 0.167.3 | Muzyka Ruin Nadiru: echo murów, gong cytadeli, rytualny bęben — [opis](AUDIO.md) |
| 0.167.2 | Muzyka Lodowego Archiwum: pozytywka i pękający lód zamiast dzwonków — [opis](AUDIO.md) |
| 0.167.1 | Muzyka doliny Eos: Latarnie (Dolina Latarni, I) i Popioły (Wypalona Dolina, XI) — [opis](AUDIO.md) |
| 0.167 | Muzyka nowych map: 8 motywów (`audio.js`), wybór według mapy pod rozdziałem (`app.js`), odsłuch w ustawieniach — [opis](AUDIO.md) |
| 0.166.2 | Balans rozdziału XIII (kapsuły, armia i wieże Vok, koniec uderzeń po desancie na łatwym i średnim, cel dodatkowy według poziomu); bot symulatora atakuje centrum po rozbiciu obrońców — [opis](AKT_IV.md) |
| 0.166.1 | Panel boczny (zakładki Cele, Logistyka, Kolejki, Oddział): cienki pasek przewijania jak w oknach menu (`hud-compact.css`) |
| 0.166 | Mapy, krok M5: przypływy na Archipelagu Thalassy, pękający lód na Lodowym Archiwum, Szlak Komet (`world-rules.js`, `world-art.js`, `webgl3d/world-3d.js`) — plan M1–M5 zakończony — [opis](MAPY_TEMATYCZNE.md) |
| 0.165 | Mapy, krok M4: motywy `ocean` i `crystal` (`world-art.js`, woda `sea`, przeszkoda `crystal`, 2D i 3D), Archipelag Thalassy i Kryształowe Grzbiety (XIII); siatka akwenów w silniku — [opis](MAPY_TEMATYCZNE.md) |
| 0.164 | Mapy, krok M3: Doki Eos (X, przeszkoda `dock`, planeta `desert`) i Szkarłatna Mgławica (własne obłoki `nebulae`); poprawka miejsca załogi piratów — [opis](MAPY_TEMATYCZNE.md) |
| 0.163 | Mapy, krok M2: Wypalona Dolina (XI) i Bastion Admiralicji (XII) w `campaign-maps.js`, także jako scenariusze; symulacja balansu aktu IV — [opis](MAPY_TEMATYCZNE.md) |
| 0.162 | Mapy, krok M1: Dolina Latarni, Lodowe Archiwum i Ruiny Nadiru (`campaign-maps.js`) dla rozdziałów I–III i scenariuszy; stałe bazy w rozdziałach — [opis](MAPY_TEMATYCZNE.md) |
| 0.161 | Film finału kampanii po zwycięstwie w XIV (`campaign-finale.js`), zależny od decyzji; przycisk „Finał kampanii” na ekranie kampanii — [opis](AKT_IV.md) |
| 0.160.1 | Bez fauny lądowej na mapach kosmicznych w trybach Canvas i WebGL (`space-rules.js`: `wildlife()`) — [opis](BITWA_NA_ORBICIE.md) |
| 0.160 | Akt IV, krok H7: symulacje balansu (`tools/act4-sim.js`), strojenie rozdziałów X–XIV według poziomu, testy — akt ukończony — [opis](AKT_IV.md) |
| 0.159 | Akt IV, krok H6: finał XIV (szczeliny, Brama, sojusznicy z decyzji), prolog i epilog aktu IV — [opis](AKT_IV.md) |
| 0.158 | Akt IV, krok H5: rozdział XIII (odwrócona inwazja na Białym Przesmyku, szczeliny, decyzja rozejm/klęska) — [opis](AKT_IV.md) |
| 0.157.2 | Pole „Adres serwera” w stylu pozostałych pól tekstowych (`netplay-menu.js`, `menu.css`) |
| 0.157.1 | Pokój gry sieciowej: przyciski miejsca w osobnym wierszu kafelka (`netplay-menu.js`, `menu.css`) |
| 0.157 | Akt IV, krok H4: rozdział XII (konwój do uplinku, Twierdza, Wartownicy, decyzja garnizon/stocznia); dowódca AI w aktach IV — [opis](AKT_IV.md) |
| 0.156.2 | Raport końca przewija się z widocznym paskiem (`style.css`, `.end-report`) |
| 0.156.1 | Kursor gry widoczny nad oknami modalnymi (doktryny, statystyki, drzewo rozwoju) — `cursor.js` |
| 0.156 | Akt IV, kroki H1–H2: rozdziały X–XIV na liście kampanii, X (Blokada Eos) i XI (Kapsuły nad Eos) pełne, wynik orbity X → kapsuły XI — [opis](AKT_IV.md) |
| 0.155.1 | Czytelność map w kosmosie: spokojniejsze tło, ciemna warstwa pod polem bitwy, świecące paski stron statków — [opis](BITWA_NA_ORBICIE.md) |
| 0.155 | Inwazja i tryby scenariuszy w grze sieciowej (przez kody i przez serwer), Obrona i Przetrwanie w kooperacji — [opis](MULTIPLAYER.md) |
| 0.154 | Akt IV, krok H3: Wartownicy Otchłani — czwarta frakcja (reguły, umiejętności, teleporty, scalanie, mobilny Rdzeń, grafika 2D i 3D, efekty, AI, baza wiedzy, balans) — [opis](AKT_IV.md) |

Wersja 0.7 nie ma osobnych notatek w dokumentacji.

## Aktualizowanie planu

Przy kolejnych rozmowach dopisujemy propozycje tutaj lub do listy pomysłów. Rozróżniamy statusy: propozycja, zatwierdzone, w realizacji, zrealizowane, odłożone. Po implementacji: wiersz w historii wersji, aktualizacja mapy dokumentacji i README, pełny `npm test`. Nie nadajemy numeru przyszłej wersji ani terminu przed ustaleniem zakresu. Sam wpis w planie nie oznacza zlecenia realizacji.

---

## Archiwum: wcześniejsze ustalenia i specyfikacje

Poniższe sekcje zachowano jako historię decyzji. Opisy statusu w nich nie zastępują tabel powyżej.

### Ustalenia ogólne

- Propozycje rozwoju zapisujemy w plikach projektu i aktualizujemy wraz z kolejnymi decyzjami.
- Przebudowa AI została odłożona na życzenie użytkownika (2026-09-20), a wdrożona w 0.34 (2026-09-27) — [opis](AI_PRZECIWNIKA.md).
- Tryb 3D odłożony na życzenie użytkownika (2026-09-20); później wdrożony jako renderer Three.js w 0.52–0.96 — [opis](RENDERER_3D.md).
- Kierunek gospodarki i rozwoju bazy opisano w [GOSPODARKA_I_ROZWOJ.md](GOSPODARKA_I_ROZWOJ.md); menu w [MENU_GLOWNE.md](MENU_GLOWNE.md).

### Walka i teren

Cel: zwiększyć znaczenie ustawienia oddziałów bez przebudowy strategicznego AI.

#### WAL-01 — Skały blokujące ostrzał

Status: zrealizowane w 0.146.

Realizacja (`engine.js`): `lineOfFire(strzelec, cel)` — odcinek przecinający prostokąt skały (`crossesRect`, przeszkody bez rodzaju lub `rock`, `outcrop`, `spire`, `mesa`, zwężone o 12 z każdej strony) blokuje strzał; bez blokady: artyleria i granatnicy (ogień łukiem), strzelec lub cel latający, inne przeszkody (wraki, ruiny, gaje; asteroidy i wraki w kosmosie). Wybór celu: cel za skałą liczy się jak 400 dalej; cel zasłonięty porzucany (poza rozkazem ataku). W zasięgu, ale za skałą — bez strzału; z rozkazem ataku jednostka idzie do celu (ścieżka omija skałę) i przy ścięciu narożnika ślizga się wzdłuż przeszkody; komunikat dla gracza raz na 8 s. Testy: `tests/line-of-fire.test.js` (cel za skałą bez obrażeń, obejście i ostrzał, to samo dla przeciwnika, wyjątki i muśnięcie krawędzi, wybór celu na czystej linii).

Pierwotna specyfikacja:

- Przed oddaniem strzału sprawdzamy odcinek między strzelcem a celem.
- Skały blokują broń bezpośrednią obu stron; sam zasięg przestaje wystarczać.
- Jednostka z rozkazem ataku może szukać miejsca z czystą linią strzału. Nie powinna bez końca strzelać w przeszkodę ani utknąć bez informacji dla gracza.
- Blokowanie pocisków i odsłanianie mgły wojny pozostają odrębnymi zasadami.

Kryteria odbioru: cel za skałą nie otrzymuje obrażeń; po obejściu skały ostrzał działa; zachowanie jest takie samo dla gracza i przeciwnika.

#### WAL-02 — Osłony dla piechoty

Status: zrealizowane w 0.10 w uproszczonym wariancie.

- Skały, mury i zamknięte bramy zapewniają piechocie oraz rakietowcom 30% redukcji obrażeń od broni dystansowej.
- Łuk nad jednostką oraz opis zaznaczenia pokazują aktywną osłonę.
- Premia jest niekierunkowa i nie kumuluje się przy nakładaniu obszarów.

#### WAL-03 — Utrzymywanie pozycji

Status: zrealizowane w 0.10.

- Nowy rozkaz pozwala strzelać do dostępnych celów bez ruszania w pościg.
- Gracz widzi aktywny tryb jednostki; zwykły rozkaz ruchu lub ataku wyłącza utrzymywanie pozycji.
- Tryb jest zachowywany w zapisie gry.

#### JED-01 — Artyleria oblężnicza

Status: zrealizowane w 0.9.

Artyleria ma zasięg 420, wolny ostrzał i obrażenia obszarowe w promieniu 75. Bezpośrednie trafienie poniżej 100 jednostek zadaje 25% siły, dlatego wymaga eskorty. Produkuje ją fabryka za 340 metalu.

### Pakiet gospodarczy 0.6

Wdrożono GOS-01, gaz z GOS-04, wybór bezczynnych robotów i pierwsze badanie ładowności (30 → 60). Badanie wymaga magazynu, 150 metalu i 50 gazu. Szczegóły obsługi i migracji są w README.

### Nowy scenariusz: Słoneczna Dolina — Helion II

Czwarta samodzielna operacja, dostępna w Gra jednoosobowa → Scenariusze. Jasny, złoty teren, słońce z poświatą i promieniami, bez opadów. Własny układ sześciu skalistych grzbietów i trzech oaz; przesunięte bazy i zasoby. Cel: zniszczenie centrum Dominium. Zapis i odczyt zachowują nową mapę.

### Muzyka — rozbudowa aranżacji (22.09.2026)

Wdrożono osiem syntetycznych barw: akordowe tło, bas, arpeggio, melodię prowadzącą, dzwonki, stopę, werbel i hi-hat. Cztery motywy mają osobne tempo i progresje; menu stopniowo wprowadza perkusję. Dodano panoramę stereo, filtrowanie barw, obwiednie głośności i subtelne echo. Nuty są planowane według zegara audio, bez dawnej przerwy między pętlami. Nawigacja menu zachowuje muzykę, a efekty walki mają oddzielny limit głosów.

Weryfikacja: 68 testów automatycznych; strona tests/music-browser.html renderuje po 32 sekundy każdego motywu w prawdziwym Web Audio i sprawdza sygnał stereo oraz przesterowanie. Zawiera też przyciski odsłuchu czterech motywów.

### Pogoda, doba, fauna i muzyka — 22.09.2026

- Wspólny system pogody symulacji i grafiki: śnieżyca na Nivalis, burza piaskowa na Khepri i Helionie, ulewa z lokalnymi błyskawicami i grzmotem na Vulkanie. Pierwsze zjawisko po 90 s, następne co 210 s; trwa 55 s z płynnym nasileniem.
- Kary szczytowe dla obu armii: 35% spowolnienia (także roboty), 30% szansy chybienia przy ostrzale. Chybiona artyleria nie zadaje obrażeń obszarowych. Walka wręcz bez kary celności.
- Laboratorium: Monitoring pogody (160 metalu/30 gazu/25 kryształów, 25 s), Celowanie adaptacyjne (240/60/50, 35 s), Napędy terenowe (200/50/35, 30 s). Monitoring wymaga istniejącego ukończonego laboratorium i daje prognozę oraz jednokrotny alarm 30 s przed zjawiskiem. Pozostałe badania redukują odpowiadającą im karę o 75% (maks. spowolnienie 8,75%, chybienia 7,5%).
- Doba 360 s: łagodne przejścia, słońce za dnia, księżyc i gwiazdy nocą. Jednostki mają kierunkowe światła, budynki małe lampy. Światła nie odsłaniają mgły wojny.
- Ptaki latają nad mapą, ryby pływają w granicach zbiorników. Dekoracyjna fauna nie jest celem walki; istniejące drapieżniki zachowują dotychczasowe zachowanie.
- Pięć różnych aranżacji: menu (smyczki syntezatorowe i instrument dęty, sześciomiarowa fraza), Nivalis (rzadkie dzwonki i ambient bez perkusji), Khepri (pentatoniczne szarpane dźwięki i synkopowana perkusja), Vulkan (industrialny puls 112 BPM), Helion (jasne akordy durowe i melodia w sześciomiarowej frazie).
- Czas doby i pogody oraz nowe badania zachowują się po zapisaniu/wczytaniu. Alerty nie powtarzają się przy wczytaniu tej samej prognozy.
