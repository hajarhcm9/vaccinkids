# Audit de livrabilité VacciniKids

**Date de l'audit :** 4 juin 2026
**Périmètre :** API Node.js, base PostgreSQL, application parent React Native,
application personnel Android native, interfaces web statiques, tests, sécurité,
documentation et dépôt Git.
**Conclusion actuelle :** projet fonctionnel et bien couvert côté API, mais **pas encore
livrable en production** sans traiter les éléments P0 et P1 ci-dessous.

---

## 1. Résumé exécutif

VacciniKids est déjà un produit conséquent. Le dépôt contient quatre surfaces :

1. une API Express/PostgreSQL ;
2. une application mobile parent React Native Android/iOS ;
3. une application Android native pour le personnel et l'administration ;
4. deux interfaces web statiques pour l'administration et la salle d'attente.

La suite de tests API est riche : **28 suites et 459 tests passent**. La couverture
mesurée avant nettoyage est d'environ **76 % des instructions** et **60 % des branches**.
La structure backend suit globalement un découpage routes, contrôleurs, services et
modèles.

Le principal risque n'est pas l'absence de fonctionnalités. Il vient de l'écart entre un
prototype très avancé et un produit déployable : configuration mobile locale, identité
app encore temporaire, migrations historiquement dispersées, sécurité des secrets et
tokens à renforcer, absence de procédure de livraison complète et manque de tests sur
les deux applications mobiles.

Le cahier des charges fourni a été lu pendant l'audit. Il fixe notamment comme objectifs
le scénario C à 0 % de gaspillage, un temps d'attente inférieur à 30 minutes, un pilote de
50 parents pendant 4 semaines, une architecture offline-first, un fonctionnement temps
réel avec Redis/WebSocket, un triage post-vaccinal, de la sensibilisation sanitaire, le
respect de la loi marocaine 09-08, le chiffrement au repos AES-256 et un audit append-only
conservé au moins 5 ans.

### Verdict par domaine

| Domaine | État | Verdict |
|---|---:|---|
| Fonctionnalités API | Bon | Beaucoup de cas métier déjà présents |
| Tests API | Bon | 459/459 passent sur bases de test dédiées |
| Base de données | Moyen | Migrations consolidées et exécutées, validation vierge requise |
| Sécurité backend | Moyen | Bon socle, plusieurs points P0/P1 restent |
| App parent React Native | Moyen | Fonctionnelle en développement, non configurée pour release |
| App personnel Android | Moyen | Fonctionnelle en développement, URL locale codée en dur |
| Interface admin web | Prototype | Auth en `localStorage`, à durcir |
| Documentation | Moyen | README amélioré, runbook production manquant |
| CI/CD | Partiel | Backend, benchmarks, bundle et builds Android automatisés |
| Livrabilité production | Bloquée | P0 et P1 à fermer avant livraison |

---

## 2. Nettoyage effectué pendant cet audit

### Éléments supprimés

- caches Gradle suivis par erreur ;
- sorties de build Android suivies par erreur ;
- configurations Android Studio `.idea` suivies par erreur ;
- archive étrangère `app/BloodConnect.zip` ;
- scripts temporaires `fix-*`, `diagnose-*`, `day21-*`, `day22-*`, `day23-*` et
  `install-day16-all.js` qui n'étaient référencés par aucun script ou module ;
- couverture Jest et builds locaux régénérables ;
- gitlink imbriqué `vaccinkids` sans fichier `.gitmodules`, donc inutilisable comme
  sous-module ;
- migration manuelle 007, doublon fonctionnel de la migration active.

### Éléments réorganisés

- anciens rapports déplacés dans `docs/archive/` ;
- migrations SQL regroupées dans `src/models/migrations/`, le seul dossier lu par le
  serveur ;
- migrations renumérotées pour éviter le conflit entre deux fichiers `003` ;
- README transformé en point d'entrée décrivant les différentes applications.

### Correctifs de structure appliqués

- ajout de la commande réelle `npm run migrate` ;
- ajout de `scripts/migrate.js` ;
- correction du runner de migrations pour utiliser la même connexion PostgreSQL entre
  `BEGIN`, l'exécution SQL, l'enregistrement et `COMMIT` ;
- suppression d'un `GRANT` codé en dur vers `vaccinikids_user` qui pouvait casser une
  installation utilisant un autre utilisateur ;
- ajout de règles d'ignore pour les archives ZIP et caches Kotlin.

### Éléments volontairement conservés

- `app/` : application Android native personnel/admin, distincte de l'app parent ;
- `android/` et `ios/` : plateformes de l'application parent React Native ;
- `android/app/debug.keystore` : nécessaire au build debug React Native actuel ;
- contrôleurs et services suffixés `Full`, `Enhanced` et `Day22` : noms imparfaits,
  mais modules encore utilisés par les routes actives ;
- anciens rapports dans `docs/archive/` : utiles pour l'historique, mais sortis de la
  racine.

### Vérifications exécutées

