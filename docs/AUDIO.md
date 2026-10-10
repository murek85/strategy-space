# Dźwięk i muzyka

## Wersja 0.171.14 — poprawki z przeglądu gry (2026-10-10)

- **Mowa radiowa** (`audio-radio.js`): `speak()` planowało od razu wszystkie sylaby (do 69 źródeł na linię), a każde liczyło się do limitu efektów (40) — przez ok. 4 s gasły strzały, wybuchy i kliknięcia, a druga linia była odrzucana. Źródła linii są teraz osobno (`speechNodes`, `effectVoices()` = głosy bez muzyki i mowy). Nowa linia wycisza poprzednią w 0,1 s i zaczyna się zaraz po niej.
- **Głosy Vok i Bramy:** Vok — niski, twardy głos z przerywanym kanałem Admiralicji; Brama — powolny, szklisty (obie mówiły głosem Liry). Każde ma własny motyw.
- **Zmiana motywu:** nuty grającego utworu idą przez jego szynę (`musicBus`), która przy zmianie wycisza się w 0,25 s, a nuty kończą się po niej (dotąd `stop()` od razu — cięcie z trzaskiem przy każdym `menu.show()`, pauzie i końcu sceny).
- **Wyjście z okna:** `suspend()` wstrzymuje kontekst dźwięku (blur, ukryta karta), a powrót (`focus`, widoczna karta) go wznawia. Filmy z menu i epilogi mają zegar, który idzie tylko przy oknie na wierzchu (`menu.js` `playIntro`, `app.js` epilogi), więc muzyka i ujęcia zostają razem. Dotąd `silence()` zatrzymywało muzykę, a wracała ona od początku dopiero przy kliknięciu.
- **Pauza:** motywy bitew pamiętają krok (`musicBeats`) i po menu pauzy grają dalej; filmy i menu zaczynają od początku, nowa bitwa też.
- **Powtórka epilogu:** `restartMusic("intro")` — tryb się nie zmieniał i powtórka była cicha.
- **Muzyka bitewna** wchodzi w następnym takcie (nastrój zmieniał się co dwa takty: do 12 s opóźnienia przy 48 uderzeniach na minutę).
- **Bas:** nuty poniżej ok. 38 Hz idą oktawę wyżej, a niższe głosy organów, burdonu i uderzenia blachy grają tylko nad 38 Hz (do 45% poziomu niektórych motywów leżało poniżej 30 Hz — niesłyszalne w głośnikach, a obciążało ogranicznik).
- **Szczyty:** po kompresorze łagodne obcięcie (tanh, nadpróbkowanie 2×).
- **Szum efektów:** jeden bufor, powiększany w razie potrzeby (był tworzony i wypełniany przy każdym strzale i wybuchu).
- **Jakość wysoka (Tone.js):** smyczki 12 głosów, dzwony 10 (zabierały wybrzmienia).
- **Jakość „klasyczna”:** efekty nie trafiają już do pogłosu, muzyka nie wysyła do pogłosu muzyki, a cztery pętle otoczenia poza bitwą wyciszają się i zatrzymują (działały bez przerwy z zerową głośnością).

Testy (`tests/audio.test.js`, sztuczny kontekst Web Audio): mowa nie zajmuje głosów efektów, nowa linia ucina poprzednią, Vok i Brama mają głosy i motywy, motyw bitwy wraca w tym samym miejscu po menu, restart od początku, brak nut poniżej 38 Hz, jeden bufor szumu. Zostaje: różnica głośności między motywami (do 19 dB) — do wyrównania na słuch.

## Wersja 0.171.9 — przejścia w muzyce prologów (2026-10-10)

`storyStep` (prologi aktów II–IV): gdy po części głośnej (bitwa, zagrożenie, misja) zaczyna się spokojna, w jej pierwszym takcie gra cichnący burdon i jeden długi dźwięk smyczków — dotąd muzyka urywała się z bębnów do samotnego fortepianu (np. akt III, 37 s: suma głośności 0,22 → 0,05, teraz 0,22 → 0,08). W ostatnim takcie przed częścią głośniejszą albo tytułem narastają smyczki. Test sprawdza burdon na początku spokojnej części (akt III, 37 s). Usunięty skrót `intro:20` (20-sekundowa wersja otwarcia), którego od 0.171 nic nie używało. Muzyka sprawdzona liczbowo (głośność nut w każdej sekundzie), bez odsłuchu.

## Wersja 0.171 — muzyka prologów aktów II–IV (2026-10-09)

Każdy z nowych prologów aktów II–IV trwa 76 s i ma własną partyturę w stylu „Interstellar” (`audio.js`, `storyStep`, tryby `prologue2`, `prologue3`, `prologue4`; plany w `STORIES`: tonika, części w sekundach na ujęciach filmu z nastrojem, koniec — test pilnuje zgodności z `Act2Film.lengths`, `Act3Film.lengths` i `Act4Film.lengths`). Krok to ósemka przy 120 na minutę (0,5 s), takt — 4 s. Wcześniej prologi grały skrócone otwarcie `intro:20`, które zostało w kodzie.

Nastroje:

