# Roadmap livrable 100% - VacciniKids

**Date :** 5 juin 2026  
**Objectif :** transformer le projet VacciniKids en produit livrable, avec trois surfaces
mobiles réellement fonctionnelles :

- application mobile parent ;
- application mobile personnel infirmier ;
- application mobile administrateur.

Ce document ne remplace pas `docs/AUDIT_LIVRABILITE.md`,
`docs/ANALYSE_PROFONDE_LIVRABILITE.md` ni
`docs/COMPLIANCE_HEALTH_DATA.md`. Il les consolide sous forme de plan produit et
technique minimal pour atteindre une livraison fiable.

## 1. Verdict global

Le projet a un backend sérieux et déjà riche : authentification parent/personnel, RBAC,
ressources cliniques, rendez-vous, sessions, stock, flacons, file d'attente, carnet,
notifications, exports, audit, migrations et tests backend.

Mais il n'est pas encore livrable à 100%, car les trois applications mobiles ne sont pas
toutes au même niveau :

| Surface | Etat actuel | Verdict |
| --- | --- | --- |
| Backend API | Socle solide, plusieurs risques P0/P1 déjà corrigés | Presque prêt pour staging pilote, encore besoin d'exploitation, observabilité et tests finaux |
| Mobile parent React Native | Parcours principal connecté mais UI incomplète et plusieurs contrôles sans effet | Fonctionnel partiellement, pas encore app store ready |
| Mobile personnel infirmier Android natif | Login et quelques lectures backend connectés ; parcours cliniques critiques masqués | Pilote restreint possible, app complète non terminée |
| Mobile admin Android natif | Login admin et exports connectés ; gestion centres/personnel/jours/stats masquée ou non connectée | Non complète, seulement admin minimal |
| Web admin public | Prototype utile mais session web insuffisante pour production | A retirer ou sécuriser avant prod |
| Waiting room web | Utile mais identité kiosk non bornée | A retirer ou sécuriser avant prod |
| iOS | Squelette `ProjeteTemp`, identité et confidentialité non finalisées | Non livrable |
| CI/release | Backend + builds debug présents | Pas suffisant pour release store/production |

Conclusion : le minimum réaliste pour une livraison 100% consiste à stabiliser un périmètre
fonctionnel réduit, puis à connecter ou retirer chaque action visible. Une application qui
montre un bouton sans effet ou un succès non confirmé par le serveur doit être considérée
non livrable.

## 2. Définition de "100% livrable"

Le projet est 100% livrable seulement si les conditions suivantes sont vraies en staging
puis en production :

1. Chaque écran visible correspond à un parcours métier réel.
2. Chaque action visible modifie le backend ou affiche clairement une lecture seule.
3. Aucun compte, rendez-vous, statistique, acte clinique, stock, flacon ou résultat n'est
   codé en dur.
4. Le redémarrage de l'app ne change pas la vérité métier : tout état important vient du
   serveur.
5. Les tokens sont stockés en Keychain/Keystore ou stockage Android chiffré.
6. Logout révoque côté serveur et purge les données locales du compte.
7. Les parcours cliniques sont atomiques côté backend.
8. Les droits parent, infirmier, admin et centre sont testés négativement.
9. Les erreurs réseau, expiration session, mode hors ligne et reprise sont gérés
   explicitement.
10. Les builds release Android/iOS portent l'identité finale.
11. Sauvegarde/restauration, audit protégé, conformité et incident sont signés.
12. Une recette bout en bout est passée sur appareils physiques.

## 3. Périmètre minimum recommandé

Pour rendre l'ensemble livrable sans exploser le délai, il faut viser ce périmètre minimum.

### Mobile parent minimum

Le parent doit pouvoir :

1. Se connecter par OTP.
2. Ajouter et consulter ses enfants.
3. Voir les sessions disponibles.
4. Réserver une session pour un enfant.
5. Voir, annuler ou suivre ses rendez-vous.
6. Rejoindre ou quitter la file d'attente le jour J.
7. Consulter le carnet vaccinal et la croissance.
8. Recevoir et consulter les notifications.
9. Changer la langue FR/AR.
10. Se déconnecter proprement.

Tout le reste est secondaire pour la première livraison.

### Mobile infirmier minimum

L'infirmier doit pouvoir :

1. Se connecter avec CIN/mot de passe.
2. Voir uniquement son centre.
3. Voir les sessions du jour.
4. Voir les rendez-vous de la session.
5. Marquer présence/absence via commande serveur.
6. Appeler le prochain patient dans la file.
7. Scanner un QR valide.
8. Consulter le carnet bébé autorisé.
9. Ouvrir ou sélectionner un flacon autorisé.
10. Enregistrer une vaccination atomique.
11. Voir le stock de son centre en lecture seule ou selon droits décidés.
12. Se déconnecter proprement.