| Vérification | Résultat |
|---|---|
| Suite API avant nettoyage | 27 suites, 451 tests passés |
| Suite API après nettoyage | 26 suites passées, 1 échec `ECONNRESET` sur 451 tests |
| Suite fonctionnelle hermétique | 26 suites et 400 tests passés |
| Benchmarks isolés | 2 suites et 59 tests passés |
| Couverture API | Environ 76 % instructions, 60 % branches |
| Bundle React Native Android | Succès |
| Build debug app parent Android | Succès avec Java 17 et `ANDROID_HOME` explicite |
| Build debug app personnel Android | Succès avec Java 17 |
| Vérification syntaxe des scripts modifiés | Succès |
| `git diff --check` | Succès |
| `npm audit` | 0 vulnérabilité après override ciblé de `uuid` |
| Lint | Succès, 0 problème |
| `npm run migrate` sur base Docker existante | Succès, migrations jusqu'à `012` |
| Migrations sur base PostgreSQL vierge temporaire | Succès, 11 migrations exécutées |
| Contrôle base vierge | `code_hash` présent, colonne `code` absente, 0 compte démo |
| Bootstrap premier admin | Création auditée réussie, seconde exécution refusée |
| Reset de sécurité | Refuse toute base dont le nom ne se termine pas par `_test` |
| `docker compose config` | Succès |

`npm test` recrée maintenant une base dédiée suffixée `_test`, applique les migrations et
le seed de développement, puis exécute 400 tests fonctionnels. Les 59 benchmarks sont
exécutés séparément par `npm run test:performance`, chacun sur une nouvelle base. Cette
séparation élimine les collisions de données et les épuisements de sockets inter-suite.

Les builds Android ne doivent pas dépendre du JDK par défaut de la machine. Le JDK local
25.0.3 fait échouer Gradle/Kotlin ; Java 17 fonctionne. La version Java et `ANDROID_HOME`
doivent être documentés et injectés automatiquement en CI.

---

## 3. Arborescence cible actuelle

```text
vaccinkids/
├── android/                  # plateforme Android de l'app parent React Native
├── app/                      # application Android native personnel/admin
├── docs/
│   ├── AUDIT_LIVRABILITE.md
│   └── archive/              # anciens rapports et TODO historiques
├── gradle/                   # wrapper de l'application Android native
├── ios/                      # plateforme iOS de l'app parent React Native
├── public/
│   ├── admin/                # interface admin statique
│   └── waiting-room/         # affichage salle d'attente
├── scripts/
│   ├── migrate.js
│   └── test-db.js
├── src/
│   ├── components/           # composants React Native
│   ├── config/               # configuration API et Swagger
│   ├── context/              # contexte React Native
│   ├── controllers/          # contrôleurs HTTP
│   ├── middleware/           # sécurité, auth, validation, audit
│   ├── models/
│   │   └── migrations/       # source unique des migrations exécutées
│   ├── navigation/           # navigation React Native
│   ├── routes/               # routes Express
│   ├── screens/              # écrans app parent
│   ├── services/             # métier backend et clients mobiles
│   ├── theme/                # thème React Native
│   ├── utils/
│   └── validators/
├── tests/                    # tests Jest/Supertest API
├── App.js                    # entrée app parent
├── index.js                  # registre React Native
├── docker-compose.yml
├── package.json
└── README.md
```

### Réorganisation encore recommandée

Ne pas déplacer davantage de code avant de fermer les risques fonctionnels. À terme :

- séparer le backend dans `apps/api/` ;
- déplacer l'app parent dans `apps/parent-mobile/` ;
- déplacer l'app personnel dans `apps/staff-android/` ;
- déplacer les interfaces web dans `apps/admin-web/` et `apps/waiting-room-web/` ;
- mutualiser contrats API et types dans `packages/contracts/`.

Cette transformation en monorepo est utile, mais elle doit être réalisée avec CI et
tests mobiles. La faire maintenant sans ces protections augmenterait le risque de casse.

---

## 4. Bloquants de livraison P0

### P0-01 - Configuration de production des clients mobiles absente

**Constat**

- Les services React Native utilisent `process.env.API_BASE_URL` avec un fallback
  `http://localhost:3000/api`.
- Sur un vrai téléphone, `localhost` désigne le téléphone, pas le serveur.
- L'application Android native utilise directement
  `http://10.0.2.2:3000/api/`, adresse réservée à l'émulateur Android.

**Risque**

Les applications distribuées ne peuvent pas atteindre l'API de production.

**À faire**

- définir des environnements `dev`, `staging`, `production` ;
- injecter l'URL API au build ;
- interdire HTTP hors debug ;
- documenter la configuration de chaque environnement ;
- tester sur au moins un appareil physique Android et iOS.

**Critère d'acceptation**

Un build release installé sur appareil physique appelle une API HTTPS de staging sans
modification manuelle du code.

### P0-02 - Identité release de l'app parent encore temporaire

**Constat**

- nom Android/iOS : `ProjeteTemp` ;
- package Android : `com.projetetemp` ;
- projet et cible iOS : `ProjeteTemp` ;
- écran de lancement iOS : `ProjeteTemp`.

**Risque**

Impossible de publier proprement l'application sous l'identité VacciniKids ; changement
tardif pouvant casser signatures, Firebase, deep links et stores.

**À faire**

- choisir les identifiants finaux Android et iOS ;
- renommer module React Native, package Android, cible iOS et schémas ;
- créer icônes, splash screens et métadonnées finales ;
- connecter les identifiants aux projets Firebase correspondants.

### P0-03 - Signature release Android parent utilise le keystore debug

