# Runbook sauvegarde et restauration PostgreSQL

## Objectifs a approuver

- RPO initial : 15 minutes maximum.
- RTO initial : 2 heures maximum.
- Sauvegardes chiffrees avant stockage et cles separees.
- Restauration testee au minimum trimestriellement et avant changement risque.

## Sauvegarde chiffree

Prerequis : `pg_dump`, `age`, `DATABASE_URL` et `BACKUP_AGE_RECIPIENT`.

```bash
BACKUP_AGE_RECIPIENT='age1...' npm run db:backup
```

Le fichier `.dump.age` ne doit jamais etre commite. Copier ensuite l'artefact vers le
stockage approuve, verifier son checksum et appliquer la retention signee.

## Restauration isolee

La restauration refuse toute cible dont le nom ne contient pas `restore`, `isolated` ou
`test`. Elle ne doit jamais viser directement production.

```bash
RESTORE_DATABASE_URL='postgres://.../vaccinikids_restore' \
BACKUP_AGE_IDENTITY_FILE='/chemin/cle.age' \
npm run db:restore -- /chemin/backup.dump.age
```

Apres restauration :

1. Executer `DATABASE_URL=$RESTORE_DATABASE_URL npm run db:verify-invariants`.
2. Comparer les volumes et controles fonctionnels comptes/RDV/carnets/audit.
3. Verifier que l'environnement isole n'envoie aucun SMS, email ou push.
4. Mesurer RPO et RTO reels.
5. Detruire l'environnement isole selon la politique.

## Rapport d'exercice

| Champ | Valeur |
| --- | --- |
| Date/executants |  |
| Source et cible isolee |  |
| Backup chiffre/checksum |  |
| Heure derniere donnee/RPO mesure |  |
| Debut/fin restauration/RTO mesure |  |
| Invariants et recette |  |
| Probleme/correction |  |
| Validation technique/conformite |  |
