# Dalszy rozwój gry — propozycje po pakiecie żywych planet

Data: 2026-09-23
Status (2026-09-26): etapy A, B, C i D ukończone — zob. [Proponowana kolejność](#proponowana-kolejność). Pozostałe punkty to koncepcje do wyboru, nie zlecenie implementacji. Sekcje 5–7 (grafika, muzyka, dźwięk) zrealizowano w dużej części w etapach B i D; nagrane głosy, własne ścieżki audio, modele w 8 kierunkach i skarpy pozostają propozycjami.

## Punkt wyjścia

Prototyp ma dwie frakcje, gospodarkę metalu/rudy, gazu i kryształów, bilans mocy, roboty budujące i wydobywające, badania, fortyfikacje, lotnictwo, pogodę, cykl dnia i nocy, neutralne zagrożenia, trzy rozdziały kampanii oraz konfigurację scenariuszy. Baza wiedzy pokazuje modele obiektów. Muzyka menu, intro i planet ma odrębne motywy; jednostki i praca robotów mają efekty dźwiękowe.

Największy potencjał: połączyć te systemy w czytelne decyzje o rozwoju i sposobie wygrania bitwy. Kolejne obiekty powinny mieć rolę, koszt alternatywny i słabość. Zachowujemy 2D; tryb 3D i przebudowa strategicznego AI pozostają odłożone. *(Stan 2026-10-07: obie rzeczy zostały później wdrożone — dowódca AI w 0.34, renderer 3D w 0.52–0.96. Aktualne kierunki: [Plan rozwoju](PLAN_ROZWOJU.md).)*

## 1. Drzewo technologii i etapy rozwoju

Aktualizacja 2026-09-24: [pierwsza wersja drzewa](DRZEWO_ROZWOJU.md) jest wdrożona dla obecnych zależności, ze zlecaniem badań i produkcji. Dwa pierwsze poziomy wdrożono: [Przyczółek i Kolonia](POZIOMY_CENTRUM.md). Trzeci poziom (Twierdza) i doktryny frakcji wdrożono w 0.147 — [opis](POZIOMY_CENTRUM.md#poziom-iii--twierdza-i-doktryny-frakcji-0147).

Proponowane trzy poziomy centrum dowodzenia: Przyczółek → Kolonia → Twierdza planetarna. To propozycja zmiany progresji, nie obecny warunek produkcji.

- Przyczółek: podstawowe wydobycie, roboty, piechota i lekka obrona.
- Kolonia: pełna gospodarka gazu i kryształów, fabryka, laboratorium i specjalizacje gospodarcze.
- Twierdza: specjalistyczne lotnictwo, zaawansowane systemy osłon i najwyższe doktryny.

Przy wdrożeniu trzeba ponownie przypisać istniejące budynki i jednostki do poziomów. Nie blokować obecnej zawartości bez korekty cen, długości misji i celów kampanii. Stare zapisy powinny otrzymać poziom odpowiadający posiadanej infrastrukturze, bez odbierania ukończonych badań.

Jedno wspólne okno zależności, trzy zakładki: Gospodarka, Infrastruktura, Armia. Kliknięcie węzła pokazuje efekt, cenę, wymagania, powiązane obiekty i przyczynę blokady. Istniejące badania pogodowe, ładownie, broń i pancerz stają się częścią drzewa.

| Gałąź | Przykładowa sekwencja nowych ulepszeń | Decyzja gracza |
|---|---|---|
| Gospodarka | Analiza złóż → wydajniejsze narzędzia → specjalizacja wydobycia | Szybki dopływ materiałów czy większy końcowy uzysk złoża? |
| Energia i budowa | Bufor energii → moduły budynków → sektorowe osłony | Rezerwa mocy czy silniejsza obrona? |
| Armia | Szkolenie → wyposażenie specjalistyczne → doktryna | Mobilność, oblężenie czy utrzymywanie terenu? |

Większość ulepszeń wspólna, kilka charakterystycznych dla frakcji. Wzajemnie wykluczające się wybory dopiero przy doktrynach, z jednoznacznym ostrzeżeniem przed wyborem. Przykład dla Kolonii: logistyczna mobilność albo fortyfikowanie zdobytych przyczółków. Dla Dominium: ciężki ostrzał albo silniejsze osłony. Żadna gałąź nie powinna być najlepsza w każdej sytuacji.

## 2. Gospodarka

Aktualizacja: panel ekonomii, podział robotów i ostrzeżenia o złożach wdrożono jako osobny zamknięty zakres — [Panel gospodarki](PANEL_GOSPODARKI.md). Pozostałe propozycje poniżej nadal oczekują.

Na pierwszy etap nie dodawać kolejnego podstawowego surowca. Obecne zasoby wystarczają do zbudowania bardziej interesujących zależności.

- Podsumowanie ekonomii: dochód każdego zasobu na minutę, liczba pracujących i bezczynnych robotów, rezerwa mocy, odległość dostaw i kończące się złoża.
- Limity obsługi złóż: np. trzy wydajne stanowiska przy złożu; kolejni robotnicy dają malejącą korzyść. Dokładne wartości wymagają balansu.
- Wybór ulepszenia wydobycia: szybsze opróżnianie złoża albo oszczędniejsze wydobycie większej łącznej ilości. Czytelny efekt w interfejsie.
- Akumulator: wykorzystuje nadwyżkę mocy, podtrzymuje produkcję przez krótki czas po utracie reaktora. Moc i zgromadzona energia mają osobne wskaźniki.
- Złomowisko/odzysk: ograniczony zwrot metalu z wraków, z czasem rozbiórki i limitem uzysku. Odzysk nigdy nie pokrywa pełnego kosztu jednostki, aby nie tworzyć nieskończonego obiegu.
- Posterunki wydobywcze: magazyn, osłona i pobliski przekaźnik jako naturalny punkt ekspansji. Złoża przy siedliskach potworów oferują większą nagrodę za ryzyko.
- Później: automatyczny transport między wysuniętym magazynem a bazą. Najpierw prosta trasa i czytelne ostrzeżenie o jej przerwaniu; bez ręcznego prowadzenia każdego kursu.

Nie zaczynać od powszechnego zużycia amunicji, paliwa ani stałych kosztów utrzymania. Te systemy znacząco zwiększają liczbę czynności gracza i ryzyko impasu ekonomicznego. Dochód pasywny z centrum i przekaźników skorygować dopiero po pomiarach przebiegu rozgrywek.

## 3. Budynki i ich rozwój

> Wdrożone w 0.32 (etap E): punkt medyczny, generator osłon, plac odzysku, wóz przeciwlotniczy, dron zwiadowczy, sabotażyści i moduły budynków — [opis](ETAP_E_WSPARCIE_I_MODULY.md). Warsztat polowy — [opis](WARSZTAT_POLOWY.md).

Preferować kilka nowych ról i moduły istniejących budowli, zamiast wielu prawie identycznych obiektów.

| Propozycja | Rola | Ograniczenie / słabość |
|---|---|---|
| Warsztat polowy | Automatycznie naprawia pobliskie pojazdy, odciąża roboty | Zużywa metal, ograniczona liczba stanowisk; wolniej pod ostrzałem |
| Punkt medyczny | Leczy piechotę, umożliwia powrót rannych do walki | Nie naprawia maszyn; ograniczona przepustowość |
| Bateria przeciwlotnicza | Wyspecjalizowana obrona przed samolotami | Nie zastępuje wieżyczki przeciw celom naziemnym |
| Generator osłon | Chroni niewielki obszar bazy | Duży pobór mocy, przerwa po przeciążeniu; koszt alternatywny wobec rozbudowy |
| Akumulator | Krótkotrwałe zabezpieczenie bilansu mocy | Ograniczona pojemność i tempo ładowania |
| Plac odzysku | Przetwarzanie wraków z pola walki | Robot musi dotrzeć do wraku i wrócić z ładunkiem |

Moduły: koszary — szkolenie weteranów albo szybsza rekrutacja; fabryka — ciężkie uzbrojenie albo logistyka; wieża — wariant przeciwpancerny albo przeciwlotniczy. Każdy moduł zmienia sylwetkę budynku i ma widoczne wymagania. Na początku jeden moduł na obiekt, bez wielopiętrowych konfiguracji.

## 4. Armia

Nowe jednostki powinny otwierać nowe działania:

- Transporter opancerzony: przewóz małego oddziału, szybkie przerzuty i ewakuacja. Ryzyko utraty przewożonych jednostek musi być znane przed załadunkiem; na pierwszy etap proponowane awaryjne wysadzenie ocalałych.
- Mobilna obrona przeciwlotnicza: towarzyszy armii, słabsza przeciw wojskom lądowym.
- Medyk lub dron wsparcia: pomaga zachować doświadczony oddział. Naprawa maszyn pozostaje rolą robotów i warsztatu, więc nie powielamy jej bez powodu.
- Zwiadowczy dron powietrzny: mały zasięg walki lub brak broni, obserwacja burz i siedlisk. Nie zastępuje bojowego myśliwca.
- Później oddział sabotażowy: czasowo wyłącza reaktor/radar, słaby w otwartej walce. Wymaga czytelnej informacji o wykryciu i kontrze.

Dodatkowe mechaniki: trzy stopnie doświadczenia z małymi premiami, proste formacje (linia, kolumna, rozproszenie), patrol i rozkaz eskorty. Rozdzielić to od odłożonej przebudowy strategicznego AI: są to zachowania jednostek realizujących konkretne rozkazy.

Artyleria mogłaby mieć tryb rozstawiony o większym zasięgu i czas przygotowania. Piechota — kierunkowe osłony. Obie zmiany wymagają odrębnego balansu, aby nie osłabić istniejących jednostek przypadkiem.

## 5. Grafika 2D

Najpierw spójna czytelność, następnie kolejne efekty:

1. Wyraźne sylwetki frakcji: Kolonie — lżejsze, modułowe konstrukcje; Dominium — masywne bryły i opancerzenie. Kolor gracza jako detal, nie jedyny sposób rozpoznawania.
2. Modele jednostek w ośmiu kierunkach, z osobnymi animacjami jazdy, postoju, strzału, trafienia i zniszczenia. Spójne detale gąsienic, nóg i zawieszenia.
3. Budynki z etapami budowy: fundament → szkielet → urządzenia → ukończony obiekt; animacje odpowiednie do wykonywanej pracy.
4. Łagodniejsze przejścia między rodzajami podłoża, kamieniste brzegi, pasy trzcin, kępy traw, ścieżki i spójne cienie. Sezonowa różnorodność roślin bez zasłaniania jednostek.
5. Wraki i zniszczalne dekoracje: na początek wizualne pozostałości i odzysk; blokowanie przejść dopiero po osobnych testach nawigacji.
6. Graficzne skarpy i płaskowyże. Wpływ wysokości na widoczność/ostrzał dopiero później, razem z kontrolą linii strzału. Nie sugerować graficznie przewagi, której mechanika jeszcze nie daje.
7. Osobne ustawienia jakości roślinności, pogody, cząsteczek i cieni oraz możliwość ograniczenia błysków i drgań kamery.

Neutralne zagrożenia można rozwinąć o wyraźne sygnały przed atakiem: drżenie piasku, ślady, odgłosy i ruch roślin. Omijanie siedliska powinno być pełnoprawnym wyborem, a nie jedynie opóźnioną walką.

## 6. Muzyka

Istniejące motywy planetarne rozwinąć w muzykę reagującą na przebieg gry:

- Każda planeta: spokojna eksploracja, rozwój bazy, napięcie, bitwa i wygaszenie walki.
- Wspólny puls utworu oraz dołączanie warstw instrumentów, z przejściem na granicy frazy. Zmiana zakładki/menu nie restartuje utworu.
- Opóźnienie przełączenia po krótkim incydencie, aby pojedynczy strzał nie uruchamiał ciągle muzyki bitewnej.
- Kolonie: cieplejsze barwy i motyw nadziei. Dominium: cięższa perkusja i niskie brzmienia. Planeta określa atmosferę, frakcja dodaje motyw przewodni.
- Kampania: motyw Liry, motyw blokady, krótki motyw odkrycia oraz osobne zakończenia zwycięstwa i porażki.
- Docelowo własne przygotowane ścieżki/warstwy audio o wyższej jakości, zapętlane bez szwu; obecny syntezator można zachować do części efektów. Nie zakładać kopiowania muzyki z istniejących filmów i gier.

## 7. Dźwięk

- Oddzielne regulatory: muzyka, walka, jednostki/praca, otoczenie, komunikaty/głosy.
- Priorytet informacji: alarm bazy i ważna kwestia chwilowo ściszają wydobycie oraz odgłosy otoczenia. Limit nakładających się identycznych dźwięków.
- Warianty odgłosów: kilka próbek narzędzi, strzałów i silników, subtelna zmiana wysokości i opóźnienia; mniej odczuwalnych powtórzeń.
- Różne kroki i gąsienice na piasku, śniegu, kamieniu i przy brzegu wody.
- Odgłosy nowych drapieżników i ostrzeżenia w pobliżu siedlisk, zgodne z odkryciem terenu, aby audio nie ujawniało niewidocznych przeciwników.
- Krótkie kwestie jednostek: wybór, ruch, atak, budowa ukończona, złoże wyczerpane. Rzadkie powtórzenia oraz napisy do istotnych komunikatów.
- Dźwięk zależy od odległości kamery; oddalanie widoku upraszcza miks zamiast sumować całą mapę.

## 8. Kampania

Kontynuacja trzech istniejących rozdziałów powinna rozwijać skutki odzyskania sieci latarni, a nie powtarzać ich uruchomienie.

Proponowany drugi akt: „Cena świtu”. Po przywróceniu łączności ujawnia się sygnał z odciętej kolonii. Dominium używa dawnej infrastruktury badawczej, a jej praca wywołuje niepokój miejscowej fauny.

- IV — Sygnał spod piasku: uratuj ekipę badawczą, odnajdź archiwum i przeprowadź transporter przez obszar jam. Ominięcie zagrożeń jest alternatywą dla ich likwidacji. Cel dodatkowy: ewakuacja wszystkich badaczy.
- V — Ostatni konwój: dostarcz rdzenie energetyczne przez lodowy region. Naprawiaj postoje i broń magazynów podczas śnieżyc. Cel dodatkowy: zachowanie pojazdów wsparcia; nie jest to zwykła misja z limitem na zniszczenie bazy.
- VI — Serce popiołu: odbierz kontrolę nad kompleksem i podejmij decyzję: zniszczyć instalację czy odłączyć ją i ewakuować personel. Wybrany sposób zmienia epilog i drobny bonus, nie wymaga dwóch całych kampanii.

Forma: krótkie animowane sceny 2D z portretami, dialogi radiowe w grze, dziennik celów i możliwość pominięcia intro oraz powtórzenia odprawy. Informacje krytyczne dostępne jako tekst. Każda misja uczy jednej nowej mechaniki.

Przenoszenie postępu: najpierw odznaki, odblokowania i ograniczony bonus za cele dodatkowe. Nie przenosić od razu całej armii i zapasów — to utrudnia balans i może karać za wcześniejsze straty.

## 9. Scenariusze

> Wdrożone w 0.18 i 0.33: tryby Podbój, Utrzymanie przekaźników, Obrona i Ekspedycja po artefakt, ziarno mapy ze sprawdzaniem układu, gotowe ustawienia i modyfikatory złóż, fauny i pogody — [opis](SCENARIUSZE_USTAWIENIA_I_EKSPEDYCJA.md). Długość doby, poziom startowy, drużyny i edytor map pozostają propozycjami.

- Osobny wybór mapy i zasad zwycięstwa: Podbój, Utrzymanie przekaźników, Obrona przez określony czas, Ekspedycja po artefakt.
- Każda mapa ma charakterystyczny cel przestrzenny: oazy i siedliska, lodowe przesmyki, przemysłowe ruiny, archipelag połączony mostami. Mosty wymagają osobnej mechaniki przejść.
- Modyfikatory: bogactwo złóż, nasilenie pogody, liczebność fauny, długość doby, początkowy poziom technologiczny.
- Presety zamiast ściany ustawień: Spokojna ekspansja, Niebezpieczna planeta, Wojna o zasoby.
- Ziarno mapy do udostępnienia i ponownego rozegrania tego samego układu. Generator musi sprawdzać dostęp do zasobów, dojście do celów i wolne bazy.
- Drużyny 2 na 2 później: obecna liczba uczestników nie oznacza jeszcze sojuszy. Wymaga reguł wspólnego zwycięstwa, widoczności i zakazu bratobójczego ognia.
- Edytor map na później: najpierw zapis prostego scenariusza do danych, następnie narzędzie układania obiektów.

## 10. Dodatkowe obszary

- Samouczek w małej misji: robot → magazyn → energia → produkcja → osłona → cel bitwy.
- Mapa taktyczna po rozwinięciu minimapy: filtry złóż, siedlisk i armii, cele misji oraz czytelne kierunki ataku.
- Podsumowanie bitwy: dochód, straty, koszt utraconej armii, przejęte punkty i czas bezczynności robotów. Wykresy pomagają zrozumieć wynik i mierzyć balans.
- Czytelne statystyki zaznaczenia: obrażenia, rola, celność w aktualnej pogodzie, aktywne premie i stan osłony.
- Spójne ikonki, skalowanie UI i oznaczenia frakcji niezależne od koloru.
- Pomiary płynności dużych bitew; budżety cząsteczek, roślinności i równoczesnych głosów audio.
- Współdzielenie definicji gry między kartami, drzewem technologii, bazą wiedzy i logiką, aby opisy nie rozmijały się z zasadami.

## Proponowana kolejność

### A. Rozwój kolonii — ukończony (2026-09-24)

Stan 2026-09-24: gotowe są drzewo obecnych zależności, panel ekonomii, [warsztat polowy](WARSZTAT_POLOWY.md) i [akumulator energii](AKUMULATOR_ENERGII.md). Gotowe są także [dwa poziomy centrum](POZIOMY_CENTRUM.md), trzy technologie gałęzi oraz misja Próba kolonii. Pełny zakres i odbiór: [Etap A](ETAP_A_ROZWOJ_KOLONII.md). Etapy B i D także ukończono. Etap C odłożono na później decyzją użytkownika.

Pierwsza wersja drzewa pokazująca wszystkie obecne zależności, dwa pierwsze poziomy centrum, panel ekonomii, akumulator, warsztat i po jednej nowej technologii dla gospodarki, infrastruktury i armii. Jedna misja pokazuje użycie nowych zasad. Poziom trzeci i doktryny dopiero po ocenie tempa rozgrywki.

Odbiór: czytelne blokady i koszty, poprawne kolejki i anulowanie, migracja zapisów bez utraty dostępu do posiadanych obiektów, brak nieodwracalnego zastoju gospodarki po utracie zasilania. Ta sama logika kosztów i premii dla obu stron; obecny przeciwnik nie może stracić dostępu do przewidzianych dla niego oddziałów. Nie zmieniać przy okazji jego strategii.

### B. Wyrazista armia i baza — ukończony (2026-09-24)

Wdrożenie, sterowanie i ograniczenia: [Etap B — Armia i baza](ETAP_B_ARMIA_I_BAZA.md).

Poprawione sylwetki 2D i animacje, transporter, obrona przeciwlotnicza, proste formacje i odgłosy rozkazów. Rozbudowane liczniki i opisy ról umożliwiają porównanie kosztów.

### C. Drugi akt kampanii i różne cele scenariuszy — ukończony (2026-09-26)

Wdrożenie: [Akt II kampanii](ETAP_C_DRUGI_AKT.md) (0.17) oraz [Tryby scenariuszy i rozmiary map](ETAP_C_TRYBY_I_MAPY.md) (0.18). Ekspedycja po artefakt, ziarno mapy i presety z §9 pozostają propozycjami.

Misje IV–VI wdrażane pojedynczo, wraz z odpowiadającą im mechaniką; tryby utrzymania punktów i obrony. Odprawy, dialogi, cele dodatkowe i podsumowanie.

### D. Oprawa reagująca na rozgrywkę — ukończony (2026-09-25)

Wdrożenie, ustawienia i wyniki pomiarów: [Etap D — Oprawa](ETAP_D_OPRAWA.md).

Muzyka warstwowa, miks dźwięków z priorytetami, kolejny etap terenu i efektów. Pomiary wydajności przed dalszym zwiększaniem zagęszczenia dekoracji.

Bez deklaracji czasu realizacji przed wyborem zakresu. Przed każdym etapem oddzielić elementy konieczne od opcjonalnych i zdefiniować krótką listę kryteriów odbioru.


