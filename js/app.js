/**
 * Contrôleur principal de la page d'indices (index.html).
 * Aucun usage de innerHTML : toute l'interface est construite via les API DOM natives.
 */
(function () {
  "use strict";

  const STORAGE_KEY = "seysses2026_indices_state_v1";
  const GRID_STORAGE_KEY = "seysses2026_easy_grid_v1";
  const MYSTERY_STORAGE_KEY = "seysses2026_mystery_grid_v1";
  const ANTICHEAT_STORAGE_KEY = "seysses2026_anticheat_v1";

  const storage = window.JeuStorage;
  const rawConfig = window.JEU_DE_PISTE_CONFIG || {};
  const config = Object.freeze(rawConfig);

  const targetWord = storage.normalizeLetter(config.motEnigmeFacile || "ETOILES");
  const mysteryWord = storage.normalizeLetter(config.motEnigmeMystere || "SEYSSES");

  const listEl = document.getElementById("enigma-list");
  const tipsEl = document.getElementById("booklet-tips");
  const gridEl = document.getElementById("easy-grid");
  const gridCompleteEl = document.getElementById("easy-grid-complete");
  const mysteryGridEl = document.getElementById("mystery-grid");
  const mysteryCompleteEl = document.getElementById("mystery-grid-complete");
  const bonusContainerEl = document.getElementById("bonus-hints");
  const jailModalEl = document.getElementById("jail-modal");
  const jailTimerEl = document.getElementById("jail-timer");

  const ENIGMA_LEVEL_LABELS = [
    "Indice 1 • Coup de pouce léger",
    "Indice 2 • Piste précise",
    "Indice 3 • Gros indice"
  ];
  const ENIGMA_BTN_LABELS = [
    "Débloquer l'indice 1",
    "Débloquer l'indice 2",
    "Débloquer l'indice 3 (gros indice)"
  ];
  const BONUS_LEVEL_LABELS = [
    "Indice 1 • Coup de pouce",
    "Indice 2 • Gros indice",
    "Indice 3 • Coup de pouce final"
  ];
  const BONUS_BTN_LABELS = [
    "Débloquer l'indice 1",
    "Débloquer l'indice 2",
    "Débloquer l'indice 3"
  ];

  // Initialisation de la protection anti-triche et de la visionneuse SVG
  const jail = window.JeuJail.createJailController(storage, ANTICHEAT_STORAGE_KEY);

  const lightbox = window.JeuLightbox.initLightbox({
    modalEl: document.getElementById("svg-lightbox"),
    imgEl: document.getElementById("lightbox-img"),
    titleEl: document.getElementById("lightbox-title"),
    viewportEl: document.getElementById("lightbox-viewport"),
    zoomInBtn: document.getElementById("lightbox-zoom-in"),
    zoomOutBtn: document.getElementById("lightbox-zoom-out"),
    zoomResetBtn: document.getElementById("lightbox-zoom-reset"),
    closeBtn: document.getElementById("lightbox-close"),
    isSafeAssetPath: storage.isSafeAssetPath,
    onCloseSyncScroll: syncBodyScrollLock
  });

  // Conseils généraux du livret & question Bonus
  (Array.isArray(config.conseilsLivret) ? config.conseilsLivret : []).forEach((tip) => {
    const li = document.createElement("li");
    li.textContent = String(tip);
    tipsEl.appendChild(li);
  });

  if (config.questionBonus) {
    document.getElementById("bonus-question").textContent = String(config.questionBonus);
  }

  // QR Code miniature dans l'en-tête (construit via createElementNS)
  const heroQrEl = document.getElementById("hero-qr-thumb");
  if (heroQrEl && window.SimpleQR) {
    const qrTargetUrl = storage.detectPublicSiteUrl(window.location, config.urlSiteParDefaut);
    try {
      const svgNode = window.SimpleQR.createSvgElement(document, qrTargetUrl, 3);
      heroQrEl.replaceChildren(svgNode);
    } catch (_) {}
  }

  // Restauration sécurisée de l'état joueur
  let savedState = storage.toSafeNumberMap(storage.readJson(STORAGE_KEY), 0, 3);
  let gridState = storage.toSafeLetterArray(storage.readJson(GRID_STORAGE_KEY), 7);
  let mysteryState = storage.toSafeLetterArray(storage.readJson(MYSTERY_STORAGE_KEY), 6);

  let jailIntervalId = null;
  let openCardId = null;

  function saveState() {
    storage.writeJson(STORAGE_KEY, savedState);
  }

  function saveGrid() {
    storage.writeJson(GRID_STORAGE_KEY, gridState);
  }

  function saveMysteryGrid() {
    storage.writeJson(MYSTERY_STORAGE_KEY, mysteryState);
  }

  function getRevealedCount(key) {
    return Number(savedState[String(key)] || 0);
  }

  function setRevealedCount(key, count) {
    savedState[String(key)] = Math.max(0, Math.min(3, Number(count) || 0));
    saveState();
  }

  function formatSeconds(totalSec) {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return m + ":" + (s < 10 ? "0" + s : String(s));
  }

  function syncBodyScrollLock() {
    const shouldLock = jail.isJailed() || lightbox.isOpen();
    document.body.classList.toggle("is-scroll-locked", shouldLock);
  }

  function syncJailUi() {
    if (!jail.isJailed()) {
      jail.clearExpiredLock();
      jailModalEl.hidden = true;
      syncBodyScrollLock();
      if (jailIntervalId) {
        clearInterval(jailIntervalId);
        jailIntervalId = null;
        renderAllGrids();
      }
      return;
    }

    jailTimerEl.textContent = formatSeconds(jail.getRemainingSeconds());
    jailModalEl.hidden = false;
    syncBodyScrollLock();

    if (!jailIntervalId) {
      jailIntervalId = setInterval(syncJailUi, 500);
    }
  }

  /**
   * Rendu factorisé d'une grille de lettres avec validation verte et protection anti-triche.
   */
  function renderLetterGrid(options) {
    const {
      container,
      completeBanner,
      values,
      expectedWord,
      prefixKey,
      fixedLastLetter,
      ariaPrefix,
      onSave
    } = options;

    container.replaceChildren();
    const totalCells = expectedWord.length;
    const editableLength = fixedLastLetter ? totalCells - 1 : totalCells;

    function isIndexCorrect(idx) {
      return Boolean(values[idx]) && values[idx] === expectedWord[idx];
    }

    function refreshBanner() {
      const allGood = values.slice(0, editableLength).every((_, idx) => isIndexCorrect(idx));
      completeBanner.hidden = !allGood;
    }

    for (let i = 0; i < totalCells; i++) {
      const cell = document.createElement("div");
      cell.className = "easy-cell";

      const num = document.createElement("span");
      num.className = "easy-cell-num";

      const inp = document.createElement("input");
      inp.type = "text";
      inp.className = "easy-cell-input";

      if (fixedLastLetter && i === totalCells - 1) {
        cell.classList.add("is-correct");
        num.textContent = totalCells + " ✓";
        inp.value = expectedWord[i] || "S";
        inp.readOnly = true;
        inp.tabIndex = -1;
        inp.setAttribute("aria-label", "Lettre " + totalCells + " déjà fournie : " + inp.value);
      } else {
        inp.inputMode = "text";
        inp.autocomplete = "off";
        inp.autocapitalize = "characters";
        inp.spellcheck = false;
        inp.maxLength = 2;
        if (fixedLastLetter) inp.placeholder = "_";
        inp.setAttribute("aria-label", ariaPrefix + " " + (i + 1));
        inp.value = values[i] || "";

        const syncVisual = () => {
          const val = values[i];
          const ok = isIndexCorrect(i);
          const jailed = jail.isJailed() && !ok;
          cell.classList.toggle("is-correct", ok);
          cell.classList.toggle("is-wrong", Boolean(val) && !ok);
          cell.classList.toggle("is-jailed", jailed);
          num.textContent = ok ? (i + 1) + " ✓" : (jailed ? (i + 1) + " 🔒" : String(i + 1));
          inp.readOnly = ok;
          inp.disabled = jailed;
        };
        syncVisual();

        inp.addEventListener("focus", () => {
          if (!inp.readOnly && !inp.disabled) inp.select();
        });

        inp.addEventListener("input", () => {
          if (jail.isJailed()) {
            inp.value = values[i] || "";
            return;
          }
          const prev = values[i] || "";
          const clean = storage.normalizeLetter(inp.value);
          const nextVal = clean ? clean.slice(-1) : "";
          values[i] = nextVal;
          inp.value = nextVal;
          onSave();

          const triggered = jail.recordAttempt(prefixKey + "_" + i, prev, nextVal, expectedWord[i]);
          if (triggered) {
            if (document.activeElement && typeof document.activeElement.blur === "function") {
              document.activeElement.blur();
            }
            syncJailUi();
            renderAllGrids();
          } else {
            syncVisual();
            refreshBanner();
          }
        });
      }

      cell.appendChild(num);
      cell.appendChild(inp);
      container.appendChild(cell);
    }

    refreshBanner();
  }

  function renderAllGrids() {
    renderLetterGrid({
      container: gridEl,
      completeBanner: gridCompleteEl,
      values: gridState,
      expectedWord: targetWord,
      prefixKey: "easy",
      fixedLastLetter: false,
      ariaPrefix: "Case",
      onSave: saveGrid
    });

    renderLetterGrid({
      container: mysteryGridEl,
      completeBanner: mysteryCompleteEl,
      values: mysteryState,
      expectedWord: mysteryWord,
      prefixKey: "mystery",
      fixedLastLetter: true,
      ariaPrefix: "Lettre énigme mystère",
      onSave: saveMysteryGrid
    });
  }

  /**
   * Rendu factorisé d'une pile de 3 indices déblocables progressivement.
   */
  function buildHintStack(stateKey, hintsArray, levelLabels, btnLabels, onUpdate) {
    const stack = document.createElement("div");
    stack.className = "hints-stack";
    const revealed = getRevealedCount(stateKey);

    (Array.isArray(hintsArray) ? hintsArray : []).slice(0, 3).forEach((texteIndice, idx) => {
      const levelNum = idx + 1;
      const isRevealed = revealed >= levelNum;
      const canUnlock = revealed === idx;

      const slot = document.createElement("div");
      slot.className = "hint-slot level-" + levelNum + (isRevealed ? " revealed" : "");

      const topRow = document.createElement("div");
      topRow.className = "hint-top";

      const badge = document.createElement("span");
      badge.className = "level-badge";
      badge.textContent = levelLabels[idx] || ("Indice " + levelNum);
      topRow.appendChild(badge);

      if (!isRevealed) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn-reveal";
        btn.disabled = !canUnlock;
        btn.textContent = canUnlock
          ? btnLabels[idx]
          : "🔒 Débloque d'abord l'indice " + idx;
        btn.addEventListener("click", () => {
          setRevealedCount(stateKey, levelNum);
          onUpdate();
        });
        topRow.appendChild(btn);
      } else if (revealed === levelNum) {
        const hideBtn = document.createElement("button");
        hideBtn.type = "button";
        hideBtn.className = "btn-hide-hint";
        hideBtn.textContent = "Masquer";
        hideBtn.addEventListener("click", () => {
          setRevealedCount(stateKey, levelNum - 1);
          onUpdate();
        });
        topRow.appendChild(hideBtn);
      }

      slot.appendChild(topRow);

      if (isRevealed) {
        const p = document.createElement("p");
        p.className = "hint-text";
        p.textContent = String(texteIndice);
        slot.appendChild(p);
      }

      stack.appendChild(slot);
    });

    return stack;
  }

  function renderEnigmas() {
    listEl.replaceChildren();

    (Array.isArray(config.enigmes) ? config.enigmes : []).forEach((enigme) => {
      const revealed = getRevealedCount(enigme.id);
      const isOpen = openCardId === enigme.id;
      const candidateSvg = enigme.image || ("public/JeuDePiste2026_" + enigme.id + ".svg");
      const svgPath = storage.isSafeAssetPath(candidateSvg) ? candidateSvg : "";

      const card = document.createElement("article");
      card.className = "enigma-card" + (isOpen ? " is-open" : "");

      const headerBtn = document.createElement("button");
      headerBtn.type = "button";
      headerBtn.className = "enigma-header";
      headerBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");

      const numBadge = document.createElement("div");
      numBadge.className = "enigma-num";
      numBadge.textContent = String(enigme.id);

      const titleGroup = document.createElement("div");
      titleGroup.className = "enigma-title-group";

      const h2 = document.createElement("h2");
      h2.className = "enigma-title";
      h2.textContent = String(enigme.titre || "");
      titleGroup.appendChild(h2);

      if (enigme.description) {
        const desc = document.createElement("p");
        desc.className = "enigma-desc";
        desc.textContent = String(enigme.description);
        titleGroup.appendChild(desc);
      }

      const meta = document.createElement("div");
      meta.className = "enigma-meta";

      const pill = document.createElement("span");
      pill.className = "progress-pill" + (revealed > 0 ? " has-progress" : "");
      pill.textContent = revealed + "/3";
      pill.title = revealed + " indice(s) débloqué(s) sur 3";

      const symbolBadge = document.createElement("div");
      symbolBadge.className = "monopoly-symbol-badge";
      if (storage.isSafeAssetPath(enigme.symbole)) {
        const symImg = document.createElement("img");
        symImg.src = enigme.symbole;
        symImg.alt = "";
        symImg.setAttribute("aria-hidden", "true");
        symbolBadge.appendChild(symImg);
      } else {
        symbolBadge.textContent = String(enigme.icone || "🔎");
      }

      const chevron = document.createElement("span");
      chevron.className = "chevron";
      chevron.setAttribute("aria-hidden", "true");
      chevron.textContent = "▾";

      meta.appendChild(pill);
      meta.appendChild(symbolBadge);
      meta.appendChild(chevron);

      headerBtn.appendChild(numBadge);
      headerBtn.appendChild(titleGroup);
      headerBtn.appendChild(meta);

      headerBtn.addEventListener("click", () => {
        openCardId = openCardId === enigme.id ? null : enigme.id;
        renderEnigmas();
      });

      const body = document.createElement("div");
      body.className = "enigma-body";

      if (isOpen && svgPath) {
        const sheetWrap = document.createElement("div");
        sheetWrap.className = "enigma-sheet-wrap";

        const sheetHeader = document.createElement("div");
        sheetHeader.className = "enigma-sheet-bar";

        const sheetLabel = document.createElement("span");
        sheetLabel.className = "enigma-sheet-label";
        sheetLabel.textContent = "📜 Planche de l'énigme " + enigme.id;

        const sheetTitle = "Énigme " + enigme.id + " — " + enigme.titre;

        const zoomBtn = document.createElement("button");
        zoomBtn.type = "button";
        zoomBtn.className = "btn-zoom-sheet";
        zoomBtn.textContent = "🔍 Agrandir / Zoomer";
        zoomBtn.addEventListener("click", () => lightbox.open(svgPath, sheetTitle, zoomBtn));

        sheetHeader.appendChild(sheetLabel);
        sheetHeader.appendChild(zoomBtn);

        const imgBtn = document.createElement("button");
        imgBtn.type = "button";
        imgBtn.className = "enigma-sheet-preview";
        imgBtn.title = "Toucher pour agrandir et zoomer";
        imgBtn.addEventListener("click", () => lightbox.open(svgPath, sheetTitle, imgBtn));

        const img = document.createElement("img");
        img.src = svgPath;
        img.alt = "Feuille de l'énigme " + enigme.id + " : " + enigme.titre;
        img.loading = "lazy";
        imgBtn.appendChild(img);

        sheetWrap.appendChild(sheetHeader);
        sheetWrap.appendChild(imgBtn);
        body.appendChild(sheetWrap);
      }

      if (Array.isArray(enigme.aideLivret) && enigme.aideLivret.length > 0) {
        const livretBox = document.createElement("div");
        livretBox.className = "enigma-booklet-box";

        const livretTitle = document.createElement("div");
        livretTitle.className = "enigma-booklet-title";
        livretTitle.textContent = "📖 Aide du livret (avant les indices)";
        livretBox.appendChild(livretTitle);

        const ul = document.createElement("ul");
        ul.className = "enigma-booklet-list";
        enigme.aideLivret.forEach((line) => {
          const li = document.createElement("li");
          li.textContent = String(line);
          ul.appendChild(li);
        });
        livretBox.appendChild(ul);
        body.appendChild(livretBox);
      }

      body.appendChild(
        buildHintStack(
          enigme.id,
          enigme.indices,
          ENIGMA_LEVEL_LABELS,
          ENIGMA_BTN_LABELS,
          renderEnigmas
        )
      );

      card.appendChild(headerBtn);
      card.appendChild(body);
      listEl.appendChild(card);
    });
  }

  function renderBonusHints() {
    if (!bonusContainerEl) return;
    const bonusList = Array.isArray(config.indicesBonus) ? config.indicesBonus : [];
    if (!bonusList.length) {
      bonusContainerEl.replaceChildren();
      return;
    }
    const stack = buildHintStack(
      "bonus",
      bonusList,
      BONUS_LEVEL_LABELS,
      BONUS_BTN_LABELS,
      renderBonusHints
    );
    stack.classList.add("bonus-hints-stack");
    bonusContainerEl.replaceChildren(stack);
  }

  document.getElementById("btn-reset-letters").addEventListener("click", () => {
    if (jail.isJailed()) {
      window.alert("🚔 Hop là ! Attends la fin de la pénalité avant de remettre les lettres à zéro.");
      return;
    }
    if (!window.confirm("Remettre à zéro toutes les lettres saisies ?")) {
      return;
    }
    gridState = new Array(7).fill("");
    mysteryState = new Array(6).fill("");
    jail.resetAll();
    saveGrid();
    saveMysteryGrid();
    renderAllGrids();
  });

  document.getElementById("btn-reset-all").addEventListener("click", () => {
    if (jail.isJailed()) {
      window.alert("🚔 Hop là ! Attends la fin de la pénalité avant de réinitialiser.");
      return;
    }
    if (!window.confirm("Effacer les lettres saisies et refermer tous les indices ?")) {
      return;
    }
    savedState = Object.create(null);
    gridState = new Array(7).fill("");
    mysteryState = new Array(6).fill("");
    jail.resetAll();
    saveState();
    saveGrid();
    saveMysteryGrid();
    renderAllGrids();
    renderEnigmas();
    renderBonusHints();
  });

  syncJailUi();
  renderAllGrids();
  renderEnigmas();
  renderBonusHints();
})();
