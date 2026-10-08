# Aplikacja na Windows — Electron (wersja 0.151, 2026-10-08 — etap G3)

Plan: [Etap G](ETAP_G.md). Gra działa jak dotąd w przeglądarce (`npm start`, http://localhost:4173) i dodatkowo jako aplikacja Electron, bez internetu — wszystkie biblioteki są lokalne (`vendor/`).

## Jak uruchomić i zbudować

| Polecenie | Co robi |
|---|---|
| `npm install` | Instaluje Electron 44 i electron-builder 26 (tylko narzędzia deweloperskie; gra nie ma zależności) |
| `npm run app` | Uruchamia grę w oknie aplikacji z folderu projektu |
| `npm run app:check` | Samokontrola: buduje bundle 3D, uruchamia aplikację, startuje bitwę z rendererem 3D, wypisuje raport i błędy strony, kończy (kod wyjścia 0 = działa) |
| `npm run dist` | Buduje do `dist/`: instalator `Pogranicze-Galaktyki-<wersja>-instalator.exe` (NSIS) i wersję przenośną `Pogranicze-Galaktyki-<wersja>-przenosna.exe` (x64, ok. 110 MB). `tools/dist.js`: electron-builder wymaga wersji trzyczęściowej (semver), więc na czas budowania `package.json` dostaje np. `0.151.0` zamiast `0.151` i potem zawsze wraca oryginał (także przy błędzie i Ctrl+C) |
| `npm run dist:dir` | Tylko rozpakowana aplikacja (`dist/win-unpacked/`) — do szybkich prób |
| `npm run icon` | Odtwarza ikonę `build/icon.png` (`tools/make-icon.js`) |

Przed `npm run dist` warto przebudować bundle 3D (`npm run build:3d`) — robi to `app:check`.

## Jak działa (`electron/`)

- `main.js` — proces główny. Pliki gry podaje własny protokół `app://game/…` (zamiast `file://`): moduły ES renderera 3D, `fetch` dźwięków i modeli działają jak na serwerze deweloperskim, a zapisy (`localStorage`) mają stałe źródło `app://game`. Pliki czytane przez `fs` — działają też z archiwum `app.asar` w paczce. Bezpieczeństwo: `contextIsolation`, `sandbox`, bez Node w stronie; nawigacja tylko w obrębie `app://game`, linki `http(s)` otwiera przeglądarka systemowa, nowych okien brak. Jedna instancja naraz (druga przywraca okno pierwszej).
- Okno: bez paska menu, minimum 1024×640; F11 lub Alt+Enter — pełny ekran; rozmiar, położenie (o ile wciąż na którymś ekranie), maksymalizacja i pełny ekran zapamiętane w `window.json` w katalogu danych aplikacji (`%APPDATA%\Pogranicze Galaktyki`). Narzędzia deweloperskie (Ctrl+Shift+I) tylko w wersji niespakowanej.
- `assets.js` — mapowanie ścieżki URL na plik w folderze gry (nigdy poza nim: `..`, zakodowane ukośniki, bajt zerowy → 404) i typy MIME.
- `preload.js` — `window.desktop` dla strony: `app`, `isFullScreen()`, `setFullScreen(on)`, `onFullScreen(fn)`, `quit()`. Nic więcej z Electrona ani Node nie trafia do strony.
- `app.js`: `window.currentRendererMode()` — rodzaj aktywnego renderera (diagnostyka, samokontrola).

## W grze

- **Ustawienia → Aplikacja i zapisy** (nowa zakładka, także w przeglądarce):
  - w aplikacji — przełącznik „Pełny ekran” (zsynchronizowany z F11);
  - **Eksportuj zapisy do pliku** — `pogranicze-zapisy-RRRR-MM-DD.json` ze wszystkimi kluczami gry w pamięci urządzenia (`pogranicze-…`: zapis bitwy i sloty, kampania i jej kopia, rekordy, ustawienia dźwięku, grafiki i menu, profil sieciowy, obejrzane sceny; `hud.…`) i wersją gry; w aplikacji Windows pyta, gdzie zapisać;
  - **Importuj zapisy z pliku** — sprawdza plik (format, wersja, tylko klucze gry, tekst do 8 MB), pyta o potwierdzenie i zastępuje wszystkie klucze gry (te, których w pliku nie ma, są usuwane; inne dane przeglądarki nietknięte), potem uruchamia grę ponownie. Zły plik niczego nie zmienia. Logika w `save-transfer.js` (czysty moduł, `SaveTransfer`).
- **Menu główne** w aplikacji: przycisk „Wyjdź z gry”.

## Paczka (`package.json` → `build`)

- `appId` `pl.pogranicze.galaktyki`, nazwa „Pogranicze Galaktyki”, ikona `build/icon.png` (znak ◈ gry; Windows `.ico` robi z niej electron-builder), `asar`.
- Poza paczką: `tests/`, `tools/`, `docs/`, `dist/`, `build/`, pliki `.md`, strony `prototyp-*.html` i ich skrypty (`webgl/prototype.js`, `webgl3d/prototype-3d.js`), `server.js`, pliki Blendera, `.py`, `.cmd`. Zależności npm są tylko deweloperskie, więc `node_modules` nie trafia do paczki.
- Instalator NSIS: nie jednym kliknięciem — wybór folderu, instalacja dla bieżącego użytkownika (bez uprawnień administratora), skróty na pulpicie i w menu Start, deinstalator.

## Ograniczenia i decyzje

- **Bez podpisu kodu** — pliki `.exe` są niepodpisane (`NotSigned`), więc Windows SmartScreen przy pierwszym uruchomieniu pokaże ostrzeżenie „nieznany wydawca” (Więcej informacji → Uruchom mimo to). Podpis wymaga certyfikatu Code Signing (koszt roczny) — decyzja właściciela; electron-builder podpisze automatycznie po ustawieniu `CSC_LINK` / `CSC_KEY_PASSWORD`.
- **Bez automatycznych aktualizacji** — `electron-updater` wymaga miejsca publikacji wydań (np. GitHub Releases) — decyzja właściciela.
- Zapisy aplikacji i przeglądarki są osobne (inne źródło danych) — przeniesienie przez eksport i import.
- `npm audit`: 8 ostrzeżeń o umiarkowanej wadze w narzędziach budowania (m.in. `sprintf-js` w electron-builderze) — nie trafiają do paczki gry.
- Tylko Windows x64 (macOS i Linux możliwe w electron-builderze, nieskonfigurowane).

## Weryfikacja

- `tests/desktop.test.js` (5): mapowanie `app://` (w tym próby wyjścia poza folder), typy MIME każdego pliku ładowanego przez `index.html`, eksport i import zapisów (tylko klucze gry, zastąpienie w całości, zły plik niczego nie zmienia), ustawienia paczki.
- `npm run app:check` — z folderu projektu i ze spakowanej aplikacji (`dist/win-unpacked/Pogranicze Galaktyki.exe` ze zmienną `POGRANICZE_CHECK=<plik.json>` — spakowana aplikacja nie ma konsoli, raport idzie do pliku; `POGRANICZE_SHOT=<plik.png>` zapisuje też obraz okna): źródło `app://game`, `window.desktop`, renderer 3D wczytany, długie blokady wątku przy starcie mapy (`blocks`, od 0.151.1), bitwa trwa, zapis do pamięci działa, brak błędów strony — oba przebiegi bez błędów (2026-10-08, 0.151).
- Przeglądarka: zakładka „Aplikacja i zapisy” w Ustawieniach (bez przełącznika pełnego ekranu poza aplikacją).
