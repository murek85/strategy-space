# Akt IV kampanii „Inwazja” — plan (2026-10-08)

Kontynuacja „Odzyskanego Świtu” po akcie III (Serce Roju zgasło, rozejm Kolonii z Varnem). Akt wykorzystuje mechaniki etapu G: bitwę o orbitę i desant (tryb Inwazja), przeciwnika z Twierdzą, doktryną, patrolami i eskortą, rozkazy patrolu i eskorty gracza.

Decyzje właściciela (2026-10-08): przeciwnik — Admiralicja Dominium z adm. Selen Vok **oraz trzecia siła z zewnątrz**; rozdziały — 4, chyba że trzecia siła wymaga więcej. Trzecia siła potrzebuje zapowiedzi, wejścia i rozstrzygnięcia — w 4 rozdziałach zostałaby tylko zarysowana, a wątek Vok straciłby finał — dlatego **5 rozdziałów** (X–XIV).

## Fabuła

**Admiralicja.** Admiralicja Dominium nie uznaje rozejmu Varna. Flota adm. **Selen Vok** blokuje orbity pogranicza i przejmuje uśpione artefakty; Varn zostaje uznany za zdrajcę. Kolonie przełamują blokadę i odzyskują planety z orbity.

**Trzecia siła: Wartownicy Otchłani.** Artefakty nie były dziełem Roju — to latarnie dawnej rasy maszyn, a Rój był ich „ogrodem”. Gdy Serce zgasło, latarnie umilkły, a Wartownicy przychodzą sprawdzić, co się stało: przez **szczeliny** otwierane przy czarnej dziurze Otchłani i przy artefaktach. Bezlitośnie neutralni — atakują każdego, kto trzyma artefakty, Kolonie i Admiralicję tak samo. Ich pojawienie się zmusza do wyboru: dobić Vok czy zawrzeć z nią rozejm przeciw Wartownikom.

**Postacie.** Nowe: adm. Selen Vok (Admiralicja), **Głos Bramy** (sygnał Wartowników — syntezowany, metaliczny). Wracają: Lira, Tessa, Koss, Varn, Szept Roju (echo w artefaktach, zapowiedź Wartowników).

**Konsekwencje wyborów.** Decyzja z rozdziału VIII (zaufanie / dystans wobec Varna) zmienia rolę Varna w akcie (sojusznik w polu albo neutralny). Decyzja z rozdziału XII (garnizon Varna albo stocznia Admiralicji) zmienia XIII. Decyzja z rozdziału XIII (rozejm z Vok albo jej klęska) zmienia finał XIV i epilog.

## Wartownicy Otchłani — czwarta frakcja (pełna)

Decyzja właściciela (2026-10-08): pełna frakcja — własne modele, jednostki, budowle i atrybuty, z mechanikami, których dotąd w grze nie było. Wzorem jest Rój (`swarm-rules.js`, `swarm-art.js`, `webgl3d/swarm-detail-3d.js`): reguły, grafika 2D, pełny zestaw modeli 3D (także wspólnych typów: robot, koszary, fabryka…), wygląd w rendererze WebGL, baza wiedzy, drzewo rozwoju, styl AI, dźwięki.

**Wygląd.** Rasa maszyn z jasnego kamienia i światła: białe, gładkie płyty z cyjanowymi szczelinami świetlnymi, unoszące się elementy bez widocznych połączeń, pierścienie i soczewki; jednostki naziemne lewitują nad gruntem. Kontrast do Roju (matowy obsydian) i Dominium (stal, pomarańcz).

**Atrybuty frakcji.** Koszt +15%, wytrzymałość −10%, ale **tarcze** jak u statków w kosmosie (pochłaniają obrażenia, wracają po chwili bez trafień). Jednostki lewitują: przechodzą nad płytką wodą i nie zostawiają śladów. Nie wydobywają rudy robotami — patrz Rezonator.

**Jednostki**

