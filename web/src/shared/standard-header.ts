export function createStandardHeader(text: string, outline = false): HTMLElement {
  const heading = document.createElement("h1");
  heading.className = `shared-standard-header${outline ? " with-outline" : ""}`;
  heading.textContent = text;
  return heading;
}