### Mobile admin minimum

L'administrateur doit pouvoir :

1. Se connecter avec CIN/mot de passe.
2. Gérer personnel.
3. Gérer centres.
4. Gérer vaccins et stock selon règles validées.
5. Planifier et confirmer sessions.
6. Voir statistiques réelles.
7. Exporter PDF/Excel.
8. Consulter le journal d'audit.
9. Désactiver/réactiver comptes ou centres selon règles.
10. Se déconnecter proprement.

Si l'admin mobile complet prend trop de temps, il faut choisir : soit app admin mobile
complète, soit web admin sécurisé, mais pas deux prototypes incomplets.

## 4. Analyse backend

### Points forts

- API Express structurée en routes, contrôleurs, services et modèles.
- Migrations PostgreSQL versionnées.
- Auth parent OTP et auth personnel CIN/mot de passe.
- Refresh tokens durcis, rotation et révocation.
- RBAC présent.
- Autorisation objet/centre renforcée via `resourceAuthorizationService`.
- Commandes atomiques pour réservation et vaccination via services dédiés.
- Audit append-only en base.
- Tests API nombreux.
- CI backend avec PostgreSQL.

### Points à terminer absolument

#### B1 - Stabiliser la base de test locale

**Problème :** `npm test -- --runInBand tests/auth.test.js` échoue avant Jest car
`db:reset:test` ne parvient pas à réinitialiser la base locale.

**Actions minimales :**

- Rendre `scripts/reset-test-db.js` plus bavard en erreur.
- Vérifier variables `TEST_DB_NAME`, `DB_USER`, `DB_PASSWORD`, droits `CREATE DATABASE`.
- Ajouter un mode Docker local qui démarre PostgreSQL, reset et lance Jest.
- Documenter la commande exacte dans `docs/DEPLOYMENT.md` ou `README.md`.

**Critère :** `npm test -- --runInBand tests/auth.test.js` passe localement et en CI.

#### B2 - Séparer API, migrations et jobs

**Fichiers :** `src/server.js`, `scripts/migrate.js`, `src/services/reminderService.js`

Actuellement le serveur lance migrations et rappels au démarrage. En production avec
plusieurs replicas, cela peut lancer des migrations ou jobs en double.

**Actions minimales :**

- API : démarre seulement Express.
- Job migrations : exécuté par pipeline ou init job unique.
- Job rappels : exécuté par worker séparé.
- Ajouter variables `RUN_MIGRATIONS_ON_START=false`, `RUN_REMINDER_WORKER=false`.
- Ajouter health/readiness séparés.

**Critère :** deux replicas API ne créent ni migration ni rappel en double.

#### B3 - Observabilité et logs

**Actions minimales :**

- Ajouter correlation ID par requête.
- Logger JSON structuré avec méthode, route, status, durée, userId/role anonymisés.
- Ajouter métriques : taux erreur, latence, OTP envoyés, login, refresh, réservation,
  vaccination, file, exports, notification.
- Ajouter alertes : panne DB, panne audit, taux 500, SMS/email/push en échec.

**Critère :** un incident staging peut être diagnostiqué sans lire les logs bruts ligne par ligne.

#### B4 - Audit protégé et externalisé

La table `audit_log` est append-only, mais il faut aller plus loin.

**Actions minimales :**

- Auditer lectures sensibles : carnet, QR, exports, audit-log, admin.
- Auditer auth : login, logout, refresh reuse, changement mot de passe.
- Exporter l'audit vers stockage immuable ou SIEM.
- Alerter si l'écriture audit échoue.
- Interdire qu'une action sensible réussisse silencieusement sans audit lorsque la
  politique l'exige.

**Critère :** les accès sensibles sont visibles dans un journal protégé et consultable.

#### B5 - Rate limiting production

**Fichiers :** `src/middleware/rateLimiter.js`, `src/config/index.js`

**Actions minimales :**

- Utiliser les valeurs de configuration partout.
- Store partagé Redis ou équivalent en production.
- Limites distinctes OTP, login, refresh, API générale, exports.
- Alertes sur brute force.

**Critère :** les limites restent cohérentes avec plusieurs instances API.

#### B6 - Fournisseurs SMS, email, push

**Fichiers :** `smsService.js`, `emailService.js`, `firebaseService.js`,
`notificationService.js`

