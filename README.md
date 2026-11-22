# Jeu de Piste — Festival du Jeu de Seysses 2026

Site statique simple donnant accès à **3 niveaux d'indices progressifs** pour chacune des **7 énigmes** du jeu de piste, accompagné d'une page **QR Code** prête à imprimer.

## Contenu du projet

- `index.html` : Page d'indices pour les joueurs (adaptée aux téléphones, anti-spoiler avec déblocage niveau 1 → 2 → 3).
- `indices.js` : **Fichier contenant tous les textes des 7 énigmes et leurs indices** (très simple à modifier, en particulier pour personnaliser l'Énigme 7).
- `qrcode.html` : Page permettant d'afficher, télécharger en PNG et imprimer en A4 l'affiche avec le QR Code vers le site.
- `qrcode-lib.js` : Générateur de QR Code autonome (aucune dépendance externe).
- `style.css` : Styles visuels et mise en page d'impression A4.

## Modifier les indices (notamment l'Énigme 7)

Ouvre simplement `indices.js` (sur ton ordinateur ou directement avec le crayon d'édition sur GitHub) et modifie les phrases dans le tableau `indices: [ ... ]` de l'énigme souhaitée.

## Publier sur GitHub Pages

1. Pousse les fichiers sur la branche `main` de ton dépôt GitHub (`monpseudoestpris/JeuDePiste2026`).
2. Sur GitHub, va dans **Settings** → **Pages**.
3. Dans **Build and deployment** → **Source**, choisis **Deploy from a branch**, sélectionne la branche **`main`** et le dossier **`/ (root)`**, puis clique sur **Save**.
4. Après environ une minute, le site sera accessible à :
   - Page joueurs : `https://monpseudoestpris.github.io/JeuDePiste2026/`
   - Page affiche QR Code : `https://monpseudoestpris.github.io/JeuDePiste2026/qrcode.html`