**Constat**

Le build `release` de `android/app/build.gradle` utilise actuellement
`signingConfigs.debug`.

**Risque**

Build non publiable et clé de signature non maîtrisée.

**À faire**

- créer une clé de signature release hors Git ;
- charger les secrets via variables d'environnement ou fichier local ignoré ;
- activer minification et tester les règles ProGuard/R8 ;
- documenter la rotation et la sauvegarde de la clé.

### P0-04 - OTP insuffisamment durci - Corrigé pour la production

**Constat actualisé**

- OTP désormais généré avec `crypto.randomInt()` ;
- OTP stocké uniquement sous forme de HMAC SHA-256 lié au téléphone ;
- code universel `123456` désormais limité à `NODE_ENV=test` ;
- le bypass de test exige qu'un OTP actif ait d'abord été demandé ;
- OTP retourné uniquement en développement ou test ;
- limite de tentatives ajoutée et OTP invalidé après dépassement ;
- `OTP_HASH_SECRET` obligatoire au démarrage en production ;
- migration `010` supprimant la colonne `code` et invalidant les anciens OTP.

**Risque**

Prise de contrôle de comptes parents si un environnement de staging est mal configuré
ou accessible publiquement.

**Reste à faire**

- ne jamais exposer un environnement de développement sur Internet ;
- ajouter un test de concurrence sur plusieurs vérifications simultanées ;
- définir une procédure de rotation de `OTP_HASH_SECRET`, qui invalide les OTP actifs.

### P0-05 - Validation réelle des migrations requise - Partiellement corrigé

**Constat**

Les migrations ont été consolidées pendant cet audit. La chaîne complète a ensuite été
exécutée avec succès sur une base PostgreSQL vierge temporaire : 11 migrations appliquées,
schéma OTP hashé vérifié et aucun compte de démonstration créé.

**Risque**

Une base existante et une base vierge pourraient diverger. Des vues, fonctions ou
index peuvent manquer selon l'historique de déploiement.

**À faire**

- lancer les migrations sur une copie anonymisée d'une base existante ;
- comparer les schémas obtenus ;
- ajouter un test automatisé de migration ;
- prévoir une sauvegarde et une procédure de rollback avant production.

### P0-06 - Données de santé et conformité non cadrées

**Constat**

Le projet traite identité, téléphone, données de nourrissons, rendez-vous, vaccination,
croissance, absences et potentiellement géolocalisation. Aucun document actif ne décrit
politique de rétention, consentement, droits d'accès, sauvegarde, chiffrement ou réponse
à incident.

**Risque**

Risque juridique, opérationnel et de confidentialité majeur.

**À faire**

- faire valider les obligations applicables au Maroc ;
- documenter finalités, minimisation, rétention et suppression ;
- chiffrer les sauvegardes et définir les accès ;
- mettre en place une procédure d'incident ;
- valider les mentions de confidentialité des apps et stores ;
- réaliser une revue de sécurité avant mise en production.

### P0-07 - Exigences CDC de chiffrement et audit non satisfaites

**Écart avec le cahier des charges**

- le CDC exige HTTPS/TLS 1.3 : aucun déploiement HTTPS vérifiable n'est fourni ;
- le CDC exige le chiffrement AES-256 des données de santé au repos : non démontré ;
- le CDC exige un journal append-only conservé au moins 5 ans ;
- l'audit actuel est une table SQL modifiable et supprimable par un accès base disposant
  des droits nécessaires ;
- connexions, déconnexions, accès carnet et exports ne sont pas tous garantis dans
  l'audit actuel.

**Critère d'acceptation**

Une architecture de chiffrement, une matrice des événements auditables, une politique de
rétention de 5 ans et des contrôles empêchant la modification des événements sont
documentés et testés.

---

## 5. Priorité élevée P1

### P1-01 - Pipeline CI/CD - Partiellement corrigé

Le workflow `.github/workflows/ci.yml` automatise désormais :

- installation reproductible avec `npm ci` ;
- lint, audit npm et tests fonctionnels sur PostgreSQL éphémère ;
- benchmarks sur bases recréées ;
- migrations complètes depuis zéro ;
- bundle React Native Android ;
- builds debug des deux applications Android.

**Reste à faire :** signer et publier les artefacts release, construire/archiver iOS et
automatiser le déploiement vers staging puis production.

### P1-02 - Lint non conforme - Corrigé

**Mesure de référence :** `790` problèmes, dont `765` erreurs et `25` avertissements.
**Mesure actuelle :** `npm run lint` passe avec **0 problème**.

La majorité est liée à Prettier, mais les avertissements incluent aussi imports et
variables inutilisés. Le lint ne peut donc pas servir de barrière qualité actuellement.

**Action recommandée :**

1. créer une branche dédiée au formatage global ;
2. exécuter Prettier sur le code JS ;
3. corriger les avertissements réels ;
4. ajouter `npm run lint` à la CI ;
5. éviter de mélanger formatage global et correctifs métier.

### P1-03 - Jest utilise `forceExit` - Corrigé

`forceExit` a été retiré. Les suites qui chargeaient l'application sans fermer leur pool
PostgreSQL possèdent maintenant un teardown explicite. Jest termine naturellement.

**Correctifs appliqués :**

