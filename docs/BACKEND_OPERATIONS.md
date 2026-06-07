# Exploitation backend VacciniKids

## Objectifs de service initiaux

Les valeurs doivent être validées avant production :

| Indicateur | Cible initiale |
| --- | --- |
| Disponibilité API mensuelle | 99,9% |
| Latence API p95 hors exports | moins de 500 ms |
| Erreurs serveur 5xx | moins de 1% |
| Livraison OTP p95 | moins de 30 secondes |
| RPO base de données | 15 minutes maximum |
| RTO base de données | 2 heures maximum |

Le budget d'erreur mensuel correspondant à 99,9% est d'environ 43 minutes. Une fois 75%
du budget consommé, les déploiements non correctifs doivent être suspendus.

## Métriques et alertes

L'endpoint `/metrics` exige `Authorization: Bearer <METRICS_BEARER_TOKEN>`.

Alertes minimales :

- taux 5xx supérieur à 2% pendant 5 minutes ;
- latence p95 supérieure à 1 seconde pendant 10 minutes ;
- trois échecs consécutifs de livraison SMS, push ou audit externe ;
- hausse anormale de `vaccinikids_rate_limit_blocks_total` ;
- saturation connexions PostgreSQL ou Redis indisponible ;
- échec migration, sauvegarde ou restauration.

Les métriques ne doivent contenir aucun téléphone, nom, token, OTP ou donnée clinique.

## Runbook API indisponible

1. Vérifier `/health`, `/ready`, les métriques et le dernier déploiement.
2. Vérifier PostgreSQL, Redis et les secrets injectés.
3. Revenir à la version précédente si la panne suit un déploiement.
4. Ne jamais lancer une migration manuellement sans sauvegarde et validation.
5. Conserver correlation IDs, chronologie et actions dans le rapport d'incident.

## Runbook PostgreSQL saturé

1. Vérifier connexions actives, requêtes longues, verrous et espace disque.
2. Identifier les requêtes via correlation ID sans exposer les paramètres sensibles.
3. Réduire temporairement les traitements non critiques et exports.
4. Ne pas tuer une transaction clinique sans évaluer son état.
5. Restaurer ou basculer uniquement selon la procédure validée.

## Runbook fournisseur SMS ou push indisponible

1. Vérifier les métriques de livraison et le statut fournisseur.
2. Confirmer que l'API retourne un échec contrôlé et aucun faux succès.
3. Ne jamais activer les stubs en staging de recette ou production.
4. Informer le support du canal affecté et suivre la reprise.
5. Vérifier les messages retardés et éviter les duplications.

## Runbook migration échouée

1. Bloquer tout nouveau déploiement.
2. Conserver les logs et identifier la migration en échec.
3. Vérifier si la transaction a été annulée.
4. Appliquer uniquement la procédure de correction ou rollback approuvée.
5. Exécuter `npm run db:verify-invariants` avant de rouvrir le service.

## Configuration obligatoire en production

- Redis partagé pour le rate limiting ;
- fournisseurs SMS/FCM réels, stubs interdits ;
- collecteur d'audit externe signé ;
- endpoint métriques protégé ;
- HTTPS/TLS et secrets issus d'un gestionnaire dédié ;
- sauvegardes chiffrées et test de restauration récent.

Exécuter `node scripts/check-production-config.js` dans le pipeline de déploiement après
injection des secrets, sans afficher leur valeur.

Voir aussi :

- `ENVIRONMENTS_AND_PROMOTION.md` pour la separation et la promotion ;
- `BACKUP_RESTORE_RUNBOOK.md` pour la sauvegarde/restauration chiffree ;
- `CAPACITY_AND_RESILIENCE_PLAN.md` pour la charge et la reprise ;
- `INCIDENT_RESPONSE_PLAN.md` pour l'escalade et les exercices.
