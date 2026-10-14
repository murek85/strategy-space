# Architektura gry — porządki I4

Data: 2026-10-13, wersja 0.173. Zakres: krok I4 z [przeglądu i kierunków](KIERUNKI_2026_10.md), czyli jeden rozwijany silnik grafiki, rejestr reguł i podział `app.js`. Zachowanie gry się nie zmienia, zmienia się tylko układ kodu.

## 1. Silniki grafiki: rozwijamy tylko 3D

| Silnik | Pliki | Status od 0.173 |
|---|---|---|
| **3D (Three.js)** — domyślny | `webgl3d/*.js` (paczka `webgl3d/bundle-3d.js`, `npm run build:3d`) | **Rozwijany.** Wszystkie nowe efekty i wygląd trafiają tutaj |
| Wspólne z 3D | `webgl/terrain-height.js`, `webgl/model-light.js`; w `render-canvas.js` nakładka (zaznaczenia, paski, efekty interfejsu), warstwa ekranu, minimapa i mgła wojny (`drawLayer`, `drawMinimap`, `refreshFog`) | Rozwijane, bo rysuje z nich plansza 3D |
| WebGL / WebGPU (PixiJS) | `webgl/pixi-game-renderer.js`, `ground-native.js`, `models-native.js`, `fauna-native.js`, `canvas-replay.js` (oraz prototyp `pixi-renderer.js`, `prototype.js`) | **Zamrożony** — tryb awaryjny, tylko poprawki błędów |
| Canvas 2D | `render-canvas.js`: sama plansza (teren, grunt, jednostki, niebo, światło, obróbka) | **Zamrożony** — ostatni tryb awaryjny |

- Pliki zamrożone mają nagłówek `FROZEN since 0.173`. Test `tests/frozen-renderers.test.js` pilnuje, żeby nie czytały nowych ustawień grafiki. Nowy efekt z przełącznikiem w ustawieniach w zamrożonym pliku nie przejdzie testu.
- W ustawieniach (Grafika → Silnik grafiki) PixiJS i Canvas 2D są opisane jako tryby awaryjne, a 3D jako zalecany.
- Gdzie 3D się nie uruchomi, gra jak dotąd przechodzi na WebGL (PixiJS), a potem na Canvas 2D (`applyRenderer` w `app.js`).
- **Jednorazowe przeniesienie na 3D.** Do 0.172.7 domyślny był WebGL, a `SceneFX.set` zapisuje wszystkie opcje naraz. Prawie każdy gracz miał więc zapisany WebGL, choć go nie wybierał. `scene-fx.js` przenosi zapisany `"webgl"` na `"three"` raz, ze znacznikiem `moved3d`. WebGPU i Canvas 2D zostają, bo były wyborem gracza. Kto potem wybierze WebGL w ustawieniach, ten go zachowa.

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
