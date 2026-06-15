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

## Reference visuelle officielle

Les specifications XML fournies dans `VaccinKids-XML` sont la source visuelle de cette
modernisation : design system, composants partages, navigation et composition des ecrans
Dashboard, RDV, Scan, Attente, Plus et Vaccination.

Elles restent des specifications de design. Les nombres, patients, rendez-vous, lots,
notifications et interactions simulees qu'elles contiennent ne doivent jamais etre copies
dans l'application runtime. Toutes les donnees visibles et toutes les confirmations
cliniques doivent continuer a venir du backend.

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
| UI-01 | Dashboard infirmier | KPI, alerte stock, actions rapides, sessions, pull-to-refresh | Partiel par rapport aux specs, recette requise |
| UI-02 | RDV infirmier | Recherche, filtres comptes, statuts, actions contextuelles | Avance, recette appareil requise |
| UI-02b | Scan QR | Viseur sombre, camera reelle, validation serveur | Partiel par rapport aux specs, recette requise |
| UI-03 | Vaccination | Formulaire Material, validation inline, confirmation serveur | A faire |
| UI-04 | File d'attente | Separation en cours/en attente, appel et reprise | Implemente, recette appareil requise |
| UI-04b | Plus et navigation | Navigation 5 onglets, profil API, outils, logout | Implemente, recette appareil requise |
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

## Deuxieme lot : Rendez-vous infirmier

L'ecran RDV utilise maintenant un layout Material conforme a la composition de
`07_Screen_RDV.xml`, adapte aux contraintes metier existantes.

Ameliorations :

- selection explicite de la session serveur ;
- recherche locale par enfant, parent, telephone et vaccin ;
- filtres de statut avec compteurs reels ;
- cartes Material avec statut semantique et actions contextuelles ;
- transitions de statut isolees et testees ;
- succes affiche uniquement apres confirmation serveur ;
- actions session, file et flacons conservees ;
- pull-to-refresh, chargement, erreur et etat vide ;
- test UI de la hierarchie essentielle.

## Scan QR

La composition sombre de `08_Screen_Scan.xml` est appliquee sans reprendre son scan
simule ni son enfant fictif. L'ecran ouvre toujours le scanner reel, refuse localement les
formats non securises, puis laisse l'API autoriser ou refuser l'acces au carnet. La saisie
manuelle securisee reste disponible pour la recette et les cas d'accessibilite.

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
