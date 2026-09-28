# Wersja 0.12 — frakcje, lotnictwo i fortyfikacje

Wdrożono 23.09.2026. Tryb pozostaje 2D, oparty na Canvas i proceduralnych rysunkach.

## Rozpoczęcie bitwy

Gra jednoosobowa → Scenariusze → mapa → ustawienia → Rozpocznij operację.
Wybór obejmuje nazwę i kolor dowódcy, frakcję, trudność oraz 2–4 uczestników (gracz i 1–3 AI). Zwycięstwo wymaga zniszczenia wszystkich wrogich centrów. Kampania zachowuje własne zasady i misje. Konfiguracja oraz jednostki zapisują się w istniejących slotach.

Łatwy poziom: AI ma 85% wytrzymałości i obrażeń, dłuższe odstępy między falami. Trudny: 115%, krótsze odstępy. Normalny: 100%. Przeciwnicy korzystają nadal z dotychczasowego systemu fal; przebudowa AI i multiplayer pozostają osobnymi zadaniami.

## Dwie frakcje

| Cecha | Wolne Kolonie | Dominium |
| --- | --- | --- |
| Koszt budynków i rekrutacji | −10% | +12% |
| Wytrzymałość | −8% | +18% |
| Prędkość | +12% | −12% |
| Obrażenia | standardowe | +8% |
| Zdolność pasywna | Jednostki bojowe regenerują 1,2 PW/s po 8 s bez otrzymania obrażeń i bez bieżącego celu | Jednostki w bezruchu otrzymują o 8% mniej obrażeń |
| Unikalna jednostka | Zwiadowca, koszary | Bastion, fabryka; strzela również do lotnictwa |
| Architektura | Jaśniejsze dachy, proporce | Cięższe bryły, nadbudówki obronne |

Wspólne typy otrzymują parametry i oznaczenia frakcji. Badania mają wspólny koszt. Balans startowy wymienia cenę, mobilność i siłę; wymaga dalszych rozgrywek porównawczych, nie jest jeszcze bilansem turniejowym.

## Lotnictwo i roboty

Hangar kosztuje bazowo 350 metalu i pobiera 25 mocy. Produkuje myśliwiec (260 metalu, 14 s) oraz bombowiec (390 metalu, 20 s). Kwoty podlegają mnożnikowi frakcji. Myśliwiec atakuje cele powietrzne i naziemne. Bombowiec zwalcza cele naziemne, ma premię 50% przeciw budynkom. Piechota, rakietowcy, wieżyczki, centrum i Bastion mogą odpierać lotnictwo. Samoloty przelatują nad wodą i przeszkodami.

Roboty mają słabą broń obronną (bazowo 6 obrażeń, zasięg 115, odstęp 1,1 s), także podczas pracy.

## Mury

Wybierz Mur / K i przeciągnij lewy przycisk myszy. Podgląd pokazuje odcinek i łączny koszt. Segmenty są rozmieszczane co 48 jednostek; pojedynczy odcinek mieści do 31 segmentów. Całość wymaga odkrytego terenu w zasięgu budowy i zasobów. Robot realizuje kolejkę po kolei. Kolejne odcinki można prowadzić pod kątem i domykać nimi obwód.

Brama lub wieżyczka postawiona na środku własnego segmentu zastępuje ten segment. Nie zwraca kosztu zastąpionego muru. Sąsiednie segmenty pozostają i łączą się wizualnie. Wybierz ukończoną bramę, aby ją otworzyć/zamknąć. Zamknięta blokuje ruch, otwarta przepuszcza obie strony.

## Oprawa i interfejs

Budynki mają dachy, ściany boczne, okna, podesty, detale elewacji i spójne cienie. Lotnictwo ma cień na ziemi i animację unoszenia. Dodano drobne jelenie, lisy, zające i jaszczurki zależne od biomu; ptaki i ryby pozostają na mapach. Nowe drobne zwierzęta są dekoracyjne, istniejące drapieżniki nadal atakują.

Słońce i księżyc mają poświatę, gwiazdy delikatnie migoczą. Syntezowane odgłosy zwierząt, kroków, silników i radia uwzględniają widoczny obszar. W Ustawieniach osobno reguluje się muzykę i efekty; wartości są zapamiętywane.

ARMIA, BUDOWA i BADANIA korzystają z kafli dopasowanych do szerokości i przycisków stron. Opisy, warunki oraz koszty mają osobne wiersze, bez poziomego scrolla.

## Weryfikacja

80 testów Node przechodzi (`npm test`), w tym kolejka muru po wczytaniu, szczelność zamkniętej bramy, przejazd przez otwartą, zastąpienie segmentów, lot nad przeszkodami, warstwy celów, zwroty kosztów, frakcje i zwycięstwo nad wieloma bazami. 28 sprawdzeń menu w przeglądarce przechodzi. Wizualnie sprawdzono ustawienia, konfigurację bitwy, bryły budynków i pełne opisy badań. Nie wykonano długotrwałych pomiarów wydajności ani pełnego turnieju balansującego frakcje.
