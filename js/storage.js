/**
 * Stockage persistant sécurisé (localStorage avec repli sessionStorage)
 * et utilitaires de validation contre les données corrompues ou la pollution de prototype.
 */
(function (global) {
  "use strict";

  const FORBIDDEN_KEYS = new Set(["__proto__", "prototype", "constructor"]);
  const SAFE_ASSET_RE = /^public\/[A-Za-z0-9_.-]+\.(?:svg|png)$/;

  function normalizeLetter(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z]/g, "")
      .toUpperCase();
  }

  function toSafeNumberMap(raw, min = 0, max = Number.MAX_SAFE_INTEGER) {
    const map = Object.create(null);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      return map;
    }
    for (const [k, v] of Object.entries(raw)) {
      if (FORBIDDEN_KEYS.has(k) || k.length > 40) continue;
      const num = Number(v);
      if (Number.isFinite(num) && num >= min) {
        map[k] = Math.min(max, num);
      }
    }
    return map;
  }

  function toSafeLetterArray(raw, length) {
    const arr = new Array(length).fill("");
    if (!Array.isArray(raw)) return arr;
    for (let i = 0; i < length; i++) {
      const clean = normalizeLetter(raw[i]);
      arr[i] = clean ? clean.slice(-1) : "";
    }
    return arr;
  }

  function isSafeAssetPath(path) {
    return typeof path === "string" && SAFE_ASSET_RE.test(path);
  }

  function isSafeHttpUrl(rawUrl) {
    if (typeof rawUrl !== "string") return false;
    const trimmed = rawUrl.trim();
    if (!trimmed || trimmed.length > 200) return false;
    try {
      const parsed = new URL(trimmed);
      return parsed.protocol === "https:" || parsed.protocol === "http:";
    } catch (_) {
      return false;
    }
  }

  function detectPublicSiteUrl(loc, fallbackUrl) {
    const fallback = isSafeHttpUrl(fallbackUrl)
      ? fallbackUrl.trim()
      : "https://monpseudoestpris.github.io/JeuDePiste2026/";
    if (!loc) return fallback;
    const isPublicWeb =
      (loc.protocol === "https:" || loc.protocol === "http:") &&
      loc.hostname !== "localhost" &&
      loc.hostname !== "127.0.0.1";
    if (!isPublicWeb) return fallback;
    try {
      return new URL("index.html", loc.href).href.replace(/index\.html$/, "");
    } catch (_) {
      return fallback;
    }
  }

  function readJson(key) {
    if (typeof key !== "string" || !key) return null;
    for (const storeName of ["localStorage", "sessionStorage"]) {
      try {
        const store = global[storeName];
        if (!store) continue;
        const raw = store.getItem(key);
        if (raw !== null && raw.length <= 8192) {
          return JSON.parse(raw);
        }
      } catch (_) {}
    }
    return null;
  }

  function writeJson(key, value) {
    if (typeof key !== "string" || !key) return;
    let serialized = "";
    try {
      serialized = JSON.stringify(value);
    } catch (_) {
      return;
    }
    for (const storeName of ["localStorage", "sessionStorage"]) {
      try {
        const store = global[storeName];
        if (store) store.setItem(key, serialized);
      } catch (_) {}
    }
  }

  const api = {
    normalizeLetter,
    toSafeNumberMap,
    toSafeLetterArray,
    isSafeAssetPath,
    isSafeHttpUrl,
    detectPublicSiteUrl,
    readJson,
    writeJson
  };

  global.JeuStorage = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
