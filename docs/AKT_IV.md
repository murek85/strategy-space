# Akt IV kampanii „Inwazja” — plan (2026-10-08), ukończony w wersji 0.160 (2026-10-09)

**Stan:** wszystkie kroki (H1–H7) zrealizowane — opisy wdrożenia niżej, od najnowszego (H7) do najstarszego (H3). Odstępstwa od planu: Kuźnia Fazowa jako dwie budowle (H3), rozdział XIII na planecie zamiast w kosmosie (H5), szczeliny w XIV zamykane okrętami zamiast wież (H6).

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
| H4 | Rozdział XII: konwój, Twierdza, Wartownicy, decyzja | **0.157 — ukończony** |
| H5 | Rozdział XIII: odwrócona inwazja, szczeliny, decyzja o Vok | **0.158 — ukończony** |
| H6 | Rozdział XIV: finał przy Bramie; sceny łączności aktu, prolog i epilog | **0.159 — ukończony** |
| H7 | Symulacje balansu rozdziałów, testy, dokumentacja | **0.160 — ukończony** |

## Poprawki kampanii z przeglądu gry (wersja 0.171.12, 2026-10-10)

- **Kapsuły X → XI:** `campaignCarry` zapisuje liczbę już ograniczoną do limitu XI (`carriedPods`: od `INVASION.minPods` do `TUNE.colony11.drop.cap` = 6) — epilog X i odprawa XI obiecywały 8, a XI dawało 6. Teksty bez odmiany liczebnika („kapsuły desantowe: 3”; było „3 kapsuł”).
- **Decyzja „stocznia” (XII → XIII):** Vok traci ok. jedną trzecią kapsuł (`max(1, round(n × 0,3))`: 4 → 3, na trudnym 7 → 5; było 3 mniej, co zostawiało 1), a jej uderzenia z orbity ładują się o 35% dłużej przez cały rozdział (było jednorazowe 60 s, choć radio mówiło o wolniejszym ładowaniu).
- **Technicy z Hefajstosa** — jedna wersja: ludzie Dominium zmuszeni do pracy w kompleksie. Po ewakuacji zostają z Koloniami i przebudowują Hefajstos (Varn jest wdzięczny, że żyją); po zniszczeniu wybuch przeżywają Koss i dwoje techników (epilog VI, finał), reszta ginie. Prolog aktu III nie mówi już, że „odlecieli” do Dominium.
- **Propozycja Varna (VIII):** „bastiony i pierwszeństwo przy stacji orbitalnej (uderzenie ładuje się szybciej)” zamiast „pełnego dostępu do stacji”, który w IX jest i tak.
- **Akt IV:** Vok w XI mówi o Wypalonej Dolinie (nie o „Horyzoncie”); Lira w XII — że Admiralicji zostanie flota i ostatnia kwatera na Nivalis; epilog XII — garnizon Varna staje obok Kolonii na Nivalis (ludzie i bateria, nie okręty „nad Glacjalis”); cel XIV wszędzie „Brama” (było też „Rdzeń Wartowników”); tytuł epilogu z Varnem u boku: „Z VARNEM U BOKU” (było „SAMI PRZECIW CIEMNOŚCI”).
- **Odprawa XIV:** blok „Sojusznicy przy Bramie” — okręty Varna (z VIII albo XII), flota Vok albo metal po klęsce Admiralicji, i uwaga, że na trudnym poziomie sojusznicy mogą przesądzić o bitwie.
- **Prolog aktu II:** nie wymienia Hefajstosa ani Vulkana IX przed rozdziałem V („ślad z archiwum”), nie mówi o prądzie na Khepri IV (akt I toczy się na Eos, Vesperze i Nadirze); w akcie III odłamek jest z artefaktu Hefajstosa (nie „z Khepri”).
- **Drobne:** barwy Dominium dla fregaty Varna w X i bastionów z zaufania w IX; licznik Szczytu w VIII i chwila propozycji Varna liczą najlepszy czas strony (czas Varna też wygrywa rozdział); opis premii za ewakuację (pancerz, broń plazmowa albo 300 metalu) i skutku jeńców; „III · Świt nad Nadirem”, „Ty/Twoich”, nazwy decyzji na kartach rozdziałów z wielką literą nazw własnych („rozejm z Vok”); notatki w kodzie i w tym dokumencie zgodne z kodem (zamykanie szczelin 30 s, fale co 120 s, kapsuły Vok 4/4/7, decyzja o Hefajstosie w akcie II).

