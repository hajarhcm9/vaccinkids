# Environnements et promotion

## Separation obligatoire

| Environnement | Donnees | Identites/secrets | Fournisseurs | Acces |
| --- | --- | --- | --- | --- |
| Development | Fictives locales | Locaux uniquement | Stubs autorises | Developpeurs |
| Test/CI | Fictives et recreees | Secrets CI non reutilises | Stubs/emulateurs | CI |
| Staging recette | Fictives ou anonymisees | Secrets dedies | Fournisseurs reels de recette | Equipe autorisee |
| Production | Reelles autorisees | Gestionnaire de secrets dedie | Comptes production | Acces minimal audite |

Il est interdit de reutiliser une base, un compte fournisseur, une cle, un bundle ID ou
une identite de service entre staging et production.

## Promotion controlee

1. CI verte : lint, tests, migrations, scans, builds mobiles.
2. Image immuable identifiee par digest et commit.
3. Deploiement staging avec secrets staging injectes.
4. Migration explicite apres sauvegarde, puis invariants et recette.
5. Validation produit, QA, securite et conformite.
6. Sauvegarde production et plan de retour arriere confirme.
7. Deploiement production avec approbation et journal de changement.
8. Verification sante, metriques, parcours critique et audit.

`npm run check:environment` doit etre execute avant toute promotion. En staging et
production, il refuse les URLs locales, secrets de demonstration et fournisseurs stubs.
