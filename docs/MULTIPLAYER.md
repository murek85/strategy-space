# Gra wieloosobowa (wersja 0.48, 2026-09-28)

Nowa pozycja menu **Gra wieloosobowa**: bitwa jeden na jeden z drugim człowiekiem, przez przeglądarkę, bez serwera gry. Zakres pierwszej wersji wybrany przez użytkownika: połączenie P2P (WebRTC), dwóch graczy, wersja minimalna (lobby z ustawieniami i sama bitwa).

## Jak zagrać

1. Obaj gracze otwierają grę (przez serwer `node server.js` albo z pliku) i wybierają **Gra wieloosobowa**; każdy ustawia nazwę, kolor i frakcję.
2. **Gospodarz** wybiera **Utwórz grę** i wysyła drugiemu graczowi **kod zaproszenia** (komunikator, e-mail — kod ma ok. 600 znaków, przycisk kopiuje go do schowka).
3. **Gość** wybiera **Dołącz do gry**, wkleja kod zaproszenia, tworzy **kod odpowiedzi** i odsyła go gospodarzowi.
4. Gospodarz wkleja kod odpowiedzi i wybiera **Połącz** — obaj trafiają do **lobby**.
5. W lobby gospodarz ustala zasady: **mapa, rozmiar mapy, złoża, pogoda, fauna, długość doby, poziom startowy, ziarno mapy**; każdy gracz zmienia swoją nazwę, kolor i frakcję. Gość zgłasza gotowość, gospodarz rozpoczyna bitwę.
6. Wygrywa ten, kto zniszczy centrum dowodzenia przeciwnika. W menu pauzy: **Poddaj się** i **Opuść bitwę**.
7. **Rewanż** (0.48): na ekranie końcowym przycisk **Rewanż**. Drugi gracz widzi propozycję („… proponuje rewanż”) i przycisk **Przyjmij rewanż**; gdy obaj się zgodzą, nowa bitwa rusza od razu — to samo połączenie, te same zasady, frakcje, kolory i nazwy, nowy układ mapy (nowe ziarno losuje gospodarz). Czat przechodzi do rewanżu. Gdy drugi gracz wybierze **Menu główne**, rewanż staje się niemożliwy (komunikat na ekranie końcowym).
8. **Czat w lobby** (0.47.2): panel **Czat lobby** po prawej stronie okna lobby (w wąskim oknie — pod nim).
9. **Wspólna pauza** (0.47): **Spacja**, przycisk w menu pauzy albo panel na planszy zatrzymuje grę u obu graczy. Każdy gracz ma **3 pauzy**, każda trwa najwyżej **60 s** (potem gra rusza sama). Wznowić może każdy z graczy — Spacją lub przyciskiem **Wznów grę**; bitwa rusza po odliczaniu **3 s**. W czasie pauzy można wydawać rozkazy — wykonają się po wznowieniu.
10. **Czat** (0.46.1): w lobby okno wiadomości (Enter lub **Wyślij**); w bitwie **Enter** otwiera linię wiadomości, Enter wysyła, Esc zamyka. Ostatnie wiadomości widać nad legendą przez 15 s (rozmowa z lobby przechodzi do bitwy), a wiadomość przeciwnika sygnalizuje krótki dźwięk radia.

Przełącznik „Gra przez internet” używa publicznego serwera STUN (Google), który tylko podpowiada przeglądarce jej publiczny adres; w sieci lokalnej można go wyłączyć. Przy niektórych sieciach (symetryczny NAT, firmowe zapory) połączenie bezpośrednie przez internet może się nie udać — wtedy pomaga VPN typu Tailscale / ZeroTier albo gra w jednej sieci.

## Jak to działa

### Silnik: wielu graczy (`engine.js` i moduły reguł)

Silnik zakładał jednego człowieka (drużyna 0) — ok. 200 miejsc w silniku, regułach i interfejsie. Teraz:

- **Strona gracza** (`game.sides[drużyna]`): metal, gaz, kryształy, badania, kolejki, ulepszenia, historia gospodarki, mgła wojny (`explored`, `visible`), grupy, alarmy bazy, komunikaty, zniszczenia, szyk. Dotychczasowe pola (`game.credits`, `game.queue`, `game.explored`…) są akcesorami do strony **działającego gracza** (`game.me`).
- `game.as(drużyna, fn)` — wykonanie w imieniu gracza; symulacja przetwarza każdą jednostkę człowieka, jego produkcję, badania, energię, warsztat jako ten gracz. Miejsca dotyczące innej jednostki niż przetwarzana (np. pancerz celu) pytają wprost o właściciela: `upgradeOf(drużyna, klucz)`, `sideOf(drużyna)`.
- `game.viewer` — gracz, którego widok pokazuje interfejs (renderery, HUD, dźwięk, menu); w grze jednoosobowej 0, więc nic się nie zmienia.
- **Mgła osobno dla każdego gracza**; decyzje symulacji (cele jednostek, wraki, uderzenia orbitalne, drony) korzystają z `isVisibleTo(drużyna, x, y)`, nigdy z widoku — inaczej komputery graczy by się rozjechały.
- Wynik (`result`) jest liczony z perspektywy pierwszego gracza; `resultFor(drużyna)` odwraca go dla drugiego.

