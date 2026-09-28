# Etap B — Wyrazista armia i baza

Wdrożono 2026-09-24, wersja 0.15. Zakres etapu B z KIERUNKI_ROZWOJU.md jest ukończony.

## Transporter opancerzony

- Produkcja w fabryce: bazowo 260 metalu, 14 s, 620 PW. Koszt i parametry uwzględniają frakcję jak inne pojazdy. Wymaga fabryki odblokowywanej przez Kolonię.
- Prędkość bazowa 105, zasięg 150, lekka broń 10 obrażeń co 1,1 s. Nie strzela do samolotów; jest podatny na broń przeciwpancerną i wymaga osłony.
- Cztery miejsca, tylko dla własnych piechurów i rakietowców. Zaznacz piechotę i kliknij PPM na transporterze. Żołnierze podchodzą; zatrzymaj pojazd na czas załadunku.
- Przycisk Załaduj przy zaznaczonym transporterze zbiera pobliską piechotę w promieniu 240. Nowy rozkaz ruchu, zatrzymanie lub utrzymanie pozycji anuluje podejście danej jednostki.
- Wyładuj wysadza załogę na wolnym terenie obok pojazdu; żołnierze utrzymują pozycję. Jeśli nie ma miejsca, pozostają wewnątrz — przestaw pojazd.
- Pasażerowie nie strzelają, nie dają widoczności i nie przejmują punktów. Zachowują tożsamość i wytrzymałość; wliczają się do limitu 60 jednostek i są zapisani w slocie.
- Zniszczenie pojazdu uruchamia awaryjny desant z utratą 50% pozostałych PW, minimum 1 PW. Wyszukiwany jest wolny teren do 1500 jednostek od wraku; gdy nie ma go wcale, niewysadzona część załogi ginie z komunikatem. Desant nadal może znaleźć się pod ostrzałem.
- Warsztat naprawia transporter. Lampki kadłuba pokazują zajęte miejsca.

## Bateria przeciwlotnicza

Budowana przez robota po awansie centrum do Kolonii. Bazowo 260 metalu, 16 s, 950 PW, pobór 15 mocy, zasięg 360, 40 obrażeń co 0,8 s. Ceny i parametry frakcji obowiązują. Atakuje wyłącznie cele latające; piechota i pojazdy mogą ją zniszczyć bez odpowiedzi. Zaznaczenie pokazuje zasięg.

To budynek obronny, nie mobilna jednostka przeciwlotnicza. Ta druga pozostaje osobną przyszłą propozycją. Zasilanie wpływa na bilans produkcji i badań zgodnie z dotychczasową mechaniką wież; bateria nie dostaje osobnej zasady wyłączania przy braku mocy.

## Formacje

Wybór przy rozkazach oddziału: Linia, Kolumna, Rozproszenie. Wpływa na następny rozkaz ruchu lub ruchu z atakiem. Orientacja zależy od kierunku marszu, odstęp uwzględnia gabaryty jednostek. Rozproszenie daje większe odstępy; kolumna ma dwa szeregi obok siebie.

Są to docelowe ustawienia prostych formacji: jednostki nadal korzystają z indywidualnego wyszukiwania drogi. Nie utrzymują sztywnego szyku w marszu i mogą go opuścić podczas walki. Bezpośredni atak na wskazany cel zachowuje dotychczasowe zachowanie. Nie ma ukrytych premii obrażeń ani pancerza. Wybór formacji jest zapisywany.

## Grafika i dźwięk

- Nowe bryły transportera i baterii: gąsienice, dach, boczne ściany, wieżyczki, odrzut, lampki załogi i obracający się radar.
- Piechota i rakietowcy: odrębne sylwetki Kolonii oraz Dominium, ruch nóg, broń, błysk strzału i reakcja na trafienie.
- Centrum, koszary, fabryka i laboratorium: dodatkowe panele i anteny Kolonii, płyty osłonowe i oznaczenia Dominium. Zachowane istniejące detale bazowych modeli.
- Podglądy bazy wiedzy i drzewa używają tych samych modeli i detali.
- Różne krótkie radiowe motywy ruchu, ataku, utrzymania pozycji, formacji, załadunku i desantu. Wspólny odstęp co najmniej 0,65 s ogranicza nakładanie. Respektują wyciszenie i głośność efektów; to dźwiękowe potwierdzenia, nie nagrane kwestie aktorów.

## Parametry i obsługa

Zakładka Oddział po lewej porównuje zaznaczone typy jednostek: liczebność, PW, zasięg, obrażenia, odstęp strzałów, szybkość i celność w aktualnej pogodzie, koszt, osłona i liczba pasażerów. Obrażenia pokazane przed modyfikatorami typu celu, pancerzem i osłoną celu. Badania i frakcja są uwzględnione.

Przycisk Statystyki otwiera porównanie także na wąskim ekranie i wstrzymuje grę. Zamknięcie przywraca poprzedni stan pauzy. Drzewo F2 zawiera nowe obiekty, koszty, wymagania i podstawowe parametry porównawcze. Nowe jednostki i budynki mają opisy w bazie wiedzy.

## Zapis i weryfikacja

Dotychczasowe zapisy działają bez pasażerów i z domyślną formacją Linia. Zapis zachowuje załogę, podejście do załadunku i formację. Walidacja wykrywa przepełnienie transportera, niewłaściwy typ lub stronę pasażera oraz powielone identyfikatory.

Testy zakresowe: załadunek i anulowanie, dojście, limit armii, zwykły i awaryjny desant, brak miejsca, zapis, przeciwlotnicze wybieranie celu, formacje, statystyki, różne motywy radiowe i ograniczenie powtórzeń. Sprawdzono również integrację drzewa, istniejące audio i szkolenie etapu A. W przeglądarce sprawdzono modele obu frakcji, przewóz, wczytanie i awaryjny desant oraz okno statystyk w docelowej grze.

Nie uruchamiano pełnego zestawu całego prototypu. Długoterminowy balans nowych kosztów i skuteczności pozostaje do obserwacji rozgrywek. AI i 3D nie zostały przebudowane.

Kolejny etap planu: C — drugi akt kampanii i nowe zasady zwycięstwa, wdrażane misja po misji.

Korekta grafiki 2026-09-25: piechota i rakietowiec otrzymały kanciaste sylwetki z osobnymi butami, ramionami i hełmem. Zwiadowca Kolonii ma odkryte koła, przeszklony kokpit i zwężający się przód. Bastion Dominium ma odsłonięte gąsienice, pochyły pancerz oraz wyraźną wieżę z odrzutem działa. Zweryfikowano składnię i podgląd modeli w przeglądarce; parametry walki bez zmian.
