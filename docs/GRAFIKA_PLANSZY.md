# Rozwój grafiki planszy

> **Dokument historyczny (stan 2026-10-07).** Pakiety 2D opisane niżej są wdrożone; tryb 3D, tu odłożony, wdrożono później jako renderer Three.js (0.52–0.96 — [Renderer 3D](RENDERER_3D.md)), a oświetlenie i efekty 2D — jako [renderer WebGL](RENDERER_WEBGL.md).
>
> **Stan 0.16 (2026-09-26).** Pakiety 2D wdrożone w 0.10–0.14; sylwetki frakcji w etapie B; etapy budowy (fundament, szkielet, bryła), ustawienia jakości i licznik renderowania w [etapie D](ETAP_D_OPRAWA.md). Etap D wykonał pomiar wywołań Canvas dla sceny 200 jednostek; pełne profilowanie bitwy nadal oczekuje. Tryb 3D odłożony.

Data: 2026-09-21. Punkt wyjścia: 0.6. Status: pakiet 2D do wersji 0.10 zaimplementowany i sprawdzony wizualnie; pomiar płynności pełnej bitwy oczekuje. Tryb 3D odłożony na życzenie użytkownika.

## Kierunek

Stylizowana kolonia przemysłowa science fiction na skalistej planecie: piaskowo-szary teren, ciemne metalowe konstrukcje, czytelne oznaczenia frakcji i kontrastujące złoża. Zachowujemy spójność z menu pokładu dowodzenia.

Obecne obiekty są rysowane proceduralnie w Canvas 2D, nie są modelami 3D. Proponowany najbliższy etap to bogatsza grafika 2D z wrażeniem wysokości: wyraźne bryły, dachy, boczne ściany i spójne cienie. Pełna izometria oznacza osobną zmianę projekcji, wskazywania obiektów i kolejności rysowania; nie jest potrzebna do poprawy szczegółowości.

## Obiekty i ich wygląd

| Obiekt | Proponowane detale | Informacja dla gracza |
|---|---|---|
| Piechota | Hełm, naramienniki, plecak, karabin, krótki cykl kroków | Kierunek ruchu i ostrzału |
| Rakietowiec | Większa wyrzutnia na ramieniu, cięższy plecak, szeroka sylwetka | Rozróżnienie od piechoty nawet bez koloru |
| Czołg | Gąsienice, segmenty pancerza, oddzielnie obracana wieża, odrzut lufy | Ruch kadłuba i celowanie to odrębne czynności |
| Robot | Podwozie, chwytak lub wiertło, pojemnik na rudę | Animacja pracy i widoczny ładunek |
| Centrum | Kilka brył, maszt, antena, wejście, platforma rozładunku | Główny punkt bazy |
| Koszary | Niskie moduły mieszkalne, drzwi, plac zbiórki | Produkcja piechoty |
| Fabryka | Wysoka hala, szeroka brama, przewody i wentylatory | Produkcja pojazdów |
| Magazyn | Kontenery, rampa, oznakowane stanowisko dostaw | Rozładunek rudy |
| Ekstraktor | Głowica wiertnicza, zbiorniki, rury i stanowisko robota | Ruch maszyny tylko podczas rzeczywistego wydobycia |
| Wieżyczka | Podstawa, pierścień obrotu, wyraźne lufy | Zasięg po zaznaczeniu; czytelny kierunek celowania |
| Przekaźnik | Maszt z anteną, cokół i panel zasilania | Właściciel i postęp przejmowania |
| Ruda | Nieregularne skały z niebieskimi żyłami, odłamki i zagłębienie | Trzy poziomy zasobności oraz wyczerpane wyrobisko |
| Gaz | Fioletowe szczeliny, mineralne obrzeże, delikatne opary | Rozpoznawalne złoże także przed budową; opary ustają po wyczerpaniu |

