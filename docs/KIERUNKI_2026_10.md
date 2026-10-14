# Przegląd prototypu i dalsze kierunki rozwoju

Data: 2026-10-13, wersja 0.172.8. Status: **propozycja do wyboru, nie zlecenie realizacji.** Poprzednia koncepcja etapów A–D: [Kierunki rozwoju](KIERUNKI_ROZWOJU.md) (zrealizowana); bieżący stan: [Plan rozwoju](PLAN_ROZWOJU.md).

## 1. Stan prototypu w liczbach

| Obszar | Stan |
|---|---|
| Kod | ok. 64 tys. wierszy JavaScriptu (bez bibliotek i paczki 3D), 79 skryptów ładowanych przez `index.html`; największe: `app.js` (3,4 tys.), `engine.js` (3,2 tys.), `webgl3d/three-renderer.js` (2,9 tys.) |
| Testy | 57 plików, 410 testów Node (9,4 tys. wierszy) + strony kontrolne w przeglądarce; brak automatycznego uruchamiania (CI) |
| Frakcje | 4: Wolne Kolonie, Dominium, Rój Kryształowy, Wartownicy Otchłani |
| Obiekty | 64 typy: 39 jednostek, 25 budynków |
| Kampania | 15 misji: szkolenie i rozdziały I–XIV w czterech aktach, decyzje fabularne, filmy, sceny łączności |
| Scenariusze | 22 mapy, 7 trybów (Podbój, Przekaźniki, Obrona, Ekspedycja, Król wzgórza, Przetrwanie, Inwazja), 3 rozmiary, ziarno i kod operacji |
| Sieć | 1 na 1 przez kody (WebRTC) oraz do 2 na 2 przez serwer lobby, deterministyczny lockstep, powrót do bitwy |
| Grafika | 3 silniki: Canvas 2D, PixiJS (WebGL/WebGPU), Three.js 3D (domyślny od 0.172.7) |
| Dystrybucja | aplikacja Electron na Windows z instalatorem; wersja przeglądarkowa z lokalnego serwera |

## 2. Ocena

**Mocne strony.** Prototyp ma szerokość pełnej gry. Gospodarka, rozwój, cztery różne frakcje, kampania z oprawą filmową, scenariusze, gra sieciowa i trzy silniki grafiki już działają. Silnik jest deterministyczny, co daje lockstep i powtarzalne symulacje. Testy jednostkowe obejmują większość reguł.

**Słabe strony i ryzyka:**

1. **Balans jest niesprawdzony.** BAL-01 jest otwarty od 0.16, a cztery frakcje i 39 jednostek nie przeszły rozgrywek porównawczych. Nie wiadomo, które decyzje są ciekawe, a które pozorne. To dziś największa niewiadoma grywalności.
2. **Reguły rozbudowuje się łatkami.** 15 plików `*-rules.js` nadpisuje metody silnika (ok. 120 nadpisań). Kolejność skryptów jest krytyczna; od 0.171.17 pilnuje jej test. Każdy nowy system może po cichu zmienić stary, a w sieci skończyć się desynchronizacją.
3. **`app.js` łączy za dużo:** wejście, kamerę, HUD, sesję sieciową, zapisy, dźwięk i pętlę gry. Przeglądy z 0.171–0.172 znalazły tam większość błędów (pauza i muzyka, fokus okna, zapis przy zamknięciu strony).
4. **Trzy silniki grafiki to trzy miejsca do utrzymania.** Każdy nowy efekt wizualny trzeba robić osobno w każdym z nich, a domyślny jest już tylko 3D.
5. **Brak automatycznych testów w przeglądarce.** Strony `tests/*-browser.html` istnieją, ale nikt ich nie uruchamia sam. Błędy interfejsu (paski przewijania, układ w niskim oknie, mignięcie menu) wyszły dopiero przy ręcznym oglądaniu.
6. **Zasięg jest ograniczony.** Gra jest tylko po polsku. Nie ma zmiany klawiszy, skali interfejsu ani palety dla daltonistów. Brakuje autoaktualizacji aplikacji, raportów błędów i publicznego serwera. Serwer lobby zapamiętuje wersję gry przy starcie i po aktualizacji wymaga restartu.

## 3. Kierunki

Priorytet: ●●● wysoki, ●● średni, ● niski — z punktu widzenia „gra ma być dobra i dać się pokazać innym”.

### 3.1 Grywalność i balans ●●●

- **Symulator AI kontra AI.** Silnik działa w Node i jest deterministyczny, więc można rozegrać setki meczów dowódców AI bez grafiki. Wynik to raport: odsetek zwycięstw par frakcji na mapach i trybach, czas meczu, przebieg gospodarki, najczęstsze składy armii oraz jednostki, które nie są budowane. To podstawa BAL-01.
- **Powtórki.** W lockstepie mecz to ziarno plus lista rozkazów. Zapis powtórki jest więc mały, a odtworzenie dokładne. Przydadzą się do balansu, do zgłaszania błędów (także desynchronizacji) i do pokazywania gry.
- **Raport po bitwie:** wykres gospodarki, armii i strat w czasie. Gracz zobaczy, czemu przegrał, a my dostaniemy dane z prawdziwych rozgrywek.
- **Strojenie kampanii** (akty II–IV, poziomy trudności) na podstawie symulacji i powtórek.

