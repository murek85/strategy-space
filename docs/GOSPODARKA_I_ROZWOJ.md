# Gospodarka, budowa, badania i armia

> **Dokument historyczny (stan 0.16, 2026-09-26).** Koncepcja z wersji 0.3–0.8. Wdrożono: magazyny i gaz (0.6), reaktory, moc, laboratorium i kryształy (0.8), budowę przez roboty (0.10), dwa poziomy centrum (etap A), zwiadowcę (0.12), ciężką maszynę i artylerię (0.9). Otwarte pozostają GOS-03 (korekta dochodu pasywnego) i ARM-02 (limit zaopatrzenia). Aktualny stan: [Plan rozwoju](PLAN_ROZWOJU.md).

Status: magazyny, bezczynne roboty, gaz, ekstraktory i badanie ładowności wdrożone w 0.6 (2026-09-21), zgodnie ze zleceniem pełnego pakietu. Pozostała część dokumentu opisuje dalszą koncepcję.

Realizacja 0.6: magazyn 120 metalu / 10 s; ekstraktor 160 metalu / 12 s i jeden robot, 2 gazu/s; badanie ładowności 150 metalu + 50 gazu / 25 s, w magazynie, pojemność 30 → 60. Brak nowych kosztów gazu dla dotychczasowych jednostek. Szczegóły i migracja: [README](../README.md).
Punkt wyjścia: prototyp 0.3. Data: 2026-09-20.

## Aktualizacja 0.8

Wdrożono moc, reaktory, laboratorium, kryształy i badania stabilizacji oraz optyki. Dotychczasowe badania zachowują fabrykę lub magazyn jako wymaganie; laboratorium prowadzi nowe technologie. Budowa przez roboty i poziomy centrum pozostają propozycjami. Bieżące parametry i migracja zapisów: README. Opis poniżej zachowuje historyczną koncepcję.

## Cel projektu

Połączyć cztery obszary w czytelną ścieżkę: wydobycie finansuje rozbudowę, infrastruktura pozwala prowadzić badania, a technologie otwierają nowe możliwości armii. Wojsko chroni gospodarkę i umożliwia ekspansję.

Najważniejsze wybory gracza: robot czy żołnierz, dodatkowa fabryka czy badanie, bezpieczna baza czy wysunięta kopalnia. Inwestycja powinna mieć zauważalną korzyść oraz koszt utraconej możliwości produkcji wojska.

Nie przebudowujemy przy tym strategicznego AI. Proponowane etapy dotyczą gracza i wymagają testów przeciw obecnym falom. Obecny przeciwnik nie prowadzi gospodarki, więc nie należy przedstawiać tego wariantu jako symetrycznej gry ekonomicznej.

## 1. Gospodarka

### GOS-01 — Punkty rozładunku rudy

Roboty mogą oddawać ładunek do centrum dowodzenia lub nowego magazynu polowego. Magazyn nie wytwarza surowców: skraca podróż z kopalni. Robot wybiera dostępny punkt rozładunku według długości drogi, nie tylko odległości w linii prostej.

Gracz decyduje, czy wydać metal na skrócenie transportu, czy na obronę długiej trasy. Po zniszczeniu magazynu robot zachowuje ładunek i szuka innego punktu. Wyczerpane złoże daje sygnał o bezczynnych robotach.

### GOS-02 — Energia jako moc infrastruktury

Energię traktujemy oddzielnie od wydobywanych i magazynowanych surowców:

- Metal: magazynowany i wydawany na jednostki, budynki oraz badania.
- Gaz i ewentualnie kryształy: dodatkowe wydobywane zasoby opisane w GOS-04.
- Energia: dostępna moc / zapotrzebowanie. Reaktory zwiększają moc, a fabryki i laboratoria ją zajmują. Energia nie jest kolejnym ładunkiem transportowanym przez roboty.

Przy niedoborze energii produkcja i badania zwalniają, ale nie tracą postępu. Wydobycie, transport, budowa i naprawy pozostają dostępne, żeby dało się odbudować reaktor. Nie wyłączamy istniejącego wojska ani nie zatrzymujemy automatycznie całej obrony.