Kolor drużyny zajmuje pasy pancerza, światła i znaczniki, nie całe obiekty. Surowce różnią się również kształtem. Detale konstrukcyjne nie powinny wyglądać jak przyciski interfejsu.

## Teren i przestrzeń

- Kilka mieszanych powierzchni: pył, twarda skała, żwir i utwardzone place bazy. Przejścia są miękkie, bez wyraźnych powtarzalnych kafli.
- Skały mają różne sylwetki, zacienione ściany, szczeliny i drobny rumosz. Duże przeszkody wizualnie odpowiadają obszarom blokującym ruch.
- Ślady gąsienic, koleiny, drobne kamienie, przewody i stare płyty wzbogacają puste pola; są dekoracją, dopóki nie zostanie zaprojektowana mechanika.
- W pierwszym zakresie wysokość jest wizualna. Skarpy blokujące ruch wymagają spójnej kolizji i nie mogą pojawić się tylko jako grafika.
- Najwięcej szczegółów wokół baz i złóż; pomiędzy nimi spokojne tło pozwalające dostrzec oddziały.

## Animacja i efekty

Pierwszy zestaw: kroki, gąsienice, wydobycie, praca ekstraktora, błysk wystrzału i odrzut. Następnie etapy budowy (fundament, konstrukcja, ukończony budynek), uszkodzenia, krótki dym i wrak po zniszczeniu. Wraki początkowo są dekoracyjne, bez nowej kolizji.

Efekty muszą wynikać ze stanu symulacji, również po pauzie i odczycie zapisu. Animacja wiercenia nie może sugerować produkcji gazu bez operatora. Widoczność przez mgłę i czas życia wraków wymagają tych samych zasad co pozostałe obiekty; animacje nie ujawniają działań niewidocznego przeciwnika.

## Kamera i czytelność

Obecna kamera rozpoczyna od widoku całej mapy, przez co jednostki są bardzo małe. Proponuję start bliżej własnej bazy z zachowaniem Home jako widoku całości. Miniatura mapy nadal zapewnia orientację.

Przy oddaleniu najważniejsze są sylwetki, kolory drużyn, znaczniki i kontrast. Przy zbliżeniu pojawiają się szczegóły. Promień kolizji, miejsce kliknięcia i środek zaznaczenia pozostają związane z podstawą obiektu, a nie anteną lub końcem lufy. Cienie wszystkich obiektów padają w tym samym kierunku.

## Sposób wykonania

1. Oddzielić rysowanie od logiki gry i przygotować katalog wyglądu obiektów: rozmiar, punkt podstawy, warstwy, wariant drużyny i stany animacji.
2. W pierwszej iteracji poprawić proceduralne sylwetki, materiały i cienie. Statyczne części przygotowywać raz i przechowywać w buforach, zamiast odtwarzać wszystkie detale w każdej klatce.
3. Jeżeli ten poziom nie wystarczy, zastąpić konkretne obiekty grafikami z przezroczystym tłem i arkuszami animacji. Budynki potrzebują jednego ustalonego ujęcia, piechota kierunkowych klatek, a czołg osobnych warstw kadłuba i wieży. Perspektywa, oświetlenie i skala muszą być wspólne dla całego zestawu.
4. Jeśli celem stanie się pełne 3D, potraktować modele jako osobny etap produkcji. Modele mogą posłużyć do renderowania sprite'ów lub później do silnika 3D; dzisiejszych kształtów Canvas nie da się po prostu zamienić w gotowe modele.

Nie przesądzamy teraz narzędzia do modelowania ani zakupu paczek. Możliwe jest wykonanie całego pierwszego zakresu lokalnie. Grafika koncepcyjna służy ustaleniu wyglądu, ale sama nie stanowi gotowego zestawu zgodnych klatek animacji.

## Proponowana kolejność

**Pierwszy pakiet:** wszystkie cztery obecne typy jednostek, sześć typów budynków i przekaźnik, ruda i gaz, spójne cienie, podstawowe zróżnicowanie podłoża oraz bliższy widok początkowy. Celem jest rozpoznawalność każdego istniejącego obiektu.

