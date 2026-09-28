# Drzewo rozwoju — etap I

Aktualizacja 2026-09-24: cały [etap A](ETAP_A_ROZWOJ_KOLONII.md) jest ukończony, wraz z technologiami i misją Próba kolonii. Poniżej opis pierwotnego podetapu.

Data: 2026-09-24. Status: wdrożone.

## Obsługa

Podczas operacji kliknij **ROZWÓJ** obok zakładek Armia/Budowa/Badania albo naciśnij **F2**. **Esc** zamyka okno. Otwarcie zatrzymuje symulację; zamknięcie przywraca wcześniejszy stan pauzy. W oknie nie działają skróty sterowania polem bitwy. Fokus klawiatury wraca do elementu, z którego otwarto drzewo. Działa również widoczny kursor w oknie modalnym.

Trzy gałęzie:

- **Gospodarka:** centrum i roboty, magazyn i ładownie, ekstraktor, reaktor oraz badanie stabilizacji.
- **Infrastruktura:** robot budowlany i wszystkie dostępne typy budowli.
- **Armia:** koszary, fabryka, hangar i ich jednostki; badania wojskowe oraz pogodowe w odpowiednich budynkach. Jednostka unikalna odpowiada frakcji bieżącego scenariusza.

Strzałki oznaczają produkcję lub wykonanie przez robota, a nie nowy poziom technologiczny. W panelu szczegółów wymaganie jest przyciskiem prowadzącym do właściwego węzła. Budynki wsparcia gospodarki mogą nie mieć własnych kolejnych węzłów.

## Informacje i akcje

- Opis, podgląd modelu, koszt, bazowy czas, wytrzymałość z modyfikatorem frakcji, liczba gotowych obiektów oraz pozycji w kolejce/budowie.
- Badania pokazują rzeczywisty wymagany budynek i powód blokady: brak budynku, konkretne brakujące zasoby, inne aktywne badanie albo zakończenie operacji.
- Badanie w toku ma postęp, informację o pozostałej pracy i tempie wynikającym z mocy. Utrata budynku zmienia stan na wstrzymany; ukończone badanie pozostaje oznaczone jako ukończone.
- **Rozpocznij badanie** i **Anuluj badanie** używają istniejących zasad pobierania i zwrotu zasobów. Badanie zacznie wykonywać pracę po wznowieniu symulacji.
- **Zleć produkcję** wybiera dostępny budynek, respektuje limit armii i długość kolejek oraz koszty frakcji.
- **Wybierz miejsce budowy** zamyka drzewo i uruchamia standardowy tryb rozmieszczania. Opłata następuje dopiero po poprawnym umieszczeniu fundamentu. Widoczność, teren, zasięg, złoże gazu i obecność robota są sprawdzane przez istniejącą logikę budowania.
- Główna akcja pozostaje widoczna pod przewijanym opisem. Zakładki obsługują strzałki oraz Home/End. Okno ma układ dla mniejszych ekranów.

## Spójność zasad

Ceny, czasy, wymagane budynki i zależności produkcyjne są odczytywane z definicji gry oraz metod produkcji. Status badań jest wspólny dla silnika, dolnego paska i drzewa. Opisy efektów badań dodano do ich definicji; dolny pasek również z nich korzysta.

Nie dodano jeszcze poziomów centrum, doktryn, nowych technologii ani budowli. Ten etap porządkuje i udostępnia wszystkie obecne zależności, tworząc podstawę do rozszerzenia progresji. Zasady i format dotychczasowych zapisów pozostają zgodne; trwające badania są odczytywane z zapisu bez nowego osobnego stanu drzewa.

## Weryfikacja

- 5 nowych testów modelu: kompletność gałęzi, budynki w budowie, koszty, brak zasobów, blokady badań, anulowanie, ukończenie, utrata laboratorium, postęp po wczytaniu, frakcje, pełne kolejki, limit armii i brak robotów.
- `tests/development-browser.html`: 45 sprawdzeń przepływu UI, podglądów modeli, produkcji, rozpoczęcia/anulowania badań, nawigacji wymagań, przejścia do budowy i zachowania pauzy.
- Kontrola w pełnej grze: przycisk Rozwój, F2/Esc, zależności armii, powody blokady i widoczność przycisku akcji.

Kolejny kandydat do osobnego etapu: poziomy centrum i pierwsze nowe elementy gospodarki, z uwzględnieniem balansu oraz migracji starych zapisów. Nie jest to jeszcze zlecenie wdrożenia całego pakietu.
