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
	// Modal dialogs (doctrines, statistics, the development tree) live in the browser's top layer, above any
	// z-index: the pointer is a popover too and is raised above the newest open dialog. Without the popover API
	// the native cursor comes back while a dialog is open.
	const layered = typeof pointer.showPopover === "function";
	let raisedFor = null;
	if (layered) {
		pointer.popover = "manual";
		pointer.showPopover();
	}
	const raise = () => {
		const modal = [...document.querySelectorAll("dialog[open]")].filter((d) => d.matches(":modal")).at(-1) || null;
		if (modal === raisedFor) return modal;
		raisedFor = modal;
		if (layered && modal) {
			pointer.hidePopover();
			pointer.showPopover();
		}
		return modal;
	};
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
			const modal = raise();
			if (modal && !layered) {
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