## Nowy film finału — co stało się na koniec (wersja 0.170, 2026-10-09)

Film finału (`campaign-finale.js`) opowiada teraz, co stało się po zamknięciu Bramy: 13 ujęć o własnych długościach (`LENGTHS`), razem 122 s (ok. 2 minut). Napisy i część obrazów zależą od decyzji kampanii (`prepare(choices)`).

| # | Ujęcie | Czas | Co widać | Zależy od |
|---|---|---|---|---|
| 1 | Brama gaśnie | 10 s | Brama pęka i wpada w czarną dziurę Erebus, Wartownicy gasną, integralność spada do zera | — |
| 2 | Szczeliny się zamykają | 9 s | pięć szczelin na pograniczu zamyka się po kolei | — |
| 3 | Powrót z Erebusa | 9 s | flota Kolonii wraca | XIII: okręty Vok obok (rozejm) albo dymiące wraki Admiralicji (klęska); VIII/XII: fregata Varna |
| 4 | Eos | 10 s | flota nad Eos, doki pracują, promy schodzą na planetę | — |
| 5 | Latarnia | 9 s | Lira w Stacji Ciszy zapala latarnię — ciemną wieżę z prologu; światło biegnie po latarniach horyzontu | — |
| 6 | Hefajstos | 9 s | ruiny w popiele i żarze albo odbudowany kompleks zasilający Kolonie | VI (akt II): popiół / wdzięczność Dominium |
| 7 | Serce Roju | 10 s | uśpione Serce pod magmą, stacja badawcza dr Tessy | — |
| 8 | Rada rozejmu | 9 s | holostół z godłami Kolonii, Dominium i Admiralicji, podpisy | VIII/XII: Varn przy stole albo puste miejsce; XIII: Vok podpisuje albo Admiralicji nie ma |
| 9 | Sieć pogranicza | 9 s | osiem światów połączonych światłem | — |
| 10 | Ludzie pogranicza | 9 s | portrety; losy bohaterów w napisie | decyzje (Koss, Varn, Vok) |
| 11 | Twoje decyzje | 10 s | dziennik dowódcy: decyzje z rozdziałów I, III, VI, VIII, XII, XIII | decyzje |
| 12 | Szlaki | 9 s | konwój kpt. Vale pod zapalonymi latarniami — jak w prologu | — |
| 13 | Koniec kampanii | 10 s | świt nad kotliną Eos, latarnia świeci, tytuł „Pogranicze Galaktyki · Koniec kampanii” | XIII/VIII: okręt Dominium obok floty |

- Film korzysta z elementów prologu (wieża latarni, Stacja Ciszy, noc nad Eos — `CampaignFilm.kit`), więc zaczyna i kończy kampanię w tym samym miejscu: przy latarni, ciemnej w prologu i zapalonej w finale.
- Muzyka: tryb `finale` (`audio.js`, `finaleStep`), części na ujęciach filmu (`FINALE`, sekundy) — [AUDIO.md](AUDIO.md).
- Pasek postępu i podpis („Finał kampanii · ok. 2 minuty”) biorą długość z filmu. Test (`tests/act4.test.js`): 13 ujęć, 122 s, napisy powrotu, Hefajstosa, rady i ludzi różne dla różnych decyzji.

## Balans rozdziału XIII (wersja 0.166.2, 2026-10-09)