**Actions minimales :**

- Choisir fournisseurs réels.
- Définir timeouts, retry, backoff, circuit breaker.
- Redacter PII dans logs.
- Tests staging prouvant livraison, erreur, retry et expiration.
- Table de suivi des messages envoyés/échoués si nécessaire.

**Critère :** OTP, rappels et notifications fonctionnent sur vrais téléphones.

#### B7 - Exports sécurisés

**Actions minimales :**

- Journaliser génération et téléchargement.
- Limiter taille/période/export.
- Chiffrer ou expirer les fichiers.
- Interdire stockage permanent non justifié.
- Ajouter tests d'autorisation et de contenu.

**Critère :** un export ne fuit pas hors périmètre admin et est traçable.

#### B8 - QR cryptographique

**Fichiers :** `src/models/Bebe.js`, `ScanQrFragment.kt`

**Actions minimales :**

- Générer QR aléatoire cryptographiquement fort.
- Ne pas exposer ID séquentiel.
- Ajouter expiration ou rotation si politique retenue.
- Valider format exact côté API.
- Journaliser scan QR.

**Critère :** un QR inventé ou ancien ne permet pas d'énumérer un dossier.

## 5. Analyse mobile parent React Native

### Etat actuel

Le mobile parent a une vraie structure :

- auth OTP : `LoginScreen`, `OtpVerificationScreen` ;
- ajout enfant : `AddBabyScreen` ;
- accueil : `HomeScreen` ;
- sessions : `SessionsScreen`, `SessionDetailScreen` ;
- RDV : `AppointmentsScreen` ;
- file : `QueueScreen` ;
- carnet : `HealthBookScreen` ;
- notifications : `NotificationsScreen` ;
- profil/langue/logout : `ProfileScreen`.

Les services principaux utilisent maintenant `httpClient` et les tokens sont en Keychain.
Mais l'app parent n'est pas encore 100% fonctionnelle, car plusieurs contrôles visibles
restent incomplets ou non testés.

### Parcours parent à valider de bout en bout

#### PARENT-1 - Connexion OTP

**Actions :**

- Tester OTP réel via fournisseur SMS.
- Afficher clairement expiration, renvoi, blocage après tentatives.
- Vérifier qu'un parent existant ne repasse pas inutilement par `AddBaby`.
- Gérer session expirée pendant un écran profond.

**Critère :** connexion, refresh et logout passent sur appareil physique sans token en clair.

#### PARENT-2 - Ajout bébé

**Fichiers :** `AddBabyScreen.js`, `babyService.js`, `carnetRoutes.js`

**Actions :**

- Retirer ou implémenter la photo. Actuellement `handlePickPhoto` est un placeholder.
- Si photo retenue : ajouter `react-native-image-picker`, upload sécurisé, taille max,
  type MIME, suppression.
- Si photo non retenue : enlever toute UI photo.
- Ajouter validation stricte : date naissance, sexe, nom/prénom, doublon.
- Confirmer que le profil est relu depuis le backend après création.

**Critère :** aucun bouton "choisir photo" ne ment ; ajout bébé survit au redémarrage.

#### PARENT-3 - Accueil

**Actions :**

- Remplacer toute hypothèse sur "prochain RDV" par données API fiables.
- Afficher états : chargement, erreur, aucun enfant, aucun RDV, session à venir.
- Ajouter refresh manuel.
- Vérifier navigation "Carnet", "Rendez-vous", "Ma file".

**Critère :** Home reflète exactement les données backend du parent.

#### PARENT-4 - Sessions et réservation

**Fichiers :** `SessionsScreen.js`, `SessionDetailScreen.js`, `sessionService.js`

**Actions :**

- Vérifier mapping complet du contrat API session : statut, disponibilité, centre,
  vaccin, horaires, capacité.
- Ajouter filtre par centre/vaccin/date si demandé par métier.
- Désactiver le bouton réserver pendant soumission.
- Afficher le résultat serveur : confirmé ou liste d'attente.
- Gérer annulation et liste d'attente.
- Tester concurrence dernière place.

**Critère :** réservation parent ne dépasse jamais capacité et reste correcte après relance.

#### PARENT-5 - Rendez-vous

**Fichiers :** `AppointmentsScreen.js`, `MainNavigator.js`

**Actions :**

- Supprimer le badge `2` codé en dur dans `MainNavigator`.
- Badge RDV = nombre réel de RDV actifs si besoin, sinon pas de badge.
- Ajouter détails RDV : centre, date, vaccin, statut, file.
- Annulation uniquement si statut autorisé.
- Ajouter messages métier : "session passée", "annulation impossible", "liste d'attente".

