# Etap E — Wsparcie i moduły budynków (wersja 0.32)

Aktualizacja: 2026-09-27. Zakres z [Kierunków rozwoju §3–4](KIERUNKI_ROZWOJU.md): trzy budynki wsparcia, trzy jednostki i moduły budynków. Reguły są w `support-rules.js` (wszystkie liczby w `RTS.SUPPORT` i `RTS.MODULES`, łatwe do strojenia), wygląd w `support-art.js`.

## Budynki

| Budynek | Koszt · budowa · moc | Wymaganie | Działanie |
|---|---|---|---|
| ✚ Punkt medyczny | 180 · 14 s · 10 | ukończone koszary | Leczy do 3 rannych piechurów w promieniu 170 (12 PW/s, 1 metal za 8 PW). Leczone cele łączy przerywana linia. |
| ◎ Generator osłon | 320 · 20 s · 35 | centrum II — Kolonia | Kopuła w promieniu 230 przejmuje 70% obrażeń własnych budynków. Zapas 700, odnawia się 25/s po 4 s spokoju. Wyczerpana osłona przeciąża się na 12 s i wraca z 25% zapasu. |
| ♻ Plac odzysku | 160 · 14 s · 5 | — | Zniszczone pojazdy i budynki zostawiają wraki (25% kosztu, 15–140 metalu, znikają po 240 s). Roboty rozbierają wrak przez 3 s, zawożą metal na plac i same idą do następnego wraku w promieniu 450. Bez placu odzysk jest niemożliwy. |

## Jednostki

| Jednostka | Produkcja | Koszt · czas | Działanie |
|---|---|---|---|
| ✺ Wóz przeciwlotniczy | fabryka | 220 · 11 s | Mobilna OPL: 28 obrażeń co 0,6 s, zasięg 330, pełne obrażenia lotnictwu, 35% celom naziemnym. |
| ✢ Dron zwiadowczy | koszary | 90 · 6 s | Latający, bez uzbrojenia, szybki (210), widzenie 520. |
| ☍ Sabotażyści | koszary, centrum II | 140 · 8 s | Niewidoczni, dopóki wroga jednostka naziemna nie podejdzie na 150 (wieżyczki i budynki ich nie wykrywają; trafienie ujawnia ich na 3 s, a rozkaz ataku na czas walki). PPM na wrogi budynek: 4 s podkładania ładunku, budynek wyłączony na 25 s (nie strzela, nie produkuje), ładunek gotowy ponownie po 45 s. Sabotaż centrum wroga opóźnia jego falę o 15 s. Sami strzelają tylko na rozkaz ataku. |

## Moduły budynków

Jeden moduł na budynek, wybór z dwóch; wymaga centrum II — Kolonii, kosztuje 150 metalu i 40 gazu, montaż 12 s (budynek w tym czasie nie działa). Przyciski „Moduł: …” pojawiają się po zaznaczeniu budynku; podpowiedź podaje skutek lub powód niedostępności.

| Budynek | Moduł A | Moduł B |
|---|---|---|
| Koszary | Szkolenie weteranów: nowi żołnierze +20% wytrzymałości, +10% obrażeń, szkolenie +20% dłużej | Szybka rekrutacja: szkolenie o 30% krótsze |
| Fabryka | Ciężkie uzbrojenie: nowe pojazdy +15% obrażeń, +10% wytrzymałości | Logistyka: pojazdy o 25% szybciej i 10% taniej |
| Wieżyczka | Działo przeciwpancerne: +50% obrażeń pojazdom i budynkom, −30% piechocie | Wyrzutnia przeciwlotnicza: strzela także do lotnictwa |

## Interfejs i grafika

- Karty w zakładkach ARMIA i BUDOWA (bez skrótów klawiszowych), drzewo ROZWOJU i baza wiedzy z opisami.
- PPM robotami na wrak — odzysk; PPM sabotażystami na wrogi budynek — sabotaż (pozostałe zaznaczone jednostki atakują).
- Modele wszystkich nowych budynków i jednostek, zamontowane moduły widoczne na budynkach (⚙ podczas montażu), iskry i licznik „⚡ N s” na wyłączonym budynku, kopuła osłony (czerwona przerywana przy przeciążeniu), wraki z wartością, półprzezroczyści ukryci sabotażyści bez latarek.
- Wszystko rysuje się w Canvas 2D i natywnie w WebGL/WebGPU (wraki w warstwie gruntu, reszta przez modele i odtwarzanie nagrań) — bez warstw zastępczych.
- Zapis i odczyt gry obejmują wraki, moduły, montaż, ładunek robota i stan sabotażu.

## Ograniczenia

- AI przeciwnika nie buduje nowych budynków ani jednostek i nie montuje modułów (AI jest odłożone — [Pomysły AI-01–05](POMYSLY.md)).
- Balans jest wstępny — wymaga rozgrywek.
- Brak osobnych dźwięków dla leczenia, osłony i sabotażu (korzystają z istniejących dźwięków powiadomień).

## Weryfikacja

- `tests/support.test.js` — 13 testów: typy i wymagania (w tym odmowa kolejki bez wymagań), leczenie, osłona i przeciążenie, wraki i odzysk, wymagany plac, widzenie drona, ukrycie i sabotaż, opóźnienie fali, moduły koszar, fabryki i wieżyczki, wóz przeciwlotniczy, zapis i odczyt. `npm test`: 167/167.
- `tests/menu-browser.html` 37/37 (w tym katalog modeli), `tests/render-webgl-browser.html` — PASS.
- Scena z nowymi budynkami, jednostkami, wrakiem, modułem i osłoną w Canvas 2D, WebGL i WebGPU: bez błędów, bez warstw zastępczych.
- Potyczka w grze: nowe karty z właściwymi wymaganiami, przyciski modułów, konsola bez błędów.
