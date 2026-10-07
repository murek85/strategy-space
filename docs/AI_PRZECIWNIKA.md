# Sztuczna inteligencja przeciwnika — dowódca AI (wersja 0.34; styl frakcji 0.51, kampania 0.97–0.98 i 0.102)

Aktualizacja: 2026-09-27. Realizuje pomysły [AI-01–AI-05](POMYSLY.md): gospodarkę, płatną produkcję, obronę, przejmowanie przekaźników, odbudowę i poziomy trudności. Reguły są w `enemy-ai.js` (ładowany jako ostatni moduł reguł); wszystkie liczby w `RTS.AI_LEVELS` i `RTS.AI`.

## Mgła wojny dla dowódcy (wersja 0.129, 2026-10-07)

Ustawienia: `RTS.AI_FOG = { on, refresh: 0.5, armyDecay: 0.985, workerMemory: 90, scoutEvery: [160, 100, 70], scoutTime: 40 }`.

- Widzenie (`aiVision(team)`): siatka komórek mapy (`RTS.CELL`) widocznych dla jednostek i budynków strony i jej sojuszników (zasięg wzroku jak w silniku) oraz jej przekaźników, odświeżana co 0,5 s, z czasem ostatniego zobaczenia każdej komórki (nie zapisywana — po wczytaniu liczona od nowa). `aiSees(team, x, y)`.
- Pamięć (`T.intel`, w zapisie): `structures` — budynki wroga widziane kiedykolwiek, z ostatnim miejscem, usuwane dopiero, gdy jego miejsce jest widoczne, a budynku nie ma; `army` — liczba jednostek każdego typu (większa z widzianej teraz i zapamiętanej, zanikająca o 1,5% przy każdym odświeżeniu); `workers` — robotnicy widziani w ostatnich 90 s. Na starcie: budynki bazy startowej wroga (pozycje startowe są znane); stare zapisy dostają centra dowodzenia wroga.
- Decyzje: zagrożenia bazy i ucieczka robotów — tylko widoczni wrogowie; dobór jednostek (`aiPlayerArmy`) — zapamiętana armia; cel ataku (`aiTarget`, `aiKnown`) — znane budynki, obrona celu na trudnym = znane wieżyczki w promieniu 450; bez wiedzy — widoczne oddziały albo „rozpoznanie” złoża lub przekaźnika najdawniej oglądanego; zniszczenie celu zauważone dopiero, gdy jego miejsce jest widoczne; uderzenie orbitalne — widoczne skupiska albo znane budynki; najazdy — zapamiętani robotnicy.
- Zwiad (`aiScout`): co 160 / 100 / 70 s (łatwy / średni / trudny) najszybsza wolna jednostka (najpierw latająca) jedzie do najdawniej oglądanego z: znanych budynków wroga, złóż, przekaźników (dalej niż 700 od bazy), na 40 s, potem wraca do obrony.
- Testy: `tests/ai-fog.test.js` (4); `tests/factions.test.js` — uderzenie orbitalne tylko w widzianą grupę. Symulacja 15 min przeciw biernemu graczowi (Cichy Horyzont, Biały Przesmyk): armia podobna, ataki tak samo lub nieco rzadsze, przeciwnik nadal wygrywa na średnim i trudnym.

## Zakres

