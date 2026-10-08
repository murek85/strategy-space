# Dźwięk i muzyka

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

