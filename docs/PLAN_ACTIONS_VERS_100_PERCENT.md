# Plan d'actions vers une livraison 100% - VacciniKids

**Date de référence :** 6 juin 2026  
**Etat estimé au départ :** environ 70% vers une production complète  
**Objectif :** fermer tous les écarts restants avant un pilote réel puis une mise en
production des applications parent, infirmier, administrateur et des surfaces web.

Ce document décrit uniquement le travail restant. Il complète :

- `docs/ROADMAP_LIVRABLE_100_MOBILE.md` ;
- `docs/AUDIT_LIVRABILITE.md` ;
- `docs/ANALYSE_PROFONDE_LIVRABILITE.md` ;
- `docs/COMPLIANCE_HEALTH_DATA.md`.

## 1. Règle de validation

Une tâche n'est terminée que lorsque :

- le code est fusionné et les migrations nécessaires sont appliquées ;
- les tests automatiques positifs et négatifs passent ;
- le parcours passe sur un environnement de staging propre ;
- le résultat reste correct après redémarrage des applications et services ;
- les erreurs réseau, droits insuffisants et données invalides sont gérés ;
- une preuve est conservée : rapport CI, capture, journal d'audit ou procès-verbal ;
- la documentation d'exploitation est mise à jour.

Une interface visible sans action réelle, un succès affiché avant confirmation serveur ou
une fonction reposant sur des données fictives bloque la livraison.

## 2. Décisions produit à prendre immédiatement

Ces décisions bloquent plusieurs développements. Elles doivent être écrites et validées
avant de poursuivre les fonctions concernées.

| ID | Décision | Choix à valider | Preuve attendue |
| --- | --- | --- | --- |
| DEC-01 | Périmètre du pilote | Fonctions visibles dans chaque application | Document signé produit/métier |
| DEC-02 | Administration | Admin mobile complet ou web admin principal sécurisé | Architecture et périmètre validés |
| DEC-03 | Stock infirmier | Lecture seule ou commandes de mouvement auditées | Matrice RBAC validée |
| DEC-04 | Croissance infirmier | Lecture seule ou ajout de mesures | Règle clinique validée |
| DEC-05 | Offline staff | Vrai mode offline clinique ou connexion obligatoire | Décision risque/coût validée |
| DEC-06 | Sessions | Modèle des jours dédiés, récurrence, capacité et annulation | Spécification métier validée |
| DEC-07 | Conservation | Durées par catégorie de données et sauvegardes | Politique conformité signée |
| DEC-08 | Applications staff | Une app staff/admin ou deux applications séparées | Décision distribution validée |

## 3. Priorités et portes de sortie

### P0 - Bloquants avant pilote réel

- Fournisseurs OTP/SMS et notifications réels.
- Parcours cliniques et administratifs visibles entièrement connectés.
- Autorisations centre/ressource testées négativement.
- Audit fiable et politique de réaction aux échecs.
- Sauvegarde et restauration testées.
- Releases signées installées sur appareils physiques.
- Recette bout en bout staging.
- Validation conformité minimale et revue de menace.

### P1 - Bloquants avant production

- Rate limiting partagé et résilient.
- Observabilité, alertes et runbooks.
- Audit externalisé et protégé.
- CI/CD release complète avec scans.
- Tests de charge, reprise, réseau lent et concurrence.
- Accessibilité, arabe/RTL et confidentialité validés.
- Pentest avec corrections des résultats critiques/élevés.

### P2 - Améliorations après stabilité

- Temps réel avancé via WebSocket si nécessaire.
- Offline clinique complet si retenu.
- Optimisations UX et performance non bloquantes.
- Statistiques et fonctions secondaires hors périmètre pilote.

## 4. Backend et sécurité

### BE-01 - Rate limiting de production

**Actions**

- Remplacer le store mémoire de `src/middleware/rateLimiter.js` par Redis ou équivalent.
- Configurer séparément OTP, login staff, refresh, API générale, exports et kiosks.
- Définir les limites par environnement sans valeurs sensibles codées en dur.
- Ajouter une stratégie derrière proxy avec identification IP fiable.
- Tester plusieurs instances API, expiration des compteurs et indisponibilité Redis.
- Ajouter alertes sur abus et pics de refus.

