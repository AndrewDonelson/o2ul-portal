import type { SliderOptions } from "./types.js";

export function createContentSlider(slides: HTMLElement[], options?: SliderOptions): HTMLElement {
  const slider = document.createElement("section");
  slider.className = "shared-slider";
  slider.dataset.sliderCurrentIndex = "0";
  slider.dataset.sliderIntervalMs = String(options?.intervalMs ?? 5000);
  slider.dataset.sliderAutoplay = String(options?.autoPlay ?? true);
  slider.setAttribute(
    "hx-on:mouseenter",
    "this.dispatchEvent(new CustomEvent('shared:slider:pause', { bubbles: true }))",
  );
  slider.setAttribute(
    "hx-on:mouseleave",
    "this.dispatchEvent(new CustomEvent('shared:slider:resume', { bubbles: true }))",
  );

  const viewport = document.createElement("div");
  viewport.className = "shared-slider-viewport";
  slider.appendChild(viewport);

  const dots = document.createElement("div");
  dots.className = "shared-slider-dots";
  slider.appendChild(dots);

  slides.forEach((slide, index) => {
    slide.classList.add("shared-slider-slide");
    slide.setAttribute("data-shared-slider-index", String(index));
    if (index === 0) {
      slide.classList.add("is-active");
    }
    viewport.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "shared-slider-dot";
    dot.setAttribute("data-shared-slider-dot", "true");
    dot.setAttribute("data-shared-slider-index", String(index));
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.setAttribute("aria-pressed", index === 0 ? "true" : "false");
    dot.setAttribute(
      "hx-on:click",
      `const slider = this.closest('.shared-slider'); if (slider) slider.dispatchEvent(new CustomEvent('shared:slider:set', { bubbles: true, detail: { index: ${index} } }));`,
    );
    dots.appendChild(dot);
  });

  return slider;
}
