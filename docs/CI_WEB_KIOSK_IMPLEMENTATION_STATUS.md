# Statut WEB-01/02 et CI-01/02

## Implemente dans le depot

- web admin : refresh HttpOnly, CSRF, rotation/revocation, logout serveur, CSP stricte,
  acces admin uniquement et interrupteur production ;
- kiosk : identites create/rotate/revoke, token court configurable, centre borne, endpoint
  lecture seule et payload limite a `numero_attente`/`statut` ;
- tests negatifs web/kiosk et concurrence/RBAC backend ;
- lint JS/RN/web, Android lint/tests unitaires, instrumentation staff ;
- builds debug et releases Android signees avec cle ephemere CI ;
- build iOS Debug et Release simulateur ;
- migration depuis version precedente, sauvegarde chiffree et restauration isolee ;
- CodeQL, Gitleaks, npm audit, Trivy, rapports couverture et artefacts versionnes par SHA.

## Validations externes restantes

1. Recette web admin et kiosk sur staging HTTPS reel.
2. Pentest XSS/CSRF/fixation/session et verification proxy/TLS.
3. Tests E2E complets avec fournisseurs et appareils physiques.
4. Etendre les tests unitaires ViewModel staff aux parcours auth, file et vaccination.
5. Signature Android de distribution avec secrets proteges et approbation.
6. Signature/test iOS de distribution avec compte Apple et appareil reel.
7. Configuration des branch protection rules pour rendre tous les jobs obligatoires.

Les artefacts Android CI sont signes uniquement par une cle ephemere de validation et ne
doivent jamais etre distribues comme releases officielles.

## Validation locale du lot

- backend : 431 tests passes, 1 ignore ; seuils couverture passes ;
- web/kiosk : 13 tests cibles passes ;
- ViewModel staff : 2 tests passes ;
- lint JS/RN/web, Android parent et Android staff : passes ;
- migration precedente vers derniere migration : passee ;
- releases Android parent/staff signees avec cle CI et signatures APK verifiees ;
- APK instrumentation staff construit ;
- audit dependances haut/critique : aucun constat.
