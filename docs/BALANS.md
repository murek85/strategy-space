# Balans — symulator AI kontra AI (I1)

Data: 2026-10-14, wersja 0.174. Krok I1 z [przeglądu i kierunków](KIERUNKI_2026_10.md). Wynik pierwszego pełnego przebiegu: [raport](BALANS_RAPORT.md) (generowany, nadpisywany przy każdym uruchomieniu) i dane w `BALANS_RAPORT.json`.

## Narzędzie

`node tools/balance.js` (albo `npm run balance`). Rozgrywa całe mecze, w których obie strony prowadzi dowódca AI: wydobycie, budowa, badania, doktryny i ataki, bez grafiki. Mecze idą równolegle w wątkach, po jednym na rdzeń.

- **Równy start.** Mapa daje stronie gracza zestaw startowy (koszary, czołg, piechota, więcej robotów), a komputerowi wieżyczkę i mniej robotów. Symulator zabiera obu stronom wszystko poza centrum dowodzenia. Każda dostaje roboty i metal dowódcy: 2 roboty i 300 metalu.
- **Obie strony mapy.** Każda para frakcji gra z jednej i z drugiej pozycji, a mecze lustrzane mierzą samą mapę.
- **Wynik.** Mecz kończy zniszczenie centrum albo limit czasu (remis, oceniany osobno tym, co strona ma).
- **Opcje:**
  - `--maps horizon,frost,…|all`
  - `--factions`
  - `--seeds 2`
  - `--level easy|normal|hard`
  - `--minutes 30`
  - `--threads`
  - `--out`
  - `--quick` (2 mapy, 20 min — sprawdzenie narzędzia).
- **Czas.** Domyślny przebieg to 6 map × 2 ziarna × 4 frakcje z obu stron, czyli 240 meczów. Na 12 rdzeniach trwa ok. 21 minut.
- **Test:** `tests/balance.test.js` sprawdza równy start, wydobycie i budowę obu stron oraz wroga każdego dowódcy.

### Błąd wykryty przy pierwszym przebiegu

Pierwszy przebieg dał stronie 2 od 84% do 100% wygranych na każdej mapie. Przyczyna leżała w symulatorze, nie w mapach. `aiFoes(team)` (`enemy-ai.js`) bez sojuszy zwraca `[0]`, czyli „gracza”, dla każdego dowódcy. Dowódca strony 0 nękał więc własne roboty: zbudował 13, stracił 14. Natarcia słał na własną bazę. Symulator podaje teraz każdemu dowódcy za wroga stronę przeciwną. W samej grze strona 0 jest zawsze człowiekiem, więc tego błędu nie widać. Byłby widoczny dopiero wtedy, gdyby komputer kiedyś grał na stronie 0.

## Wyniki 2026-10-14

Ustawienia: poziom średni, mapy Cichy Horyzont, Biały Przesmyk, Popielny Szlak, Świetlisty Gąszcz, Rzeki Magmy i Bastion Admiralicji, po 2 ziarna, limit 30 minut, 240 meczów, żadnego remisu.

| Frakcja | Wygrane | Wydobycie (metal/min) | Pierwszy atak | Zniszczone / stracone |
|---|---|---|---|---|
| **Rój** | **86%** (62:10) | 770 | 2:53 | 1,13 |
| Wolne Kolonie | 47% | 839 | 2:16 | 0,84 |
| Wartownicy | 47% | 821 | 2:36 | 0,91 |
| **Dominium** | **19%** (14:58) | 634 | 3:33 | 1,12 |

**Pary:**
- Rój – Dominium 23:1;
- Rój – Wartownicy 22:2;
- Rój – Wolne Kolonie 17:7;
- Wartownicy – Dominium 20:4;
- Wolne Kolonie – Dominium 15:9;
- Wolne Kolonie – Wartownicy 12:12.

**Mapy.** Strona 1 wygrywa od 33% do 65% meczów. Nie ma przewagi powyżej progu ostrzeżenia (70%). Najbardziej nierówne są Cichy Horyzont (33/67) i Bastion Admiralicji (65/35).

