/* Catalog previews use the same renderers as the battlefield. No simulation is created. */
const KnowledgeBase = (() => {
	const descriptions = {
		medbay:
			"Leczy do 3 rannych piechurów (także rakietowców, zwiadowców i sabotażystów) w promieniu 170: 12 PW/s na stanowisko, 1 metal za 8 PW. Pod ostrzałem ×¼. Nie naprawia maszyn. Pobór 10 mocy. Wymaga koszar.",
		shieldgen:
			"Tarcza nad budynkami w promieniu 230 pochłania 70% obrażeń (pojemność 700). Odnawia się 25/s po 4 s spokoju. Wyczerpana — przeciążenie na 12 s, potem start od 25%. Nie chroni jednostek. Pobór 35 mocy. Wymaga Kolonii.",
		salvageYard:
			"Zniszczone pojazdy i budynki zostawiają wraki warte 25% kosztu (15–140 metalu, znikają po 4 min). PPM robotem na wraku: rozbiórka 3 s i dowóz złomu na plac. Po dostawie robot sam szuka kolejnego wraku w pobliżu placu. Pobór 5 mocy.",
		skyguard:
			"Mobilna obrona przeciwlotnicza: zasięg 330, 28 obrażeń co 0,6 s przeciw lotnictwu; przeciw celom naziemnym tylko 35%. Towarzyszy armii. Fabryka.",
		drone:
			"Bezzałogowy zwiad z powietrza: bardzo szybki, widzi na 520, bez broni. Odsłania siedliska i ruchy wroga; strącają go myśliwce, piechota, wieżyczki i obrona przeciwlotnicza. Koszary.",
		saboteur:
			"Ukryci, dopóki w promieniu 150 nie ma wrogiej jednostki (budynki ich nie wykrywają). PPM na wrogim budynku: podłożenie ładunku (4 s) wyłącza go na 25 s; centrum — także opóźnia desant o 15 s. Ładunek odnawia się 45 s. Słabi w walce: strzelają tylko na rozkaz. Wymaga Kolonii.",
		battery:
			"Gromadzi nadwyżkę mocy: do 900 energii, ładowanie do 15/s. Przy niedoborze oddaje do 30 mocy (30 s przy pełnym obciążeniu). Powstaje pusty; nie zastępuje reaktora.",
		transport:
			"Przewozi 4 piechurów lub rakietowców. PPM piechotą na transporterze: załadunek; przycisk Wyładuj: desant. Załoga liczy się do limitu armii. Po zniszczeniu wysiada z 50% pozostałych PW, jeśli jest wolny teren.",
		flak: "Obrona wyłącznie przeciwlotnicza: zasięg 360, 40 obrażeń co 0,8 s. Zużywa 15 mocy. Wymaga Kolonii i eskorty przeciw wojskom naziemnym.",
		workshop:
			"Automatycznie naprawia 2 pobliskie pojazdy naziemne i roboty. Zasięg 190; 16 PW/s na stanowisko; 1 metal za 5 PW. Pobór 20 mocy. Przez 3 s po trafieniu naprawa działa z 25% prędkości; niedobór mocy także ją spowalnia.",
		hangar: "Produkuje myśliwce i bombowce. Pobiera 25 mocy.",
		interceptor:
			"Szybki myśliwiec do zwalczania lotnictwa i celów naziemnych.",
		bomber: "Powolniejszy bombowiec: +50% obrażeń przeciw budynkom; nie atakuje lotnictwa.",
		raider: "Unikalny, szybki zwiadowca Wolnych Kolonii. Koszary.",
		grenadier: "Grenadierzy Wolnych Kolonii (koszary): zasięg 170, granaty zadają 40% obrażeń także jednostkom naziemnym w promieniu 45 m od celu.",
		serviceRover: "Łazik serwisowy Wolnych Kolonii (fabryka): bez uzbrojenia, naprawia 2 pobliskie pojazdy lub budynki po 18 PW/s (1 metal za 6 PW).",
		outpost: "Placówka polowa Wolnych Kolonii: punkt rozładunku rudy, widzenie 420, strefa budowy w promieniu 300. Stawiana w dowolnym widocznym, wolnym miejscu.",
		flamer: "Miotacze ognia Dominium (koszary): zasięg 85, szybki ogień; ×1,5 przeciw piechocie, ×1,3 przeciw budynkom, ×0,6 przeciw pojazdom; płomień rani też sąsiadów celu.",
		destroyer: "Niszczyciel czołgów Dominium (fabryka): zasięg 300, 60 obrażeń; ×1,6 przeciw pojazdom, ×0,5 przeciw piechocie; nie strzela do lotnictwa.",
		crawler: "Pełzacz Roju Kryształowego (koszary, 45 metalu): szybki, walczy wręcz; po śmierci wybucha — 40 obrażeń wrogim jednostkom naziemnym w promieniu 50.",
		spitter: "Pluwacz Roju (koszary): zasięg 200; kwas ×1,4 przeciw budynkom, a trafiony cel przez 4 s otrzymuje o 15% więcej obrażeń od wszystkich.",
		colossus: "Kolos Roju (fabryka, 480): 1400 PW, stała regeneracja 6 PW/s, uderzenie rani też jednostki obok celu (40%).",
		monolith: "Monolit rezonansowy Roju (300, 20 mocy): wrogie jednostki naziemne w promieniu 260 poruszają się o 35% wolniej, a ukryci sabotażyści są odsłaniani.",
		uplink: "Stacja orbitalna Dominium: uderzenie orbitalne w zbadany punkt — po 3 s 420 obrażeń w promieniu 110 (słabnących ku brzegom), odnowienie 100 s. Wymaga Kolonii; 40 mocy.",
		sentinel:
			"Unikalny ciężki Bastion Dominium. Fabryka, także obrona przeciwlotnicza.",
		trooper: "Piechota do podstawowej walki.",
		rocket: "Wsparcie przeciw pojazdom i budynkom.",
		heavy: "Ciężki pojazd szturmowy: 950 PW, dwa działa, wymaga fabryki.",
		artillery:
			"Ostrzał do 420 m i obrażenia w promieniu 75 m. Na dystansie poniżej 100 m siła bezpośredniego trafienia spada do 25%. Wymaga eskorty i fabryki.",
		wall: "Przeciągnij LPM: odcinek pod dowolnym kątem. Alt + przeciągnięcie: okrąg. Blokuje ruch obu stron.",
		gate: "Blokuje ruch. Wybierz własną ukończoną bramę i użyj Otwórz / zamknij. Otwarta przepuszcza obie strony.",
		beast: "Skorpiony wydmowe, wilki szronowe i warany popielne strzegą swoich siedlisk i atakują oddziały obu frakcji.",
		tank: "Mobilny pancerz i siła ognia. Wymaga fabryki.",
		worker: "PPM na rudzie: wydobycie. Na uszkodzonym sojuszniku: naprawa.",
		hq: "Punkt rozładunku rudy i produkcja robotów. Utrata oznacza porażkę.",
		turret: "Obrona bazy i przyczółków.",
		barracks: "Produkują piechotę i rakietowców.",
		reactor: "Dostarcza 60 mocy (90 po badaniu). Koszt 180 metalu.",
		lab: "Zużywa 30 mocy. Bada stabilizację reaktorów i optykę kryształową.",
		factory: "Produkuje czołgi i odblokowuje badania wojskowe.",
		depot: "Punkt rozładunku rudy. Odblokowuje większe ładownie.",
		extractor:
			"Na fioletowym złożu. PPM z zaznaczonym robotem przydziela jednego operatora; wydobycie 2 gazu/s.",
	};
	const guide =
		"<h2>Pogoda i noc</h2><p>Doba trwa 6 minut. Nocą oddziały i budynki włączają światła. Burze: od 90 s, co 210 s, przez 55 s. Maksymalnie −35% szybkości ruchu i −30% celności. Laboratorium: monitoring prognozuje pogodę i ostrzega 30 s wcześniej; celowanie adaptacyjne oraz napędy terenowe redukują odpowiednią karę o 75%. Ptaki i ryby są dekoracyjną fauną.</p><p>LPM / ramka — zaznaczanie · PPM — rozkaz · A + PPM — atak w marszu. Strzałki — kamera, kółko — zoom. Ctrl+1–9 zapisuje grupę, 1–9 ją wybiera. J pokazuje alarm bazy. Shift+S — utrzymanie pozycji. Z — bezczynne roboty. W trybie 3D (Ustawienia → Renderer) przecinek i kropka albo Alt + przeciąganie środkowym przyciskiem w bok obracają kamerę, PageUp / PageDown albo Alt + przeciąganie w górę i w dół pochylają ją ku horyzontowi (widać niebo), / przywraca widok od południa, a z bliska kamera patrzy niżej, bardziej z boku; latające wyspy, iglice i wielkie grzyby prześwitują, gdy zasłaniają twoje jednostki lub kursor.</p><p>Rozbiórka: zaznacz własną budowlę i wybierz Rozbierz. Zwrot do 50% kosztu według stanu budynku; fundament zwraca pełny koszt. Centrum jest chronione.</p><h2>Moc i kryształy</h2><p>Centrum: 40 mocy; reaktor [C]: +60. Pobór: koszary 10, fabryka 25, laboratorium [N] 30, ekstraktor 10, wieżyczka 5. Niedobór spowalnia produkcję wojska i badania do minimum 25%. Roboty, wydobycie, budowa i naprawy działają normalnie. Kryształy to bursztynowe złoża: PPM zaznaczonym robotem, dostawa do centrum lub magazynu. Laboratorium: stabilizacja (180 metalu, 40 gazu, 30 kryształów, 30 s) podnosi moc reaktora do 90; optyka (220 metalu, 50 gazu, 45 kryształów, 35 s) dodaje 15% obrażeń. Anulowanie zwraca zapłacone zasoby.</p><h2>Gospodarka i badania</h2><p>Robot przewozi 30 rudy do centrum lub ukończonego magazynu. G — magazyn (120 metalu, 10 s), X — ekstraktor (160 metalu, 12 s). Z wybiera bezczynne roboty. Gaz jest skończony i wymaga operatora. L — większe ładownie: 150 metalu + 50 gazu, 25 s, wymaga magazynu; zwiększa ładunek do 60. Badanie można anulować z pełnym zwrotem obu surowców. Utrata wymaganego budynku wstrzymuje badanie. Centrum zapewnia 8 metalu/s, własny przekaźnik kolejne 5/s. T/B/V — budowa wieżyczki, koszar lub fabryki. Fabryka pozwala zbadać broń (+25% obrażeń) i pancerz (−20% otrzymanych obrażeń), każde za 250 metalu i 25 s. U/I — badania.</p><p>Handel (Logistyka → Handel): wymiana metalu, gazu i kryształów po niekorzystnym kursie — tracisz 40% wartości (1 gaz = 3 metalu, 1 kryształ = 2 metalu, np. 100 kryształów → 120 metalu). Wymaga ukończonego magazynu polowego lub laboratorium. Dobre na nadmiar, zwłaszcza kryształów.</p><p>Ctrl+S — zapis lokalny; automatyczny zapis co 10 sekund aktywnej bitwy. Pięć ręcznych slotów w menu pauzy oraz oddzielny autosave. Spacja zatrzymuje symulację i pozwala wydawać rozkazy, Esc otwiera menu pauzy.</p>";
	descriptions.hq +=
		" W scenariuszach: poziom I Przyczółek. Rozbudowa w BADANIA / F2 za 300 metalu i 50 gazu, 30 s przy pełnej mocy. Poziom II Kolonia odblokowuje fabrykę, laboratorium, hangar i warsztat. Rozdziały I–III kampanii startują na poziomie II; szkolenie Próba kolonii zaczyna od Przyczółka. Poziom III Twierdza (z laboratorium; 600 metalu, 150 gazu, 100 kryształów, 45 s): centrum o 50% wytrzymalsze, +4 metalu/s i wybór jednej z dwóch doktryn frakcji — ostateczny. Kolonie: Logistyka mobilna albo Fortyfikacja przyczółków; Dominium: Ciężki ostrzał albo Silniejsze osłony; Rój: Nawała albo Pancerz chitynowy.";
	descriptions.worker =
		"Wydobywa rudę i kryształy, obsługuje ekstraktor, naprawia i buduje. Fundament przydziela zaznaczonego lub najbliższego robota. Może strzelać w obronie.";
	descriptions.trooper +=
		" Przy skałach, murach i zamkniętych bramach otrzymuje o 30% mniej obrażeń dystansowych.";
	descriptions.rocket += " Korzysta z osłony tak samo jak piechota.";
	descriptions.lab =
		"Ośrodek badań pogodowych, celowania, napędów terenowych, stabilizacji reaktorów i optyki kryształowej. Zużywa 30 mocy.";
	descriptions.depot +=
		" Narzędzia wydobywcze: +25% pobrania rudy i kryształów na cykl, po awansie centrum.";
	descriptions.lab += " Montaż modułowy: +25% tempa budowy przez roboty.";
	descriptions.barracks +=
		" Szkolenie manewrowe: +10% szybkości piechoty i rakietowców.";
	descriptions.duneMaw =
		"Nieruchomy drapieżnik ukryty w oznaczonej jamie. Atakuje oddziały naziemne do 115 m. Omiń siedlisko lub ostrzelaj je z dystansu.";
	descriptions.frostTusk =
		"Ciężki drapieżnik lodowych planet. Broni siedliska i atakuje kłami. Wolniejszy od piechoty; nie ściga poza swoim terytorium.";
	descriptions.scientist =
		"Badacz z ekipy dr Tessy (akt II, rozdział IV). Nie walczy i ginie po kilku trafieniach. Może jechać transporterem; ewakuuj go na lądowisko przy bazie.";
	descriptions.technician =
		"Technik kompleksu Hefajstos (akt II, rozdział VI). Pojawia się po decyzji o odłączeniu instalacji. Odprowadź go pieszo lub transporterem na lądowisko.";
	descriptions.hauler =
		"Konwojowiec z rdzeniem energetycznym (akt II, rozdział V). Jedzie automatycznie między postojami; nie przyjmuje rozkazów. Naprawiają go roboty i warsztat.";
	descriptions.forge =
		"Rdzeń kompleksu Hefajstos (akt II, rozdział VI). Nie można go ostrzelać — o jego losie decyduje przejęcie trzech węzłów sterujących.";
	descriptions.ashCrawler =
		"Szybki pajęczak popielnych równin. Atakuje z bliska; trzymaj roboty za linią wojska. Nie atakuje lotnictwa.";
	const tabs = [
		["army", "Armia"],
		["buildings", "Infrastruktura"],
		["wildlife", "Fauna"],
		["guide", "Poradnik"],
	];
	function template() {
		return `<div class="knowledge-tabs" role="tablist" aria-label="Działy bazy wiedzy">${tabs.map(([id, name], i) => `<button type="button" id="knowledge-tab-${id}" role="tab" aria-selected="${i === 0}" aria-controls="knowledge-panel" tabindex="${i === 0 ? 0 : -1}" data-knowledge="${id}">${name}</button>`).join("")}</div><div id="knowledge-panel" role="tabpanel" tabindex="0" aria-labelledby="knowledge-tab-army"></div>`;
	}
	function card(type, biome = "dust", title) {
		const s = RTS.TYPES[type];
		const faction =
			s.faction === "dominion"
				? "Dominium"
				: s.faction === "swarm"
					? "Rój Kryształowy"
					: s.faction === "colonies"
					? "Wolne Kolonie"
					: type === "beast" || s.threat
						? "Fauna neutralna"
						: [
									"scientist",
									"technician",
									"hauler",
									"forge",
							  ].includes(type)
							? "Kampania · akt II"
							: "Obie frakcje";
		return `<article class="knowledge-card"><figure><canvas width="400" height="280" data-model="${type}" data-biome="${biome}" role="img" aria-label="Podgląd: ${title || s.name}"></canvas><figcaption>${faction}</figcaption></figure><div><h3>${title || s.name}</h3><p>${descriptions[type] || ""}</p><small>${s.hp} PW${type === "beast" || s.threat ? "" : s.cost ? ` · ${s.cost} metalu · ${s.build || s.construction} s` : s.speed ? " · Jednostka misji" : type === "forge" ? " · Obiekt misji" : " · Budynek startowy"}</small></div></article>`;
	}
	function draw(canvas) {
		const type = canvas.dataset.model,
			s = RTS.TYPES[type],
			c = canvas.getContext("2d");
		const faction = s.faction || "colonies";
		const e = {
			id: 1,
			type,
			team: type === "beast" ? 2 : 0,
			faction,
			tint:
				type === "beast"
					? null
					: faction === "dominion"
						? "#ed8c78"
						: "#b0efd0",
			x: 0,
			y: 0,
			hp: s.hp,
			maxHp: s.hp,
			angle: -0.3,
			wallAngle: -0.25,
			path: [],
			constructionLeft: 0,
			cargo: 0,
			open: false,
			cooldown: 0,
		};
		c.scale(2, 2);
		c.translate(100, s.flying ? 99 : 85);
		const scale = s.threat
			? 1
			: type === "beast"
				? 2.8
				: s.speed
					? 1.45
					: type === "hangar"
						? 0.8
						: 0.85;
		c.scale(scale, scale);
		if (
			!Act2Art.body(c, e, 1.4) &&
			!AdvancedArt.body(c, e, 1.4, canvas.dataset.biome)
		)
			BoardArt.body(c, e, 1.4, null, type === "extractor");
		AdvancedArt.factionDetails(c, e, 1.4);
	}
	function mount(root) {
		const panel = root.querySelector("#knowledge-panel"),
			buttons = [...root.querySelectorAll("[data-knowledge]")];
		function select(id) {
			for (const button of buttons) {
				const active = button.dataset.knowledge === id;
				button.setAttribute("aria-selected", String(active));
				button.tabIndex = active ? 0 : -1;
			}
			panel.setAttribute("aria-labelledby", "knowledge-tab-" + id);
			if (id === "guide")
				panel.innerHTML = `<div class="knowledge-guide">${guide}</div>`;
			else {
				const cards =
					id === "wildlife"
						? ["dust", "ice", "ash"]
								.map((biome, i) =>
									card(
										"beast",
										biome,
										[
											"Skorpion wydmowy",
											"Wilk szronowy",
											"Waran popielny",
										][i],
									),
								)
								.join("") +
							["duneMaw", "frostTusk", "ashCrawler"]
								.map((type) => card(type))
								.join("")
						: Object.entries(RTS.TYPES)
								.filter(
									([type, s]) =>
										type !== "beast" &&
										!s.threat &&
										(id === "army" ? s.speed : !s.speed),
								)
								.map(([type]) => card(type))
								.join("");
				panel.innerHTML = `<p class="knowledge-note">${id === "wildlife" ? "Drapieżniki bronią siedlisk i zagrażają obu frakcjom." : "Parametry bazowe — koszty i atrybuty w bitwie uwzględniają frakcję oraz badania. Podglądy w powiększeniu."}</p><div class="knowledge-grid">${cards}</div>`;
				panel.querySelectorAll("canvas").forEach(draw);
			}
			panel.scrollTop = 0;
		}
		buttons.forEach((button, i) => {
			button.onclick = () => select(button.dataset.knowledge);
			button.onkeydown = (event) => {
				let next;
				if (event.key === "ArrowRight") next = (i + 1) % buttons.length;
				else if (event.key === "ArrowLeft")
					next = (i + buttons.length - 1) % buttons.length;
				else if (event.key === "Home") next = 0;
				else if (event.key === "End") next = buttons.length - 1;
				else return;
				event.preventDefault();
				buttons[next].click();
				buttons[next].focus();
			};
		});
		select("army");
	}
	return { template, mount };
})();