### Gra sieciowa (`network-rules.js`)

- `RTS.createNetworkGame(ustawienia)`: mapa scenariusza z trybem podboju, drużyna 0 (gospodarz) i 1 (gość) są ludźmi, bez dowódcy AI i bez fal. Gość dostaje taki sam start jak gospodarz (jednostki i budynki gospodarza lustrzanie w swoim narożniku). Kolor i frakcja każdego gracza; przy tym samym kolorze gość dostaje inny.
- `game.applyCommand(drużyna, nazwa, argumenty)`: akcja gracza z zamkniętej listy (`RTS.NET_COMMANDS` — ruch, atak, zatrzymanie, produkcja, budowa, mury, wydobycie, naprawa, badania, punkt zbiórki, brama, rozbiórka, odzysk, sabotaż, moduły, uderzenie orbitalne, transport, szyk, poddanie się); argumenty sprawdzane (liczby skończone, krótkie teksty, ograniczony rozmiar), a wyjątek w akcji jest ignorowany — jednakowo na obu komputerach.
- `game.checksum()`: skrót stanu symulacji (jednostki, gospodarki, przekaźniki, ziarno losowania).

### Połączenie i synchronizacja (`netplay.js`)

- **WebRTC bez serwera**: kod zaproszenia to oferta WebRTC, kod odpowiedzi — odpowiedź; opisy są kompresowane (`deflate-raw`) i zapisane w base64. Kanał danych uporządkowany i niezawodny.
- **Lockstep**: tura = 3 kroki symulacji (0,1 s). Rozkazy wydane w turze są wysyłane na początku następnej i wykonywane u obu graczy 2 tury później (0,2 s), w tej samej kolejności (najpierw gospodarz). Gra czeka, gdy brakuje tury drugiego gracza („Czekam na drugiego gracza…”). Co 10 tur gracze porównują sumy kontrolne; różnica przerywa bitwę komunikatem o rozsynchronizowaniu. Pomiar opóźnienia co 2 s.
- **Płynność (0.46.2)**: kroki tury są rozłożone na klatki jak w grze jednoosobowej (jeden krok co 1/30 s); rozkazy tury wykonują się przed jej pierwszym krokiem, więc kolejność obliczeń jest ta sama. Wcześniej cała tura (3 kroki) liczyła się w jednej klatce, a potem przez 5 klatek nic się nie ruszało — obraz przeskakiwał 10 razy na sekundę. Po czekaniu na drugiego gracza widoczna strona nadrabia stopniowo (2 kroki na klatkę, przy dużej zaległości 6), zamiast skoczyć naraz.
- **Karta w tle**: ukryta strona nie dostaje klatek animacji, a liczniki są dławione (po kilku minutach do jednego na minutę) — gra sieciowa posuwa się wtedy na każdą odebraną turę przeciwnika (wiadomości sieciowe nie są dławione) i na licznik, nadrabiając do 3 s naraz. Dzięki temu zminimalizowana przeglądarka nie zatrzymuje przeciwnika.

### Interfejs

