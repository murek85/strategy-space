# Języki i dostępność (I6)

Data: 2026-10-14, wersje 0.175 (języki) i 0.175.1 (dostępność). Krok I6 z [przeglądu i kierunków](KIERUNKI_2026_10.md).

## Dla gracza

- **Wybór języka:**
  - Ustawienia → Aplikacja i zapisy → „Język · Language”;
  - przycisk w stopce menu głównego („English” albo „Polski”).

  Gra uruchamia się ponownie w wybranym języku, a trwająca bitwa zapisuje się przy przeładowaniu.
- **Język domyślny:** przy pierwszym uruchomieniu gra wybiera język przeglądarki lub systemu (polski → polski, każdy inny → angielski). Wybór jest zapamiętany na urządzeniu (`pogranicze-lang-v1`).
- **Co jest przetłumaczone:**
  - menu, ustawienia, scenariusze i gra wieloosobowa;
  - interfejs bitwy, karty, dymki i komunikaty;
  - kampania (odprawy, sceny łączności, decyzje, epilogi i napisy filmów);
  - baza wiedzy, drzewo rozwoju, ekrany startowy i wczytywania;
  - etykiety na planszy 3D i minimapa.
- **Po polsku zostają** dziennik zmian i plany („Co nowego i plany”), z notką po angielsku, oraz to, co wpisują gracze: nazwy, czat.

## Jak to działa

Kod i jego teksty zostają po polsku. Na ekran trafia tłumaczenie robione „na wyjściu” (`i18n.js`, ładowany jako pierwszy skrypt):

- **Strona:** obserwator zmian (`MutationObserver`) tłumaczy każdy nowy i zmieniony tekst oraz atrybuty `title`, `aria-label`, `placeholder` i `alt`. Pomija pola edycji, `[data-i18n-skip]` (czaty, dziennik zmian, wybór języka) i `[contenteditable]`.
- **Płótno:** `fillText`, `strokeText` i `measureText` dostają tekst już przetłumaczony. Dotyczy to napisów filmów, etykiet planszy 3D (tekstury rysowane na płótnie) i minimapy. Pomiar zgadza się więc z tym, co zostanie narysowane.
- **Dopasowanie:**
  1. cały tekst według słownika;
  2. jeśli go nie ma, stałe fragmenty złożonego tekstu (części szablonu wokół liczb i nazw) zamieniane wewnątrz, najdłuższe najpierw i tylko całymi słowami (granica słowa tylko przy brzegu będącym literą);
  3. bez względu na wielkość liter, z zachowaniem wielkości oryginału (kod pisze np. „mapa ” + `size.toLowerCase()`);
  4. na koniec reguły dla słów za krótkich na fragment: „3 z 12” → „3 of 12” (`I18N_RULES`).

  Wyniki trafiają do pamięci podręcznej. Pomiar: nowy tekst ok. 0,05 ms, powtórzony ok. 0,0002 ms.
- **W wersji polskiej** płótno nie jest podmieniane, obserwatora nie ma, a `t()` zwraca tekst bez zmian.

## Słownik i jego utrzymanie

- **`lang/en.js`:** obiekt „polski fragment → angielski”, ponad 4,4 tys. wpisów, ok. 108 tys. znaków tekstu źródłowego. Wpisy są posortowane i można je poprawiać ręcznie.
- **`tools/i18n-extract.js`** (parser `acorn`, zależność deweloperska) wyciąga z kodu wszystkie teksty na ekran:
  - napisy i fragmenty szablonów, podzielone na znacznikach HTML tak jak na stronie;
  - atrybuty, także otwarte przez fragment (`aria-label="Podgląd planety ${…}`);
  - pierwszy człon długiego opisu (karta badania pokazuje `desc.split(/[.;]/)[0]`) i nazwę po „Nazwa: ” (doktryny bez przedrostka „Doktryna: ”).

  Pomija identyfikatory, klasy CSS, ścieżki, kolory, kod GLSL i typy MIME. Pojedyncze polskie słowa z małej litery („gotowy”, „wersja”) są wymienione w `WORDS`, bo bez listy nie da się ich odróżnić od kluczy.
- **`node tools/i18n-extract.js`** wypisuje fragmenty bez tłumaczenia. `--json plik` zapisuje je do pliku do tłumaczenia.
- **`tests/i18n.test.js`:**
  - każdy fragment z kodu ma tłumaczenie, więc nowy polski tekst bez angielskiego wywali test;
  - tłumaczenie zachowuje znaki na brzegach, przy których kod skleja tekst (dwukropek, nawias, myślnik, „·”);
  - działanie warstwy: cały tekst, fragmenty, granice słów, wielkość liter, wersja polska bez zmian;
  - kolejność skryptów i miejsca wyboru języka.

