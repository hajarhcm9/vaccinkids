# Plan incident securite et donnees de sante

## Severite et escalade

| Niveau | Exemple | Action initiale |
| --- | --- | --- |
| SEV-1 | Fuite sante, acte clinique altere, production indisponible | Astreinte immediate, confinement, direction/conformite |
| SEV-2 | Fonction critique degradee, fournisseur ou centre affecte | Prise en charge rapide, communication interne |
| SEV-3 | Defaut sans impact clinique immediat | Ticket, responsable et echeance |

Les noms, numeros et canaux d'astreinte doivent etre renseignes dans le systeme interne,
pas dans le depot public.

## Procedure

1. Ouvrir un incident avec horodatage, commandant et canal dedie.
2. Preserver logs, correlation IDs, audit et preuves sans copier de donnees excessives.
3. Contenir : desactiver surface, revoquer sessions/identites, tourner secret ou revenir
   a la version precedente selon le scenario.
4. Evaluer donnees, personnes, centres, periode et actes touches.
5. Consulter conformite/juridique pour notifications et delais applicables.
6. Restaurer progressivement, verifier invariants et surveiller la recurrence.
7. Informer utilisateurs/support avec contenu approuve.
8. Produire un post-mortem sans blame, actions, responsables et echeances.

## Exercices obligatoires

- perte ou reutilisation d'une cle/session ;
- indisponibilite PostgreSQL/Redis/fournisseur OTP ;
- migration defectueuse avec restauration ;
- acces horizontal ou export non autorise ;
- perte d'un appareil staff.

## Support utilisateur

Chaque demande ou incident utilisateur recoit un identifiant, une severite, un
proprietaire, une chronologie et une preuve de resolution. Le support ne demande jamais
OTP, mot de passe, token ni dossier clinique complet.

## Rapport d'exercice

| Champ | Valeur |
| --- | --- |
| Scenario/date |  |
| Participants |  |
| Detection et alerte |  |
| Temps confinement/restauration |  |
| Communication |  |
| Ecarts constates |  |
| Actions/responsables/echeances |  |
| Validation |  |
