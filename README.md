# Pogranicze Galaktyki — prototyp RTS 0.49

**Wersja 0.49 — handel zasobami.** Nowa zakładka **Logistyka → Handel**: wymiana metalu, gazu i kryształów po niekorzystnym kursie (tracisz 40% wartości; 1 gaz = 3 metalu, 1 kryształ = 2 metalu — np. 100 kryształów → 120 metalu albo 40 gazu). Wymaga ukończonego magazynu polowego lub laboratorium; porcje po 50, 100 lub 250. Działa też w grze wieloosobowej. Reguły: `trade-rules.js`.

**Wersja 0.48 — rewanż.** Po bitwie wieloosobowej przycisk **Rewanż** na ekranie końcowym: drugi gracz widzi propozycję i przyjmuje ją jednym kliknięciem, a nowa bitwa rusza od razu na tym samym połączeniu — te same zasady i frakcje, nowy układ mapy, rozmowa z czatu trwa dalej. [Opis](docs/MULTIPLAYER.md).

**Wersja 0.47.2 — czat obok lobby.** Czat lobby ma własny panel tuż po prawej stronie okna lobby (układ wyrównany do lewej, jak pozostałe ekrany menu), na całą jego wysokość: gracze z kolorami, dłuższa historia rozmowy i pole wiadomości zawsze na dole. W wąskim oknie panel czatu jest pod lobby.

**Wersja 0.47.1 — panel wybranego oddziału.** Rozkazy w równej siatce dwóch kolumn (wybór, rozkazy, reszta) ze skrótami przy prawej krawędzi, a formacja jako przełącznik z ikonami szyku (Linia, Kolumna, Rozproszenie) zamiast listy rozwijanej; w wąskim oknie same nazwy, skróty w podpowiedziach.

**Wersja 0.47 — wspólna pauza.** W grze wieloosobowej Spacja zatrzymuje bitwę u obu graczy: każdy ma 3 pauzy po najwyżej 60 s, wznowić może każdy, a bitwa rusza po 3-sekundowym odliczaniu. Wywiad taktyczny pokazuje w bitwie sieciowej przeciwnika, przekaźniki i opóźnienie sieci zamiast „Infinity:NaN”, a bitwa sieciowa nie nadpisuje już zapisu gry jednoosobowej. [Opis](docs/MULTIPLAYER.md).

**Wersja 0.46.2 — płynność gry wieloosobowej.** Bitwa sieciowa rusza się tak płynnie jak jednoosobowa: kroki symulacji są rozłożone na klatki, zamiast liczyć całą turę naraz (obraz przeskakiwał 10 razy na sekundę). Po chwilowym czekaniu na drugiego gracza gra nadrabia stopniowo. [Opis](docs/MULTIPLAYER.md).

**Wersja 0.46.1 — czat.** W grze wieloosobowej gracze rozmawiają w lobby i w bitwie: Enter otwiera linię wiadomości, ostatnie wiadomości widać nad legendą przez 15 s, a rozmowa z lobby przechodzi do bitwy. Tekst przeciwnika jest zawsze zwykłym tekstem, z limitem 200 znaków i 5 wiadomości na 5 s. [Opis](docs/MULTIPLAYER.md).

**Wersja 0.46 — gra wieloosobowa.** Bitwa jeden na jeden z drugim człowiekiem przez przeglądarkę, bez serwera gry: gospodarz wysyła kod zaproszenia, gość odsyła kod odpowiedzi (WebRTC). W lobby gospodarz wybiera mapę, rozmiar, złoża, pogodę, faunę, długość doby, poziom startowy i ziarno mapy; każdy gracz — nazwę, kolor i frakcję. Silnik ma teraz osobną gospodarkę, badania, kolejki i mgłę dla każdego gracza, a obie przeglądarki liczą tę samą symulację (lockstep z porównywaniem sum kontrolnych). [Opis](docs/MULTIPLAYER.md).

**Wersja 0.45 — dźwięk.** Efekty z próbek (strzały innych frakcji brzmią inaczej, wybuchy warstwowe, kroki zależne od gruntu), dźwięk cichszy i głuchszy z daleka, pogłos, tło otoczenia (wiatr, lód, wulkan, deszcz) narastające przed burzą, a muzyka grana przez instrumenty Tone.js z pogłosem i echem; akcenty zwycięstwa, porażki i badań. Próbki: Kenney (CC0), biblioteka Tone.js (MIT). [Opis](docs/AUDIO.md).

