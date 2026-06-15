# Etat strict du projet VacciniKids

**Date de reference :** 14 juin 2026  
**Branche auditee :** `main`  
**Commit audite :** `bacc5fc71a4b3f5cc96e22cdc8eeeecafad37222`  
**Auteur :** Badioui  
**Objet :** remplacement des identifiants techniques par des selecteurs nommes admin

## 1. Regle de classement

Dans ce rapport, une fonction est :

- **terminee** seulement si le code existe, les tests pertinents passent et le parcours a
  ete recette sur sa cible reelle ;
- **implementee non recetee** si le code et les tests techniques existent, mais pas la
  preuve sur appareil/staging ;
- **partielle** si une partie du parcours, de l'ergonomie ou de la couverture manque ;
- **bloquee externe** si elle exige infrastructure, fournisseurs, appareils, signature ou
  validation hors depot.

Le projet ne doit donc pas etre presente comme livre ou pret production a 100 %.

## 2. Revue du commit `bacc5fc`

### Conclusion

Le commit est coherent, compile et ameliore nettement l'ergonomie admin. Il ne contient
pas de regression bloquante detectee. Il reste toutefois incomplet pour une utilisation a
grande echelle et pour une recette stricte.

### Constats

#### Important - selecteurs incomplets au-dela de 100 centres

Les selecteurs de Personnel, Stocks, Statistiques, Exports et Sessions chargent uniquement
la premiere page avec `limit = 100`. Un centre au-dela du centieme ne peut donc pas etre
selectionne, sans message indiquant que la liste est tronquee.

Fichiers concernes :

- `GestionPersonnelFragment.kt`
- `GestionStocksActivity.kt`
- `StatsAdminActivity.kt`
- `ExportsAdminActivity.kt`
- `GestionSessionsFragment.kt`

Correction attendue : pagination complete, recherche distante, ou endpoint leger dedie aux
references actives.

#### Important - export possible avant chargement des centres

Le bouton de telechargement reste actif pendant le chargement ou l'echec du selecteur de
centres. Dans ce cas, l'export part sans filtre centre, donc sur tous les centres autorises,
alors que l'utilisateur peut croire que le filtre est encore en cours de chargement.

Correction attendue : desactiver l'export jusqu'au chargement des references, afficher
explicitement le perimetre choisi et exiger une selection consciente de "Tous les centres".

#### Mineur - formulaire personnel indisponible pendant la course de chargement

Personnel et centres sont charges en parallele. Si l'utilisateur touche Ajouter avant la
fin du chargement des centres, le formulaire ne s'ouvre pas et affiche "Aucun centre actif".

Correction attendue : etat de chargement distinct et bouton Ajouter desactive jusqu'a la
fin du chargement des references.

#### Couverture manquante

Le commit ne contient aucun test du mapping position du selecteur vers identifiant, du cas
liste vide, du chargement echoue ou du cas de plus de 100 centres.

## 3. Preuves executees le 14 juin 2026

| Verification | Resultat |
| --- | --- |
| Backend complet | **OK** - 31 suites, 436 tests reussis, 1 ignore |
| Lint backend et controles scripts/securite | **OK** |
| Android staff unitaires, lint et APK | **OK** |
| Android parent bundle et APK debug | **OK** |
| Migration version precedente vers derniere | **OK** |
| Repetabilite migrations et invariants DB | **OK** |
| Audit npm | **A suivre** - 1 vulnerabilite moderee transitive `joi` |
| Performance complete locale | **Instable** - seuil N+1 puis debit concurrent en echec |
| CI GitHub du commit | Backend, Android debug/release, iOS, instrumentation et Security **OK** |

Au premier passage, la suite performance a mesure un ratio liste sessions petit/grand de
`10.00`, pour un seuil strictement inferieur a `10`. Au second passage, ce controle a
reussi, mais le debit concurrent a mesure `18,7 req/s` pour un seuil superieur a `20`.
Cette variation confirme que les tests de performance locaux ne sont pas encore une preuve
stable et reproductible. La CI GitHub a reussi son passage sur une autre machine, ce qui
confirme aussi la sensibilite de ces seuils a l'environnement.

## 4. Etat strict par zone

| Zone | Code | Recette cible | Statut strict |
| --- | ---: | ---: | --- |
| Backend metier et securite applicative | 93 % | 70 % | Solide, production non validee |
| Mobile parent | 84 % | 55 % | Fonctionnel principal, qualite et E2E incomplets |
| Mobile infirmier | 88 % | 65 % | Parcours principal implemente, recette/UI incomplete |
| Mobile admin | 84 % | 60 % | CRUD reel, ergonomie/filtres/tests UI incomplets |
| Web admin et kiosk | 88 % | 60 % | Fondations securisees, staging/pentest a recetter |
| CI/CD et tests | 86 % | 75 % | Pipeline large, couverture UI mobile insuffisante |
| Conformite et exploitation | 45 % | 15 % | Documentation presente, validations externes absentes |