**Critère d'acceptation**

Deux instances API partagent les mêmes compteurs et une attaque distribuée simple est
ralentie sans bloquer abusivement les utilisateurs légitimes.

### BE-02 - Fournisseurs SMS, email et push réels

**Actions**

- Choisir et configurer les fournisseurs staging et production.
- Interdire le mode stub en staging de recette et en production.
- Ajouter timeout, retry borné, backoff, idempotence et suivi du statut fournisseur.
- Ne jamais journaliser OTP, tokens ou contenu médical sensible.
- Gérer les numéros invalides, tokens FCM expirés et erreurs permanentes.
- Ajouter métriques de livraison, taux d'échec et alertes.
- Tester OTP et notification sur appareils physiques.

**Critère d'acceptation**

Un parent reçoit réellement l'OTP et les notifications ; un échec fournisseur produit un
état contrôlé, observable et sans faux succès.

### BE-03 - Audit protégé et externalisé

**Actions**

- Externaliser les événements vers un stockage append-only protégé ou un SIEM.
- Définir les actions qui doivent échouer si leur audit ne peut pas être garanti.
- Auditer authentification, logout, refresh, lectures sensibles, QR, vaccination, stock,
  exports, administration et changements de rôles.
- Inclure identifiant de requête, acteur, rôle, centre, ressource et résultat sans données
  médicales excessives.
- Ajouter alertes sur échecs d'audit, accès inhabituels et volumes anormaux.
- Tester intégrité, rétention et accès lecture seule.

**Critère d'acceptation**

Les accès sensibles sont consultables dans un journal protégé et une suppression ou
modification non autorisée est détectable.

### BE-04 - Observabilité et exploitation

**Actions**

- Ajouter métriques techniques : latence, erreurs, saturation DB, files et dépendances.
- Ajouter métriques métier sans données personnelles : OTP, réservations, vaccinations,
  appels file, erreurs stock et notifications.
- Créer dashboards staging/production et alertes avec seuils validés.
- Propager le correlation ID jusqu'aux jobs et fournisseurs externes.
- Définir SLO, disponibilité cible et budget d'erreur.
- Rédiger runbooks pour API indisponible, DB saturée, SMS en panne et échec migration.

**Critère d'acceptation**

Une panne simulée déclenche une alerte utile et l'équipe peut identifier la cause avec les
logs, métriques et runbooks.

### BE-05 - Exports sécurisés

**Actions**

- Vérifier autorisation, centre, période et périmètre de chaque export.
- Auditer création et téléchargement.
- Chiffrer ou protéger les fichiers générés.
- Définir expiration, suppression automatique et limite de taille.
- Empêcher les formules CSV dangereuses et noms de fichiers non sûrs.
- Tester export volumineux, accès croisé et lien expiré.

**Critère d'acceptation**

Un export ne contient que les données autorisées, expire automatiquement et laisse une
trace d'audit complète.

### BE-06 - Base de données, migrations et invariants

**Actions**

- Tester migration depuis la version réellement déployée, pas seulement une base vide.
- Ajouter procédure de rollback ou de correction pour chaque migration risquée.
- Valider contraintes de vaccination, flacon, rendez-vous, stock et file sous concurrence.
- Ajouter tests d'idempotence et double soumission.
- Tester les migrations avec données historiques invalides contrôlées.
- Vérifier index, requêtes lentes et intégrité référentielle.

**Critère d'acceptation**

Une montée de version staging conserve les données et les commandes cliniques restent
atomiques sous appels concurrents.

### BE-07 - Durcissement API et dépendances

**Actions**

- Réaliser une revue exhaustive RBAC et autorisation par ressource/centre.
- Vérifier validation des entrées, tailles maximales, uploads et erreurs génériques.
- Vérifier CORS, headers de sécurité, TLS, secrets et rotation des clés.
- Mettre à jour les dépendances vulnérables après tests de régression.
- Ajouter SAST, scan secrets, scan dépendances et scan image conteneur.
- Documenter rotation et révocation des secrets.