- **Scenariusze** mają domyślnie dowódcę AI. W ustawieniach („Przeciwnik”) można wybrać **klasyczne desanty** — dawnego przeciwnika bez gospodarki, z darmowymi falami co 35–65 s. Wybór trafia do kodu operacji (przyrostek `-W` dla klasycznych desantów).
- **Kampania** zachowuje swoje zaplanowane fale i skrypty z wyjątkiem rozdziałów II, III i VI, w których od 0.97 Dominium prowadzi dowódca AI (zob. [niżej](#dowódca-ai-w-kampanii-wersja-097-2026-10-07)); akt III korzysta z dowódcy od początku.
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

## Styl frakcji (0.51)

Na plan poziomu trudności nakłada się styl frakcji przeciwnika (`RTS.AI_STYLES` w `enemy-ai.js`; `game.aiLevel(drużyna)` zwraca poziom zmieniony przez styl, `game.aiLevel()` bez drużyny — sam poziom).

| | Dominium — „Twierdza” | Kolonie — „Nękanie” | Rój — „Fala” |
|---|---|---|---|
| Wieżyczki | 2 dodatkowe (ok. 2. i 6. minuta) | jak poziom | jak poziom |
| Pierwszy atak | ×1,25 później | ×0,8 wcześniej | jak poziom |
| Odstęp ataków | ×1,4 | ×0,7 | jak poziom |
| Wielkość ataku | ×1,35, minimum +2 | ×0,75, minimum −1 | jak poziom |
| Przekaźniki (udział armii) | ×0,5 | ×2, co najmniej 35% | jak poziom |
| Nękanie robotów | nigdy | od 3. minuty co 55 s (od średniego) | jak poziom |
| Wycofanie przegranego ataku | jak poziom | tak (od średniego) | jak poziom |
| Jednostki | bastiony ×1,8, ciężkie ×1,6 (o 1,5 min wcześniej), niszczyciele ×1,3, mniej piechoty, bez zwiadowców; fabryka o 1 min wcześniej | zwiadowcy ×2,5, grenadierzy ×1,2, mniej ciężkich | jak poziom |

Na łatwym Kolonie nie nękają robotów i nie wycofują ataków (poziom zachowuje łagodny charakter), zmienia się tylko tempo i przekaźniki.

**Kampania (0.102).** Styl wybiera `game.aiStyleKey(drużyna)` — w scenariuszach frakcja strony; w rozdziałach kampanii z dowódcą (II, III, VI) Dominium gra stylem „Twierdza”, choć nie ma frakcji scenariusza (bez jej cech: wytrzymałości, kosztów, tempa produkcji). Z tym samym kluczem dowódca dobiera jednostki (bastiony, ciężkie maszyny, miotacze ognia; bez zwiadowców) i budynki; stacji orbitalnej nie stawia (`uplinkAt: null`). Dostrojenie rozdziałów nakłada się na styl — mnożniki pierwszego ataku i odstępu obniżone (II ×1,15 / ×0,95, III ×0,9 / ×0,85, VI ×0,85 / ×0,85), więc ataki przychodzą rzadziej niż w samym poziomie, ale nie aż tak jak w czystej „Twierdzy”. Akt III bez zmian (Rój — „Fala”, sojusznik Varn — Dominium scenariusza).

Symulacje 12 min z botem bez rozbudowy i bez natarcia: średni — bot przetrwał wszystkie trzy rozdziały (wcześniej VI: porażka po 706 s); trudny — II przetrwał (centrum 1666/2600), III porażka po 398 s, VI po 450 s. Nacisk na bazę gracza zmalał na średnim, za to baza Dominium jest mocniejsza — przełamanie jej to zadanie gracza. W menu opis przeciwnika mówi też o stylu wybranej frakcji (albo wszystkich trzech, gdy frakcja jest losowa). Domyślny przeciwnik scenariuszy to Dominium, więc zwykła potyczka ma teraz rzadsze, ale większe ataki i więcej wieżyczek.

Symulacja 10 min, średni, bierny gracz: Dominium — pierwszy atak w 214. s, 6 wieżyczek, w armii bastiony i niszczyciele; Kolonie — pierwszy atak w 136. s, zwiadowcy nękają roboty, wygrana ok. 200. s; Rój — pierwszy atak w 170. s.

## Dowódca AI w kampanii (wersja 0.97, 2026-10-07)

Reguły w `campaign-ai.js` (ładowany po `campaign-act3.js`), dostrojenie rozdziałów w `RTS.CAMPAIGN_AI`.

- **Poziom trudności kampanii** — Łatwy, Średni (domyślny), Trudny; wybór w odprawie każdego rozdziału kampanii, zapamiętany w postępie kampanii (`CampaignProgress.difficulty`, klucz `pogranicze-campaign-v1`). `game.applyCampaignLevel(poziom)` wywoływane raz na starcie rozdziału (nie przy wczytaniu zapisu) i zapisywane w zapisie gry (`campaignLevel`).
- **Siła przeciwnika we wszystkich rozdziałach**: wytrzymałość i obrażenia strony przeciwnika ×0,85 / ×1 / ×1,15 (jak poziom scenariusza; fauna i gracz bez zmian) — także jednostki skryptowanych desantów.
- **Dowódca zamiast desantów** w rozdziałach II, III i VI: Dominium dostaje gospodarkę i plan poziomu (roboty, budowa, odbudowa, obrona, przekaźniki, ataki, ulepszenia). Garnizon z mapy staje się obroną bazy. Darmowe desanty są wyłączone; każda fala to atak dowódcy. Od 0.102 z nałożonym stylem Dominium „Twierdza” (bez frakcji scenariusza); mnożniki w tabeli działają na plan poziomu już zmieniony przez styl, a symulacje pod tabelą pochodzą z wersji 0.97, sprzed stylu.
- **Akt III**: dowódca rozdziałów VII–IX przyjmuje poziom kampanii zamiast stałego „Średniego” (czas pierwszego ataku liczony od nowa).

| Rozdział | Pierwszy atak | Odstęp | Wielkość ataku | Armia | Metal na start | Hangar |
|---|---|---|---|---|---|---|
| II · Archiwum pod lodem | ×1,15 | ×0,95 | ×0,85 | ×0,85 | 250 | nie |
| III · Świt nad Nadir | ×0,9 | ×0,85 | ×0,9 | ×0,95 | 300 | wg poziomu |
| VI · Serce popiołu | ×0,85 | ×0,85 | ×1 | ×1 | 350 | nie |

Symulacje 12 minut, bot gracza z [wcześniejszych symulacji](#weryfikacja) w uproszczonej wersji (roboty przy rudzie, piechota i rakietowcy z koszar, obrona przy budynkach; bez rozbudowy, wieżyczek i celów rozdziału):

| Rozdział | Łatwy | Średni | Trudny | Dawne desanty (dla porównania) |
|---|---|---|---|---|
| II | przetrwał, centrum nietknięte | przetrwał (4 ataki w 11 min) | porażka po 417 s | przetrwał (centrum 2032/2600) |
| III | przetrwał (przed złagodzeniem rozdziału) | przetrwał (centrum 2152/2600) | porażka po 424 s | porażka po 647 s |
| VI | przetrwał, centrum nietknięte | porażka po 706 s | porażka po 656 s | przetrwał na włosku (centrum 110/2600) |

Rozdziały wymagają dalszego strojenia z prawdziwych rozgrywek — bot nie wykonuje celów misji (magazyny, przekaźniki, decyzja o kompleksie), a dowódca może o przekaźniki walczyć.

## Zdarzenia w rozdziałach kampanii (wersja 0.98, 2026-10-07)

Reguły w `campaign-events.js` (po `campaign-ai.js`): `RTS.CAMPAIGN_EVENTS` (zestaw na rozdział), `RTS.CAMPAIGN_EVENT_TUNE` (wartości poziomów), `RTS.CAMPAIGN_EVENT_RULES` (stałe). Zdarzenia startują razem z poziomem kampanii na początku rozdziału, sprawdzane co 0,5 s, stan w zapisie gry (`campaignEvents`). Komunikaty idą łącznością (dziennik w aktach II–III, powiadomienia w akcie I).

- **Przechwycony rozkaz** (rozdziały z dowódcą AI: II, III, VI): 25 s przed planowanym atakiem — „grupa uderzeniowa N, ok. X jednostek — wymarsz za … s” i rada Liry.
- **Kontratak o przekaźnik** (I, II, III, VI): przekaźnik przejęty przez gracza → po 40 / 22 / 12 s (łatwy / średni / trudny) wróg wysyła 3 / 4 / 6 jednostek, żeby go odbić (dowódca — z wolnych jednostek, zawsze zostawia 2 w bazie; rozdział I — oddział z bazy wroga). Ten sam przekaźnik najwyżej co 90 s.
- **Uderzenie na tyły** (I, II, III, VI, VII, IX): co najmniej 6 uzbrojonych jednostek gracza w promieniu 650 od wrogiego centrum → 2 / 3 / 4 najszybsze jednostki ruszają na najdalszego od wroga robota gracza; potem przerwa 200 / 150 / 110 s.
- **Posiłki** (wszystkie rozdziały I–IX): raz na rozdział, po 60. sekundzie, gdy centrum ma mniej niż 45% wytrzymałości albo gracz stracił 8 jednostek w 60 s i zostało mu mniej niż 5: łatwy — 3 piechurów, 2 rakietowców i czołg; średni — 2 piechurów, rakietowiec i czołg; trudny — 2 piechurów i rakietowiec. Mówi Lira (V — kpt. Vale, VIII — kmdr Varn).
- **Sabotażyści dowódcy** (II, III, VI; od średniego): od 300 / 210 s co 170 / 120 s dowódca płaci 280 metalu, po 16 s przy koszarach pojawia się para sabotażystów z 2 ładunkami. Cel: reaktor, fabryka, laboratorium, hangar, koszary, na końcu centrum (najbliższy nie wyłączony); po zużyciu ładunków wracają. Działa mechanika etapu E: ukryci, dopóki nie podejdzie jednostka gracza; ładunek wyłącza budynek na 25 s. Łączność ostrzega o wyłączonym budynku (najwyżej co 20 s).

Testy: `tests/campaign-events.test.js` (7). Symulacje 8 minut wszystkich rozdziałów I–IX na średnim (bot bez gospodarki, nacierający na wrogie centrum od 4. minuty): bez błędów; w rozdziałach II, III i VI nasłuch zapowiadał ataki, sabotażyści wyłączali koszary i reaktor, posiłki lądowały w I, II, III, VI i IX.

## Interfejs

- Panel wywiadu: „Planowany atak” z odliczaniem i opis stanu przeciwnika; komunikat przy ataku podaje stronę, numer ataku, liczbę jednostek i cel.
- `game.aiReport()` zwraca stan każdej strony (metal, roboty, armia, budynki, ataki, ulepszenia) — do testów i przyszłego panelu.

## Weryfikacja

- Styl frakcji (0.51): 2 nowe testy w `tests/enemy-ai.test.js` — parametry stylu dla każdego poziomu (Rój bez zmian, nękanie Kolonii od średniego) oraz rozgrywka: więcej wieżyczek Dominium niż Kolonii po 7 min, dobór jednostek (bastiony i ciężkie maszyny w fabryce Dominium, zwiadowcy w koszarach Kolonii, żadnych zwiadowców Dominium), wysłanie zwiadowców Kolonii na robota przy dalekim złożu i odstęp kolejnego nękania. Test ataków według poziomu używa Roju (plan poziomu bez stylu). `npm test` 256/256.
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
- Nie buduje murów, ekstraktorów gazu, laboratoriów ani budynków wsparcia etapu E i nie używa transporterów ani dronów. Sabotażystów używa tylko w rozdziałach kampanii z dowódcą (0.98).
- Strony AI nie tworzą sojuszu: w grze na 3–4 graczy walczą także między sobą, gdy się spotkają, ale atakują tylko gracza.
- Balans oparty na symulacjach z prostym botem — wymaga rozgrywek.
