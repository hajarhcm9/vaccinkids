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
| Backend et securite applicative | Implemente, tests de regression a maintenir |
| Mobile parent | Implemente cote application |
| Mobile infirmier | Implemente pour le perimetre pilote |
| Mobile admin | Implemente cote application, recette automatisee a approfondir |
| Web admin et kiosk | Implemente cote application |
| CI et controles release | Implemente cote depot |

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

## Travail de code restant

- augmenter la couverture des ViewModels et ecrans Android staff/admin ;
- ajouter des tests de contrat mobiles pour les DTO et endpoints admin ;
- renforcer les tests E2E automatises sans fournisseur externe ;
- continuer l'audit des chaines, ressources et fichiers morts ;
- corriger toute regression detectee par la validation complete.