**Critère :** aucun badge ou statut n'est inventé.

#### PARENT-6 - File d'attente

**Fichiers :** `QueueScreen.js`, `queueService.js`

**Actions :**

- Vérifier endpoints `/file-attente/me/position` et `/me/wait-time`.
- Ajouter polling contrôlé ou websocket/SSE si nécessaire.
- Gérer "pas le jour J", "déjà servi", "abandon", "réservation non éligible".
- Ne pas afficher mode hors ligne avec anciennes données si cache santé non autorisé.

**Critère :** parent voit sa position réelle et ne peut agir que sur sa propre entrée.

#### PARENT-7 - Carnet de santé

**Fichiers :** `HealthBookScreen.js`, `healthBookService.js`

**Actions :**

- Vérifier le contrat `/carnet/bebe/:id/complete`.
- Afficher vaccinations, retards, croissance et prochaines étapes.
- Ajouter fallback clair si hors ligne : pas de dossier en clair persistant, sauf décision
  conformité avec chiffrement.
- Ajouter sélection enfant robuste.
- Ajouter tests d'accès : parent A ne voit pas enfant B.

**Critère :** carnet exact, sécurisé, lisible, sans cache clair.

#### PARENT-8 - Notifications

**Fichiers :** `NotificationsScreen.js`, `mobileNotificationService.js`

**Actions :**

- Corriger mapping si backend utilise `lu` et front `isRead`.
- Tester pagination, non lues, marquer lue, tout marquer lu.
- Brancher FCM réel ou retirer promesse push.
- Gérer notifications en arabe/français.

**Critère :** badge notifications = unread count serveur.

#### PARENT-9 - Profil

**Fichiers :** `ProfileScreen.js`

**Actions :**

- Retirer ou implémenter les menus sans effet : gérer enfants, informations
  personnelles, conditions, confidentialité, à propos.
- Ajouter édition profil parent si retenue.
- Ajouter écran politique confidentialité obligatoire.
- Logout doit rester serveur + purge.

**Critère :** aucun `onPress={() => {}}` visible.

#### PARENT-10 - Internationalisation et accessibilité

**Actions :**

- Couvrir tous les textes FR/AR.
- RTL complet : direction, alignement, icônes retour, dates.
- Tester petits écrans, grands écrans, clavier, contraste.
- Ajouter labels accessibilité.

**Critère :** parcours parent complet en français et arabe.

## 6. Analyse mobile personnel infirmier Android

### Etat actuel

Le mobile staff Android natif a :

- login API via `InfirmierAuthViewModel` ;
- dashboard connecté partiellement ;
- RDV list connecté en lecture ;
- scan QR connecté ;
- croissance connectée avec cache mémoire ;
- stock connecté en lecture ;
- notifications ViewModel aligné côté backend ;
- refresh token synchronisé.

Mais plusieurs parcours cliniques ont été masqués car ils étaient fictifs :

- enregistrement vaccination ;
- gestion flacons ;
- gestion présences ;
- statistiques infirmier.

Pour une app infirmier 100% fonctionnelle, ces parcours doivent être réintroduits
proprement.

### Parcours infirmier à construire

#### INF-1 - Dashboard opérationnel

**Fichiers :** `DashboardFragment.kt`, `DashboardViewModel.kt`

**Actions :**

- Afficher sessions du jour du centre.
- Afficher RDV confirmés, présents, en attente, absents.
- Afficher alertes stock.
- Ajouter refresh manuel et erreur réseau.
- Ajouter navigation vers session/RDV/file.

**Critère :** dashboard = données centre infirmier uniquement.

#### INF-2 - Liste RDV par session

**Fichiers :** `RdvFragment.kt`, `RdvListFragment.kt`, `ApiService.kt`

**Actions :**

- Remplacer la liste générique par une sélection de session.
- Afficher détails : bébé, parent, téléphone, vaccin, statut, heure.
- Filtrer par statut.
- Ajouter action selon statut : marquer présent, absent, ouvrir dossier, vacciner.
- Envoyer `PATCH /rendez-vous/:id` seulement avec transitions autorisées.

**Critère :** marquer présent/absent modifie le serveur et survit au redémarrage.

#### INF-3 - File d'attente

**Fichiers :** `QueueManagementViewModel.kt`, layouts à créer

**Actions :**

- Créer écran file visible.
- Afficher file du centre.
- Appeler prochain patient via `/file-attente/call-next`.
- Terminer service via `/file-attente/:id/complete`.
- Polling ou refresh manuel.
- Gérer aucun centre affecté.