- diagnostic avec `--detectOpenHandles` ;
- fermeture des pools dans les `afterAll` concernés ;
- retrait de `forceExit` ;
- arrêt naturel vérifié sur la suite complète.

### P1-04 - Tests mobiles insuffisants

Les 459 tests couvrent principalement l'API. Il n'existe pas de couverture significative
des écrans React Native ni de l'application Android native.

**Minimum avant livraison**

- tests du flux OTP parent ;
- ajout et sélection d'un bébé ;
- réservation, annulation et liste d'attente ;
- affichage du carnet de santé ;
- login personnel ;
- scan QR ;
- enregistrement vaccination ;
- synchronisation hors ligne ;
- gestion stock et flacons ;
- tests end-to-end des parcours critiques.

### P1-05 - Deux interfaces admin concurrentes

Le dépôt contient une app Android admin/personnel et une interface web admin statique.
La responsabilité de chacune n'est pas clairement définie.

**À décider**

- quelles fonctionnalités appartiennent au personnel terrain ;
- quelles fonctionnalités appartiennent à l'administration centrale ;
- quelle interface est officiellement supportée ;
- quelles surfaces doivent être accessibles sur Internet.

### P1-06 - Tokens dans le stockage local web

Les interfaces `public/admin` et `public/waiting-room` stockent les tokens dans
`localStorage`, donc un XSS peut les exfiltrer.

**Action recommandée :**

- préférer une session via cookie `HttpOnly`, `Secure`, `SameSite` ;
- ajouter protection CSRF si cookies ;
- réduire les durées de session ;
- renforcer CSP et supprimer tout contenu inline non nécessaire.

### P1-07 - Refresh tokens stockés en clair

La base stocke le refresh token JWT complet. Une fuite de base permettrait de réutiliser
les sessions encore valides.

**Action recommandée :**

- stocker un hash du refresh token ;
- faire de la rotation de token ;
- détecter la réutilisation ;
- révoquer la famille de tokens en cas de suspicion.

### P1-08 - SSL PostgreSQL trop permissif

Pour une `DATABASE_URL` distante, la configuration utilise
`rejectUnauthorized: false`.

**Action recommandée :**

- utiliser une chaîne de certificats valide ;
- rendre le mode SSL configurable ;
- interdire le contournement de validation en production.

### P1-09 - Docker et `.env.example` incohérents

- PostgreSQL Docker est exposé sur le port hôte `5433`.
- La configuration par défaut de l'API utilise `5432`.
- Le compose code en dur utilisateur et mot de passe au lieu d'utiliser les variables
  documentées dans `.env.example`.

**Action recommandée :** faire lire `POSTGRES_*` au compose, aligner les ports et fournir
un démarrage local vérifié de bout en bout.

### P1-10 - Données de démonstration dans les migrations de production - Corrigé

La migration `002_seed_admin_and_fixes.sql` a été retirée. Les comptes et stocks de
développement sont maintenant dans `seeds/development.sql` et installés uniquement par
`npm run seed:dev`. Cette commande refuse explicitement `NODE_ENV=production` et peut être
réexécutée sans supprimer des comptes référencés.

**Risque**

Comptes prévisibles ou données fictives présents en production.

La commande `npm run admin:bootstrap` crée le premier admin avec mot de passe fort et
audit, puis refuse toute seconde exécution. Les variables de bootstrap doivent être
retirées immédiatement après utilisation.

### P1-11 - Audit applicatif incomplet

Le middleware d'audit :

- ignore volontairement l'authentification ;
- ne connaît qu'un sous-ensemble de tables ;
- écrit après la réponse sans garantir la persistance ;
- peut enregistrer des objets complets contenant des données sensibles ;
- ne lie pas l'écriture audit à la transaction métier.

**Action recommandée :** définir une politique d'audit, masquer les champs sensibles,
garantir l'intégrité, prévoir rétention et export, et surveiller les échecs.

### P1-12 - Absence de monitoring et d'observabilité

Il existe des logs console, mais pas de :

- logs JSON structurés ;
- identifiant de corrélation ;
- métriques ;
- traces ;
- alertes ;
- suivi d'erreurs ;
- tableau de disponibilité.

**Action recommandée :** journalisation structurée sans données de santé, métriques
techniques et métier, alertes et procédure d'astreinte adaptée.

---

## 6. Priorité moyenne P2

### P2-01 - Noms historiques dans le code actif

Les noms `vaccinRoutesFull`, `vaccinControllerFull`, `carnetControllerEnhanced`,
`exportControllerDay22` et `exportServiceDay22` décrivent l'historique de développement,
pas leur responsabilité.

**Action :** fusionner ou renommer après ajout de tests de contrat API.

### P2-02 - Deux familles de statistiques

Le backend expose `/api/statistiques` et `/api/stats`, avec services, contrôleurs et vues
différents.

**Action :** définir une API statistique canonique, déprécier l'autre et documenter les
consommateurs.

### P2-03 - Format de réponse et style de code hétérogènes

Le code mélange `const`, `var`, guillemets simples/doubles, contrôleurs orientés objet et
fonctions, réponses françaises et anglaises.

**Action :** définir conventions et appliquer progressivement après formatage global.

### P2-04 - Services frontend et backend mélangés

`src/services/` contient à la fois logique serveur PostgreSQL et clients HTTP React
Native. Cela rend les frontières difficiles à comprendre.

