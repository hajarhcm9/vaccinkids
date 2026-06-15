# Modernisation progressive mobile staff

**Date de reference :** 15 juin 2026  
**Perimetre :** application Android infirmier et admin

## Decision technique

La modernisation utilise des layouts XML et composants Material3. Compose n'est pas
introduit pendant cette phase, car l'application existante repose deja sur Fragments,
layouts XML, Retrofit et ViewModels. Ajouter Compose maintenant maintiendrait deux
systemes UI et augmenterait le risque sans ameliorer la logique metier.

Les DTO, ViewModels, services API, controles RBAC et commandes cliniques sont conserves.
Chaque ecran est remplace progressivement seulement apres ajout de preuves de test.

## Regles de migration

Un ecran modernise doit :

- conserver les commandes backend et transitions metier existantes ;
- utiliser un layout Material testable avec identifiants stables ;
- afficher chargement, succes confirme serveur, erreur et reprise ;
- ne contenir aucun identifiant technique a saisir manuellement ;
- utiliser des icones vectorielles pour les actions connues ;
- fonctionner sur petit et grand ecran sans chevauchement ;
- recevoir au minimum un test UI du rendu et de son action principale ;
- etre recette sur appareil physique avant d'etre classe termine.

## Ordre cible

| Lot | Ecran | Objectif | Statut |
| --- | --- | --- | --- |
| UI-01 | Dashboard infirmier | KPI, alerte stock, actions rapides, sessions, pull-to-refresh | Implemente, recette appareil requise |
| UI-02 | RDV infirmier | Recherche, filtres, statuts, actions contextuelles | A faire |
| UI-03 | Vaccination | Formulaire Material, validation inline, confirmation serveur | A faire |
| UI-04 | File d'attente | Separation en cours/en attente, appel et reprise | A faire |
| UI-05 | Flacons et stock | Etats serveur lisibles, formulaires roles adaptes | A faire |
| UI-06 | Dashboard admin | KPI, alertes et raccourcis supervision | A faire |
| UI-07 | CRUD admin | Listes recherchees/paginees et formulaires Material | A faire |
| UI-08 | Statistiques et exports | Filtres explicites, graphiques et telechargement controle | A faire |

## Premier lot : Dashboard infirmier

Le Dashboard a ete migre d'une vue Kotlin construite dynamiquement vers
`fragment_dashboard.xml`.

Ameliorations :

- quatre KPI de dimensions stables ;
- couleurs semantiques distinctes ;
- alerte stock lisible ;
- actions rapides avec icones ;
- notifications et deconnexion accessibles ;
- vrai pull-to-refresh sans bouton de rafraichissement ;
- sessions du jour dans des cartes Material ;
- etats chargement et erreur conserves ;
- identifiants de vue stables pour Espresso ;
- tests UI du contenu operationnel et du pull-to-refresh.

La logique API et le `DashboardViewModel` restent inchanges.

## Preuves requises avant fermeture UI-01

- tests unitaires, lint, APK et APK instrumentation : obtenus ;
- tests Espresso executes sur emulateur/appareil : requis ;
- capture petit ecran et grand ecran : requise ;
- navigation RDV, file, scan, notifications et logout : requise ;
- verification reseau indisponible et reprise : requise ;
- verification avec donnees de staging reelles : requise.

## Risques a eviter

- moderniser plusieurs ecrans sans fermer la recette du precedent ;
- deplacer la logique clinique dans les Fragments ;
- reutiliser `StaffUi.decorateTree()` sur les nouveaux layouts Material ;
- afficher un succes avant confirmation serveur ;
- confondre build vert et parcours utilisateur valide.