| Jednostka | Rola | Atrybuty |
|---|---|---|
| Tkacz | robot | lewituje; „drukuje” budowle (szybciej, ale tylko w zasięgu Kotwicy lub Rdzenia); naprawia tarcze |
| Iskra | lekka, szybka | **Skok** — umiejętność: krótki teleport w wybrany punkt (odnowienie) |
| Pryzmat | przeciw pancerzowi | **wiązka narastająca** — obrażenia rosną, im dłużej trzyma ten sam cel |
| Łuk | artyleria | **łańcuch** — wyładowanie przeskakuje na 2 kolejne cele w pobliżu |
| Strażnik | ciężki | **Faza** — umiejętność: kilka sekund bez otrzymywania obrażeń (bez strzelania) |
| Konstrukt | tytan | **scalenie** — powstaje z połączenia dwóch Strażników (nie z produkcji) |
| Ostrze, Kadłub Echa | statki (mapy kosmiczne) | lekki i ciężki statek frakcji |

**Budowle**

| Budowla | Rola | Atrybuty |
|---|---|---|
| Rdzeń | centrum | **mobilny** — może się zwinąć, przelecieć i rozłożyć w nowym miejscu |
| Kuźnia Fazowa | produkcja | jedna budowla zamiast koszar i fabryki; oddziały wychodzą ze **szczeliny** przy dowolnej Kotwicy |
| Kotwica | węzeł | poszerza strefę budowy, daje moc, **sieć teleportów** — jednostki przeskakują między Kotwicami |
| Rezonator | gospodarka | stoi na złożu kryształów lub przekaźniku i sam daje dochód (zamiast robotów górniczych) |
| Iglica | obrona | wieża z wiązką łańcuchową |
| Brama | cel kampanii | tylko w rozdziale XIV |

**Nowości w grze (dotąd niewystępujące).** Umiejętności aktywne z odnowieniem (Skok, Faza) — nowy przycisk i skrót w panelu oddziału; teleporty między budowlami; obrażenia narastające i łańcuchowe; scalanie jednostek; mobilne centrum dowodzenia; gospodarka bez robotów górniczych; produkcja przez szczeliny w dowolnym węźle.

**Dostępność.** W kampanii jako przeciwnik (akt IV). W scenariuszach i grze sieciowej jako czwarta grywalna frakcja — gracz może grać Wartownikami, a AI ma ich styl (szybkie natarcia przez szczeliny, Skoki na roboty wroga).

## Rozdziały

| Rozdział | Mapa | Mechanika | Cel |
|---|---|---|---|
| X · Blokada Eos | Orbita Kharona (kosmos) | Faza orbity Inwazji: flota przeciw flocie Admiralicji z lotniskowcem | Zniszcz stację blokady albo miej przewagę floty po 10 min. **Wynik przechodzi do XI** (kapsuły z ocalałej floty). Dodatkowo: nie strać lotniskowca. Zapowiedź: artefakt na orbicie „odpowiada” na nieznany sygnał. |
| XI · Kapsuły nad Eos | Cichy Horyzont (pustynia) | Faza planety Inwazji z orbitą gracza: desant, uderzenie i skan z orbity; przeciwnik buduje baterie przeciwlotnicze | Załóż przyczółek (2 przekaźniki), potem zniszcz bazę Admiralicji. Dodatkowo: najwyżej 1 zestrzelona kapsuła. W połowie: pierwsza szczelina przy artefakcie — zwiad Wartowników atakuje obie strony. |
| XII · Twierdza Admiralicji | Popielny Szlak (popiół) | Przeciwnik z Twierdzą i doktryną, patrole i eskorty; konwój technika (eskorta); fale Wartowników bijące w obie strony | Doprowadź konwój do stacji uplink, potem zdobądź Twierdzę. **Decyzja:** ratować garnizon Varna (sojusznik w XIII) albo uderzyć na stocznię Admiralicji (słabsza flota Vok w XIII). |
| XIII · Ostatnia orbita | Pierścienie Glacjalis (kosmos) + Biały Przesmyk | Odwrócona inwazja: orbitę ma Vok — obrona przed kapsułami i uderzeniami, potem kontratak; Wartownicy otwierają szczeliny w środku bitwy | Przetrwaj desant, potem pokonaj okręt flagowy Vok. **Decyzja na końcu:** rozejm z Vok przeciw Wartownikom (jej flota w XIV) albo jej klęska (więcej zasobów, sam w XIV). |
| XIV · Brama | Otchłań (kosmos, czarna dziura) | Finał przeciw Wartownikom: zamknij trzy szczeliny i zniszcz Bramę przy horyzoncie zdarzeń; sojusznicy zależnie od decyzji (Varn, Vok) | Zamknij szczeliny (wieże przy każdej), potem zniszcz Bramę. Dodatkowo: przed 25. minutą. Epilog aktu i kampanii. |