Konkretną moc budynków i skalę spowolnienia trzeba dobrać w testach. Na początek proponujemy globalny bilans energii bez kabli, zasięgów sieci i paliwa.

### GOS-03 — Mniej dochodu pasywnego, więcej znaczenia wydobycia

Docelowo wydobycie powinno być podstawą gospodarki. Obecne +8 metalu/s z centrum i +5/s z przekaźnika wymagają ponownego zbalansowania. Zmniejszanie tych bonusów następuje dopiero po wdrożeniu sprawnego transportu i wskaźnika bezczynnych robotów. Zachować niewielki dochód awaryjny lub inną możliwość odbudowy po utracie górników.

Przekaźniki nadal służą ekspansji, zwiadowi i zakładaniu przyczółków. Nie zmieniamy jednocześnie wszystkich ich funkcji.

### GOS-04 — Dodatkowe wydobywane surowce

Status: gaz i ekstraktor wdrożone w 0.6; kryształy pozostają propozycją.

Docelowo rozważamy trzy surowce o różnych zastosowaniach:

| Surowiec | Pozyskiwanie | Zastosowanie | Znaczenie na mapie |
|---|---|---|---|
| Ruda → metal | Roboty zbierają ze złóż i dostarczają do punktu rozładunku; bez osobnego procesu hutniczego | Podstawowe budynki, roboty, piechota i konstrukcja pojazdów | Powszechne złoża, część blisko bazy |
| Gaz przemysłowy | Ekstraktor na złożu gazowym, z przydzielonym robotem obsługi | Dodatkowy koszt zaawansowanych pojazdów i części technologii | Mniej złóż; wysunięte instalacje wymagają ochrony |
| Kryształy technologiczne | Roboty wydobywają i transportują z rzadkich złóż | Zaawansowane badania, przyszłe generatory osłon i wyposażenie specjalne | Rzadkie, rozproszone złoża zachęcające do ekspansji |

Gaz byłby wydawany przy zlecaniu produkcji lub badań, nie zużywany podczas każdego ruchu i strzału. Brak gazu nie unieruchamia istniejących pojazdów. Kryształy nie są wymagane do podstawowej obrony, napraw ani odbudowy gospodarki. Energia pozostaje bilansem mocy reaktorów; na tym etapie reaktory nie zużywają gazu.

**Pierwszy zakres: metal i gaz.** Kryształy dopiero po wprowadzeniu technologii, które rzeczywiście ich potrzebują. Nie dodajemy trzeciego licznika bez użytecznych sposobów wydawania zasobu.

Proponowany pierwszy model gazu: skończone złoże, ekstraktor stawiany bezpośrednio na nim, jeden robot obsługi, zasób naliczany do magazynu podczas pracy. Robot pozostaje przy instalacji i nie wydobywa równocześnie rudy. Odrębny transport gazu można rozważyć później. Ekstraktor i robot kosztują wyłącznie metal, aby można było rozpocząć pozyskiwanie gazu bez posiadania gazu.

Przykładowe decyzje:

- Duża armia podstawowej piechoty korzysta głównie z metalu; zaawansowane pojazdy wymagają inwestycji w gaz.
- Robot przy ekstraktorze oznacza mniejszą liczbę robotów zbierających rudę.
- Przyszłe ciężkie jednostki i technologie konkurują o część tych samych zasobów.
- Rzadkie kryształy pozwalają przyspieszyć rozwój zaawansowanych technologii, ale trzeba zabezpieczyć odległą kopalnię.

Dokładne koszty, pojemności złóż i wydajność pozostają do zbalansowania. Nie zmieniamy automatycznie kosztu istniejącego czołgu ani wszystkich obecnych badań: zakres nowych kosztów trzeba ustalić wraz z pierwszymi zastosowaniami gazu.

Kryteria odbioru pierwszego etapu:

