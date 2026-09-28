# Wersja 0.13 — detale, fortyfikacje i Odzyskany Świt

## Grafika i interfejs

Przywrócono szczegółowe wcześniejsze modele istniejących budowli: ekstraktor z animacją pracy, wieżę z dwoma działkami, panele, przewody i detale elewacji. Hangar zachowuje własny model. Mur i brama ponownie używają wcześniejszego stylu, z połączeniami między segmentami. Zachowano kolory gracza i warianty frakcji.

Kafle ARMIA, BUDOWA, BADANIA są mniejsze; mają pełne opisy i strony. Usunięto automatyczne prefiksy „Kolonii:” i „Dominium:”.

Deszcz jest rzadszy, wolniejszy, ma krótsze i mniej kontrastowe smugi oraz łagodniejsze rozpryski. Burza ma rozgałęzione błyskawice i płynne, miejscowe rozświetlenie chmur przez 1,3 s zamiast ostrego krótkiego błysku. Nie rozświetla na biało całego ekranu.

## Budowa i rozbiórka

- Mur / K + przeciągnięcie LPM: odcinek pod dowolnym kątem, bez przyciągania do siatki osi.
- Mur / K + Alt i przeciągnięcie LPM: okrąg. Początek gestu jest środkiem, odległość wyznacza promień (40–360 jednostek).
- Podgląd pokazuje segmenty i koszt. Obowiązuje zasięg budowy, odkryty teren, brak przeszkód oraz dostępny metal. Robot buduje kolejno również cały okrąg.
- Bramę lub wieżę można wstawić w segment muru. Brama przejmuje kierunek segmentu.
- Zaznacz własną budowlę i wybierz **Rozbierz**. Ukończona budowla zwraca do 50% zapłaconego metalu, proporcjonalnie do pozostałej wytrzymałości. Nieukończony fundament zwraca 100%. Opłacona kolejka jednostek jest anulowana i zwracana osobno. Centrum dowodzenia jest chronione przed rozbiórką.

## Scenariusze

Wejście w Scenariusze od razu pokazuje nazwę, kolor, frakcję, trudność i liczbę uczestników. Mapa jest wybierana z listy obok miniatury rzeczywistego układu terenu i krótkiego opisu. Z tego ekranu można od razu rozpocząć bitwę. Usunięto liczbę planet z przycisku wejścia.

## Kampania

Przycisk Kampania uruchamia 30-sekundowy animowany prolog w grze. Cztery sceny z napisami pokazują zgaszenie latarni, blokadę, wiadomość Liry i początek wyprawy. Intro można pominąć przyciskiem lub Esc; po 30 sekundach przechodzi do wyboru rozdziału. Ustawienie ograniczonych animacji wyłącza przesuwanie gwiazd i floty.

1. **Iskra na Eos** — lądowanie w kotlinie, przywrócenie zasilania i łączności, odnalezienie wskazówek Liry.
2. **Archiwum pod lodem** — szlak między jeziorami Vesperu, zabezpieczenie zaopatrzenia i zdobycie klucza do sieci.
3. **Świt nad Nadir** — oskrzydlenie centralnej cytadeli, przejęcie węzłów i zakończenie blokady.

Każda misja ma własne położenie baz, złóż, przekaźników, skał i wód, odmienne od scenariuszy. Ekrany zwycięstwa kontynuują opowieść i umożliwiają przejście do następnego rozdziału. Nowe układy obowiązują przy nowym rozpoczęciu misji; istniejące zapisy zachowują swój teren i ukończone rozdziały.

## Weryfikacja

84 testy Node przechodzą. Nowe kontrole obejmują swobodny kąt murów, faktyczne ukończenie okręgu przez robota i szczelność obwodu, rozbiórkę ze zwrotem kosztów, osobne mapy kampanii, dostępność tras i zapis terenu. 29 kontroli menu w przeglądarce przechodzi. Sprawdzono wizualnie scenariusze, intro i automatyczne przejście po 30 sekundach, kafle, modele oraz ulewy; rozbiórkę sprawdzono również w działającej grze.
