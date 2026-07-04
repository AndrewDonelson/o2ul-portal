export function createTagLine(text = "Global Stability, Decentralized Freedom", subText = "where AI meets blockchain for humanity's prosperity"): HTMLElement {
  const root = document.createElement("div");
  root.className = "shared-tagline";

  const title = document.createElement("h3");
  title.className = "shared-tagline-title";
  title.textContent = text;

  const subtitle = document.createElement("p");
  subtitle.className = "shared-tagline-subtitle";
  subtitle.textContent = subText;

  root.append(title, subtitle);
  return root;
}
