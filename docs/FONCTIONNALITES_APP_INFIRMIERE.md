# Application Mobile Infirmier — Fonctionnalités complètes

**Projet :** VacciniKids  
**Plateforme :** Android natif (Kotlin)  
**Date :** 17 juin 2026  
**Source :** code source audité + spécifications design

---

## Vue d'ensemble

L'application mobile infirmier est une application Android native dédiée au personnel soignant
(infirmier, médecin) affecté à un centre de vaccination pédiatrique. Elle couvre l'ensemble du
flux clinique journalier : connexion sécurisée, consultation du planning, scan du carnet de
santé, gestion de la file d'attente, enregistrement de la vaccination, gestion des flacons de
vaccins, suivi de la croissance et notifications.

### Architecture de navigation

```
WelcomeActivity  (onboarding premier lancement)
    └── LoginInfirmierActivity
            └── MainInfirmierActivity  (barre de navigation bas — 5 onglets)
                    ├── [Accueil]   DashboardFragment
                    ├── [RDV]       RdvFragment
                    ├── [Scan]      ScanQrFragment
                    ├── [Attente]   QueueFragment
                    └── [Plus]      StaffMoreFragment
```

Navigation secondaire (empilée sur le back-stack depuis n'importe quel onglet) :

```
EnfantProfilFragment        ← depuis Scan QR ou liste RDV
    ├── EnregistrementVaccinationFragment
    │       └── VaccinationSuccessFragment
    └── GrowthChartFragment

GestionFlaconsFragment      ← depuis liste RDV (session active)
StatistiquesSessionFragment ← depuis liste RDV (session en cours)
StaffNotificationsFragment  ← depuis Dashboard ou onglet Plus
RechercheManuelleFragment   ← depuis Scan QR (saisie manuelle)
```

---

## 1. Écran de bienvenue (WelcomeActivity)

### Description
Écran d'accueil affiché au premier lancement. Présente la marque et oriente vers la connexion.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Présentation de la marque | Logo, nom « VaccinKids STAFF », illustration infirmière/enfant |
| Pagination (4 slides) | Points de progression animés |
| Bouton Commencer | Navigue vers l'écran de connexion |
| Lien En savoir plus | Informations complémentaires sur l'application |

### Scénarios
- **Premier lancement :** l'écran s'affiche, l'infirmier fait défiler les 4 slides et appuie sur « Commencer ».
- **Lancement ultérieur :** si une session valide existe déjà (token valide), l'application saute
  directement vers le dashboard infirmier.

---

## 2. Connexion (LoginInfirmierActivity)

### Description
Formulaire de connexion sécurisé avec sélecteur de rôle Infirmier / Admin.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Sélecteur de rôle | Onglet Infirmier / Onglet Admin (même formulaire, destination différente) |
| Champ identifiant | Email ou numéro de téléphone |
| Champ mot de passe | Affichage/masquage via icône œil |
| Case « Se souvenir de moi » | Persistance de session |
| Lien « Mot de passe oublié » | (UI présente, flux à compléter) |
| Bouton biométrique | Empreinte digitale via `react-native-keychain` (masqué si non disponible) |
| Bouton Se connecter | Appel API `/auth/login`, routage par rôle |

### Scénarios
- **Connexion infirmier réussie :** token JWT stocké dans Keystore Android, redirection vers
  `MainInfirmierActivity`, validation `/auth/me` au démarrage.
- **Connexion admin réussie :** redirection vers `AdminActivity`.
- **Mauvais identifiants :** message d'erreur serveur affiché sous le formulaire.
- **Compte infirmier sans centre affecté :** session refusée, message « Compte infirmier sans
  centre autorisé », retour à la connexion.
- **Session expirée (relance de l'app) :** `validateSession()` dans `MainInfirmierActivity`
  appelle `/auth/me` ; si invalide, tokens supprimés et retour connexion.
- **Biométrie disponible :** bouton empreinte visible ; si absente, bouton caché (pas grisé).

---

## 3. Dashboard (DashboardFragment)

### Description
Vue opérationnelle journalière. Agrège les KPIs de la journée, le nombre de sessions actives,
le prochain rendez-vous et un accès rapide au scanner QR.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Profil infirmier | Nom de l'infirmier connecté (API `/auth/me`) |
| Nom du centre | Récupéré depuis la première session du jour |
| Date du jour | Formatée automatiquement en français |
| KPI : RDV confirmés | Nombre de rendez-vous confirmés pour la journée |
| KPI : Vaccinés | Nombre de présents/vaccinés |
| KPI : En attente | Nombre de patients en attente |
| KPI : Absents | Nombre d'absents déclarés |
| Compteur de sessions | Nombre de sessions actives aujourd'hui |
| Prochain RDV | Heure, nom de l'enfant, nom du parent, type de vaccin |
| Bouton Scanner QR | Raccourci vers l'onglet Scan |
| Raccourci notifications | Icône cloche en-tête → `StaffNotificationsFragment` |
| Pull-to-refresh | Recharge KPIs + sessions simultanément |

### Scénarios
- **Ouverture normale :** les KPIs et sessions se chargent en parallèle, la barre de
  rafraîchissement tourne pendant les deux requêtes.
- **Aucune session aujourd'hui :** compteur affiché à 0, champ « Prochain RDV » vide.
- **Erreur réseau KPIs :** les compteurs affichent « - », le message d'erreur apparaît.
- **Erreur réseau sessions :** compteur sessions à 0, aucun prochain RDV.
- **Tap sur la carte Prochain RDV :** navigation vers l'onglet RDV.
- **Tap sur Scanner QR :** navigation directe vers l'onglet Scan.
- **Pull-to-refresh :** les deux appels repartent, l'indicateur se cache quand les deux sont finis.

---

## 4. Liste des rendez-vous (RdvFragment)

### Description
Écran central de gestion des sessions et des rendez-vous du jour. Permet de sélectionner une
session, filtrer/rechercher les patients, gérer les statuts des RDV, démarrer/clôturer une
session, ouvrir les flacons et consulter les statistiques.

### Fonctionnalités

#### Gestion des sessions
| Fonctionnalité | Détail |
|---|---|
| Sélecteur de session | Spinner : nom vaccin - heure - statut - nb inscrits/max |
| Démarrer une session | Bouton visible si statut = CONFIRMEE |
| Clôturer une session | Bouton visible si statut = EN_COURS |
| Accès à la file d'attente | Bouton visible dès qu'une session est sélectionnée |
| Accès aux flacons | Bouton visible si statut = CONFIRMEE ou EN_COURS |
| Accès aux statistiques | Bouton visible si statut = EN_COURS |

#### Gestion des rendez-vous
| Fonctionnalité | Détail |
|---|---|
| Liste des RDV | Chaque carte : nom enfant, heure, vaccin, nom parent + téléphone, statut |
| Recherche textuelle | Filtre en temps réel sur prénom/nom enfant, parent, téléphone, vaccin |
| Filtres par statut | Chips : Tous / En attente / Confirmés / Présents / Absents (avec comptes) |
| Marquer présent | Bouton visible si transition autorisée (EN_ATTENTE ou CONFIRME → PRESENT) |
| Marquer absent | Bouton visible si transition autorisée (EN_ATTENTE ou CONFIRME → ABSENT) |
| Vacciner | Bouton visible si statut = PRESENT ou CONFIRME → ouvre `EnregistrementVaccinationFragment` |
| Courbe de croissance | Bouton visible si statut = PRESENT ou CONFIRME → ouvre `EnfantProfilFragment` |
| Pull-to-refresh | Recharge sessions puis RDV de la session sélectionnée |

### Scénarios
- **Chargement initial :** sessions chargées, spinner alimenté, premier élément sélectionné
  automatiquement, RDV correspondants chargés, boutons d'action contextuels affichés.
- **Aucune session aujourd'hui :** message « Aucune session aujourd'hui. », liste vide,
  tous les boutons d'action masqués.
- **Session CONFIRMEE sélectionnée :** boutons Démarrer + Flacons visibles, Clôturer et
  Stats masqués.
- **Session EN_COURS sélectionnée :** boutons Clôturer + Flacons + Stats visibles, Démarrer
  masqué.
- **Démarrer session :** appel API `startSession(id)`, rechargement de la liste, boutons
  mis à jour.
- **Clôturer session :** appel API `endSession(id)`, rechargement.
- **Transition de statut interdite :** la politique `RdvTransitionPolicy` bloque l'action,
  message d'erreur affiché, aucun appel réseau émis.
- **Erreur API mise à jour statut :** message d'erreur, boutons réactivés, liste inchangée.
- **Recherche :** filtrage instantané dès la saisie, compteur dans le message mis à jour.
- **Filtre chips :** combine avec la recherche textuelle.
- **Action déjà en vol (actionInFlight) :** tous les boutons désactivés pendant la requête,
  réactivés à la fin.

---

## 5. Scanner QR (ScanQrFragment)

### Description
Écran de scan du QR code du carnet de santé de l'enfant. Deux modes : caméra ou saisie manuelle.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Ouverture caméra | Demande de permission, lancement du scanner ZXing |
| Scan QR code | Format QR uniquement, orientation verrouillée, bip de confirmation |
| Torche | Activation/désactivation de la lampe torche |
| Validation format | Regex `^VK1\.[a-f0-9]{64}$` (format versionné VacciniKids) |
| Extraction depuis URL | Support des QR contenant une URL avec paramètre `?code=` ou `?qr=` |
| Appel API `/qr/:code` | Récupère bébé + RDV éligibles + historique vaccinations |
| Navigation profil | Succès → `EnfantProfilFragment` |
| Saisie manuelle | Bouton « Saisie manuelle » → `RechercheManuelleFragment` |
| État de chargement | Boutons désactivés et libellé « Recherche du carnet... » |

### Scénarios
- **Permission caméra accordée :** scanner lancé directement.
- **Permission caméra refusée :** toast « Permission caméra refusée », pas de scan.
- **Scan annulé (retour) :** toast « Scan annulé », retour à l'écran.
- **QR valide, enfant trouvé :** API retourne bébé + RDV éligibles + historique →
  navigation vers `EnfantProfilFragment`.
- **QR invalide ou expiré :** toast « QR invalide ou expiré », pas d'appel API.
- **QR valide mais enfant non trouvé côté serveur :** toast avec message API
  (ex: « Carnet introuvable »).
- **Erreur réseau :** toast « Connexion requise. Recherche impossible : ... ».
- **QR contenant une URL :** extraction automatique du paramètre `code` ou `qr` ou du
  dernier segment de chemin.
- **Refus serveur (hors centre ou hors session) :** le backend retourne une erreur métier,
  le toast affiche le message reçu. Chaque refus est audité côté serveur.

---

## 6. Saisie manuelle (RechercheManuelleFragment)

### Description
Recherche alternative par code QR saisi au clavier (cas où le QR est illisible ou absent).

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Champ de saisie | Accepte le code brut ou une URL complète |
| Extraction depuis URL | Même logique que `ScanQrFragment` |
| Validation format | Même regex `^VK1\.[a-f0-9]{64}$` avant tout appel |
| Appel API | `/qr/:code` identique au scan caméra |
| Carte résultat | Nom + âge de l'enfant, bouton « Ouvrir le profil » |
| Navigation profil | Bouton Ouvrir → `EnfantProfilFragment` |

### Scénarios
- **Champ vide, validation :** message « Veuillez saisir un code. » en rouge.
- **Format invalide :** message « Code invalide. Format attendu : VK1.abc123... » en rouge,
  pas d'appel réseau.
- **Code valide, enfant trouvé :** carte résultat affichée avec nom et âge, bouton Ouvrir actif.
- **Code valide, enfant non trouvé :** message d'erreur API en rouge, carte masquée.
- **Erreur réseau :** message « Erreur réseau : ... » en rouge.
- **Saisie d'une URL complète :** extraction automatique du code, même flux que ci-dessus.

---

## 7. Profil enfant (EnfantProfilFragment)

### Description
Fiche complète de l'enfant après identification. Contient l'identité, les coordonnées du
parent, les RDV éligibles du jour et l'historique des vaccinations.

### Fonctionnalités

#### Identité de l'enfant
| Fonctionnalité | Détail |
|---|---|
| Initiales avatar | Générées depuis prénom + nom, max 2 caractères |
| Nom complet | Prénom + Nom |
| Âge calculé | Calculé dynamiquement depuis la date de naissance (années + mois) |
| Badge genre | Garçon (bleu) / Fille (vert) / Masqué si non renseigné |

#### Contact parent
| Fonctionnalité | Détail |
|---|---|
| Nom du parent | Résolu depuis les données bébé ou le premier RDV |
| Téléphone | Affiché ou « — » si absent |
| Bouton Appeler | Lance l'appel téléphonique natif Android (`Intent.ACTION_DIAL`) |
| Bouton SMS | Lance la rédaction d'un SMS natif (`Intent.ACTION_VIEW sms:`) |

#### RDV éligibles du jour
| Fonctionnalité | Détail |
|---|---|
| Liste des RDV | Vaccin, heure, badge de statut (Confirmé / En attente / autre) |
| Bouton Vacciner | Ouvre `EnregistrementVaccinationFragment` si session valide |
| Bouton Présent | Marque le RDV comme présent via API `PATCH /rdv/:id` |
| Bouton Absent | Marque le RDV comme absent via API `PATCH /rdv/:id` |
| Absent de RDV | Message « Aucun RDV éligible » si liste vide |

#### Historique vaccinations
| Fonctionnalité | Détail |
|---|---|
| Liste historique | Nom vaccin, date formatée, nom infirmier, poids si disponible |
| Vide | Message « Aucun antécédent » si liste vide |

#### Navigation
| Fonctionnalité | Détail |
|---|---|
| Bouton Courbe de croissance | Ouvre `GrowthChartFragment` |
| Bouton retour | `popBackStack()` |

### Scénarios
- **Arrivée depuis scan QR :** toutes les données passées en arguments depuis la réponse API,
  pas de second appel réseau.
- **Arrivée depuis liste RDV (newInstanceFromRdv) :** données partielles (date de naissance et
  sexe non disponibles), historique vide, RDV transmis avec le seul RDV concerné.
- **Pas de téléphone parent :** boutons Appeler et SMS affichent un toast « Numéro non disponible ».
- **Session nulle sur bouton Vacciner :** toast « Aucune session active pour ce RDV », pas de
  navigation.
- **Mise à jour statut Présent/Absent :** appel API, toast de confirmation ou d'erreur.
- **Genre non renseigné :** badge genre masqué (`View.GONE`).

---

## 8. Enregistrement vaccination (EnregistrementVaccinationFragment)

### Description
Formulaire d'enregistrement d'un acte de vaccination. Lié à un RDV et une session précis.
L'enregistrement est atomique, idempotent et transactionnel côté serveur.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Entête patient | Nom du bébé affiché en titre |
| Sélecteur de flacon | Spinner alimenté par les flacons de la session (API `GET /sessions/:id/flacons`) |
| Filtre flacons vides | Seuls les flacons avec `dosesRestantes > 0` sont proposés |
| Champ Poids | Valeur numérique obligatoire (> 0) |
| Champ Taille | Valeur numérique obligatoire (> 0) |
| Champ Réactions | Texte libre optionnel (observations) |
| Bouton Enregistrer | Désactivé si flacons non chargés, si déjà soumis ou si chargement en cours |
| Protection double-submit | Flag `submitted` empêche toute soumission en double |
| Headers idempotency | `X-Request-ID` et `X-Idempotency-Key` sur la requête Android |
| Succès | Navigation vers `VaccinationSuccessFragment` avec nom enfant + label flacon |
| Erreur | Message d'erreur affiché, bouton réactivé, `submitted` remis à false |

### Scénarios
- **Chargement flacons réussi :** spinner alimenté, bouton activé.
- **Aucun flacon disponible (vides ou absents) :** bouton désactivé, message « Impossible de
  charger les vaccins. » ou liste filtrée vide.
- **Chargement flacons échoué (réseau) :** bouton désactivé, message d'erreur.
- **RDV ou session invalide (id ≤ 0) :** bouton désactivé immédiatement, message « Action
  restreinte aux RDV de session. »
- **Poids ou taille manquant/invalide :** message « Poids et taille invalides. », pas d'appel API.
- **Soumission en cours :** bouton texte passe à « Enregistrement... », désactivé.
- **Succès API :** flag `submitted = true`, bouton désactivé définitivement, navigation vers
  `VaccinationSuccessFragment`.
- **Erreur API :** flag `submitted = false`, bouton réactivé, message d'erreur serveur affiché.
- **Retour arrière :** `popBackStack()`.

---

## 9. Confirmation vaccination (VaccinationSuccessFragment)

### Description
Écran de succès affiché après un enregistrement de vaccination confirmé par le serveur.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Nom du patient | Affiché en titre |
| Label du flacon utilisé | Numéro de lot + fabricant |
| Date et heure | Horodatage au moment de l'affichage |
| Bouton Retour tableau de bord | Vide le back-stack entier, retour à `DashboardFragment` |
| Bouton Scanner suivant | Vide le back-stack, ouvre `ScanQrFragment` pour le patient suivant |

### Scénarios
- **Fin de journée :** l'infirmier appuie sur « Retour tableau de bord ».
- **Patient suivant immédiat :** l'infirmier appuie sur « Scanner suivant » → retour à l'écran
  de scan sans repasser par le profil précédent.

---

## 10. File d'attente (QueueFragment)

### Description
Gestion de la salle d'attente du centre. L'infirmier appelle les patients un par un et marque
la fin de service.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Onglet En attente | Liste triée par position, statut EN_ATTENTE, avec compteur |
| Onglet Appelés | Liste triée par position, statut EN_COURS, avec compteur |
| Carte patient | Numéro d'attente, nom enfant, téléphone parent, badge statut |
| Bouton Appeler le prochain | Appel API `POST /queue/call-next` avec `centre_id` |
| Bouton Fin de service | Visible uniquement dans l'onglet Appelés, appel API `POST /queue/complete/:id` |
| Verrou concurrent | `actionInFlight` empêche deux actions simultanées |
| Pull-to-refresh | Recharge la file complète |
| Gestion absence de centre | Message « Aucun centre affecté à ce compte. » si `centreId` nul |

### Scénarios
- **File chargée, onglet En attente :** liste affichée avec numéros de position, bouton
  « Appeler le prochain » actif.
- **File vide (onglet En attente) :** message « File vide », bouton désactivé.
- **Appel du prochain réussi :** snackbar « Patient appelé et confirmé par le serveur »,
  rechargement de la file, patient passe dans l'onglet Appelés.
- **Appel du prochain — file vide côté serveur :** erreur retournée par l'API, message affiché.
- **Fin de service réussie :** snackbar « Service terminé et confirmé par le serveur »,
  rechargement.
- **Erreur réseau (call-next ou complete) :** message d'erreur affiché, `actionInFlight`
  remis à false.
- **Concurrence multi-infirmiers :** le verrou SQL côté serveur garantit qu'un seul
  `call-next` aboutit ; le second reçoit une erreur métier et l'affiche.
- **Aucun centre affecté :** liste vide avec message spécifique, bouton Appeler désactivé.
- **Pull-to-refresh :** recharge la file, indicateur visible pendant le chargement.

---

## 11. Gestion des flacons (GestionFlaconsFragment)

### Description
Gestion des flacons de vaccin pour la session sélectionnée. Accessible depuis la liste des
RDV quand la session est CONFIRMEE ou EN_COURS.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| En-tête session | Label de la session affichée en titre |
| Champ Numéro de lot | Obligatoire pour ouvrir un flacon |
| Champ Fabricant | Obligatoire pour ouvrir un flacon |
| Bouton Ouvrir un flacon | Appel API `POST /flacons` avec sessionId + vaccinId + lot + fabricant |
| Liste des flacons | Lot, fabricant, statut (Ouvert/Fermé), doses utilisées / gaspillées / restantes |
| Barre d'accentuation | Teal si ouvert, grisée si fermé |
| Bouton Gaspillage | Visible si flacon ouvert ET doses restantes > 0 → `POST /flacons/:id/waste` |
| Bouton Fermer le flacon | Visible si flacon ouvert ET doses restantes = 0 → `POST /flacons/:id/close` |
| Rechargement auto | Après chaque action, la liste est rechargée depuis l'API |
| Protection session invalide | Si sessionId ou vaccinId ≤ 0, bouton Ouvrir désactivé |

### Scénarios
- **Flacon ouvert avec succès :** toast « Flacon ouvert », champs effacés, liste rechargée.
- **Champs lot ou fabricant vides :** message « Numéro de lot et fabricant sont obligatoires. »,
  pas d'appel API.
- **Ouverture refusée par l'API :** message d'erreur API affiché.
- **Flacon ouvert avec doses restantes :** bouton Gaspillage actif, Fermer désactivé.
- **Flacon ouvert avec 0 doses restantes :** bouton Gaspillage désactivé, Fermer actif.
- **Flacon fermé :** les deux boutons désactivés (alpha 0.4), barre grisée.
- **Gaspillage enregistré :** toast « Gaspillage enregistré », liste rechargée (doses
  gaspillées+1, restantes-1).
- **Fermeture enregistrée :** toast « Flacon fermé », liste rechargée (statut Fermé).
- **Opération sur flacon fermé (refus serveur) :** la migration backend interdit toute
  opération ; message d'erreur affiché.
- **Erreur réseau :** message d'erreur, état chargement remis.

---

## 12. Courbe de croissance (GrowthChartFragment)

### Description
Graphique linéaire de la croissance pédiatrique de l'enfant. Lecture seule pour l'infirmier.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Sélecteur de mesure | 3 onglets : Poids (kg) / Taille (cm) / IMC |
| Graphique interactif | MPAndroidChart : pinch-zoom, touch enabled, mode Cubic Bezier |
| Valeur courante | Dernière mesure disponible affichée en gros |
| Date de la dernière mesure | Affiché sous la valeur courante |
| Couleur par mesure | Poids : teal `#0F766E` / Taille : bleu `#0EA5E9` / IMC : lavande `#7B5EA7` |
| Données serveur | API `GET /bebes/:id/croissance`, triées par `ageSemaines` |
| Axe X | Âge en mois (semaines / 4) |
| Pas de cache local | Aucune donnée clinique stockée en local (décision pilote) |

### Scénarios
- **Données disponibles :** graphique tracé, valeur courante affichée, changement d'onglet
  redessine le graphique avec la bonne couleur.
- **Mesures partielles :** seul l'onglet avec données trace une courbe, les autres affichent
  un graphique vide.
- **Aucune mesure :** graphique vide, valeur affichée « -- kg/cm ».
- **Enfant id ≤ 0 :** aucun appel API, graphique non chargé.
- **Erreur réseau :** message « Erreur réseau » dans le graphique via `setNoDataText`.
- **Calcul IMC :** calculé côté client depuis poids et taille disponibles ; si l'un est nul,
  le point est exclu.

---

## 13. Notifications (StaffNotificationsFragment)

### Description
Flux chronologique des notifications serveur de l'infirmier (rappels vaccins, alertes stock,
messages système).

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Liste des notifications | Chargée depuis API `GET /notifications` |
| Badge non lue | Carte en pleine opacité (1.0) si non lue, atténuée (0.6) si lue |
| Icône contextuelle | Syringe pour vaccin, cloche pour stock, cloche teal pour les autres |
| Couleur de fond icône | Bleu ciel vaccin, ambre stock, teal générique |
| Tap sur notification | Marque comme lue via API `PATCH /notifications/:id/read`, recharge |
| Bouton Marquer tout comme lu | Appel API `POST /notifications/read-all`, recharge |
| Protection double-chargement | `loading` flag empêche les appels parallèles |

### Scénarios
- **Ouverture :** liste chargée, notifications non lues en pleine opacité en haut.
- **Tap sur notification non lue :** passage en lue (alpha 0.6), rechargement.
- **Tap sur notification déjà lue :** aucun appel API (`estLue == true` court-circuité).
- **Marquer tout comme lu :** toutes les cartes passent en alpha 0.6.
- **Erreur réseau (silencieuse) :** les blocs `catch` sont silencieux ; la liste conserve
  son état précédent.
- **Liste vide :** liste RecyclerView vide, aucun message d'état (comportement à améliorer
  — identifié dans les P1).