### Estimation globale

- **Code fonctionnel dans le depot : environ 86 %**
- **Projet demonstrable avec recette controlee : environ 78 %**
- **Projet livrable production sante : environ 63 %**
- **Travail restant avant production reelle : environ 37 %**

Ces pourcentages sont des estimations d'avancement, pas une preuve de conformite.

## 5. Ce qui est reellement termine

### Backend

- authentification parent et staff sans comptes runtime codes en dur ;
- RBAC et controles de perimetre centre couverts par tests backend ;
- reservations, file, vaccination, flacons et stock relies au serveur ;
- commandes cliniques critiques transactionnelles et idempotentes ;
- audit DB append-only et historique mouvements stock ;
- migrations jusqu'a `025`, test d'upgrade et verification des invariants ;
- web admin par session cookie/CSRF et kiosk limite en lecture ;
- pipeline de securite CodeQL, secrets et conteneur.

### Mobile parent

- tokens dans Keychain/Keystore et refresh centralise ;
- validation serveur au demarrage, logout serveur et purge ;
- enfants, sessions, RDV, file, carnet et notifications relies aux API ;
- absence de cache clinique persistant volontaire ;
- identite Android/iOS VacciniKids et builds CI.

### Mobile infirmier/admin

- login API et routage par role ;
- dashboard, RDV, file, QR, vaccination, flacons, stock et notifications relies aux API ;
- CRUD admin centres, personnel, vaccins et sessions ;
- statistiques, exports et audit relies aux API ;
- faux resultats runtime retires ;
- composants visuels et selecteurs nommes ameliores.

## 6. Ce qui est implemente mais pas encore prouve termine

- parcours complets parent, infirmier et admin apres relance sur appareil physique ;
- expiration de session et changement de compte sur appareil ;
- FR/AR et RTL sur tous les ecrans ;
- comportement reseau lent, coupure, reprise et reponse perdue ;
- captures bloquees dans les builds release reels ;
- notifications SMS/FCM/APNs avec fournisseurs staging reels ;
- exports filtres verifies avec volumes et perimetres reels ;
- iOS sur appareil physique et signature de distribution ;
- restauration d'une sauvegarde de production representative.

## 7. Travail code restant prioritaire

### P0 - avant de declarer le code final

1. Corriger les selecteurs admin limites a 100 centres.
2. Bloquer l'export tant que les references et le perimetre ne sont pas explicitement prets.
3. Stabiliser ou corriger le test performance sessions/N+1.
4. Ajouter des tests UI staff qui ouvrent et utilisent les parcours, pas seulement le nom
   du package.
5. Ajouter des tests React Native parent pour auth, reservation, file, logout et erreurs.
6. Executer et consigner la matrice `A TESTER` sur appareil connecte.
7. Corriger chaque bouton, debordement et retour navigation trouve pendant cette recette.

### P1 - qualite necessaire a une vraie livraison

1. Remplacer les formulaires admin `AlertDialog` et vues dynamiques par composants
   Material coherents avec validation inline.
2. Ajouter recherche, filtres et pagination aux listes admin/staff.
3. Finaliser statistiques admin avec graphiques et filtres periode.
4. Finaliser accessibilite, contraste, tailles dynamiques et RTL.
5. Ajouter E2E automatises multi-role contre un backend de staging.
6. Resoudre la vulnerabilite npm moderee transitive apres test de regression.
7. Mettre a jour les avertissements Gradle/dependances avant incompatibilite future.

## 8. Blocages externes avant production

- staging et production HTTPS separes avec secrets reels ;
- Redis, PostgreSQL, sauvegardes et observabilite exploites reellement ;
- fournisseurs SMS, email, FCM et APNs configures et mesures ;
- audit externalise append-only ;
- test charge, panne, restauration et incident signes ;
- pentest externe et retest ;
- validation loi 09-08/CNDP, retention, sous-traitants et transferts ;
- keystores/certificats officiels et recette Android/iOS physique ;
- go/no-go produit, QA, technique, securite et conformite.

## 9. Verdict

Le projet est une base fonctionnelle serieuse et largement connectee au backend. Il est
assez avance pour poursuivre une recette de demonstration structuree. Il n'est cependant
ni "100 % code complete" au sens strict, ni pret pour une livraison de donnees de sante en
production.

La prochaine sequence rationnelle est :

1. corriger les trois constats du commit `bacc5fc` ;
2. ajouter les tests UI mobiles manquants ;
3. recetter chaque interface sur appareil et fermer la matrice ;
4. seulement ensuite figer un candidat de livraison.
