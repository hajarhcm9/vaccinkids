# Déploiement

## Prérequis

- Node.js 20.19.4 ou supérieur ;
- PostgreSQL 15 ou supérieur avec l'extension `pgcrypto` ;
- Java 17 et Android SDK pour les builds Android ;
- terminaison TLS 1.3 devant l'API ;
- secrets distincts par environnement.

## API

1. Créer une sauvegarde chiffrée et vérifier qu'elle est restaurable.
2. Définir `NODE_ENV=production`, `DATABASE_URL`, `DATABASE_SSL_MODE=verify-full`,
   `JWT_SECRET`, `JWT_REFRESH_SECRET`, `OTP_HASH_SECRET` et `CORS_ORIGIN`.
3. Garder `SWAGGER_ENABLED=false`, sauf décision explicite de l'exposer.
4. Exécuter `npm ci`, puis `npm run migrate` dans un job de déploiement unique.
5. Démarrer l'API avec `npm start` et le worker séparément avec `npm run worker:reminders`.
6. Vérifier `/health` (processus vivant), `/ready` (base accessible), l'authentification et
   un parcours métier critique.

`npm start` ne lance volontairement ni migration ni tâche périodique. Une panne du worker
de rappels ne doit pas arrêter l'API, et plusieurs réplicas API ne doivent pas exécuter le
même job.

## Tests backend locaux

La commande reproductible complète démarre PostgreSQL, attend sa disponibilité, recrée
`TEST_DB_NAME`, applique les migrations, charge les données de développement puis lance Jest :

```bash
npm run docker:test
```

Le rôle `DB_USER` doit pouvoir créer et supprimer la base dédiée dont le nom finit par
`_test`. Le script affiche l'hôte, le port, le rôle et une aide ciblée en cas d'échec.

La migration `013_harden_refresh_tokens.sql` déduplique et remplace les refresh tokens
historiques en clair par leur hash SHA-256. Elle exige le droit de créer ou d'utiliser
`pgcrypto`.

## Application parent

La configuration JavaScript est générée avant le bundle :

```bash
MOBILE_ENV=staging API_BASE_URL=https://staging.example.ma/api npm run mobile:configure
```

`staging` et `production` refusent une URL absente ou non HTTPS. Ne jamais distribuer un
bundle généré avec `MOBILE_ENV=development`.

## Retour arrière

Ne pas tenter de restaurer la colonne des refresh tokens en clair. En cas de retour à une
version API antérieure à la migration `013`, restaurer la sauvegarde pré-déploiement ou
révoquer toutes les sessions et déployer un correctif compatible avec `token_hash`.
