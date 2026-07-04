import type { SliderOptions } from "./types";

export function createContentSlider(slides: HTMLElement[], options?: SliderOptions): HTMLElement {
  const slider = document.createElement("section");
  slider.className = "shared-slider";

  const viewport = document.createElement("div");
  viewport.className = "shared-slider-viewport";
  slider.appendChild(viewport);

  const dots = document.createElement("div");
  dots.className = "shared-slider-dots";
  slider.appendChild(dots);

  let currentIndex = 0;
  let timer: number | undefined;
  const intervalMs = options?.intervalMs ?? 5000;
  const autoPlay = options?.autoPlay ?? true;

  const dotButtons: HTMLButtonElement[] = [];

  function renderActiveSlide(nextIndex: number): void {
    currentIndex = nextIndex;
    slides.forEach((slide, index) => {
      slide.classList.toggle("is-active", index === currentIndex);
    });
    dotButtons.forEach((dot, index) => {
      dot.classList.toggle("is-active", index === currentIndex);
      dot.setAttribute("aria-selected", index === currentIndex ? "true" : "false");
    });
  }

  slides.forEach((slide, index) => {
    slide.classList.add("shared-slider-slide");
    if (index === 0) {
      slide.classList.add("is-active");
    }
    viewport.appendChild(slide);

    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "shared-slider-dot";
    dot.setAttribute("aria-label", `Go to slide ${index + 1}`);
    dot.setAttribute("aria-selected", index === 0 ? "true" : "false");
    dot.addEventListener("click", () => {
      renderActiveSlide(index);
      restart();
    });
    dots.appendChild(dot);
    dotButtons.push(dot);
  });

  function stop(): void {
    if (timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  }

  function start(): void {
    if (!autoPlay || slides.length <= 1) return;
    timer = window.setInterval(() => {
      const next = (currentIndex + 1) % slides.length;
      renderActiveSlide(next);
    }, intervalMs);
  }

  function restart(): void {
    stop();
    start();
  }

  slider.addEventListener("mouseenter", stop);
  slider.addEventListener("mouseleave", start);
  start();

  return slider;
}
