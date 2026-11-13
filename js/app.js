import { createWorld } from "./world.js";
import { Ambience } from "./audio.js";
import { CATEGORIES } from "./exhibits.js";

const dom = {
  canvas: document.querySelector("#world"),
  loading: document.querySelector("#loading"),
  startOverlay: document.querySelector("#start-overlay"),
  pauseOverlay: document.querySelector("#pause-overlay"),
  enterButton: document.querySelector("#enter-button"),
  resumeButton: document.querySelector("#resume-button"),
  menuButton: document.querySelector("#menu-button"),
  startControls: document.querySelector("#start-controls"),
  hud: document.querySelector("#hud"),
  targetCard: document.querySelector("#target-card"),
  targetMeta: document.querySelector("#target-meta"),
  targetTitle: document.querySelector("#target-title"),
  targetHint: document.querySelector("#target-hint"),
  crosshair: document.querySelector("#crosshair"),
  soundState: document.querySelector("#sound-state"),
  errorCard: document.querySelector("#error-card"),
  errorMessage: document.querySelector("#error-message"),
  reloadButton: document.querySelector("#reload-button"),
  touchStick: document.querySelector("#touch-stick"),
  touchKnob: document.querySelector("#touch-knob"),
  touchJump: document.querySelector("#touch-jump"),
  reader: document.querySelector("#reader"),
  readerClose: document.querySelector("#reader-close"),
  readerScroll: document.querySelector("#reader-scroll"),
  startNote: document.querySelector("#start-note"),
  longPage: document.querySelector('[data-cv-page="long"]'),
  findPage: document.querySelector('[data-cv-page="find"]'),
};

const cvButtons = Array.from(document.querySelectorAll("[data-cv-panel]"));
let lastReaderTrigger = null;

const SITE_URL = "https://mach3tryhard.github.io/";
const EMAIL = "matei.sirghe@gmail.com";

const PROFILE_TEXT =
  "Computer science student at the University of Bucharest and HPC software engineering intern at IFIN-HH. I tutor C and C++, and I build games, simulations and tools in C++, Python and JavaScript — from a C++ game engine to a quantum gate simulator.";

const SKILLS = [
  ["Languages", "C/C++ (Modern C++23), Python, JavaScript, SQL, Assembly, C#"],
  ["Systems & Technologies", "SLURM, MQTT, Linux/UNIX environments, Docker, CMake, Git, GitHub Actions"],
  ["Frameworks & Libraries", "SFML, Node, Express, Playwright, Three.js, Textual, Oracle SQL, PL/SQL"],
  ["Spoken Languages", "Romanian (Native), English (C2 Proficient)"],
];

const LONG_ORDER = ["education", "experience", "contests", "coding", "games", "cad", "social"];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function normalizeHref(value) {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  if (/^(https?:|mailto:)/i.test(text)) return text;

  // Local documents: a bare filename is served from assets/documents, and
  // spaces are encoded for the browser.
  if (/\.(pdf|zip|docx?|png|jpe?g|webp)$/i.test(text) || text.startsWith("assets/")) {
    const cleaned = text.replace(/^\/+/, "");
    const local = cleaned.includes("/") ? cleaned : `assets/documents/${cleaned}`;
    return encodeURI(local);
  }

  return `https://${text.replace(/^\/+/, "")}`;
}