**Diagnoza.** Bot przegrywał XIII na średnim (porażka po ok. 15 min, na starej i nowej mapie) i nigdy nie uszkodził kwatery Vok, więc decyzja „rozejm czy klęska” (przy 35% kwatery) w ogóle się nie pojawiała. Dwie przyczyny:
1. **Bot** — natarcie to ruch z atakiem na punkt przy celu; jednostki w takim ruchu walczą z jednostkami i wieżami, ale nie atakują samego budynku. Po rozbiciu obrońców armia stała bezczynnie przy nietkniętej kwaterze, aż odbudowane wieże ją wykończyły. Poprawka (`tools/act4-sim.js`, `assault`): gdy przy celu nie ma już uzbrojonych obrońców ani wież, jednostki w promieniu 500 atakują go bezpośrednio.
2. **Rozdział** — na średnim desant trwał dłużej niż na łatwym (5 kapsuł), więc Vok zdążyła rozbudować bazę (fabryka, 5–6 wież, uplink dowódcy AI z własnymi uderzeniami), a uderzenia z orbity trwały także po desancie.

**Strojenie (`RTS.ACT4_TUNE.colony13`).**
- Kapsuły Vok na średnim: 5 → 4 (jak na łatwym; trudny bez zmian — 7).
- Armia dowódcy Vok: ×0,7 → ×0,62.
- Łatwy i średni: dowódca Vok stawia najwyżej 2 wieże i nie buduje uplinku (`aiTurrets`), a po desancie uderzenia z orbity ustają (flota wyczerpana — Lira to ogłasza); na trudnym nadal co 300 s (`strikesAfter`).
- Cel dodatkowy według poziomu: zestrzel 2 kapsuły (trudny — 3), nie więcej niż kapsuły Vok minus jedna (po spalonej stoczni z XII na łatwym i średnim: 1).

**Wyniki** (`node tools/act4-sim.js`, cały akt, bot z poprawką; decyzja XIII — rozejm):

| Rozdział | Łatwy | Średni | Trudny |
|---|---|---|---|
| X · Blokada Eos | zwycięstwo 2:28 ◆ | zwycięstwo 4:05 | zwycięstwo 8:43 |
| XI · Kapsuły nad Eos | zwycięstwo 2:20 ◆ | zwycięstwo 2:46 ◆ | porażka 8:02 |
| XII · Twierdza Admiralicji | zwycięstwo 2:33 ◆ | zwycięstwo 2:51 ◆ | porażka 9:53 |
| XIII · Ostatnia orbita | zwycięstwo 5:00 | zwycięstwo 14:22 | porażka 10:58 |
| XIV · Brama | zwycięstwo 2:42 ◆ | zwycięstwo 3:02 ◆ | zwycięstwo 6:34 ◆ |

XIII z decyzją „walcz do końca”: łatwy — zwycięstwo 5:02, średni — zwycięstwo 14:28. Wszystkie rozdziały do przejścia na łatwym i średnim; XIII na średnim pozostaje najdłuższym i najtrudniejszym rozdziałem aktu.

## Nowa mapa XIII (wersja 0.165, 2026-10-09)

Rozdział XIII toczy się wśród Kryształowych Grzbietów na Nivalis (dotąd Biały Przesmyk — ta sama mapa co w VIII). Po M1–M4 każdy rozdział kampanii ma inny teren. Symulacja i uwaga o średnim poziomie: [MAPY_TEMATYCZNE.md](MAPY_TEMATYCZNE.md).

## Nowa mapa X (wersja 0.164, 2026-10-09)

Rozdział X toczy się w Dokach Eos — orbitalnej stoczni Kolonii nad pustynną Eos, zajętej przez blokadę Admiralicji (dotąd Orbita Kharona). Opis i symulacja: [MAPY_TEMATYCZNE.md](MAPY_TEMATYCZNE.md).

## Nowe mapy XI i XII (wersja 0.163, 2026-10-09)