- `netplay-menu.js`: przycisk w menu głównym, ekran połączenia (dane gracza, STUN, kody), lobby (karty graczy, własne dane, zasady gospodarza — u gościa tylko do odczytu, gotowość, start). Profil gracza zapamiętany (`pogranicze-network-v1`).
- `app.js`: wszystkie akcje gracza przechodzą przez `act()` — w grze jednoosobowej wykonywane od razu, w sieciowej wysyłane (odpowiedź optymistyczna). Bitwa sieciowa nie ma pauzy (także gdy okno traci fokus), zapisu ani wczytywania; menu otwarte w trakcie nie wstrzymuje symulacji. Ekran końcowy: zwycięstwo lub porażka, zniszczenia obu graczy i przekaźniki; osobne ekrany dla zerwanego połączenia i rozsynchronizowania.
- Diagnostyka w konsoli: `currentGame()`, `currentNetwork()`.
- **Wspólna pauza** (0.47): `pauseGame` i `resumeGame` to zwykłe akcje sieciowe (`RTS.NET_COMMANDS`), więc obie gry zatrzymują się i ruszają na tym samym kroku. Stan w silniku: `game.netPause = { by, left, resumeIn }` i `game.pausesLeft`; w czasie pauzy `tick` nie posuwa symulacji (czas bitwy stoi), liczy tylko zegary pauzy — też w krokach symulacji, więc identycznie u obu graczy; stan pauzy wchodzi do sumy kontrolnej. Limity: `RTS.NET_PAUSE = { count: 3, length: 60, resume: 3 }`. Tury i czat działają w czasie pauzy normalnie.
- **Handel zasobami** (0.49, `trade-rules.js`): akcja `trade(z, na, ilość)` jest na liście `RTS.NET_COMMANDS`, więc wymiana w bitwie sieciowej przechodzi przez lockstep jak każdy rozkaz.
- **Rewanż** (0.48): połączenie (`netLink` w `app.js`) żyje dłużej niż bitwa — po jej końcu zatrzymuje się tylko lockstep (`Lockstep.stop()` zdejmuje teraz swoje obie obsługi zdarzeń z połączenia), a zamyka je dopiero wyjście do menu. Wiadomości: `{ k: "rematch" }` (gracz chce rewanżu) i `{ k: "rematch-start", seed }` (gospodarz zaczyna; gość przyjmuje tylko nowe ziarno, resztę ustawień bierze z poprzedniej bitwy). Obsługa czatu i rewanżu jest podpinana raz na połączenie. W ukrytej karcie ekran końcowy pojawia się od razu (licznik strony w tle sprawdza koniec bitwy).
- **Wywiad taktyczny** w bitwie sieciowej (0.47): zamiast „Następny desant” (bitwa nie ma fal; wcześniej pokazywało „Infinity:NaN”) — opóźnienie sieci, pasek przekaźników, przeciwnik z frakcją i liczba pozostałych pauz.
- **Zapis** (0.47): bitwa sieciowa nigdy nie trafia do zapisu gry jednoosobowej — także po jej końcu lub zerwaniu połączenia (wcześniej opuszczenie strony po bitwie nadpisywało zapis).
- **Czat** (0.46.1): wiadomości `{ k: "chat", text }` idą tym samym kanałem danych poza lockstepem (nie wpływają na symulację). `NetPlay.chatText` zostawia jedną linię zwykłego tekstu (bez znaków sterujących, najwyżej 200 znaków), `NetPlay.sendChat` ogranicza wysyłanie do 5 wiadomości na 5 s. Tekst przeciwnika jest zawsze wstawiany przez `textContent`, nigdy jako HTML. Lobby (`netplay-menu.js`) przechowuje do 100 wiadomości i zachowuje niewysłany tekst przy odświeżaniu ekranu; bitwa (`app.js`) pokazuje do 6 ostatnich linii, a klawisze wpisywane w linię czatu nie trafiają do skrótów gry.

## Weryfikacja

- `tests/network.test.js` (9): wspólna pauza — nic się nie rusza, limit liczby i długości, odliczanie, wznowienie przez każdego gracza; pauza przez lockstep na tym samym kroku u obu; płynność — przy 60 klatkach na sekundę i opóźnieniu sieci 30–50 ms najwyżej jeden krok na klatkę, bez przestojów, obie strony identyczne na każdym kroku; symetryczny start, frakcje i kolory; osobne gospodarki, kolejki i mgła; odrzucanie złych rozkazów; **dwie kopie gry oglądane z różnych perspektyw, zasilane tymi samymi rozkazami (budowa, badania, produkcja, ataki), mają identyczne sumy kontrolne przez 4 minuty bitwy**; poddanie się i wynik obu stron; gra jednoosobowa bez zmian. `npm test` 246/246.
- `tests/network-browser.html` (nowy): dwie gry obok siebie łączą się przez kody, lobby (zasady gospodarza u gościa, start po gotowości), czat w lobby, bitwa z rozkazami obu stron — ten sam stan w tych samych chwilach (30/30 porównań), czat w bitwie (Enter otwiera, tekst z HTML dociera jako zwykły tekst, Esc zamyka bez menu pauzy), wywiad taktyczny bez „NaN”, wspólna pauza (Spacja u gościa zatrzymuje obie gry, wznowienie z panelu u gospodarza), poddanie się, rewanż (propozycja u gościa, nowa bitwa u obu z tym samym nowym ziarnem mapy, bez rozsynchronizowania; po wyjściu przeciwnika rewanż niemożliwy), rozłączenie, brak zapisu bitwy sieciowej. PASS, także w ukrytej karcie.
- `tests/menu-browser.html` 37/37, `tests/render-browser.html` i `tests/render-webgl-browser.html` PASS, `tests/development-browser.html` 68/68 (strona testowa wczytuje teraz pełny zestaw grafik; okno drzewa rozwoju przywraca pauzę od razu przy zamknięciu — w ukrytej karcie przeglądarka nie wysyła zdarzenia `close` okna dialogowego).

## Propozycje na kolejne kroki

- Krótkie **gotowe komunikaty** czatu (np. „Atakuję”, „Pomocy”) i znaczniki na minimapie.
- **Przejęcie przez komputer** strony gracza, który się rozłączył (zamiast końca bitwy), i **ponowne dołączenie** z zapisu stanu.
- **Więcej graczy**: 2 na 2 z sojusznikiem człowiekiem lub komputerem, tryby scenariuszy (przekaźniki, król wzgórza).
- **Widz** i **powtórka** bitwy (lista rozkazów + ziarno wystarczają, bo symulacja jest deterministyczna).
- **Serwer pośredniczący (TURN)** lub prosty serwer sygnalizacji dla sieci, w których połączenie bezpośrednie się nie udaje; krótsze kody (np. 6 znaków) przy takim serwerze.
