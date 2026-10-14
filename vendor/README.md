# Biblioteki zewnętrzne

| Plik | Biblioteka | Wersja | Źródło | Licencja |
|---|---|---|---|---|
| `three.module.js` | Three.js | 0.170.0 | https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js (pobrano 2026-09-30) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |
| `three-addons/loaders/GLTFLoader.js`, `three-addons/utils/BufferGeometryUtils.js` | Three.js (dodatki) | 0.170.0 | https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/ (pobrano 2026-10-01) | MIT — https://github.com/mrdoob/three.js/blob/dev/LICENSE |

SHA-256 `three.module.js`: `ce1fa418de16a19495a9f72495580e3015d7745c296d3ce0485897f902ddedfb`, 1 314 681 bajtów. Moduł ES bez zależności (renderer 3D, `prototyp-3d.html`); moduły ES nie wczytują się ze strony otwartej z dysku (`file://`), więc gra otwarta z dysku używa kopii wbudowanej w `webgl3d/bundle-3d.js` (`npm run build:3d`); prototyp `prototyp-3d.html` wymaga serwera (`npm start`).

Pliki są dołączone do projektu, aby gra działała offline i po otwarciu `index.html` z dysku. Przy publicznej dystrybucji gry należy dołączyć tekst licencji MIT Three.js (informacja o prawach autorskich z pliku LICENSE repozytorium). PixiJS (`pixi.min.js`) usunięto w 0.176 razem z planszą WebGL.

SHA-256 `GLTFLoader.js`: `45139faddd5aaf48ed2d62203d976e5cbd703db1a592de40527f9f6cf58abd44`, 110 273 bajtów; `BufferGeometryUtils.js`: `c25b7930e570e9ec56173cd3b866ec8d2e10016630db3937efb439daf1cedbf6`, 31 768 bajtów. Wczytują modele `.glb` z Blendera (`prototyp-jednostka.html`, `assets/models/`).