| Nastrój | Muzyka |
|---|---|
| nadzieja | tonacja dur, arpeggio fortepianu, smyczki, cichy zegar co ćwierćnutę |
| tajemnica | moll, wysokie dzwonki jak sygnał (trzy uderzenia i pauza), burdon |
| cisza | samotna, powolna melodia fortepianu i cichy chór, smyczki od czwartej sekundy, bez zegara |
| zagrożenie | burdon, bicie serca, uderzenie blachy na początku części, zegar co ósemkę |
| bitwa | uderzenia blachy na takt, bębny wojenne, krótkie akcenty smyczków |
| misja | obracająca się figura organów; w drugiej połowie dzwony i bębny, chór |
| tytuł | wielki akord (organy, smyczki, chór, śpiew, uderzenie blachy i bęben), cisza 4 s przed końcem, jeden jasny dźwięk fortepianu |

| Prolog | Tonika | Części (s) |
|---|---|---|
| akt II · Cena świtu | E | 0 nadzieja (po świcie) · 9 tajemnica (sygnał) · 18 cisza (Lira i zaginiona ekipa) · 28 zagrożenie (wydmy Khepri) · 38 tajemnica (pod piaskiem) · 47 bitwa (Hefajstos) · 57 misja (szlak przez lód) · 66 tytuł |
| akt III · Przebudzenie Roju | Cis | 0 bitwa (upadek Hefajstosa) · 9 tajemnica (rytm artefaktów) · 18 cisza (żywy kryształ) · 28 zagrożenie (mapa Roju) · 37 cisza (wezwanie Varna) · 47 misja (Nivalis) · 56 bitwa (Serce Roju) · 66 tytuł |
| akt IV · Inwazja | F | 0 nadzieja (rozejm) · 9 zagrożenie (Admiralicja) · 18 bitwa (blokada Eos) · 28 tajemnica (sygnał artefaktu) · 37 zagrożenie (szczeliny) · 47 bitwa (Wartownicy) · 56 tajemnica (Brama) · 66 tytuł |

W odsłuchu muzyki (Ustawienia) są nowe motywy „Prolog aktu II/III/IV”, bez wyboru nastroju; partytura w odsłuchu się zapętla.

## Wersja 0.170 — muzyka nowego finału kampanii (2026-10-09)

Film finału trwa 122 s (`campaign-finale.js`); jego muzyka w stylu „Interstellar” opowiada, co stało się po wojnie (`audio.js`, `finaleStep`, tryb `finale`; części `FINALE` w sekundach na ujęciach filmu — test pilnuje zgodności z `FinaleFilm.lengths`):

| Czas | Ujęcia | Muzyka |
|---|---|---|
| 0–10 s | Brama gaśnie | burdon i śpiew, zegar pędzi, uderzenie blachy i bęben w chwili pęknięcia (6 s), potem zegar milknie |
| 10–19 s | szczeliny | eteryczny chór, dzwon na każdą ćwierćnutę opadający w dół — szczeliny zamykają się jedna po drugiej, bez zegara |
| 19–38 s | powrót z Erebusa, Eos | figura organów, z a-moll przechodzi w C-dur; smyczki, nad Eos chór |
| 38–47 s | latarnia | pierwsza kulminacja: pełne organy, figura z dzwonami, zegar co ósemkę; akord dzwonów i miękkie uderzenie, gdy lampa się zapala |
| 47–66 s | Hefajstos, Serce Roju | refleksja: samotna melodia fortepianu, potem niski burdon i wysokie, chłodne dźwięki |
| 66–75 s | rada rozejmu | cichy, dostojny chorał blachy |
| 75–103 s | sieć, ludzie, dziennik | figura organów i dzwony łączące światy; ciepła melodia fortepianu w C-dur z chórem; zegar i organy przy dzienniku |
| 103–122 s | szlaki, koniec | narastanie z dzwonami i bębnami, wielki akord C-dur (organy, smyczki, chór, uderzenie), nagła cisza (118 s), jeden jasny dźwięk fortepianu (119 s) |

## Wersja 0.169 — muzyka nowego prologu kampanii (2026-10-09)

Prolog kampanii trwa 150 s (`campaign-film.js`) i ma własną partyturę w stylu „Interstellar”, która opowiada tę samą historię (`audio.js`, `prologueStep`, tryb `prologue`; części `PROLOGUE` w sekundach na ujęciach filmu — test pilnuje zgodności z `CampaignFilm.lengths`):

| Czas | Ujęcia | Muzyka |
|---|---|---|
| 0–38 s | pogranicze, osadnicy, sieć, szlaki | D-dur z nadzieją: arpeggio fortepianu, smyczki, dzwonki przy zapalaniu latarni, cichy zegar |
| 38–58 s | Dominium, blokada | d-moll: burdon, bicie serca; potem uderzenia blachy na takt, bębny wojenne, smyczki |
| 58–68 s | ciemność | prawie nic: burdon, zegar co takt, pojedyncze niskie dźwięki fortepianu, jęk metalu |
| 68–78 s | ultimatum | ostre akordy blachy, niski bęben, zegar co ósemkę |
| 78–99 s | Stacja Ciszy, transmisja | samotna melodia fortepianu Liry w d-moll, cichy chór, od transmisji smyczki |
| 99–140 s | flota, blokada, zejście, lądowanie | obracająca się figura organów (d – B – F – C): narasta z dzwonami, chórem i bębnami, w zejściu pełne organy i uderzenie blachy, przy lądowaniu wycisza się do fortepianu |
| 140–150 s | tytuł aktu I | wielki akord D-dur (organy, smyczki, chór), nagła cisza, jeden jasny dźwięk fortepianu |

Dawne 30-sekundowe intro (`intro`) zostaje pod scenami łączności i epilogami, a 20-sekundowe (`intro:20`) pod prologami aktów II–IV. W odsłuchu: „Prolog kampanii — historia pogranicza”.