**Drugi pakiet:** animacje pracy i ruchu, budowa etapami, uszkodzenia, odrzut i ograniczone czasowo ślady walki.

**Trzeci pakiet:** dopracowane dekoracje map, warianty biomów i ewentualny zestaw sprite'ów renderowanych z modeli 3D.

Przed pełnym pakietem można wykonać mały fragment pokazowy: czołg, robot, magazyn, ekstraktor, oba złoża i otaczający teren. Pozwala to ocenić styl na rzeczywistej planszy.

## Kryteria odbioru

- Każdy typ jednostki, budynku i zasobu rozpoznawalny po sylwetce przy zwykłym zbliżeniu.
- Czytelność własnych i wrogich obiektów na wszystkich powierzchniach.
- Animacje pracy odpowiadają wydobyciu, budowie i walce; pauza oraz mgła nie ujawniają dodatkowych informacji.
- Brak zmiany kosztów, kolizji, zasięgów i zachowania AI przy samym odświeżeniu grafiki.
- Brak przesunięcia klikalnego obszaru względem podstawy obiektu.
- Porównanie płynności przed i po na tej samej scenie z 60 jednostkami gracza, przeciwnikami i efektami; ustalenie limitu cząsteczek na podstawie pomiaru.
- Odczyt istniejących zapisów nie wymaga resetowania bitwy.

Powiązane: [Plan rozwoju](PLAN_ROZWOJU.md), [Pomysły](POMYSLY.md).

## Weryfikacja realizacji pakietu 2D

- Zaimplementowano `art.js` i podłączono go do `index.html` oraz renderowania w `app.js`.
- Nowe sylwetki: piechota, rakietowiec, czołg, robot; sześć budynków (centrum, koszary, fabryka, magazyn, ekstraktor, wieżyczka) oraz detale przekaźnika.
- Ruda i gaz mają skały, żyły mineralne i warianty wyczerpania; teren ma rumosz, szczeliny skał, płyty i ślady przy bazach.
- Podstawowe animacje ruchu, pracy i dymu uszkodzeń korzystają z czasu symulacji. Wygląd budynków jest buforowany.
- Nowa operacja zaczyna się z kamerą bliżej bazy; odczyt zapisu zachowuje zapisaną kamerę. Home nadal pokazuje całą mapę.
- Podczas przeglądu poprawiono warunki animacji robota: nie wierci podczas powrotu z pełnym ładunkiem, przy wyczerpanym gazie ani nie naprawia bez metalu.
- Kontrola składni i 63 testy logiki przeszły. Testy obejmują między innymi budowę przez robota, osłonę, utrzymanie pozycji, muzyczne tryby i zgodność zapisu.
- Wykonano oględziny scen lodowej i deszczowej w przeglądarce: opad na planszy, narastający śnieg i kałuże, falowanie wody, pożar, mniejsza fauna, praca robota oraz układ HUD są czytelne; konsola bez błędów.
- Niewykonane: pomiar płynności sceny z pełnym limitem jednostek i dłuższy test balansu podczas całej misji.
- Etapy budowy, odrzut lufy, wraki i dalsze biomy pozostają kolejnym pakietem z pierwotnej koncepcji; nie są częścią ukończonego zakresu.
- Pełne 3D i przygotowanie modeli 3D są odłożone, bez ustalonego terminu.

## Rozszerzenie 0.8

Dodano lodowy i bazaltowy biom, reaktor i laboratorium, kryształy, rusztowania z animacją budowy, odrzut wieży, błyski i odłamki eksplozji oraz ograniczone czasowo dekoracyjne wraki. Aktualne oględziny w przeglądarce i pomiar płynności nadal oczekują. Tryb 3D pozostaje odłożony.

## Rozszerzenie 0.10

