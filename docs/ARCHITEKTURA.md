# Architektura gry — porządki I4

Data: 2026-10-13, wersja 0.173. Zakres: krok I4 z [przeglądu i kierunków](KIERUNKI_2026_10.md), czyli jeden rozwijany silnik grafiki, rejestr reguł i podział `app.js`. Zachowanie gry się nie zmienia, zmienia się tylko układ kodu.

## 1. Silnik grafiki: tylko 3D

Od 0.176 (2026-10-14) gra ma jeden silnik planszy: **3D (Three.js)**. W 0.173 PixiJS i Canvas 2D zostały zamrożone jako tryby awaryjne, a w 0.176 usunięte.

| Część | Pliki | Rola |
|---|---|---|
| **Plansza 3D (Three.js)** | `webgl3d/*.js` (paczka `webgl3d/bundle-3d.js`, `npm run build:3d`) | Jedyna plansza. Nowe efekty i wygląd trafiają tutaj |
| Malarz 2D dla planszy 3D | `render-canvas.js` z plikami `*-art.js` | Nie rysuje już własnej planszy, tylko warstwy, które plansza 3D kładzie pod i nad światem: kafle gruntu, nakładkę na mapie, warstwę ekranu, minimapę i mgłę wojny (`drawLayer`, `drawMinimap`, `refreshFog`). Rysuje też podglądy map w scenariuszach i w lobby |
| Zastępczy obraz modelu | `webgl3d/model-light.js` (`paint()`) | Dla obiektów bez własnego modelu 3D: plansza 3D nakłada go jako teksturę na płaszczyznę |

- **Bez WebGL** gra nie przełącza się na inny silnik. Przy próbie bitwy pokazuje warstwę „Brak grafiki 3D” z radą (akceleracja sprzętowa, aktualizacja przeglądarki lub sterowników) i przyciskiem do menu (`showNo3D` w `app.js`).
- **Utrata kontekstu** karty graficznej (reset sterownika) buduje planszę 3D od nowa za ekranem wczytywania (`contextLost`).
- Do czasu zbudowania planszy 3D `render-canvas.js` trzyma stan bitwy (`setGame`, `refreshFog`), ale niczego nie rysuje; ekran wczytywania czeka na planszę (`boardReady`).
- **Ustawienia → Grafika → Silnik** pokazują tylko, czy 3D działa. Nie ma już przełącznika silnika ani przełączników tylko dla PixiJS („Objętość budynków”, „Perspektywa 2,5D”). Zapisany dawniej silnik „webgl”, „webgpu” lub „canvas” wczytuje się jako 3D.
- **Usunięte w 0.176:**
  - `vendor/pixi.min.js` i cały katalog `webgl/`: `pixi-game-renderer.js`, `pixi-renderer.js`, `ground-native.js`, `models-native.js`, `fauna-native.js`, `canvas-replay.js` i `prototype.js`;
  - `prototyp-webgl.html`, `tests/render-webgl-browser.html` i `tests/frozen-renderers.test.js`;
  - `webgl/terrain-height.js`: plansza 3D go tworzyła, ale nie używała wyniku, bo rzeźbę liczy `relief-3d.js`;
  - z `webgl/model-light.js` zostało tylko `paint()`, przeniesione do `webgl3d/`;
  - w `render-canvas.js` wejście pełnej planszy (`render`) i fazy, których używała tylko ona: niebo, światło, obróbka, poświata, pogoda, mgła, efekty i wtyczki nieba map; razem z nimi `MapArt.sky`, `glow`, `skyPlugins` i `island` oraz poświata wtyczek map (`themed-art.js`, `world-art.js`).
- Test: `tests/three-only.test.js`.

## 2. Rejestr reguł

Silnik (`engine.js`, klasa `Game`) rozszerza 29 modułów: pliki `*-rules.js`, kampania, mapy, tryby scenariuszy i dowódca AI. Każdy z nich owija metody `Game.prototype`, zapamiętując poprzednie (`old.tick.call(this, dt)`). Kolejność modułów jest więc częścią reguł. Dotąd stała w dwóch miejscach: kolejności skryptów w `index.html` i liście `require` w `advanced-rules.js`.

- **Jedna lista:** `RTS.RULE_MODULES` w `engine.js`.
- **Zgłoszenie:** moduł oddaje swoją instalację przez `RTS.rule("nazwa", install)`; w Node eksportuje `install`. Rejestr instaluje moduł od razu, jak dotąd, bo strony testowe ładują różne podzbiory reguł. Moduł spoza listy albo przychodzący po module, który powinien być za nim, zostaje odrzucony z czytelnym błędem.
- **Node:** `advanced-rules.js` instaluje siebie, a potem resztę w kolejności `RULE_MODULES`.
- **Mapa warstw:** `RTS.RULE_LAYERS[metoda]` podaje, które moduły po kolei owinęły daną metodę. Przykład: `tick` owija 17 modułów, `serialize` 16, `configureSkirmish` 13, `applyDamage` 12. Mapa jest zapisana w `tests/rules-layers.json`, a `tests/rules-registry.test.js` ją porównuje. Nowy moduł albo nowe owinięcie metody wychodzi więc w testach i trzeba je świadomie zatwierdzić: `RULES_UPDATE=1`, potem `npm test`.
- Ten sam test sprawdza, że każda strona (`index.html`, `prototyp-*.html`, `tests/*.html`) ładuje reguły w kolejności listy.