**Critère d'acceptation**

Les scans ne remontent aucun risque critique/élevé non accepté et les tests négatifs
interdisent tout accès entre comptes ou centres.

## 5. Application mobile parent

### PAR-01 - Authentification et session réelles

- Valider identité et expiration avec le serveur au démarrage.
- Tester OTP réel, renvoi, expiration, limitation, mauvais code et changement de numéro.
- Tester refresh single-flight sous requêtes concurrentes.
- Vérifier logout serveur, révocation et purge de tous les caches du compte.
- Vérifier qu'aucun token n'est lisible dans AsyncStorage, logs ou sauvegardes.

**Terminé lorsque :** le parcours complet passe sur Android et iOS physiques avec le
fournisseur OTP staging.

### PAR-02 - Enfants et carnet de santé

- Valider ajout, édition autorisée, doublons et erreurs métier.
- Vérifier isolation stricte entre comptes parents.
- Tester carnet, croissance et QR avec états vide/chargement/erreur.
- Minimiser les caches de santé, documenter rétention et purge.
- Vérifier qu'aucune donnée médicale n'est présente dans logs, screenshots de tâche,
  sauvegardes cloud non autorisées ou stockage clair.

**Terminé lorsque :** les données persistent serveur après relance et ne sont jamais
accessibles depuis un autre compte.

### PAR-03 - Sessions, réservation et rendez-vous

- Tester sessions disponibles venant uniquement du backend.
- Tester réservation, capacité, liste d'attente et double soumission.
- Tester annulation selon règles métier et affichage du statut réel.
- Afficher les erreurs métier sans faux succès.
- Tester changements concurrents de capacité.

**Terminé lorsque :** une réservation et son annulation restent correctes après relance et
sont visibles côté admin/infirmier.

### PAR-04 - File d'attente

- Valider rejoindre/quitter, position, appel et fin de service.
- Définir polling ou temps réel et comportement en arrière-plan.
- Gérer session terminée, centre incorrect et réseau interrompu.
- Tester cohérence avec plusieurs parents et plusieurs infirmiers.

**Terminé lorsque :** les positions restent cohérentes sous concurrence et après reprise
réseau.

### PAR-05 - Notifications

- Connecter FCM/APNs réels et enregistrer/retirer les tokens appareil.
- Tester réception en premier plan, arrière-plan et application fermée.
- Tester lecture, tout lire, deep links et token expiré.
- Séparer strictement notifications parent et staff.
- Ajouter préférences autorisées et messages accessibles FR/AR.

**Terminé lorsque :** une notification staging réelle ouvre la bonne ressource autorisée.

### PAR-06 - Qualité mobile parent

- Tester tous les écrans en FR et AR avec RTL.
- Corriger accessibilité : labels, contraste, taille dynamique et navigation clavier.
- Vérifier états vides, erreurs, retry, session expirée et réseau lent.
- Finaliser icônes, splash, nom affiché et confidentialité des captures.
- Tester performance, crash-free startup et appareils Android/iOS cibles.

**Terminé lorsque :** la recette visuelle et fonctionnelle passe sur la matrice d'appareils.

## 6. Application mobile infirmier

### INF-01 - Dashboard et rendez-vous

- Afficher uniquement centre, sessions et rendez-vous autorisés.
- Finaliser filtres, statuts, refresh et erreurs.
- Autoriser uniquement les transitions de statut métier.
- Tester présence/absence et persistance serveur après relance.

### INF-02 - File d'attente concurrente

- Finaliser l'écran file et les états aucun centre/session.
- Tester `call-next` et `complete` avec plusieurs infirmiers.
- Empêcher deux appels du même patient.
- Ajouter reprise réseau et journal d'audit.

### INF-03 - Scan QR et accès carnet

