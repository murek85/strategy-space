# Plan rozwoju prototypu

Aktualizacja: 2026-09-28. Aktualna wersja: 0.46.

Ten plik jest punktem wejścia do dokumentacji: opisuje bieżący stan, otwarte kierunki i historię wersji. Instrukcja gry i sterowanie: [README](../README.md).

## Stan projektu

Ukończone etapy z [Kierunków rozwoju](KIERUNKI_ROZWOJU.md): **A — Rozwój kolonii**, **B — Armia i baza**, **D — Oprawa** oraz **C — akt II kampanii (0.17), tryby scenariuszy i rozmiary map (0.18)**. Przebudowa AI wdrożona w 0.34 (dowódca AI scenariuszy); tryb 3D pozostaje odłożony.

Gra zawiera dwie frakcje, osiem map scenariuszy dla 2–4 uczestników w trzech trybach (Podbój, Utrzymanie przekaźników, Obrona) i trzech rozmiarach, kampanię w dwóch aktach (sześć rozdziałów) i misję szkoleniową. Gospodarka obejmuje metal, gaz, kryształy, bilans mocy z akumulatorem oraz roboty budujące i wydobywające. Rozwój: dwa poziomy centrum i drzewo rozwoju (F2). Armia: piechota, rakietowcy, czołgi, zwiadowca/bastion frakcji, ciężka maszyna, artyleria, transporter i lotnictwo. Przeciwnik nadal działa systemem fal, bez własnej gospodarki.

## Mapa dokumentacji

| Dokument | Rodzaj | Status |
|---|---|---|
| [Kierunki rozwoju](KIERUNKI_ROZWOJU.md) | Koncepcja etapów A–D | A, B, C, D ukończone; poziom III i doktryny — propozycje |
| [Etap A — Rozwój kolonii](ETAP_A_ROZWOJ_KOLONII.md) | Opis wdrożenia | Ukończony 2026-09-24 |
| ↳ [Drzewo rozwoju](DRZEWO_ROZWOJU.md), [Panel gospodarki](PANEL_GOSPODARKI.md), [Poziomy centrum](POZIOMY_CENTRUM.md), [Akumulator](AKUMULATOR_ENERGII.md), [Warsztat](WARSZTAT_POLOWY.md) | Podetapy A | Wdrożone |
| [Etap B — Armia i baza](ETAP_B_ARMIA_I_BAZA.md) | Opis wdrożenia | Ukończony, wersja 0.15 |
| [Etap D — Oprawa](ETAP_D_OPRAWA.md) | Opis wdrożenia i pomiary | Ukończony, wersja 0.16 |
| [Etap C — Akt II kampanii](ETAP_C_DRUGI_AKT.md) | Opis wdrożenia | Ukończony, wersja 0.17 |
| [Etap C — Tryby i rozmiary map](ETAP_C_TRYBY_I_MAPY.md) | Opis wdrożenia | Ukończony, wersja 0.18 |
| [Etap E — Wsparcie i moduły](ETAP_E_WSPARCIE_I_MODULY.md) | Opis wdrożenia | Ukończony, wersja 0.32 |
| [Scenariusze: Ekspedycja, ziarno, ustawienia](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md) | Opis wdrożenia | Ukończone, wersja 0.33 |
| [AI przeciwnika](AI_PRZECIWNIKA.md) | Opis wdrożenia i symulacje | Ukończone, wersja 0.34 |
| [Etap F](ETAP_F.md) | Opis wdrożenia (grafika, scenariusze, frakcje, kampania) | Ukończony w 0.35–0.41 (F1–F7) |
| [Mapy tematyczne](MAPY_TEMATYCZNE.md) | Opis wdrożenia | Wdrożone, wersje 0.19–0.20 |
| [Renderer WebGL](RENDERER_WEBGL.md) | Propozycja, prototyp, etapy 2–5, cała plansza natywnie, pomiary | Wdrożone i domknięte w 0.21–0.31: renderer WebGL/WebGPU z trybem awaryjnym Canvas 2D, cała plansza jako natywne obiekty PixiJS, oświetlenie, pogoda, wysokość terenu, perspektywa 2,5D; testy porównawcze i pomiar płynności |
| [Wersja 0.12](WERSJA_0_12.md), [0.13](WERSJA_0_13.md), [0.14](WERSJA_0_14.md) | Notatki wydań | Wdrożone |
| [Pomysły](POMYSLY.md) | Lista możliwości | Aktualne statusy pomysłów (AI-01–05 wdrożone w 0.34) |
| [Gospodarka i rozwój](GOSPODARKA_I_ROZWOJ.md) | Koncepcja z 0.3–0.8 | Historyczna; niemal całość wdrożona |
| [Grafika planszy](GRAFIKA_PLANSZY.md) | Koncepcja i realizacja 2D | Pakiety 2D wdrożone; 3D odłożone |
| [Menu główne](MENU_GLOWNE.md) | Koncepcja z 0.4 | Historyczna; pierwszy zakres i większość rozszerzeń wdrożone |

