# Scenariusze: Ekspedycja, ziarno mapy, gotowe ustawienia (wersja 0.33)

Aktualizacja: 2026-09-27. Zakres z [Kierunków rozwoju §9](KIERUNKI_ROZWOJU.md) i otwartych punktów [etapu C](ETAP_C_TRYBY_I_MAPY.md). Reguły są w `scenario-setup.js` (ładowany po pozostałych modułach reguł; liczby w `RTS.SCENARIO_OPTIONS`, `RTS.SCENARIO_PRESETS` i `RTS.EXPEDITION`), formularz w `menu.js`, rysunek artefaktu w `render-canvas.js`.

## Tryb „Ekspedycja po artefakt”

- Artefakt obcych leży na wykopalisku: w miejscu dostępnym pieszo, na wolnym terenie, możliwie daleko od wszystkich baz i w podobnej odległości od każdej z nich. Pilnuje go trzech strażników — groźny gatunek z danej mapy (albo jego odpowiednik z klasycznego biomu).
- Jednostka naziemna (także robot) podnosi artefakt w 8 s, stojąc przy nim; postęp stoi, gdy obok jest jednostka innej strony, i spada, gdy wszyscy odejdą.
- Niosący porusza się o 30% wolniej, jest zawsze widoczny (sabotażysta traci ukrycie). Gdy zginie albo wsiądzie do transportera, artefakt upada na ziemię w tym miejscu.
- Dostarczenie artefaktu do własnego centrum dowodzenia daje zwycięstwo; dostarczenie go przez przeciwnika — porażkę. Zniszczenie wszystkich wrogich centrów nadal wygrywa.
- Przeciwnik: po 150 s wysyła po artefakt trzy jednostki z garnizonu, a od tej chwili dwie trzecie każdego desantu idą po artefakt albo ścigają niosącego. Niosący przeciwnik wraca prosto do swojego centrum, a reszta go eskortuje. Desanty sprzed 150. sekundy atakują tylko bazę.
- Artefakt jest widoczny przez mgłę wojny (to sygnał) na planszy i minimapie; pierścień postępu podnoszenia, pierścień w kolorze niosącego, stan w panelu celów („Artefakt niesie: …, do centrum …”). Podgląd mapy w menu pokazuje miejsce wykopaliska.

## Ziarno mapy

- Pole „Ziarno mapy” (1–999999, przycisk „Losuj”); puste oznacza klasyczny układ, taki jak dotąd.
- Ziarno zmienia: przydział narożników, położenie złóż (przy bazach tylko nieznacznie i nigdy dalej od bazy), ich zasobność (±15%), 2–4 nowe skały i położenie siedlisk; przekaźniki układają się na nowo przy złożach.
- Każdy wariant jest sprawdzany: wszystkie bazy, przekaźniki i najbliższe złoża muszą być osiągalne pieszo z bazy gracza, liczba przekaźników się nie zmienia, dojście każdej bazy do metalu i gazu nie może się istotnie pogorszyć, a żadna jednostka nie może stać na przeszkodzie. Po ośmiu nieudanych próbach zostaje układ klasyczny (w testach wszystkie mapy i rozmiary przechodzą).
- To samo ziarno na tej samej mapie i z tymi samymi ustawieniami daje ten sam układ.

## Ustawienia zasad

| Ustawienie | Wartości | Działanie |
|---|---|---|
| Czas obrony | 5, 10, 15, 20 min | Tylko tryb Obrona (wcześniej stałe 10 min) |
| Pula punktów | 60, 90, 120, 150 pkt na przekaźnik | Tylko tryb Utrzymanie przekaźników (wcześniej stałe 90) |
| Złoża | ubogie ×0,65 · zwykłe · bogate ×1,5 | Zasobność rudy, gazu i kryształów |
| Fauna | nieliczna (połowa) · zwykła · liczna (+50%, co najmniej 2 siedliska więcej) | Siedliska i zwierzęta z dala od baz |
| Pogoda | łagodna · zwykła · surowa | Łagodna: burza co 300 s, 40 s, do 55% siły; surowa: co 150 s, 70 s, pełna siła |

Cele operacji w menu i w grze podają wybrany czas i pulę.

## Gotowe ustawienia

| Zestaw | Zasady |
|---|---|
| Standardowe | Podbój, 2 graczy, średnia mapa, wszystko zwykłe |
| Spokojna ekspansja | Łatwy przeciwnik, duża mapa, bogate złoża, nieliczna fauna, łagodna pogoda |
| Niebezpieczna planeta | Ekspedycja po artefakt, liczna fauna, surowa pogoda |
| Wojna o zasoby | 4 graczy, trudny przeciwnik, Utrzymanie przekaźników z pulą 60 pkt, ubogie złoża |

Zestaw ustawia zasady, a nie zmienia nazwy, koloru, frakcji, mapy ani ziarna. Każda ręczna zmiana, która odbiega od zestawu, przełącza listę na „Własne”.

## Kod operacji

Pole „Kod operacji” pokazuje całe ustawienia w jednym napisie do skopiowania, np. `magma-L3H-R120-RFH-31337`: mapa, rozmiar (S/M/L) + liczba graczy + trudność (E/N/H), tryb (C — Podbój, X — Ekspedycja, R + pula, D + minuty obrony), złoża (P/N/R) + fauna (F/N/M) + pogoda (C/N/H), ziarno (0 — klasyczny układ). „Wczytaj kod” ustawia mapę i wszystkie zasady; błędny kod pokazuje wzór.

## Zapis

Zapis gry obejmuje ziarno, wszystkie ustawienia i stan ekspedycji (położenie artefaktu, niosący, postęp podnoszenia, wyprawy przeciwnika). Zapisy sprzed tej wersji wczytują się z ustawieniami domyślnymi.

## Weryfikacja

- `tests/scenario-setup.test.js` — 11 testów: ziarno (powtarzalność, różne układy, poprawność na 8 mapach × 3 rozmiarach), brak ziarna = układ klasyczny, czas obrony i pula punktów, złoża/fauna/pogoda, gotowe ustawienia, kod operacji, miejsce wykopaliska i strażnicy na wszystkich mapach, podnoszenie/spór/upuszczenie/dostarczenie, przeciwnik niosący do swojej bazy, wyprawy przeciwnika, zapis i odczyt. `npm test`: 178/178.
- Symulacja bez udziału gracza: przeciwnik dociera do artefaktu po ok. 200 s (strażnicy stawiają opór), a bez obrony gracz przegrywa ekspedycję lub bazę po 3,5–4,5 min.
- `tests/menu-browser.html` 37/37; w menu: gotowe ustawienia, losowanie ziarna, kod operacji w obie strony, ukrywanie pól niepasujących do trybu.
- Gra w WebGPU: artefakt widoczny przez mgłę na planszy i minimapie, cele w panelu, konsola bez błędów; WebGL i WebGPU rysują artefakt natywnie (bez warstw zastępczych i nieobsługiwanych operacji).

## Ograniczenia

- Ziarno nie zmienia rzek, lawy, przepaści ani mostów map tematycznych — tylko złoża, skały, siedliska i narożniki.
- Balans ekspedycji jest wstępny (czas podnoszenia, strażnicy, moment pierwszej wyprawy przeciwnika) — wymaga rozgrywek.
- Kod operacji trzeba skopiować ręcznie (bez przycisku schowka).
