# Plan de finalisation pour demonstration et livraison

**Date de reference :** 13 juin 2026  
**Perimetre :** backend, mobile parent, mobile infirmier/admin, web admin et kiosk

## 1. Regles du chantier

- Une fonction n'est consideree terminee que si elle fonctionne contre le backend et
  persiste apres relance.
- Aucun succes ne doit etre affiche avant confirmation serveur.
- Les protections de securite restent actives en release.
- Les captures sont autorisees uniquement dans les builds debug pour faciliter la recette.
- Chaque correction fonctionnelle doit recevoir un test automatise ou un cas de recette.
- Les faux parcours, donnees cliniques codees en dur et boutons sans effet sont interdits.

## 2. Etat actuel verifie

| Zone | Etat | Observation |
| --- | --- | --- |
| Backend | Solide | Suite backend et invariants transactionnels deja etendus |
| CI/securite | Verte | Workflows CI et Security verts sur le dernier commit audite |
| Parent Android | Executable | Installe et ouvert sur Samsung physique avec API locale et Metro |
| Staff Android | Executable | APK infirmier/admin installe sur Samsung physique |
| Captures debug | Verifie sur appareil | Parent et staff capturables en debug, toujours bloques en release |
| Navigation infirmier | Corrige | Les onglets ne remplissent plus inutilement le back stack |
| Tests UI mobiles | Insuffisant | Instrumentation actuelle ne couvre pas les parcours |
| Design staff/admin | A ameliorer | Plusieurs ecrans sont construits dynamiquement avec composants basiques |

## 3. Inventaire des parcours

### Parent

1. Connexion telephone et OTP.
2. Ajout d'un enfant.
3. Accueil et resume du prochain rendez-vous.
4. Liste et recherche des sessions.
5. Detail session, reservation, liste d'attente et annulation.
6. Rendez-vous.
7. File d'attente.
8. Carnet de sante.
9. Notifications.
10. Profil, langue et logout.

### Infirmier

1. Choix du role et connexion.
2. Dashboard centre.
3. Sessions et rendez-vous.
4. Presence, absence et ouverture du parcours vaccination.
5. File d'attente.
6. Scan QR et carnet autorise.
7. Vaccination.
8. Flacons.
9. Croissance.
10. Notifications staff et logout.

### Admin

1. Connexion admin et dashboard.
2. Personnel.
3. Centres.
4. Vaccins.
5. Sessions.
6. Stock et mouvements.
7. Statistiques.
8. Exports.
9. Audit log.

## 4. Matrice de recette fonctionnelle

Statuts autorises :

- `AUTO OK` : couvert par test automatise existant ;
- `MANUEL OK` : teste sur appareil ou navigateur ;
- `A TESTER` : recette requise ;
- `BLOQUE` : dependance ou bug connu.

### Authentification et roles

| ID | Partie | Test | Resultat attendu | Statut |
| --- | --- | --- | --- | --- |
| AUTH-01 | Parent | Demander OTP valide | OTP cree, reponse controlee | AUTO OK |
| AUTH-02 | Parent | Verifier OTP valide | Session parent creee | AUTO OK |
| AUTH-03 | Parent | OTP invalide/expire | Refus clair, aucun login | AUTO OK |
| AUTH-04 | Parent | Relancer app avec session | Identite validee serveur | A TESTER |
| AUTH-05 | Parent | Logout | Session revoquee, caches purges | AUTO OK |
| AUTH-06 | Staff | Login admin | Dashboard admin uniquement | MANUEL OK |
| AUTH-07 | Staff | Login infirmier | Dashboard centre uniquement | MANUEL OK |
| AUTH-08 | Staff | Mauvais mot de passe | Refus, aucun token conserve | AUTO OK |
| AUTH-09 | Staff | Role croise | Admin/infirmier ne voit pas l'autre parcours | A TESTER |
| AUTH-10 | Tous | Session expiree | Retour login sans faux succes | A TESTER |

### Mobile parent

| ID | Partie | Test | Resultat attendu | Statut |
| --- | --- | --- | --- | --- |
| PAR-01 | Enfant | Ajouter enfant valide | Enfant persiste apres relance | A TESTER |
| PAR-02 | Enfant | Donnees invalides/doublon | Erreur metier affichee | A TESTER |
| PAR-03 | Accueil | Charger resume | Donnees du compte uniquement | A TESTER |
| PAR-04 | Sessions | Rechercher/filtrer | Liste serveur correctement filtree | A TESTER |
| PAR-05 | Reservation | Reserver place disponible | RDV cree et visible staff | AUTO OK |
| PAR-06 | Reservation | Double soumission | Aucun doublon | AUTO OK |
| PAR-07 | Reservation | Session pleine | Liste d'attente ou refus metier | AUTO OK |
| PAR-08 | RDV | Annuler RDV autorise | Statut persiste | AUTO OK |
| PAR-09 | File | Rejoindre/quitter | Position serveur coherente | AUTO OK |
| PAR-10 | Carnet | Consulter un enfant | Aucune donnee d'un autre compte | AUTO OK |
| PAR-11 | Notifications | Lire/tout lire | Compteur et etat serveur mis a jour | AUTO OK |
| PAR-12 | Langue | Basculer FR/AR | Navigation et textes coherent RTL | A TESTER |

### Mobile infirmier

