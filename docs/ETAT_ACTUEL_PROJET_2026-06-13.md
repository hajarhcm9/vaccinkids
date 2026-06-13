# Etat actuel profond du projet VacciniKids

**Date de reference :** 13 juin 2026  
**Commit audite :** `2f0a91b`  
**Branche :** `main`  
**Etat CI observe :** workflows `CI` et `Security` verts

## 1. Verdict executif

VacciniKids n'est plus une maquette. Le depot contient aujourd'hui :

- un backend Express/PostgreSQL avec RBAC, autorisation par ressource et transactions
  cliniques ;
- une application React Native parent connectee a l'API ;
- une application Android native combinee infirmier/admin connectee a l'API ;
- un web admin et une waiting room proteges ;
- des migrations, tests de concurrence, sauvegarde/restauration CI et scans securite ;
- des builds Android debug/release, Android instrumentation et iOS simulateur verts.

Le projet est adapte a un **pilote technique controle avec donnees non reelles**, apres
correction des ecarts P0/P1 identifies ci-dessous. Il n'est pas encore autorisable pour
un pilote reel de donnees de sante ni pour la production.

Le statut documentaire "100% code complete" doit etre interprete comme "la majorite des
parcours prevus existe dans le depot", et non comme "toutes les exigences de code sont
terminees". L'audit courant identifie encore des ecarts de code fonctionnels et de
securite.

## 2. Scores actuels

| Dimension | Score estime | Interpretation |
| --- | ---: | --- |
| Backend metier et invariants cliniques | 88% | Base solide, quelques garanties transversales incompletes |
| Securite applicative dans le depot | 84% | Bon socle, audit/idempotence/QR a renforcer |
| Mobile parent | 78% | Parcours principaux presents, tests et finition produit insuffisants |
| Mobile infirmier | 82% | Parcours pilote connectes, recette et controles UI a approfondir |
| Mobile admin | 75% | CRUD reels, mais statistiques, ergonomie et politique personnel partielles |
| Web admin et kiosk | 82% | Fondations correctes, aucune recette staging/pentest |
| Tests et CI | 86% | Backend fort et CI verte, tests frontend/appareil trop faibles |
| Exploitation, conformite et production | 38% | Principalement documentaire ou externe, non prouve en environnement reel |

### Synthese des pourcentages

- **Completion du code réellement démontrée : environ 84%.**
- **Preparation a un pilote staging technique : environ 76%.**
- **Preparation a un pilote avec vraies donnees de sante : environ 58%.**
- **Preparation production globale : environ 48%.**

Ces scores ne mesurent pas seulement la presence de fichiers. Ils integrent les preuves de
tests, la resilience, la recette, les operations, la conformite et la distribution.

## 3. Ce qui est reellement solide

### 3.1 Backend clinique

- Reservation verrouillee par session pour proteger la capacite.
- Vaccination transactionnelle avec verrou rendez-vous/session/flacon.
- Une seule vaccination autorisee par rendez-vous.
- Capacite flacon protegee par transaction et trigger PostgreSQL.
- Ouverture de flacon liee au stock et mouvement `VIAL_OPEN`.
- File d'attente concurrente avec `FOR UPDATE SKIP LOCKED`.
- Frontieres parent, role et centre centralisees.
- Refresh token hache, rotation et detection de rejeu.

### 3.2 Securite mobile

- Tokens parent dans Keychain/Keystore.
- Tokens staff dans `EncryptedSharedPreferences`.
- Validation serveur de session au demarrage.
- Logout serveur et purge locale.
- Pas de cache clinique parent ou staff revendique.
- Captures sensibles bloquees sur les activites staff et Android parent.
- HTTPS impose aux releases Android.

### 3.3 CI et qualite backend

- Les workflows `CI` et `Security` sont verts sur le commit audite.
- 435 tests backend passes, 1 ignore lors de la derniere suite complete.
- 59 tests performance passes.
- Tests de migration depuis la version precedente et invariants DB.
- Build et lint Android parent/staff.
- Build iOS Debug et Release simulateur.
- CodeQL, Gitleaks et Trivy.
- Sauvegarde chiffree et restauration isolee exercees dans la CI.

## 4. Ecarts critiques de code

### P0-A - Une operation critique peut persister puis repondre en erreur d'audit

Le middleware d'audit intercepte la reponse apres l'execution du controleur. Si l'audit
DB ou le collecteur externe echoue, il transforme la reponse en `503`, mais la transaction
metier peut deja etre validee.

Consequences possibles :