Rozdział XI toczy się w Wypalonej Dolinie (Dolina Latarni z rozdziału I po desancie), XII — w Bastionie Admiralicji (dwa bastiony za murami z bramami). Obie mapy: `campaign-maps.js`, bazy na stałych miejscach (`RTS.CAMPAIGN_MAPS`). Opis i wyniki symulacji: [MAPY_TEMATYCZNE.md](MAPY_TEMATYCZNE.md).

## Finał kampanii (wersja 0.161, 2026-10-09)

Po zwycięstwie w rozdziale XIV raport końcowy (app.js `showEnd`) ma przycisk „FINAŁ KAMPANII ▶”. Otwiera ekran menu `finale`, który odtwarza film `FinaleFilm` (`campaign-finale.js`, zestaw `CampaignFilm.kit`; od 0.170 — 13 ujęć, ok. 2 minut, opis wyżej; wersja 0.161 miała 40 s i osiem ujęć po 5 s):

1. Latarnie Eos (akt I). 2. Hefajstos — płonący albo z ewakuowanymi myśliwcami (decyzja aktu II). 3. Wygaszone Serce Roju. 4. Rozbita Brama przy Erebusie (`Act4Film.parts.blackHole`). 5. Holomapa ośmiu światów. 6. Losy bohaterów (portrety Liry, Tessy, Vale’a, Kossa, Varna oraz Vok przy rozejmie). 7. Lista podjętych decyzji (nazwy z `RTS.CAMPAIGN_DECISIONS`). 8. Świt — „POGRANICZE GALAKTYKI / KONIEC KAMPANII”.

`FinaleFilm.prepare(choices)` buduje napisy według wyborów z `CampaignProgress`. Muzyka (od 0.168.3): własny motyw zwycięstwa w stylu „Interstellar”, zsynchronizowany z ujęciami — [AUDIO.md](AUDIO.md). Po ukończeniu XIV ekran kampanii ma przycisk „Finał kampanii” (na końcu listy rozdziałów) do ponownego obejrzenia; „Zakończ film” wraca do kampanii.

## H7 — symulacje balansu i strojenie (wersja 0.160, 2026-10-09)

**Narzędzie.** `node tools/act4-sim.js [--levels easy,normal,hard] [--chapters colony10,…] [--decision truce|rout] [--minutes 30] [--trace]` — bot gracza w każdym rozdziale: roboty przy rudzie (do 8), produkcja ze wszystkich budynków (drugie koszary i fabryka, gdy zbiera się metal), wieże przy bazie (w XIII na zmianę z bateriami przeciwlotniczymi), stała obrona bazy (jedna trzecia armii), natarcie dwiema grupami z boków. Cele: X — flota razem, natarcie od 14 jednostek albo od 7. minuty; XI — desant, uderzenia z orbity w grupy wroga, dwa przekaźniki, potem baza; XII — technik za armią do stacji, decyzja „garnizon”, uderzenia z uplinku, szturm od 28 jednostek; XIII — obrona do końca desantu, potem szturm, decyzja z `--decision`; XIV — szczeliny po kolei, potem Brama. Decyzje: VIII zaufanie, XII garnizon. `--trace` co 10 s: centra, armie, metal, budynki, kolejka.

