# Desant z orbity — tryb „Inwazja” (wersja 0.152, 2026-10-08 — etap G2)

Plan: [Etap G](ETAP_G.md). Łączy bitwę na orbicie ([Bitwa na orbicie](BITWA_NA_ORBICIE.md)) z bitwą na planecie w jedną operację. Reguły w `invasion-rules.js` (moduł po `deposit-rules.js`), wszystkie liczby w `RTS.INVASION`.

## Jak grać

Gra jednoosobowa → Scenariusze → mapa planety → tryb **Inwazja**. Operacja ma dwie fazy:

1. **Orbita** — bitwa na mapie kosmicznej nad wybraną planetą: pustynia → Orbita Kharona, lód → Pierścienie Glacjalis, popiół i lawa → Otchłań. Trwa do zniszczenia stacji dowodzenia jednej ze stron albo do **8 minut** — wtedy orbitę trzyma strona z większą wartością floty i stacji (koszt × stan). W panelu celów: odliczanie i siły obu stron.
2. **Planeta** — po ekranie „Orbita zdobyta / utracona” przycisk **Lądowanie** uruchamia bitwę na wybranej mapie (podbój, te same ustawienia scenariusza). Strona panująca na orbicie ma:
   - **kapsuły desantowe** — jedna na każde 250 metalu ocalałej floty (co najmniej 2, najwyżej 8). Przycisk „Desant” w panelu orbity (prawy górny róg planszy), potem LPM na lądowisku w zbadanym terenie, nie bliżej niż 320 od wrogiego centrum. Jeden desant to do 2 kapsuł, co 40 s; lądują po 2,5 s; każda niesie oddział frakcji na zmianę: piechotę (Kolonie: 2 piechurów i rakietowiec; Dominium: piechur, miotacz ognia, rakietowiec; Rój: 2 pełzacze i plujka) i pojazd (czołg; w Roju 2 plujki). Wylądowane jednostki są przez 1,5 s oszołomione. PPM lub Esc anuluje wskazywanie;
   - **uderzenie z orbity** bez stacji uplink — pierwsze po 60 s, potem co 120 s (opóźnienie, promień i obrażenia jak uderzenie frakcji);
   - **skan orbitalny** co 60 s — mapuje okolicę wrogiej armii (albo wrogiego centrum).
   Strona bez orbity nie ma żadnego z nich; **baterie przeciwlotnicze** w zasięgu lądowiska zestrzeliwują kapsułę z szansą 35% każda, inne budynki obronne 15% (razem najwyżej 80%).

## Przeciwnik

- Gdy AI trzyma orbitę: od 120 s co 90 s zrzuca kapsuły przy Twoich dalszych budynkach, które zna (najdalej od Twojego centrum), a gdy zna tylko bazę — na jej skraju od swojej strony, tuż za strefą ochronną; wylądowane oddziały nękają przez 60 s (rola „raid”), potem wracają do obrony. Uderza z orbity w grupy co najmniej 4 Twoich jednostek, które widzi; skan dopisuje Twoje budynki do jego wiedzy (mgła wojny AI).
- Gdy orbitę masz Ty: AI stawia baterie przeciwlotnicze — pierwszą od 150 s, drugą od 360 s.

## Szczegóły techniczne

- Start: `app.js` `launchWithScreen` — tryb `invasion` na mapie planety zamienia się w fazę orbity (`scenario.invasion = { phase: "orbit", target }`, mapa z `RTS.INVASION.orbitFor`). `configureSkirmish` (2 graczy, bez drużyn) ustawia `game.invasion`; na mapie kosmicznej bez danych inwazji tryb jest zwykłym podbojem.
- Koniec orbity: `tick` rozstrzyga po `orbitTime`; `invasionResult()` liczy `carry = { owner, pods, mine, theirs }` także, gdy stacja padła poza `tick`. `showEnd` pokazuje wtedy ekran lądowania (`showInvasionLanding`) zamiast raportu.
- Planeta: `game.invasion = { phase: "ground", owner, pods: { [owner]: n }, dropReady, strikeReady, scanAt, aiDropAt }`; kapsuły w drodze w `game.drops`. Akcje gracza: `orbitalDrop(x, y)`, `orbitStrike(x, y)`; wymagania: `dropRequirement`, `landingRequirement`, `orbitStrikeRequirement`; `podShotChance` — obrona przeciwlotnicza; `landPod` — lądowanie (losowanie `this.rand`, deterministyczne); `orbitScan`. `unitTick` pomija jednostki z `landedUntil` w przyszłości.
- Interfejs: panel orbity (`#orbit-panel`, `hud-compact.css`) — kto trzyma orbitę, „Desant · N kaps.” i „Uderzenie z orbity” z odliczaniem; `modeStatus()` — status w panelu celów; ekran ładowania z nazwą fazy.
- Kod operacji: tryb „I” (`horizon-M2N-I-…`). Zapis: `invasion` i `drops` w stanie gry.
- Wybrano wariant dwufazowy (plan G2.1). Odstępstwo od planu: zamiast osobnego statku „transportowiec desantowy” (nowe modele 2D/3D, kafle, drzewo rozwoju) kapsuły wynikają z ocalałej floty — kto utrzyma orbitę większą flotą, ma więcej kapsuł.

## Weryfikacja

- `tests/invasion.test.js` (9): mapy orbit dla planet, rozstrzygnięcie po czasie i po upadku stacji, kapsuły z floty; zwykły podbój bez inwazji; desant tylko dla właściciela orbity, z odstępem, w zbadanym terenie i z dala od centrum; lądowanie oddziałów frakcji i oszołomienie; zestrzeliwanie przez baterie (limit 80%); uderzenie z orbity; skan; AI zrzuca kapsuły na skraju Twojej bazy i stawia baterie, gdy nie ma orbity; kod operacji i zapis.
- Przeglądarka: Inwazja na Cichym Horyzoncie — faza orbity (status, odliczanie), ekran „Orbita zdobyta” z 8 kapsułami, lądowanie, panel orbity, desant przyciskiem i kliknięciem (2 kapsuły, oddziały wylądowały, odliczanie kolejnego desantu).

## Dalej (propozycje)

- Smuga kapsuły wchodzącej w atmosferę w renderze 3D (dziś: znacznik celu, potem wybuch i pył przy lądowaniu).
- Obie plansze naraz z przełączaniem widoku; rozdział kampanii z inwazją; tryb w grze sieciowej.
