# Analyse profonde de livrabilite

**Date :** 4 juin 2026  
**Etat de depart audite :** commit `d7325e7` (`Harden production configuration and session security`)  
**Verdict :** le depot est stable pour poursuivre le developpement, mais il n'est pas
livrable en production. Les parcours cliniques et les frontieres d'autorisation doivent
etre corriges avant tout pilote avec de vraies donnees.

Ce document complete `docs/AUDIT_LIVRABILITE.md`. L'audit initial donne la vue globale ;
celui-ci transforme la lecture fichier par fichier en registre d'actions executable.

## 1. Methode et perimetre

- 377 fichiers suivis par Git inventories : `src/` 141, `app/` 129, `tests/` 28,
  `android/` 26, `ios/` 10, `docs/` 7, `scripts/` 6 et `public/` 6.
- Lecture ligne par ligne des surfaces executables, contrats API, migrations, clients,
  workflows CI et documents de livraison.
- Ressources graphiques, layouts XML repetitifs, wrappers Gradle et fichiers generes
  inventories par groupe. Ils ne recoivent une action individuelle que lorsqu'ils
  influencent la securite, l'identite release ou un parcours utilisateur.
- Priorites :
  - **P0** : bloque toute livraison ou tout pilote avec donnees reelles ;
  - **P1** : requis avant mise en production ;
  - **P2** : requis pour une exploitation durable ;
  - **P3** : amelioration de qualite ou dette technique.

## 2. Decision de livraison

Le socle API dispose d'une suite de tests consequente et les builds debug Android passent.
Au debut de l'analyse, trois faits interdisaient une livraison :

1. `/api/sync` permettait des mutations generiques sans autorisation objet ou centre ;
2. plusieurs operations cliniques critiques ne sont pas atomiques et peuvent depasser
   capacites ou doses sous concurrence ;
3. une grande partie de l'application Android personnel/admin est une maquette locale qui
   affiche des succes sans modifier le backend.

Le premier point est ferme par P0-01. Les deux autres restent bloquants.

La bonne strategie est de geler le perimetre fonctionnel, fermer tous les P0, puis rendre
les parcours retenus reellement bout en bout. Ajouter de nouveaux ecrans avant cela
augmenterait le risque de fausse confiance.

## 3. Registre P0

### P0-01 - Remplacer les mutations generiques de synchronisation - Corrige

**Preuves**

- `src/services/syncService.js:21-83` autorise des champs d'identite et de propriete
  controles par le client : `parent_id`, `bebe_id`, `personnel_id`, `centre_id`, `id` et
  statuts.
- `src/services/syncService.js:171-241` execute directement `INSERT`, `UPDATE` et `DELETE`
  sans verifier role, proprietaire, centre, transition de statut ou regle metier.
- `src/services/syncService.js:244-306`, `383-400` et `406-438` recoivent l'identite de
  l'utilisateur, mais `applyChange` ne l'utilise pas.
- `src/routes/syncRoutes.js:11` ouvre le push aux administrateurs et infirmiers.
- `src/services/syncService.js:131-139` filtre avec des colonnes absentes
  (`vaccination.bebe_id`, `rendez_vous.centre_id`) ; `145-147` masque toutes les erreurs.

**Risque**

Un infirmier authentifie peut modifier ou supprimer des donnees d'autres centres, des
enfants, rendez-vous, vaccinations, sessions et files d'attente.

**Correctifs appliques**

- push force a l'etat desactive en production et resolution `CLIENT_WINS` retiree ;
- suppression de `applyChange`, de l'insertion arbitraire en queue et de toute creation ou
  suppression generique ;
- matrice explicite limitee aux transitions de statut autorisees pour rendez-vous,
  sessions et file d'attente ;
- verification du centre avant verrouillage et mutation ;
- payload limite strictement a `statut`, identites et champs d'audit interdits ;
- lots transactionnels, cle d'operation client unique et rejeu idempotent ;
- pull parent/infirmier corrige, borne a 500 lignes par entite et erreurs non masquees ;
- tests d'attaque inter-centre, champs interdits, creation/suppression, rollback de lot,
  rejeu et conflit `SERVER_WINS`.