## Oprawa

- Sceny łączności przed rozdziałami (`interludes.js`), głosy syntezowane (Vok: chłodny, rozkazujący; Głos Bramy: metaliczny, z echem); prolog i epilog aktu (`epilogue-films.js`) z wariantami zależnymi od decyzji VIII, XII i XIII.
- Muzyka: motywy kosmosu (Horyzont zdarzeń, Requiem floty) i bitew; motyw Wartowników — propozycja.
- Ekran kampanii: nagłówek „Akt IV · Inwazja”, rozdziały odblokowane po IX.

## Kroki realizacji

| Krok | Zakres | Wersja |
|---|---|---|
| H3a–H3d | Wartownicy — reguły, nowe mechaniki, wygląd, AI, baza wiedzy, balans (zrobione jako pierwsze, na życzenie właściciela) | **0.154 — ukończony** |
| H1 | `campaign-act4.js`: rozdziały X–XIV (dane, mapy, cele, odblokowanie po IX), postacie (Vok, Głos Bramy), lista w menu kampanii, zapis postępu | **0.156 — ukończony** |
| H2 | Rozdziały X i XI: Inwazja w kampanii — wynik orbity z X w postępie kampanii → kapsuły w XI; zapowiedź Wartowników; cele, łączność, odznaki | **0.156 — ukończony** |
| H4 | Rozdział XII: konwój, Twierdza, Wartownicy, decyzja | 0.157 |
| H5 | Rozdział XIII: odwrócona inwazja, szczeliny, decyzja o Vok | 0.157.x |
| H6 | Rozdział XIV: finał przy Bramie; sceny łączności aktu, prolog i epilog | 0.158 |
| H7 | Symulacje balansu rozdziałów, testy, dokumentacja | 0.158.x |

## H1–H2 — rozdziały X i XI (wersja 0.156, 2026-10-09)

**Moduł** `campaign-act4.js` (w łańcuchu reguł po `watchers-rules.js`), na wzór aktu III: rozdziały `colony10`–`colony14` (`RTS.ACT4`), misje z terenem i wyglądem map scenariuszy (X — Orbita Kharona, XI — Cichy Horyzont, XII — Popielny Szlak, XIII — Pierścienie Glacjalis, XIV — Wrota Pustki), odblokowanie po kolei od IX, interfejs aktu II (łączność, cele z odznaką celu dodatkowego, +200 metalu za odznakę poprzedniego rozdziału, epilog). Postacie: adm. Selen Vok (Admiralicja) i Głos Bramy (sygnał Wartowników) — portrety w `portraits.js`, sceny łączności przed każdym rozdziałem (`interludes.js`). W bitwie przeciwnik nazywa się „Admiralicja”.

**X · Blokada Eos.** Faza orbity Inwazji (`invasion-rules.js`) na 10 minut zamiast 8; Twój lotniskowiec (cel dodatkowy: przetrwa) i lotniskowiec Admiralicji. Wygrana: stacja blokady zniszczona albo silniejsza flota i stacje po czasie. W 3. minucie artefakt na orbicie „odpowiada” — pierwszy głos Bramy. Ocalała flota daje kapsuły (`campaignCarry`), zapisywane w postępie kampanii (`CampaignProgress.carry`); w kampanii po orbicie nie ma ekranu lądowania — jest raport rozdziału i przycisk dalej.