- Tester QR invalide, expiré, autre centre, autre session et QR rejoué.
- Vérifier que le scan n'accorde qu'un accès temporaire et borné.
- Auditer chaque scan et refus.
- Retirer le cache offline du carnet si le vrai offline n'est pas retenu.

### INF-04 - Vaccination atomique

- Lancer uniquement depuis un rendez-vous confirmé et autorisé.
- Charger uniquement les flacons actifs de la session.
- Valider poids, taille, réactions et données requises.
- Désactiver la soumission pendant l'appel et fournir une clé d'idempotence.
- Tester flacon vide, session inactive, double tap et requêtes concurrentes.
- Vérifier atomiquement dose, flacon, rendez-vous, carnet, stock et audit.

**Terminé lorsque :** un scénario clinique complet passe sur appareil et reste correct
après redémarrage.

### INF-05 - Flacons, stock et croissance

- Finaliser ouverture, gaspillage, fermeture et justification forcée.
- Afficher les doses calculées par le serveur uniquement.
- Appliquer la décision stock infirmier et masquer toute action interdite.
- Appliquer la décision croissance et sécuriser l'ajout éventuel.
- Tester dépassement capacité, concurrence et droits.

### INF-06 - Notifications et offline staff

- Créer l'écran notifications staff ou retirer la fonction du pilote.
- Appliquer la décision offline :
  - si offline retenu : queue chiffrée par compte, idempotence, reprise, conflits et tests ;
  - sinon : retirer les promesses offline et afficher clairement connexion requise.
- Ne jamais conserver de dossier clinique en clair.
- Purger toutes les données au logout/changement de compte.

**Terminé lorsque :** un scénario offline complet passe sur appareil, ou aucune fonction
offline n'est annoncée ni utilisée.

## 7. Application mobile administrateur

### ADM-01 - Dashboard et statistiques

- Finaliser les KPIs API sans valeurs codées en dur.
- Ajouter filtres centre/date et états chargement/erreur.
- Finaliser couverture, rendez-vous, absences, stock et vaccins.
- Vérifier égalité entre chiffres écran, API et exports.

### ADM-02 - Personnel, centres et vaccins

- Recetter création, modification, désactivation et réactivation.
- Valider CIN, rôle, centre et politique de mot de passe/invitation.
- Empêcher actions incohérentes : centre actif, sessions actives et droits insuffisants.
- Afficher l'audit pertinent en lecture seule.
- Tester persistance après relance et accès négatifs.

### ADM-03 - Sessions et jours dédiés

- Finaliser le modèle backend décidé : centre, vaccin, capacité et récurrence.
- Remplacer complètement `ConfigJoursDediesFragment.kt` local.
- Créer, confirmer, démarrer, terminer et annuler selon règles métier.
- Gérer capacité, liste d'attente et impact des changements.
- Tester visibilité côté parent et infirmier.

**Terminé lorsque :** aucun jour/session local ou codé en dur ne reste dans l'application.

### ADM-04 - Stock et mouvements

- Finaliser stock par centre/vaccin et seuil d'alerte.
- Créer un historique immuable des entrées, sorties, corrections et consommations.
- Exiger motif et audit pour correction.
- Vérifier cohérence avec flacons et vaccinations.
- Tester concurrence et impossibilité de quantité négative.

### ADM-05 - Exports et audit mobile

- Finaliser filtres période/centre, téléchargement, erreur et ouverture sécurisée.
- Ajouter pagination et filtres de l'audit.
- Empêcher toute modification d'audit depuis le mobile.
- Tester expiration fichier et accès à un autre centre.

### ADM-06 - Nettoyage du périmètre pilote

- Masquer ou retirer chaque écran admin non connecté.
- Retirer données, graphiques, toasts de succès et comptes fictifs.
- Vérifier toutes les navigations et états de permission.
- Décider si le web admin remplace certains parcours mobiles.

## 8. Web admin et waiting room

Les fondations de sécurité sont présentes. Il reste à les recetter et les exploiter.

### WEB-01 - Web admin