## Wersja 0.168.4 — nowa muzyka intro (2026-10-09)

Dawne 30-sekundowe intro („burza”: burdon, uderzenia, bębny, zawodzący głos) zastąpiło otwarcie w stylu finału — także „Interstellar”, ale o innym nastroju: wyruszenie w nieznane zamiast zwycięstwa, d-moll, zakończenie pytaniem (`audio.js`, `introStep`). Dwie długości dopasowane do filmów: `intro` — 30 s (prolog aktu I, sceny łączności, epilogi), `intro:20` — 20 s (prologi aktów II–IV). Części według udziału w długości:

| Część | Co gra |
|---|---|
| pierwsza trzecia | niski pedał organów i burdon, wolne tykanie zegara (ćwierćnuty), dwudźwiękowe wezwanie fortepianu z echem |
| druga trzecia | obracająca się figura organów co ósemkę nad d-moll – B – F – C, smyczki, zegar co ósemkę |
| do 90% | narastanie: chór i śpiew, pełne organy, figura podwojona dzwonami, zbierające się bębny, jedno uderzenie blachy |
| koniec | nagła cisza i jeden wysoki, nierozwiązany dźwięk fortepianu (sekunda nad toniką) z echem — przed końcem filmu |

W odsłuchu: „Intro — wyruszenie”. Test: obie długości, części w swoich sekundach, cisza i jeden dźwięk na końcu, nic po filmie.

## Wersja 0.168.3 — muzyka finału kampanii (2026-10-09)

Pod filmem finału (40 s, `campaign-finale.js`) grała dotąd burzowa muzyka intro. Teraz ma własny motyw zwycięstwa w stylu „Interstellar” — tymi samymi środkami, bez cytowania melodii (`audio.js`, `finaleStep`; tryb muzyki `finale`). Krok to ósemka przy 120 na minutę (0,5 s), takt — 4 s, dwa takty na ujęcie filmu:

| Czas | Co gra |
|---|---|
| 0–10 s | tykanie zegara, pedał organów, pojedyncze dźwięki fortepianu z echem |
| 10–20 s | obracająca się figura organów (arpeggio co ósemkę) nad a-moll – F – C – G, wchodzą smyczki |
| 20–30 s | narastanie: chór, pełne akordy organów, figura podwojona oktawę wyżej, bębny coraz głośniej, zegar co ósemkę |
| 30–35 s | zwycięstwo w C-dur: pełne organy, uderzenie blachy, wysoki chór i śpiew |
| 35–40 s | nagła cisza, potem jeden dźwięk fortepianu i cichy akord A-dur pod napisem „Koniec kampanii”; po filmie cisza |

- Ekran `finale` w menu włącza ten motyw (dotąd `intro`); w ustawieniach jest w odsłuchu jako „Finał kampanii — zwycięstwo”.
- Test (`tests/audio.test.js`): czas trwania, kolejne warstwy w swoich sekundach, uderzenie i C-dur w kulminacji, cisza przed ostatnim dźwiękiem fortepianu i po filmie.

## Wersja 0.168 — muzyka pozostałych map (2026-10-09)

Mapy, które grały tylko ogólny motyw biomu (wspólny z innymi), dostały własne:

| Motyw | Mapy | Charakter |
|---|---|---|
| Wydmy (`game:dunes`) | Cichy Horyzont | podwójna skala harmoniczna nad burdonem, zawodzący głos nad morzem wydm, piasek na wietrze; **pomruk** — co osiem taktów głęboka fala basu, jakby coś ogromnego ruszyło się pod piaskiem |
| Szron (`game:frost`) | Biały Przesmyk | brzęczenie martwych modułów, dzwon, zamarznięty rój stuka w ścianach, lód pęka |
| Szczyty (`game:skyfall`) | Wiszące Szczyty | skala lidyjska, wysoki chór, flet; **harfa** — wznoszące się arpeggio co drugi takt; mgła |
| Oaza (`game:oasis`) | Słoneczna Dolina | ciepła skala miksolidyjska, harfa jak lutnia, bęben dłoniowy, niski flet |
| Sygnał (`game:signal`) | rozdział IV · Sygnał spod piasku | obca skala, brzęczenie, dzwon; **kod** — krótkie, wysokie sygnały w stałym rytmie co cztery takty; pomruk zakopanego artefaktu |
| Konwój (`game:convoy`) | rozdział V · Ostatni konwój | niskie smyczki pchające naprzód, śnieżny wiatr, flet odbijający się echem od ścian przełęczy |

- Szkolenie (poligon na Eos) gra „Latarnie” — jak rozdział I na tej samej planecie.
- Bez zmian, bo mają motywy pisane dla siebie: Wydmy Bliźniaczych Słońc („Świt bliźniaczych słońc”), Popielny Szlak („Wrak”), Świetlisty Gąszcz i rozdział VII („Gąszcz”), Rzeki Magmy oraz rozdziały VI i IX („Kuźnia”). Rozdział VIII gra „Ul”, bo przeciwnikiem jest Rój (ta reguła ma pierwszeństwo przed mapą); Biały Przesmyk w scenariuszu gra „Szron”.
- Wybór motywu patrzy też na mapy rozdziałów aktu III (`RTS.ACT3`).
- Testy: 15 motywów niepokojących, każdy z własną sekwencją; zawodzenie i pomruk Wydm, harfa Szczytów, kod Sygnału.

