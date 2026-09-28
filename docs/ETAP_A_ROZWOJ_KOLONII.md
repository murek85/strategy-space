# Etap A — Rozwój kolonii: ukończony

Data: 2026-09-24. Zakres odpowiada etapowi A z KIERUNKI_ROZWOJU.md. Poziom III, doktryny i moduły budowli pozostają poza tym etapem.

## Gotowe elementy

- Drzewo rozwoju F2: gospodarka, infrastruktura, armia; wymagania, koszty, stan prac, zlecanie i anulowanie.
- Panel ekonomii: dochody, roboty, złoża, moc i osobny zapas energii.
- Przyczółek → Kolonia: 300 metalu + 50 gazu, 30 s przy pełnej mocy. Migracja starych zapisów zachowuje dostęp do istniejącego rozwoju. Roboty mogą powstawać podczas rozbudowy.
- Akumulator: 900 energii, ładowanie do 15/s, oddawanie do 30 mocy; pusty po budowie. Chroni przed krótką utratą reaktora.
- Warsztat: automatyczne płatne naprawy dwóch pojazdów w promieniu 190, 20 mocy, 16 PW/s na stanowisko, 1 metal / 5 PW; wolniej pod ostrzałem.

## Trzy nowe technologie

Wszystkie wymagają Kolonii, korzystają z dotychczasowej kolejki badań i tempa zależnego od mocy. Pełny zwrot zasobów przy anulowaniu. Premie obowiązują również dla już istniejących jednostek i rozpoczętych budów; nie naliczają się wstecz.

| Badanie | Budynek | Metal / gaz / kryształy | Czas bazowy | Efekt |
|---|---|---|---|---|
| Narzędzia wydobywcze | Magazyn | 180 / 30 / 0 | 25 s | +25% pobrania rudy i kryształów na cykl; odpowiednio szybsze wyczerpanie złoża. Transport i gaz bez zmian. |
| Montaż modułowy | Laboratorium | 200 / 40 / 20 | 30 s | +25% pracy budowlanej robota. Nie przyspiesza dojazdu, napraw ani produkcji. |
| Szkolenie manewrowe | Koszary | 180 / 35 / 0 | 25 s | +10% szybkości piechoty i rakietowców, mnożone przez istniejące wpływy frakcji i pogody. |

Koszty badań i wysokość nowych premii są identyczne dla obu wybieralnych frakcji. Przeciwnik zachowuje istniejące zasady produkcji oraz dostęp do przewidzianych oddziałów; nie otrzymał nowej strategii ani darmowych nowych badań. Ceny budowli nadal uwzględniają frakcję.

## Misja: Próba kolonii

Wejście: Gra jednoosobowa → Szkolenie: Próba kolonii. Dostępna także na liście kampanii, bez wcześniejszych odblokowań. Osobny poligon Eos z bezpiecznym otoczeniem bazy, pobliskimi zasobami i własnym przekaźnikiem. Brak desantów i wrogiego centrum. Start: Przyczółek, 1800 metalu, bez gotowego gazu i kryształów.

1. Przydziel robota do ekstraktora gazu i rozbuduj centrum do Kolonii.
2. Zbuduj magazyn i laboratorium, wydobądź kryształy, zbadaj wszystkie trzy technologie.
3. Przygotuj reaktor, laboratorium, warsztat i akumulator z co najmniej 300 energii.
4. Przetrwaj kontrolowane odłączenie reaktorów na 8 s. Zapas ma oddać co najmniej 40 energii do obciążonej sieci. Nieudana próba wraca do ładowania; reaktory odzyskują działanie.
5. Warsztat ma rzeczywiście odtworzyć 60 PW pojazdu testowego. Naprawa robotem ani regeneracja nie zaliczają tego celu. Zniszczony pojazd jest zastępowany, a naprawiony inną metodą ponownie otrzymuje uszkodzenie testowe.

Panel Celów zawiera bieżącą instrukcję; Lira komunikuje przejścia. Zwycięstwo zapisuje odznaczenie szkolenia i pozwala przejść do rozdziału I. Szkolenie nie blokuje dotychczasowej kampanii. Zapis bitwy zachowuje etap, czas awarii i rzeczywistą pracę warsztatu.

## Decyzje o tempie i zgodności

Ekstraktor, magazyn, reaktor i akumulator pozostają dostępne już w Przyczółku, aby awans nie wymagał obiektu, który sam odblokowuje. Istniejące rozdziały I–III zaczynają od Kolonii, bez wydłużania swoich celów o dodatkowy awans. Skończone zasoby, brak darmowych surowców z technologii, limit energii i odpłatne naprawy zachowują koszt rozwoju. Niedobór mocy nie zatrzymuje definitywnie gospodarki.

## Odbiór

Sprawdzono efekty wszystkich trzech badań, koszty obu frakcji, anulowanie i zapis. Test całej sekwencji szkolenia przechodzi przez ładowanie, awarię, wczytanie podczas awarii, rzeczywistą naprawę i zwycięstwo. Zweryfikowano ponowienie próby, blokady poziomu centrum oraz zależności drzewa. W przeglądarce potwierdzono wejście do szkolenia, odprawę, uruchomienie, wczytanie i czytelny panel celów. Akumulator i warsztat mają oddzielne testy regresji.

To weryfikacja mechaniki i integracji; długoterminowy balans bitew wymaga obserwacji rozgrywek. Nie uruchamiano pełnego zestawu testów całego prototypu.

Następny zakres według planu: etap B — wyrazista armia i baza.