- Tester cookies HttpOnly, refresh, CSRF, CSP et logout en staging HTTPS.
- Ajouter politique d'expiration, rotation et révocation.
- Tester XSS/CSRF, fixation de session et droits admin.
- Vérifier qu'aucun token sensible n'est accessible au JavaScript.
- Retirer la surface de production si la recette sécurité échoue.

### WEB-02 - Waiting room kiosk

- Mettre en place création, rotation et révocation opérationnelles des identités kiosk.
- Tester token court, restriction à un centre et lecture seule.
- Vérifier qu'aucun nom complet ou donnée médicale inutile n'est affiché.
- Ajouter procédure de remplacement d'un kiosk compromis.
- Tester qu'aucune route d'écriture n'est accessible.

## 9. Données de santé et conformité

### COMP-01 - Dossier juridique et conformité

- Faire valider loi 09-08, consentement, finalités et base légale.
- Documenter droits d'accès, correction, suppression et opposition.
- Recenser sous-traitants, hébergement et transferts.
- Définir procédure de demande d'un utilisateur.
- Obtenir signatures produit et conformité.

### COMP-02 - Rétention, suppression et confidentialité

- Définir durées pour comptes, enfants, clinique, logs, audit, exports et sauvegardes.
- Implémenter purge automatique et purge sur changement de compte.
- Tester suppression logique/physique selon obligations.
- Vérifier minimisation des données sur chaque surface.
- Documenter les exceptions légales de conservation.

### COMP-03 - Chiffrement et secrets

- Vérifier chiffrement au repos DB, sauvegardes, exports et appareils.
- Vérifier TLS partout et HTTPS-only en release.
- Mettre les secrets dans un gestionnaire dédié.
- Documenter rotation, révocation et accès aux clés.
- Tester perte/rotation d'une clé selon procédure.

### COMP-04 - Revue de menace et pentest

- Réaliser une revue de menace couvrant mobile, API, web, kiosk et exploitation.
- Faire réaliser un test d'intrusion avant pilote réel.
- Corriger tous les constats critiques/élevés.
- Documenter les risques résiduels acceptés et responsables.

## 10. Infrastructure, sauvegarde et restauration

### OPS-01 - Environnements

- Séparer développement, test, staging et production.
- Utiliser secrets, bases, fournisseurs et identités distincts.
- Interdire les URL locales et secrets de test dans les releases.
- Définir promotion contrôlée entre environnements.

### OPS-02 - Sauvegardes et restauration

- Configurer sauvegardes chiffrées avec rétention validée.
- Tester restauration complète dans un environnement isolé.
- Mesurer et valider RPO/RTO.
- Tester restauration après migration défectueuse.
- Conserver un rapport signé du test.

### OPS-03 - Haute disponibilité et capacité

- Dimensionner PostgreSQL, API, workers, Redis et stockage.
- Tester charge sur OTP, réservation, file, vaccination et exports.
- Définir autoscaling ou capacité maximale.
- Tester indisponibilité d'un composant et reprise.

### OPS-04 - Incident et support

- Rédiger plan d'incident sécurité et données de santé.
- Définir contacts, astreinte, escalade et communication.
- Préparer procédures de révocation, maintenance et retour arrière.
- Organiser un exercice d'incident avant production.
- Définir support utilisateur et suivi des incidents.

## 11. CI/CD et qualité

### CI-01 - Pipeline obligatoire

- Ajouter lint et tests frontend React Native.
- Ajouter lint Kotlin/Android et tests ViewModel.
- Ajouter tests d'intégration et instrumentation Android.
- Construire les releases Android parent/staff avec signature contrôlée.
- Construire et tester iOS avec signature de distribution.
- Tester migrations depuis version précédente et restauration.
- Ajouter SAST, scan secrets, dépendances et conteneurs.
- Publier rapports, couverture et artefacts versionnés.

**Critère d'acceptation**

Une modification ne peut être livrée si un test, scan critique, migration ou build release
échoue.

### CI-02 - Stratégie de tests