function displayHref(value) {
  return String(value ?? "")
    .replace(/^https?:\/\//i, "")
    .replace(/\/$/, "");
}

function actionLabel(href) {
  const url = String(href).toLowerCase();
  if (url.startsWith("mailto:")) return "Email";
  if (url.endsWith(".pdf")) return "PDF";
  if (url.includes("github.com") || url.includes("gitlab.com")) return "Code";
  if (url.includes("gamejolt.com") || url.includes("itch.io") || url.includes("roblox.com")) {
    return "Play";
  }
  if (url.includes("leetcode.com") || url.includes("codeforces.com") || url.includes("linkedin.com")) {
    return "Profile";
  }
  return "Open";
}

/** Links an exhibit can expose: `code`, `app`, `play`, `demo`, `links` or `link`. */
function actionsFor(exhibit) {
  const actions = [];
  const add = (href, label) => {
    const normalized = normalizeHref(href);
    if (!normalized || actions.some((action) => action.href === normalized)) return;
    actions.push({ href: normalized, label: label || actionLabel(normalized) });
  };

  if (exhibit.code) add(exhibit.code, "Code");
  if (exhibit.app) add(exhibit.app, "Open");
  if (exhibit.play) add(exhibit.play, "Play");
  if (exhibit.demo) add(exhibit.demo, "Demo");

  if (Array.isArray(exhibit.links)) {
    for (const entry of exhibit.links) {
      if (typeof entry === "string") add(entry);
      else if (entry?.href || entry?.url) add(entry.href || entry.url, entry.label);
    }
  }

  if (exhibit.link) add(exhibit.link);
  return actions;
}

function actionMarkup(actions) {
  if (!actions.length) return "";
  return `<div class="cv-entry__actions">${actions.map((action) => (
    `<a class="cv-entry__action" href="${escapeHtml(action.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(action.label)}<span aria-hidden="true">↗</span></a>`
  )).join("")}</div>`;
}

function entryMarkup(exhibit, categoryKey) {
  const title = escapeHtml(exhibit.title);
  const year = exhibit.year ? `<span>${escapeHtml(exhibit.year)}</span>` : "";
  const kindClass = categoryKey === "education" || categoryKey === "experience"
    ? "cv-entry__role"
    : "cv-entry__label";
  const kind = exhibit.kind ? `<p class="${kindClass}">${escapeHtml(exhibit.kind)}</p>` : "";
  const tech = exhibit.tech ? `<p class="cv-entry__tech">${escapeHtml(exhibit.tech)}</p>` : "";
  const body = exhibit.body ? `<p>${escapeHtml(exhibit.body)}</p>` : "";
  return `<div class="cv-entry">
    <div class="cv-entry__head"><b>${title}</b>${year}</div>
    ${kind}${tech}${body}${actionMarkup(actionsFor(exhibit))}
  </div>`;
}

function sectionMarkup(title, content) {
  return `<section class="cv-section">
    <h3>${escapeHtml(title)}</h3>
    <div class="cv-section__content">${content}</div>
  </section>`;
}

function buildReaderPages() {
  const social = CATEGORIES.find((category) => category.key === "social");
  const socialEntries = social?.exhibits ?? [];
  const socialLinks = socialEntries
    .map((exhibit) => ({
      label: exhibit.title,
      href: normalizeHref(exhibit.link),
      display: displayHref(exhibit.link),
    }))
    .filter((link) => link.href);
  const findLinks = [
    ...socialLinks,
    { label: "Website", href: SITE_URL, display: displayHref(SITE_URL) },
    { label: "Email", href: `mailto:${EMAIL}`, display: EMAIL },
  ];

  const identity = [
    ...socialEntries.map((exhibit) => {
      const href = normalizeHref(exhibit.link);
      if (!href) return "";
      return `<li><a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(displayHref(exhibit.link))}</a></li>`;
    }),
    `<li><a href="mailto:${EMAIL}">${EMAIL}</a></li>`,
  ].filter(Boolean).join("");

  const sections = [
    sectionMarkup("Profile", `<div class="cv-entry"><p>${PROFILE_TEXT}</p></div>`),
  ];

  for (const key of LONG_ORDER) {
    const category = CATEGORIES.find((item) => item.key === key);
    if (!category) continue;
    const content = category.exhibits.map((exhibit) => entryMarkup(exhibit, key)).join("");
    sections.push(sectionMarkup(category.title, content));
  }

  sections.push(sectionMarkup("Skills", `<div class="cv-entry">${SKILLS.map(
    ([label, value]) => `<p><b>${escapeHtml(label)}</b>: ${escapeHtml(value)}</p>`
  ).join("")}</div>`));

  sections.push(sectionMarkup("Elsewhere", `<div class="cv-entry">${findLinks.map((link) => {
    const target = link.href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
    return `<p><a href="${escapeHtml(link.href)}"${target}>${escapeHtml(link.label)} — ${escapeHtml(link.display)}</a></p>`;
  }).join("")}</div>`));

  dom.longPage.innerHTML = `
    <header class="reader__identity">
      <p class="reader__eyebrow">Long CV</p>
      <h2>Matei Sîrghe</h2>
      <p class="reader__role">BEng Computer Science · University of Bucharest</p>
      <ul class="reader__links">${identity}</ul>
    </header>
    <div class="cv-body">${sections.join("")}</div>
    <footer class="reader__foot">Last updated November 2026 · <a href="mailto:${EMAIL}">${EMAIL}</a></footer>
  `;

  dom.findPage.innerHTML = `
    <header class="reader__identity">
      <p class="reader__eyebrow">Where to find me</p>
      <h2>Elsewhere</h2>
    </header>
    <ul class="find-list">
      ${findLinks.map((link) => {
        const target = link.href.startsWith("http") ? ' target="_blank" rel="noopener noreferrer"' : "";
        return `<li><a href="${escapeHtml(link.href)}"${target}>
          <span class="find-list__label">${escapeHtml(link.label)}</span>
          <span class="find-list__value">${escapeHtml(link.display)}</span>
          <span class="find-list__arrow" aria-hidden="true">↗</span>
        </a></li>`;
      }).join("")}
    </ul>
    <footer class="reader__foot">Last updated November 2026.</footer>
  `;
}

const state = {
  world: null,
  audio: null,
  started: false,
  lockPending: false,
  playIntent: false,
  isTouch: false,
};

let lockRetryTimer = 0;
let lockRetryCount = 0;

function stopLockRetries() {
  state.playIntent = false;
  lockRetryCount = 0;
  window.clearTimeout(lockRetryTimer);
  lockRetryTimer = 0;
}

// Chrome refuses to lock the pointer for a moment after Escape. Ask again a
// few times during that window instead of making the visitor click the canvas.
function tryPointerLock() {
  if (!state.playIntent || !state.world || state.isTouch) return false;
  if (state.world.player.locked || document.pointerLockElement) {
    stopLockRetries();
    return true;
  }

  state.lockPending = true;
  const requested = state.world.player.requestLock();

  if (!requested) {
    state.lockPending = false;
    if (lockRetryCount < 6) {
      lockRetryCount += 1;
      window.clearTimeout(lockRetryTimer);
      lockRetryTimer = window.setTimeout(() => {
        if (state.playIntent) tryPointerLock();
      }, 250 + lockRetryCount * 220);
    }
    return false;
  }

  window.clearTimeout(lockRetryTimer);
  if (lockRetryCount < 6) {
    lockRetryCount += 1;
    lockRetryTimer = window.setTimeout(() => {
      if (state.playIntent) tryPointerLock();
    }, 250 + lockRetryCount * 220);
  }
  return true;
}

async function waitForPaint() {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function setHudVisible(visible) {
  dom.hud.setAttribute("aria-hidden", visible ? "false" : "true");
  dom.hud.inert = !visible;
}

function hideStartOverlay() {
  dom.startOverlay.classList.add("is-hidden");
  window.setTimeout(() => {
    dom.startOverlay.hidden = true;
  }, 950);
}

function openReader(panelName, trigger) {
  const page = document.querySelector(`[data-cv-page="${panelName}"]`);
  if (!page) return;

  document.querySelectorAll("[data-cv-page]").forEach((article) => {
    article.hidden = article !== page;
  });

  dom.reader.hidden = false;
  dom.reader.setAttribute("aria-hidden", "false");
  dom.readerScroll.scrollTop = 0;
  document.body.classList.add("is-reading");
  dom.startOverlay.inert = true;
  lastReaderTrigger = trigger || null;
  dom.readerClose.focus({ preventScroll: true });
}

function closeReader() {
  if (dom.reader.hidden) return;
  dom.reader.hidden = true;
  dom.reader.setAttribute("aria-hidden", "true");
  document.body.classList.remove("is-reading");
  dom.startOverlay.inert = false;
  if (lastReaderTrigger) lastReaderTrigger.focus({ preventScroll: true });
}

function hideLoading() {
  dom.loading.classList.add("is-hidden");
  window.setTimeout(() => {
    dom.loading.hidden = true;
  }, 1050);
}

function showError(error) {
  console.error(error);
  dom.loading.hidden = true;
  dom.loading.classList.add("is-hidden");
  dom.pauseOverlay.hidden = true;
  dom.startOverlay.hidden = false;
  dom.startOverlay.classList.remove("is-hidden");
  dom.startOverlay.inert = false;
  dom.enterButton.hidden = true;
  dom.startControls.hidden = true;
  dom.startNote.hidden = false;
  dom.startNote.textContent = "The 3D gallery could not start in this browser. Short CV, Long CV and Where to find me still work above.";
  setHudVisible(false);
}

function showPause() {
  if (state.isTouch) return;
  stopLockRetries();
  state.world?.stopLoop();
  dom.resumeButton.querySelector(".enter-button__label").textContent = "Resume";
  dom.pauseOverlay.hidden = false;
  document.body.classList.remove("is-playing");
  document.body.classList.add("is-paused");
  setHudVisible(false);
  hideTarget();
  state.audio?.setPaused(true);
}

function hidePause() {
  dom.pauseOverlay.hidden = true;
  document.body.classList.remove("is-paused");
}

function returnToMenu() {
  if (!state.world) return;

  stopLockRetries();
  if (document.pointerLockElement) document.exitPointerLock();
  state.world.player.pause();
  state.world.stopLoop();
  state.world.resetToSpawn();

  hidePause();
  hideTarget();
  setHudVisible(false);
  document.body.classList.remove("is-playing", "is-paused");

  state.started = false;
  state.lockPending = false;
  state.audio?.setPaused(true);

  dom.enterButton.querySelector(".enter-button__label").textContent =
    "Enter 3D exploration environment";
  dom.startOverlay.hidden = false;
  dom.startOverlay.classList.remove("is-hidden");
  dom.startOverlay.inert = false;

  cvButtons[0]?.focus({ preventScroll: true });
}

function startPlayState() {
  state.started = true;
  state.lockPending = false;
  stopLockRetries();
  state.world?.startLoop();
  dom.enterButton.querySelector(".enter-button__label").textContent = "Enter";
  dom.resumeButton.querySelector(".enter-button__label").textContent = "Resume";
  hideStartOverlay();
  hidePause();
  document.body.classList.add("is-playing");
  document.body.classList.remove("is-paused");
  setHudVisible(true);
  state.audio?.setPaused(false);
}

function hideTarget() {
  dom.targetCard.classList.remove("is-visible");
  dom.crosshair.classList.remove("is-target");
}

function handleTargetChange(target) {
  if (!target) {
    hideTarget();
    return;
  }

  dom.crosshair.classList.add("is-target");

  // Once the visitor is close enough to actually read, get the UI out of the way.
  if (target.near) {
    dom.targetCard.classList.remove("is-visible");
    return;
  }

  dom.targetMeta.textContent = target.number;
  dom.targetTitle.textContent = target.title;
  dom.targetHint.textContent = "Move closer";
  dom.targetCard.classList.add("is-visible");
}

function updateSoundUi() {
  if (!state.audio) return;
  const muted = state.audio.muted;
  dom.soundState.classList.toggle("is-muted", muted);
  dom.soundState.setAttribute("aria-pressed", String(muted));
  dom.soundState.innerHTML = `<i></i> ${muted ? "Sound muted" : "Sound on"}`;
}

async function toggleSound() {
  if (!state.audio) return;
  state.audio.toggleMuted();
  updateSoundUi();
}

function handleLockChange(locked) {
  if (locked) {
    if (!state.started) state.started = true;
    state.lockPending = false;
    state.world?.player.resume();
    state.audio?.start();
    startPlayState();
    return;
  }

  // A lock request that is still in flight is not an Escape press.
  if (state.lockPending) {
    state.lockPending = false;
    return;
  }

  stopLockRetries();

  if (state.started && !state.isTouch) {
    state.world?.player.pause();
    showPause();
    dom.resumeButton.querySelector(".enter-button__label").textContent = "Resume";
    return;
  }

  state.world?.player.pause();
  dom.enterButton.querySelector(".enter-button__label").textContent = "Enter";
}

function enterTouchMode() {
  state.started = true;
  stopLockRetries();
  state.world.player.start({ touch: true });
  state.world.startLoop();
  document.body.classList.add("is-touch", "is-playing");
  hideStartOverlay();
  setHudVisible(true);
  state.audio?.start();
  state.audio?.setPaused(false);
}

async function enterGallery() {
  if (!state.world || !dom.reader.hidden) return;
  state.audio?.start();

  if (state.isTouch) {
    enterTouchMode();
    return;
  }

  state.lockPending = true;
  state.playIntent = true;
  lockRetryCount = 0;
  dom.enterButton.querySelector(".enter-button__label").textContent = "Opening";
  state.world.player.start();
  const requested = tryPointerLock();

  if (!requested) {
    state.lockPending = false;
    dom.enterButton.querySelector(".enter-button__label").textContent = "Enter";
  }
}

function resumeGallery() {
  if (!state.world) return;

  // Dismiss the pause screen first, then try to re-acquire the pointer lock.
  // If the browser is in its post-Escape cooldown, tryPointerLock keeps asking
  // for a moment instead of showing a "try again" screen.
  state.playIntent = true;
  lockRetryCount = 0;
  hidePause();
  document.body.classList.add("is-playing");
  document.body.classList.remove("is-paused");
  setHudVisible(true);
  hideTarget();
  state.world.startLoop();
  state.world.player.resume();
  state.audio?.setPaused(false);

  const requested = tryPointerLock();
  if (!requested) state.lockPending = false;
}

function bindUi() {
  dom.enterButton.addEventListener("click", enterGallery);
  dom.menuButton.addEventListener("click", returnToMenu);
  dom.resumeButton.addEventListener("click", () => {
    resumeGallery();
  });
  dom.reloadButton.addEventListener("click", () => window.location.reload());
  dom.readerClose.addEventListener("click", closeReader);
  dom.reader.querySelector(".reader__scrim").addEventListener("click", closeReader);
  cvButtons.forEach((button) => {
    button.addEventListener("click", () => openReader(button.dataset.cvPanel, button));
  });
  dom.soundState.addEventListener("click", () => {
    toggleSound();
  });

  document.addEventListener("keydown", (event) => {
    if (event.code === "KeyM" && !event.repeat && dom.reader.hidden) {
      event.preventDefault();
      toggleSound();
    }
    if (event.code === "Escape" && !dom.reader.hidden) {
      event.preventDefault();
      closeReader();
    }
  });

  document.addEventListener("pointerlockerror", () => {
    state.lockPending = false;
    dom.enterButton.querySelector(".enter-button__label").textContent = "Enter";
    dom.resumeButton.querySelector(".enter-button__label").textContent = "Resume";
  });

  dom.canvas.addEventListener("click", () => {
    if (!state.started || state.isTouch || !dom.reader.hidden) return;

    if (state.world?.player.locked || document.pointerLockElement) {
      const target = state.world?.getTarget();
      const href = normalizeHref(target?.exhibit?.link);
      if (href) window.open(href, "_blank", "noopener");
      return;
    }

    state.playIntent = true;
    lockRetryCount = 0;
    const requested = tryPointerLock();
    if (!requested) state.lockPending = false;
  });
}

function bindTouch() {
  let joystickPointer = null;
  let lookPointer = null;
  let lastLookX = 0;
  let lastLookY = 0;

  const resetStick = () => {
    joystickPointer = null;
    dom.touchKnob.style.transform = "translate3d(0, 0, 0)";
    state.world?.player.setTouchMove(0, 0);
  };

  const updateStick = (event) => {
    const rect = dom.touchStick.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let x = (event.clientX - cx) / (rect.width / 2 - 22);
    let y = (event.clientY - cy) / (rect.height / 2 - 22);
    const length = Math.hypot(x, y);
    if (length > 1) {
      x /= length;
      y /= length;
    }
    dom.touchKnob.style.transform = `translate3d(${x * 32}px, ${y * 32}px, 0)`;
    state.world?.player.setTouchMove(x, y);
  };

  dom.touchStick.addEventListener("pointerdown", (event) => {
    if (!state.isTouch) return;
    joystickPointer = event.pointerId;
    dom.touchStick.setPointerCapture(event.pointerId);
    updateStick(event);
    event.preventDefault();
  });

  dom.touchStick.addEventListener("pointermove", (event) => {
    if (event.pointerId !== joystickPointer) return;
    updateStick(event);
    event.preventDefault();
  });

  const endStick = (event) => {
    if (event.pointerId !== joystickPointer) return;
    resetStick();
  };

  dom.touchStick.addEventListener("pointerup", endStick);
  dom.touchStick.addEventListener("pointercancel", endStick);
  dom.touchStick.addEventListener("lostpointercapture", resetStick);

  dom.canvas.addEventListener("pointerdown", (event) => {
    if (!state.isTouch || !state.started) return;
    lookPointer = event.pointerId;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    dom.canvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  dom.canvas.addEventListener("pointermove", (event) => {
    if (event.pointerId !== lookPointer) return;
    const dx = event.clientX - lastLookX;
    const dy = event.clientY - lastLookY;
    lastLookX = event.clientX;
    lastLookY = event.clientY;
    state.world?.player.addLookDelta(dx, dy, 0.0038);
    event.preventDefault();
  });

  const endLook = (event) => {
    if (event.pointerId !== lookPointer) return;
    lookPointer = null;
  };

  dom.canvas.addEventListener("pointerup", endLook);
  dom.canvas.addEventListener("pointercancel", endLook);

  dom.touchJump.addEventListener("pointerdown", (event) => {
    if (!state.isTouch) return;
    event.preventDefault();
    state.world?.player.jump();
  });
}

async function init() {
  state.isTouch =
    window.matchMedia("(pointer: coarse)").matches ||
    !("requestPointerLock" in dom.canvas);

  if (state.isTouch) {
    document.body.classList.add("is-touch");
    dom.startControls.innerHTML = "<kbd>STICK</kbd><kbd>DRAG</kbd>";
  }

  await waitForPaint();
  bindUi();
  buildReaderPages();

  try {
    state.world = await createWorld(dom.canvas, {
      onTargetChange: handleTargetChange,
    });
    state.audio = new Ambience();
    state.world.player.onLockChange = handleLockChange;
    state.world.player.onStep = (step) => state.audio?.footstep(step);
    state.audio.setMuted(false);
    updateSoundUi();

    await waitForPaint();
    hideLoading();
    bindTouch();

    window.__MUSEUM__ = {
      world: state.world,
      audio: state.audio,
      view({ x = 0, z = 8.4, yaw = 0, pitch = 0, hud = false } = {}) {
        dom.loading.hidden = true;
        dom.startOverlay.hidden = true;
        dom.pauseOverlay.hidden = true;
        document.body.classList.add("is-playing");
        document.body.classList.remove("is-paused");
        state.world.startLoop();
        state.world.setPose({ x, z, yaw, pitch });
        setHudVisible(hud);
        dom.hud.style.display = hud ? "" : "none";
      },
      hideOverlays() {
        dom.loading.hidden = true;
        dom.startOverlay.hidden = true;
        dom.pauseOverlay.hidden = true;
        state.world.startLoop();
      },
      setTargetHud: handleTargetChange,
      hideTarget,
      showPause,
    };
  } catch (error) {
    showError(error);
  }
}

init();