## Wersja 0.167.4 — własny charakter Bastionu (2026-10-09)

Motyw „Bastion” (Bastion Admiralicji, rozdział XII) miał tylko werbel marszu. Dostał wojskowy charakter twierdzy:
- **sygnał trąbki** (`fanfare`) — co osiem taktów (w napięciu co cztery) krótka fanfara garnizonu na blasze: wznoszący się akord, ostatni dźwięk przytrzymany;
- **ostinato smyczków** (`ostinato`) — niskie smyczki pulsujące w takt marszu, na zmianę podstawa i kwinta (głośniej w napięciu);
- **dalekie działa** (`guns`) — od czasu do czasu głuchy huk z murów i jego pomruk, częściej w napięciu.

Oba silniki dźwięku mają te instrumenty (blacha i głęboki bęben także w trybie wysokiej jakości, Tone.js). Test: w „Bastionie” są blacha, smyczki i huk dział, w „Ruinach” żadnego z nich.

## Wersja 0.167.3 — własny charakter Ruin (2026-10-09)

Motyw „Ruiny” (Ruiny Nadiru, rozdział III) był dość ogólny — burdon, flet i wiatr, blisko „Kuźni” i „Wraku”. Dostał akcenty miasta Prekursorów:
- **echo murów** (`echoes`) — wezwanie fletu odbija się od ruin dwa razy, z drugiej strony i z powrotem, coraz ciszej;
- **gong cytadeli** (`gong`) — co osiem taktów głęboki, długo wybrzmiewający dzwon w dwóch oktawach, jak budzący się obelisk;
- **rytualny bęben** (`ritual`) — cichy rytm bębna obręczowego co drugi takt (głośniej w napięciu; w bitwie grają bębny wojenne).

Test: w „Ruinach” fletu jest co najmniej dwa razy więcej niż w „Kuźni” (echa), jest niski gong i bęben poza bitwą, którego „Kuźnia” nie ma.

## Wersja 0.167.2 — własny charakter Archiwum (2026-10-09)

Motyw „Archiwum” (Lodowe Archiwum, rozdział II) brzmiał podobnie do „Kryształu” (oba miały szklane dzwonki). Teraz zamiast dzwonków ma:
- **pozytywkę** (`musicBox`) — co cztery takty krótką, wysoką figurę fortepianu, jak starą melodię zamkniętą pod lodem (co drugi raz o stopień wyżej);
- **pękający lód** (`cracks`) — w nieregularnych chwilach ostry trzask i niski jęk lodu, częściej w napięciu i bitwie; to nawiązanie do lodu, który na tej mapie pęka pod wybuchami (0.166).

Test: w „Archiwum” są pozytywka i trzaski, w „Krysztale” żadnego z nich.

## Wersja 0.167.1 — muzyka doliny Eos (2026-10-09)

Dwa motywy, które się rymują — ten sam ton podstawowy (A) i ta sama melodia wezwania fletu:

| Motyw | Mapy | Charakter |
|---|---|---|
| Latarnie (`game:beacons`) | Dolina Latarni, I | jasny dur, chór; **dzwon latarni** co dwa takty z echem — sygnał z wieży |
| Popioły (`game:ashes`) | Wypalona Dolina, XI | ta sama melodia w mollu nad burdonem, wiatr; dzwon latarni rzadko (co osiem taktów) i cicho — zgaszone latarnie |

Test: dzwon latarni w „Latarniach” odzywa się ponad dwa razy częściej niż w „Popiołach”, a w obu jest obecny.

## Wersja 0.167 — muzyka nowych map (2026-10-09)

Osiem nowych motywów dla map z kroków M1–M5 (`audio.js`, te same mechanizmy co dotychczasowe: motywy niepokojące `EERIE` i kosmiczne `SPACE_MUSIC`; nastroje — eksploracja, rozbudowa, napięcie, bitwa, wytchnienie — zmieniają je jak inne).

| Motyw | Mapy | Charakter |
|---|---|---|
| Przypływ (`game:tide`) | Archipelag Thalassy | pentatonika durowa, chór jak wiatr nad wodą, flet; **przybój** — szum fal co dwa takty z lewej i prawej, niski przypływ basu |
| Kryształ (`game:crystal`) | Kryształowe Grzbiety, XIII | brzęczenie kolumn, wysokie dzwonki; **szklane dzwonki** — iskry dźwięku w losowych miejscach |
| Ruiny (`game:ruins`) | Ruiny Nadiru, III | dawna skala (frygijska durowa) nad burdonem, flet wśród murów, wiatr; od 0.167.3 echo murów, gong cytadeli i rytualny bęben |
| Bastion (`game:bastion`) | Bastion Admiralicji, XII | molowy marsz: **werbel** w takt kroku, w napięciu bęben na raz; od 0.167.4 sygnał trąbki, ostinato smyczków i dalekie działa |
| Archiwum (`game:archive`) | Lodowe Archiwum, II | moll harmoniczny, chór w chłodzie; od 0.167.2 pozytywka i pękający lód |
| Doki (`game:docks`) | Doki Eos, X | kosmiczny, pełen nadziei — D-dur, figura organów, dzwony |
| Mgławica (`game:nebula`) | Szkarłatna Mgławica | ciemny i powolny — długie akordy organów, burdon, flet zagubiony w czerwieni |
| Komety (`game:comets`) | Szlak Komet | jasny i ruchliwy — figura fortepianu wysoko, akordy sus, dzwony jak lodowy pył |

