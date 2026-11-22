// ============================================================================
// CONFIGURATION DES INDICES — JEU DE PISTE (FESTIVAL DU JEU DE SEYSSES 2026)
// ============================================================================
// Ce fichier est volontairement séparé du code HTML pour pouvoir modifier les
// textes du livret, des énigmes et des indices très simplement (même sur GitHub).
// Chaque énigme comporte :
//   - aideLivret : les indications officielles du livret affichées AVANT les indices
//   - indices    : 3 niveaux d'indices progressifs (léger -> précis -> gros indice)
// ============================================================================

window.JEU_DE_PISTE_CONFIG = {
  titreFestival: "Festival du Jeu de Seysses 2026",
  sousTitre: "Jeu de Piste — Coups de pouce & Indices",
  urlSiteParDefaut: "https://monpseudoestpris.github.io/JeuDePiste2026/",
  motEnigmeFacile: "ETOILES",

  // Conseils généraux issus de la page 1 du livret créateur
  conseilsLivret: [
    "📸 Si vous comptez faire l'énigme mystère, pensez à prendre les énigmes en photo.",
    "⚠️ Attention, ce jeu n'attribue pas de félicitation…",
    "🧐 Le contenu des énigmes ne doit rien au hasard, soyez donc vigilant !"
  ],

  enigmes: [
    {
      id: 1,
      titre: "Le bon chemin…",
      symbole: "public/symbole_1.png",
      casesGrille: [7],
      image: "public/JeuDePiste2026_1.svg",
      description: "Quelle lettre te mène vers la sortie ?",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Le bon chemin… » dans la case 7.",
        "Rappel : pensez à prendre la feuille d'énigme en photo si vous comptez faire l'énigme mystère !"
      ],
      indices: [
        "Méfie-toi des apparences : le grand couloir central qui semble filer tout droit est un piège (regarde bien tout en haut, il est fermé !).",
        "C'est beaucoup plus rapide à l'envers : pars de la flèche de sortie tout en bas et remonte le labyrinthe avec ton doigt.",
        "En partant de la sortie en bas, bifurque tout de suite vers la moitié droite du labyrinthe : le chemin remonte jusqu'à l'une des lettres situées en haut à droite !"
      ]
    },
    {
      id: 2,
      titre: "Alphanumérique…",
      symbole: "public/symbole_2.png",
      casesGrille: [2],
      image: "public/JeuDePiste2026_2.svg",
      description: "Si E = 5 ; T = 20 ; O = 15 alors…",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Alphanumérique… » dans la case 2.",
        "Rappel : pensez à prendre la feuille d'énigme en photo si vous comptez faire l'énigme mystère !"
      ],
      indices: [
        "Chaque nombre correspond à la position de la lettre dans l'alphabet (A = 1, B = 2, C = 3… jusqu'à Z = 26). Décode les 7 mots.",
        "Compare le sens des 7 mots obtenus : 6 d'entre eux sont des exclamations qu'on lâche quand on se trompe ou qu'on échoue… Cherche l'intrus !",
        "Regarde bien l'avant-dernier mot (20 - 8 - 5) : c'est une boisson chaude dont le nom se prononce exactement comme la lettre à retenir !"
      ]
    },
    {
      id: 3,
      titre: "Les bons comptes…",
      symbole: "public/symbole_3.png",
      casesGrille: [4],
      image: "public/JeuDePiste2026_3.svg",
      description: "Trouve la valeur de la goutte d'eau puis fais-en la traduction « à Jules César ».",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Les bons comptes… » dans la case 4.",
        "Rappel : prenez bien cette énigme en photo, aucun détail n'est laissé au hasard pour l'énigme mystère !"
      ],
      indices: [
        "Commence par la 1re égalité (❤️ = 4) pour trouver la valeur du trèfle 🍀, puis déduis la baguette (4e ligne), le cochon 🐷 (3e ligne) et enfin l'étoile ⭐ (2e ligne).",
        "Une fois l'étoile ⭐ trouvée, calcule la dernière ligne (💧 = ⭐ - ❤️). Garde aussi précieusement les valeurs de tous les symboles pour la suite du jeu !",
        "Pour la « traduction à Jules César », demande-toi avec quelle lettre les Romains écrivaient le chiffre trouvé !"
      ]
    },
    {
      id: 4,
      titre: "Les paires…",
      symbole: "public/symbole_4.png",
      casesGrille: [1, 6],
      image: "public/JeuDePiste2026_4.svg",
      description: "Trouve la paire d'objets qui te permettra de conserver 2 lettres identiques.",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Les paires… » dans les cases 1 et 6.",
        "Rappel : pensez à prendre la feuille d'énigme en photo si vous comptez faire l'énigme mystère !"
      ],
      indices: [
        "Compte chaque famille d'objets sur la table et élimine tous ceux qui apparaissent en 1, 3, 4 ou 5 exemplaires (allumettes, cuillères, clés, bougies, pommes de pin, pièces…) pour ne garder que les duos.",
        "Observe attentivement les duos restants : presque tous sont dépareillés (formes, tailles ou couleurs différentes). Une seule paire est composée de deux éléments parfaitement identiques !",
        "On les casse pour faire une omelette ! Prononce leur nom au pluriel (« des … ») à voix haute : le son que tu entends te donne la lettre à garder en double."
      ]
    },
    {
      id: 5,
      titre: "Le point commun…",
      symbole: "public/symbole_5.png",
      casesGrille: [5],
      image: "public/JeuDePiste2026_5.svg",
      description: "Icare, Pégase, Libellule, Cupidon, Fées, Dragons…",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Le point commun… » dans la case 5.",
        "Rappel : pensez à prendre la feuille d'énigme en photo si vous comptez faire l'énigme mystère !"
      ],
      indices: [
        "Quel élément anatomique (ou fabriqué, dans le cas d'Icare) ont-ils tous en commun et qui leur permet de voler ?",
        "Relis bien l'astuce en bas de la feuille : si tu passes ta réponse au singulier (« n'en garde qu'une »), écoute le son que fait ce mot à l'oral.",
        "Les oiseaux en ont deux pour voler. Garde-en une seule : ce mot se prononce exactement comme une lettre de l'alphabet (« un … ») !"
      ]
    },
    {
      id: 6,
      titre: "Alphabet international…",
      symbole: "public/symbole_6.png",
      casesGrille: [3],
      image: "public/JeuDePiste2026_6.svg",
      description: "Élimine les mots de la grille bleue en suivant les étapes a) à e).",
      aideLivret: [
        "Énigme facile : mettre la réponse de « Alphabet international… » dans la case 3.",
        "Rappel : pensez à prendre cette feuille en photo, elle vous reservira pour l'énigme mystère !"
      ],
      indices: [
        "Ne garde d'abord que les mots de l'alphabet phonétique qui sont aussi de vrais prénoms (Charlie, Juliet, Mike, Oscar, Romeo, Victor…).",
        "Retire le célèbre couple d'amoureux de Shakespeare, puis le prénom lié à la chocolaterie de Willy Wonka (ainsi que toute danse éventuelle).",
        "Parmi les prénoms restants, lequel désigne aussi la célèbre statuette dorée remise aux acteurs de cinéma à Hollywood ? Garde sa première lettre !"
      ]
    },

    // ========================================================================
    // === ÉNIGME 7 : À PERSONNALISER LIBREMENT ===
    // Remplace ou ajuste les textes ci-dessous selon tes besoins !
    // ========================================================================
    {
      id: 7,
      titre: "Énigme mystère",
      icone: "🔎",
      image: "public/JeuDePiste2026_7.svg",
      description: "Combine toutes tes trouvailles précédentes pour décoder les grilles finales !",
      aideLivret: [
        "Quelle est la réponse à l'énigme facile (cases 1 à 7) ?",
        "Grâce à cette réponse, quel mot peut-on trouver ? (Rappel : « Attention, ce jeu n'attribue pas de félicitation… »)",
        "Il vous faut 2 éléments pour prélever les lettres.",
        "Quelle est la réponse à l'énigme mystère ?  _ _ _ _ _ _ S",
        "🎁 BONUS : Quel est le personnage du monde ludique qui se cache dans cette énigme mystère ?"
      ],
      indices: [
        "Remets dans l'ordre les 7 lettres récoltées aux énigmes 1 à 6 pour former un mot qui brille dans le ciel la nuit, puis repère cette forme géométrique sur tes feuilles d'énigmes…",
        "Relève les nombres inscrits dans les étoiles sur les feuilles précédentes et remplace chaque nombre par sa lettre (A = 1, B = 2…) : le mot obtenu renvoie à un code de l'Alphabet international (énigme 6) qui t'indique quelle ligne lire !",
        "Ne garde que les grilles dont le dessin en haut à droite figure sur tes feuilles d'énigmes (moustache, canne, nœud papillon, chapeau, sac $, costume). Pour chacune, la colonne est donnée par la valeur du symbole en haut à gauche (énigme 3), et pour la ligne c'est le B de Bravo ! Tu obtiens _ _ _ _ _ _ S "
      ]
    }
  ]
};
