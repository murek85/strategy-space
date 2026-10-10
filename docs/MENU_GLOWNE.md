# Koncepcja menu głównego — pokład dowodzenia

> **Dokument historyczny (stan 0.16, 2026-09-26).** Pierwszy zakres wdrożono w 0.5. Później doszły: pięć slotów zapisu i autozapis (0.9), wybór scenariusza z konfiguracją frakcji, trudności i 2–4 uczestników (0.12–0.13), kampania z prologiem (0.13–0.14), szkolenie (etap A), rozbudowana baza wiedzy (0.14) i mikser dźwięku (0.16). Multiplayer, edytor map i powtórki pozostają propozycjami. Opis poniżej, w tym „jeden zapis lokalny”, odpowiada stanowi 0.4.

Data: 2026-09-21. Punkt wyjścia: prototyp 0.4.
Status: pierwszy zakres wdrożony w 0.5 (2026-09-21). Na życzenie użytkownika pozycja Nowa operacja od razu nosi nazwę Gra jednoosobowa. Poniższa koncepcja zachowuje pierwotne nazewnictwo; kampania, multiplayer i pozostałe rozszerzenia nadal są propozycjami.

## Miejsce licznika FPS (wersja 0.171.19, 2026-10-10)

- `#fps-meter` powstaje w `setupSidebar` (`app.js`) jako pierwszy element paska `.map-tools`, więc stoi w jednym rzędzie z przyciskami „−”, „⌖”, „+” (wysokość 30 px, odstęp 6 px) zamiast nad nimi; bez paska trafia do `body`. `#render-meter` ma `top: 106px`, pod paskiem (`expansion.css`).

## Licznik FPS i cienie chmur (wersja 0.171.18, 2026-10-10)

- **Licznik FPS** (`SceneFX.options.fps`, pole „Licznik FPS (klatki na sekundę)” obok czasu renderowania): `app.js` liczy klatki pętli gry i co 0,5 s wpisuje wynik do `#fps-meter` w prawym górnym rogu (zielony ≥ 55, bursztynowy ≥ 30, czerwony poniżej; styl w `expansion.css`). Działa przy każdym rendererze, widać go nad planszą (w menu jest ukryty). Gdy włączony jest też czas renderowania, ten przesuwa się pod licznik FPS.
- **Cienie chmur 3D** (`SceneFX.options.clouds`, wśród efektów 3D): `three-renderer.js` (`applyQuality` → `quality.clouds`) wyłącza nimi przesuwające się cienie chmur na planszy; dotąd sprawdzało nieustawiane nigdzie `options.cloudShadows`. Jak inne efekty tylko dla 3D, pole jest wyszarzone przy innym rendererze. „Cienie od słońca” (`shadows`) bez zmian.

## Poprawki interfejsu z przeglądu gry (wersja 0.171.13, 2026-10-10)

- **Klawisze** (`app.js`): przy otwartych statystykach armii albo oknie potwierdzenia klawisze należą do okna (Esc je zamyka; dotąd otwierał pod nim menu pauzy). M w menu nie wycisza dźwięku, gdy fokus jest w polu tekstowym albo liście (pola kodów gry sieciowej). Spacja i Enter na przycisku HUD-u naciskają go. Usunięty podwójny i martwy kod Esc. (Decyzja fabularna blokuje wznowienie od 0.171.10.)
- **Populacja** (`app.js`, `engine.js`): HUD, cel „armia” i blokada produkcji liczą armię gracza, który patrzy (`game.viewer`), nie drużyny 0; limit w jednej stałej `RTS.POP_CAP` (60).
- **Import zapisów** (`menu.js`, `app.js`): po udanym imporcie `api.holdSaves()` wstrzymuje zapis do przeładowania — wcześniej opuszczenie strony zapisywało trwającą bitwę na zaimportowany autozapis.
- **Panel gospodarki** (`economy-panel.js`): przycisk z fokusem odnajdywany po wszystkich polach `data-*` (handel, ilość), więc fokus nie spada na stronę przy każdym odświeżeniu.
- **Okna potwierdzenia** (`game-dialog.js`): zamknięcie zastąpionego okna nie kasuje informacji o nowym (`GameDialog.isOpen()`).
- **Wąskie okna** (`hud-compact.css`): progi 1180 px (panel oddziału 240 px, boczny 230 px) i 850 px (panel 170 px) — reguły kompaktowego HUD-u miały wyższą specyficzność niż te w `style.css` i nie miały progów.
- **Mniej pracy na klatkę:** panel oddziału przebudowywany tylko przy zmianie danych (był ok. 8 razy na sekundę, także ukryty); licznik rysowania zapamiętany i zapisywany tylko, gdy widać; tło menu sprawdza widoczność dwa razy na sekundę; kursor szuka otwartych okien tylko po zmianie w drzewie dokumentu.
- **Dźwięk:** nasłuch odblokowania dźwięku znika po pierwszym udanym odblokowaniu; muzyka wraca po powrocie do okna (fokus, widoczna karta), bez czekania na kliknięcie.
- **Wersja gry:** stała `GAME_VERSION` w `menu.js` dla stopki i eksportu zapisów (stopka miała martwe „0.16” nadpisywane ręcznie wpisaną wersją); `tests/version.test.js` sprawdza zgodność z `package.json`.

