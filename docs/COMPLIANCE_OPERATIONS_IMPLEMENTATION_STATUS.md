# Statut implementation conformite et exploitation

**Lot :** COMP-01 a COMP-04 et OPS-01 a OPS-04
**Statut :** socle technique/documentaire implemente, validations externes bloquantes

## Couverture dans le depot

| Exigence | Statut | Preuve |
| --- | --- | --- |
| COMP-01 dossier juridique | Prepare, non signe | `COMPLIANCE_REGISTER.md` |
| COMP-02 retention/suppression | Partiel | `DATA_RETENTION_POLICY.md`, `npm run data:purge` |
| COMP-03 chiffrement/secrets | Partiel | controles release existants, scripts backup chiffres |
| COMP-04 menace/pentest | Revue interne initiale | `THREAT_MODEL.md`; pentest externe non realise |
| OPS-01 environnements | Implemente cote depot | `ENVIRONMENTS_AND_PROMOTION.md`, `npm run check:environment` |
| OPS-02 backup/restauration | Procedure executable | scripts `db:backup`/`db:restore`; exercice reel non realise |
| OPS-03 capacite/HA | Plan prepare | `CAPACITY_AND_RESILIENCE_PLAN.md`; charge/HA non executees |
| OPS-04 incident/support | Plan prepare | `INCIDENT_RESPONSE_PLAN.md`; exercice non execute |

## Protections ajoutees

- controle staging/production contre URLs locales, placeholders, secrets courts, stubs et
  DB sans `verify-full` ;
- purge de retention en dry-run par defaut et limitee aux donnees techniques eligibles ;
- aucune suppression automatique de donnees cliniques ou d'audit ;
- sauvegarde PostgreSQL chiffree avec `age`, checksum et permissions restrictives ;
- restauration refusee hors cible explicitement isolee/test ;
- matrices signables pour traitements, droits, sous-traitants, risques et go/no-go.

## Blocages externes avant pilote reel

1. Validation juridique loi 09-08, formalites CNDP, bases legales et signatures.
2. Choix/contrats fournisseurs, hebergement, pays et transferts.
3. Gestionnaire de secrets, chiffrement DB/volumes/sauvegardes et rotation reellement
   configures.
4. Audit append-only externalise et preuve de retention.
5. Exercice sauvegarde/restauration signe avec RPO/RTO mesures.
6. Tests charge, panne et reprise sur architecture staging representative.
7. Pentest externe, corrections et retest.
8. Exercice incident et contacts d'astreinte approuves.

Le statut correct reste **non autorise pour production** jusqu'a fermeture et signature de
ces huit points.
