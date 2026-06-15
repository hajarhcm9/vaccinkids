# Analyse des documents de redesign staff/admin

**Date de reference :** 14 juin 2026  
**Documents analyses :**

- `01-REDESIGN-CREATIVE-VISUAL.md`
- `02-REDESIGN-FONCTIONNEL.md`

## Conclusion

Les documents constituent une bonne vision cible, mais ils ne representent pas exactement
l'etat courant du code. Ils doivent etre utilises comme backlog produit et UX, pas comme
rapport de bugs directement executable.

## Constats des documents devenus obsoletes

Les composants suivants existent deja et sont connectes a l'API :

- `EnregistrementVaccinationFragment.kt`
- `Gestioncentresfragment.kt`
- `Gestionflaconsfragment.kt`
- consultation mobile de l'audit admin ;
- historique des mouvements de stock ;
- notifications staff ;
- commandes atomiques backend pour vaccination, file et flacons.

Ils restent a ameliorer visuellement et a recetter, mais ne doivent pas etre recrees du
zero.

## Ecarts reels prioritaires

### P0 - Stabilite et parcours

- Terminer la recette de chaque action visible sur appareil physique.
- Remplacer les saisies d'identifiants techniques par des selecteurs nommes.
- Garantir des erreurs comprehensibles, un retry et aucun faux succes.
- Conserver le mode hors ligne comme non disponible tant que son cycle complet n'est pas
  implemente et teste.

### P1 - Architecture UI

- Migrer progressivement les ecrans Kotlin programmatiques vers des layouts et composants
  Material3 testables.
- Reduire `StaffUi.decorateTree()`, qui peut remplacer involontairement les styles locaux.
- Remplacer les `Button`, `EditText`, `Spinner` et `AlertDialog` nus par les composants
  Material adaptes.
- Introduire des composants reutilisables pour KPI, actions rapides, etats vides et
  statuts.

### P1 - Experience infirmier

- Construire un flux patient lineaire : appel, identification, presence, vaccination,
  confirmation, patient suivant.
- Remplacer les boutons de rafraichissement visibles par pull-to-refresh et reprise.
- Ameliorer la file d'attente avec separation `EN_COURS` / `EN_ATTENTE`.
- Ajouter recherche et filtres rapides sur les rendez-vous.

### P1 - Experience admin

- Utiliser une logique de couleurs semantique : teal pour actions principales, coral pour
  alertes, lavender pour supervision.
- Remplacer les champs `Centre ID` et `Vaccin ID` par des selecteurs alimentes par l'API.
- Ajouter recherche, filtres et pagination aux listes de gestion.
- Faire evoluer les formulaires vers des bottom sheets avec validation inline.

### P2 - Polish

- Remplacer les emojis visibles par des icones vectorielles coherentes.
- Ajouter transitions discretes, feedback haptique et Snackbar.
- Ajouter dark mode, accessibilite, internationalisation FR/AR et verification RTL.
- Ajouter tests UI et captures automatisees sur plusieurs tailles d'ecran.

## Decisions de securite

- Ne pas implementer un offline clinique partiel ou non chiffre.
- Ne pas autoriser la vaccination sans validation serveur et idempotence.
- Ne pas afficher les donnees sensibles inutilement dans les listes.
- Garder les activites internes non exportees.

## Ordre d'implementation recommande

1. Stabiliser les variantes `debug`, `debugEmulator` et `debugDevice`.
2. Finaliser le theme Material3 et les composants reutilisables.
3. Refaire file, notifications et dashboard infirmier.
4. Refaire les CRUD admin et supprimer les saisies d'IDs.
5. Construire le flux patient lineaire.
6. Ajouter recherche, filtres, pagination et pull-to-refresh.
7. Terminer accessibilite, FR/AR, dark mode et tests UI.

## Critere de fin

Le redesign est termine lorsque chaque parcours visible est coherent, accessible,
connecte au backend, teste sur appareil physique et ne depend plus de composants Android
bruts ou de saisies d'identifiants techniques.