**Action :** séparer `src/server/` et `src/mobile/`, ou adopter le monorepo proposé.

### P2-05 - Contrats API non générés

Swagger existe, mais les clients Kotlin et React Native utilisent des contrats écrits à
la main.

**Action :** valider l'OpenAPI en CI puis générer ou au minimum tester les DTO clients
contre le contrat.

### P2-06 - Swagger exposé sans règle d'environnement

Les routes `/api/docs` et `/api-docs` sont toujours montées.

**Action :** décider si la documentation est publique ; sinon la désactiver ou la
protéger en production.

### P2-07 - Dépendances avec avis de sécurité

`npm audit` signale deux vulnérabilités modérées liées à `exceljs` et sa dépendance
`uuid`. La correction automatique proposée implique une version majeure différente et
doit être testée.

**Action :** suivre l'avis, évaluer l'exposition réelle, tester export Excel après mise à
jour ou remplacement.

### P2-08 - Configuration Firebase incomplète

Les variables existent, mais la procédure de configuration, rotation de clé, environnements
Firebase et tests de notification réelle ne sont pas documentés.

### P2-09 - Notifications et rappels en mémoire

Le service de rappel démarre dans le processus API. En multi-instance, il peut envoyer
des doublons ; après redémarrage, aucune garantie d'exécution n'est visible.

**Action :** utiliser un scheduler et une file de tâches avec verrouillage/idempotence.

### P2-10 - Rate limiting local

Le rate limiter mémoire ne protège pas correctement une API multi-instance et perd son
état au redémarrage.

**Action :** utiliser un store partagé, définir des limites par endpoint et tester les
réponses `429`.

### P2-11 - Sauvegarde Android personnel autorisée

L'app personnel définit `android:allowBackup="true"` alors qu'elle manipule des données
et tokens sensibles.

**Action :** désactiver ou restreindre précisément sauvegarde et extraction.

### P2-12 - Identité de l'app personnel générique

Le package `com.example.vaccinkid` doit être remplacé avant publication.

### P2-13 - Release Android personnel non minifiée

`isMinifyEnabled = false` en release.

**Action :** activer R8, ajouter règles de conservation Retrofit/Room et tester.

### P2-14 - Localisation incomplète

L'app parent contient français et arabe sur certains écrans, mais il faut vérifier :

- couverture de toutes les chaînes ;
- RTL complet ;
- formats de dates et nombres ;
- accessibilité des lecteurs d'écran ;
- terminologie médicale validée.

### P2-15 - Accessibilité non démontrée

Ajouter labels accessibles, tailles dynamiques, contraste, navigation clavier web,
focus visible et tests sur appareils.

### P2-16 - Gestion des fichiers et exports

Les PDF/Excel peuvent contenir des données sensibles.

**Action :** définir autorisations, durée de conservation, filigrane éventuel, journal
d'export et suppression des fichiers temporaires.

---

## 7. Matrice d'écart avec le cahier des charges

| Exigence du CDC | État observé | Écart / action |
|---|---|---|
| App parent Android et iOS | Partiel | React Native présent, releases et appareils physiques non validés |
| App mobile/tablette infirmier | Partiel | App Android native présente, pas de release ni tests métier |
| Interface admin web React/Next | Partiel | Interface statique présente, architecture et sécurité à renforcer |
| Écran salle d'attente temps réel | Partiel | Interface présente, WebSocket non identifié |
| Centre Es-Salaam pilote | Partiel | Modèle multi-centres présent, procédure pilote absente |
| Multi-centres évolutif | Bon socle | Centres et activation présents, isolation et administration à tester |
| Scénario C, 0 % gaspillage | Partiel | Gestion flacons présente, preuve transactionnelle et KPI manquants |
| Attente cible inférieure à 30 min | Partiel | Temps estimé présent, mesure terrain et alertes SLA absentes |
| Confirmation automatique à 100 % | À vérifier | Test métier CDC TC-03 à prouver de bout en bout |
| Session incomplète 48 h avant | Partiel | Alertes présentes, fusion/replanification à prouver |
| Planification par jours dédiés | Partiel | Écrans Kotlin visibles, contrat backend canonique à confirmer |
| Sessions multi-vaccins | Non conforme | Schéma `session.vaccin_id` limite une session à un vaccin |
| File d'attente digitale | Présent | API, app parent et écran présents ; concurrence/temps réel à tester |
| Numéro d'attente temps réel | Partiel | Fonctionnel côté API/UI, Redis/WebSocket absents |
| Carnet de santé numérique | Présent | Historique/croissance présents, autorisations objet à auditer |
| Courbe de croissance | Présent | Écrans présents, validation clinique et offline à tester |
| Détection retards vaccinaux | Présent | Services et routes présents, calendrier national à valider |
| Notifications push FCM | Partiel | Service présent, configuration et test réel absents |
| Rappels SMS | Partiel | Service présent, fournisseur réel et suivi livraison à valider |
| Gestion absents/reprogrammation | Présent partiellement | Services présents, parcours complet et règle des 15 min à prouver |
| Alerte après 2 absences | Présent partiellement | Logique visible, recette métier et audit à effectuer |
| Module symptômes post-vaccinaux | Absent | Aucun écran/service de triage vert-orange-rouge identifié |
| Sensibilisation/éducation sanitaire | Absent | Aucun module de contenu/tutoriel identifié |
| GPS et itinéraire | Partiel | Ouverture Maps présente, centre proche et géolocalisation à compléter |
| Statistiques | Présent | Deux APIs concurrentes à consolider |
| Exports PDF/Excel | Présent | Sécurité, exactitude et conformité des exports à valider |
| Offline-first carnet | Partiel | Cache Room côté personnel, stratégie parent à compléter |
| Synchronisation offline critique | Partiel | API sync présente, conflits critiques et tests terrain manquants |
| Redis pour temps réel | Absent | Aucune dépendance/configuration Redis |
| WebSocket | Absent | Aucun serveur ou client WebSocket identifié |
| API REST Node/Express | Présent | Bon socle, déploiement production manquant |
| PostgreSQL cloud | Partiel | PostgreSQL présent, cloud/HA/backups non fournis |
| Français et arabe | Partiel | Plusieurs écrans bilingues, couverture complète à auditer |
| Consentement explicite parent | Absent/non démontré | Ajouter collecte, preuve et retrait du consentement |
| Droit accès/rectification/suppression | Partiel | Profil présent, procédure complète non démontrée |
| HTTPS/TLS 1.3 | Non démontré | Déployer et vérifier |
| Chiffrement AES-256 au repos | Non démontré | Concevoir et documenter |
| RBAC | Présent | Audit d'autorisation objet à réaliser |
| Audit append-only 5 ans | Non conforme | Table modifiable, couverture et rétention insuffisantes |
| Sauvegarde quotidienne, rétention 30 j | Absent/non démontré | Automatiser et tester restauration |
| Tests unitaires/intégration/fonctionnels/UAT | Partiel | API forte, mobile et UAT manquants |
| Pilote 50 parents pendant 4 semaines | Non préparé | Définir protocole, consentement, support et KPI |
| Tutoriel intégré et signalement | Non identifié | Ajouter ou documenter |

