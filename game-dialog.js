/* The game's own confirmation window (0.151.2) instead of the browser's confirm(): in the deck's look, over the
   board or the menu (a modal <dialog> in the top layer).
   GameDialog.confirm({ eyebrow, title, text, sections: [{ label, text, tone }], facts: [[label, value]], ok, cancel,
   tone }) → Promise<boolean>. Esc and the backdrop cancel; Enter confirms; the cancel button has the focus first
   (a final choice is not taken by a stray key). Texts are set as text, never as HTML. */
const GameDialog = (() => {
	"use strict";
	let open = null;
	function el(tag, cls, text) {
		const e = document.createElement(tag);
		if (cls) e.className = cls;
		if (text != null) e.textContent = text;
		return e;
	}
	function confirm(o = {}) {
		open?.close("cancel");
		return new Promise((resolve) => {
			const dialog = el("dialog", "game-dialog" + (o.tone ? " tone-" + o.tone : ""));
			dialog.setAttribute("aria-labelledby", "game-dialog-title");
			const card = el("form", "game-dialog-card");
			card.method = "dialog";
			if (o.eyebrow) card.append(el("span", "game-dialog-eyebrow", o.eyebrow));
			const title = el("h2", "game-dialog-title", o.title || "");
			title.id = "game-dialog-title";
			card.append(title);
			if (o.text) card.append(el("p", "game-dialog-text", o.text));
			for (const s of o.sections || []) {
				const box = el("div", "game-dialog-section" + (s.tone ? " tone-" + s.tone : ""));
				if (s.label) box.append(el("b", null, s.label));
				box.append(el("p", null, s.text || ""));
				card.append(box);
			}
			if (o.facts?.length) {
				const list = el("dl", "game-dialog-facts");
				for (const [k, v] of o.facts) list.append(el("dt", null, k), el("dd", null, v));
				card.append(list);
			}
			const actions = el("div", "game-dialog-actions"),
				cancel = el("button", "game-dialog-cancel", o.cancel || "Anuluj"),
				ok = el("button", "game-dialog-ok", o.ok || "Potwierdź");
			cancel.type = ok.type = "submit";
			cancel.value = "cancel";
			ok.value = "ok";
			actions.append(cancel, ok);
			card.append(actions);
			dialog.append(card);
			document.body.append(dialog);
			// A click outside the card (on the backdrop) cancels.
			dialog.addEventListener("click", (e) => {
				if (e.target === dialog) dialog.close("cancel");
			});
			dialog.addEventListener("keydown", (e) => {
				e.stopPropagation();
				if (e.key === "Enter" && e.target.tagName !== "BUTTON") {
					e.preventDefault();
					dialog.close("ok");
				}
			});
			dialog.addEventListener("close", () => {
				open = null;
				const yes = dialog.returnValue === "ok";
				dialog.remove();
				resolve(yes);
			});
			open = dialog;
			dialog.showModal();
			cancel.focus();
		});
	}
	return { confirm, isOpen: () => !!open };
})();
if (typeof window !== "undefined") window.GameDialog = GameDialog;