Les creations de vaccination, bebe et rendez-vous restent volontairement refusees par la
sync jusqu'a disponibilite de commandes metier transactionnelles dediees.

**Critere d'acceptation**

Toute mutation sync produit le meme resultat et applique les memes autorisations que la
route metier equivalente. Aucun payload ne peut changer le proprietaire ou le centre.

### P0-02 - Imposer l'autorisation objet et centre - Corrige

**Preuves**

- Le RBAC verifie souvent uniquement le role dans `src/routes/`.
- Stock : `src/routes/stockRoutes.js:8-20` et `src/controllers/stockController.js:7-18`.
- File d'attente : `src/routes/fileAttenteRoutes.js:14-18` et
  `src/controllers/fileAttenteController.js:23-55`.
- Rendez-vous : `src/routes/rendezVousRoutes.js:24-49`.
- Sessions et flacons : `src/routes/sessionRoutes.js:10,23-32` et
  `src/routes/flaconRoutes.js:16-35`.
- Vaccinations : `src/routes/vaccinationRoutes.js:16-23`.
- Alertes et statistiques : `src/routes/delayAlertRoutes.js:11-21`,
  `src/controllers/delayAlertController.js:20-27` et
  `src/controllers/statsController.js:11-80`.
- PDF, emails, exports et historique d'absenteisme acceptent aussi des identifiants sans
  frontiere de centre explicite.

**Correctifs appliques**

- ajout de `resourceAuthorizationService`, point central pour verifier centre,
  proprietaire, rendez-vous, session, enfant, vaccination, flacon, stock et file ;
- centre infirmier derive du compte et refus explicite de tout identifiant de centre
  different, notamment pour listes, statistiques, alertes et file d'attente ;
- verification du proprietaire parent sur rendez-vous et enfants ;
- controles appliques aux PDF, emails, historique d'absenteisme, vaccinations, flacons,
  stock, rendez-vous, sessions, alertes et statistiques ;
- statistiques infirmier bornees au centre, y compris les agregats auparavant globaux ;
- lectures et exports sensibles administrateur journalises avec les actions `READ` et
  `EXPORT` ;
- matrice negative inter-centre et inter-parent ajoutee, en complement des tests sync.

**Critere d'acceptation**

Les tests prouvent qu'un parent ne voit que ses enfants et qu'un infirmier ne peut lire ou
modifier que les ressources de son centre, y compris via listes, stats, sync et exports.

### P0-03 - Rendre reservations, vaccinations et flacons atomiques - Corrige

**Preuves**

- `src/controllers/rendezVousController.js:21-40` et
  `src/controllers/sessionController.js:90-95,117-136` separent comptage et insertion.
- `src/controllers/vaccinationController.js:17-56` separe validation du rendez-vous,
  creation vaccination, consommation flacon et statut du rendez-vous.
- `src/models/Flacon.js:42-70` incremente les doses sans verrou ni controle du maximum.
- `src/models/migrations/001_initial_schema.sql:108-135` n'impose ni maximum de doses ni
  unicite d'une vaccination par rendez-vous.

**Correctifs appliques**

- reservations et liste d'attente deplacees dans `bookingService`, avec transaction et
  verrou `FOR UPDATE` sur la session avant comptage et insertion ;
- enregistrement vaccination et gaspillage deplace dans `clinicalWorkflowService`, avec
  verrouillage du rendez-vous, de la session et du flacon ;
- centre du personnel, session en cours, vaccin du flacon et capacite restante valides
  dans la meme transaction ;
- index unique garantissant une vaccination par rendez-vous ;
- triggers PostgreSQL interdisant le depassement de capacite d'un flacon et la reduction
  ulterieure d'une capacite sous les doses deja consommees ;
- tests concurrents reels prouvant qu'une seule requete obtient la derniere place ou
  consomme la derniere dose.

**Critere d'acceptation**

Sous concurrence, une seule derniere place ou dose est acceptee ; aucune operation
partielle ne subsiste apres erreur.

