# Panel gospodarki — ukończony zakres

Data: 2026-09-23. Status: wdrożone.

Wejście: lewy panel → **Logistyka**. Trzy widoki: **Bilans**, **Roboty**, **Złoża**. Zakładki i wybór bezczynnych robotów pozostają dostępne podczas przewijania zawartości.

## Bilans

- Dochód metalu, gazu i kryształów na minutę, średnia z maksymalnie 60 ostatnich pełnych sekund symulacji. Przy krótszym pomiarze panel pokazuje długość okna. Pierwsza sekunda: zbieranie danych.
- Metal rozdzielony na dostawy robotów oraz pasywny dochód centrum i przekaźników.
- To dochód brutto: wydatki go nie obniżają, zwroty za anulowanie/burzenie go nie zawyżają. Ruda i kryształy liczone po rozładunku, gaz w momencie rzeczywistego wydobycia.
- Produkcja i pobór mocy, rezerwa/niedobór oraz rzeczywisty mnożnik tempa produkcji wojska i badań.
- Ostrzeżenia o bezczynnych robotach, braku mocy, niskim zapasie/wyczerpaniu złoża, ekstraktorze bez operatora, braku punktu rozładunku i zbyt odległym rozładunku.

## Roboty i złoża

- Rozłączny podział robotów: ruda, kryształy, gaz, budowa, naprawa, ruch/pozostałe oraz bezczynne. Przydział uwzględnia także dojazd i transport, nie udaje liczby aktualnie pracujących narzędzi.
- Kliknięcie przydziału zaznacza obecnie przypisane roboty i przenosi kamerę do pierwszego. Nie zmienia ich rozkazów.
- Lista złóż obejmuje widoczne złoża w pobliżu ukończonego centrum/magazynu (400 m), obsługiwane przez roboty lub z własnym ukończonym ekstraktorem. Nie ujawnia złóż ani ich ilości przez mgłę wojny.
- Ilość pozostałego zasobu, liczba przydzielonych robotów i odległość do najbliższego punktu rozładunku. Odległość jest jawnie przybliżona, w linii prostej; nie jest czasem dojazdu ani długością wyznaczonej trasy.
- Kliknięcie złoża/ostrzeżenia kieruje kamerę do miejsca, ponownie sprawdzając widoczność.
- Niski zapas: do 5 ładunków dla rudy/kryształów, do 120 jednostek gazu. Długi rozładunek: ponad 450 m w linii prostej.

## Zapis i ograniczenia

Historia to maksymalnie 61 zagregowanych próbek sekundowych, bez nieograniczonego przyrostu danych. Jest zapisywana wraz z operacją i walidowana przy wczytywaniu. Stare zapisy bez statystyk rozpoczynają nowe okno pomiaru w chwili wznowienia. Pauza i pobyt w menu nie obniżają dochodu, ponieważ pomiar używa czasu symulacji.

Nie zmieniono kosztów, tempa gospodarki, zasad pracy robotów ani AI. Nie wdrożono w tym zakresie nowych budynków, poziomów centrum ani drzewa technologii.

## Weryfikacja

Pięć nowych testów sprawdza rzeczywiste dostawy i wydobycie, wykluczenie zwrotów, kroczące okno oraz jego limit, zapis i starsze zapisy, podział robotów, bilans mocy, widoczność złóż i ostrzeżenia. Dodatkowo pełny zestaw testów gry oraz kontrola przeglądarkowa panelu i zaznaczania robotów.