## Intro kampanii raz, potem z przycisku (wersja 0.168.5, 2026-10-09)

- Intro kampanii (film „Odzyskany Świt”, 30 s) odtwarza się tylko przy pierwszym wejściu w „Kampania: Odzyskany Świt”; potem przycisk prowadzi od razu do mapy kampanii. Obejrzenie zapamiętuje urządzenie (`localStorage`, klucz `pogranicze-intro-v1`, jak sceny łączności) — przenosi je też eksport i import zapisów.
- Pod nagłówkiem „Akt I · Odzyskany Świt” jest przycisk **Intro kampanii**, tak jak przyciski prologów aktów II–IV — odtwarza intro w każdej chwili („Pomiń intro” wraca do kampanii).
- Test: `tests/menu-browser.html` — pierwsze wejście otwiera intro, drugie od razu kampanię, przycisk przy akcie I odtwarza intro (39/39).
- 0.168.6: w akcie I „Szkolenie · Próba kolonii” stoi zaraz po przycisku intro, przed rozdziałami I–III (dotąd lista sortowała się po identyfikatorach i szkolenie było na końcu aktu).

## Cel i klimat

Menu ma przypominać terminal na mostku okrętu: po lewej polecenia dowódcy, po prawej duży widok planety Khepri IV z dyskretną siatką orbitalną. Granatowe tło, jasna typografia i miętowe akcenty nawiązują do obecnego interfejsu. Bursztyn wyróżnia informacje, czerwień tylko błędy i zagrożenia.

Tło może być proceduralną ilustracją 2D z powolnym ruchem gwiazd i orbity. Nie wymaga modeli 3D. Tekst ma stały, spokojny podkład; dekoracje nie utrudniają czytania. Opcja ograniczenia animacji zatrzymuje ruch. Delikatne potwierdzenia przycisków korzystają z istniejącego audio; muzyka ambientowa pozostaje oddzielną propozycją. Przed pierwszą interakcją ekran działa bez dźwięku.

## Układ pierwszej wersji

| Obszar | Zawartość |
|---|---|
| Lewy górny róg | Logo i nazwa Pogranicze Galaktyki |
| Lewa kolumna | Kontynuuj, Nowa operacja, Baza wiedzy, Ustawienia |
| Główna ilustracja | Planeta, orbity, subtelne światła floty |
| Panel po prawej | Ostatnia operacja: nazwa, czas bitwy, data zapisu i przycisk wznowienia; bez zapisu — odprawa misji Khepri IV |
| Stopka | Wersja prototypu, Co nowego, informacja „Zapis lokalny”, szybkie wyciszenie |

Dominujący przycisk to Kontynuuj, jeśli istnieje poprawny zapis; w przeciwnym razie Nowa operacja. Nie pokazujemy podwójnie tego samego dużego wezwania do działania: panel misji może być informacyjny, gdy Kontynuuj jest już wyróżnione w kolumnie.

