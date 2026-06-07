# Etat d'implementation mobile parent

**Date :** 7 juin 2026

## Implemente dans le depot

| Lot | Etat code | Preuves principales |
| --- | --- | --- |
| PAR-01 Authentification/session | Implemente cote application | Tokens dans Keychain/Keystore, validation `/auth/me`, refresh single-flight, timeout, retry unique, logout serveur et purge |
| PAR-02 Enfants/carnet | Implemente cote application | Donnees chargees depuis API, aucune persistance clinique locale, isolation couverte par tests backend, captures bloquees |
| PAR-03 Sessions/RDV | Implemente cote application | Sessions et reservations API, cle d'idempotence sur mutations, boutons bloques pendant action, annulation serveur |
| PAR-04 File d'attente | Implemente cote application | API reelle, polling seulement au premier plan, refresh manuel, etat hors ligne explicite |
| PAR-05 Notifications | Implemente cote integration | Enregistrement/retrait FCM, token appareil protege, premier plan/arriere-plan/app fermee, deep links et compteur |
| PAR-06 Qualite/confidentialite | Partiellement implemente | FR/AR, identite VacciniKids, backups Android desactives, captures Android et apercu iOS proteges, CI mobile |

## Protections ajoutees

- aucun access token, refresh token ou token FCM n'est conserve dans AsyncStorage ;
- migration et suppression automatique d'un ancien token FCM AsyncStorage ;
- purge des caches du compte apres logout, expiration ou changement de session ;
- validation de l'identite serveur au demarrage ;
- correlation ID et idempotency key pour les commandes mobiles ;
- aucune donnee clinique n'est mise en cache par l'application parent ;
- aucun faux succes n'est affiche avant confirmation API ;
- les parcours hors connexion sont explicitement bloques quand ils exigent le serveur.

## Reste externe avant les criteres finaux

Les criteres finaux suivants necessitent une infrastructure ou une recette sur appareils :

- fournir les fichiers et credentials Firebase staging Android/iOS ;
- configurer APNs et le fournisseur OTP staging reel ;
- tester OTP, expiration, renvoi, limitation et changement de numero sur appareils physiques ;
- tester notifications au premier plan, arriere-plan et application fermee sur Android/iOS ;
- executer la recette visuelle complete FR/AR et RTL avec tailles de texte dynamiques ;
- finaliser les icones, splash, signature et App Store privacy manifest iOS ;
- mesurer performance, demarrage et crash-free rate sur la matrice d'appareils cible ;
- faire valider les textes de consentement, conditions et politique de confidentialite.

## Validation locale obtenue

- lint JavaScript : reussi ;
- controle automatise de securite mobile parent : reussi ;
- bundle React Native Android : reussi ;
- build Android debug : reussi ;
- suite backend complete : 424 tests reussis, 1 test ignore ;
- tests auth, notifications, isolation et concurrence : 51 tests reussis ;
- build iOS non execute localement : CocoaPods (`pod`) n'est pas installe sur la machine.