## Wnioski (do sprawdzenia, nie wyroki)

To balans **dowódców AI**: wynik to frakcja i sposób, w jaki gra nią komputer (styl frakcji, plan poziomu), razem.

1. **Rój jest za silny w rękach dowódcy.** Wygrywa z każdym, najwyraźniej z Dominium i z Wartownikami. Wymienia straty z zyskiem 1,13, częściej dochodzi do doktryny (Pancerz 25×) i Twierdzy (43% meczów). Do sprawdzenia: pełzacze (wybuch przy śmierci) przeciw piechocie i Iskrom, regeneracja Kolosa, szybsze wylęganie (`FACTION_KIT.swarm.production`).
2. **Dominium jest za słabe — i za wolne.** Ma najmniejsze wydobycie (634 metalu/min), atakuje ostatnie (3:33), a wygrywa dopiero po długim meczu (15:45). Ma przy tym najwyższy szczyt armii (4,3 tys.) i dobrą wymianę (1,12). Wygląda to na styl „Twierdzy” dowódcy: wieżyczki, rzadkie i duże ataki. Ten styl przegrywa wyścig z szybszymi frakcjami. Do sprawdzenia: koszt frakcji (+12%) przy wolniejszym ruchu (−12%), plan dowódcy Dominium (`AI_STYLES`), pierwsze natarcie.
3. **Wolne Kolonie i Wartownicy są wyrównane** (12:12). Wymieniają straty ze stratą (0,84 i 0,91), a mecze z nimi kończą się najszybciej (12:19 i 11:27). Do Twierdzy i doktryny niemal nie dochodzą (4% i 2% meczów).
4. **Dowódcy nie budują sześciu jednostek:** artylerii, myśliwca, bombowca, transportera, wozu przeciwlotniczego i sabotażystów. Rzadko budują ciężką maszynę, Kolosa, Strażnika i Konstrukt (0–2%). To głównie sprawa planów produkcji dowódcy (`PRODUCERS` i jednostki w `AI_LEVELS`/`AI_STYLES`): lotnictwo i hangar są poza nimi. Gracz tych jednostek używa, ale w meczach komputera nic ich nie sprawdza.
5. **Mapy są bliskie równowagi.** Lekka przewaga strony 2 na Cichym Horyzoncie i strony 1 na Bastionie Admiralicji warta jest drugiego przebiegu z większą liczbą ziaren (`--seeds 4`).

## Po zmianach w dowódcy (0.174.1)

Przebieg ponowiony po dodaniu lotnictwa, artylerii, transporterów i sabotażystów (te same ustawienia, 240 meczów):

| Frakcja | Wygrane, z rozstrzygniętych |
|---|---|
| Rój | 81% |
| Wolne Kolonie | 56% |
| Wartownicy | 51% |
| Dominium | 13% |

Kierunek się nie zmienił. Żadnej jednostki bojowej nie brakuje już w planach dowódców. Szczegóły użycia są w tabeli „Jednostki specjalne w użyciu” w [raporcie](BALANS_RAPORT.md) i w [AI przeciwnika](AI_PRZECIWNIKA.md). Lotnictwo i artyleria pojawiają się rzadko, bo mecze AI kontra AI kończą się przed hangarem i działami (ok. 12 min na poziomie średnim, ok. 8 na trudnym).

## Co dalej

- Przebieg na trudnym poziomie (`--level hard`) i na wszystkich mapach (`--maps all`), żeby potwierdzić kierunki.
- Strojenie Roju i Dominium małymi krokami, każdy z ponownym przebiegiem. Raport pokaże, czy różnica maleje.
- Lotnictwo, artyleria i jednostki specjalne w planach dowódcy, żeby symulator mógł je w ogóle ocenić.
- Dalej z Etapu I: I3 (powtórki i raport po bitwie) da dane z gier ludzi.