**XI · Kapsuły nad Eos.** Faza planety z orbitą gracza: kapsuły z X (bez zapisu — 4), uderzenie i skan z orbity; dowódca Admiralicji buduje baterie przeciwlotnicze. Cele: przyczółek — 2 przekaźniki naraz (od tej chwili zaliczony), potem baza Admiralicji (zwycięstwo czeka na przyczółek); cel dodatkowy — najwyżej 1 zestrzelona kapsuła. W 7. i 14. minucie szczeliny przy przekaźnikach w środku mapy: zwiad Wartowników (drużyna 4, frakcja Wartowników; na poziomie trudnym z dodatkowym Łukiem) idzie na najbliższe budowle obu stron. Zdarzenia kampanii: dywersja i posiłki.

**Decyzja z rozdziału VIII.** Zaufanie: fregata Varna w X i jedna kapsuła więcej w XI. Dystans: 250 metalu w X i 300 w XI. Odprawa pokazuje skutek decyzji i (przed XI) liczbę kapsuł z X.

**XII–XIV — wersja robocza.** Na liście i grywalne jako podbój na swoich mapach (XIV przeciw Wartownikom), z celem dodatkowym na czas; konwój, Twierdza, odwrócona inwazja, szczeliny w bitwie, Brama, decyzje i epilog — kroki H4–H6.

**Weryfikacja.** `tests/act4.test.js` (5): rozdziały, odblokowanie, postacie; X — orbita 10 min, lotniskowce, sygnał, wygrana i zapis kapsuł; X przegrany na czas; XI — kapsuły z X i od Varna, przyczółek przed zwycięstwem, zestrzelone kapsuły, dwie szczeliny Wartowników, zapis gry; premia za odznakę IX, rozdziały robocze. Przeglądarka: menu kampanii z aktem IV, scena łączności, odprawa ze skutkiem decyzji, rozdział X (komunikat Varna, fregata, lotniskowiec), raport i zapis 6 kapsuł, przejście do XI (7 kapsuł).

## H3 — Wartownicy Otchłani (wersja 0.154, 2026-10-08)

Kolejność zmieniona na życzenie właściciela („zacznij od H3”): frakcja powstała przed rozdziałami, więc numery wersji kroków H1–H7 przesunęły się — o jeden, a po wersji 0.155 (Inwazja i tryby scenariuszy w grze sieciowej, poza planem aktu) o kolejny.

**Reguły** (`watchers-rules.js`, ostatni moduł w łańcuchu `advanced-rules.js`). Frakcja `watchers`: koszt ×1,15, wytrzymałość ×0,9, obrażenia ×1,05. Tarcze (`ward`, nie `shield` — tamto pole mają statki w kosmosie): 25% wytrzymałości na każdej jednostce i budowli, wracają po 4 s bez trafień (12%/s). Lewitacja: pogoda i teren nie spowalniają jednostek naziemnych. Tkacze (roboty) nie wydobywają rudy — także rozkazy startowe; dochód daje Rdzeń (+4 metalu/s) i Rezonatory. Nazwy wspólnych typów: `RTS.WATCHERS_NAMES` (Rdzeń, Kuźnia Fazowa, Wielka Kuźnia, Iglica, Tkacz, Odłamek…). Stałe: `RTS.WATCHERS`.

**Odstępstwa od planu.** Kuźnia Fazowa to dwie budowle: Kuźnia Fazowa (koszary — Iskra) i Wielka Kuźnia (fabryka — Pryzmat, Łuk, Strażnik), żeby działały AI, kolejki i drzewo rozwoju bez osobnej ścieżki. Statki frakcji (Ostrze, Kadłub Echa) i Brama — w rozdziałach (H5, H6); w kosmosie Wartownicy używają wspólnych statków.