---

## 14. Onglet Plus / Profil (StaffMoreFragment)

### Description
Écran de paramètres et profil de l'infirmier. Accès aux notifications, au stock et à la
déconnexion.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Nom de l'infirmier | API `/auth/me`, format Prénom Nom |
| Rôle affiché | Infirmier(ère) / Médecin / Administrateur selon le rôle API |
| Nom du centre | Récupéré depuis la première session du jour (ou `Centre #id` en fallback) |
| Raccourci Notifications | Lien vers `StaffNotificationsFragment` |
| Raccourci Stock | Ouvre `GestionStocksActivity` (lecture seule infirmier) |
| Déconnexion | Dialogue de confirmation, appel serveur logout, purge tokens, retour connexion |

### Scénarios
- **Chargement profil réussi :** nom, rôle et centre affichés.
- **Erreur API profil :** message d'erreur affiché, champs restent vides.
- **Centre non trouvé dans les sessions :** fallback sur `Centre #id` ou « Aucun centre affecté ».
- **Déconnexion confirmée :** appel API logout, `TokenManager.clearTokens()`, flag sync purgé,
  `Intent.FLAG_ACTIVITY_CLEAR_TASK` vers `LoginInfirmierActivity`.
- **Déconnexion annulée :** dialogue fermé, aucune action.