**Critère :** plusieurs infirmiers ne peuvent pas appeler deux fois le même patient.

#### INF-4 - Scan QR sécurisé

**Fichiers :** `ScanQrFragment.kt`, `carnetRoutes.js`

**Actions :**

- Valider format QR cryptographique.
- Refuser QR hors centre/session si non autorisé.
- Auditer scan.
- Après scan, afficher carnet et RDV éligibles.
- Ne pas permettre vaccination sans RDV confirmé.

**Critère :** scan QR ne donne pas accès hors périmètre centre.

#### INF-5 - Enregistrement vaccination

**Fichiers :** `EnregistrementVaccinationFragment.kt`, `VaccinationViewModel.kt`,
`clinicalWorkflowService.js`

**Actions :**

- Réactiver un formulaire réel lancé depuis un RDV confirmé.
- Charger flacons actifs de la session.
- Saisir poids, taille, réactions.
- Désactiver bouton pendant enregistrement.
- Appeler `POST /vaccinations/:rdvId`.
- Afficher succès seulement après réponse serveur.
- Afficher erreur claire si flacon vide, RDV non confirmé, session non active.
- Idempotence : empêcher double tap/double enregistrement.

**Critère :** une vaccination consomme une dose, met à jour RDV et carnet atomiquement.

#### INF-6 - Gestion flacons

**Fichiers :** `Gestionflaconsfragment.kt`, `VaccinationViewModel.kt`, `ApiService.kt`

**Actions :**

- Charger flacons session.
- Ouvrir flacon via `POST /flacons`.
- Enregistrer gaspillage via `PATCH /flacons/:id/waste`.
- Fermer/forcer fermeture selon rôle.
- Afficher doses utilisées/restantes calculées serveur.
- Ajouter justification pour ouverture/fermeture forcée si métier exige.

**Critère :** aucune dose ne dépasse la capacité serveur.

#### INF-7 - Croissance

**Fichiers :** `GrowthChartFragment.kt`, `AppDatabase.kt`

**Actions :**

- Décider : lecture seule ou ajout mesure infirmier.
- Si ajout : endpoint sécurisé + formulaire + validation.
- Si cache : chiffrer ou rester mémoire.
- Afficher courbes adaptées âge/sexe si demandé.

**Critère :** mesures exactes, autorisées et non persistées en clair.

#### INF-8 - Stock infirmier

**Fichiers :** `GestionStocksActivity.kt`, `StockViewModel.kt`, `stockRoutes.js`

**Décision métier obligatoire :**

- Option A : infirmier lecture seule, admin modifie.
- Option B : infirmier peut déclarer consommation/entrée via commande auditée.

**Actions minimales :**

- Si option A : aucun bouton d'édition visible.
- Si option B : créer endpoint transactionnel, validation, audit, test RBAC.

**Critère :** UI ne propose que les actions autorisées.

#### INF-9 - Notifications staff

**Actions :**

- Créer écran notifications ou retirer ViewModel inutilisé.
- Tester unread count staff.
- Marquer lu/tout lu.

**Critère :** le parcours retourne 200 et ne montre pas les notifications parent.

#### INF-10 - Offline staff

**Fichiers :** `SyncWorker.kt`, `syncRoutes.js`, `syncService.js`

**Actions :**

- Décider si l'offline est requis pour le pilote.
- Si oui : queue locale par compte, opérations idempotentes, pull persistant, conflit.
- Si non : afficher clairement "connexion requise" et retirer promesse hors ligne.

**Critère :** un scénario hors ligne complet passe sur appareil, ou aucun mode offline
n'est annoncé.

## 7. Analyse mobile administrateur

### Etat actuel

L'admin Android natif est minimal :

- login admin via API ;
- dashboard admin avec cartes visibles mais certaines masquées ;
- exports connectés.

Les écrans suivants existent mais ne sont pas livrables :

- `GestionPersonnelFragment.kt` : personnel local/factice ;
- `Gestioncentresfragment.kt` : centres locaux + TODO activation API ;
- `ConfigJoursDediesFragment.kt` : jours/vaccins locaux ;
- `StatsAdminActivity.kt` : maintenant bloqué car anciennes stats fictives ;
- `GestionStocksActivity.kt` : lecture stock seulement, édition masquée.

### Décision produit à prendre

Deux chemins possibles :

#### Chemin A - Admin mobile complet

Construire une vraie app admin Android avec toutes les fonctions.

