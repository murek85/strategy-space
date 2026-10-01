# Biblioteki zewnętrzne

| Plik | Biblioteka | Wersja | Źródło | Licencja |
|---|---|---|---|---|
| `pixi.min.js` | PixiJS | 8.21.0 | https://cdn.jsdelivr.net/npm/pixi.js@8.21.0/dist/pixi.min.js (pobrano 2026-09-26) | MIT — https://github.com/pixijs/pixijs/blob/dev/LICENSE |
| `three.module.js` | Three.js | 0.170.0 | https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js (pobrano 2026-09-30) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |

SHA-256 `pixi.min.js`: `c6d9d4c897b15576cce0055d0ba4382021181c99cdf08a446be9d61e16833db0`, 828 321 bajtów.

SHA-256 `three.module.js`: `ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb`, 1 314 681 bajtów. Moduł ES bez zależności (renderer 3D, `prototyp-3d.html`); moduły ES nie wczytują się ze strony otwartej z dysku (`file://`), więc prototyp 3D wymaga serwera (`npm start`).

Plik jest dołączony do projektu, aby gra działała offline i po otwarciu `index.html` z dysku. Przy publicznej dystrybucji gry należy dołączyć tekst licencji MIT PixiJS (informacja o prawach autorskich z pliku LICENSE repozytorium).
