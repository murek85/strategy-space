(() => {
	"use strict";
	// A page-rendered pointer is visible in embedded browsers as well.
	// Keep the native cursor until a real pointer event is received.
	const pointer = document.createElement("div");
	pointer.id = "game-pointer";
	pointer.hidden = true;
	pointer.setAttribute("aria-hidden", "true");
	pointer.innerHTML =
		'<svg width="28" height="34" viewBox="0 0 28 34" xmlns="http://www.w3.org/2000/svg"><path d="M3 2 L25 25 Q14 22 7 31 Z" fill="#f4fff8" stroke="#07151b" stroke-width="3" stroke-linejoin="round"/><path d="M6 8 L20 23 Q12 21 9 25 Z" fill="#6bddb2"/></svg>';
	document.body.appendChild(pointer);
	const hide = () => {
		pointer.hidden = true;
		document.documentElement.classList.remove("software-cursor-active");
	};
	document.addEventListener(
		"pointermove",
		(event) => {
			if (event.pointerType === "touch") {
				hide();
				return;
			}
			pointer.style.transform = `translate3d(${event.clientX - 3}px, ${event.clientY - 2}px, 0)`;
			pointer.hidden = false;
			document.documentElement.classList.add("software-cursor-active");
		},
		{ passive: true },
	);
	document.documentElement.addEventListener("pointerleave", hide);
	document.addEventListener("pointercancel", hide);
	document.addEventListener("visibilitychange", () => {
		if (document.hidden) hide();
	});
	window.addEventListener("blur", hide);
})();