W wersji przeglądarkowej nie dodajemy przycisku Wyjdź, który nie potrafi niezawodnie zamknąć karty. W przyszłej aplikacji desktopowej można dodać Wyjdź do systemu.

## Zachowanie pozycji menu

### Kontynuuj

Wczytuje ostatnią bitwę i otwiera ją w pauzie z wyraźnym przyciskiem Wznów. Obecnie gra ma jeden zapis lokalny, więc menu nie sugeruje wielu slotów. Przy braku zapisu pozycja jest ukryta. Przy uszkodzonym lub niezgodnym zapisie pokazujemy komunikat i możliwość rozpoczęcia nowej operacji, bez automatycznego kasowania danych.

Docelowo obok Kontynuuj pojawi się Wczytaj grę z listą zapisów, miniaturą mapy, datą, frakcją i trybem. Wymaga to najpierw wdrożenia wielu slotów i metadanych.

### Nowa operacja

Otwiera krótką odprawę: mapa Khepri IV, siły Wolnych Kolonii, cel zniszczenia wrogiego centrum, podstawy sterowania i Rozpocznij. Obecny przeciwnik działa falami; opis nie obiecuje symetrycznej potyczki ekonomicznej.

Pierwsza wersja nie potrzebuje wyboru mapy, frakcji ani trudności, dopóki nie ma rzeczywistych wariantów. Jeśli istnieje zapis, dopiero końcowy przycisk rozpoczęcia pokazuje potwierdzenie jego zastąpienia. Samo przeglądanie odprawy niczego nie usuwa.

Docelowo ekran staje się konfiguracją potyczki: mapa → frakcja i przeciwnicy → zasady → podsumowanie → start. Tryby lądowe i kosmiczne pojawiają się dopiero wraz z odpowiednimi mechanikami. Ustawienia surowców mogą obejmować startowy metal, gaz i rozłożenie złóż, ale wyłącznie w scenariuszach obsługujących te zasoby. Poziom trudności zależy od przyszłych prac nad AI.

### Baza wiedzy

Na początek: sterowanie, cel bitwy, jednostki, budynki, ruda i metal, przekaźniki, badania oraz zapisy. Karty zawierają krótki opis roli, koszt, wymagania i skróty klawiszowe.

W przyszłości: gaz, kryształy, energia, magazyny, drzewo technologii, frakcje i kontry jednostek. Karty technologii opisują wymagania; badania i zakup wojska odbywają się podczas bitwy. Osobny trwały rozwój armii poza bitwą miałby sens dopiero po zaprojektowaniu kampanii.

### Ustawienia

Pierwszy zakres: obecna głośność efektów i wyciszenie, ograniczenie animacji menu oraz podgląd sterowania. Preferencje zapisujemy od razu, niezależnie od stanu bitwy. Ograniczenie animacji jest nową proponowaną opcją; nie istnieje jeszcze w prototypie.

Przyszłe sekcje dodawane wraz z funkcjami: osobna głośność muzyki i głosów; skala interfejsu i kontrast; szybkość kamery i przypisanie klawiszy; opcje grafiki dla wersji 3D. Nie wyświetlamy suwaków sterujących nieistniejącymi funkcjami.

## Rozbudowa bez przepełnienia ekranu

| Przyszła funkcja | Miejsce w nawigacji | Warunek wprowadzenia |
|---|---|---|
| Kilka misji i map | Nowa operacja → wybór scenariusza | Co najmniej dwa grywalne warianty |
| Pełna potyczka | Gra jednoosobowa → Potyczka | Konfiguracja zasad i odpowiedni przeciwnik |
| Samouczek | Gra jednoosobowa → Szkolenie | Interaktywne zadania; baza wiedzy nie jest samouczkiem |
| Kampania i mapa galaktyki | Gra jednoosobowa → Kampania | Trwały postęp oraz model operacji |
| Bitwy kosmiczne | Wybór scenariusza lub część kampanii | Osobna grywalna mechanika |
| Multiplayer | Osobna pozycja Gra sieciowa | Sieć, lobby i synchronizacja |
| Edytor map | Dodatki → Edytor | Bezpieczny zapis, odczyt i walidacja map |
| Powtórki | Dodatki → Powtórki | System rejestracji i odtwarzania |