### P0-04 - Retirer les faux parcours de l'application personnel/admin

**Preuves**

- Identifiants admin codes en dur et contournement de l'API :
  `app/src/main/java/com/example/vaccinkid/MainActivity.kt:13-15,60-69` et
  `LoginInfirmierActivity.kt:13-15,63-73`.
- Vaccination fictive :
  `Enregistrementvaccinationfragment.kt:16-27,49-51,193-205`.
- Flacons fictifs : `Gestionflaconsfragment.kt:28-44,107-125,196-224`.
- Presences fictives : `Gestionpresencesfragment.kt:25-30,103-124,151-160,187-203`.
- Personnel fictif : `GestionPersonnelFragment.kt:19-23,54-58,74-85,103-111`.
- Centres et jours dedies locaux : `Gestioncentresfragment.kt:13,137-145` et
  `ConfigJoursDediesFragment.kt:15-23,74-79`.
- Statistiques et rendez-vous fictifs : `DashboardFragment.kt:35-38`,
  `RdvListFragment.kt:42-66`, `StatsAdminActivity.kt:22-107` et
  `StatsInfirmierActivity.kt:16-19`.
- `GestionStocksActivity.kt:31` affiche seulement un toast pour l'entree en stock.

**Actions**

- Choisir le perimetre du premier pilote : masquer toute fonction non connectee.
- Remplacer les deux logins codes en dur par `InfirmierAuthViewModel` et router selon le
  role retourne par l'API.
- Connecter vaccination, presence, file, flacon et stock aux commandes backend atomiques.
- Ne jamais afficher un succes avant confirmation serveur.
- Ajouter etats chargement, erreur, reprise, idempotence et mode hors ligne explicite.
- Connecter les fonctions admin retenues ou les retirer du build pilote.

**Critere d'acceptation**

Chaque action visible dans le build pilote modifie le backend de staging et reste correcte
apres relance de l'application. Aucun compte ni resultat clinique n'est code en dur.

### P0-05 - Proteger les tokens et donnees de sante mobiles

**Preuves**

- `App.js:18-21` considere toute presence de token comme une session valide.
- `src/screens/auth/OtpVerificationScreen.js:89-93` stocke access et refresh tokens dans
  `AsyncStorage`.
- `src/services/babyService.js:42-43`, `healthBookService.js:44-54`,
  `queueService.js:33-45` et `mobileNotificationService.js:47-63` stockent des donnees
  sensibles en clair.
- `src/screens/main/ProfileScreen.js:78-87` efface localement sans revoquer la session.
- `app/src/main/java/com/example/vaccinkid/data/AppDatabase.kt:16-80,105-124` stocke bebe
  et croissance dans une base Room non chiffree.

**Actions**

- Stocker les tokens parent dans Keychain/Keystore via une bibliotheque maintenue.
- Centraliser le client HTTP, le refresh single-flight, le retry unique et la deconnexion.
- Appeler le logout backend et purger caches lors du logout ou changement de compte.
- Chiffrer ou minimiser le cache sante, definir retention et purge.
- Chiffrer Room ou retirer les donnees cliniques du stockage local.
- Valider expiration et identite au demarrage.

**Critere d'acceptation**

Aucun refresh token ni dossier de sante lisible n'existe dans le stockage applicatif en
clair. Logout revoque la session serveur et purge les donnees du compte.

### P0-06 - Cadrer conformite et exploitation des donnees de sante

**Actions**

- Faire valider loi 09-08, consentement, finalites, droits, sous-traitants et transferts.
- Rediger politique de retention, suppression, sauvegarde, restauration et incident.
- Definir chiffrement au repos des bases, sauvegardes, exports et appareils.
- Mettre en place un audit append-only externalise avec retention approuvee.
- Realiser une revue de menace et un test d'intrusion avant pilote reel.

**Critere d'acceptation**

Le responsable produit et le responsable conformite signent le dossier ; sauvegarde et
restauration sont testees ; les acces sensibles sont consultables dans un journal protege.

## 4. Registre P1