- Robot bez ekstraktora oraz ekstraktor bez robota nie produkują gazu; odejście lub utrata robota zatrzymuje pracę.
- Złoże wyczerpuje się, a robot zgłasza bezczynność; zniszczenie instalacji nie usuwa już zgromadzonego zasobu.
- Każde zamówienie pokazuje pełny koszt, brakujące surowce i wymagania. Koszt jest pobierany jednorazowo, dopiero gdy dostępne są wszystkie składniki.
- Anulowanie zwraca właściwe rodzaje zasobów zgodnie z zasadami danego zadania; nie zamienia gazu na metal.
- Stary zapis zachowuje dotychczasowy metal, jednostki, badania i opłacone kolejki. Nowe zasoby zaczynają od zera; już opłacone zamówienia nie wymagają dopłaty gazu. Nowe złoża wymagają jawnej migracji mapy.

Zależności: nowe złoża, ekstraktor, zadanie obsługi dla robota, wieloskładnikowe koszty, interfejs i migracja zapisu. To oddzielna iteracja, nie sam dodatek graficzny.

## 2. Budowa

### BUD-01 — Budowa z udziałem robotów

Zamiast samoczynnego powstawania budynku po kliknięciu gracz stawia projekt i przydziela robota. Robot przerywa wydobycie, dochodzi do placu i pracuje. Bez budowniczego postęp staje; inny robot może kontynuować budowę.

Pierwszy wariant: jeden robot na budowę, bez przyspieszania przez wielu budowniczych. Koszt pobierany przy zatwierdzeniu projektu; koszt, czas, przydział i zasady anulowania muszą być widoczne. Proponowany zwrot przy anulowaniu odpowiada niewykonanej części budowy. Po ukończeniu robot wraca do poprzedniego wydobycia, jeśli złoże nadal istnieje i ma rudę; w innym przypadku zgłasza bezczynność.

### BUD-02 — Budynki o różnych funkcjach

| Budynek | Rola | Stan |
|---|---|---|
| Centrum dowodzenia | Roboty, główny punkt rozładunku, rozwój poziomu bazy | Rozwinięcie istniejącego |
| Magazyn polowy | Rozładunek blisko złóż | Nowy |
| Reaktor | Dostarcza moc dla infrastruktury | Nowy |
| Ekstraktor gazu | Pozyskiwanie gazu ze złoża przez przydzielonego robota | Propozycja GOS-04 |
| Koszary | Piechota i oddziały wsparcia | Istnieje |
| Fabryka | Pojazdy i później ciężkie maszyny | Istnieje |
| Laboratorium | Badania gospodarcze i militarne | Nowy |
| Wieżyczka | Obrona ważnych punktów | Istnieje |

Na razie pozostawiamy budowę przy bazie i przejętych przekaźnikach. Nie dokładamy równocześnie swobodnych baz w dowolnym miejscu, sieci energii i murów.

## 3. Badania i postęp

### BAD-01 — Laboratorium oraz trzy ścieżki

- Gospodarka: większy ładunek robotów, potem sprawniejsze wydobycie.
- Logistyka: sprawniejsza produkcja i większa wydajność reaktorów.
- Wojsko: istniejące ulepszenia broni i pancerza oraz odblokowanie nowych klas jednostek.

Pierwsze laboratorium prowadzi jedno badanie naraz. Dodatkowe laboratoria na tym etapie nie zwiększają szybkości ani liczby badań; rozbudowę tej zasady zostawiamy na później. Badania nie wymagają zakupu tej samej premii osobno dla każdej jednostki. Nie narzucamy jeszcze wzajemnie wykluczających się specjalizacji.

Przeniesienie badań z fabryki do laboratorium wymaga zachowania już ukończonych ulepszeń. Dla trwających badań ze starego zapisu trzeba zapewnić dokończenie lub jawny pełny zwrot, bez cichej utraty postępu i kosztu.

### BAD-02 — Dwa poziomy rozwoju bazy

Wersja pierwsza: tylko Przyczółek i Baza rozwinięta. Awans centrum wymaga metalu oraz czasu i odblokowuje zaawansowane badania oraz ciężkie jednostki. Bieżące jednostki podstawowe pozostają dostępne na pierwszym poziomie.

Interfejs zablokowanej jednostki pokazuje brakujące wymagania. Awans jest decyzją ekonomiczną: ten sam metal można wcześniej wydać na kilka zwykłych oddziałów.

## 4. Armia

