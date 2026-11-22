/**
 * Logique isolée de la protection anti-triche « Prison Monopoly ».
 * - Tolère les essais espacés de plus de 60 s (vraie réflexion).
 * - Déclenche 30 s de prison au 3e mauvais essai rapproché sur une même case.
 * - Borne systématiquement lockUntil pour éviter tout blocage infini si l'horloge dérive.
 */
(function (global) {
  "use strict";

  const MAX_JAIL_DURATION_MS = 30 * 1000;
  const ATTEMPT_WINDOW_MS = 60 * 1000;
  const MAX_STRIKES = 3;

  function createJailController(storage, storageKey) {
    let state = loadSanitized();

    function loadSanitized(now = Date.now()) {
      const raw = storage.readJson(storageKey);
      let lockUntil = Number(raw && raw.lockUntil ? raw.lockUntil : 0);
      if (!Number.isFinite(lockUntil) || lockUntil <= now) {
        lockUntil = 0;
      } else if (lockUntil > now + MAX_JAIL_DURATION_MS) {
        lockUntil = now + MAX_JAIL_DURATION_MS;
      }
      return {
        lockUntil,
        jailCountByCell: storage.toSafeNumberMap(raw && raw.jailCountByCell, 0, 1000),
        wrongByCell: storage.toSafeNumberMap(raw && raw.wrongByCell, 0, MAX_STRIKES),
        lastAttemptByCell: storage.toSafeNumberMap(raw && raw.lastAttemptByCell, 0)
      };
    }

    function persist() {
      storage.writeJson(storageKey, state);
    }

    function isJailed(now = Date.now()) {
      if (state.lockUntil > now + MAX_JAIL_DURATION_MS) {
        state.lockUntil = now + MAX_JAIL_DURATION_MS;
        persist();
      }
      return state.lockUntil > now;
    }

    function clearExpiredLock(now = Date.now()) {
      if (state.lockUntil !== 0 && state.lockUntil <= now) {
        state.lockUntil = 0;
        persist();
      }
    }

    function getRemainingSeconds(now = Date.now()) {
      if (!isJailed(now)) return 0;
      return Math.max(1, Math.ceil((state.lockUntil - now) / 1000));
    }

    /**
     * Évalue une saisie de lettre sur une case et retourne `true` si la prison se déclenche.
     */
    function recordAttempt(cellKey, prevVal, newVal, expectedVal, now = Date.now()) {
      if (!newVal || newVal === prevVal) return false;

      if (newVal === expectedVal) {
        state.wrongByCell[cellKey] = 0;
        state.lastAttemptByCell[cellKey] = now;
        persist();
        return false;
      }

      const lastTime = Number(state.lastAttemptByCell[cellKey] || 0);
      if (lastTime && (now - lastTime > ATTEMPT_WINDOW_MS || now < lastTime)) {
        state.wrongByCell[cellKey] = 0;
      }

      state.lastAttemptByCell[cellKey] = now;
      state.wrongByCell[cellKey] = (state.wrongByCell[cellKey] || 0) + 1;

      if (state.wrongByCell[cellKey] >= MAX_STRIKES) {
        state.jailCountByCell[cellKey] = (state.jailCountByCell[cellKey] || 0) + 1;
        state.lockUntil = now + MAX_JAIL_DURATION_MS;
        state.wrongByCell[cellKey] = 0;
        persist();
        return true;
      }

      persist();
      return false;
    }

    function resetAll(now = Date.now()) {
      if (isJailed(now)) return false;
      state = {
        lockUntil: 0,
        jailCountByCell: Object.create(null),
        wrongByCell: Object.create(null),
        lastAttemptByCell: Object.create(null)
      };
      persist();
      return true;
    }

    return {
      isJailed,
      clearExpiredLock,
      getRemainingSeconds,
      recordAttempt,
      resetAll
    };
  }

  const api = {
    MAX_JAIL_DURATION_MS,
    ATTEMPT_WINDOW_MS,
    MAX_STRIKES,
    createJailController
  };

  global.JeuJail = api;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof window !== "undefined" ? window : globalThis);