- l'utilisateur pense que l'operation a echoue alors qu'elle a reussi ;
- une nouvelle tentative peut produire un conflit ou une seconde action ;
- l'audit externe n'est pas atomique avec la commande metier ;
- le critere "echouer si l'audit ne peut pas etre garanti" n'est pas totalement respecte.

**Action minimale :** utiliser un outbox transactionnel append-only dans la meme
transaction que chaque commande critique, puis livrer l'outbox vers le SIEM. La reponse
serveur doit refleter sans ambiguite l'etat persiste.

### P0-B - Les cles d'idempotence mobiles ne sont pas appliquees aux commandes metier

Les clients parent et staff envoient `X-Idempotency-Key`, mais le backend ne la consomme
pas pour reservation, vaccination, flacon, stock ou file. Les contraintes DB evitent
plusieurs doublons, mais un rejeu ne retourne pas le resultat initial : il retourne souvent
un conflit.

**Action minimale :** ajouter une table/commande d'idempotence par acteur, route et cle,
enregistrer statut et resultat dans la transaction, puis rejouer la meme reponse.

### P0-C - Le QR bebe est aleatoire mais permanent

Le QR `VK1.<64 hex>` est difficile a deviner, mais il ne contient ni expiration, ni nonce
de scan, ni mecanisme de rotation expose au parent. Il reste un identifiant bearer
longue duree. Le texte mobile "QR invalide ou expire" surestime donc la protection.

**Action minimale :** QR signe a courte duree ou rotation/revocation explicite, avec
preuve de rejeu refuse et journalisation.

### P0-D - La decision "croissance infirmier lecture seule" n'est pas appliquee au backend

La documentation pilote declare la croissance staff en lecture seule, mais la route
`POST /api/carnet/bebe/:id/croissance` autorise toujours `infirmier` et `admin`.

**Action minimale :** retirer le role infirmier de la route pour le pilote, ou formaliser
et tester le parcours d'ajout avec validation clinique et audit transactionnel.

## 5. Ecarts fonctionnels importants

### P1-A - Le parcours enfant parent est incomplet

L'ajout et la lecture des enfants existent, mais aucun parcours clair d'edition autorisee
du bebe n'est expose dans les routes ou l'application parent. Le critere PAR-02 incluait
l'edition autorisee.

### P1-B - Les statistiques admin restent une vue technique

`StatsAdminActivity` affiche des maps serveur sous forme de texte :

- filtre centre par saisie manuelle d'un identifiant ;
- aucun filtre de periode ;
- aucun graphique reel ;
- aucune comparaison claire avec les exports ;
- presentation peu adaptee a une utilisation admin repetee.

Le statut ADM-09 ne peut pas etre considere complet.

### P1-C - Gestion du personnel sans politique d'invitation

L'admin saisit ou remplace directement le mot de passe du personnel. Il n'existe pas de
parcours d'invitation, de mot de passe temporaire force a changer, ni de reset audite
dedie. Cette approche peut suffire en developpement, mais pas pour une exploitation saine.

### P1-D - Finition iOS incomplete

- Le catalogue AppIcon ne contient aucun fichier image.
- Le manifest de confidentialite declare une liste de donnees collectees vide alors que
  l'application traite identite, contact, rendez-vous et donnees de sante.
- Aucun test iOS, aucune signature distribution, aucun appareil reel.
- Push APNs non prouve.

Le build simulateur vert prouve la compilation, pas la livrabilite App Store.

### P1-E - Internationalisation et accessibilite staff faibles

- Environ 736 chaines sont codees directement dans les fichiers Kotlin.
- `strings.xml` contient uniquement le nom de l'application.
- L'application staff n'a pas de traduction arabe/RTL structuree.
- Tres peu de descriptions d'accessibilite sont presentes.

### P1-F - Documentation de statut en derive

Les documents annoncent plusieurs lots complets alors que :

- l'idempotence metier n'est pas implementee ;
- le QR n'expire pas ;
- la croissance infirmier reste ecrivable ;
- ADM-09 reste partiel ;
- les tests mobile frontend sont tres faibles ;
- les chiffres de tests varient entre documents.

Le statut doit etre calcule depuis des preuves automatisees et une matrice de criteres,
pas uniquement depuis la presence des ecrans.

## 6. Tests : forces et limites

### Forces

- Bonne couverture des routes backend, RBAC, concurrence et invariants.
- E2E backend strict du cycle admin vers vaccination.
- Tests unitaires des ViewModels staff critiques.
- Contrats Retrofit/DTO staff.
- CI complete et actuellement verte.

### Limites majeures