### 3.2 Fundamenty techniczne ●●●

- **CI na GitHubie:** `npm test` oraz strony kontrolne w przeglądarce bez okna (Playwright) przy każdym wypchnięciu zmian.
- **Rejestr reguł zamiast łatek.** Systemy (frakcje, kosmos, pogoda, tryby) zgłaszają się do silnika z jawną kolejnością i własnymi zdarzeniami (obrażenia, śmierć, produkcja), zamiast nadpisywać metody. Przenosić stopniowo, plik po pliku, z testami deterministyczności sieci.
- **Podział `app.js`** na moduły: wejście i kamera, HUD, zapisy, sesja sieciowa, pętla gry.
- **Jeden silnik rozwijany:** 3D. PixiJS i Canvas 2D zostają jako tryby awaryjne bez nowych efektów, co zmniejsza koszt każdej zmiany grafiki.
- **Wersjonowanie zapisów i migracje:** stare zapisy wczytują się po zmianach reguł, a niezgodność gra zgłasza wprost zamiast tracić stan.

### 3.3 Gra wieloosobowa ●●

- Publiczny serwer lobby (hosting) i odczyt wersji gry przy każdym połączeniu, nie tylko przy starcie serwera.
- Obserwator i powtórki meczów sieciowych (z 3.1).
- Tryb Inwazja w grze sieciowej (otwarte od 0.152), 3 na 3 i gra wszyscy na wszystkich.
- Ranking i dobieranie przeciwników dopiero po balansie; wcześniej zniechęci graczy.

### 3.4 Nowa zawartość ●● (jedna duża rzecz naraz)

| Propozycja | Co daje graczowi | Koszt |
|---|---|---|
| **Bohaterowie** | Dowódca na polu bitwy z umiejętnościami, rozwijany w kampanii; mocny punkt zaczepienia fabuły | Średni: nowa jednostka, umiejętności, interfejs, AI |
| **Edytor map** + wyzwania z ziarnem i tabela wyników | Długie życie trybu scenariuszy; mapy tworzone przez graczy | Duży: narzędzie, zapis map, walidacja |
| **Transport między planetami w kampanii** | Spina bitwę na orbicie (0.130) i desant (0.152) w jedną operację | Średni–duży |
| **Kampania drugiej strony** (Dominium albo Rój) | Nowa perspektywa na istniejącą fabułę, wykorzystuje gotowe frakcje | Duży: misje, filmy, dialogi |
| **Nagrane głosy** | Kampania brzmi profesjonalnie (dziś głosy syntezowane) | Zależy od nagrań; kod gotowy |

### 3.5 Dostępność i zasięg ●●

- **Wersja angielska:** wydzielenie tekstów z kodu (dziś wszystkie są w nim wpisane po polsku) i przełącznik języka. Im później, tym więcej tekstów do przeniesienia.
- Zmiana klawiszy, skala interfejsu, paleta kolorów graczy dla daltonistów.
- Automatyczny dobór jakości grafiki według liczby klatek (licznik FPS istnieje od 0.171.18). — *Wykonane w 0.175.8 ([opis](RENDERER_3D.md)).*

### 3.6 Wydanie ●

- Autoaktualizacja aplikacji, podpisany instalator, zgłaszanie błędów z gry (z dołączoną powtórką).
- Strona gry, itch.io lub Steam, wersja przeglądarkowa online.

## 4. Proponowana kolejność — Etap I

| Krok | Zakres | Po co teraz |
|---|---|---|
| I1 | Symulator AI kontra AI i raport balansu | **Wykonane w 0.174** — [opis](BALANS.md): Rój 86%, Dominium 19% |
| I2 | CI z testami w przeglądarce | Każda kolejna zmiana sprawdzana sama |
| I3 | Powtórki i raport po bitwie | Dane z prawdziwych gier, zgłaszanie błędów |
| I4 | Porządki: rejestr reguł, podział `app.js`, jeden silnik rozwijany | **Wykonane w 0.173** — [opis](ARCHITEKTURA.md) |
| I5 | Jedna duża nowość z 3.4 | Po balansie i porządkach — wejdzie na pewny grunt |
| I6 | Wersja angielska i dostępność | **Wykonane:** wersja angielska 0.175, dostępność 0.175.1 — [opis](JEZYKI.md) |
| I7 | Wydanie i publiczny serwer | Gdy gra ma być publiczna |

## 5. Decyzje do podjęcia

1. **Cel projektu:** gra do wydania publicznie czy rozwijany prototyp dla siebie? Od tego zależą I6–I7 i ranking.
2. **Duża nowość (I5):** bohaterowie, edytor map, transport międzyplanetarny, kampania drugiej strony czy nagrane głosy?
3. **Grafika:** zamrozić PixiJS i Canvas 2D jako tryby awaryjne? — *Decyzja 2026-10-13: tak, rozwijamy tylko 3D (0.173). 2026-10-14: oba usunięte, gra jest tylko 3D (0.176).*
4. **Język angielski:** teraz (mniej tekstów do przeniesienia) czy przed wydaniem?
5. **Przeniesienie do Unity:** odłożone bez terminu — zamknąć ten temat czy zostawić otwarty?