---

## 8. Analyse sécurité détaillée

### Points positifs

- Helmet, CSP, HPP et CORS sont présents ;
- authentification JWT avec access et refresh tokens ;
- RBAC parent, infirmier et admin ;
- validation de plusieurs entrées ;
- protection brute force sur login personnel ;
- rate limiting global et auth ;
- mots de passe personnel hashés avec bcrypt ;
- requêtes SQL généralement paramétrées ;
- middleware d'audit ;
- limites de taille du body ;
- séparation des secrets via variables d'environnement ;
- `.env` ignoré par Git.

### Points à vérifier

- autorisation objet par objet : un parent ne doit jamais lire/modifier le bébé d'un
  autre parent ;
- accès aux routes carnet et rendez-vous ouvertes à plusieurs rôles ;
- validation de tous les identifiants et paramètres de pagination ;
- absence de fuite de stack et détails SQL en production ;
- suppression des données sensibles dans les logs ;
- validation des fichiers/photos lors de l'ajout de bébé ;
- protection contre export massif ;
- durée de rétention des OTP, refresh tokens et audit logs ;
- rotation des clés JWT ;
- politique de mot de passe personnel cohérente entre création et changement ;
- sécurité des endpoints de synchronisation hors ligne ;
- résolution de conflit autorisée uniquement aux bons rôles ;
- sécurité du scan QR et absence d'ouverture d'URL arbitraire dangereuse.

### Revue de secrets

À confirmer avant livraison :

- aucun secret réel dans historique Git ;
- aucun secret dans builds Android/iOS ;
- aucune clé Firebase dans archive ou configuration IDE ;
- aucun mot de passe par défaut actif ;
- clés JWT différentes entre environnements ;
- clé de signature Android sauvegardée hors dépôt ;
- secrets de CI protégés et limités.

---

## 9. Analyse base de données

### Points positifs

- contraintes de clés étrangères ;
- contraintes de statuts ;
- index sur plusieurs accès fréquents ;
- timestamps ;
- vues statistiques ;
- tables d'audit, OTP, refresh token, file d'attente et synchronisation ;
- migrations SQL versionnées.

### Points à traiter

1. Tester l'ordre complet des migrations sur base vierge.
2. Vérifier les migrations sur base déjà créée avant consolidation.
3. Ajouter rollback ou stratégie de restauration.
4. Ne pas dépendre de seeds de développement.
5. Ajouter contraintes d'unicité métier manquantes après revue.
6. Définir suppression/anonymisation des données.
7. Ajouter sauvegarde automatisée et test de restauration.
8. Mesurer les requêtes statistiques sur volume réaliste.
9. Vérifier les verrous lors de réservation et appel de file d'attente.
10. Garantir qu'aucune sur-réservation n'est possible en concurrence.
11. Garantir qu'un flacon ne dépasse jamais son nombre de doses.
12. Définir fuseau horaire de référence et gestion des changements d'heure.

### Risques de concurrence prioritaires

- deux parents réservent la dernière place ;
- deux infirmiers appellent la prochaine personne ;
- deux appareils synchronisent la même vaccination ;
- deux requêtes utilisent la dernière dose d'un flacon ;
- un rappel et une annulation sont traités simultanément.

Chaque scénario doit avoir un test transactionnel PostgreSQL réel.

---