**Nowy tekst w grze:** `node tools/i18n-extract.js` wypisze go; tłumaczenie trzeba dopisać do `lang/en.js`. Gdy tekst jest składany z kawałków, każdy kawałek dostaje własny wpis.

## Tłumaczenie

Pierwsze tłumaczenie powstało maszynowo (modele językowe) w 9 częściach, ze wspólnym słowniczkiem nazw: jednostki, budynki, frakcje, miejsca, tryby, zasoby i klawisze. Przykłady: Galactic Frontier, Free Colonies, Dominion, Crystal Swarm, Abyss Wardens, Reclaimed Dawn. Rozbieżności między częściami ujednolicono, np. tytuły aktów i „beacon” dla latarni. Tekst wart jest przeczytania przez człowieka, zwłaszcza w kampanii, gdzie fragmenty sklejane z liczbami i nazwami mogą brzmieć sztywno.

Sprawdzone w przeglądarce, w trybie angielskim:
- **Bez polskich tekstów:** menu, wszystkie karty ustawień, kampania, scenariusze, baza wiedzy, gra wieloosobowa, ekran startowy i ekran wczytywania.
- **Bitwa:** HUD, karty z dymkami, cele, logistyka i kolejki.

Napisy filmów nie zostały obejrzane na ekranie, bo okno podglądu nie odtwarzało klatek. Sprawdzone jest tylko to, że rysowany tekst przechodzi przez tłumaczenie.

## Dostępność (0.175.1)

Ustawienia → Dostępność (`accessibility.js`, ładowany zaraz po tłumaczeniu, przed silnikiem). Wszystko zostaje na urządzeniu (`pogranicze-access-v1`) i dotyczy tylko widoku i wejścia: nic nie trafia do stanu gry ani do sumy kontrolnej gry sieciowej, więc każdy gracz może mieć swoje ustawienia.

**Własne klawisze:**
- **Zakres:** 37 akcji w grupach Produkcja, Budowa, Badania, Rozkazy, Kamera i Gra.
- **Zmiana:** kliknięcie klawisza akcji, potem nowy klawisz (Esc anuluje). Zajęty klawisz zamienia się miejscami z poprzednią akcją. Nie da się przypisać Esc, Enter, Tab, F2, F11, F12, cyfr (grupy 1–9) ani modyfikatorów.
- **Działanie:** kod gry zostaje przy domyślnych klawiszach. Nasłuchiwacz w fazie przechwytywania (`keydown`/`keyup` na `window`) podmienia `e.key` naciśniętego klawisza na domyślny klawisz akcji (`Object.defineProperty` na zdarzeniu), a domyślny klawisz oddany innej akcji daje `Unidentified`. Przytrzymywane klawisze kamery działają tak samo.
- **Kombinacje:** z Shift idą za klawiszem (Shift+P patrol, Shift+S utrzymanie pozycji, Shift+Q umiejętność). Skróty z Ctrl i pola tekstowe są pomijane.
- **Podpisy:** `<kbd>` na kartach i zapisy w nawiasach („[M]”) w tekstach i podpowiedziach pokazują przypisany klawisz. Każdy tekst jest przepisywany raz (`relabelled`). Pierwsza wersja przy zamianie Q↔Z przepisywała „[Z]” na „[Q]” i z powrotem bez końca, aż strona się zawiesiła.

**Skala interfejsu (80–150%):**
- CSS `zoom` (`--ui-scale`) na panelu bocznym, ramie menu (marka, układ, stopka) i raportach (`#overlay > .briefing`).
- Górny pasek i pasek poleceń biorą `--ui-scale-bar`, czyli skalę ograniczoną do szerokości okna (ich treść potrzebuje ok. 960 px przy 100%). Wysokość planszy liczy się ze skalą pasków (`hud-compact.css`).
- Plansza, dymki przy kursorze i minimapa zostają bez skali, żeby kliknięcia trafiały.