- Wybór motywu (`app.js`, `musicModeFor`) patrzy na mapę pod rozdziałem (`RTS.CAMPAIGN_MAPS`, `RTS.ACT4`), więc rozdział gra muzykę swojej mapy; przy okazji XIV (Wrota Pustki) gra teraz „Horyzont zdarzeń” zamiast domyślnej „Orbity”. Dolina Latarni i Wypalona Dolina (Eos) dostały własne motywy w 0.167.1.
- Wszystkie nowe motywy są w odsłuchu muzyki w ustawieniach.
- Testy (`tests/audio.test.js`): 9 motywów niepokojących i 7 kosmicznych — każdy z własną sekwencją, poprawne nuty, bitwa z bębnami i uderzeniami; przybój, szklane dzwonki i werbel marszu tylko tam, gdzie powinny.

## Wersja 0.145 — muzyka kosmosu (2026-10-08)

Na życzenie użytkownika cztery motywy dla map w kosmosie w stylu filmu „Interstellar” — środkami partytury (organy piszczałkowe, zegar, fortepian, narastanie warstw, nagła cisza), bez cytowania melodii. Partytura w `audio.js` (`SPACE_MUSIC`, `spaceStep`), wybór w grze — `musicModeFor(game)` w `app.js` (mapy z `space: true`; wcześniej grał „Gąszcz”).

| Motyw (tryb) | Mapa | Tempo, tonacja | Charakter |
|---|---|---|---|
| Orbita (`game:orbit`) | Orbita Kharona (i każda inna kosmiczna) | 72/min, a-moll; akordy co takt: a–a–F–F–C–C–G–G | figura organów (pryma, kwinta, oktawa, tercja; kolejność 0-1-2-3-2-1-2-1) co ósemkę, fortepian z echem co 2 takty |
| Pierścienie (`game:glacis`) | Pierścienie Glacjalis | 66/min, H, akordy sus2 i dur/moll | figura na fortepianie (oktawę wyżej), od 3. frazy dzwony i ciche organy, dzwony z echem |
| Horyzont zdarzeń (`game:void`) | Wrota Pustki | 48/min, A1, akord co 2 takty | bez figury — długie akordy organów, dron oktawę pod pedałem, zegar głośniejszy, fortepian z echem co 4 takty |
| Requiem floty (`game:requiem`) | Cmentarzysko Floty | 56/min, d-moll | chorał: organy w akordach, smyczki i niski chór (`chant`) od początku, flet z echem |

- Warstwy (fraza = 8 taktów, cykl 32): 0 — pedał organów, zegar na ćwierćnuty, figura cicho; 1 — smyczki (akord oktawę wyżej) i fortepian; 2 — chór, figura podwojona oktawę wyżej; 3 — pełne organy (akord), „braam” w 7. takcie frazy. Ostatnie pół taktu cyklu: cisza i jedna zawieszona nuta fortepianu.
- Nastroje: rozbudowa — szarpane nuty akordu; napięcie — zegar co ósemkę, niski puls organów; bitwa („bez czasu na ostrożność”) — organy w szesnastkach (dwa głosy, akcent na mocnych), smyczki z figurą, taiko na 1, 4 i 7 ósemce, „braam” co 2 takty, chorał, zegar co ósemkę, bez ciszy na końcu cyklu; wytchnienie — chór.
- Odsłuch muzyki w Ustawieniach: cztery nowe pozycje „Kosmos — …”.
- Test: `tests/audio.test.js` — każdy motyw co najmniej 4 instrumenty (w tym organy i zegar), poprawne nuty (wszystkie powyżej 20 Hz) przez pełny cykl 32 taktów, różne przebiegi; w bitwie organy, taiko, „braam” i zegar. `npm test` 305/305; w przeglądarce odsłuch wszystkich czterech (eksploracja i bitwa) bez błędów.

## Wersja 0.105 — cztery niepokojące motywy (2026-10-07)

Na życzenie użytkownika cztery nowe motywy w klimacie filmowym, z nutą „Obcego” (atmosfera, środki — bez cytowania melodii). Partytura w `audio.js` (`EERIE`, `eerieStep`), wybór motywu w grze — `musicModeFor(game)` w `app.js`.

**Nowe instrumenty** (`cinematic()`): `flute` — flet z oddechem, vibrato i długim echem taśmowym; `metal` — smyczkowany metal (nieharmoniczne alikwoty 1 : 2,76 : 5,4 : 8,93, lekkie ślizgi); `heart` — bicie serca (dwa niskie uderzenia); `hum` — szum statku (ton z alikwotami i dudnienie szumu); `hiss` — narastający syk; `anvil` — metaliczne uderzenie kowadła.

| Motyw (tryb) | Gdzie gra | Tempo, skala | Warstwy |
|---|---|---|---|
| Wrak (`game:wreck`) | motyw mapy „derelict”: Popielny Szlak, rozdział III | 54/min, skala z małą sekundą i trytonem | szum kadłuba, wołanie fletu (2 oktawy wyżej) co 4 takty, jęki metalu |
| Ul (`game:hive`) | każda gra z Rojem jako wrogiem (akt III, scenariusze) | 72/min | niski klaster chorału (pryma, sekunda, tryton), nieregularne trzaski, syki, flet wysoko |
| Gąszcz (`game:lumen`) | „lumen” i „skyfall”: Lumeria, Aerion | 60/min, skala całotonowa | oddychający chór, szklane dzwony, syki, jęki metalu |
| Kuźnia (`game:forge`) | „magma” i rozdział VI (Hefajstos) | 84/min | dron pieca, kowadło na 1 i 6 ósemce, flet, metal |