- Opad został przeniesiony także do współrzędnych świata: krople i płatki przechodzą nad widocznym fragmentem planszy, zamiast działać wyłącznie jako nakładka ekranu.
- Vulkan otrzymał kałuże zwiększające rozmiar przez pierwsze 150 sekund operacji; Nivalis w tym samym czasie pokrywa się miękkimi plamami śniegu. Efekty wynikają z czasu symulacji, więc zatrzymują się na pauzie.
- Powierzchnia jezior jest animowana szesnastoma drobnymi liniami fal o różnych fazach, przyciętymi do kształtu zbiornika, oraz ruchomym refleksem.
- Obiekty mechaniczne poniżej 55% PW mają płomienie i dym; poniżej 28% liczba ognisk rośnie. Zwierzęta mają sylwetkę skalowaną do 68% poprzedniego rozmiaru i mniejszą kolizję.
- Osłona piechoty jest sygnalizowana łukiem nad chronioną jednostką. Fundamenty budynków pokazują pracującego robota, ponieważ postęp budowy jest teraz częścią symulacji gospodarki.


### Korekta pogody i efektów — 21.09.2026

- Opady mają stałe punkty lądowania w świecie gry, są rysowane nad obiektami i pod mgłą wojny. Usunięto zdublowany opad ekranowy oraz problem ujemnego modulo dla deszczu.
- Zwiększono widoczność i zasięg akumulacji śniegu i kałuż; kałuże mają nieregularne brzegi. Efekty gruntu poza kamerą pomijane.
- Ogień: animowane języki płomieni, żar, rozpraszający się dym i iskry, różne fazy animacji obiektów. Piechota i fauna nie płoną.
- Fauna: skala 0,46 zamiast 0,68, promień kolizji 8 zamiast 11.
- Podmenu zatrzymują tylko efekty dźwiękowe; trwająca muzyka menu zachowuje swoje zaplanowane nuty i czas.
- Weryfikacja: sceny Vulkan i Nivalis w przeglądarce, brak błędów konsoli; pełny zestaw 64 testów, w tym regresja ciągłości muzyki przy nawigacji.


### Helion — roślinność i burze pustynne

Kaktusy na Helionie zastępują niskie drzewa o szerokich koronach i kępy krzewów. Pierwsza burza zaczyna się po 90 sekundach bitwy, kolejne co 210 sekund. Burza trwa 55 sekund: narasta przez 12 s i wygasa przez ostatnie 15 s. Animowane smugi i warstwy pyłu przygaszają słońce; komunikat informuje o burzy. To efekt wizualny, bez zmiany zasięgu widzenia i statystyk walki. Cykl korzysta z czasu symulacji, więc respektuje pauzę oraz zapis gry.

Korekta burzy Helionu: smugi piasku zastąpione drobnymi punktami (promień 0,45–0,99 px). Gęstość dopasowana do powierzchni ekranu: 1800–9000 ziaren zamiast 180 kresek, trzy warstwy prędkości i przezroczystości.

Ziarna burzy złagodzone: opacity warstw 11–20% (wcześniej 28–52%), miękkie krawędzie i subtelne cieniowanie od jasnego beżu do piaskowego brązu. Wspólna tekstura ziarna jest buforowana.


### 0.11 — zintegrowana pogoda

Pogoda pobiera intensywność ze wspólnej symulacji. Na obu piaskowych planetach zwiększono widoczność miękko cieniowanego pyłu i dodano rozproszone tumany. Nivalis ma śnieżycę, Vulkan gęsty skośny deszcz i lokalne błyskawice. Doba trwa 360 s, noc przyciemnia teren, pojawiają się światła budowli i kierunkowe latarki. Ptaki i ryby rysowane są tylko w widocznych obszarach; ryby pozostają wewnątrz zbiorników. Aktualne parametry rozgrywki opisuje PLAN_ROZWOJU.md. Przegląd wizualny: tests/climate-browser.html.
