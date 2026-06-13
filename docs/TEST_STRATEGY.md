# Strategie de tests

## Couverture code-complete ajoutee

- tests unitaires Android des ViewModels dashboard, authentification, file, vaccination,
  stock et notifications ;
- tests de contrat Android sur les noms JSON et routes Retrofit critiques ;
- E2E backend strict couvrant admin, parent et infirmier jusqu'a la vaccination ;
- verification atomique de l'ouverture flacon, du decrement stock et du mouvement
  `VIAL_OPEN` ;
- verification du rejet d'une double vaccination et de la presence de l'audit.

## Pyramide

| Niveau | Objectif | Porte CI |
| --- | --- | --- |
| Statique | ESLint JS/RN/web, Android lint, scans secrets/SAST/dependances/image | Obligatoire |
| Unitaire | Services, modeles et logique pure mobile | Obligatoire |
| Integration API/DB | Contrats, RBAC, centre, migrations, audit, fournisseurs simules | Obligatoire |
| Concurrence/securite | Idempotence clinique, file, reservation, refresh, web/kiosk | Obligatoire |
| Instrumentation | Installation et contexte Android staff sur emulateur | Obligatoire |
| E2E staging | OTP reel, parent, admin, infirmier, kiosk, notifications | Go/no-go externe |

## Couverture

La couverture est un indicateur, pas un substitut aux scenarios critiques. Le rapport Jest
est publie a chaque pipeline. Les seuils globaux bloquants initiaux sont 70% lignes et
statements, 65% fonctions et 50% branches. Toute nouvelle regle clinique, autorisation ou
commande transactionnelle exige aussi une couverture directe.

## Contrats et tests negatifs

Les contrats API/mobile doivent verifier formes, statuts, erreurs et transitions. Les
tests negatifs couvrent au minimum :

- parent different, centre different et role different ;
- kiosk lecture seule et payload sans donnees personnelles ;
- double soumission, appels concurrents et rejeu ;
- refresh/logout/revocation et CSRF ;
- migrations depuis la version precedente et invariants apres restauration.

## Instabilite

Un test instable n'est jamais simplement relance jusqu'au vert. Il est corrige ou isole
avec proprietaire, ticket et date limite. Les tests E2E dependants de fournisseurs reels
sont executes sur staging dans une porte go/no-go separee.