| ID | Partie | Test | Resultat attendu | Statut |
| --- | --- | --- | --- | --- |
| INF-01 | Dashboard | Charger/rafraichir | Centre et sessions autorises uniquement | A TESTER |
| INF-02 | Navigation | Changer plusieurs onglets puis Retour | Aucun historique d'onglets obsolete | CORRIGE |
| INF-03 | RDV | Filtrer par session/statut | Liste correcte | A TESTER |
| INF-04 | RDV | Marquer present | Statut serveur persiste | AUTO OK |
| INF-05 | RDV | Marquer absent | Statut serveur persiste | AUTO OK |
| INF-06 | File | Appeler prochain patient | Un seul infirmier obtient le patient | AUTO OK |
| INF-07 | File | Terminer service | Etat serveur mis a jour | AUTO OK |
| INF-08 | QR | QR invalide/autre centre | Acces refuse et audite | AUTO OK |
| INF-09 | Vaccination | Scenario complet | Dose, RDV, carnet, stock et audit atomiques | AUTO OK |
| INF-10 | Vaccination | Double clic | Aucun double enregistrement | AUTO OK |
| INF-11 | Flacon | Ouvrir/gaspiller/fermer | Capacite et stock coherents | AUTO OK |
| INF-12 | Croissance | Acces selon decision pilote | Aucune ecriture interdite | A TESTER |
| INF-13 | Notifications | Lire/tout lire | Notifications staff uniquement | AUTO OK |
| INF-14 | Logout | Deconnexion | Token et donnees locales purges | AUTO OK |

### Mobile admin

| ID | Partie | Test | Resultat attendu | Statut |
| --- | --- | --- | --- | --- |
| ADM-01 | Dashboard | Charger KPIs | Aucun chiffre code en dur | A TESTER |
| ADM-02 | Personnel | Ajouter/modifier/desactiver | Persiste apres relance | AUTO OK |
| ADM-03 | Centres | Ajouter/modifier/desactiver | Persiste et respecte les regles | AUTO OK |
| ADM-04 | Vaccins | Ajouter/modifier/desactiver | Persiste et impact controle | AUTO OK |
| ADM-05 | Sessions | Creer/confirmer/demarrer/terminer/annuler | Transitions autorisees uniquement | AUTO OK |
| ADM-06 | Stock | Upsert et ajuster | Quantite et mouvement audites | AUTO OK |
| ADM-07 | Statistiques | Filtrer centre/periode | Valeurs coherentes avec backend | A TESTER |
| ADM-08 | Exports | Filtrer et telecharger | Fichier autorise et audite | AUTO OK |
| ADM-09 | Audit | Filtrer et paginer | Journal lecture seule | AUTO OK |
| ADM-10 | Navigation | Ouvrir chaque module puis Retour | Retour coherent sans ecran perdu | A TESTER |

### Web, securite et resilience

| ID | Partie | Test | Resultat attendu | Statut |
| --- | --- | --- | --- | --- |
| WEB-01 | Admin web | Login/refresh/logout | Cookies proteges, session revoquee | AUTO OK |
| WEB-02 | Admin web | XSS/CSRF | Requetes malveillantes refusees | AUTO OK |
| WEB-03 | Kiosk | Lire file du centre | Lecture seule d'un centre | AUTO OK |
| SEC-01 | Debug | Capture ecran parent et staff | Autorisee pour la recette | MANUEL OK |
| SEC-02 | Release | Capture ecran | Toujours bloquee | A TESTER |
| NET-01 | Tous | API indisponible | Erreur et reprise sans faux succes | A TESTER |
| NET-02 | Tous | Reponse perdue/double soumission | Commande critique idempotente | BLOQUE |

## 5. Bugs et risques prioritaires

### P0 avant demonstration

1. Executer les cas `A TESTER` critiques sur appareil : auth, reservation, presence,
   vaccination, stock et logout.
2. Corriger tout bouton sans effet ou erreur de navigation trouve pendant la recette.
3. Verifier que chaque message de succes arrive apres la reponse serveur.
4. Ajouter des donnees de demonstration coherentes et non sensibles.
5. Tester une relance complete des deux applications apres chaque scenario.

### P1 avant livraison

1. Ajouter des tests UI Android parent et staff.
2. Ajouter l'idempotence backend reelle aux commandes critiques.
3. Finaliser statistiques admin et ergonomie des filtres.
4. Remplacer les vues staff/admin dynamiques les plus basiques par des layouts coherents.
5. Finaliser accessibilite, textes FR/AR et RTL.
6. Recetter les builds release avec captures bloquees.

## 6. Direction design

### Staff/infirmier

- conserver une navigation basse stable ;
- utiliser un en-tete centre/session clair ;
- afficher chargement, erreur, vide et reprise dans chaque ecran ;
- remplacer les longues listes de boutons par actions contextuelles ;
- utiliser des statuts visuels coherents pour RDV, file, session et flacon.

### Admin

- dashboard dense avec KPIs lisibles ;
- formulaires valides avant soumission ;
- filtres centre/date reutilisables ;
- listes avec actions modifier/desactiver explicites ;
- statistiques avec graphiques API et etats vides.

## 7. Definition de termine

Le projet est pret pour demonstration lorsque :

1. tous les cas P0 sont `MANUEL OK` ou `AUTO OK` ;
2. aucun bouton visible n'est sans effet ;
3. chaque mutation visible persiste apres relance ;
4. les trois roles ne voient que leur perimetre ;
5. les builds debug sont testables et les builds release conservent leurs protections ;
6. les workflows CI et Security sont verts ;
7. les bugs restants sont documentes avec severite et contournement.