Po dodaniu kilku trybów Nowa operacja zmienia się w Gra jednoosobowa. Kontynuuj pozostaje na najwyższym poziomie. Nie zapełniamy pierwszego menu nieaktywnymi przyciskami Kampania, Multiplayer i Edytor. Plany można opisać na stronie Co nowego i plany, z jednoznacznym statusem propozycji i bez terminów.

## Powrót z bitwy

Esc otwiera menu pauzy: Wznów, Zapisz, Ustawienia, Menu główne. Jeśli trwa ustawianie budynku lub tryb rozkazu, pierwsze Esc anuluje tę czynność, kolejne otwiera menu. W tle symulacja i odgłosy walki są zatrzymane.

Powrót do menu najpierw próbuje zapisać bitwę. Po błędzie pamięci lokalnej pozostajemy w pauzie i dajemy wybór: wróć do gry albo opuść bez zapisu. Potwierdzenie jest potrzebne przy faktycznym ryzyku utraty postępu, nie przy każdej nawigacji.

## Założenia techniczne przyszłej implementacji

- Oddzielne stany widoku: menu główne, odprawa, gra, pauza, wynik. Ustawienia i baza wiedzy pamiętają ekran, z którego je otwarto.
- Jedna pętla aplikacji; symulacja bitwy działa wyłącznie w aktywnej grze. Wielokrotne przechodzenie przez menu nie tworzy kolejnych pętli ani nasłuchów klawiatury.
- Menu powstaje w HTML/CSS, pole bitwy pozostaje w Canvas. Animacja dekoracji nie uruchamia silnika RTS.
- Wspólne ustawienia audio wykorzystują istniejący moduł i klucz preferencji. Wejście do menu wycisza źródła bitewne, ale pozwala na potwierdzenia przycisków.
- Dane katalogowe jednostek, budynków i badań powinny zasilać zarówno grę, jak i bazę wiedzy, aby koszty nie rozchodziły się po zmianach balansu.
- Odczyt i walidacja zapisu są oddzielone od rozpoczęcia symulacji; menu nie nadpisuje zapisu tylko dlatego, że zostało otwarte.
- Obsługa klawiatury: Tab, Enter, Esc, widoczny fokus i powrót fokusu po zamknięciu panelu. Skróty bitewne nie działają podczas poruszania się po menu.
- Na węższym oknie układ przechodzi do jednej kolumny, dekoracja jest przycinana, a treść może się przewijać. Sam prototyp nadal zakłada mysz i klawiaturę.

## Proponowany pierwszy zakres i odbiór

Najpierw wdrożyć ekran główny, Kontynuuj, odprawę Nowej operacji, ustawienia audio, krótką bazę wiedzy i powrót z pauzy. Zachować obecną pojedynczą mapę oraz format zapisu; nie łączyć tego zakresu z przebudową AI czy gospodarki.

Kryteria odbioru:

1. Nowy gracz przechodzi z menu przez odprawę do działającej bitwy.
2. Poprawny zapis można kontynuować bez zmiany jednostek, surowców, rozkazów i czasu gry.
3. Otwieranie i zamykanie odprawy nie usuwa zapisu; zastąpienie następuje dopiero po potwierdzeniu startu.
4. Uszkodzony zapis i niedostępna pamięć lokalna nie blokują menu ani rozpoczęcia rozgrywki.
5. Powrót do menu i wznowienie nie przyspieszają symulacji, nie dublują audio i nie naliczają zasobów podczas pobytu w menu.
6. Głośność jest wspólna dla menu i bitwy oraz zachowuje się po odświeżeniu.
7. Wszystkie aktywne opcje działają; przyszłe funkcje są opisane jako plany, bez pozornie działających przycisków.
8. Menu można obsłużyć klawiaturą, a przy mniejszym oknie główne przyciski pozostają dostępne.

Powiązane dokumenty: [Plan rozwoju](PLAN_ROZWOJU.md), [Pomysły](POMYSLY.md), [Gospodarka i rozwój](GOSPODARKA_I_ROZWOJ.md).
