# Sztuczna inteligencja przeciwnika — dowódca AI (wersja 0.34)

Aktualizacja: 2026-09-27. Realizuje pomysły [AI-01–AI-05](POMYSLY.md): gospodarkę, płatną produkcję, obronę, przejmowanie przekaźników, odbudowę i poziomy trudności. Reguły są w `enemy-ai.js` (ładowany jako ostatni moduł reguł); wszystkie liczby w `RTS.AI_LEVELS` i `RTS.AI`.

## Zakres

- **Scenariusze** mają domyślnie dowódcę AI. W ustawieniach („Przeciwnik”) można wybrać **klasyczne desanty** — dawnego przeciwnika bez gospodarki, z darmowymi falami co 35–65 s. Wybór trafia do kodu operacji (przyrostek `-W` dla klasycznych desantów).
- **Kampania** zachowuje swoje zaplanowane fale i skrypty; dowódca AI jej nie dotyczy.
- Zapisy scenariuszy sprzed tej wersji wczytują się z klasycznymi desantami.
- Każda strona AI (w grze na 3–4 graczy każda osobno) ma własny skarbiec, roboty, bazę i plan ataków.

## Co robi dowódca

**Gospodarka (AI-01).** Startuje z 300 metalu i dwoma robotami. Roboty wydobywają rudę ze złóż po swojej stronie mapy (bliżej własnego centrum niż centrum gracza, z dala od innych baz), rozkładając się między złoża, i zawożą ją do centrum lub magazynu. Do tego dochód pasywny i dochód z przejętych przekaźników. Zabite roboty są odtwarzane w centrum (za metal), więc niszczenie robotów i wydobycia spowalnia przeciwnika.

**Budowa i odbudowa (AI-04).** Plan budowy zależy od poziomu i czasu gry (koszary, wieżyczki, fabryka, magazyn przy dalszym złożu, drugie koszary, hangar). Budynek stawia robot — bez robota plac budowy stoi. Zniszczony budynek wraca do planu i jest stawiany ponownie. Wieżyczki stoją od strony środka mapy; plac jest sprawdzany (teren, inne obiekty, złoża, przekaźniki).

**Produkcja (AI-02).** Każda jednostka kosztuje metal (z mnożnikiem kosztu frakcji) i czas w koszarach, fabryce, hangarze lub centrum. Wyłączony budynek (sabotaż, montaż modułu) nie produkuje. Wielkość armii rośnie z czasem do limitu poziomu. Skład: piechota i rakietowcy, czołgi, jednostki frakcji (zwiadowca Kolonii, bastion Dominium), później ciężkie maszyny, artyleria i lotnictwo; na średnim i trudnym skład przesuwa się przeciw armii gracza (rakietowcy przeciw pojazdom, czołgi i piechota przeciw piechocie, wozy przeciwlotnicze i myśliwce przeciw lotnictwu).

**Obrona (AI-03).** Wrogie jednostki przy bazie lub budynkach ściągają obrońców; gdy zagrożenie jest duże, pomaga atak znajdujący się blisko bazy. Na średnim i trudnym roboty uciekają przed wrogiem do centrum. Trudny zawraca daleki atak, gdy baza przegrywa, i po zagrożeniu stawia dodatkową wieżyczkę.

**Przekaźniki (AI-03).** Część armii przejmuje i trzyma najbliższe przekaźniki, które nie należą do tej strony (łatwy — tylko po swojej stronie mapy).

**Ataki.** Atak jest planowany na konkretny czas — to on jest widoczny w panelu jako „Planowany atak”. Gdy nadchodzi, a armia jest za mała, atak przesuwa się o 15–25 s. Wychodzą jednostki spoza garnizonu (część zostaje w bazie), a ocalali z poprzedniego ataku dołączają. Cel: łatwy — centrum dowodzenia, średni — najbliższy budynek gracza, trudny — najsłabiej broniony budynek (z uwzględnieniem odległości). Trudny wycofuje atak, który stracił ponad 65% siły i przegrywa, oraz co 75 s (od 5. minuty) wysyła 2–3 szybkie jednostki na roboty gracza przy najdalszym złożu.

**Tryby.** Utrzymanie przekaźników: ataki idą na przekaźniki, a oddział przekaźników jest większy. Ekspedycja: od 150. sekundy dwie trzecie każdego ataku idzie po artefakt. Obrona: ataki częściej (×0,85) i dochód +25%. Sabotaż centrum przeciwnika opóźnia planowany atak tej strony o 15 s.

**Ulepszenia.** Średni: pancerz po 9 min; trudny: pancerz po 6 min, broń po 9 min (−20% otrzymywanych i +20% zadawanych obrażeń), za metal.

## Poziomy trudności

