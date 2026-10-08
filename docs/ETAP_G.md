# Etap G — plan: AI nowych mechanik, desant z orbity, aplikacja Electron, sieć dla wielu graczy

Plan z 2026-10-08 (wersja 0.149.4). Cztery etapy, każdy podzielony na kroki; każdy krok kończy się działającą wersją (podbicie numeru, testy, „Co nowego”). Kolejność etapów wynika z zależności i ryzyka: najpierw to, co od razu poprawia każdą bitwę, na końcu to, co wymaga infrastruktury.

| Etap | Zakres | Kroki | Szacunek | Zależności |
|---|---|---|---|---|
| G1 | AI używa Twierdzy, doktryn, patroli i eskorty | 4 | 4 wersje | brak |
| G2 | Desant z orbity | 4 | 4–5 wersji | G1 (AI musi umieć desant) |
| G3 | Aplikacja Electron | 3 | 3 wersje | brak (może iść równolegle) |
| G4 | Lobby, ponowne dołączenie, 2 na 2 przez sieć | 5 | 5–6 wersji | decyzja o serwerze; G3 ułatwia LAN |

---

## G1 — AI używa nowych mechanik

**Ukończony w wersji 0.150 (2026-10-08)** — wszystkie cztery kroki w jednej wersji; opis wdrożenia i wyniki symulacji w [AI przeciwnika](AI_PRZECIWNIKA.md).

Stan: dowódca AI (`enemy-ai.js`, `campaign-ai.js`) buduje, produkuje, atakuje i ma styl frakcji, ale nie bada Twierdzy ani doktryn (`doctrine-rules.js` — „Human sides only”), nie patroluje i nie eskortuje (`patrol-rules.js`).

**G1.1 — Twierdza i doktryny w rękach AI** (0.150)
- `doctrine-rules.js`: zdjąć ograniczenie „tylko człowiek”; `researchStatus` / `startResearch` działają dla strony AI przez `as(drużyna)`.
- `enemy-ai.js`: w planie rozbudowy — Twierdza po Kolonii, gdy dochód i armia to pozwalają (próg zależny od trudności); wybór doktryny wg stylu frakcji i sytuacji (np. Kolonie: Fortyfikacja w obronie, Logistyka przy przewadze; Dominium: Ciężki ostrzał przy dużej flocie pojazdów, Osłony przy przegrywaniu walk; Rój: Nawała / Pancerz).
- Interfejs: komunikat wywiadu „Przeciwnik przyjął doktrynę …”, gdy gracz ma rozpoznanie jego centrum.
- Testy: AI dochodzi do Twierdzy w symulacji 15 min na trudności normalnej; wybiera doktrynę swojej frakcji; łatwa AI później lub wcale.

**G1.2 — Patrole AI** (0.150.1)
- Oddział obrony bazy patroluje między centrum a najbliższym przekaźnikiem / złożem zamiast stać; drugi patrol wokół wysuniętych przekaźników.
- Przejście z patrolu do obrony na alarm bazy (dziś AI ściąga obrońców rozkazem ruchu).
- Testy: patrol AI zatrzymuje wrogiego zwiadowcę przy przekaźniku; patrol nie zostawia bazy pustej przy ataku.

**G1.3 — Eskorta AI** (0.150.2)
- Eskorta robotów przy wysuniętym wydobyciu i transporterów / ciężkich maszyn w natarciu (osłona przed piechotą); w kosmosie fregaty przy lotniskowcu i krążowniku.
- Eskorta kończy się, gdy chroniony wraca do bazy lub ginie (gotowe w `patrol-rules.js`).
- Testy: nalot na eskortowane wydobycie traci więcej niż na nieeskortowane.

**G1.4 — Strojenie i symulacje** (0.150.3)
- Symulacje AI kontra AI (node, bez renderera) na wszystkich mapach scenariuszy: czy doktryny nie dają jednej frakcji przewagi, czy trudności nadal się różnicują.
- Opis w [AI przeciwnika](AI_PRZECIWNIKA.md).

**Kryterium ukończenia:** w bitwie przeciw AI na trudności normalnej przeciwnik w ciągu ~15 min ma Twierdzę i doktrynę, broni się patrolami i eskortuje wydobycie; testy i symulacje przechodzą.

---

## G2 — Desant z orbity

**Ukończony w wersji 0.152 (2026-10-08)** — wariant dwufazowy, wszystkie kroki w jednej wersji; opis w [Desant z orbity](DESANT_Z_ORBITY.md). Odstępstwo: kapsuły wynikają z ocalałej floty zamiast osobnego statku-transportowca; rozdział kampanii — nie (osobna decyzja).

