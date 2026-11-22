/**
 * Contrôleur de la page d'affiche QR Code (qrcode.html).
 * Valide strictement les schémas d'URL (http/https uniquement) et n'utilise jamais innerHTML.
 */
(function () {
  "use strict";

  const storage = window.JeuStorage;
  const config = Object.freeze(window.JEU_DE_PISTE_CONFIG || {});
  const inputEl = document.getElementById("qr-url");
  const containerEl = document.getElementById("qr-container");
  const urlTextEl = document.getElementById("poster-url-text");
  const copyBtn = document.getElementById("btn-copy-url");
  const downloadBtn = document.getElementById("btn-download-png");
  const canvasEl = document.getElementById("qr-export-canvas");

  const defaultUrl = storage.detectPublicSiteUrl(window.location, config.urlSiteParDefaut);

  function renderQrError(message) {
    const p = document.createElement("p");
    p.className = "qr-error-msg";
    p.textContent = message;
    containerEl.replaceChildren(p);
  }

  function resolveValidatedUrl() {
    const raw = inputEl.value.trim();
    if (!raw) return defaultUrl;
    if (!storage.isSafeHttpUrl(raw)) return null;
    return raw;
  }

  function updateQr() {
    const validUrl = resolveValidatedUrl();
    if (!validUrl) {
      urlTextEl.textContent = "URL invalide";
      downloadBtn.disabled = true;
      renderQrError("Veuillez saisir une adresse commençant par https:// ou http:// (200 caractères max).");
      return;
    }

    downloadBtn.disabled = false;
    urlTextEl.textContent = validUrl;
    try {
      const svgEl = window.SimpleQR.createSvgElement(document, validUrl, 4);
      containerEl.replaceChildren(svgEl);
    } catch (err) {
      renderQrError(err && err.message ? String(err.message) : "Impossible de générer le QR Code.");
    }
  }

  inputEl.value = defaultUrl;
  updateQr();

  inputEl.addEventListener("input", updateQr);

  document.getElementById("btn-print").addEventListener("click", () => {
    window.print();
  });

  downloadBtn.addEventListener("click", () => {
    const validUrl = resolveValidatedUrl();
    if (!validUrl) return;
    window.SimpleQR.drawToCanvas(canvasEl, validUrl, 1024, 4);
    const link = document.createElement("a");
    link.download = "qrcode-jeu-de-piste-seysses-2026.png";
    link.href = canvasEl.toDataURL("image/png");
    link.click();
  });

  copyBtn.addEventListener("click", async () => {
    const validUrl = resolveValidatedUrl();
    if (!validUrl) return;
    try {
      await navigator.clipboard.writeText(validUrl);
      const original = copyBtn.textContent;
      copyBtn.textContent = "✅ Lien copié !";
      setTimeout(() => {
        copyBtn.textContent = original;
      }, 1800);
    } catch (_) {
      inputEl.select();
    }
  });
})();
