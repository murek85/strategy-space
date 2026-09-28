# Akumulator energii — etap A

Aktualizacja 2026-09-24: cały [etap A](ETAP_A_ROZWOJ_KOLONII.md) jest ukończony, wraz z technologiami i misją Próba kolonii. Poniżej opis pierwotnego podetapu.

Wdrożono 2026-09-24. Wejście: BUDOWA lub ROZWÓJ / F2, gałąź Gospodarka / Infrastruktura. Opis i model dostępne w bazie wiedzy.

- Cena bazowa 220 metalu, modyfikowana przez frakcję. 850 PW, budowa przez robota 16 s.
- Nowy akumulator jest pusty. Pojemność 900 jednostek energii.
- Ładowanie wyłącznie z nadwyżki produkcji nad poborem: maksymalnie 15 energii/s na budynek. Kilka akumulatorów dzieli dostępną nadwyżkę.
- Przy niedoborze: maksymalnie 30 mocy na akumulator, z faktycznym odjęciem zużytej energii. Pełny zapas daje 30 s przy oddawaniu 30 mocy, dłużej przy mniejszym deficycie.
- Podtrzymuje istniejący bilans zasilania produkcji, badań i warsztatów. Nie zwiększa wydajności ponad 100%. Po wyczerpaniu wraca zwykłe spowolnienie niedoboru mocy.
- Fundament, zniszczony lub rozebrany akumulator nie uczestniczy w bilansie. Energia z rozebranego budynku przepada. Nie ma stałego poboru mocy.
- Panel Logistyka pokazuje osobno moc i zgromadzoną energię oraz ostrzega o podtrzymywaniu sieci. Górny licznik mocy pokazuje dodatkowe wsparcie. Zaznaczenie i paski na modelu pokazują naładowanie pojedynczego budynku.
- Zapis zachowuje energię. Brak pola energii oznacza pusty akumulator. Odczyt paneli nie zużywa zapasu; zużycie następuje tylko w symulacji.
- AI nie otrzymało nowej strategii budowy. Obecna produkcja przeciwnika pozostaje bez zmian.

Sprawdzenie zakresu: cztery testy magazynowania i podtrzymania, pięć zależności drzewa oraz cztery regresje warsztatu. Pełny zestaw i kontrola wizualna w przeglądarce nie były uruchamiane.

Pozostałe części etapu A: poziomy centrum z migracją i balansem kampanii, nowe technologie trzech gałęzi oraz misja ucząca nowych zasad.
