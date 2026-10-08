# Centrum dowodzenia — Przyczółek, Kolonia i Twierdza

## Poziom III — Twierdza i doktryny frakcji (0.147)

Wdrożono 2026-10-08 na życzenie użytkownika. Zasady w `doctrine-rules.js` (łańcuch modułów po `network-rules.js`, przed `space-rules.js`).

**Twierdza** — badanie „Centrum III — Twierdza” w centrum dowodzenia: 600 metalu, 150 gazu, 100 kryształów, 45 s przy pełnej mocy. Wymaga poziomu II (Kolonia) i stojącego laboratorium. Efekt: centrum o 50% wytrzymalsze (raz, znacznik `fortress` na budynku, więc wczytanie zapisu nie powtarza premii), +4 metalu/s do dochodu pasywnego, `centerLevel()` = 3 i wybór doktryny. Twierdza niczego wcześniej dostępnego nie blokuje — obecna zawartość, kampania i AI bez zmian.

**Doktryny** — badania w centrum po Twierdzy: 450 metalu, 150 gazu, 150 kryształów, 40 s. Dwie dla każdej frakcji (bez frakcji scenariusza, np. w kampanii — doktryny Kolonii); jedną można przyjąć. Wybór jest ostateczny: w trakcie przyjmowania jednej druga jest zablokowana („Trwa przyjmowanie”), po ukończeniu — na stałe („Wybrano już”); anulowanie w trakcie zwraca koszt i odblokowuje drugą. Interfejs pyta o potwierdzenie przed rozpoczęciem.

| Frakcja | Doktryna | Efekt | Kiedy dobra |
|---|---|---|---|
| Wolne Kolonie | Logistyka mobilna | jednostki naziemne +15% szybkości, produkcja o 25% szybsza | wojna manewrowa, szybkie uzupełnianie strat |
| | Fortyfikacja przyczółków | jednostki w promieniu 220 od własnych budynków i przekaźników −20% obrażeń; wieże obronne +25% obrażeń | utrzymywanie przekaźników i placówek; nic poza zasięgiem |
| Dominium | Ciężki ostrzał | pojazdy, okręty i budynki obronne +20% obrażeń | pancerne natarcie; piechota bez premii |
| | Silniejsze osłony | wszystkie jednostki i budynki −15% obrażeń | długie starcia, obrona |
| Rój | Nawała | produkcja o 30% szybsza, jednostki +10% szybkości | masa i tempo |
| | Pancerz chitynowy | jednostki i budynki −17% obrażeń (jak +20% wytrzymałości) | wytrzymałe fale, kolosy |

- Efekty liczy `damage()` (atakujący — Ciężki ostrzał, wieże Fortyfikacji; cel — osłony, pancerz, utrzymywanie terenu), `movementFactor()` i `productionRate()` (nowy punkt zaczepienia w `engine.js`, kolejka produkcji w `sideTick`). Doktryna należy do strony gracza (`upgradeOf(drużyna, id)`), zapisywana z jej ulepszeniami. Od 0.150 dowódca AI (średni i trudny poziom scenariuszy) też buduje Twierdzę i przyjmuje doktrynę — we własnych ulepszeniach `enemyAi.teams[drużyna].upgrades`, które `doctrineOf()` czyta obok strony gracza ([AI przeciwnika](AI_PRZECIWNIKA.md)).
- Ukończone badanie zgłasza swój efekt (`RESEARCH[...].done` — nowe pole, czytane przez silnik przed dotychczasową listą komunikatów).
- Interfejs: karty „Centrum III — Twierdza” i dwie doktryny frakcji w BADANIACH (pola TWIERDZA / DOKTRYNA), drzewo rozwoju F2 → Gospodarka (gałąź centrum: Kolonia → Twierdza → doktryny), zaznaczenie centrum („Centrum 3 — Twierdza · doktryna …”), napis nad centrum „III · TWIERDZA”, baza wiedzy.
- Testy: `tests/doctrine.test.js` (wymagania i koszty Twierdzy, jednorazowa premia wytrzymałości i dochód, zapis; blokady doktryn — przed Twierdzą, innej frakcji, wykluczanie w toku i po ukończeniu, anulowanie; efekty wszystkich sześciu doktryn); `tests/development.test.js` — badania frakcyjne (doktryny) w drzewie tylko dla swojej frakcji, jak jednostki.
- Dalej (propozycje): balans po rozgrywkach (doktryny w rękach AI — 0.150), specjalistyczne lotnictwo i zaawansowane osłony jako zawartość poziomu III.

---


Aktualizacja 2026-09-24: cały [etap A](ETAP_A_ROZWOJ_KOLONII.md) jest ukończony, wraz z technologiami i misją Próba kolonii. Poniżej opis pierwotnego podetapu.

Wdrożono 2026-09-24 jako część etapu A.

## Nowe scenariusze

Start na poziomie I — Przyczółek. Dostępne pozostają roboty, piechota, fortyfikacje, magazyn, ekstraktor gazu, reaktor i akumulator. Początkowy czołg pozostaje w armii.

W BADANIA lub ROZWÓJ / F2 → Gospodarka → Centrum II — Kolonia można zlecić rozbudowę za 300 metalu i 50 gazu. Czas: 30 s przy pełnej mocy. Gaz pozyskuje dostępny już na poziomie I ekstraktor obsadzony robotem. Koszt badania jest wspólny dla obu frakcji.

Poziom II odblokowuje budowę fabryki, laboratorium, hangaru i warsztatu oraz ich dotychczasową produkcję i badania. Nie dodaje premii obrażeń ani darmowej mocy.

Rozbudowa zajmuje wspólną kolejkę badań, lecz nie wstrzymuje produkcji robotów. Można ją anulować ze zwrotem pełnego kosztu. Obowiązuje obecny wpływ niedoboru mocy. Postęp i ukończenie są zapisywane. Kafle i drzewo pokazują przyczynę blokady; skróty i bezpośrednie stawianie respektują wymaganie.

## Kampania i zgodność

Trzy obecne misje kampanii startują jako Kolonia: bez dodatkowego kosztu i opóźnienia realizacji ich istniejących celów. Nauka awansu w nowej misji pozostaje kolejnym zadaniem. Strategia i dostępne oddziały AI pozostają bez zmian.

Zapisy sprzed tego etapu otrzymują Kolonię, jeśli mają zaawansowaną infrastrukturę (również fundament), zaawansowane badania ukończone lub w toku albo należą do kampanii. Pozostałe zachowują Przyczółek i dostęp do posiadanych obiektów. Nowe zapisy mają znacznik wersji progresji i zachowują dokładny stan awansu.

Poziom widoczny w zaznaczeniu centrum oraz nad modelem. Szczegóły w bazie wiedzy. Trzeci poziom i doktryny nie należą do tego etapu.

Weryfikacja: ukierunkowane testy blokad, kosztów, anulowania, ukończenia, zapisu, migracji i kampanii; składnia zmienionych plików. Bez pełnego zestawu i kontroli wizualnej w przeglądarce.