**Wersja 0.44 — złoża.** Ruda to warstwowy wychodzień skalny z błyszczącymi żyłami metalu, gaz — krater ze świecącymi szczelinami i unoszącą się mgłą, kryształy — półprzezroczyste złote graniastosłupy. Każde złoże maleje w 6 etapach, a wyczerpane ma własny wygląd (wykop, wygasły krater, ułamane kikuty). Przy kopaniu lecą odpryski, nad pracującym ekstraktorem gaz wypływa mocniej, nocą gaz i kryształy świecą; w WebGL złoża mają też światło słońca i księżyca. [Opis](docs/RENDERER_WEBGL.md#złoża-wersja-044-2026-09-28).

**Wersja 0.43 — światło na jednostkach.** W trybie WebGL/WebGPU jednostki są cieniowane jak budynki: jaśniejsza strona od słońca (o świcie ze wschodu, wieczorem z zachodu, złota o zmierzchu), chłodny cień po przeciwnej, w nocy księżyc. Światło liczone jest z wyglądu, który widać na planszy (kierunek, wieża czołgu, klatka ruchu), więc nie obraca się razem z jednostką; uszkodzone pojazdy pokrywa sadza. [Opis](docs/RENDERER_WEBGL.md#światło-na-jednostkach-wersja-043-2026-09-28).

**Wersja 0.42.1 — wskaźnik burzy.** Nadciągającą burzę pokazuje cienka linia na krawędzi ekranu, z której nadchodzi (w rogu — dla kierunków ukośnych), szewrony płynące do środka i okrągły zegar z sekundami i pierścieniem; plansza nie jest już przyciemniana. [Opis](docs/ETAP_F.md#wskaźnik-burzy-0421).

**Wersja 0.42 — Obsydianowi Strażnicy.** Rój ma nowy wygląd: budynki to zestawy wysokich, zwężających się czarnych monolitów ze spiczastymi czubkami i szwami wyciętymi w kamieniu, jednostki to kanciaste strażniki i czteronożni kroczący; bez poświaty, jedynym kolorem jest pasek drużyny. Budynki i jednostki Roju mają własne nazwy. [Opis](docs/ETAP_F.md#wygląd-roju-obsydianowi-strażnicy-042).

**Wersja 0.41 — mapa galaktyki.** Ekran kampanii z galaktyką spiralną, układami planetarnymi (słońca, orbity), proceduralnie rysowanymi planetami według klimatu, pierścieniami, księżycami i pasami asteroid, zintegrowany z listą rozdziałów. [Opis](docs/ETAP_F.md#f7--mapa-galaktyki-041).

**Wersja 0.40 — akt III i mapa kampanii.** Rozdziały VII–IX „Przebudzenie Roju” (Ekspedycja na Lumerii V, sojusz z Dominium na Nivalis, Serce Roju na Pyrrhosie) oraz mapa kampanii z trasą przez planety wszystkich aktów. [Opis](docs/ETAP_F.md#f6--mapa-kampanii-i-akt-iii-przebudzenie-roju-040).

**Wersja 0.39 — Rój Kryształowy.** Trzecia frakcja z regeneracją, pełzaczem, pluwaczem, kolosem i monolitem rezonansowym; ustawienie frakcji przeciwnika; nazwy stron w komunikatach według frakcji. [Opis](docs/ETAP_F.md#f5--trzecia-frakcja-rój-kryształowy-039).

**Wersja 0.38 — frakcje.** Po dwie nowe jednostki i unikalny budynek na frakcję (Kolonie: grenadierzy, łazik serwisowy, placówka polowa; Dominium: miotacze ognia, niszczyciel czołgów, stacja orbitalna z uderzeniem), nowe cechy pasywne i odrębny wygląd budynków oraz pojazdów. [Opis](docs/ETAP_F.md#f4--wyraźniejsze-różnice-i-wygląd-frakcji-038).

**Wersja 0.37 — drużyny 2 na 2.** Ty i sojusznik AI przeciw dwóm dowódcom: wspólne widzenie, brak bratobójczego ognia, przekaźniki stron, wspólne zwycięstwo. [Opis](docs/ETAP_F.md#f3--drużyny-2-na-2-037).

**Wersja 0.36 — nowe tryby.** Król wzgórza (centralny Szczyt, 1,5–5 min utrzymania) i Przetrwanie (rosnące fale z krawędzi mapy, rekordy); modyfikatory długości doby i poziomu startowego. [Opis](docs/ETAP_F.md#f2--modyfikatory-scenariuszy-i-nowe-tryby-036).

**Wersja 0.35 — efekty i zapowiedź burzy.** Efekty osłony, leczenia, rozbiórki, montażu, wydobycia, sabotażu i artefaktu (wspólne dla Canvas i WebGL), trwałe kratery, kierunek nadciągania burzy na krawędzi ekranu i na minimapie. [Opis](docs/ETAP_F.md).

**Wersja 0.34.2 — właściwa przyczyna zwalniania.** Robot budujący tuż przy przeszkodzie nie mógł wyznaczyć trasy i szukał jej od nowa w każdym kroku symulacji (158 ms na krok na zapisie gracza, teraz 2,2 ms). [Opis](docs/RENDERER_WEBGL.md#właściwa-przyczyna-zwalniania-robot-bez-trasy-wersja-0342-2026-09-27).

**Wersja 0.34.1 — poprawka płynności.** Gra w WebGL/WebGPU nie zwalnia już po kilku minutach: złoża nie tworzą nowej tekstury przy każdej jednostce wydobytej rudy, a burza piaskowa rysuje ziarna jako pulę cząstek. [Opis](docs/RENDERER_WEBGL.md#poprawka-gra-zwalnia-po-kilku-minutach-wersja-0341-2026-09-27).

**Wersja 0.34 — dowódca AI.** Przeciwnik w scenariuszach ma własne roboty i wydobycie, płatną produkcję, plan budowy z odbudową, obronę bazy i robotów, przejmowanie przekaźników i planowane ataki; trzy poziomy (łatwy, średni, trudny). Klasyczne darmowe desanty dostępne jako opcja; kampania bez zmian. [Opis](docs/AI_PRZECIWNIKA.md).

**Wersja 0.33 — scenariusze.** Tryb Ekspedycja po artefakt, ziarno mapy z kontrolą poprawności układu, kod operacji do udostępniania, gotowe ustawienia (Spokojna ekspansja, Niebezpieczna planeta, Wojna o zasoby), ustawiany czas obrony i pula punktów, zasobność złóż, liczebność fauny i surowość pogody. [Opis](docs/SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md).

**Wersja 0.32 — wsparcie i moduły.** Budynki: punkt medyczny (leczenie piechoty), generator osłon (kopuła przejmująca 70% obrażeń budynków, przeciążenie), plac odzysku (metal z wraków). Jednostki: wóz przeciwlotniczy, dron zwiadowczy, sabotażyści (ukrycie, wyłączanie budynków). Moduły koszar, fabryki i wieżyczek. [Opis](docs/ETAP_E_WSPARCIE_I_MODULY.md).

**Wersja 0.31 — poprawka.** Szara plansza na mapach kampanii w trybach WebGL/WebGPU naprawiona (kolor zanikającego przejmowania przekaźnika); wyjątek w natywnej części renderera przełącza ją na Canvas zamiast zatrzymywać rysowanie. [Opis](docs/RENDERER_WEBGL.md#poprawka-szara-plansza-na-mapach-kampanii-wersja-031-2026-09-27).

**Wersja 0.30 — domknięcie renderera.** Pomiar płynności w prawdziwej pętli gry (`tests/benchmark-browser.html`: Canvas 2D, WebGL, WebGPU), równiejsze klatki w bitwach WebGL (95% klatek do 11,8 ms zamiast 17,6 ms), cień wyspy na ziemi, iskry lawy bez przeskoków, poprawka pamięci, WebGPU bez etykiety „eksperymentalny”. [Opis](docs/RENDERER_WEBGL.md#domknięcie-renderera-wersja-030-2026-09-27).

**Wersja 0.29 — latarki i reflektory.** Nocą piechota i pojazdy w trybie WebGL świecą znowu wąskim stożkiem jak w Canvas (latarka, reflektor), który dodatkowo oświetla teren w mapie świateł; samoloty mają wyraźne światła nawigacyjne. [Opis](docs/RENDERER_WEBGL.md#latarki-i-reflektory-jak-w-canvas-wersja-029-2026-09-27).

**Wersja 0.28 — cała plansza natywnie.** Interfejs na planszy (znaczniki, punkty zbiórki, podgląd budowy, zaznaczanie, winieta, słońce, księżyc, pogoda na niebie) jest nagrywany i odtwarzany jako obiekty PixiJS — z tekstem, przekształceniami, przerywanymi liniami, gradientami i przycinaniem. W trybie WebGL/WebGPU żadna warstwa Canvas nie jest już przesyłana do karty graficznej (zostały jako tryb awaryjny). [Opis](docs/RENDERER_WEBGL.md#interfejs-na-planszy-natywnie--koniec-przesyłania-warstw-wykonany-2026-09-27).

**Wersja 0.27 — poświata i efekty map natywnie.** Rysunek poświaty i efektów map (także z wtyczek) jest nagrywany i odtwarzany jako obiekty PixiJS; to, czego nie da się odtworzyć, samo wraca do warstwy Canvas. Na wszystkich mapach testowych przez Canvas idzie już tylko interfejs na planszy. [Opis](docs/RENDERER_WEBGL.md#poświata-i-efekty-map-jako-natywne-obiekty-wykonany-2026-09-27).

**Wersja 0.26 — przyroda jako natywne obiekty.** W trybie WebGL/WebGPU zwierzyna, ptaki, ryby i latające wyspy są obiektami PixiJS (wygląd malowany raz tym samym kodem, ruch natywnie). Na mapach bez efektów i poświaty z Canvas przesyłany jest już tylko interfejs na planszy. [Opis](docs/RENDERER_WEBGL.md#zwierzęta-ptaki-ryby-i-latające-wyspy-jako-natywne-obiekty-wykonany-2026-09-27).

**Wersja 0.25 — modele jako natywne obiekty.** W trybie WebGL/WebGPU jednostki i budynki są obiektami PixiJS: wygląd malowany tym samym kodem, raz dla każdego stanu (animowane — do 20 razy na sekundę), w skali dopasowanej do przybliżenia; ruch, obrót, cienie, zaznaczenia, paski, efekty walki, siedliska i mury natywnie. Obraz praktycznie bez zmian, bitwa 120 jednostek: 20,5 → 11,8 ms na klatkę. [Opis](docs/RENDERER_WEBGL.md#modele-jednostek-i-budynków-jako-natywne-obiekty-wykonany-2026-09-27).

**Wersja 0.24 — grunt jako natywne obiekty.** W trybie WebGL/WebGPU złoża, przekaźniki, szczątki, kałuże, szron, jeziora, ślady i ścieżki jednostek są obiektami PixiJS: wygląd malowany raz tym samym kodem i odświeżany tylko przy zmianie stanu, ruch rysowany natywnie. Obraz praktycznie bez zmian, plansza 1,7–2,6× szybsza (np. Świetlisty Gąszcz nocą w ulewie: 22,5 → 8,8 ms). [Opis](docs/RENDERER_WEBGL.md#grunt-jako-natywne-obiekty-wykonany-2026-09-27).

**Wersja 0.23 — wysokość terenu, perspektywa 2,5D, WebGPU.** Mapa wysokości wyliczana z terenu: rzeźba oświetlona słońcem i długie cienie płaskowyżów i iglic o świcie i zmierzchu. Opcjonalna lekko pochylona kamera (z dokładnym przeliczaniem pozycji myszy) i eksperymentalny renderer WebGPU z automatycznym powrotem do WebGL i Canvas 2D. Poprawki migotania przy przesuwaniu mapy i miękka mgła wojny. Tylko grafika — zasady i zapisy bez zmian. [Opis](docs/RENDERER_WEBGL.md#etap-5--wysokość-terenu-perspektywa-25d-i-webgpu-wykonany-2026-09-26).

**Wersja 0.22 — ulepszenia grafiki (renderer WebGL).** Objętość budynków oświetlanych z kierunku słońca i księżyca (mapy normalnych generowane z modeli), sadza, pęknięcia i świecące pożary na uszkodzonych budynkach, wypalony grunt po wybuchach, deszcz i śnieg jako cząsteczki na GPU z rozpryskami, piorun rozświetlający planszę; mniej warstw przesyłanych do karty graficznej. Nowe przełączniki w Ustawieniach → Renderer. [Opis](docs/RENDERER_WEBGL.md#etap-4--ulepszenia-grafiki-wykonany-2026-09-26).

**Wersja 0.21 — renderer WebGL w grze.** Plansza jest rysowana przez PixiJS (WebGL): mapa świateł z prawdziwą nocą, światła budynków i jednostek, cienie od słońca, poświata, połysk wody i miękka mgła wojny; całe dotychczasowe rysowanie i nakładki interfejsu zostają bez zmian. Ustawienia → Renderer: wybór WebGL lub Canvas 2D i przełączniki efektów; bez WebGL (lub po utracie kontekstu) gra sama wraca do Canvas 2D. Samodzielny prototyp: `prototyp-webgl.html`. [Opis](docs/RENDERER_WEBGL.md#etap-3--renderer-webgl-w-grze-wykonany-2026-09-26).

**Wersja 0.20 — odświeżone klasyczne mapy.** Cichy Horyzont (morze wydm), Słoneczna Dolina (złoty kanion), Popielny Szlak (wrak obcego statku) i Biały Przesmyk (zamarznięta placówka) mają nowy teren; kampania aktu I — nowy wygląd bez zmian w układzie. Zapisy scenariuszy na tych czterech mapach sprzed zmiany nie są wczytywane. [Opis](docs/MAPY_TEMATYCZNE.md#wersja-020--odświeżone-klasyczne-mapy).

**Wersja 0.19 — mapy tematyczne.** Cztery nowe scenariusze: Świetlisty Gąszcz (świecąca dżungla z rzeką i brodami), Wiszące Szczyty (przepaście, mosty i latające góry), Wydmy Bliźniaczych Słońc (płaskowyże i wrak krążownika) oraz Rzeki Magmy (lawa i bazaltowe przeprawy). [Opis map](docs/MAPY_TEMATYCZNE.md).

**Wersja 0.18 — tryby scenariuszy i rozmiary map.** W Scenariuszach wybierz tryb (Podbój, Utrzymanie przekaźników, Obrona) i rozmiar mapy (mała, średnia, duża). Duże mapy mają dodatkowe złoża, skały, jeziora, siedliska i 14 przekaźników. [Zasady i parametry](docs/ETAP_C_TRYBY_I_MAPY.md).

**Wersja 0.17 — etap C: Akt II kampanii „Cena świtu”.** Trzy nowe rozdziały (IV–VI) po ukończeniu rozdziału III: ratunek badaczy transporterem przez obszar jam, automatyczny konwój przez lodową przełęcz oraz decyzja o losie kompleksu Hefajstos. Dialogi radiowe, dziennik celów (menu pauzy → Odprawa i dziennik), cele dodatkowe z odznakami i podsumowanie misji. [Zakres i zasady](docs/ETAP_C_DRUGI_AKT.md).

**Wersja 0.16 — etap D: Oprawa.** Muzyka reagująca na rozwój i walkę, mikser kategorii dźwięku, detale brzegów, etapy budowy, jakość grafiki i pomiary renderowania. Opcje dostępne w Ustawieniach. [Zakres i pomiary](docs/ETAP_D_OPRAWA.md).

**Wersja 0.15 — etap B: Armia i baza.** Transporter (ARMIA / fabryka), bateria przeciwlotnicza (BUDOWA), formacje, nowe modele i dźwięki rozkazów. PPM piechotą na transporterze: załadunek; Wyładuj: desant. Oddział / Statystyki: porównanie zaznaczonych jednostek. [Pełny zakres i sterowanie](docs/ETAP_B_ARMIA_I_BAZA.md).

**Nowość: ukończony etap A — Rozwój kolonii.** Trzy nowe badania, dwa poziomy centrum, akumulator, warsztat i szkolenie. Uruchom: Gra jednoosobowa → Szkolenie: Próba kolonii. [Zakres, parametry i cele](docs/ETAP_A_ROZWOJ_KOLONII.md).

Samodzielny prototyp 2D strategii science fiction. Powstał w HTML, CSS i JavaScript (Canvas 2D), bez bibliotek, pobieranych assetów ani wymaganej instalacji. To prototyp mechanik, nie projekt Unity.

## Uruchomienie

Otwórz `index.html` w aktualnym Chrome, Edge lub Firefox. Na Windows można również dwukrotnie kliknąć `START.cmd`.

Opcjonalnie, jeśli masz Node.js: `npm start`, następnie http://127.0.0.1:4173. Serwer nasłuchuje tylko na lokalnym komputerze. Nie trzeba uruchamiać `npm install`.

## Nowości wersji 0.14

Okrągły księżyc i światła nawigacyjne samolotów. Pełnoekranowy prolog z sześcioma scenami i osobnym motywem muzycznym. Bazy przy narożnikach, przekaźniki przy złożach oraz dźwięki ruchu i pracy robotów. [Szczegóły i zasady](docs/WERSJA_0_14.md).

## Nowości wersji 0.13

Przywrócone szczegóły budynków, mury pod dowolnym kątem i w okręgu, rozbiórka, łagodniejsza ulewa, mniejsze kafle, bezpośrednia konfiguracja scenariusza oraz trzy osobne mapy kampanii z 30-sekundowym animowanym prologiem. [Sterowanie i pełny opis](docs/WERSJA_0_13.md).

## Nowości wersji 0.12

Dwie frakcje i konfiguracja scenariuszy dla 2–4 uczestników, lotnictwo i hangar, roboty z bronią, przeciągane mury z bramami i wieżami. Nowe bryły budynków i fauna, osobny suwak muzyki oraz stronicowane kafle bez obciętych opisów.

Sterowanie, parametry i wyniki testów: [Wersja 0.12](docs/WERSJA_0_12.md).

## Nowości wersji 0.11

- Dzień i noc (cykl 6 minut), księżyc, gwiazdy oraz nocne światła jednostek i budynków.
- Śnieżyce, wyraźne burze piaskowe i ulewy z błyskawicami/grzmotem. Do −35% ruchu i 30% chybionych strzałów w najgorszych warunkach.
- Laboratorium: Monitoring pogody (prognoza i alarm 30 s wcześniej), Celowanie adaptacyjne i Napędy terenowe (redukcja odpowiedniej kary o 75%).
- Pięć różnych aranżacji: osobne menu, lodowy ambient, pustynny motyw pentatoniczny, industrialny Vulkan i pogodny Helion.
- Ptaki i ryby jako dekoracyjna fauna. Pogoda, doba i badania obsługują zapis gry.
- Weryfikacja: 72 testy automatyczne; pięć motywów wyrenderowanych w Web Audio bez przesterowania; przegląd graficzny dnia, nocy i trzech rodzajów burz.

## Nowości wersji 0.10

- **Pogoda na planszy:** śnieg na Nivalis pada w przestrzeni mapy i stopniowo osiada na gruncie. Deszcz na Vulkanie uderza w teren, a z czasem pojawiają się rosnące kałuże. Jeziora mają drobne, wielowarstwowe fale i ruchome refleksy.
- **Uszkodzenia:** mechaniczne jednostki i budynki poniżej 55% wytrzymałości zaczynają dymić i płonąć; poniżej 28% ogień jest wyraźnie intensywniejszy.
- **Budowa przez roboty:** postawienie fundamentu oddelegowuje zaznaczonego robota albo najbliższego dostępnego. Budowa postępuje dopiero po jego dotarciu. PPM robotem na rozpoczętej konstrukcji dołącza go do pracy. Bez żywego robota nie można rozpocząć budowy.
- **Osłona piechoty:** piechota i rakietowcy przy skałach, murach i zamkniętych bramach otrzymują o 30% mniej obrażeń od broni dystansowej. Delikatny łuk nad jednostką pokazuje aktywną osłonę.
- **Utrzymanie pozycji:** przycisk „Pozycja” lub Shift+S zatrzymuje jednostki bojowe. Nadal strzelają w zasięgu, ale nie ścigają celu.
- **Muzyka proceduralna:** osobny spokojny motyw menu i trzy warianty muzyki bitwy dopasowane do biomu. Muzyka działa offline i podlega wspólnemu wyciszeniu oraz regulacji głośności.
- **Interfejs:** przycisk zapisu znajduje się teraz w grupie sterowania dźwiękiem, bezpośrednio obok suwaka głośności. Zwierzęta są mniejsze i mniej dominują wizualnie nad piechotą.

## Nowości wersji 0.9

- Pięć ręcznych slotów zapisu oraz niezależny autosave, osobne podmenu trzech scenariuszy i trzy odblokowywane rozdziały kampanii.
- Ciężka maszyna, artyleria, mur i otwierana brama. Mapy mają 3360 × 2160, cztery przekaźniki, jeziora, nowe złoża i planetarne drapieżniki.
- Lewy panel jest podzielony na zakładki, a dolny panel zawsze pokazuje postęp produkcji, budowy lub badania.

## Nowości wersji 0.8

- **Reaktor [C]:** 180 metalu, 14 s, +60 mocy. Centrum dostarcza 40 mocy. Bilans w górnym pasku pokazuje zapotrzebowanie / podaż.
- **Laboratorium [N]:** 220 metalu, 16 s; pobór 30 mocy. Pozostały pobór: koszary 10, fabryka 25, ekstraktor 10, wieżyczka 5. Liczą się ukończone budynki gracza. Niedobór spowalnia produkcję wojsk i badania proporcjonalnie do pokrycia zapotrzebowania, do minimum 25%. Produkcja robotów, wydobycie, naprawy i budowa pozostają dostępne.
- **Kryształy:** skończone bursztynowe złoża, wydobycie PPM zaznaczonym robotem, dostawa do centrum lub magazynu. Ładunek zachowuje rodzaj przy zmianie zadania. Gaz nadal wymaga ekstraktora.
- **Stabilizacja reaktorów:** laboratorium, 180 metalu + 40 gazu + 30 kryształów, 30 s; podnosi moc każdego reaktora do 90.
- **Optyka kryształowa:** laboratorium, 220 metalu + 50 gazu + 45 kryształów, 35 s; +15% obrażeń własnej armii, mnoży się z premią broni. Dotychczasowa broń i pancerz nadal wymagają fabryki, a ładownie magazynu. Jest jedno wspólne badanie naraz. Utrata wymaganego budynku wstrzymuje postęp. Anulowanie zwraca wszystkie zapłacone surowce.
- **Trzy operacje:** Cichy Horyzont (Khepri IV), Biały Przesmyk (Nivalis, lodowa mapa z odwróconym frontem i dodatkowym grzbietem), Popielny Szlak (Vulkan IX, bazalt, inny układ przeszkód, mniej rudy i więcej gazu).
- **Kampania Wolnych Kolonii — Odzyskany Świt:** pierwsza misja Pierwszy Sygnał. Utrzymaj dwa przekaźniki, ukończ reaktor i laboratorium oraz zniszcz centrum Dominium, w dowolnej kolejności. Start z 650 metalu, pierwszy desant po 100 s. Ukończenie jest zapamiętywane oddzielnie od pojedynczego zapisu bitwy; misję można powtarzać. Dostępny jest jeden rozdział.
- **Grafika 2D:** szczegółowe sylwetki, nowe budynki, biomy, mineralne złoża, animacje pracy, rusztowania budowy, błyski i odłamki, odrzut wieży czołgu, dym oraz znikające po 20 s wraki. Wraki są dekoracyjne, bez kolizji; limit 70. Czas animacji jest powiązany z symulacją. Nie wdrażamy 3D.
- **Zapisy:** format 5 zachowuje mapę misji, kryształy i ładunki; czyta formaty 2–4. Starsze operacje stają się Cichym Horyzontem, otrzymują bezkolizyjnie umieszczone złoża i zaczynają z zerem kryształów. Zapłacone badania zachowują koszt i postęp.

Weryfikacja: kontrola składni i testy logiki. Aktualne oględziny przeglądarkowe oraz pomiar płynności pozostają niewykonane z powodu blokady automatycznej kontroli uprawnień po przekroczeniu limitu użycia. Testy logiki nie zastępują oceny wizualnej ani balansu rozegranych misji.

## Cel

Zniszcz czerwone centrum dowodzenia na północnym wschodzie. Zaczynasz z 6 jednostkami bojowymi, 2 robotami górniczymi, centrum i koszarami. Centrum zapewnia 8 metalu/s. Każdy przejęty przekaźnik dodaje 5 metalu/s i pozwala budować pobliski przyczółek. Przejmowanie trwa 7 sekund i wymaga jednostki w zaznaczonym promieniu; przeciwnik może je kontestować i odbijać. Pierwszy desant nadchodzi po 65 sekundach; następne są silniejsze.

## Aktualizacja grafiki 2D

Nowy moduł `art.js` rysuje szczegółowsze jednostki, odrębne budynki, rudę i gaz oraz detale terenu. Zawiera podstawowe animacje ruchu i pracy, dym uszkodzeń i buforowanie wyglądu budynków. Nowe operacje zaczynają się bliżej bazy; zapis zachowuje wcześniejsze ustawienie kamery. Home pokazuje całą mapę.

Kontrola składni i 63 testy logiki przeszły. W przeglądarce sprawdzono sceny śnieżną i deszczową, animowaną wodę, pożar, pracę robota, menu, położenie zapisu oraz oba paski postępu; konsola nie zgłosiła błędów. Nie wykonano jeszcze pomiaru płynności przy pełnym limicie jednostek. Tryb 3D jest odłożony. Szczegółowy stan prac: [Grafika planszy](docs/GRAFIKA_PLANSZY.md).

## Nowości wersji 0.6 — gospodarka i rozwój

- **Magazyn polowy [G]:** 120 metalu, 10 s. Robot rozładowuje rudę w ukończonym centrum lub magazynie, wybierając krótszą dostępną trasę. Po utracie celu rozładunku zachowuje ładunek i szuka innego punktu.
- **Gaz:** trzy skończone złoża oznaczone fioletem na mapie i minimapie. Oddzielny licznik w górnym pasku; początkowy zapas wynosi zero.
- **Ekstraktor [X]:** 160 metalu, 12 s; stawiany na widocznym złożu przy bazie lub własnym przekaźniku. Po ukończeniu zaznacz roboty i kliknij ekstraktor PPM: jeden robot zostanie operatorem. Dopiero po dojściu produkuje 2 gazu/s. Jeden ekstraktor obsługuje jeden robot. Odejście, śmierć, utrata budynku lub wyczerpanie złoża zatrzymują wydobycie. Gaz trafia bezpośrednio do zasobu; robot zachowuje wcześniej zebraną rudę.
- **Bezczynne roboty [Z]:** przycisk w panelu logistyki zaznacza roboty bez rozkazu i przenosi do nich kamerę.
- **Powiększone ładownie [L]:** wymaga ukończonego magazynu; 150 metalu + 50 gazu, 25 s. Zwiększa ładunek wszystkich robotów z 30 do 60 rudy. Nie przyspiesza samego wydobycia. Jedno wspólne badanie naraz; utrata wymaganego budynku wstrzymuje postęp. Anuluj w zakładce Badania zwraca pełny zapłacony koszt w obu zasobach.
- **Migracja:** format zapisu 4 czyta formaty 2 i 3, zachowując metal, jednostki, kolejki i badania. Starsze mapy otrzymują złoża gazu przesunięte w razie kolizji z istniejącymi strukturami. Gaz zaczyna od zera; starsze badania i zamówienia nie wymagają dopłaty. Klucz zapisu pozostaje ten sam.
- Koszty dotychczasowej armii oraz premii broni i pancerza pozostają w metalu. Pierwszym zastosowaniem gazu jest rozwój ładowni. Energia, laboratorium, budowa przez roboty i kryształy to dalsze etapy.

## Nowości wersji 0.5 — menu główne

- **Gra jednoosobowa:** odprawa misji Cichy Horyzont; start nowej operacji wymaga potwierdzenia, jeśli istnieje zapis.
- **Kontynuuj:** dostępne przy poprawnym zapisie niezakończonej operacji; wczytana bitwa czeka w pauzie.
- **Baza wiedzy:** sterowanie, role jednostek, koszty, budynki, gospodarka i badania.
- **Ustawienia:** wspólne audio menu i bitwy oraz zapamiętywane ograniczenie animacji menu.
- **Esc:** anuluje aktywne ustawianie budynku lub rozkaz, w innym przypadku otwiera menu pauzy. Z niego można wznowić, zapisać, otworzyć ustawienia lub wrócić do menu głównego. Spacja nadal zapewnia pauzę taktyczną z wydawaniem rozkazów.
- Powrót do menu zapisuje bitwę; błąd zapisu daje wybór powrotu do gry lub opuszczenia bez zapisu. Podczas pobytu w menu symulacja nie działa.
- Kampania, gra sieciowa i kolejne scenariusze pozostają propozycjami opisanymi w „Co nowego i plany”.
- `menu.js` i `menu.css`: nawigacja oraz proceduralny pokład dowodzenia. `tests/menu-browser.html`: testy przejść, ochrony zapisu i błędów pamięci z kontrolowanymi odpowiedziami warstwy zapisu.

## Nowości wersji 0.4 — dźwięk

- Proceduralne efekty strzałów, rakiet, eksplozji, zaznaczania i rozkazów oraz kliknięć interfejsu.
- Sygnały ukończenia produkcji, budowy i badań, przejęcia przekaźnika, alarmu bazy, desantu oraz zakończenia bitwy.
- Przycisk nuty lub **M** wycisza dźwięk; suwak obok reguluje głośność. Ustawienia są zapamiętywane lokalnie niezależnie od zapisu bitwy.
- Audio uruchamia się po pierwszym kliknięciu lub naciśnięciu klawisza. Działa offline, bez pobierania plików audio.
- Odgłosy walki uwzględniają położenie względem kamery (stereo), widok i mgłę wojny. Globalne powiadomienia są słyszalne niezależnie od kamery. Pauza i ukrycie strony wygaszają trwające efekty.
- Limity częstotliwości i liczby jednoczesnych dźwięków ograniczają nakładanie efektów.
- `audio.js`: synteza przez Web Audio API. `npm test` sprawdza logikę audio; `tests/audio-browser.html` wykonuje 14 prób rzeczywistej syntezy offline, amplitudy, wyciszenia i zwalniania źródeł.

## Nowości wersji 0.3

- **Grupy jednostek:** Ctrl+1–9 przypisuje zaznaczone jednostki, Ctrl+Shift+1–9 dodaje je do istniejącej grupy. Sam numer wybiera grupę; dwukrotne szybkie naciśnięcie centruje kamerę. Można też klikać przyciski grup na mapie (Ctrl+klik przypisuje). Polegli automatycznie znikają z przywołanej grupy. Przypisanie pustego zaznaczenia czyści grupę.
- **Punkty zbiórki:** zaznacz własne centrum, koszary lub fabrykę i kliknij PPM na mapie. Zobaczysz flagę i linię. Nowe jednostki samodzielnie idą do wskazanego punktu. Punkt w skale jest przesuwany na dostępny teren.
- **Równoległe kolejki:** każdy budynek ma 10 miejsc i niezależnie produkuje jedną jednostkę naraz. Zaznaczenie zgodnego budynku kieruje do niego zamówienie. Bez takiego zaznaczenia gra wybiera najmniej obciążony ukończony budynek. Panel boczny pokazuje kolejki; kliknięcie wiersza wybiera budynek. „Anuluj” zwraca koszt ostatniej pozycji zaznaczonego budynku, a bez zaznaczonego budynku — ostatniej pozycji globalnej. Limit 60 obejmuje wszystkie jednostki i wszystkie zamówienia łącznie.
- **Utrata budynku:** niewykonane zamówienia trafiają do dostępnego zgodnego budynku, a przy jego braku czekają na odbudowę. Postęp i opłacone zasoby są zachowane. Produkcja w innych budynkach trwa dalej.
- **Alarm bazy:** obrażenia zadane własnemu budynkowi uruchamiają czerwony komunikat i pulsujący znacznik na minimapie. Kliknięcie komunikatu lub J centruje kamerę na miejscu ataku. Alarm jest wizualny i od wersji 0.4 dźwiękowy; powiadomienia tekstowe są ograniczone do jednego na 10 sekund, żeby uniknąć zalewania ekranu.
- **Zgodność zapisów:** zapisy wersji 0.2 są automatycznie migrowane. Zapis 0.3 obejmuje grupy, flagi zbiórki i przypisanie zamówień do budynków. Lokalizacja zapisu w przeglądarce pozostaje ta sama.

## Mechaniki dodane w wersji 0.2

- **Wydobycie:** roboty zabierają po 30 rudy z wyczerpywalnych złóż i dostarczają ją do centrum. Początkowe roboty pracują automatycznie. Nowe wymagają rozkazu PPM na rudzie.
- **Budowa:** wieżyczka (150 metalu, 8 s), koszary (200, 12 s), fabryka (320, 18 s). Budowę zleca się na widocznym wolnym terenie do 380 jednostek od centrum lub 240 od własnego przekaźnika. Od wersji 0.10 fundament wymaga pracy robota.
- **Produkcja:** piechota i rakietowcy powstają w koszarach, czołgi w fabryce, roboty w centrum. Budynki muszą być ukończone. W wersji 0.3 kolejki są niezależne, jak opisano powyżej.
- **Mgła wojny:** zwiad odsłania teren. Zbadany obszar pozostaje przyciemniony po odejściu wojska. Wrogowie poza widocznością znikają także z minimapy i nie można ich wskazywać jako celu.
- **Naprawa:** zaznacz roboty i kliknij PPM uszkodzoną własną jednostkę lub ukończony budynek. Naprawa przywraca 35 PW/s, kosztuje 1 metal na 5 PW.
- **Badania:** fabryka odblokowuje ulepszenie broni (+25% obrażeń) i pancerza (−20% otrzymywanych obrażeń). Każde kosztuje 250 metalu i trwa 25 s; jedno badanie naraz. Utrata fabryki wstrzymuje postęp.
- **Zapis:** przycisk u góry lub Ctrl+S, automatyczny zapis co 10 sekund aktywnej gry i przy opuszczeniu strony. Po odświeżeniu wybierz „Wznów zapis”, potem Spację. Zapis obejmuje gospodarkę, rozkazy, kolejkę, budowę, badania i zbadany teren.

Zapis jest lokalny dla danej przeglądarki i adresu (port również ma znaczenie). Nowa operacja zastępuje poprzedni zapis. Przy zablokowanej pamięci lokalnej zapis może być niedostępny; ręczny zapis wyświetla wtedy komunikat. Wersja 0.1 nie miała zapisów do migracji.

## Sterowanie

- LPM: zaznaczenie; przeciągnięcie LPM: zaznaczenie grupy; Shift: dodawanie/odejmowanie zaznaczenia.
- PPM na ziemi: ruch; PPM na przeciwniku: atak; A, następnie PPM: atak w marszu.
- Q / W / E / D: produkcja piechoty / rakietowca / czołgu / robota.
- T / B / V: ustawienie wieżyczki / koszar / fabryki, LPM zatwierdza, Esc lub PPM anuluje.
- F: wszystkie jednostki bojowe (roboty pozostają przy pracy); R: roboty; S: zatrzymanie; Spacja: pauza taktyczna.
- U / I: badania broni / pancerza. Ctrl+S: zapis.
- Strzałki lub przeciągnięcie środkowym przyciskiem: kamera; kółko: zoom.
- H: kamera na bazę; Home: cała mapa; kliknięcie minimapy: przesunięcie kamery.
- Utrata fokusu okna automatycznie wstrzymuje grę. Wznów Spacją lub przyciskiem u góry.

## Technika

- `engine.js`: symulacja 30 kroków/s, rozkazy, A\* na siatce z wygładzaniem ścieżek, separacja jednostek, obrażenia i kolejka produkcji.
- `advanced-rules.js`: scenariusze, frakcje, lotnictwo, mury, poziomy centrum, akumulator, warsztat i szkolenie. `army-rules.js`: transporter, bateria przeciwlotnicza i formacje (etap B). Oba moduły rozszerzają `Game` z `engine.js` i są ładowane także w testach.
- `scenario-modes.js`: tryby scenariuszy i rozmiary map (skalowanie oraz generowanie zawartości dużych map).
- `themed-maps.js`, `themed-art.js`: nowy teren i wygląd klasycznych map oraz klimat kampanii aktu I (wtyczka do `map-art.js`).
- `frontier-maps.js`, `map-art.js`: mapy tematyczne — układy z rzekami, rozpadlinami i lawą oraz ich grafika. `tests/maps-browser.html`: podgląd terenu wszystkich map bez mgły wojny.
- `campaign-act2.js`: akt II kampanii — rozdziały IV–VI, dialogi, cele, zapis. `act2-art.js`, `act2-film.js`, `act2.css`: modele, znaczniki, prolog i panel celów aktu II.
- `development.js`: model drzewa rozwoju (F2); `economy-panel.js`: panel Logistyka; `campaign.js`: postęp kampanii; `knowledge.js`: baza wiedzy.
- `app.js`: interfejs, kamera i obsługa wejścia. `render-canvas.js`: rysowanie planszy i minimapy (renderer Canvas 2D z interfejsem wspólnym dla przyszłego renderera WebGL); `tests/render-browser.html` — test i porównanie obrazu renderera. `art.js`, `advanced-art.js`, `planet-art.js`: modele jednostek, budynków, terenu i fauny; `scene-fx.js`: ustawienia jakości i licznik renderowania; `campaign-film.js`: prolog kampanii.
- `style.css`, `expansion.css`, `index.html`: panel dowodzenia, zakładki Armia / Budowa / Badania, przewijany panel celów.
- `cursor.js`, `cursor.css`: czytelny kursor renderowany wewnątrz strony, także w przeglądarce osadzonej.
- `server.js`: opcjonalny lokalny serwer bez zależności.
- `npm test`: wszystkie testy logiki (`tests/*.test.js`) wbudowanym runnerem Node.js. Strony `tests/*-browser.html` to kontrole ręczne w przeglądarce.

## Ograniczenia prototypu

Osiem map scenariuszy w trzech trybach i trzech rozmiarach, sześć rozdziałów kampanii w dwóch aktach i szkolenie; uproszczone AI falowe bez własnej gospodarki, brak nagranych głosów jednostek i multiplayera. Teren blokuje ruch, ale nie pociski ani zwiad. Limit gracza: 60 jednostek razem z robotami i zamówieniami, kolejka: 10 na budynek. Budynki stosują uproszczoną separację jednostek. Grafika i muzyka są proceduralne i nie używają materiałów z Gwiezdnych Wojen. Przeznaczone do gry myszą i klawiaturą.

## Planowanie rozwoju

Propozycje i decyzje zapisujemy w dokumentacji projektu. Punktem wejścia jest [Plan rozwoju](docs/PLAN_ROZWOJU.md): bieżący stan, mapa wszystkich dokumentów ze statusami, otwarte kierunki, stan testów i historia wersji.

- [Kierunki rozwoju](docs/KIERUNKI_ROZWOJU.md) — etapy A–D ukończone.
- [Pomysły](docs/POMYSLY.md) — pozostałe możliwości, w tym przebudowa AI odłożona na życzenie użytkownika.
- Dokumenty historyczne: [Menu główne](docs/MENU_GLOWNE.md), [Gospodarka i rozwój](docs/GOSPODARKA_I_ROZWOJ.md), [Grafika planszy](docs/GRAFIKA_PLANSZY.md).

Kolejny zakres nie został jeszcze wybrany.

### Drzewo rozwoju

Podczas gry wybierz **ROZWÓJ** obok zakładki Badania lub naciśnij **F2**. Gałęzie Gospodarka, Infrastruktura i Armia pokazują zależności, koszty i powody blokad. Z panelu szczegółów można rozpocząć/anulować badanie, zamówić jednostkę albo przejść do budowy. Okno wstrzymuje bitwę; **Esc** przywraca wcześniejszy stan pauzy. Szczegóły: [Drzewo rozwoju](docs/DRZEWO_ROZWOJU.md).