Avantage : cohérent avec la demande "mobile admin".  
Inconvénient : plus long, beaucoup de formulaires et de tests.

#### Chemin B - Admin web sécurisé + mobile admin minimal

Le mobile admin sert à exports/monitoring simple ; la gestion complète passe par web admin
sécurisé.

Avantage : plus réaliste rapidement.  
Inconvénient : il faut sécuriser fortement `public/admin`.

Pour répondre à "mobile admin 100% fonctionnel", il faut choisir le chemin A.

### Parcours admin mobile à construire

#### ADM-1 - Dashboard admin réel

**Actions :**

- Afficher KPIs depuis `/statistiques/dashboard` ou `/stats/dashboard`.
- Centres actifs, personnel, RDV, vaccinations, alertes stock.
- Ajouter filtres centre/date.
- Afficher erreurs, chargement, refresh.

**Critère :** aucun graphique ou chiffre codé en dur.

#### ADM-2 - Gestion personnel

**Backend existant :** `/api/admin/personnel`

**Actions :**

- Lister personnel depuis API.
- Ajouter personnel avec validation CIN, rôle, centre.
- Modifier nom/prénom/rôle/centre.
- Désactiver/réactiver.
- Réinitialisation mot de passe ou invitation selon politique.
- Audit visible.

**Critère :** création/modification/désactivation persistent après relance.

#### ADM-3 - Gestion centres

**Backend existant :** `/api/admin/centres`

**Actions :**

- Lister centres réels.
- Voir détails.
- Créer/modifier centre.
- Désactiver centre avec confirmation.
- Gérer coordonnées/adresse.
- Empêcher désactivation si sessions actives sans règle claire.

**Critère :** aucun centre local codé.

#### ADM-4 - Gestion vaccins

**Backend existant :** `/api/vaccins`

**Actions :**

- Lister vaccins.
- Créer/modifier/désactiver.
- Définir doses par flacon, âge cible, libellés FR/AR.
- Vérifier impact sur sessions futures.

**Critère :** les sessions utilisent les vaccins configurés.

#### ADM-5 - Sessions et jours dédiés

**Problème actuel :** jours dédiés locaux dans Android.

**Actions :**

- Décider le modèle backend : jours dédiés par centre, vaccin, capacité, récurrence.
- Ajouter migrations/API si absent.
- Créer écran admin mobile pour planifier sessions.
- Confirmer/annuler session.
- Gérer capacité et liste d'attente.

**Critère :** les sessions parent visibles viennent de la planification admin.

#### ADM-6 - Stock admin

**Backend existant :** `/api/stock`

**Actions :**

- Lister stock par centre/vaccin.
- Upsert stock.
- Modifier seuil alerte.
- Journaliser entrée/sortie.
- Ajouter historique mouvements, pas seulement quantité finale.

**Critère :** stock exact, audité, cohérent avec flacons/vaccinations.

#### ADM-7 - Exports

**Actions :**

- Garder `ExportsAdminActivity`, mais ajouter :
  - choix période ;
  - choix centre ;
  - état téléchargement ;
  - erreur claire ;
  - audit export ;
  - ouverture fichier sécurisée.

**Critère :** export correspond aux filtres et est journalisé.

#### ADM-8 - Audit log

**Backend existant :** `/api/admin/audit-log`

**Actions :**

- Créer écran mobile audit.
- Filtrer date, action, table, utilisateur.
- Lecture seule.
- Pagination.

**Critère :** admin peut consulter les accès sensibles.

#### ADM-9 - Statistiques admin

**Actions :**

- Refaire `StatsAdminActivity` avec données API.
- Couverture vaccinale, RDV par statut, absences, stock, top vaccins.
- Filtrer centre/période.
- Ne pas animer des chiffres tant que données absentes.

**Critère :** stats identiques à backend/export.

## 8. Web admin et waiting room

### Web admin `public/admin`

Le web admin peut être utile, mais pas avec stockage token fragile.

**Actions minimales :**

- Remplacer `localStorage` par session sécurisée ou cookie HttpOnly selon architecture.
- Ajouter logout serveur.
- Ajouter refresh sécurisé.
- Ajouter CSP stricte.
- Protéger CSRF si cookies.
- Retirer du build production si non sécurisé.

**Critère :** un XSS ne peut pas lire un refresh token.

### Waiting room `public/waiting-room`

**Actions minimales :**

- Créer identité kiosk lecture seule par centre.
- Token court, scope uniquement lecture file du centre.
- Aucune action d'écriture.
- Pas de token personnel.
- Rotation et révocation.

