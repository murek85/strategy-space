# Renderer 3D (wersje 0.52–0.53, eksperymentalnie)

Data: 2026-09-30. Status: w grze jako Ustawienia → Renderer → „3D (Three.js)”, obok samodzielnego prototypu `prototyp-3d.html`. Tylko grafika — symulacja, zasady, zapisy i gra sieciowa bez zmian.

## Założenia

- Symulacja zostaje 2D (`x, y`). Renderer umieszcza ją w 3D: X = x, Z = y, Y = wysokość terenu z `webgl/terrain-height.js`.
- W grze ten sam interfejs co renderery Canvas i PixiJS: `setGame`, `refreshFog`, `render(view)`, `toFlat`, `fromFlat`, `destroy`. `app.js` zachowuje kamerę, sterowanie i HUD.
- Biblioteka: Three.js 0.170.0 w `vendor/three.module.js` (moduł ES). Gra wczytuje renderer 3D przez `import()` dopiero po wybraniu go w Ustawieniach; moduły ES nie działają ze strony otwartej z dysku (`file://`), więc tryb 3D wymaga serwera (`npm start`). Bez serwera lub bez WebGL gra przełącza się na WebGL (PixiJS) z komunikatem, a dalej — jak dotąd — na Canvas 2D.

## Pliki

| Plik | Rola |
|---|---|
| `webgl3d/three-game-renderer.js` | adapter do gry: kamera gry → kamera 3D, `toFlat`/`fromFlat`, nakładka interfejsu, warstwa ekranu, minimapa, słońce z gry |
| `webgl3d/three-renderer.js` | teren, modele (instancing), tektury, światło, cienie, mgła, znaczniki, efekty |
| `webgl3d/models-3d.js` | modele low-poly budowane w kodzie |
| `webgl3d/scene-fx-3d.js` | woda, światła nocne, pogoda, dym i ogień (0.53) |
| `prototyp-3d.html`, `webgl3d/prototype-3d.js` | samodzielny prototyp: kamera z obrotem i pochyleniem, galeria modeli, pora dnia |

## Co jest zrobione

- **Teren**: siatka z mapy wysokości, w kaflach po 60 komórek. Grunt maluje kod Canvas (fazy `terrain`, `ground`, `groundTop`). Kafel jest malowany na nowo tylko wtedy, gdy zmieni się etap złoża, właściciel przekaźnika, liczba wraków lub kraterów albo odkryty obszar (ok. 17 ms na kafel, najwyżej jeden kafel na pół sekundy).
- **Modele 3D** (`models-3d.js`) dla wszystkich 49 typów gry, w czterech odmianach:
  - Kolonie — jasne i obłe (kopuły, walce); Dominium — kanciaste i rdzawe (kliny, płyty). Kolor drużyny na pasach i światłach.
  - Rój — „obsydianowi strażnicy” jak w `swarm-art.js`: budynki to zestawy zwężających się monolitów ze szpicami i szwem (liczba i wysokość zależne od typu), małe jednostki to kliny na czterech nogach, pojazdy to kroczące (2–4 nogi) z kolcami broni, latające — ośmiościany ze skrzydłami; bez poświaty, jedynym kolorem jest pas drużyny.
  - Fauna: drapieżnik i rogacz lodowy (czworonogi, kły), pajęczak bazaltowy (osiem nóg, żarzące się szwy), paszczak wydmowy (krater z kręgiem zębów, gardziel wysuwa się przy ataku).
- **Animacje**: chód piechoty i kroczących, koła i gąsienice, obrót wieży do celu (niszczyciel czołgów — tylko w wąskim polu), odrzut lufy, przechył samolotów, wirniki dronów, ramiona robota i łazika przy pracy, ładunek robota, tłok ekstraktora tylko przy obsadzonym ekstraktorze, brama opuszcza się po otwarciu, anteny, wentylatory, radar, rdzenie energii. Budynek w budowie wyrasta z ziemi.
- **Instancing**: części modeli są w scenie tylko szkieletem transformacji (na warstwie, której nie widzi żadna kamera); co klatkę ich macierze trafiają do jednego `InstancedMesh` na parę geometria + materiał. Liczba wywołań rysowania zależy od liczby rodzajów części, nie od liczby jednostek.
- **Tektury** (obraz z gry leżący na ziemi, budynki na bryle z namalowanym dachem) zostają dla typów bez modelu (np. z przyszłych wtyczek). W prototypie przełącznik „Modele 3D” pokazuje tektury wszędzie — do porównania.
- **Światło**: słońce i księżyc z mapą cieni podążającą za kamerą; w grze z `game.night` i fazy doby (jak w rendererze WebGL). Zasięg cieni, mgła odległości i daleka płaszczyzna kamery skalują się z przybliżeniem.
- **Mgła wojny**: shader terenu przyciemnia i odbarwia to, czego nie widać (miękka krawędź). Modele, paski i efekty innych stron poza zasięgiem wzroku są ukryte.
- **Na planszy**: kręgi zaznaczenia, paski życia, strzały (linie), wybuchy (błyski).

## Woda, noc, pogoda, dym (wersja 0.53, 2026-10-01)