---

## 15. Consultation du stock (GestionStocksActivity)

### Description
Consultation en lecture seule de l'état des stocks du centre. Accessible depuis l'onglet Plus.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| Liste des stocks | Vaccin, quantité disponible, seuil d'alerte |
| Indicateur stock faible | Badge rouge si quantité ≤ seuil |
| Lecture seule | Les entrées/sorties de stock sont réservées aux administrateurs |
| Sélecteur de centre | Le stock est filtré par le centre de l'infirmier connecté |

### Scénarios
- **Stock normal :** liste affichée sans alerte.
- **Stock faible :** badge rouge / alerte visible pour les vaccins sous le seuil.
- **Erreur réseau :** message d'erreur affiché.

---

## 16. Statistiques de session (StatistiquesSessionFragment)

### Description
Statistiques de la session en cours. Accessible depuis la liste des RDV quand la session est
EN_COURS.

### Fonctionnalités
| Fonctionnalité | Détail |
|---|---|
| KPIs de session | Vaccinés, présents, absents, en attente pour la session sélectionnée |
| Contexte session | Label de la session affiché |

### Scénarios
- **Session active :** chiffres chargés depuis l'API.
- **Erreur réseau :** message d'erreur, chiffres non affichés.

---

## Règles transversales de sécurité