## 10. Analyse tests et qualité

### État mesuré

- 28 suites Jest passent ;
- 459/459 tests passent : 400 fonctionnels et 59 benchmarks isolés ;
- couverture globale : environ 76 % instructions, 60 % branches ;
- lint : 0 problème ;
- Jest termine naturellement sans `forceExit`.

### Lacunes

- la couverture mobile reste très faible malgré l'inclusion de `src/__tests__` ;
- beaucoup de modèles ont une couverture faible ;
- peu de tests réels PostgreSQL transactionnels ;
- les migrations depuis zéro sont vérifiées par chaque `npm test`, mais pas encore
  comparées automatiquement à une copie anonymisée ;
- pas de test mobile React Native visible ;
- uniquement tests Android exemples, pas de parcours métier ;
- pas de test iOS ;
- pas de test de contrat OpenAPI ;
- pas de test d'accessibilité ;
- pas de test de charge reproductible en CI ;
- pas de test de restauration de sauvegarde.

### Pyramide de tests recommandée

- tests unitaires services et validation ;
- tests d'intégration API avec PostgreSQL réel ;
- tests de contrat pour OpenAPI et DTO Kotlin/JS ;
- tests composants React Native ;
- tests Android natifs ;
- tests end-to-end des parcours P0 ;
- tests de charge sur réservation, file d'attente et statistiques ;
- tests de sécurité automatisés.

---

## 11. Analyse produit et UX

### Parcours parent à valider

1. authentification OTP ;
2. création et modification du profil ;
3. ajout de bébé ;
4. gestion de plusieurs bébés ;
5. recherche d'une session ;
6. réservation et annulation ;
7. liste d'attente ;
8. file d'attente numérique ;
9. notifications et rappels ;
10. carnet de santé et historique ;
11. retards vaccinaux ;
12. courbe de croissance ;
13. changement de langue ;
14. perte de réseau et reprise.

### Parcours personnel à valider

1. connexion et expiration de session ;
2. liste des rendez-vous ;
3. présence/absence ;
4. appel de file d'attente ;
5. scan QR ;
6. enregistrement de vaccination ;
7. sélection et ouverture de flacon ;
8. stock et seuils ;
9. mode hors ligne ;
10. résolution après reconnexion.

### Parcours admin à valider

1. gestion centres ;
2. gestion personnel ;
3. gestion vaccins ;
4. sessions ;
5. statistiques ;
6. exports ;
7. audit ;
8. alertes ;
9. gestion des droits ;
10. désactivation et réactivation.

### Détails UX encore visibles

- ajout de photo bébé est un placeholder ;
- module de triage des symptômes post-vaccinaux absent ;
- module de sensibilisation et d'éducation sanitaire absent ;
- messages API alternent français et anglais ;
- gestion des erreurs réseau à homogénéiser ;
- état vide, chargement, retry et mode hors ligne à tester sur chaque écran ;
- confirmer les gestes destructifs ;
- expliquer clairement liste d'attente, position et temps estimé ;
- éviter d'afficher des données personnelles sur l'écran public de salle d'attente.

---

## 12. Documentation manquante

Créer avant livraison :

- `docs/ARCHITECTURE.md` ;
- `docs/API.md` ou procédure de génération OpenAPI ;
- `docs/DEPLOYMENT.md` ;
- `docs/RUNBOOK.md` ;
- `docs/SECURITY.md` ;
- `docs/PRIVACY.md` ;
- `docs/BACKUP_RESTORE.md` ;
- `docs/INCIDENT_RESPONSE.md` ;
- `docs/RELEASE_ANDROID_PARENT.md` ;
- `docs/RELEASE_IOS_PARENT.md` ;
- `docs/RELEASE_ANDROID_STAFF.md` ;
- `CONTRIBUTING.md` ;
- politique de versions et changelog.

Le runbook doit répondre précisément à :

- comment démarrer/arrêter ;
- comment vérifier la santé ;
- comment migrer ;
- comment restaurer ;
- comment revenir à une version précédente ;
- comment révoquer des sessions ;
- comment changer une clé ;
- comment diagnostiquer SMS, email, Firebase et base ;
- qui contacter en cas d'incident.

---

## 13. Feuille de route recommandée

### Phase 1 - Stabilisation immédiate

- [ ] Valider migrations sur copie anonymisée. Base vierge validée.
- [x] Corriger configuration Docker locale.
- [x] Corriger OTP P0 pour la production.
- [ ] Définir URLs et environnements mobiles.
- [ ] Renommer l'identité release de l'app parent.
- [ ] Configurer signatures release.
- [x] Séparer seeds de développement.
- [x] Corriger fuite Jest et retirer `forceExit`.
- [x] Ajouter CI backend et builds Android debug.
- [ ] Faire revue de conformité et confidentialité.
- [ ] Décider et planifier les exigences CDC absentes : triage, sensibilisation,
  WebSocket/Redis et sessions multi-vaccins.

### Phase 2 - Qualité et sécurité

- [ ] Appliquer formatage global dans une branche dédiée.
- [x] Faire passer lint à zéro erreur.
- [ ] Ajouter tests PostgreSQL réels et concurrence.
- [ ] Ajouter tests mobiles critiques.
- [ ] Hash et rotation des refresh tokens.
- [ ] Durcir stockage de sessions web.
- [ ] Durcir SSL PostgreSQL.
- [ ] Ajouter observabilité.
- [x] Traiter vulnérabilités npm.
- [ ] Protéger ou désactiver Swagger en production.