**Co pokazały pierwsze symulacje** (i co z tego poprawiono):
- Dowódca AI w X i XI miał na starcie kilka jednostek, a bot w 1,5–2 minuty zbierał 30–36 jednostek (w XI 7 kapsuł od pierwszej sekundy) i niszczył bazę → **garnizony i wieże według poziomu** (`RTS.ACT4_TUNE`), wytrzymalsze centrum w X i XI (×2,2), w XI pierwszy desant po 90 s, kapsuły co 55 s, najwyżej 6 z floty.
- Dowódca AI brał garnizony i straż szczelin do swoich zadań — w XIV na trudnym fregaty z garnizonu Bramy szły na przekaźnik przy bazie gracza i niszczyły ją w 76 s → **rola „guard”**: garnizony i straż stoją na miejscu (bronią się w zasięgu), dowódca ich nie przydziela.
- XII na średnim: Twierdza z doktryną Silniejsze osłony była nie do ruszenia (natarcia ginęły, zanim tknęły centrum) → **doktryna Twierdzy tylko na trudnym**, armia jej dowódcy ×0,7, wieże według poziomu.
- XIII: uderzenia Vok z orbity w nacierające grupy i wąska przełęcz Białego Przesmyku → **kapsuły Vok według poziomu** (4/4/7), pierwsza kapsuła i pierwsze uderzenie po 150 s, kapsuły co 100 s, uderzenia co 180 s, a po desancie (flota wyczerpana) co 300 s; armia jej dowódcy ×0,7, ataki rzadsze (×1,2) i mniejsze (×0,85).
- XIV: szczeliny zamykane za szybko → straż według poziomu, zamykanie 30 s, fale co 120 s (od 100 s; fregaty od 8. minuty), Brama ×3, garnizon Bramy.
- `invasion-rules.js`: odstępy desantu, uderzeń i desantu dowódcy AI mogą być ustawione przez rozdział (`dropCooldown`, `strikeCooldown`, `aiDropEvery`).

**Wyniki końcowe** (bot, do 30 min; decyzja XIII — rozejm):

| Rozdział | Łatwy | Średni | Trudny |
|---|---|---|---|
| X · Blokada Eos | zwycięstwo 2:36 ◆ | zwycięstwo 3:55 | porażka 8:35 |
| XI · Kapsuły nad Eos | zwycięstwo 2:20 ◆ | zwycięstwo 2:45 ◆ | porażka 9:18 |
| XII · Twierdza Admiralicji | zwycięstwo 2:36 ◆ | zwycięstwo 3:20 ◆ | porażka 7:46 |
| XIII · Ostatnia orbita | zwycięstwo 5:04 | zwycięstwo 16:52 | porażka 9:47 |
| XIV · Brama | zwycięstwo 2:46 ◆ | zwycięstwo 3:02 ◆ | zwycięstwo 6:34 ◆ |

XIII z decyzją „walcz do końca”: łatwy — zwycięstwo 5:05, średni — zwycięstwo 16:59.

**Ocena i ograniczenia.** Bot to agresywny gracz masą taniej piechoty i statków: na łatwym i średnim kończy rozdziały szybko (2–4 min), bo wczesna masa jednostek jest w silniku bardzo silna wobec dowódcy AI — to cecha całej gry, nie tylko aktu IV. Na trudnym przegrywa X–XIII, bo nie umie przełamać umocnionej bazy (natarcia w kupie, przełęcz w XIII, limit 60 jednostek przy kilku tysiącach metalu w zapasie). Kryterium aktu („pięć rozdziałów do przejścia na każdym poziomie”) bot spełnia na łatwym i średnim; trudny wymaga sprawdzenia w prawdziwych rozgrywkach — wartości do dalszego strojenia są w `RTS.ACT4_TUNE`.

**Testy** (`tests/act4.test.js`, 12): poprzednie 10 (zaktualizowane do strojenia) oraz: garnizony rosną z poziomem w każdym rozdziale, tempo desantu w XI, limit kapsuł z floty, kapsuły Vok według poziomu, doktryna Twierdzy tylko na trudnym, mniejsza armia dowódcy Twierdzy; test dymny — każdy rozdział na każdym poziomie przez 2 minuty bez błędów i bez przedwczesnego końca.

## H6 — rozdział XIV, prolog i epilog (wersja 0.159, 2026-10-09)

**XIV · Brama** (Wrota Pustki, Erebus; przeciwnik — dowódca AI Wartowników). Trzy szczeliny rozstawione między Bramą a bazą gracza (w 42% drogi, w rozstawie ±0,75 rad), każda ze strażnikami (korweta i fregata, na poziomie trudnym także niszczyciel); otwarta szczelina wypuszcza falę co 120 s (od 0.160; pierwotnie 140 s) (od 2. minuty: dwie korwety, od 10. minuty także fregata), idącą na najbliższą budowlę gracza. Brama to centrum Wartowników (nazwa „Brama”): dopóki choć jedna szczelina jest otwarta, nie można jej namierzyć ani zranić (także obrażeniami obszarowymi i uderzeniem orbitalnym). Znaczniki szczelin z postępem zamykania na planszy.