**Mechaniki (nowe w grze).** Umiejętności aktywne z odnowieniem — przycisk „Umiejętność ⇧Q” w panelu oddziału: Iskra — Skok (LPM wskazuje punkt, do 260, co 10 s), Strażnik — Faza (3 s bez obrażeń i bez strzelania, co 18 s). Pryzmat: każde trafienie tego samego celu +25%, do ×2,5. Łuk i Iglica: wyładowanie przeskakuje na 2 kolejne cele w promieniu 110, za każdym razem o połowę słabsze. „Scal”: dwaj strażnicy w odległości do 140 tworzą Konstrukt (średnia wytrzymałość obu). Kotwica: strefa budowy 320, oddziały z kuźni wychodzą ze szczeliny przy kotwicy bliższej punktowi zbiórki niż kuźnia; „Do kotwicy” — jednostki stojące do 150 od własnej kotwicy przeskakują do wskazanej (co 8 s). Rezonator: przy złożu rudy (5 metalu/s), kryształów (3 metalu/s + 0,4 kryształu/s) lub własnym przekaźniku (5 metalu/s). „Przenieś rdzeń”: do 1100, na widoczny wolny teren, 70/s, co 120 s; w locie nie można go trafić. Polecenia sieciowe: `ability`, `anchorJump`, `mergeWardens`, `relocateCore`.

**Wygląd.** 2D: `watchers-art.js` (białe filary z cyjanowymi szczelinami światła, unoszące się korony i diamenty, jednostki lewitujące nad cieniem; Canvas i WebGL). 3D: `webgl3d/watchers-detail-3d.js` — wszystkie wspólne typy i budowle oraz własne, z animacją (krążące płyty Rdzenia, obracające się pierścienie Kotwicy, pulsujący Rezonator, kołysanie lewitujących jednostek); materiały bez nakładanych szwów i brudu (czysty kamień, pogoda nadal osiada). Efekty `rift` (szczelina — skok, teleport, wyjście z kuźni, scalenie) i `phase` (powłoka fazy) w `fx-art.js` i w rendererze 3D; dźwięki `rift` i `phase` (`audio.js`). Galeria: `prototyp-modele.html` → Wartownicy.

**AI i dostępność.** Styl „Szczeliny” (`enemy-ai.js`): częste ataki średnimi grupami, rajdy na roboty, wycofanie przegranego ataku; komputer używa Skoku, Fazy i scalania (`watchersAi`, raz na sekundę, deterministycznie). Doktryny: Światło Bramy (+20% obrażeń pojazdów i obrony), Tarcze Otchłani (−15% obrażeń). Wybór frakcji w scenariuszu i w grze sieciowej (także lobby). Baza wiedzy: opisy jednostek i budowli, poradnik.

**Balans** (`node tools/faction-sim.js` — armie po 3000 metalu w cenach frakcji, 20 rund, strony zamieniane co rundę): Kolonie–Wartownicy 12/20, Dominium–Wartownicy 14/20, Rój–Wartownicy 18/20. Pierwsza wersja przegrywała z Koloniami i Dominium, a po wzmocnieniu biła Kolonie 19/20 (łańcuch Łuku na zbitą piechotę) — stąd tarcze 25% (zamiast 30%), Łuk 40 obrażeń, łańcuch słabnący o połowę. Uwaga: w tej arenie Rój wygrywa ze wszystkimi frakcjami (także z Koloniami i Dominium 20/20) — to sprawa balansu Roju, poza zakresem H3.

**Weryfikacja.** `tests/watchers.test.js` (7): frakcja, nazwy, tarcze, Tkacze bez rudy; Rezonator; Skok i Faza z odnowieniem; wiązka i łańcuch; scalanie i teleport między kotwicami; lot Rdzenia; polecenia sieciowe. `tests/bundle-3d.test.js`: modele 3D dla wyglądu Wartowników. Przeglądarka: scenariusz Wartownikami — renderer 3D i Canvas, przyciski Umiejętność i Scal, Skok przez ⇧Q, scalenie z efektem szczeliny.

**Kryterium ukończenia:** Wartownicy grywalni w scenariuszach i grze sieciowej, z własnymi modelami 2D i 3D; pięć rozdziałów do przejścia na każdym poziomie trudności kampanii, wynik X wpływa na XI, decyzje VIII, XII i XIII zmieniają kolejne rozdziały i epilog, testy i symulacje przechodzą.