**Critère :** l'écran d'attente ne peut lire qu'une seule file.

## 9. iOS et identité produit

### Etat actuel

iOS porte encore `ProjeteTemp`. Cela bloque une livraison propre.

**Actions minimales :**

- Renommer projet iOS, scheme, bundle ID.
- Configurer signature Apple.
- Configurer icônes, splash, nom affiché.
- Vérifier `PrivacyInfo.xcprivacy`.
- Retirer permission localisation vide ou la justifier.
- Tester build iOS en CI et sur appareil.

**Critère :** build iOS installable avec identité VacciniKids finale.

### Android React Native parent

**Actions minimales :**

- Application ID final.
- Icônes/splash finaux.
- Keystore release hors repo.
- Proguard/R8 validé.
- Network security release HTTPS only.
- Tests appareil physique.

### Android staff/admin natif

**Actions minimales :**

- Décider si staff et admin sont une seule app ou deux apps.
- Application ID final.
- Icônes/splash.
- Release signing.
- Permissions minimales.
- Pas de chaînes de démonstration.

## 10. CI/CD minimum pour livrable

La CI actuelle est utile mais insuffisante pour une livraison 100%.

### Actions minimales

1. Backend :
   - lint ;
   - tests unitaires/intégration ;
   - tests concurrence ;
   - tests migrations upgrade ;
   - tests rollback ou restauration.

2. Mobile parent React Native :
   - lint sur `App.js`, `src/screens`, `src/services`, `src/components` ;
   - tests unitaires services ;
   - tests navigation basiques ;
   - bundle Android ;
   - build Android debug/release ;
   - build iOS.

3. Android staff/admin natif :
   - build debug ;
   - build release ;
   - lint Android ;
   - tests ViewModel avec fake API ;
   - tests instrumentation pour login et navigation minimale.

4. Sécurité :
   - `npm audit` ;
   - scan secrets ;
   - SAST ;
   - dépendances mobiles ;
   - vérification absence tokens en clair.

5. Artefacts :
   - APK/AAB parent ;
   - APK/AAB staff/admin ;
   - rapport tests ;
   - couverture ;
   - logs migrations.

**Critère :** une PR ne peut pas casser un parcours mobile majeur sans alerte.

## 11. Recette bout en bout obligatoire

### Scénario parent complet

1. Parent reçoit OTP réel.
2. Parent se connecte.
3. Parent ajoute bébé.
4. Parent consulte sessions.
5. Parent réserve une session.
6. Parent voit le RDV.
7. Parent rejoint file d'attente.
8. Parent reçoit notification.
9. Parent consulte carnet après vaccination.
10. Parent se déconnecte.
11. Parent relance app et se reconnecte.

### Scénario infirmier complet

1. Infirmier se connecte.
2. Infirmier voit session du jour.
3. Infirmier voit RDV.
4. Infirmier appelle prochain patient.
5. Infirmier scanne QR.
6. Infirmier marque présent.
7. Infirmier sélectionne flacon.
8. Infirmier enregistre vaccination.
9. Carnet parent est mis à jour.
10. Dose flacon est consommée.
11. Audit contient l'action.
12. Infirmier se déconnecte.

### Scénario admin complet

1. Admin se connecte.
2. Admin crée/active centre.
3. Admin crée personnel.
4. Admin configure vaccin/stock.
5. Admin planifie session.
6. Parent voit session.
7. Admin consulte stats.
8. Admin exporte rapport.
9. Admin consulte audit.
10. Admin désactive un compte test.

### Scénario résilience

1. Expiration access token pendant navigation.
2. Refresh automatique réussi.
3. Refresh token révoqué.
4. App revient au login.
5. Logout purge caches.
6. Réseau coupé pendant action clinique : aucun succès affiché.
7. Redémarrage app : données cohérentes serveur.

## 12. Plan minimum par ordre de travail

### Lot 1 - Stabiliser fondation

1. Corriger `db:reset:test` local.
2. Ajouter logs détaillés du reset DB.
3. Finaliser séparation API/migrations/jobs.
4. Ajouter correlation ID et logs structurés.
5. Verrouiller rate limit production avec store partagé.
6. Externaliser audit.

**Sortie :** backend exploitable en staging.

### Lot 2 - Mobile parent 100%

1. Supprimer/implémenter photo bébé.
2. Supprimer tous les boutons profil sans effet.
3. Badge RDV réel ou supprimé.
4. Harmoniser erreurs et loaders sur tous les écrans.
5. Tester OTP réel.
6. Tester réservation/RDV/file/carnet/notifications.
7. FR/AR complet.
8. Build Android/iOS parent.

