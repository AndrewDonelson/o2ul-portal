import { createContentCard, createCopyrightNotice, createPageHeader } from "./shared/components.js";

type PolicyKind = "privacy" | "terms";

interface ContactInfo {
  type: "contact";
  email: string;
  website: string;
}

interface ListContent {
  type: "list";
  items: string[];
}

interface Section {
  id: string;
  heading: string;
  content: Array<string | ListContent>;
}

interface PolicyDocument {
  title: string;
  lastUpdated: string;
  introduction: {
    heading: string;
    content: string[];
  };
  sections: Section[];
  contact: {
    heading: string;
    content: Array<string | ContactInfo>;
  };
  footer: {
    text: string;
    company: string;
    rights: string;
  };
}

function getPolicyUrl(kind: PolicyKind): string {
  return kind === "privacy" ? "/json/privacy-policy.json" : "/json/terms-of-service.json";
}

function buildSection(section: Section): HTMLElement {
  const block = document.createElement("section");
  block.className = "legal-modal-section";

  const heading = document.createElement("h3");
  heading.textContent = section.heading;
  block.appendChild(heading);

  section.content.forEach((content) => {
    if (typeof content === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = content;
      block.appendChild(paragraph);
      return;
    }

    const list = document.createElement("ul");
    content.items.forEach((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      list.appendChild(li);
    });
    block.appendChild(list);
  });

  return block;
}

function buildContactSection(contact: PolicyDocument["contact"]): HTMLElement {
  const section = document.createElement("section");
  section.className = "legal-modal-section";

  const heading = document.createElement("h3");
  heading.textContent = contact.heading;
  section.appendChild(heading);

  contact.content.forEach((item) => {
    if (typeof item === "string") {
      const paragraph = document.createElement("p");
      paragraph.textContent = item;
      section.appendChild(paragraph);
      return;
    }

    const details = document.createElement("p");
    details.innerHTML = `Email: <a href="mailto:${item.email}">${item.email}</a><br />Website: <a href="${item.website}" target="_blank" rel="noreferrer">${item.website}</a>`;
    section.appendChild(details);
  });

  return section;
}

function createModalShell(): {
  overlay: HTMLDivElement;
  panel: HTMLDivElement;
  content: HTMLDivElement;
  closeButton: HTMLButtonElement;
} {
  const overlay = document.createElement("div");
  overlay.className = "legal-modal-overlay";
  overlay.hidden = true;

  const panel = document.createElement("div");
  panel.className = "legal-modal-panel";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-live", "polite");

  const closeButton = document.createElement("button");
  closeButton.type = "button";
  closeButton.className = "legal-modal-close";
  closeButton.setAttribute("aria-label", "Close legal modal");
  closeButton.textContent = "Close";

  const content = document.createElement("div");
  content.className = "legal-modal-content";

  panel.append(closeButton, content);
  overlay.appendChild(panel);

  return { overlay, panel, content, closeButton };
}

function buildPolicyCard(doc: PolicyDocument): HTMLElement {
  const card = createContentCard({ className: "legal-modal-card", align: "left" });

  const header = createPageHeader(doc.title, `Last Updated: ${doc.lastUpdated}`, "left");
  card.querySelector(".shared-content-card-body")?.appendChild(header);

  const intro = document.createElement("section");
  intro.className = "legal-modal-section";
  const introHeading = document.createElement("h3");
  introHeading.textContent = doc.introduction.heading;
  intro.appendChild(introHeading);
  doc.introduction.content.forEach((paragraph) => {
    const p = document.createElement("p");
    p.textContent = paragraph;
    intro.appendChild(p);
  });
  card.querySelector(".shared-content-card-body")?.appendChild(intro);

  doc.sections.forEach((section) => {
    card.querySelector(".shared-content-card-body")?.appendChild(buildSection(section));
  });

  card.querySelector(".shared-content-card-body")?.appendChild(buildContactSection(doc.contact));

  const footer = document.createElement("div");
  footer.className = "legal-modal-footer";
  const footerLine = document.createElement("p");
  footerLine.textContent = `${doc.footer.text} ${doc.footer.company} - ${doc.footer.rights}`;
  footer.appendChild(footerLine);
  footer.appendChild(createCopyrightNotice("Nlaak Studios, LLC", 2017, "left"));
  card.querySelector(".shared-content-card-body")?.appendChild(footer);

  return card;
}

export function initLegalModals(doc: Document = document): void {
  const modal = createModalShell();
  doc.body.appendChild(modal.overlay);

  let activeInvoker: HTMLElement | null = null;

  function closeModal(): void {
    modal.overlay.hidden = true;
    doc.body.classList.remove("modal-open");
    modal.content.innerHTML = "";
    if (activeInvoker) {
      activeInvoker.focus();
      activeInvoker = null;
    }
  }

  async function openModal(kind: PolicyKind, invoker: HTMLElement): Promise<void> {
    activeInvoker = invoker;
    modal.content.innerHTML = "<p class=\"legal-modal-loading\">Loading...</p>";
    modal.overlay.hidden = false;
    doc.body.classList.add("modal-open");

    try {
      const response = await fetch(getPolicyUrl(kind));
      if (!response.ok) {
        throw new Error(`Failed to load ${kind}`);
      }
      const policy = (await response.json()) as PolicyDocument;
      modal.content.innerHTML = "";
      modal.content.appendChild(buildPolicyCard(policy));
      modal.panel.scrollTop = 0;
    } catch {
      modal.content.innerHTML = "";
      const errorCard = createContentCard({
        title: "Unable to load policy",
        bodyHtml: `<p>We could not load the ${kind === "privacy" ? "Privacy Policy" : "Terms of Service"}.</p>`,
        align: "left",
      });
      modal.content.appendChild(errorCard);
    }
  }

  modal.closeButton.addEventListener("click", closeModal);
  modal.overlay.addEventListener("click", (event) => {
    if (event.target === modal.overlay) {
      closeModal();
    }
  });

  doc.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.overlay.hidden) {
      closeModal();
    }
  });

  const triggerSelector = "[data-legal-modal], a[href='/privacy-policy'], a[href='/privacy-policy.html'], a[href='/terms-of-service'], a[href='/terms-of-service.html']";
  const triggers = Array.from(doc.querySelectorAll<HTMLElement>(triggerSelector));
  triggers.forEach((trigger) => {
    trigger.addEventListener("click", (event) => {
      let kind = trigger.getAttribute("data-legal-modal");
      if (!kind) {
        const href = trigger.getAttribute("href") ?? "";
        if (href.includes("privacy-policy")) {
          kind = "privacy";
        } else if (href.includes("terms-of-service")) {
          kind = "terms";
        }
      }
      if (kind !== "privacy" && kind !== "terms") {
        return;
      }
      event.preventDefault();
      void openModal(kind, trigger);
    });
  });
}