**Odstępstwo od planu.** Plan mówił o zamykaniu szczelin wieżami. W kosmosie budowa zależy od strefy przy stacjach, więc szczelinę zamyka utrzymanie przy niej własnych okrętów (do 170) przez 30 s (od 0.160; pierwotnie 20 s) bez wrogich jednostek w promieniu 260 — postęp cofa się, gdy szczelina jest sporna.

**Sojusznicy z decyzji.** Rozejm w XIII — 2 fregaty i krążownik Vok; zaufanie w VIII albo ocalony garnizon w XII — fregata i korweta Varna (z jego komunikatem); klęska Admiralicji — 600 metalu. Cel dodatkowy: zwycięstwo przed 25. minutą. Epilog rozdziału według decyzji.

**Prolog aktu IV** (`act4-film.js`, 4 ujęcia po 5 s): blokada Admiralicji nad Eos, odpowiedź artefaktu na nieznany sygnał, szczelina i Wartownicy, Brama przy czarnej dziurze z tytułem aktu. Odtwarzany raz przed rozdziałem X (z listy rozdziałów i po przycisku „Akt IV: Inwazja →” w raporcie IX) oraz z przycisku „Prolog aktu IV” w menu kampanii.

**Epilog aktu IV** (`epilogue-films.js`, po zwycięstwie w XIV): Brama pęka i gaśnie, szczeliny zamykają się na pograniczu, powrót nad Eos — Kolonie z flotą Vok (rozejm) albo same, z Varnem (zaufanie w VIII lub ocalony garnizon w XII) albo bez niego — i tytuł „Inwazja odparta · Koniec aktu IV”.

**Weryfikacja.** `tests/act4.test.js` (+1, 1 zmieniony): szczeliny, strażnicy i fale, osłona Bramy (namierzanie i obrażenia), zamykanie przez utrzymanie, zwycięstwo, sojusznicy i epilog. Przeglądarka: klatki prologu i epilogu (wariant rozejm + Varn), przycisk prologu w menu, rozdział XIV (cele, sojusznicy, znaczniki szczelin, osłonięta Brama).

## H5 — rozdział XIII (wersja 0.158, 2026-10-09)

**Odstępstwo od planu.** Plan zakładał XIII na mapie kosmicznej (Pierścienie Glacjalis) z okrętem flagowym Vok. Odwrócona inwazja to jednak kapsuły desantowe, a te spadają na planetę — dlatego rozdział toczy się na Białym Przesmyku (Nivalis) pod orbitą Vok (pierścienie Glacjalis są tłem opowieści i sceny łączności), a celem jest kwatera Vok na planecie zamiast okrętu flagowego.

**Przebieg.** Faza planety Inwazji z orbitą po stronie Admiralicji (właściciel orbity — drużyna 1, 8 kapsuł): dowódca AI zrzuca kapsuły od 2. minuty co 90 s, uderza z orbity w skupione grupy i skanuje armię gracza (`invasion-rules.js`). Gracz zaczyna z baterią przeciwlotniczą. Cele: przetrwać desant — kapsuły Vok wyczerpane i wylądowane albo 10 minut; pokonać Vok — zniszczyć kwaterę. Cel dodatkowy: zestrzelić 3 kapsuły Vok (licznik `act4.enemyShot`). Szczeliny Wartowników w 5,5. i 11,5. minucie.

**Decyzja z XII w XIII** (na planecie zamiast floty): garnizon — 2 niszczyciele, bastion i druga bateria przeciwlotnicza Varna; stocznia — Vok ma 3 kapsuły mniej, uderzenie z orbity później o 60 s, kwaterę o 25% słabszą.