### ARM-01 — Rozwój przez nowe role

Nie dodajemy kilku podobnych czołgów z coraz większym zdrowiem. Każda nowa jednostka ma zadanie i słabość.

| Jednostka | Rola | Słabość / ograniczenie |
|---|---|---|
| Piechota | Tania kontrola terenu | Słaba przeciw pancerzowi |
| Rakietowiec | Zwalczanie pojazdów i umocnień | Wrażliwy na zwykłą piechotę |
| Czołg zwiadowczy | Mobilne wsparcie | Wrażliwy na broń przeciwpancerną |
| Zwiadowca — JED-02 | Szybko odkrywa teren | Mała siła ognia i odporność |
| Robot naprawczy | Wsparcie po walce | Funkcję już pełni robot górniczy; bez nowej jednostki na start |
| Ciężka maszyna krocząca — JED-03 | Przełamanie obrony po rozwoju bazy | Wysoki koszt, mała mobilność, podatność na rakiety |
| Artyleria — JED-01 | Niszczenie umocnień z dystansu | Wymaga eskorty i zasad ostrzału opisanych w planie walki |

Zwiadowca byłby pierwszą nową jednostką. Ciężka maszyna i artyleria nie wchodzą automatycznie do tej samej iteracji.

### ARM-02 — Zaopatrzenie dopiero po balansie podstaw

Na początku zachować obecny limit 60 jednostek, aby nie dodawać jednocześnie nowego zasobu, nowej budowy i nowych reguł limitu. Późniejsza propozycja: budynki logistyczne zwiększają pojemność, a ciężkie jednostki zajmują więcej niż jeden punkt. Spadek pojemności poniżej zajętej wartości nie usuwa wojska; blokuje nowe zamówienia do rozwiązania niedoboru.

## Proponowana kolejność wdrożenia

Każdy etap stanowi osobny zakres do zatwierdzenia. Nie zakładamy realizacji całego systemu w 15 minut.

| Etap | Zakres | Kryteria odbioru |
|---|---|---|
| A: transport | GOS-01 i wskaźnik bezczynnych robotów | Magazyn skraca cykl; po jego utracie robot zachowuje ładunek i znajduje inny punkt; zapis odtwarza rozkazy |
| A2: drugi surowiec | GOS-04: gaz, ekstraktor i pierwsze zastosowania | Działa przydzielanie robotów, wyczerpywanie złóż, koszty mieszane, zwroty i migracja zapisów |
| B: budowniczowie | BUD-01 | Robot przestaje wydobywać podczas budowy; przerwaną budowę można wznowić; anulowanie prawidłowo rozlicza metal |
| C: energia | GOS-02 i reaktor | Bilans odpowiada działającym budynkom; niedobór spowalnia bez utraty postępu; odbudowa jest możliwa |
| D: technologie | Laboratorium, BAD-01 i BAD-02 | Wymagania są czytelne; premię nalicza się raz; zapis i dotychczasowe badania przechodzą migrację |
| E: wojsko | Zwiadowca, później JED-03 | Nowe jednostki mają użyteczne role i działające kontry; parametry sprawdzone w bitwach |

GOS-03 jest zadaniem balansującym po sprawdzeniu etapów A–C. Kryształy z GOS-04 należy rozważyć po etapie D. ARM-02 pozostaje na później. Propozycja walki i terenu nadal istnieje jako osobny kierunek — nie została anulowana ani automatycznie zatwierdzona.

## Decyzje z pierwotnej listy

- Budowa przez roboty — wdrożona w 0.10.
- Kara za niedobór energii — produkcja wojska i badania zwalniają proporcjonalnie, do minimum 25% (0.8); akumulator łagodzi krótkie przerwy (etap A).
- Awans centrum nie blokuje produkcji robotów (etap A).
- Drugi surowiec to gaz (0.6); kryształy weszły wraz z laboratorium (0.8).
- Koszt gazu (i kryształów) otrzymały badania oraz awans centrum; jednostki i budynki nadal kosztują wyłącznie metal.
- Otwarte: znaczenie logistyki względem szybkiego rozwijania armii — kwestia balansu (BAL-01, GOS-03).
