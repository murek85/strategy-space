# Wersja 0.14 — światło, prolog i dźwięk pracy

## Oprawa

Księżyc ma jedną okrągłą tarczę, delikatne cieniowanie i kratery. Cień nie wychodzi poza jej obrys. Samoloty mają lampy nawigacyjne na skrzydłach oraz dziobie, umieszczone na tej samej wysokości co model. Nie rysują naziemnego snopa reflektora. Czołgi i piechota zachowują oświetlenie terenu.

Prolog kampanii zajmuje cały widok. Sześć pięciosekundowych ujęć przedstawia szlaki handlowe, blokadę orbitalną, miasto bez prądu, transmisję Liry, wyprawę nad lodowym terenem i finał. Ma osobny 30-sekundowy motyw z narastającym pulsem, smyczkami, basem, perkusją, sygnałem dzwonków i finałem instrumentów dętych. Po zakończeniu lub pominięciu wraca muzyka menu. Głośność intro podlega suwakowi muzyki. Ograniczone animacje nadal są respektowane.

## Pozycje startowe i surowce

Nowe scenariusze rozmieszczają centra w różnych rogach mapy, około 400–420 jednostek od krawędzi. Dwa pierwsze centra stoją w przeciwległych rogach; następni przeciwnicy zajmują pozostałe. Wybór narożnika wynika z mapy i ziarna, jest więc powtarzalny. Dotyczy również nowych rozpoczęć kampanii.

Każda baza otrzymuje pobliskie złoża startowe metalu, gazu i kryształów. Generator usuwa kolizje z terenem i kontroluje położenie depozytów oraz jednostek. Przekaźniki są powiązane z zasobami: stoją około 150 jednostek od złoża, poza jego obrysem. Scenariusze mają do 10 przekaźników, kampania do 8, zależnie od dostępnego terenu. Na wszystkich bieżących mapach z domyślnym ziarnem powstaje odpowiednio 10 i 8. Nowy układ widać też w podglądzie scenariusza.

Starsze zapisy zachowują swoje bazy, zasoby i przekaźniki. Aby użyć nowego rozmieszczenia, rozpocznij nową operację.

## Dźwięki

Dźwięki pojazdów i żołnierzy już istniały, ale wybierany był tylko jeden poruszający się obiekt co cztery sekundy. Teraz aktywność jest sprawdzana co 0,7 s, a w pobliżu mogą równocześnie wybrzmieć maksymalnie cztery różne rodzaje odgłosów.

- Pojazdy: wyraźniejszy, warstwowy pomruk silnika.
- Żołnierze: kroki; pozostają radio, odgłosy rozkazów i strzałów. Nie dodano nagranych kwestii głosowych.
- Roboty: napęd i serwomechanizmy podczas ruchu, krótkie dźwięki narzędzi podczas budowy/naprawy, wiercenie przy rudzie i kryształach oraz pompę przy gazie.

Odgłosy pracy wymagają odpowiedniego zadania i bliskości celu. Respektują mgłę wojny, położenie kamery, pauzę, wyciszenie i suwak efektów; mają panoramę stereo i tłumienie wraz z odległością. Fauna zachowuje osobną, rzadszą warstwę dźwiękową.

## Sprawdzenie

87 testów Node: mechanika, zapis, 2–4 uczestników na każdej mapie, położenie baz, bliskość zasobów, dojście do przekaźników, osobna muzyka i warunki emisji odgłosów pracy. Przeglądarkowe pomiary Web Audio: 6 motywów muzycznych i 20 efektów, bez przesterowania i bez pozostałych głosów efektów po zakończeniu. Wizualna kontrola księżyca, lotnictwa, sześciu ujęć prologu oraz automatycznego powrotu do menu kampanii.

### Baza wiedzy
- Osobne zakładki Armia, Infrastruktura, Fauna i Poradnik.
- Karty jednostek oraz budowli używają modeli z planszy; fauna ma podglądy trzech biomów.
- Stałe zakładki i przycisk powrotu, przewijana zawartość, obsługa strzałek oraz Home/End.
- Parametry bazowe pobierane z definicji gry; karty wskazują dostępność frakcyjną.

## Żywe planety — roślinność i zagrożenia

- Więcej roślinności: drzewa i zarośla pustyni, ośnieżone iglaki i niska roślinność lodowych map, purpurowe skupiska oraz grzybowe pędy popielnych planet. Dekoracje omijają zasoby, przeszkody i początkowe zabudowania.
- Nieregularne jeziora: wspólna geometria brzegu dla grafiki, fal, ryb i kolizji. Miniatura scenariusza pokazuje ten sam kształt.
- Nowe rozgrywki otrzymują siedliska neutralnych zagrożeń: paszczak wydmowy (nieruchoma jama, 1500 PW), rogacz lodowy (620 PW), pajęczak bazaltowy (420 PW). Siedliska oznaczono na odkrytej planszy. Potwory atakują obie strony, nie trafiają samolotów, można je pokonać. Mobilne drapieżniki wracają do siedlisk i nie polują poza ich okolicą.
- Stare zapisy zachowują obecną faunę; nowe potwory pojawiają się przy rozpoczęciu nowej operacji. Ich stan i siedliska są zapisywane.
- Planeta w menu ma przesuwającą się powierzchnię z lądami i światłami miast, osobne chmury, atmosferę i delikatne kołysanie. Ustawienie ograniczenia animacji zatrzymuje te ruchy.
- Opisy nowych gatunków dostępne w bazie wiedzy, zakładka Fauna.

Sprawdzenie: testy ekologii obejmują wszystkie mapy, odległość od baz, zapis/odczyt, obrażenia obu stronom, ochronę lotnictwa oraz zgodność kolizji z brzegiem. Podgląd trzech biomów: `tests/ecology-browser.html`.
