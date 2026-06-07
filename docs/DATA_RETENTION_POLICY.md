# Politique de retention et suppression

**Statut :** durees cliniques et legales a faire approuver
**Regle :** aucune suppression clinique automatique sans decision signee

## Matrice de retention

| Categorie | Duree technique proposee | Action | Automatisation |
| --- | --- | --- | --- |
| OTP expires | 24 heures maximum apres expiration | Suppression physique | `npm run data:purge` |
| Refresh tokens expires/revoques | 30 jours apres expiration/revocation | Suppression physique | `npm run data:purge` |
| Notifications lues | 90 jours | Suppression physique | `npm run data:purge` apres approbation |
| Commandes de synchronisation terminees | 30 jours | Suppression physique | `npm run data:purge` apres approbation |
| Exports | Duree courte approuvee, cible 24 heures | Suppression fichier et lien | Infrastructure a fournir |
| Logs applicatifs | Cible 30 jours, sans donnees de sante | Suppression/rotation | Plateforme a fournir |
| Audit securite | Duree signee, cible minimale a confirmer | Conservation append-only | SIEM/WORM a fournir |
| Comptes, enfants, clinique | Selon loi et obligations metier | Suppression/anonymisation controlee | Interdite sans validation |
| Sauvegardes | Politique signee selon RPO/RTO | Expiration chiffree | Plateforme a fournir |

## Commande de purge

`npm run data:purge` fonctionne en lecture seule par defaut et affiche le nombre de lignes
eligibles. La suppression exige explicitement `RETENTION_APPLY=true`.

Variables :

- `RETENTION_OTP_HOURS`, valeur par defaut `24` ;
- `RETENTION_REFRESH_DAYS`, valeur par defaut `30` ;
- `RETENTION_NOTIFICATION_DAYS`, desactivee si absente ;
- `RETENTION_SYNC_DAYS`, desactivee si absente ;
- `RETENTION_APPLY=true` pour appliquer.

La commande ne supprime jamais les donnees cliniques ni `audit_log`.

## Demande de suppression utilisateur

1. Enregistrer la demande et verifier l'identite par un canal approuve.
2. Identifier le compte, les enfants lies, obligations cliniques et litiges.
3. Produire une decision conformite : supprimer, anonymiser, restreindre ou refuser avec
   justification.
4. Revoquer les sessions et purger les caches/appareils.
5. Executer la procedure approuvee avec double controle.
6. Verifier les sous-traitants, exports et cycle d'expiration des sauvegardes.
7. Conserver uniquement la preuve minimale de traitement de la demande.

## Minimisation

- Aucun OTP, token, secret ou contenu clinique dans les logs.
- Notifications et SMS ne contiennent que l'information minimale.
- Les applications purgent les caches au logout et changement de compte.
- Le pilote staff n'annonce aucun offline clinique et ne conserve pas de dossier local.
- Les exports sont filtres, audites, limites et temporaires.