**Decyzja XIII** (`RTS.CAMPAIGN_DECISIONS.colony13`): gdy kwatera Vok spadnie poniżej 35% — rozejm (rozdział od razu wygrany; w XIV 2 fregaty i krążownik Vok po stronie gracza) albo walka do końca (w XIV 600 metalu więcej). Wybór w postępie kampanii, w odprawie XIV i w epilogu XIII.

**Weryfikacja.** `tests/act4.test.js` (+2, 1 zmieniony): orbita Vok, desant przetrwany, zestrzelone kapsuły, rozejm kończący rozdział i klęska, skutki decyzji XII w XIII i XIII w XIV. Przeglądarka: odprawa ze skutkiem decyzji XII, rozdział XIII (panel orbity wroga, baterie, oddziały Varna, cele), okno rozejmu, raport rozdziału, zapis wyboru.

## H4 — rozdział XII (wersja 0.157, 2026-10-09)

**Twierdza.** Na starcie (każdy poziom): centrum Admiralicji jako Twierdza (×1,5 wytrzymałości), doktryna Silniejsze osłony, trzy wieżyczki i bateria przeciwlotnicza od strony mapy; patrole i eskorty dowódcy co najmniej po jednym (`aiLevel` dla XII).

**Konwój.** Technik (postać z aktu II) z eskortą dwóch czołgów; stacja uplink stoi na wolnym terenie w 42% drogi do Twierdzy, oznaczona na planszy (znaczniki `act2.beacons`, `act2-art.js` — nowy, ogólny mechanizm dla kolejnych rozdziałów). W połowie drogi zasadzka Admiralicji od strony Twierdzy (czołg, piechota, rakietowiec; więcej na poziomie średnim i trudnym). Technik w odległości 90 od stacji: uplink (wygląd Dominium, uderzenie orbitalne) i reaktor są gracza. Śmierć technika przed stacją kończy rozdział porażką. Zwycięstwo: uplink i zniszczona Twierdza (Twierdza zniszczona wcześniej — zwycięstwo czeka na uplink).

**Wartownicy.** Szczeliny w 5., 12. i 19. minucie (jak w XI: drużyna 4, cele po obu stronach).

**Decyzja** (`RTS.CAMPAIGN_DECISIONS.colony12`, okno i zapis jak dotychczasowe decyzje kampanii): po uruchomieniu uplinku Varn prosi o ratunek dla garnizonu. Ratunek — od razu 2 niszczyciele i bastion Varna, w XIII 2 niszczyciele, bastion i druga bateria przeciwlotnicza (w wyglądzie Dominium; po H5/H7 XIII toczy się na ziemi). Stocznia — dowódca Admiralicji traci 500 metalu, w XIII Vok ma ok. jedną trzecią kapsuł mniej (od 0.171.12; wcześniej 3 mniej), uderzenia z orbity ładują się o 35% dłużej, a kwatera jest o 25% słabsza. Skutek w odprawie XIII, w epilogu XII i na karcie rozdziału (karty pokazują teraz nazwę każdej decyzji).

**Poprawki przy okazji.** Dowódca AI włączał się w kampanii tylko dla aktu III (`enemy-ai.js`, `teams-rules.js`: `act === 3`) — w X i XI (0.156) Admiralicja nie budowała, nie zbierała i nie atakowała według poziomu, a w XI nie stawiała baterii przeciwlotniczych; teraz akt III i dalsze. Zdarzenia „raz na sekundę” aktu IV liczone z zapamiętanej sekundy (`floor(time − dt)` potrafiło przez zaokrąglenie pominąć sekundę).

**Weryfikacja.** `tests/act4.test.js` (+2): Twierdza, doktryna, wieże, patrole i eskorty; konwój z zasadzką, uplink i reaktor; zwycięstwo dopiero z uplinkiem; decyzja i zapis wyboru; porażka po śmierci technika; garnizon dołącza; trzy szczeliny; skutki decyzji w XIII. Przeglądarka: rozdział XII — cele, znacznik stacji, komunikaty, technik do stacji, okno decyzji, garnizon Varna w kolumnie.

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