- Définir pyramide de tests et seuil minimal de couverture utile.
- Ajouter tests de contrat API/mobile.
- Ajouter tests négatifs RBAC et périmètre centre.
- Ajouter tests concurrence/idempotence cliniques.
- Ajouter tests E2E des parcours critiques.
- Supprimer ou isoler les tests instables.

## 12. Identité, stores et releases

### REL-01 - Android parent

- Finaliser icône, splash, nom affiché, application ID et versionnement.
- Créer et sauvegarder le keystore release hors dépôt.
- Valider R8/Proguard et HTTPS-only.
- Générer AAB signé et l'installer via piste de test.
- Vérifier fiche store, politique confidentialité et captures finales.

### REL-02 - Android staff/admin

- Appliquer la décision une ou deux applications.
- Finaliser identité, icônes, splash, permissions et chaînes.
- Créer keystore release hors dépôt.
- Générer APK/AAB signé et tester distribution contrôlée.
- Vérifier qu'aucune chaîne ou fonction de démonstration ne reste.

### REL-03 - iOS parent

- Finaliser AppIcon, splash, nom, bundle ID et versionnement.
- Configurer équipe Apple, certificats et profils.
- Vérifier `PrivacyInfo.xcprivacy` et permissions réellement utilisées.
- Archiver et distribuer via TestFlight.
- Tester sur appareils iOS cibles.

### REL-04 - Discipline de release

- Définir versionnement, changelog et notes de release.
- Produire SBOM et conserver les artefacts.
- Définir procédure de rollback.
- Exiger validation produit, technique, sécurité et conformité.

## 13. Recette bout en bout obligatoire

### E2E-01 - Parent

1. Installer la release sur appareil physique.
2. Recevoir un OTP réel et se connecter.
3. Ajouter un enfant.
4. Réserver une session.
5. Consulter et suivre le rendez-vous.
6. Rejoindre la file le jour prévu.
7. Recevoir une notification réelle.
8. Consulter carnet et croissance.
9. Se déconnecter et vérifier révocation/purge.

### E2E-02 - Infirmier

1. Installer la release et se connecter.
2. Voir uniquement son centre et la session du jour.
3. Marquer le parent présent.
4. Appeler le prochain patient.
5. Scanner le QR autorisé.
6. Ouvrir ou sélectionner un flacon.
7. Enregistrer la vaccination une seule fois.
8. Vérifier dose, rendez-vous, carnet, stock et audit.
9. Redémarrer et confirmer la persistance.

### E2E-03 - Administrateur

1. Créer ou modifier centre, personnel et vaccin.
2. Planifier une session visible par le parent.
3. Gérer stock et consulter mouvements.
4. Consulter statistiques et audit.
5. Générer un export filtré et audité.
6. Désactiver les ressources selon règles métier.
7. Redémarrer et confirmer la persistance.

### E2E-04 - Résilience et sécurité

- Réseau lent, coupure, reprise et timeout fournisseur.
- Double tap, double requête et actions concurrentes.
- Session expirée, token révoqué et changement de compte.
- Tentatives d'accès autre parent/centre/rôle.
- Redémarrage API, worker, Redis et DB.
- Restauration sauvegarde.

## 14. Ordre recommandé d'exécution

### Lot 1 - Fermer les risques de pilote

- Valider les décisions `DEC-01` à `DEC-08`.
- Connecter SMS/FCM réels et supprimer les faux succès.
- Finaliser jours dédiés/sessions, stock et fonctions visibles restantes.
- Choisir et appliquer la stratégie offline.
- Finaliser audit critique et tests d'autorisation.

### Lot 2 - Recetter les trois applications

- Terminer les écarts parent.
- Terminer le workflow clinique infirmier.
- Terminer le périmètre admin choisi.
- Exécuter les scénarios E2E sur staging.

### Lot 3 - Rendre l'exploitation fiable

- Rate limit partagé, métriques, alertes et runbooks.
- Sauvegarde/restauration et tests de charge.
- CI/CD release, scans et artefacts.

### Lot 4 - Livrer les releases

- Finaliser identité et signatures.
- Installer les releases Android/iOS sur appareils physiques.
- Corriger accessibilité, RTL, performance et erreurs de recette.

