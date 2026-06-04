# Sécurité

## Secrets et sessions

- Utiliser des secrets JWT, refresh et OTP différents par environnement.
- Tourner `OTP_HASH_SECRET` en acceptant que tous les OTP actifs deviennent invalides.
- Les refresh tokens sont stockés uniquement sous forme de hash et tournent à chaque
  utilisation. La réutilisation d'un ancien token révoque sa famille entière.
- Retirer immédiatement les variables de bootstrap admin après usage.

## Réseau

- Exposer uniquement HTTPS/TLS 1.3 en staging et production.
- Utiliser `DATABASE_SSL_MODE=verify-full` en production et fournir `DATABASE_SSL_CA` si
  la chaîne système ne connaît pas l'autorité.
- Le mode PostgreSQL `require`, qui ignore la validation du certificat, est refusé en
  production.
- Les applications Android release refusent le trafic HTTP ; le HTTP local reste limité
  aux builds debug.

## Réponse à incident minimale

1. Isoler l'environnement concerné et conserver les journaux.
2. Révoquer les sessions et tourner les secrets compromis.
3. Évaluer les données touchées et informer les responsables conformité.
4. Restaurer depuis une sauvegarde vérifiée si l'intégrité est douteuse.
5. Documenter la chronologie, les décisions et les actions correctives.

Une validation juridique marocaine, une politique de rétention et une architecture
d'audit append-only restent obligatoires avant production.
