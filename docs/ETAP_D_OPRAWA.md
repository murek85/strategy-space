# Etap D — oprawa reagująca na rozgrywkę

Ukończono 2026-09-25, wersja 0.16. Etap C (kampania i nowe cele scenariuszy) pozostaje odłożony zgodnie z decyzją użytkownika.

## Muzyka i miks

- Pięć stanów aranżacji: eksploracja, rozwój, napięcie, bitwa oraz uspokojenie po walce. Zachowane motywy planet i osobne utwory menu oraz intra.
- Warstwy instrumentów zmieniają się na granicy dwutaktowej frazy, bez zerowania utworu. Walka musi trwać przynajmniej 2 sekundy. Stan bitewny utrzymuje się 10 sekund od ostatniego potwierdzenia walki, potem następuje 15 sekund wyciszenia.
- Zagrożenie uwzględnia widocznych przeciwników; muzyka nie ujawnia ukrytych armii. Rozwój obejmuje kolejkę produkcji, badania i budowę.
- Ustawienia: osobno muzyka, główna głośność efektów i mnożniki kategorii Walka, Jednostki i praca, Otoczenie, Komunikaty i rozkazy. Kategorie mnożą główny poziom efektów. Preferencje zapisują się lokalnie.
- Alarm, wynik bitwy, ukończenie badań i przejęcie punktu mają pierwszeństwo przed nowymi efektami. Na 2,5 sekundy muzyka schodzi do 55%, a nowe odgłosy jednostek i otoczenia do 30% ustawionego poziomu. Trwające efekty nie są przerywane.
- Limit 12 nowych efektów walki na aktualizację, dotychczasowy limit 40 głosów efektów i 96 węzłów muzyki. Muzyka pozostaje syntezą proceduralną.

## Grafika

- Drobne kamienie, roślinność brzegowa i akcenty przy skałach są rysowane w pamięci podręcznej terenu, zamiast ponownie w każdej klatce.
- Budowa dużych obiektów: fundament (0–25%), szkielet (25–65%), docelowa bryła z rusztowaniem (65–100%). Mury i bramy zachowują istniejące modele i połączenia.
- Ustawienia jakości terenu i cząsteczek: wysokie, średnie, niskie. Niższe ustawienia ograniczają liczbę dekoracji i cząsteczek, bez wpływu na mechanikę pogody. Można wyłączyć błyski burzy.
- Opcjonalny licznik pokazuje średni czas rysowania i p95 ze 120 ostatnich próbek, odświeżane co 30 klatek. Mierzy wywołania renderowania CPU, nie FPS całej gry ani czas GPU.

## Odbiór i wydajność

17 testów ukierunkowanych (audio i etap D) przechodzi: przejścia muzyki, ukryci przeciwnicy, granice fraz, zapis i wyciszanie kategorii, priorytet alarmu, limity pomiarów i ustawienia jakości. Sprawdzono składnię zmienionych skryptów oraz przeglądarkowy widok ustawień i etapów budowy. Końcowa kontrola 2026-09-25: wczytanie i wznowienie operacji w wersji 0.16, poprawnie wyświetlana plansza, brak błędów w konsoli. Nie wykonywano ponownie całego zestawu testów starszych mechanik.

Powtarzalna próba: `tests/stage-d-browser.html`, Canvas 1200×700, 200 jednostek, trzy etapy fabryki, teren z pamięci podręcznej, burza piaskowa w czasie symulacji 110–112,5 s. 30 klatek rozgrzewki i 120 próbek dla każdego ustawienia. Wynik w lokalnej przeglądarce Codex:

| Cząsteczki | Średnia | p95 |
| --- | ---: | ---: |
| Wysokie | 16,98 ms | 21,90 ms |
| Niskie | 5,12 ms | 6,90 ms |

To pomiar wywołań Canvas CPU w scenie kontrolnej: nie obejmuje symulacji, wyszukiwania tras, pełnego HUD, wszystkich efektów terenowych ani końcowej pracy GPU. Nie stanowi gwarancji FPS podczas bitwy. Największym widocznym kosztem jest gęsta burza; na słabszym sprzęcie należy obniżyć cząsteczki. Nie zwiększono ich domyślnej gęstości.

## Późniejsze rozszerzenia

Pełne profilowanie dużych bitew, nagrane głosy frakcji i nowe kompozycje studyjne pozostają osobnymi zadaniami. Etap D nie zmienia AI, gospodarki ani przebiegu kampanii.