| ID | Fichiers / lignes | Action requise | Critere d'acceptation |
|---|---|---|---|
| P1-01 | `src/services/otpService.js:15-40,61-104`, `src/controllers/authController.js:51-59` | Transactionner creation/verification OTP et utiliser un upsert parent | Deux verifications concurrentes ne creent qu'une session et un parent |
| P1-02 | `src/services/tokenService.js`, `src/controllers/authController.js:180-216` | Verifier `tokenType`, famille/utilisateur/role ; revoquer les sessions au changement de mot de passe | Les anciens refresh tokens sont refuses apres changement |
| P1-03 | `app/.../network/TokenAuthenticator.kt:16-47` | Synchroniser le refresh Android staff ; envoyer le refresh token au logout | Plusieurs 401 simultanes ne revoquent pas la famille |
| P1-04 | `app/.../network/ApiService.kt:79-89`, `NotificationsViewModel.kt` | Aligner notifications staff avec le contrat backend ou retirer l'ecran | Le parcours staff retourne 200 ou n'est pas expose |
| P1-05 | `app/.../viewmodel/StockViewModel.kt:43-59`, `src/routes/stockRoutes.js:30-35` | Decider qui peut modifier le stock et aligner client/RBAC | L'UI ne propose que les actions autorisees |
| P1-06 | `app/.../sync/SyncWorker.kt:19-41` | Implementer pull persistant, queue push idempotente et etat par compte | Un scenario hors ligne complet passe sur appareil |
| P1-07 | `public/admin/admin.js:2-6,76-87,257-260` | Remplacer `localStorage`, implementer refresh/logout serveur, CSP et protection CSRF selon architecture | Un XSS ne peut pas lire un refresh token |
| P1-08 | `public/waiting-room/display.js:2-6,137-188` | Utiliser une identite borne/lecture seule liee au centre ; ne pas stocker un token personnel | L'ecran ne peut lire qu'une file et ne porte aucun droit d'ecriture |
| P1-09 | `src/app.js:121-133`, `src/middleware/authMiddleware.js:10` | Masquer les erreurs internes en production et utiliser des logs structures | Les 500 n'exposent ni SQL ni details d'infrastructure |
| P1-10 | `src/middleware/rateLimiter.js`, `src/config/index.js:96-100` | Utiliser la configuration et un store partage en production | Les limites restent coherentes avec plusieurs instances |
| P1-11 | `src/middleware/auditMiddleware.js:64-88` | Garantir l'ecriture, auditer lectures/exports/auth et externaliser | Une panne d'audit est detectee et geree selon politique |
| P1-12 | `src/server.js:39-45,58-62` | Separer migrations et rappels du processus API | Plusieurs replicas ne lancent ni migrations ni rappels en double |
| P1-13 | `src/services/smsService.js`, `firebaseService.js`, `emailService.js` | Valider fournisseurs reels, timeouts, retry, observabilite et redaction des PII | Tests staging prouvent livraison et gestion des echecs |
| P1-14 | `src/models/Bebe.js:6`, `app/.../ScanQrFragment.kt:154-168` | Generer un QR cryptographique, borne et rotatable ; valider format exact | Un QR invente ou ancien ne permet pas d'enumerer un dossier |
| P1-15 | `src/models/migrations/005_absenteeism_delay_alerts.sql:24-60` | Corriger timezone, verrouillage, ordre et promotion waitlist | Promotion concurrente deterministe sans doublon |
| P1-16 | `src/models/migrations/001_initial_schema.sql:78-147,195-211` | Ajouter contraintes cliniques, croissance et file active | Les invariants critiques sont garantis par PostgreSQL |
| P1-17 | `android/app/build.gradle:85-91`, `android/.../strings.xml:2`, `ios/ProjeteTemp/*` | Remplacer `ProjeteTemp`, packages, bundle IDs, icones et splash | Builds stores portent l'identite finale |
| P1-18 | `ios/ProjeteTemp/Info.plist:37-38` | Retirer ou justifier la permission localisation vide | Le manifeste de confidentialite correspond aux fonctions |
| P1-19 | `src/screens/main/ProfileScreen.js`, `AddBabyScreen.js:200-211`, `src/navigation/MainNavigator.js:130-136` | Retirer actions sans effet, photo placeholder et badge `2` | Aucun controle visible n'est factice |
| P1-20 | `src/services/sessionService.js:18-29` et autres services mobiles | Mutualiser contrat HTTP, erreurs, refresh et telemetry | Tous les appels gerent expiration et erreurs de facon uniforme |