**Sortie :** app parent complète.

### Lot 3 - Mobile infirmier 100%

1. Sessions du jour.
2. RDV par session.
3. Présence/absence serveur.
4. File d'attente.
5. Scan QR sécurisé.
6. Flacons.
7. Vaccination atomique.
8. Stock lecture/action selon décision.
9. Notifications staff.
10. Tests appareil.

**Sortie :** app infirmier complète.

### Lot 4 - Mobile admin 100%

1. Dashboard réel.
2. Personnel.
3. Centres.
4. Vaccins.
5. Sessions/jours dédiés.
6. Stock admin.
7. Stats.
8. Exports.
9. Audit log.
10. Tests appareil.

**Sortie :** app admin complète.

### Lot 5 - Release, conformité, exploitation

1. Identité produit Android/iOS finale.
2. Signing release.
3. Politique confidentialité.
4. Validation loi 09-08.
5. Sauvegarde/restauration testée.
6. Test intrusion.
7. Documentation support.
8. Go/no-go signé.

**Sortie :** livraison production.

## 13. Liste courte des actions minimum indispensables

Si l'équipe manque de temps, voici le minimum non négociable :

1. Corriger la base de test locale.
2. Retirer tous les boutons sans effet.
3. Aucun chiffre, compte, statut ou clinique codé en dur.
4. Mobile parent : OTP, bébé, sessions, RDV, file, carnet, notifications, logout.
5. Mobile infirmier : sessions, RDV, présence, scan QR, flacon, vaccination, file, logout.
6. Mobile admin : personnel, centres, sessions, stock, stats, exports, audit, logout.
7. Tous les succès après confirmation serveur.
8. Tous les tokens en stockage sécurisé.
9. Aucun dossier santé en clair.
10. Tests de concurrence réservation/vaccination.
11. Tests d'autorisation parent/infirmier/admin.
12. Builds release Android parent et staff/admin.
13. Build iOS parent si iOS est dans le périmètre.
14. Sauvegarde/restauration testée.
15. Audit externe protégé.
16. Validation conformité signée.

## 14. Critères finaux de livraison

Le projet est livrable uniquement si cette checklist est entièrement verte :

| Domaine | Critère |
| --- | --- |
| Backend | Tests unitaires/intégration/concurrence passent localement et CI |
| Auth | OTP, login personnel, refresh, logout et changement mot de passe testés |
| Parent | Tous les parcours minimums passent sur appareil physique |
| Infirmier | Vaccination complète passe de RDV à carnet parent |
| Admin | Gestion personnel/centre/session/stock/stats/export/audit fonctionne |
| Sécurité | Aucun token/dossier santé en clair |
| Autorisation | Tests négatifs parent/centre/admin passent |
| Données | Redémarrage app = état serveur correct |
| Offline | Soit testé, soit explicitement non disponible |
| Release | APK/AAB release signés, iOS signé si périmètre |
| Conformité | Dossier signé |
| Exploitation | Sauvegarde/restauration et incident testés |
| Audit | Journal protégé consultable |
| Support | Runbooks et contacts prêts |

## 15. Risques restants à surveiller

1. Vouloir garder trois apps mobiles complètes et un web admin en même temps peut diluer
   l'effort. Choisir un périmètre strict.
2. Le mode offline clinique est coûteux. Si non indispensable, ne pas le promettre.
3. Les exports et notifications peuvent devenir des sources de fuite PII.
4. La conformité loi 09-08 doit être validée par un responsable compétent, pas seulement
   par du code.
5. Les écrans Android natifs staff/admin ont beaucoup de layouts historiques ; il faudra
   nettoyer les ressources inutilisées après fermeture fonctionnelle.
6. iOS ne doit pas rester `ProjeteTemp`.
7. L'audit en base append-only ne suffit pas sans externalisation protégée.

## 16. Recommandation finale

La meilleure trajectoire est :

1. **Livrer d'abord parent + infirmier**, car ils ferment le parcours clinique réel.
2. **Livrer admin minimum**, centré sur personnel, centres, sessions, stock, exports et
   audit.
3. **Retirer ou sécuriser le web admin** avant production.
4. **Ne réactiver aucun écran masqué** tant qu'il n'a pas une commande backend, un état
   chargement, un état erreur, un test d'autorisation et une recette appareil.

Une livraison 100% est atteignable, mais seulement si le projet refuse les demi-parcours :
pas de bouton décoratif, pas de donnée inventée, pas de succès optimiste clinique, pas de
stockage santé en clair.
