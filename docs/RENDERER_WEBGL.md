# Nowy renderer 2D na WebGL (PixiJS)

Data: 2026-09-26. Status: etapy 1–5 wykonane — prototyp (`prototyp-webgl.html`), wydzielenie rysowania (`render-canvas.js`), renderer WebGL w grze (`webgl/pixi-game-renderer.js`, wersja 0.21) z trybem awaryjnym Canvas 2D, ulepszenia grafiki (0.22), wysokość terenu, perspektywa 2,5D i WebGPU (0.23), a jako natywne obiekty PixiJS: grunt (0.24), modele (0.25), przyroda (0.26), poświata i efekty map (0.27) oraz interfejs na planszy (0.28). Cała plansza jest natywna — żadna warstwa Canvas nie jest przesyłana do karty graficznej (warstwy zostały jako tryb awaryjny). Rysunek Canvas 2D pozostaje jedynym źródłem wyglądu i trybem awaryjnym bez WebGL.

## Cel

Ładniejsza grafika 2D bez przechodzenia na 3D: prawdziwe oświetlenie dnia i nocy, światła jednostek i budynków, cienie zależne od słońca, poświata, animowana woda, miękka mgła wojny, pogoda z tysiącami cząsteczek i korekcja kolorów — przy lepszej wydajności niż obecny Canvas 2D. Rozgrywka, mapy, zapisy i sterowanie pozostają bez zmian.

## Ustalenia

- **Obecny renderer Canvas 2D zostaje jako tryb awaryjny** (słabsze komputery, brak WebGL, porównania). Wybór w Ustawieniach po integracji.
- **Biblioteka: PixiJS 8** (MIT), zapisana w projekcie jako `vendor/pixi.min.js` (wersja 8.21.0). Gra nadal działa offline i po otwarciu `index.html` z pliku — nie jest potrzebna instalacja ani serwer.
- **Modele nadal generowane kodem**, spójne z obecnym stylem: istniejące funkcje rysujące (BoardArt, AdvancedArt, PlanetArt, MapArt, Act2Art) rysują jednostki i budynki raz do tekstur, a WebGL wyświetla je i oświetla.

### Dlaczego PixiJS

| Kryterium | PixiJS 8 | Three.js | Phaser |
|---|---|---|---|
| Działa przez zwykły `<script>` z pliku (bez serwera) | tak — `pixi.min.js` z globalnym `PIXI` | nie od r160 (tylko moduły ES, blokowane przy `file://`) | tak |
| Charakter | wyspecjalizowany renderer 2D | silnik 3D | pełny framework gry (własna pętla, sceny, fizyka) |
| Pasuje do istniejącej architektury | tak — tylko warstwa rysowania; silnik gry bez zmian | wymaga przepisania rysowania na siatki 3D | narzuca własną strukturę gry |
| Droga do „skoków jakości” | własne shadery (np. mapy normalnych), filtry, WebGPU, siatki z perspektywą (2,5D) | pełne 3D | ograniczona do tego, co daje framework |

PixiJS daje najszerszą drogę rozwoju grafiki 2D bez przebudowy gry, a własne shadery pozwalają później dodać oświetlenie objętości (mapy normalnych), wysokość terenu czy lekką perspektywę.

## Architektura

```
engine.js + moduły zasad (bez zmian)          ← symulacja, zapisy, testy
        │  stan gry (game)
        ▼
warstwa rysowania — wspólny interfejs
   ├─ CanvasRenderer   (obecny kod z app.js, tryb awaryjny)
   └─ PixiRenderer     (nowy, webgl/pixi-renderer.js)
        │
app.js: interfejs, sterowanie, kamera, HUD (bez rysowania planszy)
```

Pierwszy krok integracji to wydzielenie rysowania z `app.js` (dziś ok. 2700 linii łączących interfejs, sterowanie i grafikę) do interfejsu `render(game, camera, selection)`, który obie implementacje spełniają.

### Warstwy nowego renderera

1. **Teren** — statyczna tekstura budowana raz z istniejących funkcji rysowania terenu (ta sama co w Canvas 2D).
2. **Woda i lawa** — animowany połysk i falowanie nakładane na kształty wody.
3. **Cienie** — cień każdej jednostki i budynku rzucany zgodnie z kierunkiem i wysokością słońca; wydłuża się rano i wieczorem, znika nocą.
4. **Jednostki i budynki** — sprite'y z atlasu generowanego kodem (kilka klatek ruchu), sortowane po głębokości.
5. **Efekty walki** — strzały, błyski wystrzałów, eksplozje.
6. **Latające wyspy** — nad terenem z przesunięciem paralaksy (wrażenie wysokości).
7. **Mapa światła** — tekstura oświetlenia: światło otoczenia zależne od pory dnia plus światła punktowe (drzewa, rzeka, lampy budynków, reflektory jednostek, wystrzały, eksplozje, błyskawice); mnożona przez scenę. Nocą widać to, co oświetlone.
8. **Poświata (bloom)** — rozmyte jasne elementy dodane po oświetleniu, żeby świecące rzeczy świeciły.
9. **Pogoda** — deszcz jako tysiące cząsteczek na GPU, błyskawice rozświetlające scenę.
10. **Mgła wojny** — z miękkimi, rozmytymi krawędziami zamiast siatki pól.
11. **Korekcja kolorów** — ciepły dzień, złota godzina, chłodna noc.

## Etapy

1. **Prototyp jednej mapy** (ten etap) — samodzielna strona z prawdziwą symulacją, przełączaniem dnia i nocy oraz efektami; bez interfejsu gry.
2. **Wydzielenie rysowania z `app.js`** do wspólnego interfejsu; Canvas 2D bez zmian wyglądu (sprawdzenie porównaniem obrazów).
3. **PixiRenderer dla wszystkich map i obiektów** — zaznaczenie, paski życia, budowa, punkty zbiórki, znaczniki kampanii, podgląd rozmieszczania; przełącznik w Ustawieniach, automatyczny powrót do Canvas 2D przy braku WebGL.
4. **Ulepszenia grafiki** — sprite'y w wyższej rozdzielczości, więcej klatek animacji, mapy normalnych dla budynków (oświetlenie objętości), stany zniszczeń.
5. **Opcjonalnie** — tryb WebGPU, wysokość terenu, lekka perspektywa 2,5D.

## Weryfikacja i ryzyka

- Testy logiki (`npm test`) nie zależą od grafiki i nadal chronią rozgrywkę.
- Strony przeglądarkowe (`tests/maps-browser.html` i nowe) do porównań wyglądu i pomiarów wydajności; budżet: 60 klatek/s w bitwie 200 jednostek na średnim sprzęcie.
- Ryzyka: pamięć tekstur na dużych mapach (tekstura terenu 4480 × 2880), słabsze karty graficzne (stąd tryb awaryjny), rozbieżność wyglądu między rendererami w okresie przejściowym.

## Prototyp

