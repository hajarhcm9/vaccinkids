# Dossier conformite donnees de sante - Pilote

Ce dossier cadre les controles obligatoires avant un pilote reel manipulant des donnees de
sante. Il doit etre signe par le responsable produit et le responsable conformite avant
toute ouverture hors environnement de staging.

## Perimetre et base legale

- Donnees concernees : identite parent, identite bebe, rendez-vous, carnet vaccinal,
  croissance, notifications, files d'attente, traces d'acces et exports.
- Finalites : prise de rendez-vous vaccinal, suivi clinique, notifications operationnelles,
  gestion centre/personnel, preuve d'operation et support.
- Loi 09-08 : la qualification responsable de traitement/sous-traitant, la declaration ou
  autorisation applicable, les notices d'information et les clauses contractuelles doivent
  etre validees juridiquement avant pilote.
- Consentement et information : la notice parent doit decrire finalites, durees,
  destinataires, droits d'acces/rectification/opposition/suppression lorsque applicable,
  point de contact et procedure de reclamation.
- Sous-traitants et transferts : tout hebergeur, service SMS, email, push, sauvegarde,
  observabilite ou support doit etre liste avec pays, role, donnees traitees, mesures de
  securite et base contractuelle.

## Retention, suppression et minimisation

| Donnee | Retention cible | Suppression/Purge |
| --- | --- | --- |
| OTP | Expiration courte, purge planifiee quotidienne | Suppression automatique des codes expires |
| Refresh tokens | Jusqu'a expiration ou logout/revocation | Revocation serveur au logout, purge des tokens expires |
| Caches mobiles sante | Aucun cache persistant en clair dans le pilote | Purge au logout/changement de compte |
| Carnet vaccinal et croissance | A valider avec conformite et exigences metier | Suppression/anonymisation selon decision signee |
| Exports | Duree minimale operationnelle approuvee | Expiration, stockage chiffre, acces journalise |
| Audit securite | Retention approuvee, cible minimale 5 ans si retenue | Append-only, export externe, pas de suppression applicative |

Toute retention superieure au besoin pilote doit etre justifiee et signee.

## Chiffrement et stockage

- Bases backend : chiffrement au repos active cote infrastructure ou volume, avec rotation
  de cle documentee.
- Sauvegardes : chiffrement avant stockage, acces limite, retention et restauration testees.
- Exports : fichiers chiffres ou stockes sur support chiffre, generation et telechargement
  journalises, expiration definie.
- Appareils mobiles parent : tokens en Keychain/Keystore ; pas de refresh token ni dossier
  de sante persistant en clair.
- Appareils staff Android natifs : tokens dans `EncryptedSharedPreferences`; cache Room
  clinique retire du stockage persistant pour le pilote.

## Sauvegarde, restauration et incident

Avant pilote reel :

1. Executer une sauvegarde staging representative et conserver la preuve de chiffrement.
2. Restaurer cette sauvegarde dans un environnement isole.
3. Verifier integrite : comptes, RDV, carnet, audit, refresh tokens revoques/actifs.
4. Documenter RTO/RPO cibles et personnes d'astreinte.
5. Tester la procedure incident : confinement, rotation secrets, revocation sessions,
   analyse des donnees touchees, notification interne et decision de notification externe.

## Audit append-only externalise

Le journal applicatif `audit_log` est append-only en base par migration. Avant pilote reel,
il faut ajouter une externalisation protegee :

- export continu ou periodique vers stockage immuable/WORM ou SIEM ;
- retention signee ;
- alerte sur echec d'ecriture ou d'export audit ;
- couverture minimale : auth, logout, refresh/reuse detectee, lecture carnet, vaccination,
  changement RDV, stock, flacon, exports, actions admin et acces audit ;
- acces au journal reserve aux roles autorises et lui-meme audite.

## Revue de menace et test d'intrusion

La revue de menace doit couvrir au minimum :

- vol de telephone parent/staff ;
- refresh token vole ou reutilise ;
- acces horizontal parent/bebe/centre ;
- modification non autorisee d'un acte clinique ;
- export ou notification contenant des donnees excessives ;
- compromission compte admin ;
- perte ou corruption sauvegarde ;
- indisponibilite SMS/push/email ;
- mode hors ligne et reprise.

Un test d'intrusion doit etre execute avant pilote reel sur l'API, le web admin, l'app
parent et l'app staff, avec correction ou acceptation formelle des risques residuels.

## Signatures go/no-go

| Role | Nom | Decision | Date | Signature |
| --- | --- | --- | --- | --- |
| Responsable produit |  |  |  |  |
| Responsable conformite |  |  |  |  |
| Responsable technique |  |  |  |  |

Le pilote reel est bloque tant que les signatures, le test de restauration et la preuve
d'audit protege ne sont pas disponibles.
