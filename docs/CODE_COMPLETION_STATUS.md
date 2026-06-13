# Statut de completion du code

**Perimetre :** fonctionnalites et protections implementables dans le depot.

Les validations exigeant une infrastructure reelle, des fournisseurs, des appareils
physiques, une signature externe ou une approbation juridique sont suivies separement
dans `EXTERNAL_VALIDATIONS_BACKLOG.md`.

## Definition du 100% code

Le code est considere termine lorsque :

- aucune donnee clinique, compte, centre, rendez-vous ou statistique fictive n'est compilee ;
- chaque action visible utilise une commande backend et attend sa confirmation ;
- les parcours parent, infirmier et admin retenus sont connectes ;
- les droits, transitions, erreurs, reprises et doubles soumissions sont geres ;
- les migrations, lint, tests et builds locaux/CI passent ;
- les surfaces non retenues sont retirees du build.

## Etat actuel

| Domaine | Etat code |
| --- | --- |
| Backend et securite applicative | Complet cote depot |
| Mobile parent | Complet cote application |
| Mobile infirmier | Complet pour le perimetre pilote |
| Mobile admin | Complet cote application |
| Web admin et kiosk | Complet cote application |
| CI et controles release | Complet cote depot |

## Dernier lot admin

- suppression des centres et jours dedies locaux codes en dur ;
- declaration correcte des activites stock et statistiques ;
- revalidation serveur de la session administrateur ;
- historique des mouvements de stock visible ;
- statistiques admin chargees depuis les endpoints API ;
- filtres audit par action, table, utilisateur et dates ;
- cycle session creer, modifier, confirmer, demarrer, terminer et annuler ;
- desactivation et reactivation des centres via API ;
- blocage de la desactivation d'un centre avec personnel ou sessions actives.

## Dernier lot de validation automatisee

- ViewModels auth, file, vaccination, stock et notifications injectables et testes ;
- contrats JSON et chemins Retrofit critiques testes ;
- E2E strict admin, parent et infirmier sans fournisseur externe ;
- preuve E2E de la persistance session, RDV, flacon, vaccination et audit ;
- rejet automatise de la double vaccination ;
- ouverture de flacon et decrement stock rendus atomiques ;
- mouvement `VIAL_OPEN` obligatoire et controle par les invariants DB.

## Statut

Le perimetre implementable uniquement dans le depot est considere **100% code complete**.
Les validations externes continuent de bloquer la production et restent suivies dans
`EXTERNAL_VALIDATIONS_BACKLOG.md`.

## Derniere validation

- backend complet : 435 tests reussis, 1 ignore ;
- performance : 59 tests reussis ;
- Android staff : 20 tests unitaires, build et lint reussis ;
- migration precedente vers derniere migration : reussie ;
- invariants DB, scripts, lint et controle des fixtures runtime : reussis.