**Paleta dla daltonistów:**
- `colorFor(team)` (`advanced-rules.js`) pyta najpierw `Access.teamColor(game, team)`, czyli kolory według relacji z zestawu Okabe-Ito: Ty `#56b4e9`, sojusznicy `#3fc59a`, przeciwnicy `#e69f00`, `#f0e442`, `#d55e00`, `#ff9fd0`, strona neutralna `#cc79a7`. Bez czerwieni i jasnej zieleni, które daltoniści mylą najczęściej.
- Kolor zapisany w jednostkach i budynkach (`tint`) przy każdej nowej i wczytanej bitwie oraz przy zmianie palety odświeża `repaint()` w `app.js` (`Access.retint`).
- Legenda mapy ma kolory w klasie `.palette-cvd`.

**Testy:** `tests/accessibility.test.js`:
- przypisanie, wyciszenie oddanego klawisza, Shift, Ctrl, pola tekstowe i zamiana;
- każda akcja ma klawisz obsługiwany przez grę;
- kolory palety i ich powrót po wyłączeniu, odświeżenie kolorów jednostek;
- kolejność skryptów i sekcja ustawień.

**Sprawdzone w przeglądarce:**
- karta Dostępność i lista klawiszy;
- zamiana Q↔Z prawdziwymi klawiszami: Z zleca piechotę, Q już nie, a karta pokazuje Z;
- paleta w bitwie (Twoja strona błękitna, wróg pomarańczowy);
- skala 120% w oknie 1024×768: paski mieszczą się, a plansza i pasek poleceń kończą się na dole okna.

### Poprawki 0.175.2

- **Skala z potwierdzeniem.** Suwak tylko pokazuje wartość. „Zastosuj” wprowadza skalę, a potem pyta „Zachować skalę X%? (15 s)” z przyciskami „Zachowaj” i „Cofnij”. Bez odpowiedzi skala wraca do poprzedniej, więc za duża skala nie odetnie dostępu do przycisków. Odliczanie przeżywa przerysowanie ustawień (`scalePending` poza `mount`). Zmiana w trakcie przesuwania suwaka była niewygodna, bo interfejs uciekał spod kursora.
- **Zmiana silnika grafiki w bitwie** (`switchRenderer` w `app.js`, wywoływane przez menu: `api.rendererChanged`):
  - Plansza przebudowuje się od razu po wyborze w ustawieniach, za ekranem wczytywania „Zmiana silnika grafiki” (nazwa silnika i świat misji). Ekran znika po pierwszej klatce nowego silnika.
  - Wcześniej silnik zmieniał się przy pierwszej klatce po powrocie na mapę, a budowa świata 3D i kompilacja shaderów zamrażały stronę bez słowa wyjaśnienia. Pomiar: blokada ok. 1 s trwa teraz w czasie ekranu wczytywania, a powrót na mapę nie ma żadnej.
- **Stary silnik idzie pierwszy** (`applyRenderer`): niszczony przed zbudowaniem nowego, a na ten czas planszę rysuje Canvas 2D. Wcześniej przez chwilę oba silniki trzymały kontekst i pamięć karty graficznej.

### Pauza, której nie da się przeoczyć (0.175.3)

Utrata fokusu włączała pauzę i krótki komunikat, który znikał po 4 s. Kto wrócił do okna później, widział stojącą planszę i ikonę ▶ na górnym pasku. Nie wiedział, co się stało ani dlaczego.

- **Pasek pauzy** (`updatePauseBar` w `app.js`, odświeżany z HUD) stoi nad planszą przez całą pauzę bitwy z komputerem. Zawiera:
  - przyczynę: „Gra wstrzymana, bo okno straciło fokus” albo „Wstrzymana przez Ciebie — możesz wydawać rozkazy”;
  - czas bitwy w chwili pauzy i długość pauzy (T+2:14 · pauza trwa 35 s);
  - przycisk „Wznów (Spacja)”.

  `togglePause(reason)` zapamiętuje przyczynę (`pauseInfo`). Komunikat pojawia się już tylko przy wznowieniu („Operacja wznowiona.”).
- **Przyciemnienie planszy** (`.battlefield.battle-paused::after`) nie przechwytuje kliknięć, więc w pauzie można wydawać rozkazy.
- **Powrót fokusu** po pauzie z tego powodu daje jedno mignięcie paska. Gra nie wznawia się sama.
- **Ustawienia w Dostępności:**
  - „Wstrzymuj grę, gdy okno traci fokus” (`Access.autoPause`, domyślnie tak);
  - „Dłuższe wyświetlanie komunikatów (×2)” (`Access.toastFactor`).
- **Gra sieciowa bez zmian:** fokus jej nie wstrzymuje, a wspólna pauza ma swój panel.