Nastroje (jak w pozostałych motywach): rozbudowa — powolny fortepian w skali motywu; napięcie — bicie serca, więcej metalu, częstsze trzaski i syki; bitwa — przyspieszone serce, bębny, kowadło, „braam” co 2 takty (w Ulu werbel); wytchnienie — niski flet. Kolejność wyboru motywu: Rój jako wróg → Ul; potem motyw mapy; inaczej świat (pustynia, świt, lód, popiół). W odsłuchu w Ustawieniach dodane cztery pozycje.

Weryfikacja: test w `tests/audio.test.js` (każdy motyw co najmniej 3 instrumenty, różne zestawy i przebiegi, poprawne nuty, w bitwie serce, bębny i „braam”); `npm test` 285/285. Przeglądarka: wszystkie cztery motywy w eksploracji i bitwie na WebAudio bez błędów, szczyt głosów 13–33, po zatrzymaniu 0.

## Wersja 0.104 — odsłuch muzyki w ustawieniach (2026-10-07)

- Ekran Ustawień (`menu.js`): sekcja „Odsłuch muzyki” — motyw (`MUSIC_THEMES`: menu, intro, `game:dust`, `game:sun`, `game:ice`, `game:ash`), nastrój (`MUSIC_MOODS`; nieaktywny dla menu i intro, które nastrojów nie mają), przycisk „Odtwórz / Zatrzymaj”, status (co gra; ostrzeżenie przy wyciszeniu albo głośności muzyki 0). Zmiana motywu lub nastroju podczas odsłuchu przełącza od razu.
- `GameAudio.previewMusic(motyw, nastrój)` ustawia motyw i nastrój, zaczyna od początku i blokuje nastrój (`updateMusicState` nic nie zmienia, dopóki trwa odsłuch); intro w odsłuchu zaczyna się od nowa co 64 kroki (30 s muzyki i 2 s ciszy). `stopPreview()` kończy odsłuch — wołane przy przejściu na inny ekran menu i przy powrocie do gry, po czym ekran ustawia swoją muzykę (menu lub motyw świata).
- Test: `tests/audio.test.js` — trzymanie motywu i nastroju mimo stanu gry, pętla intro, koniec odsłuchu. Przeglądarka: odsłuch pustyni i lodu w bitwie (diagnostyka pokazuje motyw), wyjście z ustawień przywraca motyw menu; `tests/menu-browser.html` 37/37.

## Wersja 0.103 — muzyka filmowa (2026-10-07)

Na życzenie użytkownika muzyka przypomina partytury filmów „Diuna” i „Interstellar” — w brzmieniu i środkach (drony, bębny wojenne, dęte „braam”, zawodzący głos; organy, tykający zegar, fortepian), bez cytowania ich melodii. Kompozycja w `audio.js` (`musicStep`), nowe instrumenty w `cinematic()` — syntezowane natywnie (WebAudio), także przy włączonej wyższej jakości (zespół Tone.js z `audio-hq.js` gra dalej dawne instrumenty: smyczki, dzwony, szarpane, bas; nowe idą przez pogłos muzyki `audio-hq.js`, gdy jest).

**Instrumenty** (`CINEMATIC`):
- `organ` — organy: głosy 8′, 4′, 2′ (i 16′ w basie), lekko rozstrojone, łagodny atak powietrza;
- `choir` / `chant` — chór bez słów: trzy rozstrojone piły przez dwa formanty samogłoski („aa” 760/1180 Hz; niski chorał „oo” 420/780 Hz), vibrato;
- `braam` — niskie dęte: piły na prymie, kwincie i oktawie niżej, przester, filtr otwierający się w 0,4 s i zamykający, sub;
- `taiko` — bęben: opadający ton membrany i głuche uderzenie szumu;
- `tick` — zegar: krótkie, suche kliknięcie (tik wyżej, tak niżej);
- `drone` — dron: dwie piły i sub, filtr oddychający 0,13 Hz;
- `wail` — głos solowy: podjazd do nuty, rosnące vibrato, nosowy formant, echo;
- `piano` — miękki fortepian (trzy alikwoty, wybrzmienie).

**Motywy** (krok = ósemka; fraza = 2 takty po 8 kroków, na granicy frazy zmienia się nastrój):
- **Menu** („Odległe światło”, 70/min): minorowa figura organów (pryma–kwinta–oktawa–kwinta–tercja…) nad 8-taktowym ciągiem akordów; co 8 taktów dochodzi warstwa — smyczki i zegar, mocniejszy chór i organy, wysoki rejestr organów i niski „braam” na końcu frazy.
- **Lód** (60/min): pedał organowy, smyczki, tykanie zegara przez cały czas, fortepian; w napięciu rusza figura organów, w bitwie bębny i „braam”.
- **Pustynia** (66/min) i **świt bliźniaczych słońc** (75/min): dron (na świcie jasny akord chóru), skala z obniżoną sekundą i podwyższoną tercją (na świcie durowa pentatonika), fraza zawodzącego głosu co 4 takty, rzadkie bębny, na świcie dzwony.
- **Front popiołu** (100/min): marsz taiko, dron z chorałem, „braam” co 4 takty.
- **Nastroje**: rozbudowa — szarpana figura w skali; napięcie — puls basu (na popiele zegar); bitwa — gęste bębny, „braam” co 2 takty, chorał, głos milknie; wytchnienie — chór.
- **Intro** (30 s): budzący się dron, dwa uderzenia „braam”, zbierające się bębny, chór i głos, chorał, burza bębnów i dętych, na końcu akord organów i smyczków w durze.