**Nowy moduł reguł:**
1. Plik z `function install(RTS)` i ogonem `if (module.exports) module.exports = install; else root.RTS.rule("nazwa", install);`.
2. Nazwa w `RULE_MODULES` we właściwym miejscu.
3. Skrypt w `index.html` w tym samym miejscu.
4. `RULES_UPDATE=1 npm test` i przejrzenie zmian w `tests/rules-layers.json`.

Uwaga: część stron testowych (`tests/advanced-browser.html` i podobne z 11 modułami) ładuje niepełny zestaw reguł bez `scenario-modes.js`. Instalacje `scenario-setup`, `scenario-challenges` i `campaign-act3` padają tam tak samo jak przed rejestrem. Testy tych stron sprawdzają modele i rysowanie, więc dalej przechodzą.

## 3. Podział `app.js`

`app.js` to jedno domknięcie z całym stanem bitwy. Miało 3,4 tys. wierszy, teraz ma ok. 1,6 tys. Wydzielono pięć modułów, a kod przeniesiono bez zmian:

| Moduł | Zawartość | Wiersze |
|---|---|---|
| `app-hud.js` | pasek zasobów i mocy, karta zaznaczenia i jej polecenia, grupy, producenci, alerty bazy, panele logistyki i celów (`updateHud`) | ok. 475 |
| `app-network.js` | czat bitwy, wspólna pauza, rewanż, start i koniec sesji lockstep, koniec bitwy sieciowej | ok. 390 |
| `app-story.js` | decyzje fabularne, cele aktu II, epilogi, lądowanie inwazji, raport zwycięstwa i porażki | ok. 270 |
| `app-deck.js` | talia poleceń: karty armii, budowy i badań, strony, dymki, potwierdzenia doktryn, panel orbity | ok. 615 |
| `app-controls.js` | panel boczny (liczniki, narzędzia), mysz na planszy i minimapie, klawiatura | ok. 660 |

- Każdy moduł to fabryka `createAppX(app)`, wywoływana raz w `app.js` w miejscu, w którym stał jego kod. Kolejność wykonania przy starcie, w tym podpinanie nasłuchiwaczy, jest więc taka sama.
- `app` to kontekst: stałe i funkcje wprost, a stan, który się zmienia (`game`, `selected`, `camera`, `netSession`, `started`, `paused`, `finished`, `menu`…), przez gettery i settery. Moduł pisze `app.game`, `app.paused = true`.
- `app.js` woła moduły przez ich przestrzenie nazw: `hud.updateHud()`, `network.startNetwork()`, `story.showEnd()`, `deckUi.deck()`, `controls.setupSidebar()`. Kontekst tworzony wcześniej niż moduł, z którego korzysta, dostaje leniwe wywołanie, np. `showEnd: (...args) => story.showEnd(...args)`.
- **Jak to zrobiono:** narzędzie oparte na analizie zasięgów (acorn i eslint-scope, poza projektem) przeniosło bloki i zamieniło odwołania. Trzy kontrole na każdym kroku:
  - `app.js` nie ma nowych nazw globalnych poza fabrykami;
  - moduł nie używa żadnej nazwy, której oryginał nie miał;
  - żaden moduł nie jest czytany przy starcie przed utworzeniem (kontrola wyłapała jeden taki przypadek, poprawiony leniwym wywołaniem).
- Testy czytające źródło aplikacji biorą `app.js` razem z modułami (`tests/app-source.js`).
- Sprawdzone w przeglądarce, na osobnym adresie `127.0.0.1`, żeby nie dotykać zapisów gracza pod `localhost`:
  - bitwa scenariusza w 3D: talia (zakładki, strony, zakup, dymek), zaznaczanie ramką, rozkaz ruchu, pauza spacją, ekran zwycięstwa;
  - bitwa sieciowa przez serwer z komputerem: start sesji, czat bitwy, wspólna pauza, wyjście do menu;
  - `npm run app:check` (aplikacja Electron).

**Dalej (bez terminu):** w `app.js` zostały zapisy (`saveGame`, `loadGame`, `inspectSave`), wybór silnika (`load3D`, `applyRenderer`), start misji i pętla klatek. Można je wydzielić tak samo, gdy będą zmieniane.
