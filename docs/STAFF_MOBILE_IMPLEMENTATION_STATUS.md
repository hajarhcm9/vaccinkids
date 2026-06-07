# Etat d'implementation mobile infirmier

**Date :** 7 juin 2026

## Implemente dans le depot

| Lot | Etat code | Preuves principales |
| --- | --- | --- |
| INF-01 Dashboard/RDV | Implemente cote pilote | Dashboard centre via API, sessions du jour, RDV par session, filtres, erreurs, refresh et transitions bornees serveur |
| INF-02 File d'attente | Implemente | Ecran file, aucun centre gere, `call-next` concurrent avec verrou SQL, `complete`, refresh manuel et audit applicatif |
| INF-03 Scan QR/carnet | Durci | Format QR versionne, refus hors centre/session du jour, refus audites, aucun cache carnet hors ligne |
| INF-04 Vaccination atomique | Implemente | Enregistrement depuis RDV autorise, flacons session, validation poids/taille, bouton bloque, idempotency key mobile, transaction dose/RDV/audit |
| INF-05 Flacons/stock/croissance | Implemente pour pilote | Ouverture/gaspillage/fermeture flacon, doses restantes calculees serveur, stock infirmier lecture seule, croissance lecture seule sans cache |
| INF-06 Notifications/offline | Implemente pour pilote | Ecran notifications staff, lecture/tout lire, offline non retenu, worker et stockage clinique local retires |

## Decisions pilote

- Le mode offline staff n'est pas retenu pour le pilote : les actions cliniques exigent le serveur.
- Le stock infirmier est en lecture seule ; les entrees/sorties restent admin.
- La croissance infirmier est en lecture seule ; aucun ajout local n'est expose.
- Les donnees de carnet et croissance ne sont plus conservees en clair localement.

## Protections ajoutees

- `X-Request-ID` et `X-Idempotency-Key` sur les mutations Android staff ;
- suppression du log HTTP body en debug pour eviter les donnees cliniques dans Logcat ;
- suppression de Room clinique et du `SyncWorker` ;
- purge des anciennes preferences de sync au logout/changement de compte ;
- protection capture ecran dans l'activite infirmier ;
- validation `/auth/me` au demarrage de l'activite infirmier ;
- audit des scans QR refuses ;
- refus serveur des lectures carnet infirmier sans RDV eligible du centre le jour meme ;
- fermeture de flacon avec migration et refus des operations sur flacon ferme.

## Validation locale obtenue

- lint JavaScript : reussi ;
- scripts/migrations : reussis ;
- tests QR, RDV, file, flacon, vaccination et concurrence : 81 tests reussis ;
- suite backend complete : 426 tests reussis, 1 test ignore ;
- build Android staff debug : reussi.

## Reste externe avant critere final

- Recette complete sur appareil physique avec backend staging ;
- test multi-infirmiers reel sur deux appareils ;
- validation metier de la decision stock lecture seule et croissance lecture seule ;
- matrice visuelle finale, accessibilite, icones/splash/signature release ;
- revue de securite mobile avec extraction appareil pour confirmer absence de donnees cliniques persistantes.
