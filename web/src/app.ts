import { initLegalModals } from "./legal-modals";
import { createCopyrightNotice, sharedComponents } from "./shared/components";
import { renderSharedComponentShowcase } from "./shared/showcase";

declare global {
	interface Window {
		O2ULSharedComponents?: typeof sharedComponents;
		O2ULUI?: typeof sharedComponents.ui;
	}
}

function updateFooterCopyright(): void {
	const footerCopyright = document.querySelector<HTMLElement>(".footer-copyright");
	if (!footerCopyright) {
		return;
	}

	const smartNotice = createCopyrightNotice("Nlaak Studios, LLC", 2017, "center");
	footerCopyright.innerHTML = "";
	footerCopyright.appendChild(smartNotice);
}

function bootstrapFrontend(): void {
	updateFooterCopyright();
	initLegalModals(document);

	const showcaseHost = document.querySelector<HTMLElement>("#sharedComponentShowcase");
	if (showcaseHost) {
		renderSharedComponentShowcase(showcaseHost);
	}

	// Expose reusable shared UI components for other frontend modules.
	window.O2ULSharedComponents = sharedComponents;
	window.O2ULUI = sharedComponents.ui;
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", bootstrapFrontend);
} else {
	bootstrapFrontend();
}
