# Capacite, haute disponibilite et resilience

## Parcours a charger

| Parcours | Mesure | Seuil initial a valider |
| --- | --- | --- |
| OTP/login/refresh | debit, p95, erreurs fournisseur | SLO backend et rate limits |
| Recherche sessions/reservation | debit, p95, conflits capacite | Aucun surbooking |
| File `call-next`/`complete` | concurrence, doublons | Aucun double appel |
| Vaccination | concurrence, transaction, audit | Aucun double acte/dose |
| Exports | duree, memoire, taille | Pas d'impact API critique |

## Composants

- API stateless avec au moins deux replicas en production.
- Redis partage avec persistance/HA adaptee aux compteurs et files retenues.
- PostgreSQL supervise, sauvegarde, connexions bornees et strategie de bascule approuvee.
- Workers separes de l'API et commandes idempotentes.
- Stockage exports/audit chiffre, borne et supervise.

## Tests avant production

1. Charger les parcours avec volumes et concurrence approuves.
2. Couper successivement une instance API, Redis, un worker et un fournisseur.
3. Simuler saturation DB et verifier alertes/runbooks.
4. Confirmer aucune perte/double traitement clinique.
5. Documenter capacite maximale, marge, cout et regle d'autoscaling.

Les outils de charge ne doivent utiliser que des donnees fictives et un environnement
dedie. Les resultats et decisions sont joints au go/no-go.
