(() => {
  "use strict";

  const HOST_ID = "svm-stratus-company-badge-host";
  const MANUAL_STORAGE_KEYS = ["manualCompany", "manualStation"];
  const CHAT_ICON_GAP_PX = 30;
  const FALLBACK_RIGHT_OFFSET_PX = 225;
  const FALLBACK_TOP_PX = 7;

  const COMPANY_LABEL_PATTERN = /^signed\s+into\s*:?\s*$/i;
  const COMPANY_INLINE_PATTERN = /^signed\s+into(?!\s+station\b)\s*:?\s+(.+)$/i;
  const STATION_LABEL_PATTERN = /^signed\s+into\s+station\s*:?\s*$/i;
  const STATION_INLINE_PATTERN = /^signed\s+into\s+station\s*:?\s+(.+)$/i;
  const INVALID_VALUE_PATTERN =
    /^(company|station|signed into|signed into station|account settings|refresh permissions|log out|logout)$/i;

  const UNKNOWN_TEXT = "Detecting…";
  const OPEN_MENU_TEXT = "Open user menu once";
  const NOT_SIGNED_IN_TEXT = "Not signed in";
  const NOT_DETECTED_TEXT = "Not detected";

  let shadowRoot = null;
  let badgeElement = null;
  let companyValueElement = null;
  let stationValueElement = null;
  let mutationTimer = null;
  let badgePositionTimer = null;
  let lastMenuProbeAt = 0;
  let detectionRunning = false;
  let unknownText = UNKNOWN_TEXT;

  // This state is deliberately per page/tab. We do not render the previous
  // tab's cached values while the current page is being checked.
  let pageDetails = createEmptyPageDetails();

  function createEmptyPageDetails() {
    return {
      company: "",
      station: "",
      companyKnown: false,
      stationKnown: false
    };
  }

  function normalizeText(value) {
    return String(value ?? "")
      .replace(/\u00a0/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isPlausibleValue(value) {
    const text = normalizeText(value);
    return (
      text.length >= 2 &&
      text.length <= 120 &&
      !INVALID_VALUE_PATTERN.test(text) &&
      !/^signed\s+into\b/i.test(text)
    );
  }

  function ensureBadge() {
    let host = document.getElementById(HOST_ID);

    if (!host) {
      host = document.createElement("div");
      host.id = HOST_ID;
      host.setAttribute("aria-live", "polite");
      host.setAttribute("title", "Current STRATUS company and station");
      document.documentElement.appendChild(host);

      shadowRoot = host.attachShadow({ mode: "open" });

      const style = document.createElement("style");
      style.textContent = `
        :host {
          all: initial;
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 0;
          z-index: 2147483647;
          pointer-events: none;
        }

        .badge {
          position: absolute;
          top: 7px;
          left: auto;
          right: 225px;
          transform: none;
          z-index: 2147483647;
          display: inline-flex;
          align-items: center;
          min-height: 26px;
          max-width: min(680px, 58vw);
          padding: 0 11px;
          box-sizing: border-box;
          border: 1px solid rgba(255, 255, 255, 0.22);
          border-radius: 5px;
          background: rgba(25, 25, 25, 0.96);
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.38);
          color: #ffffff;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 12px;
          line-height: 1;
          pointer-events: none;
          user-select: none;
        }

        .field {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
        }

        .label {
          flex: none;
          color: #9db4c7;
          font-size: 9px;
          font-weight: 700;
          letter-spacing: 0.08em;
        }

        .value {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-weight: 600;
        }

        .value[data-status="unknown"],
        .value[data-status="not-signed-in"],
        .value[data-status="not-detected"] {
          color: #d8d8d8;
          font-weight: 400;
        }

        .separator {
          flex: none;
          width: 1px;
          height: 16px;
          margin: 0 11px;
          background: rgba(255, 255, 255, 0.34);
        }

        @media (max-width: 1050px) {
          .badge {
            max-width: calc(100vw - 390px);
          }
        }

        @media (max-width: 760px) {
          .badge {
            display: none;
          }
        }
      `;

      const badge = document.createElement("div");
      badge.className = "badge";
      badgeElement = badge;

      const companyField = document.createElement("span");
      companyField.className = "field";

      const companyLabel = document.createElement("span");
      companyLabel.className = "label";
      companyLabel.textContent = "COMPANY";

      companyValueElement = document.createElement("span");
      companyValueElement.className = "value";
      companyValueElement.dataset.field = "company";
      companyValueElement.dataset.status = "unknown";
      companyValueElement.textContent = UNKNOWN_TEXT;

      companyField.append(companyLabel, companyValueElement);

      const separator = document.createElement("span");
      separator.className = "separator";
      separator.setAttribute("aria-hidden", "true");

      const stationField = document.createElement("span");
      stationField.className = "field";

      const stationLabel = document.createElement("span");
      stationLabel.className = "label";
      stationLabel.textContent = "STATION";

      stationValueElement = document.createElement("span");
      stationValueElement.className = "value";
      stationValueElement.dataset.field = "station";
      stationValueElement.dataset.status = "unknown";
      stationValueElement.textContent = UNKNOWN_TEXT;

      stationField.append(stationLabel, stationValueElement);
      badge.append(companyField, separator, stationField);
      shadowRoot.append(style, badge);
    } else if (!shadowRoot) {
      shadowRoot = host.shadowRoot;
      badgeElement = shadowRoot?.querySelector(".badge") ?? null;
      companyValueElement = shadowRoot?.querySelector('[data-field="company"]') ?? null;
      stationValueElement = shadowRoot?.querySelector('[data-field="station"]') ?? null;
    }

    return host;
  }

  function descriptorForElement(element) {
    if (!element) return "";

    const attributes = [
      "aria-label",
      "title",
      "alt",
      "data-original-title",
      "data-bs-original-title",
      "data-tooltip",
      "id",
      "class"
    ];

    const parts = [];
    const elements = [element, ...element.querySelectorAll("i, svg, img, span")].slice(0, 12);

    for (const candidate of elements) {
      for (const attribute of attributes) {
        const value = attribute === "class"
          ? (typeof candidate.className === "string" ? candidate.className : candidate.getAttribute("class"))
          : candidate.getAttribute(attribute);
        if (value) parts.push(value);
      }
    }

    return normalizeText(parts.join(" ")).toLowerCase();
  }

  function isChatDescriptor(descriptor) {
    return /(?:^|[\s_-])(chat|message|messages|comment|comments|conversation|feedback|forum|speech)(?:$|[\s_-])/i.test(
      descriptor
    );
  }

  function collectTopBarIconCandidates() {
    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const selector = [
      "a",
      "button",
      '[role="button"]',
      "[onclick]",
      ".dropdown-toggle"
    ].join(",");

    const raw = [...new Set(document.querySelectorAll(selector))];
    const candidates = [];

    for (const element of raw) {
      if (!(element instanceof HTMLElement)) continue;

      const rect = element.getBoundingClientRect();
      if (
        rect.width < 10 ||
        rect.height < 10 ||
        rect.width > 82 ||
        rect.height > 62 ||
        rect.bottom < 0 ||
        rect.top > 58 ||
        rect.right < viewportWidth * 0.45
      ) {
        continue;
      }

      const style = window.getComputedStyle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0) {
        continue;
      }

      const descriptor = descriptorForElement(element);
      const explicitChat = isChatDescriptor(descriptor);
      const visibleText = normalizeText(element.innerText);
      const hasIcon = Boolean(
        element.matches("img, svg, i") ||
        element.querySelector("img, svg, i") ||
        /(?:^|[\s_-])(icon|fa|fas|far|fal|glyphicon|material-icons)(?:$|[\s_-])/i.test(descriptor)
      );

      // Text navigation items such as Admin are not part of the account-icon cluster.
      if (!explicitChat && visibleText.length > 3) continue;
      if (!explicitChat && !hasIcon) continue;

      candidates.push({ element, rect, descriptor, explicitChat });
    }

    candidates.sort((a, b) => a.rect.left - b.rect.left || a.rect.width - b.rect.width);

    // Several icon libraries make both a wrapper and its child clickable. Keep one
    // representative for each visual rectangle so spacing calculations stay accurate.
    const unique = [];
    for (const candidate of candidates) {
      const duplicateIndex = unique.findIndex((existing) => {
        const centerDistance = Math.abs(
          existing.rect.left + existing.rect.width / 2 -
          (candidate.rect.left + candidate.rect.width / 2)
        );
        const verticalDistance = Math.abs(
          existing.rect.top + existing.rect.height / 2 -
          (candidate.rect.top + candidate.rect.height / 2)
        );
        return centerDistance < 3 && verticalDistance < 3;
      });

      if (duplicateIndex < 0) {
        unique.push(candidate);
      } else if (candidate.explicitChat && !unique[duplicateIndex].explicitChat) {
        unique[duplicateIndex] = candidate;
      }
    }

    return unique;
  }

  function findChatIconAnchor() {
    const candidates = collectTopBarIconCandidates();
    if (!candidates.length) return { anchor: null, candidates: [] };

    const explicit = candidates
      .filter((candidate) => candidate.explicitChat)
      .sort((a, b) => b.rect.right - a.rect.right);

    if (explicit.length) {
      return { anchor: explicit[0], candidates };
    }

    // Fallback: the chat bubble is the leftmost item in STRATUS's compact
    // top-right icon cluster. Build that cluster from the right edge inward.
    const byRightEdge = [...candidates].sort((a, b) => b.rect.right - a.rect.right);
    const cluster = [byRightEdge[0]];

    for (let i = 1; i < byRightEdge.length; i += 1) {
      const candidate = byRightEdge[i];
      const leftmost = cluster.reduce(
        (current, item) => item.rect.left < current.rect.left ? item : current,
        cluster[0]
      );
      const horizontalGap = leftmost.rect.left - candidate.rect.right;
      const candidateCenterY = candidate.rect.top + candidate.rect.height / 2;
      const clusterCenterY = leftmost.rect.top + leftmost.rect.height / 2;

      if (horizontalGap >= -4 && horizontalGap <= 30 && Math.abs(candidateCenterY - clusterCenterY) <= 14) {
        cluster.push(candidate);
      } else if (horizontalGap > 30) {
        break;
      }
    }

    cluster.sort((a, b) => a.rect.left - b.rect.left);
    return {
      anchor: cluster.length >= 2 ? cluster[0] : null,
      candidates
    };
  }

  function positionBadgeBesideChatIcon() {
    ensureBadge();
    if (!badgeElement) return;

    const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
    const { anchor } = findChatIconAnchor();

    if (!anchor) {
      badgeElement.style.right = `${FALLBACK_RIGHT_OFFSET_PX}px`;
      badgeElement.style.top = `${FALLBACK_TOP_PX}px`;
      badgeElement.dataset.anchor = "fallback";
      badgeElement.dataset.verticalAnchor = "fallback";
      return;
    }

    const badgeRightEdge = anchor.rect.left - CHAT_ICON_GAP_PX;
    const rightOffset = Math.max(8, Math.round(viewportWidth - badgeRightEdge));

    // Match the badge's vertical center to the chat icon's vertical center.
    // scrollY converts the viewport-relative icon rectangle into a page-relative
    // coordinate, so the absolutely positioned badge still scrolls away with the bar.
    const badgeHeight = badgeElement.getBoundingClientRect().height;
    const anchorCenterY = window.scrollY + anchor.rect.top + anchor.rect.height / 2;
    const badgeTop = Math.max(0, Math.round(anchorCenterY - badgeHeight / 2));

    badgeElement.style.left = "auto";
    badgeElement.style.right = `${rightOffset}px`;
    badgeElement.style.top = `${badgeTop}px`;
    badgeElement.dataset.anchor = "chat-icon";
    badgeElement.dataset.verticalAnchor = "chat-icon-center";
    badgeElement.dataset.spacing = String(CHAT_ICON_GAP_PX);
  }

  function scheduleBadgePositioning(delayMilliseconds = 0) {
    window.clearTimeout(badgePositionTimer);
    badgePositionTimer = window.setTimeout(() => {
      window.requestAnimationFrame(positionBadgeBesideChatIcon);
    }, delayMilliseconds);
  }

  function setDisplayedValue(element, value, fallback, status) {
    if (!element) return;
    const normalized = normalizeText(value);
    element.textContent = normalized || fallback;
    element.dataset.status = normalized ? "ready" : status;
  }

  async function readManualOverrides() {
    const stored = await chrome.storage.local.get(MANUAL_STORAGE_KEYS);
    return {
      company: normalizeText(stored.manualCompany),
      station: normalizeText(stored.manualStation)
    };
  }

  async function renderCurrentPage() {
    ensureBadge();
    if (!companyValueElement || !stationValueElement) return;

    const manual = await readManualOverrides();

    const company = manual.company || (pageDetails.companyKnown ? pageDetails.company : "");
    const companyFallback = pageDetails.companyKnown ? NOT_DETECTED_TEXT : unknownText;
    const companyStatus = pageDetails.companyKnown ? "not-detected" : "unknown";

    const station = manual.station || (pageDetails.stationKnown ? pageDetails.station : "");
    const stationFallback = pageDetails.stationKnown ? NOT_SIGNED_IN_TEXT : unknownText;
    const stationStatus = pageDetails.stationKnown ? "not-signed-in" : "unknown";

    setDisplayedValue(
      companyValueElement,
      company,
      companyFallback,
      manual.company ? "ready" : companyStatus
    );
    setDisplayedValue(
      stationValueElement,
      station,
      stationFallback,
      manual.station ? "ready" : stationStatus
    );
  }

  function linesFromElement(element) {
    return String(element?.innerText ?? "")
      .split(/\r?\n/)
      .map(normalizeText)
      .filter(Boolean);
  }

  function extractValueFromLabelElement(labelElement, labelPattern, inlinePattern) {
    const directText = normalizeText(labelElement.textContent);
    const inlineMatch = directText.match(inlinePattern);
    if (inlineMatch && isPlausibleValue(inlineMatch[1])) {
      return normalizeText(inlineMatch[1]);
    }

    let current = labelElement;
    for (let level = 0; current && current !== document.body && level < 7; level += 1) {
      const lines = linesFromElement(current);
      const labelIndex = lines.findIndex((line) => labelPattern.test(line));

      if (labelIndex >= 0) {
        for (let i = labelIndex + 1; i < Math.min(lines.length, labelIndex + 4); i += 1) {
          if (isPlausibleValue(lines[i])) return lines[i];
        }
      }

      current = current.parentElement;
    }

    const siblingCandidates = [];
    let sibling = labelElement.nextElementSibling;
    for (let i = 0; sibling && i < 4; i += 1, sibling = sibling.nextElementSibling) {
      siblingCandidates.push(...linesFromElement(sibling));
    }

    return siblingCandidates.find(isPlausibleValue) ?? "";
  }

  function findLabeledFieldInDom(labelPattern, inlinePattern) {
    if (!document.body) return { labelFound: false, value: "" };

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode(node) {
          const text = normalizeText(node.nodeValue);
          if (labelPattern.test(text) || inlinePattern.test(text)) {
            return NodeFilter.FILTER_ACCEPT;
          }
          return NodeFilter.FILTER_REJECT;
        }
      }
    );

    let node;
    while ((node = walker.nextNode())) {
      const parent = node.parentElement;
      if (!parent) continue;

      const text = normalizeText(node.nodeValue);
      const inlineMatch = text.match(inlinePattern);
      if (inlineMatch && isPlausibleValue(inlineMatch[1])) {
        return { labelFound: true, value: normalizeText(inlineMatch[1]) };
      }

      if (labelPattern.test(text)) {
        return {
          labelFound: true,
          value: extractValueFromLabelElement(parent, labelPattern, inlinePattern)
        };
      }
    }

    return { labelFound: false, value: "" };
  }

  function findSignedInDetailsInDom() {
    return {
      company: findLabeledFieldInDom(COMPANY_LABEL_PATTERN, COMPANY_INLINE_PATTERN),
      station: findLabeledFieldInDom(STATION_LABEL_PATTERN, STATION_INLINE_PATTERN)
    };
  }

  function applyDomDetection(result) {
    const menuConfirmed = result.company.labelFound || result.station.labelFound;

    if (result.company.labelFound) {
      pageDetails.companyKnown = true;
      pageDetails.company = isPlausibleValue(result.company.value)
        ? normalizeText(result.company.value)
        : "";
    }

    if (result.station.labelFound) {
      pageDetails.stationKnown = true;
      pageDetails.station = isPlausibleValue(result.station.value)
        ? normalizeText(result.station.value)
        : "";
    } else if (menuConfirmed && result.company.labelFound) {
      // STRATUS omits the entire station section when no station is signed in.
      pageDetails.stationKnown = true;
      pageDetails.station = "";
    }

    return menuConfirmed;
  }

  async function persistPageDetection() {
    const updates = { detectedAt: Date.now() };
    const removals = [];

    if (pageDetails.companyKnown) {
      if (isPlausibleValue(pageDetails.company)) {
        updates.detectedCompany = pageDetails.company;
        updates.detectedCompanyState = "detected";
      } else {
        removals.push("detectedCompany");
        updates.detectedCompanyState = "not-detected";
      }
    }

    if (pageDetails.stationKnown) {
      if (isPlausibleValue(pageDetails.station)) {
        updates.detectedStation = pageDetails.station;
        updates.detectedStationState = "signed-in";
      } else {
        removals.push("detectedStation");
        updates.detectedStationState = "not-signed-in";
      }
    }

    if (Object.keys(updates).length > 1) {
      await chrome.storage.local.set(updates);
    }
    if (removals.length) {
      await chrome.storage.local.remove(removals);
    }
  }

  function candidateScore(element) {
    const rect = element.getBoundingClientRect();
    if (
      rect.width < 12 ||
      rect.height < 12 ||
      rect.bottom < 0 ||
      rect.top > 85 ||
      rect.right < window.innerWidth * 0.65
    ) {
      return -Infinity;
    }

    const descriptor = normalizeText(
      [
        element.getAttribute("aria-label"),
        element.getAttribute("title"),
        element.id,
        element.className,
        element.parentElement?.className
      ].join(" ")
    ).toLowerCase();

    let score = 0;
    if (/(account|profile|user|avatar|identity)/.test(descriptor)) score += 10;
    if (/(dropdown|menu|toggle)/.test(descriptor)) score += 4;
    if (element.matches('[aria-haspopup="menu"], [aria-haspopup="true"]')) score += 4;
    if (element.matches(".dropdown-toggle, [data-toggle='dropdown'], [data-bs-toggle='dropdown']")) score += 4;
    if (element.querySelector("img, svg")) score += 2;
    if (rect.right > window.innerWidth * 0.9) score += 3;
    score += rect.right / Math.max(window.innerWidth, 1);

    return score;
  }

  function findLikelyAccountToggle() {
    const selectors = [
      '[aria-label*="account" i]',
      '[aria-label*="profile" i]',
      '[aria-label*="user" i]',
      '[title*="account" i]',
      '[title*="profile" i]',
      '[title*="user" i]',
      ".dropdown-toggle",
      "[data-toggle='dropdown']",
      "[data-bs-toggle='dropdown']",
      '[aria-haspopup="menu"]',
      '[aria-haspopup="true"]'
    ];

    const candidates = [...new Set(document.querySelectorAll(selectors.join(",")))]
      .map((element) => ({ element, score: candidateScore(element) }))
      .filter((item) => Number.isFinite(item.score))
      .sort((a, b) => b.score - a.score);

    return candidates[0]?.score >= 5 ? candidates[0].element : null;
  }

  function delay(milliseconds) {
    return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
  }

  async function waitForAccountMenu(timeoutMilliseconds = 1600) {
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMilliseconds) {
      const details = findSignedInDetailsInDom();
      if (details.company.labelFound || details.station.labelFound) {
        return details;
      }
      await delay(100);
    }

    return findSignedInDetailsInDom();
  }

  async function detectDetails({ mayOpenMenu = false, force = false } = {}) {
    if (detectionRunning || !document.body) return;
    detectionRunning = true;

    try {
      unknownText = UNKNOWN_TEXT;

      const direct = findSignedInDetailsInDom();
      const menuAlreadyVisible = applyDomDetection(direct);

      if (menuAlreadyVisible) {
        await persistPageDetection();
        await renderCurrentPage();
        if (pageDetails.companyKnown && pageDetails.stationKnown) return;
      }

      if (!mayOpenMenu) {
        await renderCurrentPage();
        return;
      }

      const now = Date.now();
      if (!force && now - lastMenuProbeAt < 30000) return;
      lastMenuProbeAt = now;

      const toggle = findLikelyAccountToggle();
      if (!toggle) {
        unknownText = OPEN_MENU_TEXT;
        await renderCurrentPage();
        return;
      }

      const ariaExpanded = toggle.getAttribute("aria-expanded") === "true";
      const openedByExtension = !menuAlreadyVisible && !ariaExpanded;

      if (openedByExtension) toggle.click();

      const afterOpen = await waitForAccountMenu();
      const menuConfirmed = applyDomDetection(afterOpen);

      if (menuConfirmed) {
        await persistPageDetection();
      } else {
        unknownText = OPEN_MENU_TEXT;
      }

      await renderCurrentPage();

      if (openedByExtension) {
        await delay(100);
        toggle.click();
      }
    } catch (error) {
      console.debug("STRATUS Company & Station Badge detection error:", error);
      unknownText = OPEN_MENU_TEXT;
      await renderCurrentPage();
    } finally {
      detectionRunning = false;
    }
  }

  async function resetAndDetectFresh() {
    pageDetails = createEmptyPageDetails();
    unknownText = UNKNOWN_TEXT;
    lastMenuProbeAt = 0;
    await renderCurrentPage();
    await detectDetails({ mayOpenMenu: true, force: true });
  }

  function startMutationObserver() {
    const observer = new MutationObserver(() => {
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(() => detectDetails({ mayOpenMenu: false }), 350);
      scheduleBadgePositioning(100);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  }

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== "local") return;
    if (!MANUAL_STORAGE_KEYS.some((key) => Object.hasOwn(changes, key))) return;
    renderCurrentPage();
  });

  async function initialize() {
    ensureBadge();
    startMutationObserver();
    scheduleBadgePositioning();
    await resetAndDetectFresh();

    // Re-measure after STRATUS finishes rendering its icon row. This keeps the
    // badge aligned through different window sizes, zoom levels, and accounts.
    window.setTimeout(() => scheduleBadgePositioning(), 350);
    window.setTimeout(() => scheduleBadgePositioning(), 1200);
    window.setTimeout(() => scheduleBadgePositioning(), 2500);

    // Give slower STRATUS pages a second fresh attempt after the navigation
    // and account controls have finished rendering.
    window.setTimeout(() => detectDetails({ mayOpenMenu: true, force: true }), 1800);
  }

  window.addEventListener("pageshow", (event) => {
    scheduleBadgePositioning();
    if (event.persisted) resetAndDetectFresh();
  });

  window.addEventListener("resize", () => scheduleBadgePositioning(80));

  if (document.fonts?.ready) {
    document.fonts.ready.then(() => scheduleBadgePositioning());
  }

  initialize();
})();