## Otwarte kierunki

Wpis nie oznacza zlecenia realizacji ani terminu.

| Kierunek | Źródło | Status |
|---|---|---|
| Scenariusze dalej: edytor map, wyzwania z ziarnem i tabele wyników; balans Ekspedycji, Króla wzgórza i Przetrwania | [Kierunki §9](KIERUNKI_ROZWOJU.md), [Etap F](ETAP_F.md) | Propozycja |
| Kampania: nagrane głosy, balans aktów II–III na podstawie rozgrywek (portrety i sceny łączności — 0.99, [opis](KAMPANIA_OPRAWA.md)) | [Etap C](ETAP_C_DRUGI_AKT.md), [Etap F](ETAP_F.md) | Propozycja |
| Frakcje: balans trzech frakcji (koszty, cechy, jednostki unikalne) na podstawie rozgrywek | [Etap F](ETAP_F.md) | Wymaga rozgrywek |
| Poziom III centrum (Twierdza) i doktryny frakcji | [Kierunki §1](KIERUNKI_ROZWOJU.md) | Propozycja, po ocenie tempa rozgrywki |
| AI dalej: mgła wojny dla AI, budynki wsparcia i jednostki specjalne w rękach AI; AI w kampanii wdrożone w 0.97 (rozdziały II, III, VI) — strojenie z rozgrywek | [AI przeciwnika](AI_PRZECIWNIKA.md) | Propozycja |
| WAL-01: skały blokujące ostrzał | Archiwum poniżej | Propozycja |
| Balans frakcji, kosztów i dochodu pasywnego (BAL-01, GOS-03) | [Pomysły](POMYSLY.md) | Wymaga rozgrywek porównawczych |
| Etap E dalej: AI używające nowych budynków, jednostek i modułów; balans; dźwięki leczenia, osłony i sabotażu | [Etap E](ETAP_E_WSPARCIE_I_MODULY.md) | Propozycja |

## Testy

`npm test` uruchamia wszystkie pliki `tests/*.test.js` wbudowanym runnerem Node (`node --test`), również gdy któryś z nich zawiedzie. Stan 2026-09-27 (0.40): 236 testów, wszystkie przechodzą. Podgląd terenu map: `tests/maps-browser.html`. Strony `tests/*-browser.html` są kontrolami ręcznymi w przeglądarce (audio, menu, grafika, pogoda, pomiary etapu D); renderery: `tests/render-browser.html` (Canvas 2D, porównanie pikseli ze wzorcem) i `tests/render-webgl-browser.html` (WebGL, dzień/noc, efekty, wysokość terenu, perspektywa, pomiar czasu klatki; `?gpu=webgpu` — to samo na WebGPU); płynność w pętli gry: `tests/benchmark-browser.html`.

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

Wersja 0.7 nie ma osobnych notatek w dokumentacji.

## Aktualizowanie planu

Przy kolejnych rozmowach dopisujemy propozycje tutaj lub do listy pomysłów. Rozróżniamy statusy: propozycja, zatwierdzone, w realizacji, zrealizowane, odłożone. Po implementacji: wiersz w historii wersji, aktualizacja mapy dokumentacji i README, pełny `npm test`. Nie nadajemy numeru przyszłej wersji ani terminu przed ustaleniem zakresu. Sam wpis w planie nie oznacza zlecenia realizacji.

---

## Archiwum: wcześniejsze ustalenia i specyfikacje

Poniższe sekcje zachowano jako historię decyzji. Opisy statusu w nich nie zastępują tabel powyżej.

### Ustalenia ogólne

- Propozycje rozwoju zapisujemy w plikach projektu i aktualizujemy wraz z kolejnymi decyzjami.
- Przebudowa AI została odłożona na życzenie użytkownika (2026-09-20), a wdrożona w 0.34 (2026-09-27) — [opis](AI_PRZECIWNIKA.md).
- Tryb 3D odłożony na życzenie użytkownika; rozwijamy grafikę 2D.
- Kierunek gospodarki i rozwoju bazy opisano w [GOSPODARKA_I_ROZWOJ.md](GOSPODARKA_I_ROZWOJ.md); menu w [MENU_GLOWNE.md](MENU_GLOWNE.md).

### Walka i teren

Cel: zwiększyć znaczenie ustawienia oddziałów bez przebudowy strategicznego AI.

#### WAL-01 — Skały blokujące ostrzał

Status: propozycja.

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