| | Łatwy | Średni | Trudny |
|---|---|---|---|
| Decyzje co | 4 s | 2 s | 1 s |
| Roboty | 4 | 6 | 8 |
| Dochód pasywny / za przekaźnik | 2 / 1 metalu/s | 3 / 2 | 4,5 / 3 |
| Tempo budowy / produkcji | ×0,8 / ×1,3 czasu | ×1 / ×1 | ×1,2 / ×0,85 czasu |
| Limit armii (start + na minutę, maks.) | 4 + 1,5/min, 16 | 6 + 2,5/min, 28 | 8 + 4,5/min, 45 |
| Pierwszy atak / odstęp | 240 s / 150 s | 170 s / 110 s | 120 s / 75 s |
| Wielkość ataku (+ za każdy kolejny, maks.) | 4 (+2), 10 | 6 (+2), 16 | 8 (+4), 30 |
| Wieżyczki | 1 | 2 (+2 przy nadwyżce) | 3 (+1 po zagrożeniu, +2 przy nadwyżce) |
| Fabryka / drugie koszary / magazyn / hangar | 7 min / — / — / — | 3 min / 8 min / 3:20 / — | 1:50 / 5 min / 2:30 / 7 min |
| Dobór przeciw armii gracza | nie | częściowy | pełny |
| Cel ataku | centrum | najbliższy budynek | najsłabiej broniony budynek |
| Ucieczka robotów, wycofanie ataku, nękanie | — | ucieczka | wszystko |

Istniejąca różnica wytrzymałości jednostek przeciwnika (×0,85 / ×1 / ×1,15) zostaje. W menu poziom „Normalny” nazywa się teraz „Średni”; pod wyborem przeciwnika jest opis zachowania na wybranym poziomie.

## Interfejs

- Panel wywiadu: „Planowany atak” z odliczaniem i opis stanu przeciwnika; komunikat przy ataku podaje stronę, numer ataku, liczbę jednostek i cel.
- `game.aiReport()` zwraca stan każdej strony (metal, roboty, armia, budynki, ataki, ulepszenia) — do testów i przyszłego panelu.

## Weryfikacja

- `tests/enemy-ai.test.js` — 16 testów: domyślny dowódca w scenariuszach i brak zmian w kampanii, klasyczne desanty jako opcja, brak darmowych jednostek (bez metalu nic nie powstaje), wydobycie i uzupełnianie robotów, różnice poziomów (roboty, budynki, wielkość armii, limit), odbudowa, obrona i ucieczka robotów, przekaźniki, ataki (czas, minimum, cel dla każdego poziomu), cel i wycofanie na trudnym, dobór jednostek, ulepszenia, sabotaż centrum, osobny dowódca każdej strony, tryby, zapis i odczyt, kod operacji. `npm test`: 194/194.
- Symulacje 15 minut na Cichym Horyzoncie, 2 graczy, przeciw botowi gracza, który trzyma roboty przy wydobyciu, szkoli piechotę i rakietowców w jednych koszarach, stawia 3 wieżyczki i rusza armią na wrogów przy swoich budynkach (bez fabryki i badań):

| Poziom | Wynik bota | Ataki AI | Armia AI (6. / 9. min) |
|---|---|---|---|
| Łatwy | przetrwał 15 min, baza nietknięta | 4 | 13 / 16 |
| Średni | przetrwał 15 min pod dużą presją (ponad 100 zniszczonych jednostek AI) | 5 | 19 / 28 |
| Trudny | porażka po 471 s | 4 do 6. minuty | 35 / — |

  Dla porównania klasyczne desanty przeciw botowi, który się tylko broni: łatwy — przetrwał, średni — porażka po 583 s, trudny — porażka po 388 s.
- Wszystkie 8 map scenariuszy, 4 tryby, 3 rozmiary, 4 graczy, trudny: 6 min symulacji bez błędów.
- Koszt obliczeń dowódcy: ok. 0,07 ms na krok symulacji.
- W przeglądarce: menu (Łatwy/Średni/Trudny, wybór przeciwnika, opis poziomu, kod operacji), potyczka na trudnym w WebGPU bez błędów w konsoli; baza przeciwnika po 2,5 min (centrum, koszary, fabryka, trzy wieżyczki, przejęty przekaźnik, roboty przy rudzie) rysowana w Canvas i WebGL bez warstw zastępczych. `tests/menu-browser.html` 37/37.

## Ograniczenia

- Dowódca zna położenie budynków i armii gracza (jak dawne desanty) — nie korzysta z mgły wojny.
- Nie buduje murów, ekstraktorów gazu, laboratoriów ani budynków wsparcia etapu E i nie używa transporterów, dronów ani sabotażystów.
- Strony AI nie tworzą sojuszu: w grze na 3–4 graczy walczą także między sobą, gdy się spotkają, ale atakują tylko gracza.
- Balans oparty na symulacjach z prostym botem — wymaga rozgrywek.