**Weryfikacja**: `npm test` 283/283 (testy motywów: różne instrumentarium i tempo każdego świata, bez perkusji „kick/snare/hat” na lodzie, intro 30 s i co najmniej 6 instrumentów; zmiana nastroju na granicy frazy — teraz po 16 krokach). Przeglądarka: wszystkie motywy i nastrój bitwy odtworzone na WebAudio bez błędów; szczyt jednoczesnych głosów muzyki 10–24 (bitwa do 43, limit 120), po zatrzymaniu 0.

## Wersja 0.45 — wyższa jakość (2026-09-28)

Na życzenie użytkownika dźwięk przeszedł od razu na lepszą jakość: próbki i biblioteka Tone.js. Dotychczasowy silnik (`audio.js`, czyste Web Audio, wszystko syntezowane) został — jest podstawą i zapasem; nowy moduł `audio-hq.js` rozszerza go tylko w przeglądarce.

### Pobrane pliki (za zgodą użytkownika)

| Plik | Źródło | Licencja | W projekcie |
|---|---|---|---|
| Tone.js 15.1.22 | cdn.jsdelivr.net/npm/tone@15.1.22/build/Tone.js | MIT | `vendor/tone.min.js` (345 KB) |
| Kenney „Sci-fi Sounds” | kenney.nl | CC0 | wybrane próbki w `assets/sfx/`, licencja `LICENSE-kenney-sci-fi-sounds.txt` |
| Kenney „Impact Sounds” | kenney.nl | CC0 | wybrane próbki w `assets/sfx/`, licencja `LICENSE-kenney-impact-sounds.txt` |

Z paczek wybrano 54 próbki (ok. 1 MB, Ogg Vorbis); archiwa usunięto. Gra działa bez internetu.

### Efekty

- **Próbki** (14 grup): strzały osobno dla frakcji (lasery Kolonii, retro-lasery Dominium, kryształowe trzaski Roju), rakiety, wybuchy (trzask + niski pomruk + dotychczasowe uderzenie), grzmot (pomruk spowolniony, z echem), wydobycie rudy, budowa, pompowanie gazu, kroki zależne od gruntu (beton, śnieg na światach lodowych, trawa w świecącej dżungli), silnik (fragment pętli, niżej dla Roju), przejęcie przekaźnika (pole siłowe + akord).
- **Każde odtworzenie** losuje wariant, wysokość (±6%) i drobną zmianę głośności. Głośność próbek jest wyrównywana przy wczytaniu (RMS), a poziomy dobrane tak, by były ok. 1,5–2× głośniejsze niż dawna synteza.
- **Odległość:** im dalej od środka widoku, tym ciszej (do −55%) i głuchiej (filtr dolnoprzepustowy 18 kHz → 900 Hz).
- **Pogłos:** generowany splot (ok. 2,6 s) wspólny dla efektów (wysyłka 16%) — dotyczy też dźwięków interfejsu, które zostały syntezowane.
- **Akcenty:** zwycięstwo, porażka, koniec badania, przejęcie i gotowość jednostki grane na instrumentach zespołu (dzwony, dęte, pad).

### Otoczenie

Zapętlony szum przez filtry, na kanale „otoczenie”: wiatr (pustynia), świszczący wiatr (lód), niski pomruk (wulkan), deszcz przy ulewie. Wiatr faluje w podmuchach, **narasta w czasie ostrzeżenia przed burzą** i jest najsilniejszy w czasie burzy. Tylko w bitwie, bez pauzy.

### Muzyka

Kompozycja bez zmian (`musicStep` w `audio.js`: motywy menu, prologu i planet, nastroje eksploracja, rozbudowa, napięcie, bitwa, wytchnienie, zmiana nastroju na granicy taktu). Grają ją instrumenty Tone.js: pad i smyczki z chórusem (szerokie), dęte i dzwony FM, prowadzenie FM, bas z filtrem i obwiednią, perkusja (membrana, szum, metal), a całość idzie przez pogłos Tone.Reverb (5 s) i echo. Każdy instrument to pula głosów jednogłosowych planowanych wprost na zegarze dźwięku — `PolySynth` z Tone rozdziela nuty zegarem JavaScript, który zatrzymuje się w kartach w tle i przy renderowaniu offline (tak wykryto ciszę w części motywów). Przy zmianie motywu lub wyciszeniu zespół jest wyciszany w 0,25 s i odtwarzany od nowa. Głośność każdego instrumentu dobrana pomiarem względem dawnej syntezy (bas i stopa przyciszone, dzwony podgłośnione).

### Zapas

Jeśli nie ma Tone.js, próbki się nie wczytają lub przeglądarka nie obsłuży Ogg — gra używa dotychczasowych syntezowanych głosów. Ustawienia (głośność, kanały, wyciszenie) bez zmian.

### Weryfikacja