- **Woda** (`game.waters`, kształt z `RTS.waterRadius`): siatka na siatce terenu (co 12 jednostek), przezroczystość zanika od 70% promienia do brzegu, więc brzeg jest miękki. Jeziora i szczeliny lodowe na płaskim terenie to płaskie lustro tuż nad najwyższym punktem brzegu (zmarszczki z przewijanej mapy normalnych odbijają słońce); świecące rozlewiska i lawa leżą na korycie, bo płyną łańcuchami po pochyłości. Lawa: ciemna skorupa z żarzącymi się pęknięciami z szumu, przewijana i pulsująca. Zachodzące na siebie zbiorniki jednego rodzaju dzielą punkty siatki (jedna siatka na rodzaj), więc półprzezroczysta woda nie ciemnieje na zakładkach. Przepaście zostają ciemnym gruntem. Woda przechodzi przez shader mgły wojny.
- **Noc**: pod budynkami plamy ciepłego światła, przed pojazdami i piechotą stożki reflektorów (dwa rysowania instancjonowane, siła według `game.night`). Okna, lampy i rdzenie modeli świecą w nocy mocniej; świecące rozlewiska jaśnieją.
- **Pogoda** (`game.weather`): deszcz jako smugi z wiatrem i błyskawice (ten sam rytm co niebo Canvas i WebGL, rozjaśniają scenę), śnieg jako płatki, burza piaskowa jako niski pył pędzący nad ziemią. Mgiełka w kolorze pogody przybliża się i przyciemnia słońce. Cząsteczki krążą w pudełku wokół kamery.
- **Dym i ogień**: budynki poniżej 50% wytrzymałości dymią, poniżej 30% płoną; pojazdy poniżej 35% dymią, poniżej 20% płoną. Każdy wybuch rozrzuca iskry i kłęby dymu. Dwa systemy punktów (dym, ogień addytywnie), do 2500 cząsteczek każdy; nic nie jest pokazywane we mgle wojny.
- **Mgła wojny**: siatka widoczności powiększona 3× i dwukrotnie rozmyta — krawędź widzenia to łagodna krzywa zamiast schodków 40 × 40.
- **Okolica mapy**: za krawędzią mapy płaski teren w uśrednionym kolorze gruntu, rozpływający się w mgle odległości — kamera nie patrzy w pustkę.
- **Minimapa**: obrys tego, co widzi kamera 3D (trapez), zamiast prostokąta płaskiego widoku (`view.viewOutline` w `render-canvas.js`).
- **Nakładka interfejsu** jest przesyłana do karty graficznej tylko wtedy, gdy coś na niej narysowano (kontekst płótna zgłasza każde malowanie).
- Prototyp: `prototyp-3d.html?map=frost` (lub `magma`, `horizon`, `lumen`…) — inna mapa.

## W grze

- **Kamera**: kamera gry (`camera.x`, `camera.y`, `zoom` → `scale`) steruje kamerą 3D. Patrzy na środek widoku z pochylenia ok. 54°, z odległości, przy której środek ekranu ma tyle pikseli na jednostkę mapy co widok 2D. Przesuwanie, przybliżenie, Home i minimapa działają jak dotąd; obrotu i pochylenia w grze nie ma.
- **Wskazywanie**: `toFlat()` rzuca kursor na teren i podaje, gdzie ten punkt mapy leży w płaskiej klatce, na której pracuje logika gry; `fromFlat()` przelicza z powrotem. Kliknięcie, ramka zaznaczenia (sprawdzana przez `fromFlat`, jak przy pochyleniu 2,5D), rozkazy i budowa działają bez zmian w `app.js`.
- **Interfejs na planszy** (faza Canvas `overlay`: podgląd budowy, punkty zbiórki, znaczniki, zasięgi) jest malowany na płaskiej klatce dwa razy większej niż ekran, w rozdzielczości 0,4, i nakładany na teren w shaderze. Faza `screen` (ramka zaznaczenia, winieta, atmosfera, krawędź burzy) jest malowana na zwykłym płótnie 2D nad planszą 3D, z rogami ramki przeliczonymi przez `fromFlat`.
- **Ustawienia**: opcje efektów PixiJS są w trybie 3D wyłączone (plansza 3D ma własne światło i cienie).

## Pomiary (2026-09-30)

- Ekran → plansza → ekran: błąd poniżej 0,001 px.
- Galeria prototypu (115 modeli widocznych naraz, z cieniami): bez instancingu ok. 1040 wywołań i 6,5 ms na klatkę razem z kartą graficzną; z instancingiem 107 wywołań i 3,7 ms (najgorsza 5,9 ms).
- 415 modeli (galeria + 300 jednostek): 107 wywołań, 230 tys. trójkątów, 8,5 ms na klatkę (5,4 ms procesora).
- W grze (Cichy Horyzont, początek bitwy): ok. 169 kl./s (mediana klatki 5,9 ms) razem z nakładką interfejsu.
- 0.53, w grze (Rzeki Magmy, noc i burza wulkaniczna, płonące koszary): mediana klatki 5,9 ms, 95% klatek do 11,7 ms.
- Sprawdzone w grze: zaznaczanie ramką, rozkaz ruchu trafia w kliknięte miejsce, podgląd budowy pod kursorem, przełączanie 3D ↔ WebGL w trakcie gry. Powrót do WebGL przy stronie otwartej z dysku nie był sprawdzany w przeglądarce.

## Dalej

1. Napisy złóż i przekaźników jako sprite'y zwrócone do kamery (dziś są namalowane na gruncie).
2. Zwierzyna, ptaki i latające wyspy (`webgl/fauna-native.js` w PixiJS) — w 3D jeszcze ich nie ma; efekty map (zarodniki, iskry lawy, mgła nad przepaściami) też nie.
3. Ślady efektów walki: lecące pociski zamiast linii, błysk wystrzału, wraki.
4. Pomiar w `tests/benchmark-browser.html` i testy renderera 3D w `tests/render-webgl-browser.html`.
5. Tryb 3D z dysku: Three.js jako zwykły skrypt (zbudowany plik UMD) albo wbudowanie w jeden plik.
