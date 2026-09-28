# Dźwięk i muzyka

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