Stan: bitwa na orbicie (mapy kosmiczne, stacje, statki) i bitwy naziemne są osobnymi misjami. Uderzenie orbitalne (`uplink`) już istnieje na ziemi.

**G2.1 — Projekt i reguły** (0.151)
- Jedna operacja = dwie plansze: orbita i planeta pod nią. Wariant prosty (rekomendowany na start): **operacja dwufazowa** — najpierw bitwa na orbicie, jej wynik przechodzi na mapę naziemną: kto panuje na orbicie, ma desant i wsparcie, przegrany zaczyna z mniejszą bazą. Wariant pełny (później): obie plansze naraz z przełączaniem widoku — znacznie droższy (dwie symulacje w lockstepie, interfejs).
- Nowe pola: `game.orbit = { owner, transports, support }` przekazywane między fazami.
- Dokument `docs/DESANT_Z_ORBITY.md`.

**G2.2 — Transportowiec desantowy i strefa lądowania** (0.151.1)
- Statek „Transportowiec desantowy” (stocznia ciężka): zabiera piechotę / pojazdy z puli desantu; na mapie naziemnej — kapsuły desantowe spadające w wybrany punkt (poza zasięgiem wrogich wież przeciwlotniczych), krótka bezbronność po lądowaniu.
- Grafika 2D i 3D: smuga wejścia w atmosferę, wybuch kapsuły, dym; dźwięk.
- Testy: lądowanie tylko w odkrytym, wolnym terenie; flak zestrzeliwuje część kapsuł.

**G2.3 — Panowanie na orbicie** (0.151.2)
- Strona panująca: uderzenie orbitalne bez budynku `uplink` (z dłuższym odnowieniem), rozpoznanie (odsłanianie fragmentu mapy co jakiś czas), posiłki z orbity.
- Strona bez orbity: brak desantu, zakłócony radar (minimapa z opóźnieniem).

**G2.4 — Scenariusz i AI** (0.151.3)
- Nowy tryb scenariusza „Inwazja” (orbita → planeta) dla 1 gracza z AI; AI planuje desant i broni się przed nim (zależy od G1).
- Opcjonalnie rozdział kampanii (akt IV) — osobna decyzja.

**Kryterium ukończenia:** operacja „Inwazja” rozgrywalna od orbity do lądowania z AI po obu stronach, zapis i wczytanie między fazami, testy reguł desantu.

---

## G3 — Aplikacja Electron

**Ukończony w wersji 0.151 (2026-10-08)** — wszystkie trzy kroki w jednej wersji; opis w [Aplikacja na Windows](APLIKACJA.md). Bez podpisu kodu i automatycznych aktualizacji (decyzje właściciela — patrz opis).

Stan: gra to statyczna strona (`index.html`) z lokalnymi bibliotekami (`vendor/`: three, pixi, tone) i serwerem `server.js` tylko do podglądu; z `file://` renderer 3D ładuje `webgl3d/bundle-3d.js` zamiast modułów ES — gra działa bez internetu.

**G3.1 — Okno aplikacji** (0.152)
- `electron/main.js`: okno bez paska menu, pełny ekran (F11), minimalny rozmiar 1280×720, ładowanie `index.html` z dysku; zablokowana nawigacja poza aplikację i nowe okna; `contextIsolation`, bez `nodeIntegration`.
- `package.json`: `electron` w `devDependencies`, skrypt `npm run app`.
- Zapisy (`localStorage`) trwają w katalogu danych aplikacji; ikona.
- Sprawdzenie: kampania, scenariusz, 3D, dźwięk, zapis / wczytanie po restarcie aplikacji.

**G3.2 — Instalator Windows** (0.152.1)
- `electron-builder`: instalator NSIS i wersja przenośna (`.exe`), nazwa „Pogranicze Galaktyki”, wersja z `package.json`, pliki testów i narzędzi poza paczką.
- Opcjonalnie podpis kodu (wymaga certyfikatu — decyzja).

**G3.3 — Dopracowanie** (0.152.2)
- Ustawienia aplikacji: pełny ekran / okno, rozdzielczość renderu, wyłączenie V-Sync; zapamiętanie rozmiaru okna.
- Eksport / import zapisów do pliku (kopia zapasowa).
- Opcjonalnie automatyczne aktualizacje (`electron-updater`, wymaga miejsca publikacji — decyzja).

**Kryterium ukończenia:** instalator `.exe` instaluje grę, która działa bez internetu, z zapisami trwałymi między uruchomieniami.

---

## G4 — Sieć: lobby, ponowne dołączenie, 2 na 2