## 5. Registre P2 et P3

| Priorite | Fichiers / zone | Action |
|---|---|---|
| P2 | `.github/workflows/ci.yml:9-67` | Ajouter tests unitaires mobiles, lint Kotlin/Android, build release configure, iOS build/test, scan secrets/SAST et artefacts |
| P2 | `package.json:14-21` | Linter/tester aussi `App.js`, composants, ecrans, services mobiles et scripts ; ajouter type-check |
| P2 | `tests/` | Ajouter tests de concurrence, autorisation objet, clients mobiles, contrats staff et migrations upgrade/rollback |
| P2 | `tests/performance*.test.js` | Executer des tests de charge representatifs hors Jest et fixer des seuils de service |
| P2 | `docker-compose.yml:1-22` | Garder compose pour developpement ; fournir manifests d'exploitation, sauvegardes et health/readiness |
| P2 | `src/app.js:24-31,78-79` | Valider CORS production et permettre de desactiver les interfaces statiques |
| P2 | `src/middleware/sanitizationMiddleware.js` | Supprimer le faux sentiment de securite ou l'integrer avec validation schema et encodage de sortie |
| P2 | `src/middleware/bruteForceProtection.js:53-56` | Definir le comportement en panne et l'alerte ; ne pas echouer silencieusement |
| P2 | `src/routes/exportRoutes.js:10+` | Exporter le routeur apres declaration complete pour enlever l'ambiguite |
| P2 | migrations | Ajouter nettoyage planifie OTP, refresh tokens, sync queue et donnees selon retention |
| P2 | observabilite | Metriques, traces, logs structures, correlation ID, alertes et tableaux SLO |
| P2 | documentation | Runbooks deploiement, rollback, incident, rotation secrets, support et restauration |
| P2 | release mobile | Tests sur appareils physiques Android/iOS, accessibilite, RTL/arabe, reseau lent et reprise |
| P3 | `src/controllers`, `src/services`, `src/routes` | Harmoniser noms `Full`, `Enhanced`, `Day22` seulement apres fermeture des risques |
| P3 | depot | Envisager le monorepo `apps/` et contrats partages apres couverture mobile |
| P3 | ressources Android | Retirer textes de demonstration, commentaires de sprint et chaines non externalisees |

## 6. Cartographie fichier par fichier

Cette table indique l'action dominante pour chaque groupe. Les fichiers sans action
specifique restent couverts par les tests de regression et la revue de leur groupe.

