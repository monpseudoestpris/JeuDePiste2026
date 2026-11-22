# HANDOFF.md

## 1. Project Overview
Site web statique compagnon du **Jeu de Piste** de la **10e Édition du Festival du Jeu de Seysses** (28 novembre 2026), destiné à être hébergé sur GitHub Pages (`https://monpseudoestpris.github.io/JeuDePiste2026/`).
- **Stack** : HTML5, CSS3, JavaScript vanilla modulaire sans dépendance externe (compatible GitHub Pages et ouverture locale `file://`), tests automatisés via `node:test`.

## 2. Current Objective
Passe d'assainissement architectural (modularité « 1 fichier = 1 responsabilité »), nettoyage du code mort et durcissement sécurité (élimination totale de `innerHTML`, politique CSP stricte, validation des schémas d'URL et des données `localStorage`). **Statut : Terminé et vérifié.**

## 3. Completed Work
- Découpage du JavaScript monolithique en modules dédiés dans `js/` (`storage.js`, `jail.js`, `lightbox.js`, `app.js`, `qr-page.js`).
- Suppression de tout usage de `innerHTML` au profit de `document.createElementNS` (`SimpleQR.createSvgElement`), `replaceChildren()` et `textContent`.
- Ajout d'une politique `Content-Security-Policy` (`script-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'`) et `Referrer-Policy` sur `index.html` et `qrcode.html`, avec retrait de tous les scripts et styles inline HTML.
- Validation stricte aux frontières :
  - liste blanche d'URL `http:` / `https:` sur la page QR Code (blocage des schémas `javascript:`, `data:`, `vbscript:`),
  - liste blanche des chemins d'assets (`^public/[A-Za-z0-9_.-]+\.(?:svg|png)$`),
  - dictionnaires sans prototype (`Object.create(null)`) et bornage du verrou anti-triche (`MAX_JAIL_DURATION_MS = 30000`) contre toute corruption de `localStorage` ou dérive d'horloge.
- Nettoyage d'environ 285 lignes de CSS obsolètes (ancien prototype dominos / multi-pages) dans `style.css`.
- Création d'une suite de tests unitaires et de sécurité (`tests/verify.mjs`).

## 4. Key Decisions
- **Scripts classiques avec `defer` plutôt que `<script type="module">`** : permet de conserver le fonctionnement direct en double-cliquant sur `index.html` en local (`file://`, où CORS bloque les modules ES) tout en appliquant `script-src 'self'` sur GitHub Pages.
- **Validation côté client assumée** : s'agissant d'un site statique GitHub Pages sans backend, les mots cibles figurent dans `indices.js` pour l'auto-vérification hors serveur ; la protection « Prison Monopoly » (3 erreurs en moins de 60 s → 30 s de pause) vise à empêcher le test mécanique de l'alphabet sur téléphone.

## 5. Modified Files
- `index.html` : HTML épuré (208 lignes), ajout des balises CSP/Referrer et chargement différé des modules `js/`.
- `qrcode.html` : HTML épuré (87 lignes), retrait des styles/scripts inline, ajout CSP/Referrer.
- `qrcode-lib.js` : Ajout de `createSvgElement()` construisant le QR Code via `createElementNS` et dimensions intrinsèques `240x240`.
- `style.css` : Suppression du CSS mort (`.domino-*`, `.enigma-detail-*`) et ajout des classes `.is-scroll-locked`, `.qr-toolbar-heading`, `.qr-error-msg`.
- `js/storage.js` *(nouveau)* : Persistance `localStorage`/`sessionStorage`, normalisation des lettres, anti-prototype-pollution et validation d'URL/assets.
- `js/jail.js` *(nouveau)* : Contrôleur isolé et testable de la pénalité « Prison Monopoly » (fenêtre de 60 s, plafond de 30 s).
- `js/lightbox.js` *(nouveau)* : Visionneuse plein écran zoomable avec gestion du focus clavier et de la touche `Escape`.
- `js/app.js` *(nouveau)* : Rendu factorisé des grilles de lettres, des 7 énigmes et des indices du Bonus.
- `js/qr-page.js` *(nouveau)* : Contrôleur sécurisé de l'affiche QR Code et de l'export PNG.
- `tests/verify.mjs` *(nouveau)* : Suite de 6 tests automatisés (`node:test`).
- `indices.js` : Conservé intact avec toutes les personnalisations métier de l'organisateur.

## 6. Verification
- **Exécuté et réussi** :
  - `node --test tests/verify.mjs` → **6/6 tests passés** (normalisation, anti-prototype-pollution, validation URL/assets, logique Prison Monopoly + fenêtre 60 s + bornage `lockUntil`, existence des 7 SVG et 6 symboles PNG, absence de sinks DOM dangereux, présence CSP `script-src 'self'`, équilibre des accolades CSS).
- **Non exécuté dans cette session** :
  - Rendu visuel interactif dans Chrome (le serveur MCP `chrome_devtools` est indisponible dans cet environnement) — à vérifier rapidement dans le navigateur avant ou après `git push`.

## 7. Known Issues and Risks
- `AGENTS.md`, `HANDOFF.md` et `tests/` sont présents à la racine du dépôt : si le dépôt GitHub est public et que l'organisateur ne souhaite pas les publier sur GitHub Pages, il peut soit les garder pour la maintenance, soit ajouter un fichier `.gitignore` / exclure certains fichiers avant commit selon sa préférence.
- Comme sur toute page 100 % statique sans serveur, un utilisateur avancé inspectant le code source JS sur ordinateur pourrait lire `indices.js` ; le mécanisme anti-triche cible l'usage normal sur smartphone pendant le festival.

## 8. Next Action
Ouvrir `index.html` et `qrcode.html` dans un navigateur local pour un contrôle visuel final, puis valider/pousser sur `main` lorsque l'organisateur le souhaite.
