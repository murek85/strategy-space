# Raport balansu — mecze AI kontra AI

Wygenerowano: 2026-10-14 11:08 narzędziem `node tools/balance.js` (I1), wersja gry 0.174. Plik nadpisywany przy każdym uruchomieniu; dane: `BALANS_RAPORT.json`.

**Ustawienia:** 240 meczów, poziom dowódców „normal”, mapy: Cichy Horyzont, Biały Przesmyk, Popielny Szlak, Świetlisty Gąszcz, Rzeki Magmy, Bastion Admiralicji; ziaren: 2; limit 30 min gry; czas obliczeń 18 min. Obie strony prowadzi dowódca AI. Start równy (centrum, 2 roboty, 300 metalu), każda para frakcji gra z obu stron mapy.

> Uwaga: to balans **dowódców AI**, nie graczy — wynik zależy też od tego, jak AI gra daną frakcją (styl frakcji, plan poziomu). Silna różnica to sygnał do sprawdzenia, nie wyrok.

## 1. Frakcje — bilans

| Frakcja | Mecze (bez lustrzanych) | Wygrane | Przegrane | Remisy (limit czasu) | Wygrane z rozstrzygniętych | Średni czas wygranej | Metal/min (wydobycie) | Szczyt armii (metal) | Pierwszy atak | Zniszczone / stracone (metal) |
|---|---|---|---|---|---|---|---|---|---|---|
| Wolne Kolonie | 72 | 40 | 32 | 0 | **56%** | 12:57 | 849 | 3135 | 2:16 | 0.85 |
| Dominium | 72 | 9 | 63 | 0 | **13%** | 14:39 | 649 | 4354 | 3:33 | 1.13 |
| Rój | 72 | 58 | 14 | 0 | **81%** | 12:34 | 787 | 3957 | 2:53 | 1.11 |
| Wartownicy | 72 | 37 | 35 | 0 | **51%** | 11:43 | 814 | 3812 | 2:36 | 0.92 |

## 2. Frakcja przeciw frakcji

Wygrane frakcji z wiersza przeciw frakcji z kolumny (obie strony mapy razem; w nawiasie remisy).

| | Wolne Kolonie | Dominium | Rój | Wartownicy |
|---|---|---|---|---|
| **Wolne Kolonie** | — | 20/24 | 10/24 | 10/24 |
| **Dominium** | 4/24 | — | 1/24 | 4/24 |
| **Rój** | 14/24 | 23/24 | — | 21/24 |
| **Wartownicy** | 14/24 | 20/24 | 3/24 | — |

## 3. Mapy — przewaga strony

Wszystkie mecze na mapie (także lustrzane); równe mapy dają strony blisko 50%.

| Mapa | Mecze | Strona 1 (gracza) | Strona 2 | Remisy |
|---|---|---|---|---|
| Cichy Horyzont | 40 | 38% | 63% | 0 |
| Biały Przesmyk | 40 | 48% | 53% | 0 |
| Popielny Szlak | 40 | 53% | 48% | 0 |
| Świetlisty Gąszcz | 40 | 55% | 45% | 0 |
| Rzeki Magmy | 40 | 48% | 53% | 0 |
| Bastion Admiralicji | 40 | 58% | 43% | 0 |

## 4. Jednostki — co budują dowódcy

| Frakcja | Jednostki bojowe (udział w zbudowanych) | Doktryna | Twierdza |
|---|---|---|---|
| Wolne Kolonie | Czołg zwiadowczy 26%, Piechota 21%, Zwiadowca Kolonii 18%, Grenadierzy 15%, Rakietowiec 15%, Sabotażyści 2%, Ciężka maszyna 1%, Transporter opancerzony 1%, Artyleria 0%, Myśliwiec 0%, Bombowiec 0% | doctrineMobility ×2 | 2% meczów |
| Dominium | Piechota 30%, Miotacze ognia 26%, Rakietowiec 24%, Czołg zwiadowczy 6%, Bastion Dominium 5%, Sabotażyści 4%, Niszczyciel czołgów 3%, Ciężka maszyna 1%, Transporter opancerzony 0%, Myśliwiec 0%, Artyleria 0%, Bombowiec 0% | doctrineShields ×12, doctrineBarrage ×6 | 21% meczów |
| Rój | Pełzacz 22%, Piechota 22%, Czołg zwiadowczy 19%, Rakietowiec 16%, Pluwacz 13%, Sabotażyści 3%, Ciężka maszyna 2%, Kolos 1%, Transporter opancerzony 1%, Artyleria 0%, Myśliwiec 0%, Bombowiec 0%, Wóz przeciwlotniczy 0% | doctrineCarapace ×15, doctrineTide ×4 | 29% meczów |
| Wartownicy | Iskra 51%, Rakietowiec 16%, Piechota 12%, Pryzmat 6%, Czołg zwiadowczy 5%, Łuk 5%, Sabotażyści 2%, Strażnik 1%, Transporter opancerzony 1%, Ciężka maszyna 0%, Konstrukt 0%, Myśliwiec 0% | — | 1% meczów |

