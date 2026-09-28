# Warsztat polowy

Wdrożony 2026-09-24. Dostępny w BUDOWA oraz ROZWÓJ / F2; model i opis także w bazie wiedzy.

- Cena bazowa: 260 metalu, modyfikowana kosztem frakcji. Budowa przez robota: 18 s. Wytrzymałość bazowa: 1000 PW. Pobór: 20 mocy.
- Automatycznie naprawia maksymalnie 2 własne pojazdy naziemne w promieniu 190: roboty, czołgi, ciężkie maszyny, artylerię i pojazdy frakcyjne.
- Priorytet ma najniższy procent wytrzymałości. Jedna jednostka korzysta z jednego warsztatu w danej aktualizacji.
- Stanowisko odtwarza 16 PW/s za 1 metal na 5 PW; opłata naliczana tylko za odzyskane PW. Brak metalu wstrzymuje naprawę. Niedobór mocy skaluje wydajność zgodnie z pozostałymi budynkami.
- Przez 3 s po otrzymaniu trafienia jednostka naprawiana jest z 25% prędkości.
- Zaznaczenie pokazuje zasięg i wykorzystanie stanowisk. Pulsujące lampki i przerywane połączenia pokazują pracę.
- Fundamenty i zniszczone warsztaty nie naprawiają. Piechota, lotnictwo i budynki wymagają innych metod naprawy. Warsztat nie wydaje jednostkom rozkazów ruchu.
- Stan budynku zapisuje się w istniejącym slocie. Obsługiwane jednostki wybierane są ponownie po wczytaniu. AI nie buduje warsztatów w tym etapie.

Weryfikacja ograniczona do mechaniki warsztatu, zależności drzewa i składni zmienionych skryptów. Dalsze etapy: poziomy centrum, akumulator energii i specjalizacje technologiczne.
