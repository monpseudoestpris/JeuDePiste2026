/**
 * Visionneuse plein écran zoomable pour les planches SVG des énigmes.
 */
(function (global) {
  "use strict";

  const MIN_ZOOM = 0.75;
  const MAX_ZOOM = 3.5;
  const ZOOM_STEP = 0.35;

  function initLightbox(options) {
    const {
      modalEl,
      imgEl,
      titleEl,
      viewportEl,
      zoomInBtn,
      zoomOutBtn,
      zoomResetBtn,
      closeBtn,
      isSafeAssetPath,
      onCloseSyncScroll
    } = options;

    let currentZoom = 1;
    let lastTriggerEl = null;

    function applyZoom(zoom) {
      const clamped = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Number(zoom.toFixed(2))));
      currentZoom = clamped;
      const pct = Math.round(currentZoom * 100) + "%";
      imgEl.style.width = pct;
      zoomResetBtn.textContent = pct;
    }

    function open(src, title, triggerEl) {
      if (!isSafeAssetPath(src)) return;
      lastTriggerEl = triggerEl || document.activeElement;
      imgEl.src = src;
      imgEl.alt = String(title || "");
      titleEl.textContent = String(title || "");
      applyZoom(1);
      modalEl.hidden = false;
      document.body.classList.add("is-scroll-locked");
      closeBtn.focus();
    }

    function close() {
      if (modalEl.hidden) return;
      modalEl.hidden = true;
      imgEl.removeAttribute("src");
      imgEl.alt = "";
      if (typeof onCloseSyncScroll === "function") {
        onCloseSyncScroll();
      } else {
        document.body.classList.remove("is-scroll-locked");
      }
      if (lastTriggerEl && typeof lastTriggerEl.focus === "function") {
        lastTriggerEl.focus();
      }
    }

    closeBtn.addEventListener("click", close);
    zoomInBtn.addEventListener("click", () => applyZoom(currentZoom + ZOOM_STEP));
    zoomOutBtn.addEventListener("click", () => applyZoom(currentZoom - ZOOM_STEP));
    zoomResetBtn.addEventListener("click", () => applyZoom(1));

    viewportEl.addEventListener("click", (e) => {
      if (e.target === viewportEl) close();
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !modalEl.hidden) close();
    });

    return {
      open,
      close,
      isOpen: () => !modalEl.hidden
    };
  }

  global.JeuLightbox = { initLightbox };
})(typeof window !== "undefined" ? window : globalThis);