Jednostki bojowe, których **żaden** dowódca nie zbudował: brak. Jednostki wspólne mogą też być niedostępne którejś frakcji — do przejrzenia.

### Jednostki specjalne w użyciu

Na mecz (średnio): piechota przewieziona transporterem, desanty, budynki wyłączone przez sabotażystów, najwięcej maszyn w powietrzu naraz; w nawiasie — w ilu meczach choć raz.

| Frakcja | Przewiezieni | Desanty | Sabotaże | Lotnictwo (szczyt) | Artyleria zbudowana | Wozy przeciwlotnicze |
|---|---|---|---|---|---|---|
| Wolne Kolonie | 1.7 (75) | 0.8 (75) | 0.4 (33) | 0.1 (11) | 0.2 (22) | 0.0 (0) |
| Dominium | 1.5 (39) | 0.4 (39) | 0.3 (19) | 0.2 (17) | 0.1 (15) | 0.0 (0) |
| Rój | 4.3 (109) | 1.5 (109) | 0.5 (33) | 0.7 (43) | 0.8 (61) | 0.1 (9) |
| Wartownicy | 1.4 (66) | 0.6 (64) | 0.3 (24) | 0.0 (1) | 0.0 (0) | 0.0 (0) |

## 5. Przebieg (średnio, co 5 minut)

| Frakcja | 5 min: wartość armii / roboty | 10 min: wartość armii / roboty | 15 min: wartość armii / roboty | 20 min: wartość armii / roboty | 25 min: wartość armii / roboty | 30 min: wartość armii / roboty |
|---|---|---|---|---|---|---|
| Wolne Kolonie | 1727 / 6.0 (120) | 1936 / 5.0 (102) | 2484 / 6.0 (12) | 2871 / 6.0 (1) | — | — |
| Dominium | 2623 / 6.0 (120) | 2536 / 5.0 (113) | 1835 / 4.6 (47) | 1676 / 4.4 (14) | 1068 / 4.3 (3) | — |
| Rój | 1845 / 6.0 (120) | 3029 / 5.7 (116) | 1485 / 5.1 (23) | 1206 / 5.8 (4) | 3753 / 6.0 (1) | — |
| Wartownicy | 2158 / 6.0 (120) | 1996 / 4.9 (97) | 1123 / 3.8 (18) | 1710 / 4.0 (3) | — | — |

W nawiasie: ile stron trwało jeszcze w tej minucie (mecze kończą się wcześniej).

## 6. Sygnały do sprawdzenia

- Dominium wygrywa tylko 13% rozstrzygniętych meczów — możliwa słabość frakcji (albo jej AI).
- Rój wygrywa 81% rozstrzygniętych meczów — możliwa przewaga frakcji (albo jej AI).
- Wolne Kolonie – Dominium: 20:4 — jednostronne starcie.
- Dominium – Rój: 1:23 — jednostronne starcie.
- Dominium – Wartownicy: 4:20 — jednostronne starcie.
- Rój – Wartownicy: 21:3 — jednostronne starcie.

## Jak uruchomić

```
node tools/balance.js                 # 6 map × 2 ziarna × 4 frakcje, obie strony (240 meczów, ok. 20 min na 12 rdzeniach)
node tools/balance.js --quick         # sprawdzenie narzędzia: 2 mapy, 1 ziarno, 20 min
node tools/balance.js --maps all --seeds 3 --level hard --minutes 40
```