Uruchomienie: `prototyp-webgl.html` (w katalogu gry; przez `npm start` pod adresem http://127.0.0.1:4173/prototyp-webgl.html). Mapa **Świetlisty Gąszcz** z prawdziwą symulacją — armia rusza do ataku po 4 s, desanty wroga od 40 s. Przeciąganie mapy myszą, kółko przybliża.

Panel sterowania: pora dnia (Południe, Zmierzch, Noc, Doba automatyczna, suwak), Tropikalna ulewa, Pauza, osobne przełączniki każdego efektu (mapa światła, cienie, poświata, woda, deszcz i błyskawice, korekcja kolorów, mgła wojny) oraz licznik: klatki na sekundę, najgorsza klatka, liczba sprite'ów, świateł i tekstur.

Pliki: `vendor/pixi.min.js` (biblioteka), `webgl/pixi-renderer.js` (renderer, ok. 500 linii), `webgl/prototype.js` (strona, sterowanie, kamera, pętla symulacji), `prototyp-webgl.html`. Gra i jej renderer Canvas 2D nie zostały zmienione.

### Co zawiera

- Teren: jedna tekstura malowana tymi samymi funkcjami co w grze.
- Modele: jednostki i budynki rysowane obecnym kodem do tekstur (po 4 klatki ruchu), obracane przez GPU; w tej scenie ok. 30–40 tekstur.
- Mapa światła: światło otoczenia od południa przez złotą godzinę do chłodnej nocy; światła punktowe — świecące drzewa, rzeka i rozlewiska, lampy budynków, światło i reflektor każdej jednostki, błyski wystrzałów, eksplozje, błyskawice.
- Cienie: każdy obiekt rzuca cień zgodny z położeniem słońca — długi i skośny rano i wieczorem, krótki w południe, znika nocą.
- Poświata: rozmyte jasne elementy dodane po oświetleniu (drzewa, woda, okna, wystrzały).
- Woda: dwie warstwy przesuwającego się połysku przycięte do prawdziwych kształtów wody.
- Latające wyspy z paralaksą i kołysaniem.
- Ulewa: 900 cząsteczek deszczu, błyskawice rozświetlające scenę.
- Mgła wojny z miękkimi krawędziami (domyślnie wyłączona, żeby pokazać całą mapę).
- Korekcja kolorów zależna od pory dnia.

### Wyniki (lokalna przeglądarka, 2026-09-26)

- Przy widocznym panelu: **170 klatek/s** w dzień, w nocy, w ulewie i podczas walki; najgorsza klatka 6 ms. 170 to prawdopodobnie limit odświeżania ekranu, więc zapas jest większy.
- Czas procesora na klatkę (symulacja + aktualizacja sceny + zlecenie rysowania), mierzony ręcznym krokiem: średnio **1,9 ms**, najgorzej 2,7 ms. Dla porównania samo rysowanie w Canvas 2D kosztowało na tych mapach 2,5–3,0 ms. Czas pracy karty graficznej nie był mierzony osobno.
- Konsola bez błędów.

### Poprawki w trakcie

- Tekstura mapy światła o obniżonej rozdzielczości źle się skalowała (oświetlona była tylko część ekranu) — teraz ma rozmiar ekranu i jest odtwarzana przy zmianie rozmiaru okna.
- Krople deszczu były co klatkę rozrzucane od nowa — poprawione.
- Noc była zbyt ciemna do gry — światło otoczenia podniesione, lampy budynków i jednostek powiększone, dodana poświata okien.
- Przycisk „Zmierzch” ustawiony na rzeczywisty zmierzch według modelu doby w silniku.

### Ograniczenia prototypu

- Brak interfejsu gry: zaznaczania, pasków życia, rozkazów, budowy, znaczników kampanii (etap 3).
- Wieża czołgu obraca się razem z kadłubem (w Canvas 2D celuje osobno); brak błysku trafienia, ognia i dymu uszkodzeń, etapów budowy (tylko półprzezroczystość).
- Jedna mapa; inne mapy działają w tym samym rendererze (ta sama ścieżka), ale nie były oglądane.
- Uruchomienie bezpośrednio z pliku (`file://`) nie było sprawdzone w panelu testowym — biblioteka jest zwykłym skryptem, tekstury powstają z kodu, więc nie przewiduję problemów; do potwierdzenia na komputerze użytkownika przez dwukrotne kliknięcie `prototyp-webgl.html`.

## Etap 2 — wydzielenie rysowania (wykonany 2026-09-26)

Rysowanie planszy przeniesiono z `app.js` do `render-canvas.js`. `app.js` (2799 → 1920 linii) odpowiada za interfejs, sterowanie, kamerę i HUD, a w każdej klatce przekazuje rendererowi „widok”. Kod rysujący przeniesiono bez zmian treści — zmieniło się tylko to, skąd bierze stan (z widoku zamiast z domknięcia `app.js`).

### Interfejs renderera

```js
const renderer = createCanvasRenderer(canvas, minimapCanvas);
renderer.kind;              // "canvas"
renderer.fogCanvas;         // mgła wojny jako canvas (1 piksel = 1 pole siatki widoczności)
renderer.setGame(game);     // nowa lub wczytana gra: rozmiar mapy, tekstura terenu
renderer.refreshFog(game);  // odświeżenie mgły z siatki widoczności
renderer.render({           // jedna klatka: plansza, nakładki interfejsu na planszy i minimapa
	game, width, height, dpr, scale, camera,
	selected,               // Set identyfikatorów zaznaczonych obiektów
	colors,                 // kolory drużyn (0 = gracz)
	mouse, drag,            // kursor i prostokąt zaznaczania (współrzędne ekranu)
	building, wallDrag,     // podgląd budowy i przeciągania muru
});
```

Renderer WebGL (etap 3) ma spełnić ten sam interfejs; wybór renderera będzie jednym miejscem w `app.js`.

### Weryfikacja wyglądu

- Przed zmianą tymczasowy punkt pomiarowy w `app.js` narysował 7 scen (wszystkie rodzaje map, noc i ulewa, efekty walki, zaznaczenie ze ścieżkami, prostokąt zaznaczania, podgląd budowy, przeciąganie muru, punkt zbiórki, znaczniki kampanii, częściowa mgła, duża mapa) i zapisał skróty pikseli obrazu, 48 jego fragmentów i minimapy.
- Po zmianie wszystkie 7 scen: **obraz i minimapa identyczne co do piksela**. Punkt pomiarowy usunięto.
- W grze: start scenariusza (duża mapa), przełączenie jakości terenu (przebudowa tekstury przez renderer), wczytywanie — bez błędów konsoli.
- Nowa strona `tests/render-browser.html`: rysuje te sceny bezpośrednio przez `createCanvasRenderer`, sprawdza interfejs, niepusty obraz i powtarzalność, a przyciski „Zapisz wzorzec” / „Porównaj z wzorcem” wykrywają każdą zmianę pikseli przy dalszych pracach. Skróty obrazu scen o tym samym stanie gry są równe skrótom z gry sprzed zmiany, co potwierdza, że strona steruje rendererem tak samo jak gra. Wzorzec jest zapisywany w przeglądarce, bo drobne różnice wygładzania między przeglądarkami i kartami graficznymi zmieniają piksele.
- `npm test`: 154 testy, wszystkie przechodzą.

## Etap 3 — renderer WebGL w grze (wykonany 2026-09-26)

`webgl/pixi-game-renderer.js` — `createPixiGameRenderer({ gameCanvas, canvasRenderer, onContextLost })` zwraca (asynchronicznie) renderer z tym samym interfejsem co Canvas 2D (`kind: "webgl"`, `fogCanvas`, `setGame`, `refreshFog`, `render(view)`), a do tego `destroy()`, `snapshot()` (kopia klatki do testów) i `stats()`.

### Budowa: renderer hybrydowy

Zamiast przepisywać od razu setki funkcji rysujących, renderer WebGL korzysta z rysowania Canvas 2D podzielonego na fazy (`render-canvas.js`): teren, grunt, jednostki, niebo, oświetlenie, efekty po oświetleniu, mgła, nakładki, ekran, minimapa. `render()` Canvas 2D wykonuje je wszystkie po kolei (obraz identyczny ze wzorcem z etapu 2), a `drawLayer(ctx, view, phases)` maluje wybrane fazy na przezroczystą warstwę. Dzięki temu wszystko, co gra pokazywała do tej pory — modele, zaznaczenie, paski życia, etapy budowy, ścieżki, punkty zbiórki, znaczniki kampanii, podgląd budowy i muru, prostokąt zaznaczania — wygląda tak samo w obu rendererach.

Kolejność sceny WebGL (na płótnie nad planszą, `pointer-events: none`, więc sterowanie się nie zmienia):

| Warstwa | Źródło | Uwagi |
|---|---|---|
| Tło i teren | tekstura terenu z renderera Canvas | wspólna transformacja kamery |
| Połysk wody | dwie przesuwane tekstury szumu (`TilingSprite`) | maska z kształtów jezior i rzek (bez lawy, przepaści itp.) |
| Grunt | faza `ground` | złoża, wraki, przekaźniki, mury, ścieżki |
| Cienie od słońca | sylwetki modeli malowane tym samym kodem co plansza, przyciemnione | długie rano i wieczorem, krótkie w południe, brak w nocy; budynki „pochylone” od podstawy |
| Jednostki i niebo | fazy `units`, `sky` | fauna i latające obiekty |
| Mapa świateł | tekstura czyszczona kolorem otoczenia pory dnia, światła dodawane, wynik mnożony przez scenę | budynki, reflektory i lampy jednostek nocą, gaje, jaja, przetwórnie, świecąca woda i lawa, strzały, wybuchy; zastępuje fazę `lighting` z Canvas |
| Poświata | te same źródła, rozmyte (`BlurFilter`) i dodane | silniejsza w nocy |
| Efekty po oświetleniu | faza `post` | emisyjne efekty map, opady |
| Korekcja kolorów | `ColorMatrixFilter` | nasycenie i kontrast zależne od pory dnia |
| Mgła wojny | tekstura mgły z Canvas, rozmyta | miękkie krawędzie zamiast pól siatki |
| Nakładki | fazy `overlay`, `screen` | bez oświetlenia i korekcji — interfejs zawsze czytelny |

Minimapa jest rysowana jak dotąd, przez Canvas 2D.

### Ustawienia i tryb awaryjny

- Ustawienia → Renderer: „WebGL (PixiJS) — oświetlenie i efekty” (domyślnie) lub „Canvas 2D — tryb awaryjny”; przełączniki: oświetlenie dnia i nocy, cienie od słońca, poświata, połysk wody (`SceneFX.options.renderer/lights/shadows/bloom/water`, zapamiętywane z pozostałymi ustawieniami grafiki). Zmiana działa od razu, także w trakcie bitwy. Pod wyborem widać stan: aktywny renderer albo powód przejścia na Canvas 2D.
- Automatyczny powrót do Canvas 2D: brak biblioteki lub WebGL przy uruchomieniu oraz utrata kontekstu WebGL w trakcie gry (komunikat w grze i w Ustawieniach). Wybranie w Ustawieniach Canvas 2D, a potem znowu WebGL, uruchamia WebGL ponownie.
- Wyłączenie oświetlenia zostawia noc widoczną przez zwykłe przyciemnienie w korekcji kolorów.

### Weryfikacja

- `tests/render-webgl-browser.html` (nowa): te same sceny co test Canvas 2D (wspólny plik `tests/render-scenes.js`); sprawdza interfejs, położenie warstwy, pokrycie planszy względem Canvas 2D, to że noc jest ciemniejsza od dnia na każdej mapie, działanie przełącznika oświetlenia, cienie, zmianę rozmiaru planszy i `destroy()`; wynik PASS. Pozwala też obejrzeć dowolną scenę w południe, o zmierzchu i w nocy oraz zmierzyć czas klatki obu rendererów.
- `tests/render-browser.html`: renderer Canvas 2D po podziale na fazy nadal **identyczny co do piksela** z wzorcem z etapu 2 (7 scen).
- W grze: scenariusz Świetlisty Gąszcz w dzień i w nocy z ulewą, wczytanie zapisu, przełączanie WebGL ↔ Canvas 2D w trakcie gry, wymuszona utrata kontekstu (`WEBGL_lose_context`) → gra działa dalej na Canvas 2D z komunikatem; bez błędów konsoli. `tests/menu-browser.html`: 37/37, `npm test`: 154/154.
- Poprawki w trakcie: cień budynku odsunięty od podstawy wyglądał jak osobny ciemny czworokąt (teraz pochylony od podstawy i jaśniejszy); mapa świateł mnożona poza krawędzią mapy dawała czerń (dodane nieprzezroczyste tło planszy).

### Wydajność

Czas CPU na klatkę w panelu testowym (120 klatek, plansza 1130 × 522): Świetlisty Gąszcz nocą z ulewą — Canvas 2D 6,6 ms, WebGL 10,0 ms; duża mapa z mgłą — 0,6 ms i 1,0 ms. WebGL jest w tym etapie wolniejszy o ok. 50%, bo i tak maluje fazy przez Canvas 2D, a potem przesyła cztery warstwy jako tekstury; zysk to efekty, których Canvas 2D nie zrobi tanio. Oba mieszczą się w budżecie 60 klatek/s.

Uwaga (etap 4): te liczby mierzą tylko wysyłanie poleceń rysowania. Rysowanie Canvas 2D kończy się później, na karcie graficznej, więc renderer Canvas 2D wypadał w tym pomiarze zbyt korzystnie. Uczciwy pomiar — niżej, w etapie 4.

## Etap 4 — ulepszenia grafiki (wykonany 2026-09-26)

Wersja 0.22. Wszystko w trybie WebGL; renderer Canvas 2D bez zmian (porównanie z wzorcem: 7/7 scen identycznych co do piksela).

### Objętość budynków — mapy normalnych generowane z modeli

`webgl/model-light.js` rysuje każdy model budynku osobno tym samym kodem co plansza i wylicza z niego mapę wysokości: miękko rozmyta sylwetka daje ściany i krawędzie dachu, jasność rysunku — panele i detale. Z mapy wysokości powstaje mapa normalnych, a z niej — dla danego kierunku światła — półprzezroczysta nakładka: ciepłe rozjaśnienie po stronie światła i chłodny cień po drugiej. Kierunek słońca wędruje w ciągu doby ze wschodu na zachód (9 wypiekanych kierunków, płynnie mieszanych), o zmierzchu światło jest niższe i złote, w nocy budynki oświetla chłodno księżyc, a burza osłabia słońce. Nakładki są wypiekane leniwie i trzymane w pamięci (na model i kierunek).

Nakładka jest rysowana przez nowy punkt zaczepienia w fazie jednostek Canvas 2D (`view.shadeBody`) — zaraz po modelu, przed ogniem i paskami życia — więc kolejność rysowania (jednostki przed i za budynkiem) jest zachowana. Jednostki, które się obracają i mają osobno celujące wieże, zostały przy dotychczasowym wyglądzie.

### Stany zniszczeń

- Budynek poniżej 72% wytrzymałości pokrywa się sadzą i pęknięciami (wzór losowany stale dla danego modelu, przycięty do sylwetki), coraz wyraźniej wraz z uszkodzeniami. Istniejące płomienie i dym z Canvas 2D zostają.
- Płonące modele (poniżej 55%) świecą w mapie świateł migoczącym, ciepłym światłem i dodają poświatę — w nocy pożar oświetla otoczenie.
- Każdy wybuch w zasięgu wzroku zostawia wypalony grunt (lej po artylerii, ślad po zniszczonej jednostce lub budynku), który blednie po ok. 2,5 minuty czasu bitwy. Ślady nie trafiają do zapisu gry.

### Pogoda na GPU

- Deszcz (mapy z ulewą) i śnieg (mapy lodowe) jako cząsteczki Pixi w układzie mapy: ok. 4× gęstsze niż w Canvas 2D (do ok. 6000 w kadrze, zależnie od ustawienia „Cząsteczki pogody”), krople z ukosem od wiatru i rozpryskami na ziemi, płatki różnej wielkości. W trybie WebGL faza opadów Canvas 2D (`weather`) nie jest rysowana; faza `post` Canvas 2D rozdzieliła się na `glow` i `weather` bez zmiany obrazu.
- Piorun (ta sama chwila co błyskawica na niebie) rozjaśnia na moment mapę świateł całej planszy, mocniej w nocy; wyłącza go opcja „Błyski burzy”.

### Mniej warstw

Pomiar pokazał, że głównym kosztem renderera hybrydowego jest przesyłanie warstw Canvas do tekstur (ok. 1,8 ms na pełnoekranową warstwę na RX 6800 XT). Zamiast czterech warstw są trzy: świat (grunt, cienie, modele, niebo), poświata map w połowie rozdzielczości (jest miękka) i nakładki interfejsu. Cienie od słońca rysuje teraz Canvas 2D w warstwie świata (punkt zaczepienia `view.underUnits` przed modelami) z czarnych sylwetek modeli — wygląd jak w 0.21, bez osobnej warstwy.

### Ustawienia

Ustawienia → Renderer: dwa nowe przełączniki — „Objętość budynków (światło z kierunku słońca)” i „Ślady zniszczeń i pożarów” (`SceneFX.options.volume`, `scars`). Status renderera w menu głównym przed startem gry: „WebGL uruchomi się razem z planszą.”

### Weryfikacja

- `tests/render-webgl-browser.html`: dotychczasowe sprawdzenia oraz nowe — objętość w świetle słońca i księżyca zmienia obraz budynków, uszkodzony budynek dostaje sadzę, pęknięcia i pożar, wybuch zostawia ślad, deszcz i śnieg są cząsteczkami GPU (ok. 2600 i 3000 w scenach testowych, 0 na pustyni), piorun rozjaśnia planszę (jasność 19 → 28). Wynik: PASS.
- `tests/render-browser.html`: Canvas 2D identyczny ze wzorcem (7/7). `tests/menu-browser.html`: 37/37. `npm test`: 154/154.
- W grze: wczytany zapis na Świetlistym Gąszczu, popołudnie z nadchodzącą ulewą, przybliżenie — oświetlone lewe krawędzie budynków, ciemniejsza strona odwrócona od słońca, deszcz; konsola bez błędów.

### Wydajność (uczciwy pomiar)

Strona testowa po każdej klatce odczytuje jeden piksel, co wymusza dokończenie rysowania na karcie graficznej w obu rendererach (sam odczyt też kosztuje, więc liczby są zawyżone, ale porównywalne). Plansza 1130 × 522, RX 6800 XT, panel przeglądarki aplikacji:

| Scena | Canvas 2D | WebGL 0.21 (4 warstwy) | WebGL 0.22 (3 warstwy) |
|---|---|---|---|
| Świetlisty Gąszcz, noc, ulewa | 13,5–23 ms | ok. 21 ms | ok. 18,5 ms |
| Duża mapa z mgłą | 8–16 ms | ok. 15 ms | ok. 6,2 ms |

Efekty WebGL (światła, poświata, cienie, objętość, ślady) kosztują razem poniżej 1 ms. Najdroższa jest faza gruntu z Canvas 2D (na Świetlistym Gąszczu ok. 11 ms, m.in. złoża gazu ok. 3,5 ms i kałuże ok. 3,7 ms) — ten sam koszt ma renderer Canvas 2D.

### Dalej

- Grunt jako natywne obiekty Pixi (złoża, kałuże, ślady gąsienic, przekaźniki) albo pamięć podręczna jego nieruchomych części — największy możliwy zysk wydajności.
- Normalne i objętość także dla pojazdów (osobno kadłub i wieża) — wykonane w 0.43 (niżej). Więcej klatek animacji, modele w wyższej rozdzielczości przy dużym przybliżeniu.
- Etap 5 (opcjonalnie): WebGPU, wysokość terenu, lekka perspektywa 2,5D — wykonany, niżej.

### Poprawka po 0.22: migotanie przy przesuwaniu mapy

Zgłoszenie: przy przesuwaniu mapy środkowym przyciskiem obiekty migały. Zmiany:

- Warstwa poświaty map znowu ma pełną rozdzielczość. W połowie rozdzielczości drobne świecące punkty (zarodniki Świetlistego Gąszczu, blask Rzek Magmy) miały poniżej piksela i migały przy każdym przesunięciu kamery. Pomiar (przesunięcie o 1 piksel, porównanie klatek): 117 skoków jasności → 0 po wyłączeniu tej warstwy.
- Tekstura terenu ma mipmapy. Cała mapa jest jedną dużą teksturą, mocno pomniejszaną na ekranie; bez mipmap drobne detale (trawa, kamienie, rośliny) aliasowały się przy przesunięciach o ułamek piksela. Miara migotania terenu spadła o 40–50%.
- Środkowy przycisk nie uruchamia już przeglądarkowego przewijania strony (autoscroll) podczas przesuwania mapy.

Symulowane przesuwanie w grze nie wykazało znikania obiektów między klatkami; skąd dokładnie brało się migotanie widziane przez gracza — do potwierdzenia na jego komputerze.

## Etap 5 — wysokość terenu, perspektywa 2,5D i WebGPU (wykonany 2026-09-26)

Wersja 0.23. Wszystko wyłącznie graficzne: ruch, widoczność, zasady i zapisy gry bez zmian. Renderer Canvas 2D bez zmian (porównanie z wzorcem: 7/7).

### Wysokość terenu

`webgl/terrain-height.js` wylicza z mapy zgrubną mapę wysokości (komórka 12 jednostek): łagodne wzgórza z szumu zależnego od mapy, wyniesienia skał (płaskowyże, iglice, wychodnie, wraki, gaje, żywica, jaja, ruiny, wydmy) i zagłębienia wody (jeziora, rzeki, przepaście, szczeliny, lawa). Na tej podstawie dla danego kierunku słońca powstaje nakładka:

- zbocza zwrócone do słońca dostają ciepłe światło, odwrócone — cień;
- wysoki teren rzuca cienie (śledzenie promienia w stronę słońca po mapie wysokości): krótkie w południe, długie o świcie i zmierzchu; płaskowyże Wydm Bliźniaczych Słońc kładą długie cienie na piasek;
- w nocy rzeźbę oświetla słabo księżyc; burza osłabia słońce.

Oświetlenie każdego z 9 kierunków słońca liczy się po kilka wierszy na klatkę (do 2 ms), więc nie powoduje przycięć; dwa najbliższe kierunki są płynnie mieszane jak przy budynkach. Nakładka leży nad teksturą terenu, pod wodą, śladami wybuchów i modelami.

### Perspektywa 2,5D (opcja, domyślnie wyłączona)

Płaska klatka jest rysowana szerzej niż ekran (po 14% z każdej strony), do tekstury, i wyświetlana przez `PIXI.PerspectiveMesh` jako trapez: dół ekranu pokazuje środek klatki w skali 1:1, górna krawędź — całą jej szerokość. Dalsza część mapy maleje i zbiega się jak przy lekko pochylonej kamerze. Minimapa, zaznaczanie i rozkazy działają dalej na płaskiej klatce: `renderer.toFlat()` przelicza pozycję kursora odwrotnym przekształceniem rzutowym (to samo, którego używa siatka), a `app.js` stosuje je w jednym miejscu — w `pointer()`. Sprawdzone w grze: kliknięcie w czołg przez pochyloną planszę zaznacza czołg, ramka zaznacza jednostki, które widać w jej wnętrzu.

### WebGPU (eksperymentalny)

Ustawienia → Renderer: nowa opcja „WebGPU (PixiJS) — eksperymentalny”. Ten sam renderer i te same efekty na backendzie WebGPU biblioteki PixiJS. Jeśli WebGPU się nie uruchomi, PixiJS sam przechodzi na WebGL (komunikat w Ustawieniach), a bez obu — gra wraca do Canvas 2D. Utrata urządzenia WebGPU jest obsługiwana jak utrata kontekstu WebGL. Przełączanie WebGL ↔ WebGPU działa w trakcie gry.

Poprawka przy okazji: niszczenie starego renderera (przy przełączaniu) zwalnia kontekst WebGL, co wcześniej było brane za awarię i przełączało grę na Canvas 2D; teraz zamierzone zwolnienie jest pomijane.

### Inne zmiany

- Mgła wojny: rozmycie dopasowane do wielkości pól mgły na ekranie (zależne od przybliżenia) — krawędzie są miękkie i okrągłe zamiast złagodzonych „schodków” (te same schodki ma tryb Canvas 2D).
- Poświata map: jednorazowe sprawdzenie przy wczytaniu mapy (cała mapa w miniaturze, w nocy); na mapach bez świecących efektów ta warstwa nie jest ani rysowana, ani przesyłana. Duża mapa z mgłą: 14 ms → 6,4 ms na klatkę (pomiar jak w etapie 4).
- Ustawienia → Renderer: przełączniki „Wysokość terenu: rzeźba i cienie gór” (`SceneFX.options.relief`, domyślnie włączony) i „Perspektywa 2,5D (lekko pochylona kamera)” (`tilt`, domyślnie wyłączony).

### Weryfikacja

- `tests/render-webgl-browser.html` — nowe sprawdzenia: backend, płaskowyż wyżej od równiny (0,97 wobec 0,06), przepaść niżej od typowego terenu (−1,13 wobec 0,01), rzeźba terenu i cienie zmieniają obraz, pochylenie: górna krawędź pokazuje więcej mapy (lewy górny róg ekranu → −158 px płaskiej klatki), przekształcenie tam i z powrotem wraca w to samo miejsce (błąd < 0,01 px), obraz się zmienia, wyłączenie przywraca zwykłe współrzędne. Wynik PASS na WebGL i na WebGPU (`tests/render-webgl-browser.html?gpu=webgpu`, 25/25).
- W grze: WebGPU z pochyleniem na Wydmach Bliźniaczych Słońc, przełączenie na WebGL w trakcie gry, kliknięcie i ramka przez pochyloną planszę; konsola bez błędów.
- `tests/render-browser.html`: 7/7, `tests/menu-browser.html`: 37/37, `npm test`: 154/154.

### Wydajność (pomiar jak w etapie 4, RX 6800 XT, plansza 1130 × 522)

| Scena | Canvas 2D | WebGL 0.23 | WebGPU 0.23 |
|---|---|---|---|
| Świetlisty Gąszcz, noc, ulewa | 14–23 ms | ok. 18,5 ms | ok. 19,5 ms |
| Duża mapa z mgłą | ok. 8,5 ms | ok. 6,4 ms | ok. 6,9 ms |

Przy WebGPU strona testowa czeka na kartę graficzną inaczej (`onSubmittedWorkDone` zamiast odczytu piksela), więc porównanie z WebGL jest przybliżone. WebGPU nie przyspiesza jeszcze gry, bo i tak najdroższe jest rysowanie Canvas 2D i przesyłanie jego warstw; to wybór na przyszłość (natywne obiekty Pixi, własne shadery), dlatego jest oznaczony jako eksperymentalny. Rzeźba terenu po wypieczeniu nie kosztuje prawie nic; pochylenie dokłada jedno renderowanie do tekstury i ok. 28% większe warstwy.

### Dalej

- Grunt jako natywne obiekty Pixi — nadal największy zysk wydajności, także dla WebGPU.
- Wysokość terenu w logice (np. przewaga ostrzału z płaskowyżu, zasłanianie widoczności) — wymaga decyzji o zasadach i zmiany zapisów.
- Pochylenie z paralaksą: wyższe obiekty (latające jednostki, iglice) lekko przesunięte zgodnie z wysokością.

## Grunt jako natywne obiekty (wykonany 2026-09-27)

Wersja 0.24. Najdroższą częścią renderera hybrydowego było malowanie gruntu przez Canvas 2D w każdej klatce (złoża, przekaźniki, kałuże, ślady — na Świetlistym Gąszczu ok. 11 ms). `webgl/ground-native.js` przenosi go do PixiJS:

| Element | Jak jest rysowany teraz |
|---|---|
| Złoża rudy, gazu i kryształów, przekaźniki, szczątki | Trwałe sprite'y. Wygląd malowany raz tym samym kodem co w Canvas 2D (1,5× gęściej, z mipmapami) i malowany ponownie tylko przy zmianie stanu: ilości surowca (napis), właściciela przekaźnika, kolorów drużyn. Nieużywane wyglądy są zwalniane. |
| Unoszący się gaz, łuk przejmowania przekaźnika | Natywnie w każdej klatce (te same wzory ruchu; poza zasięgiem wzroku gaz stoi, jak w Canvas 2D). |
| Ślady gąsienic i butów, kurz za pojazdami | Pula sprite'ów, przezroczystość według wieku śladu. |
| Jeziora | Połysk i 16 linii zmarszczek w masce kształtu jeziora, tylko gdy jezioro jest widoczne. |
| Kałuże (światy z ulewą) i szron (światy lodowe) | Wypiekane do jednej tekstury całej mapy w połowie rozdzielczości — tylko gdy się zmieniają: rosną przez pierwsze półtorej minuty i znikają pod nowymi budynkami (ok. 5 ms raz na jakiś czas). |
| Ścieżki zaznaczonych jednostek | `PIXI.Graphics` z przerywaną linią jak `setLineDash([5, 8])`. |
| Animowane efekty map (także z wtyczek), siedliska, mury | Nadal Canvas 2D, nowa faza `groundTop` w warstwie świata. |

Obiekty natywne leżą między terenem (z rzeźbą, wodą i śladami wybuchów) a warstwą modeli, więc obejmuje je mapa świateł i mgła jak dotąd. Jedyna różnica w kolejności: animowane efekty map (np. dryfująca mgła, wiatr na wydmach) leżą teraz nad złożami zamiast pod nimi.

Zmiany we wspólnym kodzie (Canvas 2D bez zmian obrazu — porównanie z wzorcem 7/7): `BoardArt.resource(..., time = null)` pomija unoszący się gaz; `render-canvas.js` ma fazę `groundTop` i `paintNode()` (jeden przekaźnik na osobnym płótnie). `renderer.setNativeGround(false)` przywraca grunt z Canvas (porównania, tryb awaryjny).

### Weryfikacja

- `tests/render-webgl-browser.html`: grunt natywny wygląda jak grunt malowany przez Canvas w tym samym rendererze — na 7 scenach średnia różnica ≤ 0,40 (na 765), mocno różnych pikseli ≤ 0,041% (wygładzanie napisów i krawędzi); wydobycie odświeża wygląd złoża; złoża, przekaźniki i ślady są obiektami. PASS 28/28 na WebGL i na WebGPU.
- Porównanie z bliska: jezioro z zmarszczkami i przekaźnik — obraz taki sam.
- W grze: Wydmy Bliźniaczych Słońc, rozkaz ruchu dla oddziału (przerywane ścieżki, ślady), trwające wydobycie (napis złoża maleje); konsola bez błędów. `tests/render-browser.html` 7/7, `tests/menu-browser.html` 37/37, `npm test` 154/154.

### Wydajność (pomiar jak w etapie 4, RX 6800 XT, plansza 1130 × 522, ten sam przebieg)

| Scena | Grunt z Canvas | Grunt natywny |
|---|---|---|
| Świetlisty Gąszcz, noc, ulewa | 22,5 ms | 8,8 ms |
| Rzeki Magmy | 13,1 ms | 6,1 ms |
| Morze Wydm | 11,0 ms | 5,1 ms |
| Duża mapa z mgłą | 5,9 ms | 3,5 ms |

Renderer Canvas 2D na tych scenach: 8,5–23 ms — tryb WebGL jest teraz szybszy od niego wszędzie, z wszystkimi efektami.

### Dalej

- Modele jednostek i budynków jako natywne obiekty tą samą metodą (wygląd malowany raz, animacje natywnie) — usunęłoby ostatnią dużą warstwę Canvas.
- Animowane efekty map z wtyczek jako cząsteczki PixiJS.

## Modele jednostek i budynków jako natywne obiekty (wykonany 2026-09-27)

Wersja 0.25. `webgl/models-native.js` rysuje jednostki i budynki tą samą metodą co grunt: wygląd modelu maluje ten sam kod co plansza Canvas (`BoardArt`, `AdvancedArt`, `Act2Art`, `SceneFX.construction`, detale frakcji), do małej tekstury, i maluje ponownie tylko przy zmianie stanu.

### Stan modelu

Klucz wyglądu składa się z pól, które czyta kod rysujący (zebranych z `art.js`, `advanced-art.js`, `act2-art.js`, `planet-art.js`, `scene-fx.js`): typ, drużyna, frakcja, kolor, kierunek, celowanie wieży, ruch, strzał (3 poziomy odrzutu), trafienie, ładunek, praca robota lub ekstraktora, etap budowy (24 kroki), uszkodzenia (20 kroków), transportowani, stan bramy, kąt muru, archiwum, energia.

- **Kierunek:** 64 kroki; resztę (do ±2,8°) uzupełnia obrót sprite'a, więc obrót jest płynny, a wyglądów niewiele. Celowanie wieży czołgu: 32 kroki względem kadłuba.
- **Animacja:** czy wygląd zmienia się w czasie (kroki piechoty, gąsienice, wirniki, pompy, ogień), jest mierzone raz dla każdego rodzaju stanu — wygląd jest malowany w dwóch chwilach i porównywany. Nieruchome wyglądy są współdzielone przez wszystkie modele w tym samym stanie. Animowane dostają własną teksturę, odświeżaną do 20 razy na sekundę, z limitem 40 odświeżeń na klatkę — przy bardzo dużej liczbie animowanych modeli animacja zwalnia, zamiast przycinać grę.
- **Ostrość:** wyglądy są malowane w skali dopasowanej do przybliżenia (kroki ok. 1,25×: 0,4–3,2), więc są tak ostre jak na planszy Canvas. Po zmianie przybliżenia nowe dochodzą w ramach limitu na klatkę, a do tego czasu widać poprzednie.
- **Pamięć:** wyglądy nieużywane przez 10 s (albo 1 s, jeśli są w innej skali niż bieżąca) są zwalniane.

### Natywnie w każdej klatce

Położenie i obrót, cienie od słońca (sylwetki z `model-light.js`, jak w 0.21), cień pod modelem, pierścień zaznaczenia, przerywana ramka budowy, zasięg działka przeciwlotniczego i warsztatu, przerywane wiązki naprawy (przesuwające się), nakładki objętości i sadzy budynków (0.22), paski życia i budowy, napisy „BUDOWA · N s” (`PIXI.Text`), błyski trafienia oraz efekty walki (strzały z poświatą, wybuchy, pazury, znaczniki rozkazów). Siedliska stworzeń (wygląd malowany raz) i mury (wielokąty `PIXI.Graphics`) też są natywne. Kolejność jak w Canvas: modele latające nad naziemnymi, dalsze pod bliższymi; paski życia leżą nad wszystkimi modelami (w Canvas mogły je przykryć modele stojące niżej).

### Warstwy Canvas

Zamiast jednej warstwy świata są dwie, rysowane tylko wtedy, gdy mają co pokazać: **pod modelami** — animowane efekty map (także z wtyczek; sprawdzane raz przy wczytaniu mapy, na większości map puste) i **nad modelami** — zwierzęta, ptaki, ryby i latające skały. Liczba przesyłanych warstw jest więc taka jak wcześniej (albo mniejsza), a rysowanie modeli nie obciąża już Canvas.

Zmiany we wspólnym kodzie (Canvas 2D bez zmian obrazu — porównanie z wzorcem 7/7): `render-canvas.js` — funkcja `isWorking()` wydzielona z rysowania modelu, `entityWorking()` w API, faza `mapEffects`. `renderer.setNativeModels(false)` przywraca modele z Canvas (porównania, tryb awaryjny).

### Weryfikacja

- `tests/render-webgl-browser.html` (30/30 na WebGL i WebGPU), nowe sprawdzenia: modele natywne wyglądają jak modele z Canvas w tym samym rendererze — 7 scen i nowa scena „Bitwa · 120 jednostek”: średnia różnica ≤ 1,9 (na 765), mocno różnych pikseli ≤ 0,85% (fazy animacji i paski nad modelami); wyglądy nieruchome są współdzielone, animowane rozpoznane (w bitwie 110 modeli, 51 wyglądów, 20 rodzajów animowanych, 24 nieruchome), a warstwa świata z Canvas nie jest używana.
- Z bliska: baza z czołgiem, piechotą i centrum dowodzenia; plac budowy koszar (rusztowanie, ramka, pasek, napis, zaznaczenie) — obraz jak w Canvas. Przy pierwszej wersji (stała skala 1,5×) modele były przy dużym przybliżeniu wyraźnie bardziej miękkie (średnia różnica 6,8) — stąd skala dopasowana do przybliżenia (1,0).
- W grze: nocny atak na bazę (strzały, trafienia, uszkodzony robot z ogniem), panel budowy; konsola bez błędów. `tests/render-browser.html` 7/7, `tests/menu-browser.html` 37/37, `npm test` 154/154.

### Wydajność (pomiar jak w etapie 4, RX 6800 XT, plansza 1130 × 522, ten sam przebieg)

| Scena | Modele z Canvas | Modele natywne |
|---|---|---|
| Bitwa · 120 jednostek | 20,5 ms | 11,8 ms |
| Świetlisty Gąszcz, noc, ulewa | 7,4 ms | 6,6 ms |
| Rzeki Magmy | 6,0 ms | 4,2 ms |
| Morze Wydm | 4,7 ms | 3,8 ms |
| Duża mapa z mgłą | 3,4 ms | 2,4 ms |

Renderer Canvas 2D w bitwie: ok. 29 ms.

### Dalej

- Zwierzęta, ptaki, ryby i latające skały jako natywne obiekty — wtedy na większości map zostanie tylko warstwa interfejsu.
- Animowane efekty map z wtyczek jako cząsteczki PixiJS.

## Zwierzęta, ptaki, ryby i latające wyspy jako natywne obiekty (wykonany 2026-09-27)

Wersja 0.26. `webgl/fauna-native.js` przenosi ostatnią część planszy, która szła przez Canvas w każdej klatce (faza „nad modelami”), tą samą metodą co modele — wygląd malowany raz przez ten sam kod, ruch natywnie:

| Co | Wygląd | Ruch natywnie |
|---|---|---|
| Zwierzyna (lisy, zające, jaszczurki, jelenie…) | `AdvancedArt.animal()` — 16 faz kroku na gatunek, wspólne dla wszystkich zwierząt (3× gęściej) | położenie, kołysanie ciała (obrót) |
| Ptaki | `PlanetArt.bird()` — 12 położeń skrzydeł | przelot przez mapę jak w Canvas |
| Ryby | `PlanetArt.fish()` — jeden wygląd | krążenie w jeziorze, w masce kształtu jeziora |
| Latające wyspy (Świetlisty Gąszcz, Wiszące Szczyty) | `MapArt.island()` — każda wyspa raz, w spoczynku (z mipmapami) | unoszenie się całej wyspy |

Żeby dało się narysować jedno zwierzę, ptaka, rybę czy wyspę osobno, te fragmenty wydzielono z pętli w `advanced-art.js`, `planet-art.js` i `map-art.js` do osobnych funkcji, które wywołują też same pętle — obraz Canvas 2D bez zmian (porównanie z wzorcem 7/7). Różnica w trybie WebGL: cień wyspy unosi się razem z nią (±6 jednostek), bo wyspa jest malowana w całości.

Warstwa Canvas „nad modelami” rysuje teraz tylko niebo dodane przez wtyczki map (`MapArt.skyPlugins`, faza `skyPlugins`) i — jak efekty map — jest sprawdzana raz przy wczytaniu mapy; obecnie żadna wtyczka nie dodaje nieba, więc ta warstwa nie jest używana. Na mapach bez efektów i poświaty (np. Wydmy Bliźniaczych Słońc, Ostatni konwój) z Canvas przesyłany jest już tylko interfejs.

### Weryfikacja

- `tests/render-webgl-browser.html` (32/32 na WebGL i WebGPU), nowe sprawdzenia: z bliska jezioro z 7 rybami, zwierzyną i ptakami (średnia różnica względem Canvas 0,044) oraz latająca wyspa (0,074); na mapie bez efektów i wtyczek nieba jedyna warstwa Canvas to interfejs. Test gruntu porównuje teraz sam grunt (modele z Canvas w obu klatkach, bez dopiekania rzeźby między nimi) — wcześniej na WebGPU wchodziły do niego różnice modeli.
- W grze: Świetlisty Gąszcz, zwierzęta przy bazie; konsola bez błędów. `tests/render-browser.html` 7/7, `tests/menu-browser.html` 37/37, `npm test` 154/154.

### Wydajność (pomiar jak w etapie 4, RX 6800 XT, plansza 1130 × 522)

| Scena | 0.25 | 0.26 | Warstwy Canvas w 0.26 |
|---|---|---|---|
| Bitwa · 120 jednostek | 11,8 ms | 11,3–11,5 ms | poświata, interfejs |
| Świetlisty Gąszcz, noc, ulewa | 6,6 ms | 6,2–6,4 ms | poświata, interfejs |
| Rzeki Magmy | 4,2 ms | 3,9–4,7 ms | poświata, interfejs |
| Morze Wydm | 3,8 ms | 3,7 ms | efekty map, interfejs |
| Duża mapa z mgłą | 2,4 ms | 2,2–2,4 ms | interfejs |

Zysk jest mały, bo ta faza była tania; ważniejsze, że przesyłana jest o jedną warstwę mniej, co bardziej pomaga przy dużych ekranach.

### Dalej

- Poświata map (świecące zarodniki, blask lawy) i animowane efekty map z wtyczek jako cząsteczki PixiJS — wtedy z Canvas zostanie tylko interfejs na planszy.

## Poświata i efekty map jako natywne obiekty (wykonany 2026-09-27)

Wersja 0.27. Ostatnie fazy świata rysowane przez Canvas — poświata map (`MapArt.glow`: świecące zarodniki i gaje, blask lawy i jezior, iskry nad lawą, jaja i migające światła przetwórni) i animowane efekty map (`MapArt.effects`: mgła nad przepaściami, wiejący piasek, kręgi czerwia pustyni, dryfująca mgła, dym przetwórni) — są teraz odtwarzane natywnie przez `webgl/canvas-replay.js`.

### Nagranie i odtworzenie

Zamiast przepisywać każdy efekt (i każdą wtyczkę map) osobno, rysunek wykonuje ten sam kod co w Canvas, ale na **kontekście nagrywającym**: obiekcie z tym podzbiorem API `CanvasRenderingContext2D`, którego używają mapy (ścieżki, łuki, elipsy, krzywe, `fill`, `stroke`, `fillRect`, gradient kołowy, przezroczystość, tryb „lighter”, `save`/`restore`). Nagranie jest w każdej klatce zamieniane na obiekty PixiJS — bez malowania na procesorze i bez przesyłania tekstur:

| Wywołanie Canvas | Obiekt PixiJS |
|---|---|
| `fillRect` z gradientem kołowym (środek → przezroczystość) | sprite miękkiego koła, zabarwiony |
| wypełnione koło lub elipsa | sprite koła (z mipmapami, także dla drobnych zarodników) |
| `fillRect` jednolitym kolorem | zabarwiony prostokąt |
| inne ścieżki: linie, krzywe, łuki, wielokąty | `PIXI.Graphics` (wypełnienie lub obrys) |
| tryb „lighter” | mieszanie addytywne; w poświacie zwykłe (niżej) |

Obiekty pochodzą z puli i są podpinane do sceny ponownie tylko wtedy, gdy zmieni się ich kolejność.

**Poświata jako grupa.** W Canvas poświata była osobną warstwą: jej elementy dodawały się do siebie („lighter”) na przezroczystym tle, a warstwa kładła się zwykłym mieszaniem na planszę. Wierne odtworzenie wymaga dodatkowego przebiegu całego ekranu (filtr kosztował ok. 0,6 ms), więc elementy poświaty są kładzione zwykłym mieszaniem: wynik jest identyczny tam, gdzie się nie nakładają, a przy nakładaniu różnica jest drugiego rzędu (przezroczystości są małe) — pomiar: średnia różnica 0,26 na 765.

**Tryb awaryjny.** Jeśli rysunek użyje czegoś spoza podzbioru (np. wtyczka z `drawImage`, przekształceniami, przerywaną linią, gradientem liniowym), nagranie jest odrzucane, a ta faza wraca do swojej warstwy Canvas (`under` dla efektów, `post` dla poświaty) — w tej samej klatce. `renderer.stats().replay` podaje powód; `renderer.setNativeEffects(false)` wymusza warstwy Canvas (porównania).

Ciekawostka zachowana bez zmian: iskry nad lawą (Rzeki Magmy) biorą położenia z generatora liczb, z którego kod map losuje tylko dla strumieni w kadrze — przy przesuwaniu kamery iskry przeskakują, tak samo jak w Canvas 2D.

### Weryfikacja

- `tests/render-webgl-browser.html` (35/35 na WebGL i WebGPU), nowe sprawdzenia: poświata i efekty map natywnie wyglądają jak z Canvas (7 scen, dzień i noc: średnia różnica ≤ 0,264); na wszystkich mapach testowych z Canvas zostaje tylko warstwa interfejsu; wtyczka rysująca coś nie do odtworzenia (`translate`) wraca do warstwy Canvas z podanym powodem.
- Z bliska: Świetlisty Gąszcz nocą — gaje i zarodniki jak w Canvas.
- W grze: Morze Wydm, wiejący piasek; konsola bez błędów. `tests/render-browser.html` 7/7 (kod map bez zmian), `tests/menu-browser.html` 37/37, `npm test` 154/154.

### Wydajność (pomiar jak w etapie 4, mediana z 3 naprzemiennych przebiegów)

| Scena | Warstwy Canvas | Natywnie |
|---|---|---|
| Martwy Statek (mgła, jaja, przetwórnie) | 4,12 ms | 3,41 ms |
| Rzeki Magmy (blask lawy, iskry) | 3,84 ms | 3,43 ms |
| Świetlisty Gąszcz, noc (444 elementy poświaty) | 6,43 ms | 6,38 ms |
| Morze Wydm (wiejący piasek) | 3,49 ms | 3,49 ms |

Po tym kroku każda mapa testowa przesyła do karty graficznej jedną teksturę Canvas na klatkę — interfejs na planszy.

### Dalej

- Interfejs na planszy (znaczniki kampanii, punkty zbiórki, podgląd budowy, prostokąt zaznaczenia, słońce, księżyc, błyskawice) tą samą metodą nagrania — wtedy przesyłanie warstw zniknie całkiem.

## Interfejs na planszy natywnie — koniec przesyłania warstw (wykonany 2026-09-27)

Wersja 0.28. Ostatnia warstwa Canvas — interfejs na planszy (fazy `overlay` i `screen`: znaczniki kampanii z napisami i postępem, punkty zbiórki, zasięgi i podgląd budowy, przeciąganie muru z licznikiem, prostokąt zaznaczenia, winieta, słońce, drugie słońce, księżyc z cieniowaniem, gwiazdy, śnieg i błyskawice na niebie, burza piaskowa) — jest nagrywana tak jak poświata i efekty map (0.27) i odtwarzana jako obiekty PixiJS nad mgłą wojny.

### Rozszerzony zapis (`webgl/canvas-replay.js`)

Interfejs używa więcej możliwości Canvas niż efekty map, więc kontekst nagrywający obsługuje teraz także:

| Możliwość Canvas | Jak jest odtwarzana |
|---|---|
| `translate`, `scale`, `rotate`, `transform`, `setTransform` | macierz śledzona przy zapisie; punkty zapisywane już przekształcone (jak robi to płótno) |
| `fillText`, `font`, `textAlign`, `textBaseline`, `measureText` | `PIXI.Text` współdzielone według treści i stylu, rysowane w rozmiarze, w jakim widać je na ekranie (ostre także w przybliżeniu); pomiar przez prawdziwe płótno |
| `setLineDash`, `lineDashOffset` | kreski wyliczane na łamanej (także przesuwające się, np. trasa konwoju i znaczniki) |
| `shadowBlur`, `shadowColor` przy obrysie (błyskawica) | szerszy, słaby obrys pod spodem |
| gradient liniowy, gradient z kilkoma stopniami lub promieniem wewnętrznym (winieta), gradient w obszarze przycięcia (`clip`, cieniowanie księżyca), gradient w wypełnionej ścieżce | malowany raz do małej tekstury (do 512 px) i trzymany w pamięci podręcznej; klucz liczony względem prostokąta, więc ten sam wygląd w innym miejscu ekranu korzysta z tej samej tekstury |
| `clip` przy innych kształtach | przyjmowany, gdy kształt leży wewnątrz obszaru przycięcia (kratery księżyca) |
| `drawImage` (np. ziarna burzy piaskowej) | sprite z tekstury tego obrazu |
| `strokeRect`, `clearRect`, `canvas.width/height` | obsłużone (warstwa jest nagrywana przez tę samą funkcję `drawLayer`, która malowała warstwę Canvas) |

Interfejs jest nagrywany w pikselach warstwy (z uwzględnieniem gęstości ekranu) i wyświetlany w skali 1/dpr, więc wygląda jak dotychczasowa warstwa. Gdy nagranie się nie uda (np. obrót tekstu, `putImageData`, `isPointInPath`), w tej samej klatce wraca warstwa Canvas `overlay`; `renderer.setNativeOverlay(false)` robi to na życzenie.

### Weryfikacja

- `tests/render-webgl-browser.html` (37/37 na WebGL i WebGPU), nowe sprawdzenia: interfejs natywnie wygląda jak z Canvas (7 scen, dzień i noc: średnia różnica ≤ 1,10 — mapa różnic pokazuje tylko pierścienie winiety różniące się o 1/255 i krawędzie linii); na wszystkich mapach testowych nie jest przesyłana żadna warstwa Canvas; rysunek interfejsu z nieobsługiwaną operacją wraca do warstwy Canvas z podanym powodem.
- Z bliska: Ostatni konwój — znaczniki postojów z tekstem, trasa konwoju, podgląd muru z napisem „23 segmentów · 1035 metalu” — jak w Canvas.
- W grze: Morze Wydm, podgląd wieżyczki pod kursorem i przerywany zasięg budowy; konsola bez błędów. `tests/render-browser.html` 7/7, `tests/menu-browser.html` 37/37, `npm test` 154/154.

### Wydajność (mediana z 3 naprzemiennych przebiegów, warstwa Canvas → natywnie)

| Scena | 1130 × 522 | 1920 × 1080 |
|---|---|---|
| Bitwa · 120 jednostek | 11,08 → 10,32 ms | 10,34 → 10,61 ms (w granicach szumu) |
| Świetlisty Gąszcz, noc | 7,02 → 6,74 ms | 7,58 → 6,72 ms |
| Rzeki Magmy | 3,81 → 3,52 ms | — |
| Morze Wydm | 3,35 → 3,12 ms | — |
| Martwy Statek | 3,69 → 3,57 ms | — |
| Duża mapa z mgłą | 2,11 → 1,90 ms | 2,41 → 2,23 ms |

Na RX 6800 XT przesłanie jednej warstwy nie było dużym kosztem, więc zysk z ostatniego kroku jest umiarkowany; na słabszych kartach i większych ekranach powinien być większy. Cała droga od 0.21: Świetlisty Gąszcz nocą w ulewie 22,5 ms (warstwy Canvas, 0.23) → ok. 6,7 ms.

### Co zostało w Canvas

- Minimapa (osobne małe płótno obok planszy, nieprzesyłane do karty graficznej).
- Tekstura terenu i mgła wojny — malowane rzadko (teren raz na mapę, mgła przy zmianie widoczności) i przesyłane tylko wtedy.
- Wygląd wszystkich obiektów — rysowany przez kod Canvas raz na stan i trzymany jako tekstury.

### Dalej

- Nagranie jest wykonywane w każdej klatce (koszt procesora, ale bez malowania i przesyłania). Kolejny krok to pamiętanie nagrań niezmiennych między klatkami (np. winieta, statyczne znaczniki) albo przejście najczęstszych elementów interfejsu na obiekty tworzone raz.

## Latarki i reflektory jak w Canvas (wersja 0.29, 2026-09-27)

Uwaga gracza: w trybie Canvas nocne światła piechoty i pojazdów wyglądały jak latarka i reflektor (wąski stożek przed jednostką), a w WebGL były dwiema okrągłymi plamami światła — co pasowało gorzej. Teraz:

- **Piechota i pojazdy** — stożek ±0,3 rad z lampy na przodzie modelu (tekstura klina z miękkimi bokami, jasność maleje z odległością), w dwóch rolach:
  - w **mapie świateł**: oświetla teren i obiekty przed jednostką (zasięg 1,5× zasięgu z Canvas: 112 dla piechoty, 172 dla pojazdów);
  - jako **widoczna smuga w powietrzu**: osobna, ostra warstwa addytywna nad oświetloną sceną, o tej samej geometrii i jasności co w Canvas (zasięg 75 / 115, kolor `#fff1b1`, 42% przy lampie), z jasnym punktem lampy i odrobiną poświaty.
  - Słaba poświata wokół jednostki zostaje, żeby była widoczna w ciemności.
- **Samoloty** — bez stożka na ziemi (jak w Canvas); światła nawigacyjne na wysokości lotu (czerwone, zielone, białe) w ostrej warstwie, żeby nie ginęły w rozmyciu poświaty.
- **Budynki** — bez zmian (ciepłe światło wokół).

Weryfikacja: porównanie nocnych zbliżeń Canvas / WebGL (baza z piechotą, czołgiem i robotami; myśliwiec), nowe sprawdzenie w `tests/render-webgl-browser.html` (stożki nocą, brak w dzień), 38/38 na WebGL i WebGPU. (Liczby sprawdzeń podawane przy wersjach 0.23–0.28 były zawyżone o jeden — liczony był też wiersz podsumowania; poprawione.)

## Domknięcie renderera (wersja 0.30, 2026-09-27)

### Pomiar płynności w prawdziwej pętli gry

Nowa strona `tests/benchmark-browser.html`: prawdziwa symulacja bitwy (ok. 60 jednostek dosyłanych na bieżąco, nocna ulewa z piorunami na Świetlistym Gąszczu) rysowana w `requestAnimationFrame`, kolejno w trybach Canvas 2D, WebGL i WebGPU. Mierzy rzeczywiste odstępy między klatkami (czyli także pracę karty graficznej), odsetek klatek dłuższych niż 20 ms i czas rysowania na procesorze. Wyniki zależą od sprzętu — stronę można otworzyć na dowolnym komputerze (`npm start`, potem `/tests/benchmark-browser.html`).

Wyniki na RX 6800 XT (ekran 144 Hz, plansza 1920 × 1080, 66 jednostek, po 6 s na tryb):

| Tryb | kl./s | 95% klatek do | klatki > 20 ms | rysowanie CPU (śr. / 95%) |
|---|---|---|---|---|
| Canvas 2D | 84–97 | 17,7 ms | 1,5–1,8% | 3,3–3,8 / 5,1 ms |
| WebGL — przed poprawką | 138 | 17,6 ms | 2,1% | 5,4 / 14,0 ms |
| WebGL | 152 | 11,8 ms | 0% | 5,1 / 8,2 ms |
| WebGPU | 146 | 11,8 ms | 1% | 4,8 / 8,0 ms |

Tryb Canvas 2D ma niższy czas procesora, ale jego rysowanie kończy się na karcie graficznej i ogranicza liczbę klatek; tryby PixiJS dochodzą do częstotliwości ekranu.

### Poprawki

- **Skoki czasu klatki w bitwie** (pomiar wyżej): wygląd modelu miał w kluczu 20 stopni uszkodzeń, więc raniona jednostka co chwilę dostawała nowy wygląd, a nowy rodzaj stanu uruchamiał test ruchu (dwa malowania i odczyt pikseli). Teraz uszkodzenia liczą się tylko na progach, na których zmienia się rysunek (sadza 0,72, ogień 0,55, dym 0,45, silny ogień 0,28 — wielkość płomieni i tak jest w animowanej części), a test ruchu jest malowany w małej skali, na płótnie przygotowanym do odczytu. 95. percentyl czasu rysowania: 14,0 → 8,2 ms.
- **Cień latającej wyspy** zostaje na ziemi, a unosi się tylko wyspa (`MapArt.island(..., shadow = false)` i osobny cień w PixiJS; Canvas bez zmian). Różnica względem Canvas w teście wyspy: 0,074 → 0,039.
- **Iskry nad lawą nie przeskakują przy przesuwaniu kamery** — w obu trybach. Kod map losował położenia tylko dla strumieni lawy w kadrze, więc przesunięcie kamery zmieniało kolejność losowania. Teraz liczby są losowane przed odrzuceniem strumieni spoza kadru; sprawdzone: wszystkie iskry widoczne w dwóch różnych kadrach mają to samo położenie. Zmienia to obraz Canvas na Rzekach Magmy — wzorzec `tests/render-browser.html` zapisany ponownie (pozostałe 6 scen bez zmian).
- **Pamięć:** pamięć podręczna kolorów w odtwarzaniu nagrań zapamiętywała każdy napis koloru; poświata co klatkę tworzy nowe `rgba(…)` ze zmienną przezroczystością, więc rosła bez końca. Teraz `rgb()/rgba()` są parsowane bez pamięci podręcznej, a pozostała jest ograniczona. Tekstury rzeźby terenu są zwalniane przy zmianie mapy.
- **Kontekst nagrywający:** znane metody i właściwości są zwykłymi polami obiektu, a tylko nieznane nazwy trafiają do pułapki `Proxy` (wykrywanie nieobsługiwanych operacji bez zmian). Pomiar pokazał, że czas nagrania to w praktyce koszt samego rysunku map (np. 444 elementy poświaty Świetlistego Gąszczu ≈ 1,2 ms, tyle samo co w Canvas); zapamiętywanie całych nagrań nie ma sensu, bo prawie wszystko w nich pulsuje lub migocze w czasie.

### WebGPU

Etykieta „eksperymentalny” zdjęta: tryb przechodzi wszystkie sprawdzenia (38/38), w pomiarze płynności jest równy WebGL, obsługuje utratę urządzenia i sam przechodzi na WebGL, gdy WebGPU jest niedostępne. Domyślnym trybem zostaje WebGL — działa w większej liczbie przeglądarek.

### Weryfikacja

`tests/render-webgl-browser.html` 38/38 na WebGL i WebGPU, `tests/render-browser.html` 7/7 (nowy wzorzec), `tests/menu-browser.html` 37/37, `npm test` 154/154, `tests/benchmark-browser.html` — wyniki wyżej.

### Stan

Renderer jest domknięty: cała plansza natywnie, tryb Canvas 2D jako źródło wyglądu i tryb awaryjny, pomiary i testy porównawcze dla każdej części. Dalsze kroki należą już do rozgrywki (nowe jednostki, budynki, tryby) — wygląd nowych rzeczy wystarczy narysować w Canvas, a trafi do WebGL tą samą drogą.

## Poprawka: szara plansza na mapach kampanii (wersja 0.31, 2026-09-27)

Zgłoszenie: na mapach kampanii (Szkolenie, Iskra na Eos) w trybie WebGPU plansza była szara.

**Przyczyna.** Przekaźnik może mieć postęp przejmowania, którego nikt nie prowadzi (zanikający postęp, `capturing = −1`; na Szkoleniu już na starcie). Natywny grunt (0.24) brał kolor łuku postępu z `colors[capturing]`, czyli `undefined`. Canvas ignoruje niepoprawny kolor, a PixiJS rzuca wyjątek — przerywał on całą klatkę, więc zostawało samo tło. Dotyczyło to WebGL tak samo jak WebGPU.

**Poprawka.**
- Kolor łuku: kolor drużyny przejmującej, a gdy jej nie ma — kolor przekaźnika (w Canvas łuk ma wtedy kolor pozostały po poprzednim rysunku). Podobne zabezpieczenie dla koloru strzałów.
- **Odporność renderera:** wyjątek w natywnej części (grunt, modele z przyrodą) nie zostawia już szarej planszy — ta część wraca do rysowania przez Canvas, klatka rysuje się od razu jeszcze raz, a w konsoli pojawia się ostrzeżenie; lista awarii jest w `renderer.stats().failures`. Błąd przy nagrywaniu lub odtwarzaniu poświaty, efektów map lub interfejsu działa jak nieobsługiwana operacja (warstwa Canvas w tej samej klatce).

**Weryfikacja.** Nowe sprawdzenia w `tests/render-webgl-browser.html`: mapy kampanii (Szkolenie, Iskra na Eos) rysowane bez błędów przez minutę gry; wymuszony wyjątek w natywnym gruncie → grunt wraca do Canvas, plansza rysuje się dalej. 39/39 na WebGL i WebGPU. W grze: kampania → Iskra na Eos na WebGPU — plansza poprawna, konsola bez błędów. `tests/render-browser.html` 7/7, `tests/menu-browser.html` 37/37, `npm test` 154/154.

## Poprawka: gra zwalnia po kilku minutach (wersja 0.34.1, 2026-09-27)

Zgłoszenie: po kilku minutach potyczki (poziom łatwy, Cichy Horyzont) gra zaczyna zwalniać, choć licznik rysowania pokazuje ok. 1,5 ms. Pomiar w przeglądarce (przyspieszona potyczka z pełnym rysowaniem WebGL) wykazał dwie przyczyny; symulacja (także nowy dowódca AI) kosztowała ok. 2 ms na krok przy 78 jednostkach w walce i nie rosła z czasem.

- **Nowa tekstura złoża przy każdej jednostce rudy.** Wygląd złoża był zapamiętywany według dokładnej ilości (`"o|" + Math.floor(amount)`), więc wydobycie malowało i wysyłało na kartę nową teksturę 150×130 przy każdej zmianie napisu „RUDA · N”; roboty dowódcy AI wydobywały płynnie, co klatkę. Teraz rysunek złoża jest zapamiętywany według progu, od którego zależy (liczba kamieni: `BoardArt.resourceLook`, `crystalLook`), a napis jest osobnym tekstem PixiJS, odświeżanym tylko przy zmianie liczby (`BoardArt.resourceLabel`, `crystalLabel`; Canvas bez zmian). Roboty AI wydobywają porcjami co 0,5 s, jak roboty gracza. Tekstur gruntu w pomiarze: stale 4 zamiast 40 → 220.
- **Burza piaskowa w nakładce ekranu.** Do 9000 ziaren piasku było co klatkę nagrywanych i odtwarzanych jako osobne obiekty (warstwa nakładek: 9085 elementów zamiast ~70): ok. 8–10 ms na klatkę i przyrost pamięci do ok. 160 MB w każdej burzy (co 210 s). Ziarna są teraz pulą cząstek `PIXI.ParticleContainer` (bez tworzenia obiektów co klatkę), liczoną tą samą funkcją co w Canvas (`PlanetArt.sandGrains`); nagrywanie pomija je (`view.nativeGrains`). Burza: ok. 2 ms na klatkę, pamięć 20–55 MB. Przy okazji smugi mgły piaskowej są rysowane jako koło zamiast kwadratu — w WebGL nie wychodzą już kwadratowe plamy (w Canvas obraz bez zmian, bo gradient kończy się na brzegu koła).

Weryfikacja: `tests/render-webgl-browser.html` — PASS na WebGL i WebGPU (test wydobycia sprawdza teraz, że zmienia się napis, a nie powstaje nowa tekstura; test awarii gruntu wywołuje wyjątek w napisie złoża), `tests/render-browser.html` — PASS, wzorzec zapisany ponownie (zmiany w scenach potyczek pochodzą od dowódcy AI z 0.34), `npm test` 194/194.

## Właściwa przyczyna zwalniania: robot bez trasy (wersja 0.34.2, 2026-09-27)

Poprawka 0.34.1 nie pomogła — na zapisie gracza (Cichy Horyzont, łatwy, 11,5 min, ok. 130 obiektów, WebGPU) gra nie przyspieszała nawet po ponownym wczytaniu, więc przyczyna była w stanie rozgrywki, nie w wycieku. Pomiar tego zapisu: **158 ms na krok symulacji**, prawie w całości jeden robot budujący wieżyczkę tuż przy skale.

- Punkt budowy był wolny, ale środek jego kratki siatki tras leżał w pasie ochronnym skały, więc A* nigdy nie wchodził do kratki celu i przeszukiwał całą mapę (ok. 30 000 sprawdzeń przeszkód, każde przegląda wszystkie obiekty w poszukiwaniu murów), po czym zwracał pustą trasę.
- Robot bez trasy szukał jej od nowa w każdym kroku symulacji (`moveWorker`: `!e.path.length` wymuszało nowe szukanie).

Poprawki w `engine.js`: kratka celu jest zawsze przejezdna dla A* (sam punkt celu jest sprawdzany wcześniej); przejezdność kratek jest liczona raz na jedno szukanie; robot bez trasy czeka do następnej próby (co 1,5 s), a po czterech nieudanych próbach przerywa zadanie z komunikatem „Robot nie może dotrzeć do celu i przerwał zadanie.” Błąd był w silniku od dawna — ujawniał się przy budowie tuż obok przeszkody.

Wynik na zapisie gracza: 158 ms → 2,2 ms na krok; robot dochodzi i kończy wieżyczkę. W przeglądarce (WebGPU, ten sam zapis): symulacja 2,3 ms, rysowanie ok. 4 ms na klatkę, bez awarii i warstw zastępczych. Nowe testy w `tests/engine.test.js`: cel przy przeszkodzie jest osiągalny; robot bez trasy nie szuka co klatkę i przerywa zadanie. `npm test` 196/196.

## Światło na jednostkach (wersja 0.43, 2026-09-28)

Do tej pory objętość w świetle słońca i księżyca oraz sadzę miały tylko budynki — jednostki się obracają (64 kierunki), a czołg ma osobno celującą wieżę, więc oświetlenie wypiekane z jednego rysunku modelu nie pasowałoby do tego, co widać. Teraz światło jednostek jest liczone z **wyglądu, który renderer faktycznie pokazuje** (ten sam klucz stanu co tekstura modelu: kierunek, celowanie wieży, ruch, strzał, ładunek, uszkodzenia). Mapa normalnych jest więc w układzie planszy: słońce zostaje na miejscu, gdy jednostka skręca, a wieża czołgu jest cieniowana zgodnie ze swoim kierunkiem, niezależnie od kadłuba.

- **Pojazdy i duże jednostki** (czołgi, ciężkie maszyny, artyleria, transportery, lotnictwo, kroczący i kolos Roju): mapa wysokości z sylwetki i jasności detali, jak dla budynków.
- **Piechota i małe maszyny** (promień < 13): tylko miękka kopuła z sylwetki (bez detali, które przy tej wielkości byłyby szumem) — jaśniejsza krawędź od strony światła, ciemniejsza po drugiej, trochę słabsza niż w pojazdach.
- **Światło** — to samo co dla budynków (`lightMix()` w `webgl/pixi-game-renderer.js`): dwa najbliższe wypiekane kierunki słońca mieszane płynnie w ciągu doby, osłabienie w czasie burzy, księżyc w nocy.
- **Sadza** na pojazdach poniżej 72% wytrzymałości: stały wzór dla typu, obrócony z kierunkiem wyglądu i przycięty do sylwetki.
- **Koszt:** mapy normalnych są małe (przycięte do modelu, zapisane jako `Int8Array`), powstają najwyżej 6 na klatkę (`models.frameLooks`) i są zwalniane po ok. 10 s bez użycia; do czasu powstania nowej jednostka zachowuje światło poprzedniego wyglądu (różnica kilku stopni). Nakładki dla danego światła są wypiekane leniwie. Pomiar „Bitwa · 120 jednostek” (5 naprzemiennych przebiegów): WebGL 12,5–15,2 ms/klatkę bez światła i 14,2–14,9 ms ze światłem — różnica mieści się w rozrzucie pomiaru, najwyżej ok. 1,5 ms.
- Przełącznik w Ustawieniach → Renderer nazywa się teraz „Objętość budynków i jednostek (światło z kierunku słońca)”; „Ślady zniszczeń i pożarów” obejmuje też sadzę pojazdów. Renderer Canvas 2D bez zmian.

Kod: `webgl/model-light.js` (`unitLook`, `unitVolume`, `unitScars`, `frameLooks`), `webgl/models-native.js` (nakładki jednostek obracane o resztę kierunku, jak model), `webgl/pixi-game-renderer.js` (`lightMix`, `unitOverlays`).

### Weryfikacja

- `tests/render-webgl-browser.html` — nowe sprawdzenie „objętość jednostek w świetle słońca” (grupa pojazdów i piechoty z dala od budynków; różnica obrazu z oświetleniem i bez 2,5, 36 wyglądów z normalnymi); PASS na WebGL i WebGPU. Porównanie modeli natywnych z Canvas nadal w progu (średnia różnica ≤ 2,14 — teraz jednostki natywne mają światło, a Canvas nie).
- Z bliska w dzień: czołg, piechota i roboty z jaśniejszą stroną od słońca i cieniem po przeciwnej; kroczący i kolos Roju (czarny obsydian) z wyraźnie oświetlonymi krawędziami.

## Złoża (wersja 0.44, 2026-09-28)

Nowe rysunki surowców w `art.js` (wspólne dla Canvas i WebGL, jak dotąd):

- **Ruda** — warstwowy wychodzień skalny: bryły z oświetlonym wierzchem, zacienionym bokiem i warstwami, z metalicznymi żyłami; na dwóch największych bryłach błysk. W miarę wydobycia bryły maleją i znikają, a w ich miejscu pojawiają się wykopy.
- **Gaz** — krater wylotu z oświetloną krawędzią i fioletowym blaskiem w gardzieli, pięć szczelin świecących od środka, niskie skały na obrzeżu, unoszący się gaz. Wraz z wyczerpaniem gasną kolejne szczeliny i słabnie blask.
- **Kryształy** — półprzezroczyste złote graniastosłupy (jasna i ciemna ściana, jasna krawędź, wewnętrzne fasety), błysk na największym, okruchy u podstawy.
- **Sześć etapów** zamiast 3–4 (`BoardArt.resourceLook(o, gas)`, `crystalLook(o)`; progi dobrane do typowych ilości: ruda 300–4500, gaz 200–2300, kryształy 100–1500). **Wyczerpane złoże** ma własny wygląd: pusty wykop z gruzem, wygasły krater z ciemnymi szczelinami, ułamane szare kikuty. Wygląd zależy tylko od rodzaju i etapu, więc grunt WebGL nadal ma jedną teksturę na etap.
- **Wydobycie:** przy każdym urobku robota z pyłu lecą też odpryski skały lub kryształu (`chips` w efekcie `dust`, rysowane przez `FxArt` w obu rendererach). Nad polem gazu z **pracującym ekstraktorem** gaz wypływa gęściej i szybciej (`BoardArt.plumeParts`, `canvasRenderer.gasFlowing`).
- **Noc:** szczeliny gazu i kryształy świecą (`BoardArt.depositGlow` w fazie świecenia — Canvas; WebGL odtwarza ją natywnie), a w WebGL dodatkowo oświetlają grunt wokół siebie w mapie świateł.
- **Światło w WebGL:** złoża dostają objętość w świetle słońca i księżyca jak budynki i jednostki (mapa normalnych z rysunku, styl „deposit”, jedna na rodzaj i etap). Przełącznik „Objętość budynków i jednostek” obejmuje też złoża.

### Weryfikacja

- `tests/render-webgl-browser.html` — nowe sprawdzenie „złoża w świetle słońca i nocna poświata gazu” (różnica obrazu z oświetleniem i bez 0,43; nocą pełne pole gazu a wyczerpane 4,49); porównanie gruntu natywnego z Canvas liczone bez światła bryły (jak dla modeli), w progu. PASS. `tests/render-browser.html` PASS, `tests/menu-browser.html` 37/37, `npm test` 237/237.
- Z bliska: wszystkie etapy trzech surowców (Canvas, powiększenie 4×), gaz i ruda w dzień w WebGL (bryły skał oświetlone od słońca), nocą poświata kryształów i gazu. Znaleziony i poprawiony błąd: pula sprite'ów gruntu centruje sprite'y, więc nakładka światła była przesunięta — teraz ma punkt zaczepienia w swoim początku.

