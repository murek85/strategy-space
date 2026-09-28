# Etap C — Tryby scenariuszy i rozmiary map

Wdrożono 2026-09-26, wersja 0.18. Zamyka etap C z [Kierunków rozwoju](KIERUNKI_ROZWOJU.md) razem z [aktem II kampanii](ETAP_C_DRUGI_AKT.md).

Wejście: Gra jednoosobowa → Scenariusze. Nowe pola **Tryb** i **Rozmiar mapy** obok frakcji, trudności i liczby graczy. Podgląd mapy i opisy aktualizują się od razu. Kampania i szkolenie nie zmieniają się: zawsze grają na średniej mapie.

## Tryby

| Tryb | Warunek zwycięstwa | Porażka | Zmiany rozgrywki |
|---|---|---|---|
| **Podbój** | Zniszcz wszystkie wrogie centra | Utrata centrum | Bez zmian — dotychczasowe zasady |
| **Utrzymanie przekaźników** | Pierwszy zbierz pulę punktów kontroli: 90 × liczba przekaźników na mapie (7 / 10 / 14 → 630 / 900 / 1260) | Któryś przeciwnik zbierze pulę albo utrata centrum | Każdy przekaźnik daje właścicielowi 1 pkt/s. Dwie trzecie każdego desantu idzie na przekaźniki (najbliższy lub drugi najbliższy niebędący jego własnością), reszta na bazę |
| **Obrona** | Przetrwaj 10 minut z centrum dowodzenia | Utrata centrum | Desanty o 25% liczniejsze i o 15% częstsze. Na start +500 metalu i dwie gotowe wieżyczki od strony środka mapy |

We wszystkich trybach zniszczenie wszystkich wrogich centrów nadal daje zwycięstwo. Panel celów pokazuje stan trybu (punkty wszystkich stron i przekaźniki albo pozostały czas i numer desantu); karta operacji — tryb i rozmiar mapy. Ekran wyniku ma opis zależny od trybu.

## Rozmiary map

| Rozmiar | Wymiary | Przekaźniki | Zawartość |
|---|---|---|---|
| Mała | 2560 × 1640 | 7 | Układ mapy przeskalowany; skały i jeziora zmniejszone proporcjonalnie. Bazy blisko siebie |
| Średnia | 3360 × 2160 | 10 | Dotychczasowa mapa, bez zmian |
| Duża | 4480 × 2880 | 14 | Układ rozciągnięty; dodatkowo z ziarna mapy: 3 złoża rudy, 2 kryształów, 2 gazu, 5 skał, 2 jeziora i 2 siedliska drapieżników — z dala od narożnych baz |

Proporcje wszystkich rozmiarów są zbliżone (ok. 1,56), więc minimapa i widok całości działają bez zmian. Bazy nadal stoją w narożnikach, każda ma własne złoża startowe. Przekaźniki są rozmieszczane przy złożach, co najmniej 140 jednostek od krawędzi mapy. Siedliska drapieżników leżą dalej niż 520 od każdego centrum. Gęstość dekoracji terenu (kamienie, zaspy, kałuże, roślinność) skaluje się z powierzchnią mapy.

## Zmiany techniczne

- Rozmiar mapy należy do gry (`game.W`, `game.H`) zamiast stałych modułu; stałe `RTS.W/H` pozostają wartościami domyślnymi (średnia mapa). Zmieniono silnik, moduły zasad, rysowania, podgląd w menu i `app.js` (mgła, teren, kamera, minimapa).
- Nowy moduł `scenario-modes.js`: rozmiary (`RTS.MAP_SIZES`), tryby (`RTS.MODES`), skalowanie i wzbogacanie mapy, punktacja i warunki zwycięstwa, zapis stanu trybu.
- Wyszukiwanie drogi A* korzysta teraz z kopca binarnego zamiast liniowego przeglądania listy — ta sama funkcja kosztu, 2–4× szybciej. Wyznaczenie 68 tras na dużej mapie dla 4 graczy: ok. 200–330 ms zamiast 690–880 ms.
- Zapis: pola `W`, `H` i `modeState`, scenariusz z `size` i `mode`. Starsze zapisy wczytują się jako średnia mapa w trybie Podbój; niezgodność rozmiaru z zapisanym scenariuszem jest odrzucana jako uszkodzony zapis.

## Weryfikacja

- `tests/scenario-modes.test.js`: 6 testów — 24 kombinacje (4 mapy × 3 rozmiary × 2 i 4 graczy): wymiary, liczba przekaźników, brak obiektów na przeszkodach, siedliska z dala od baz, dojście między bazami i do każdego przekaźnika; większa zawartość dużej mapy; zapis i starsze zapisy; punktacja, zwycięstwo i porażka w trybie przekaźników; kierowanie desantów na przekaźniki; start, wzmocnione desanty i zwycięstwo czasowe w obronie. Pełny `npm test`: 145 testów, wszystkie przechodzą. `tests/menu-browser.html`: 37/37.
- W przeglądarce: formularz scenariusza z nowymi polami, podgląd dużej mapy, start gry Utrzymanie przekaźników na dużej mapie dla 3 graczy (panel punktów, karta operacji, widok całości, minimapa), wczytanie w pełni odkrytej dużej mapy w trybie Obrona dla 4 graczy (teren i dekoracje na całym obszarze). Na dużej mapie na początku rozgrywki 170 klatek/s, najgorsza klatka 6 ms (lokalna przeglądarka).
- Symulacje bez gracza: w trybie przekaźników AI zdobywa pulę po ok. 4,7 min; w obronie bierny gracz traci bazę po ok. 3 min. Prosty skryptowy obrońca (wieżyczki + ciągła produkcja piechoty) przetrwał w obronie ~4 min, w podboju ~4,3 min — bazowy system desantów jest wymagający sam w sobie. Balans obu trybów wymaga prawdziwych rozgrywek.

## Ograniczenia

- Czas obrony (10 min) i pula punktów były stałe — od 0.33 ustawiane w menu ([opis](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md)).
- AI nie ma nowej strategii: w trybie przekaźników zmienia się tylko cel desantów. Nie broni zdobytych punktów osobnymi oddziałami.
- Tryb Ekspedycja po artefakt, ziarno mapy do udostępniania i presety ustawień z [Kierunków §9](KIERUNKI_ROZWOJU.md) — wdrożone w 0.33 ([opis](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md)).
- Wydajność pełnej bitwy na dużej mapie z maksymalną liczbą jednostek nie była mierzona.