| Règle | Détail |
|---|---|
| Protection captures d'écran | `WindowManager.LayoutParams.FLAG_SECURE` sur `MainInfirmierActivity` |
| Tokens dans Keystore Android | Jamais en `SharedPreferences` en clair |
| Validation session au démarrage | `GET /auth/me` au démarrage, logout forcé si invalide ou rôle erroné |
| Headers idempotency | `X-Request-ID` + `X-Idempotency-Key` sur toutes les mutations infirmier |
| Pas de log du body HTTP | Désactivé en debug pour éviter les données cliniques dans Logcat |
| Pas de cache clinique local | Pas de Room, pas de SyncWorker, pas de données bébé persistées localement |
| Purge à la déconnexion | Tokens supprimés, flags sync effacés, back-stack vidé |
| QR versionné | Format `VK1.[64 hex chars]` validé avant tout appel réseau |
| Scan refusé audité | Chaque QR refusé (hors centre, hors session) est tracé côté serveur |
| Accès carnet conditionné | Le backend refuse la lecture carnet si aucun RDV éligible ce jour |

---

## Matrice des flux principaux

```
Connexion réussie
    │
    ├─ Dashboard
    │   └─ Voir KPIs, sessions, prochain RDV
    │
    ├─ RDV (session sélectionnée)
    │   ├─ Rechercher / filtrer un patient
    │   ├─ Marquer présent / absent
    │   ├─ [PRESENT] → Vacciner
    │   │       └─ Enregistrement vaccination → Succès
    │   ├─ [PRESENT] → Courbe croissance → Profil enfant
    │   ├─ Démarrer / Clôturer session
    │   ├─ Ouvrir flacons → Gestion flacons
    │   │       ├─ Ouvrir flacon (lot + fabricant)
    │   │       ├─ Enregistrer gaspillage
    │   │       └─ Fermer flacon
    │   └─ Statistiques session
    │
    ├─ Scan QR
    │   ├─ Scanner code → Profil enfant
    │   │       ├─ Appeler parent (téléphone)
    │   │       ├─ Envoyer SMS parent
    │   │       ├─ Marquer présent / absent
    │   │       ├─ Vacciner → Enregistrement → Succès
    │   │       └─ Courbe de croissance
    │   └─ Saisie manuelle code → Profil enfant (même flux)
    │
    ├─ File d'attente
    │   ├─ Appeler le prochain patient
    │   └─ Terminer le service d'un patient appelé
    │
    └─ Plus
        ├─ Voir profil (nom, rôle, centre)
        ├─ Notifications
        │       ├─ Lire une notification
        │       └─ Marquer tout comme lu
        ├─ Consulter le stock (lecture seule)
        └─ Se déconnecter
```