- Aucun vrai test React Native parent de composant, navigation ou service mobile.
- L'instrumentation Android staff contient un seul test qui verifie le package.
- Aucun parcours UI staff automatise : login, RDV, scan, vaccination, admin.
- Aucun test iOS.
- Aucun E2E staging avec SMS, FCM/APNs, SMTP ou audit externe.
- Aucun test de perte de reponse/rejeu utilisant `X-Idempotency-Key`.
- Aucun test d'expiration/revocation QR.
- Couverture Jest globale bloquante utile, mais elle favorise fortement le backend et ne
  mesure pas la qualite des deux applications mobiles.

## 7. CI/CD et livraison

### Ce que la CI prouve

- Le code compile.
- Les tests backend et quelques tests staff passent.
- Les APK release peuvent etre produits avec une cle ephemere.
- L'app iOS compile sur simulateur.
- L'image conteneur ne contient pas de vulnerabilite High/Critical connue au scan courant.

### Ce qu'elle ne prouve pas

- Il n'existe aucun workflow de deploiement vers staging ou production.
- Aucun smoke test n'est lance contre un environnement deploye.
- Les builds release utilisent une URL staging volontairement invalide.
- Les keystores et certificats officiels ne sont pas integres.
- Aucune publication Play Console/TestFlight.
- La configuration production complete n'est pas validee dans un job avec secrets reels.
- Les branch protection rules restent a configurer hors depot.

Le terme correct est donc **CI solide**, mais pas encore **CD operationnelle**.

## 8. Securite, donnees de sante et exploitation

### Points positifs

- Secrets exclus du depot.
- TLS et Redis partage exiges en environnement protege.
- Logs HTTP sans query string et identite utilisateur hachee.
- Audit DB append-only.
- Retention technique partielle automatisee.
- Procedures de sauvegarde, restauration, incident et menace documentees.

### Risques restants

- L'audit stocke les parametres de requete sans minimisation generale ; certains filtres
  de recherche peuvent contenir des donnees personnelles.
- L'audit externe, les dashboards, alertes et SLO ne sont pas deployes.
- La purge ne couvre que OTP, refresh, notifications lues et sync.
- Aucun exercice reel de restauration, panne Redis/DB, incident ou rotation de cle.
- Aucun pentest externe.
- Aucune validation juridique/CNDP signee.
- Le worker de rappels doit etre exploite comme singleton ou protege contre les doublons.
- Une vulnerabilite npm moderee transitive `joi` reste presente.

## 9. Feuille de route recommandee

### Lot 1 - Fermer les garanties de code critiques

1. Implementer l'idempotence backend reelle pour toutes les mutations critiques.
2. Introduire un outbox d'audit transactionnel.
3. Rendre le QR temporaire ou rotatif/revocable.
4. Appliquer la decision croissance lecture seule.
5. Minimiser les donnees stockees dans l'audit.

### Lot 2 - Terminer les parcours annonces

1. Ajouter edition enfant parent selon regles metier.
2. Finaliser statistiques admin avec periode, centre, graphiques et contrats.
3. Remplacer reset mot de passe admin direct par invitation/reset securise.
4. Finaliser AppIcon, privacy manifest et configuration push iOS.
5. Extraire les chaines staff et ajouter accessibilite/RTL.

### Lot 3 - Construire les preuves mobiles

1. Tests unitaires/services/composants React Native parent.
2. Tests UI Android staff des parcours critiques.
3. Tests iOS minimum.
4. E2E staging parent/infirmier/admin/kiosk.
5. Tests appareils physiques, reseau lent, perte de reponse et reprise.

### Lot 4 - Passer de CI a livraison

1. Deployer un staging HTTPS representatif.
2. Ajouter workflow de deploiement, migrations controlees et smoke tests.
3. Integrer vrais SMS, SMTP, FCM/APNs, Redis, audit et monitoring.
4. Signer et distribuer les builds officiels.
5. Tester sauvegarde/restauration, charge, panne et incident.

### Lot 5 - Autorisation production

1. Pentest et retest.
2. Validation juridique loi 09-08/CNDP.
3. Signatures produit, QA, securite, conformite et exploitation.
4. Go/no-go documente.

## 10. Definition conseillee du prochain jalon

Le prochain objectif ne devrait pas etre "100% parfait", formule impossible a prouver.
Le jalon utile est :

> **Pilote staging techniquement fiable :** tous les parcours critiques fonctionnent avec
> idempotence et audit transactionnel, les applications sont testees sur appareils, et
> chaque action visible est prouvee par un E2E staging.

Pour atteindre ce jalon, l'effort restant est estime a **20-30% du travail de code actuel**,
principalement concentre dans les garanties transversales, les tests mobiles et la finition
admin/iOS.

La production reelle demande ensuite un effort externe et operationnel important, estime a
**40-50% du travail global de livraison restant**.