- `tests/audio-hq-browser.html` (nowy): renderowanie bez odtwarzania — 14 grup / 54 próbki wczytane; muzyka Tone.js w 5 motywach nie milczy i ma głośność 1,1–2× dawnej syntezy; 10 efektów i akcentów 1,1–3,8× (bez przesterowania); wybuch z daleka ciszej niż z bliska (0,0082 → 0,0024); wiatr przed burzą głośniejszy niż w spokoju (0,0034 → 0,0157). PASS. Przyciski na stronie odtwarzają motywy i efekty na żywo.
- Na żywo (kontekst „running” po kliknięciu): motyw pustyni grany przez zespół Tone.js, konsola bez błędów. Strona gry wczytuje Tone.js i moduł bez błędów.
- `npm test` 237/237 (`audio.js` rozdzielony na bramkę `play()` i głos `voice()`; testy dźwięku bez zmian).

Brzmienie nie było odsłuchane przez autora zmian — głośności ustawiono pomiarem; ostateczną ocenę zostawiamy użytkownikowi (strona testowa ma przyciski do odsłuchu).

## Wersja 0.45.1 — przełącznik jakości i diagnostyka

Zgłoszenie: w Brave (gra przez serwer) muzyka gra w menu, a po uruchomieniu mapy nic nie słychać. Nie udało się tego odtworzyć: przejście menu → mapa (wybór misji i „Kontynuuj”), także z zablokowanym wczytywaniem próbek, gra w podglądzie Chromium, w Chrome i w Brave bez interfejsu (prawdziwa gra sterowana przez protokół DevTools, poziom wyjścia na mapie jak w menu), również z pliku (`file://`, jak `START.cmd` — tam próbki się nie wczytują i efekty wracają do syntezy). Ochrona przed odciskiem przeglądarki w Brave zmienia odczyt buforów (0,5 → 0,4995), ale niczego nie wycisza.

Dodane, żeby ustalić przyczynę i mieć obejście:

- **Ustawienia → Jakość dźwięku:** „Wysoka (próbki, Tone.js, otoczenie)” albo „Klasyczna (synteza)” — dźwięk sprzed 0.45; zapamiętywane (`pogranicze-audio-quality-v1`), przełączane bez przeładowania.
- **Diagnostyka pod przełącznikiem** (odświeżana co 0,4 s, także w ustawieniach z menu pauzy na mapie): stan kontekstu dźwięku, wyciszenie, motyw muzyki, wczytane próbki (x/14), stan Tone.js (gotowy / gra / błąd / brak), wskaźnik poziomu na wyjściu i ostrzeżenie o błędnym sygnale (NaN).
- `window.gameAudio` — obiekt dźwięku dostępny z konsoli przeglądarki (`gameAudio.diagnostics()`).

## Wersja 0.45.2 — Tone.js po pierwszym kliknięciu

Użytkownik zobaczył w konsoli Edge ostrzeżenie „The AudioContext was not allowed to start. It must be resumed (or created) after a user gesture on the page.” Źródło: Tone.js wczytany razem ze stroną od razu tworzy własny kontekst dźwięku, którego przeglądarka nie pozwala uruchomić (gra ma swój, tworzony po kliknięciu). Potwierdzone w Edge bez interfejsu: strona z samym Tone.js daje to ostrzeżenie dwukrotnie.

Teraz `vendor/tone.min.js` nie jest w `index.html`; `audio-hq.js` dołącza go dopiero w `setupQuality()` (po pierwszym kliknięciu lub klawiszu), ścieżką liczoną względem własnego pliku (działa też z `tests/` i z `file://`), i od razu przełącza go na kontekst gry. Do czasu wczytania grają instrumenty syntezowane. Diagnostyka pokazuje stan Tone.js: wczytywanie / gotowy / gra / błąd.

Weryfikacja: gra w Edge bez interfejsu — brak ostrzeżenia; `tests/audio-hq-browser.html` PASS; w podglądzie menu → mapa szkoleniowa: Tone.js „gra”, poziom na wyjściu 0,003–0,009, konsola bez ostrzeżeń; `npm test` 237/237.

## Wersja 0.45.3 — lżejszy zespół (cisza na mapie)

Zgłoszenie: przy jakości „Wysoka” muzyka grała w menu, a po uruchomieniu dowolnej mapy (scenariusz, szkolenie, kampania) nic nie było słychać; „Klasyczna” działała. Diagnoza pomiarem renderowania offline (11 s motywu pustyni): synteza 128 ms, zespół Tone.js ok. 2500 ms, sam zespół bez nut 1131 ms — głosy Tone.js stale utrzymują węzły sygnałów. Przy starcie mapy przez 12 s działały dwa zespoły naraz (każdy z własnym 5-sekundowym pogłosem), do tego próbki, otoczenie i grafika WebGL — wątek dźwięku przestawał nadążać.

Zmiany:

- **Jeden wspólny pogłos muzyki** (natywny splot na tej samej odpowiedzi co efekty, przed głośnością muzyki) zamiast `Tone.Reverb` w każdym zespole; zespół ma tylko wysyłkę do niego, wygaszaną razem z nim.
- **Stary zespół usuwany 0,6 s po wyciszeniu** (wcześniej 12 s) — nie ma już dwóch zespołów naraz.
- Pady i smyczki: 2 oscylatory na głos zamiast 3.

Po tych zmianach użytkownik potwierdził, że dźwięk na mapie wrócił. Głośności bez zmian (`tests/audio-hq-browser.html` PASS: muzyka 1,06–1,94× dawnej syntezy).

Możliwy dalszy krok, gdyby problem wrócił na słabszym sprzęcie: instrumenty na czystym Web Audio (węzły tylko na czas trwania nuty) zamiast głosów Tone.js — koszt zbliżony do dawnej syntezy.