| Groupe de fichiers | Etat | Action dominante |
|---|---|---|
| `src/routes/*.js` | RBAC present mais scope objet heterogene | Appliquer le service d'autorisation central et tests negatifs |
| `src/controllers/*.js` | Logique souvent correcte en sequentiel | Sortir workflows critiques dans des services transactionnels |
| `src/models/*.js` | Acces SQL lisibles, invariants incomplets | Ajouter verrous, contraintes et methodes transactionnelles |
| `src/models/migrations/*.sql` | Chaine executable | Ajouter invariants, migration upgrade testee et plan rollback |
| `src/services/syncService.js`, `syncCommandService.js` | P0-01 corrige, push production desactive | Maintenir la matrice restrictive jusqu'aux commandes transactionnelles |
| `src/services/*Notification*`, SMS/email/PDF/export | Fonctionnels en test | Valider fournisseurs, scopes, PII, retry et audit |
| `src/middleware/*.js` | Bon socle, garanties partielles | Autorisation ressource, erreurs generiques, rate limit partage, audit garanti |
| `src/config/*.js`, `src/server.js`, `src/app.js` | Configuration amelioree | Separer jobs, valider production et ajouter observabilite |
| `src/screens/**/*.js`, `src/navigation/*.js` | App parent partiellement connectee | Client HTTP central, stockage protege, supprimer UI factice |
| `src/services/{baby,healthBook,queue,mobileNotification,session,auth}Service.js` | Duplication et cache en clair | Mutualiser, chiffrer/minimiser, refresh et purge |
| `app/src/main/java/**/network/*.kt` | Base Retrofit utilisable | Aligner contrats, refresh single-flight et logout |
| `app/src/main/java/**/viewmodel/*.kt` | Quelques parcours connectes | Corriger endpoints/RBAC et couvrir par tests |
| `app/src/main/java/com/example/vaccinkid/*.kt` | Majoritairement prototype local | Connecter ou masquer chaque ecran du pilote |
| `app/src/main/java/**/data/AppDatabase.kt` | Cache Room non chiffre | Chiffrement, migrations, retention, purge |
| `app/src/main/res/**` | UI prototype | Identite finale, chaines, accessibilite et suppression donnees demo |
| `android/**` | Build parent debug fonctionnel | Identite/signature release, tests et appareil physique |
| `ios/**` | Squelette React Native temporaire | Renommer, signer, configurer confidentialite et tester en CI |
| `public/admin/**` | Dashboard prototype | Session web sure ou retrait du perimetre production |
| `public/waiting-room/**` | Affichage utile mais token personnel | Identite kiosk lecture seule bornee au centre |
| `tests/*.test.js`, `src/__tests__/*` | Couverture API large | Ajouter concurrence, scopes, clients et migrations |
| `.github/workflows/ci.yml` | Backend et builds debug couverts | Ajouter release, iOS, mobile tests et scans |
| `scripts/*.js` | Scripts principaux valides | Tests, dry-run, logs, droits minimaux et runbooks |
| `docs/*.md`, `README.md` | Bonne base | Maintenir les decisions, conformite et procedures reelles |
| wrappers, images, layouts repetitifs | Inventories | Revue visuelle/accessibilite et nettoyage avant release |

## 7. Ordre d'execution recommande

### Lot 1 - Fermer les breches

1. Maintenir le push sync desactive en production et `CLIENT_WINS` interdit.
2. Introduire l'autorisation objet/centre et sa matrice de tests.
3. Transactionner reservation, vaccination et flacon.
4. Masquer les ecrans personnel/admin fictifs dans le build pilote.

**Sortie du lot :** aucune mutation non autorisee et aucun faux succes visible.

### Lot 2 - Rendre les parcours pilote bout en bout

1. Authentification staff reelle et session robuste.
2. Parcours presence, vaccination, flacon, file et stock connectes.
3. Stockage mobile protege, refresh central et logout serveur.
4. QR securise et synchronisation hors ligne limitee au perimetre valide.

**Sortie du lot :** parcours critiques valides sur staging et appareils physiques.

### Lot 3 - Durcir production et conformite

1. Contraintes DB, OTP concurrent, audit, fournisseurs et jobs separes.
2. Identites/signatures stores et CI release Android/iOS.
3. Conformite, chiffrement, sauvegarde/restauration, observabilite et incident.

**Sortie du lot :** dossier de go-live signe et exercice de restauration reussi.

## 8. Definition de "livrable"

Le projet pourra etre declare livrable seulement lorsque :

- tous les P0 sont fermes avec preuve automatisee ou proces-verbal ;
- aucun ecran distribue n'utilise de donnees mockees ni n'affiche un succes local fictif ;
- les autorisations parent, infirmier, admin et kiosk sont testees negativement ;
- les invariants de capacite et de dose resistent a la concurrence ;
- tokens et donnees de sante sont proteges au repos et purges correctement ;
- builds release signes Android et iOS passent la CI et un test sur appareil physique ;
- sauvegarde, restauration, rollback, supervision et incident ont ete exerces ;
- conformite et perimetre pilote ont ete approuves.

Jusqu'a fermeture de ces conditions, le bon statut produit est **developpement/staging
uniquement, sans donnees de sante reelles**.
