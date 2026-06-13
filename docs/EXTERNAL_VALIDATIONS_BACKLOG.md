# Validations externes differees

Ce document contient les travaux necessaires a la livraison reelle qui ne peuvent pas etre
termines uniquement par une modification du depot.

## Infrastructure et fournisseurs

- deployer staging et production HTTPS ;
- fournir Redis, PostgreSQL, stockage, sauvegardes et gestionnaire de secrets reels ;
- configurer les comptes SMS/OTP, SMTP, FCM et APNs ;
- deployer le collecteur audit append-only, les metriques, dashboards et alertes ;
- executer les tests de charge, panne, reprise et restauration.

## Appareils et distribution

- recetter les parcours complets sur appareils Android et iOS physiques ;
- fournir les keystores Android officiels et les certificats Apple ;
- distribuer les builds via pistes de test et TestFlight ;
- valider icones, splash, fiches stores, accessibilite, FR/AR et RTL.

## Securite, conformite et exploitation

- realiser le pentest externe et son retest ;
- valider loi 09-08, formalites CNDP, consentements et sous-traitants ;
- approuver la retention, le chiffrement, la rotation des cles et les transferts ;
- realiser et signer les exercices sauvegarde/restauration et incident ;
- obtenir le go/no-go produit, QA, technique, securite et conformite.

Ces points ne reduisent pas le pourcentage de completion du code, mais ils continuent de
bloquer une declaration de production reelle.