### Lot 5 - Autoriser la production

- Finaliser conformité et pentest.
- Exécuter exercice incident et restauration.
- Faire signer le go/no-go.
- Déployer progressivement avec surveillance renforcée.

## 15. Tableau de pilotage

Utiliser ce tableau pour chaque lot. Ne jamais mettre `Terminé` sans lien vers une preuve.

| ID | Action | Priorité | Responsable | Statut | Preuve | Blocage |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-01 | Valider périmètre pilote | P0 | Produit | A faire |  |  |
| BE-02 | Fournisseurs SMS/push réels | P0 | Backend/DevOps | A faire |  |  |
| BE-03 | Audit externalisé | P0 | Sécurité/Backend | A faire |  |  |
| ADM-03 | Sessions et jours dédiés | P0 | Backend/Mobile | A faire |  |  |
| INF-04 | Vaccination E2E appareil | P0 | Mobile/Backend/QA | A faire |  |  |
| OPS-02 | Sauvegarde/restauration | P0 | DevOps | A faire |  |  |
| REL-01 | Release Android parent | P0 | Mobile/DevOps | A faire |  |  |
| REL-02 | Release Android staff | P0 | Mobile/DevOps | A faire |  |  |
| REL-03 | Release iOS parent | P0 | Mobile/DevOps | A faire |  |  |
| COMP-04 | Revue de menace et pentest | P0 | Sécurité | A faire |  |  |
| BE-01 | Rate limit partagé | P1 | Backend/DevOps | A faire |  |  |
| BE-04 | Observabilité et alertes | P1 | DevOps/Backend | A faire |  |  |
| CI-01 | Pipeline release complet | P1 | DevOps/QA | A faire |  |  |

## 16. Checklist finale go/no-go

Le projet peut être déclaré 100% livrable seulement si toutes les cases suivantes sont
cochées :

- [ ] Aucun compte, résultat clinique, rendez-vous, centre ou statistique n'est codé en dur.
- [ ] Chaque action visible attend une confirmation serveur avant d'afficher un succès.
- [ ] Les parcours parent, infirmier et admin passent sur appareils physiques.
- [ ] Les droits parent/rôle/centre sont testés positivement et négativement.
- [ ] OTP, SMS, email et push utilisent des fournisseurs réels avec suivi des erreurs.
- [ ] Aucun token ou dossier de santé n'est lisible en clair dans le stockage applicatif.
- [ ] Logout révoque la session et purge les données du compte.
- [ ] Vaccination, flacon, rendez-vous, stock et carnet sont atomiques et idempotents.
- [ ] Le choix offline est implémenté et testé, ou toute promesse offline est retirée.
- [ ] Les exports sont filtrés, protégés, expirables et audités.
- [ ] L'audit sensible est protégé, externalisé et consultable.
- [ ] Les migrations depuis la version déployée passent sans perte de données.
- [ ] Sauvegarde et restauration sont testées avec RPO/RTO validés.
- [ ] Logs, métriques, alertes et runbooks sont opérationnels.
- [ ] Les releases Android et iOS sont signées, HTTPS-only et installables.
- [ ] CI bloque une release en cas d'échec de test, scan, migration ou build.
- [ ] Accessibilité, FR/AR, RTL, réseau lent et reprise sont recettés.
- [ ] Le pentest ne contient aucun constat critique/élevé non corrigé.
- [ ] Le dossier conformité, rétention et incident est signé.
- [ ] Le go/no-go produit, technique, sécurité, QA et conformité est signé.

## 17. Définition du 100%

Le projet atteint 100% lorsque les trois applications et les surfaces web retenues sont
fonctionnelles avec des données réelles, sécurisées, recettées sur appareils physiques et
exploitables par une équipe capable de détecter, restaurer et traiter un incident.

Le pourcentage ne doit pas être augmenté pour une interface seulement dessinée ou une
fonction uniquement démontrable en local. Il augmente lorsqu'un parcours métier complet
est prouvé en staging puis validé pour la production.