**Ukończony w wersji 0.153 (2026-10-08)** — wszystkie kroki w jednej wersji; opis w [Gra wieloosobowa](MULTIPLAYER.md). Decyzja o serwerze: wariant (c) — jeden serwer lobby w czystym Node, który działa w `npm start`, osobno (`npm run lobby`, sieć lokalna), w aplikacji Windows na żądanie, i który można wystawić w internecie. Odstępstwo: tury idą przez serwer (gwiazda z serwerem w środku), a nie przez gospodarza — serwer i tak istnieje, trzyma dziennik do powrotu i nie wymaga połączeń WebRTC między wszystkimi.

Stan: WebRTC bez serwera — gracze wymieniają kody zaproszenia ręcznie; tylko 2 graczy; zerwanie połączenia kończy bitwę; lockstep z sumami kontrolnymi działa (`netplay.js`, `network-rules.js`).

**Decyzja przed startem (wymaga właściciela projektu):** gdzie działa lobby.
- (a) **Serwer sygnalizacji w internecie** (mały serwer Node z WebSocket, np. na VPS / Render / Fly.io): lista gier dla wszystkich, krótkie kody, pośrednik TURN dla trudnych sieci. Wymaga hostingu i utrzymania.
- (b) **Lobby w sieci lokalnej** (Electron z G3 uruchamia serwer w tle, wykrywanie przez UDP): bez kosztów, ale tylko LAN.
- (c) Oba: LAN od razu, serwer później.

**G4.1 — Serwer sygnalizacji i lobby** (0.153)
- `lobby-server.js` (Node, WebSocket): rejestracja gry (nazwa, mapa, tryb, miejsca), lista gier, dołączanie, przekazywanie ofert / odpowiedzi WebRTC; bez przechowywania danych gry. Limity i ochrona przed nadużyciami.
- `netplay-menu.js`: ekran „Lista gier” (odświeżanie, filtr, dołącz), „Utwórz grę”; ręczne kody zostają jako zapas.

**G4.2 — Ponowne dołączenie** (0.153.1)
- Gospodarz przechowuje dziennik tur (rozkazy + ziarno). Po zerwaniu: bitwa zatrzymuje się na wspólnej pauzie (do 90 s), strona rozłączonego może zostać przejęta przez AI (opcja lobby).
- Powracający gracz łączy się ponownie (przez lobby lub nowy kod), dostaje ziarno i dziennik, odtwarza bitwę w przyspieszeniu (symulacja deterministyczna) i dołącza do lockstepu; zgodność potwierdza suma kontrolna.
- Testy: rozłączenie w 3. minucie, powrót, identyczne sumy kontrolne przez kolejne 3 minuty; przejęcie przez AI i oddanie z powrotem.

**G4.3 — Lockstep dla wielu graczy** (0.153.2)
- Topologia gwiazdy: gospodarz zbiera tury wszystkich i rozsyła komplet (prostsza i odporniejsza niż sieć każdy z każdym); kolejność rozkazów wg numeru drużyny.
- `network-rules.js`: `createNetworkGame` dla 3–4 graczy, drużyny i sojusze (reguły z `teams-rules.js`), wspólna mgła sojuszników.
- Testy: 4 symulowane klienty z opóźnieniami, identyczne sumy kontrolne.

**G4.4 — 2 na 2 w lobby i interfejsie** (0.153.3)
- Lobby: miejsca w drużynach, przenoszenie graczy, AI na wolnym miejscu (gracz + AI przeciw 2 ludziom).
- W bitwie: kolory drużyn, czat drużynowy i ogólny, znaczniki na minimapie dla sojusznika („Atakuj tu”, „Pomocy”), wspólne zwycięstwo.

**G4.5 — Weryfikacja i dokumentacja** (0.153.4)
- `tests/network-browser.html` rozszerzone o 4 okna, ponowne dołączenie i lobby; opis w [Gra wieloosobowa](MULTIPLAYER.md).

**Kryterium ukończenia:** gracze znajdują grę na liście, rozgrywają 2 na 2, a rozłączony gracz wraca do trwającej bitwy bez rozsynchronizowania.

---

## Ryzyka

- **G2** — największa niewiadoma projektowa; wariant „obie plansze naraz” może podwoić koszt — dlatego najpierw wariant dwufazowy.
- **G4** — hosting serwera (koszt, utrzymanie, bezpieczeństwo) i sieci, w których WebRTC się nie łączy (potrzebny TURN); ponowne dołączenie przez odtworzenie całej bitwy może trwać kilka–kilkanaście sekund w długich meczach (można dodać okresowe migawki stanu).
- **G1** — AI z doktrynami może zmienić balans scenariuszy i kampanii; symulacje w G1.4 to wychwytują.