---

## État d'implémentation par interface

| Interface | Code | Recette appareil | Statut |
|---|:---:|:---:|---|
| Connexion | 90 % | Non | Serveur réel, pas de biométrie |
| Dashboard | 85 % | Non | KPIs API réels, centre partiel |
| Liste RDV | 90 % | Non | Complet, transitions strictes |
| Scan QR | 85 % | Non | Format sécurisé, torche absente |
| Saisie manuelle | 95 % | Non | Complète |
| Profil enfant | 90 % | Non | Complet |
| Enregistrement vaccination | 95 % | Non | Atomique + idempotent |
| Succès vaccination | 100 % | Non | Complet |
| File d'attente | 90 % | Non | Verrou SQL, test multi-appareils requis |
| Flacons | 95 % | Non | Complet |
| Courbe de croissance | 85 % | Non | Pas de bandes percentiles |
| Notifications | 75 % | Non | Chargement, lecture, tout-lire |
| Onglet Plus / Profil | 85 % | Non | Complet sauf options futures |
| Stock (lecture seule) | 70 % | Non | Lecture, alertes |
| Stats session | 60 % | Non | KPIs basiques |
| Onboarding | 20 % | Non | Statique, pas de 4 slides animés |

**Global code mobile infirmier : 88 % — Recette complète sur appareil physique requise.**
