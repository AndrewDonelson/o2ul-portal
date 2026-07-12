import { initLegalModals } from "./legal-modals.js";
import { createCopyrightNotice, sharedComponents } from "./shared/components.js";
import { renderSharedComponentShowcase } from "./shared/showcase.js";
import htmx from "./htmx.js";

declare global {
	interface Window {
		O2ULSharedComponents?: typeof sharedComponents;
		O2ULUI?: typeof sharedComponents.ui;
	}
}

const sliderTimers = new WeakMap<HTMLElement, number>();
let frontendBootstrapped = false;
let sharedRuntimeBound = false;

function applyFooterCopyright(footerCopyright: HTMLElement): void {
	const smartNotice = createCopyrightNotice("Nlaak Studios, LLC", 2017, "center");
	footerCopyright.innerHTML = "";
	footerCopyright.appendChild(smartNotice);
}

function queryWithin(root: ParentNode, selector: string): HTMLElement[] {
	const matches: HTMLElement[] = [];
	if (root instanceof HTMLElement && root.matches(selector)) {
		matches.push(root);
	}
	matches.push(...Array.from(root.querySelectorAll<HTMLElement>(selector)));
	return matches;
}

function setSliderIndex(slider: HTMLElement, nextIndex: number): void {
	const slides = Array.from(slider.querySelectorAll<HTMLElement>(".shared-slider-slide"));
	const dots = Array.from(slider.querySelectorAll<HTMLElement>(".shared-slider-dot"));
	if (!slides.length) {
		return;
	}

	const boundedIndex = ((nextIndex % slides.length) + slides.length) % slides.length;
	slider.dataset.sliderCurrentIndex = String(boundedIndex);

	slides.forEach((slide, index) => {
		slide.classList.toggle("is-active", index === boundedIndex);
	});

	dots.forEach((dot, index) => {
		dot.classList.toggle("is-active", index === boundedIndex);
		dot.setAttribute("aria-pressed", index === boundedIndex ? "true" : "false");
	});
}

function stopSlider(slider: HTMLElement): void {
	const timer = sliderTimers.get(slider);
	if (timer !== undefined) {
		window.clearInterval(timer);
		sliderTimers.delete(slider);
	}
}

function startSlider(slider: HTMLElement): void {
	if (slider.dataset.sliderAutoplay === "false") {
		return;
	}

	const slides = slider.querySelectorAll(".shared-slider-slide");
	if (slides.length <= 1) {
		return;
	}

	stopSlider(slider);
	const intervalMs = Number(slider.dataset.sliderIntervalMs ?? "5000") || 5000;
	const timer = window.setInterval(() => {
		const current = Number(slider.dataset.sliderCurrentIndex ?? "0");
		setSliderIndex(slider, current + 1);
	}, intervalMs);
	sliderTimers.set(slider, timer);
}

function renderShowcases(root: ParentNode): void {
	for (const showcaseHost of queryWithin(root, "#sharedComponentShowcase")) {
		renderSharedComponentShowcase(showcaseHost);
	}
}

function initializeFooter(root: ParentNode): void {
	for (const footerCopyright of queryWithin(root, ".footer-copyright")) {
		applyFooterCopyright(footerCopyright);
	}
}

function initializeSliders(root: ParentNode): void {
	for (const slider of queryWithin(root, ".shared-slider")) {
		if (slider.dataset.sliderReady === "true") {
			continue;
		}
		slider.dataset.sliderReady = "true";
		setSliderIndex(slider, Number(slider.dataset.sliderCurrentIndex ?? "0"));
		startSlider(slider);
	}
}

function bindSharedRuntime(): void {
	if (sharedRuntimeBound) {
		return;
	}
	sharedRuntimeBound = true;

	htmx.on(document, "shared:slider:set", (event: Event) => {
		const custom = event as CustomEvent<{ index?: number }>;
		const slider = (custom.target as Element | null)?.closest<HTMLElement>(".shared-slider");
		if (!slider) {
			return;
		}
		setSliderIndex(slider, Number(custom.detail?.index ?? 0));
		startSlider(slider);
	});

	htmx.on(document, "shared:slider:pause", (event: Event) => {
		const slider = (event.target as Element | null)?.closest<HTMLElement>(".shared-slider");
		if (slider) {
			stopSlider(slider);
		}
	});

	htmx.on(document, "shared:slider:resume", (event: Event) => {
		const slider = (event.target as Element | null)?.closest<HTMLElement>(".shared-slider");
		if (slider) {
			startSlider(slider);
		}
	});
}

function bootstrapFrontend(root: ParentNode): void {
	initializeFooter(root);
	renderShowcases(root);
	initializeSliders(root);
	bindSharedRuntime();
}

function initFrontend(): void {
	if (frontendBootstrapped) {
		bootstrapFrontend(document);
		return;
	}

	frontendBootstrapped = true;
	htmx.init();
	initLegalModals(document);

	bootstrapFrontend(document);
	htmx.onLoad((elt: Node) => {
		bootstrapFrontend(elt instanceof Element ? elt : document);
	});

	// Expose reusable shared UI components for other frontend modules.
	window.O2ULSharedComponents = sharedComponents;
	window.O2ULUI = sharedComponents.ui;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initFrontend);
} else {
	initFrontend();
}
