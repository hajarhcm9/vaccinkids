# Audit strict d'integration des specifications XML Staff

**Date :** 15 juin 2026  
**Perimetre :** application Android native staff/admin  
**Source :** les 12 fichiers de `/Users/macos/Downloads/VaccinKids-XML`

## Conclusion

Les specifications n'ont pas ete integrees integralement. Ce sont des descriptions
pseudo-XML d'une application React Native/Expo, pas des layouts Android compilables.
Leur integration exige une traduction vers Activities, Fragments, layouts Android et
composants Material, tout en remplacant leurs donnees mock par les API reelles.

Les ecrans Dashboard, RDV et Scan reprennent une partie du langage visuel. L'accueil et
le login sont en cours de traduction. Navigation, Attente, Plus et Vaccination restent
nettement incomplets par rapport aux specifications.

## Matrice stricte

| Specification | Etat Android reel | Integration estimee | Ecarts principaux |
| --- | --- | ---: | --- |
| `00_DesignSystem.xml` | Couleurs et quelques styles Material presents | 60 % | Inter absent, rayons/espacements non centralises, composants dynamiques anciens |
| `01_SharedComponents.xml` | KPI, badges et cartes partiels | 25 % | Avatar, TabBar 5 onglets, Dropdown, RadioGroup non factorises |
| `02_DataTypes.xml` | DTO backend reels differents des mocks | N/A | Les mocks doivent volontairement rester absents du runtime |
| `03_Navigation.xml` | Auth + 5 onglets Android | 65 % | Pas de vrai onboarding, Scan non central, Vaccination non modale |
| `04_Screen_Onboarding.xml` | Accueil statique en cours de redesign | 20 % | Pas de 4 slides, dots, progression ni persistance premier lancement |
| `05_Screen_Login.xml` | Formulaire serveur et role visuel partiels | 60 % | Deux Activities, pas de biometrie, souvenir, oubli de mot de passe |
| `06_Screen_Dashboard.xml` | KPI/actions/sessions API reels | 60 % | Pas de profil/centre, bandeau sessions, prochain RDV, activite recente |
| `07_Screen_RDV.xml` | Recherche, filtres comptes, cartes/actions reelles | 75 % | Pas d'avatar/date/filtre avance; composition adaptee au workflow clinique |
| `08_Screen_Scan.xml` | Ecran sombre + scanner et API reels | 50 % | Scanner externe, pas de torche ni carte enfant integree |
| `09_Screen_Attente.xml` | Tabs, cartes Material et commandes backend reelles | 70 % | Pas d'heure d'arrivee ni haptique; recette concurrence requise |
| `10_Screen_Plus.xml` | Profil API, outils disponibles, version et logout serveur | 65 % | Statistiques mensuelles et outils non connectes volontairement absents |
| `11_Screen_Vaccination.xml` | Commande clinique reelle, formulaire minimal | 20 % | Pas de stepper, recapitulatif, layout Material ou validation par etape |

## Regles d'integration

- Ne jamais copier les patients, statistiques, lots ou rendez-vous mock.
- Ne jamais reprendre les simulations de login, scan ou vaccination.
- Conserver les API, DTO, controles RBAC et confirmations serveur.
- Adapter la composition visuelle lorsque le workflow clinique reel l'exige.
- Marquer un ecran integre seulement apres build, lint, tests et recette appareil.

## Ordre de correction

1. Vaccination avec stepper autour de la commande atomique existante.
2. Dashboard complet : profil, centre, bandeau, prochain RDV et activite.
3. Scan avec resultat integre et navigation vers un RDV eligible.
4. Onboarding reel au premier lancement et login unifie.
5. Factorisation des composants partages et finition accessibilite.
