import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const storage = require("../js/storage.js");
const jailMod = require("../js/jail.js");
const qr = require("../qrcode-lib.js");

test("storage: normalizes accents and filters non-letters", () => {
  assert.equal(storage.normalizeLetter("é"), "E");
  assert.equal(storage.normalizeLetter("  ç123! "), "C");
  assert.equal(storage.normalizeLetter(""), "");
});

test("storage: blocks prototype pollution and clamps numeric maps", () => {
  const malicious = JSON.parse('{"__proto__":{"polluted":1},"constructor":99,"1":2,"bad":"NaN","big":999}');
  const safe = storage.toSafeNumberMap(malicious, 0, 3);
  assert.equal(Object.getPrototypeOf(safe), null);
  assert.equal(({}).polluted, undefined);
  assert.equal(safe["1"], 2);
  assert.equal(safe.big, 3);
  assert.equal(safe.bad, undefined);
  assert.equal(safe.constructor, undefined);
});

test("storage: enforces strict URL and asset path whitelists", () => {
  assert.equal(storage.isSafeHttpUrl("https://monpseudoestpris.github.io/JeuDePiste2026/"), true);
  assert.equal(storage.isSafeHttpUrl("http://localhost:8000/"), true);
  assert.equal(storage.isSafeHttpUrl("javascript:alert(1)"), false);
  assert.equal(storage.isSafeHttpUrl("data:text/html,<script>alert(1)</script>"), false);
  assert.equal(storage.isSafeHttpUrl("vbscript:msgbox(1)"), false);

  assert.equal(storage.isSafeAssetPath("public/JeuDePiste2026_1.svg"), true);
  assert.equal(storage.isSafeAssetPath("public/symbole_6.png"), true);
  assert.equal(storage.isSafeAssetPath("../secret.svg"), false);
  assert.equal(storage.isSafeAssetPath("https://evil.example/x.svg"), false);
});

test("jail: 3 rapid wrong tries trigger 30s jail, >60s gap resets strikes, clamps tampered lockUntil", () => {
  let mem = null;
  const mockStorage = {
    ...storage,
    readJson: () => mem,
    writeJson: (_k, val) => {
      mem = JSON.parse(JSON.stringify(val));
    }
  };

  const t0 = 1_700_000_000_000;
  const jail = jailMod.createJailController(mockStorage, "test_key");

  // 2 erreurs séparées de 10 s, puis > 60 s d'attente => compteur remis à zéro !
  assert.equal(jail.recordAttempt("easy_0", "", "A", "E", t0), false);
  assert.equal(jail.recordAttempt("easy_0", "A", "B", "E", t0 + 10_000), false);
  assert.equal(jail.recordAttempt("easy_0", "B", "C", "E", t0 + 75_000), false);
  assert.equal(jail.isJailed(t0 + 75_000), false);

  // 2 nouvelles erreurs rapprochées (total 3 dans la fenêtre de 60 s) => PRISON 30 s !
  assert.equal(jail.recordAttempt("easy_0", "C", "D", "E", t0 + 80_000), false);
  assert.equal(jail.recordAttempt("easy_0", "D", "F", "E", t0 + 85_000), true);
  assert.equal(jail.isJailed(t0 + 85_000), true);
  assert.equal(jail.getRemainingSeconds(t0 + 85_000), 30);

  // Reset interdit pendant la prison
  assert.equal(jail.resetAll(t0 + 90_000), false);

  // Expiration après 30 s => déverrouillé et reset autorisé
  assert.equal(jail.isJailed(t0 + 115_001), false);
  assert.equal(jail.resetAll(t0 + 115_001), true);

  // Protection contre un lockUntil corrompu dans localStorage (ex: +10 ans)
  mem = { lockUntil: t0 + 999_999_999_999, jailCountByCell: {}, wrongByCell: {}, lastAttemptByCell: {} };
  const jailTampered = jailMod.createJailController(mockStorage, "test_key");
  assert.ok(jailTampered.getRemainingSeconds(t0) <= 30);
});

test("config & assets: all 7 enigmas, SVGs and Monopoly symbols exist", () => {
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync("indices.js", "utf8"), ctx);
  const cfg = ctx.window.JEU_DE_PISTE_CONFIG;
  assert.equal(cfg.enigmes.length, 7);
  assert.equal(cfg.indicesBonus.length, 3);
  for (const e of cfg.enigmes) {
    assert.equal(e.indices.length, 3);
    assert.equal(storage.isSafeAssetPath(e.image), true);
    assert.equal(fs.existsSync(e.image), true, "Missing " + e.image);
    if (e.symbole) {
      assert.equal(storage.isSafeAssetPath(e.symbole), true);
      assert.equal(fs.existsSync(e.symbole), true, "Missing " + e.symbole);
    }
  }
});

test("security & cleanliness: zero unsafe DOM sinks, strict CSP present, JS/CSS clean", () => {
  const jsFiles = [
    "indices.js",
    "qrcode-lib.js",
    "js/storage.js",
    "js/jail.js",
    "js/lightbox.js",
    "js/app.js",
    "js/qr-page.js"
  ];
  for (const file of jsFiles) {
    const code = fs.readFileSync(file, "utf8");
    new vm.Script(code, { filename: file });
    const withoutComments = code.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
    assert.equal(/\b(innerHTML|outerHTML|insertAdjacentHTML|eval)\b/.test(withoutComments), false, "Unsafe sink in " + file);
  }

  for (const htmlFile of ["index.html", "qrcode.html"]) {
    const html = fs.readFileSync(htmlFile, "utf8");
    assert.equal(html.includes('http-equiv="Content-Security-Policy"'), true, "Missing CSP in " + htmlFile);
    assert.equal(html.includes("script-src 'self'"), true, "Missing script-src 'self' in " + htmlFile);
    // Aucun <script> inline (tous les <script> doivent avoir un attribut src=)
    const scriptTags = [...html.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]);
    assert.ok(scriptTags.length > 0);
    for (const tag of scriptTags) {
      assert.equal(/\bsrc=/.test(tag), true, "Inline script found in " + htmlFile + ": " + tag);
    }
    // Aucun gestionnaire d'événement inline on*=
    assert.equal(/\son[a-z]+\s*=/i.test(html), false, "Inline event handler in " + htmlFile);
  }

  const css = fs.readFileSync("style.css", "utf8");
  let depth = 0;
  for (const ch of css) {
    if (ch === "{") depth++;
    if (ch === "}") depth--;
    assert.ok(depth >= 0, "Unbalanced } in style.css");
  }
  assert.equal(depth, 0, "Unclosed { in style.css");
  assert.equal(css.includes(".domino-tile"), false, "Dead domino CSS left in style.css");

  // QR SVG builder works cleanly
  const svgStr = qr.toSvgString("https://monpseudoestpris.github.io/JeuDePiste2026/", 3);
  assert.ok(svgStr.startsWith("<svg "));
});