### Phase 3 - Préproduction

- [ ] Déployer environnement staging HTTPS.
- [ ] Configurer SMS, email et Firebase réels.
- [ ] Tester appareils physiques.
- [ ] Réaliser test de charge.
- [ ] Réaliser audit de sécurité.
- [ ] Tester sauvegarde/restauration.
- [ ] Valider accessibilité et bilingue FR/AR.
- [ ] Faire recette métier avec utilisateurs.
- [ ] Rédiger runbook et procédure d'incident.
- [ ] Préparer métadonnées stores.

### Phase 4 - Livraison

- [ ] Geler périmètre et version.
- [ ] Fermer tous les P0.
- [ ] Accepter explicitement les P1 restants.
- [ ] Créer sauvegarde pré-déploiement.
- [ ] Déployer migrations puis API.
- [ ] Vérifier smoke tests.
- [ ] Distribuer apps signées.
- [ ] Surveiller erreurs, latence, SMS et notifications.
- [ ] Organiser support post-livraison.

---

## 14. Définition de "livrable"

Le projet peut être déclaré livrable lorsque :

- tous les P0 sont fermés ;
- migrations testées sur base vierge et existante ;
- CI verte sur lint, tests et builds ;
- builds release signés installables ;
- environnement staging validé sur appareils physiques ;
- aucune URL locale dans les builds release ;
- aucun compte ou secret de démonstration en production ;
- conformité et politique de confidentialité validées ;
- sauvegarde et restauration testées ;
- monitoring et alertes actifs ;
- runbook et procédure de rollback disponibles ;
- recette métier signée ;
- risques P1 restants documentés et acceptés.

---

## 15. Commandes de contrôle

```bash
npm ci
npm run lint
npm test -- --runInBand
npm audit
npm run migrate
npm run mobile:bundle:android
npm run mobile:build:android
./gradlew :app:test
./gradlew :app:assembleDebug
```

Pour les migrations, exécuter d'abord contre une base jetable. Ne jamais tester une
nouvelle séquence directement sur la base de production.

---

## 16. Registre synthétique des risques

| ID | Risque | Priorité | Propriétaire conseillé | Statut |
|---|---|---:|---|---|
| R-001 | Apps release incapables d'appeler l'API | P0 | Mobile/DevOps | Ouvert |
| R-002 | Identité `ProjeteTemp` en publication | P0 | Mobile | Ouvert |
| R-003 | Signature Android release debug | P0 | Mobile/DevOps | Ouvert |
| R-004 | OTP stocké en clair | P0 | Backend/Sécurité | Fermé |
| R-005 | Historique migrations divergent | P0 | Backend/DBA | Base vierge validée |
| R-006 | Conformité données de santé | P0 | Produit/Juridique | Ouvert |
| R-007 | Absence CI/CD | P1 | DevOps | Partiellement fermé |
| R-008 | Lint non exploitable | P1 | Équipe dev | Fermé |
| R-009 | Fuite de handles Jest masquée | P1 | Backend | Fermé |
| R-010 | Couverture mobile insuffisante | P1 | Mobile/QA | Ouvert |
| R-011 | Tokens web dans localStorage | P1 | Web/Sécurité | Ouvert |
| R-012 | Refresh tokens en clair | P1 | Backend/Sécurité | Ouvert |
| R-013 | SSL DB permissif | P1 | Backend/DevOps | Ouvert |
| R-014 | Seeds démo en production | P1 | Backend/DevOps | Fermé |
| R-015 | Audit incomplet | P1 | Backend/Sécurité | Ouvert |
| R-016 | Pas de monitoring | P1 | DevOps | Ouvert |
| R-017 | Vulnérabilités dépendances | P2 | Équipe dev | Fermé |
| R-018 | Rappels non distribués | P2 | Backend | Ouvert |
| R-019 | Sauvegarde app personnel | P2 | Android | Ouvert |
| R-020 | Accessibilité non démontrée | P2 | Produit/QA | Ouvert |
| R-021 | Module symptômes CDC absent | P1 | Produit/Backend/Mobile | Ouvert |
| R-022 | Sensibilisation sanitaire CDC absente | P2 | Produit/Mobile | Ouvert |
| R-023 | Temps réel Redis/WebSocket absent | P1 | Backend/DevOps | Ouvert |
| R-024 | Sessions multi-vaccins non supportées | P1 | Produit/Backend/DBA | Ouvert |
| R-025 | Chiffrement au repos non démontré | P0 | Sécurité/DBA | Ouvert |

---

## 17. Notes finales

Le projet ne doit pas être réécrit. Son socle API, ses fonctionnalités métier et sa
couverture de tests représentent déjà beaucoup de valeur. Le meilleur chemin vers une
livraison fiable est une stabilisation disciplinée : rendre les environnements
reproductibles, sécuriser les parcours d'authentification, tester les migrations et les
clients réels, puis mettre en place les garanties opérationnelles.

La prochaine revue devrait mettre à jour ce document ligne par ligne, avec preuve pour
chaque fermeture : test automatisé, capture de build, procédure documentée ou validation
métier.
