# Semaine 2 — VacciniKids (Hajar)
## Enregistrement vaccination + Gestion flacons + Gestion présences

---

## 📁 Fichiers à créer dans votre projet

### Kotlin (dans app/src/main/java/com/example/vaccinkid/)
| Fichier | Description |
|---|---|
| EnregistrementVaccinationFragment.kt | Formulaire vaccination (vaccin, lot, fabricant, poids, taille, réactions) |
| GestionFlaconsFragment.kt | Suivi flacons ouverts + ouverture normale/forcée (Scénario B) |
| GestionPresencesFragment.kt | Pointage présences + chronomètre délai de grâce 15 min |

### XML layouts (dans app/src/main/res/layout/)
| Fichier | Description |
|---|---|
| fragment_enregistrement_vaccination.xml | Layout formulaire vaccination |
| fragment_gestion_flacons.xml | Layout liste flacons |
| fragment_gestion_presences.xml | Layout liste RDV + chronomètre |
| item_flacon.xml | Item de liste pour un flacon |
| item_rdv_presence.xml | Item de liste pour un RDV |
| dialog_ouvrir_flacon.xml | Dialog ouverture flacon (normale ou forcée) |

---

## 🌿 Branche Git à créer

```bash
# Depuis votre branche actuelle (feature/hajar/scan-qr)
git checkout develop
git pull origin develop
git checkout -b feature/hajar/semaine2-vaccination
```

## 📝 Commits suggérés

```bash
git add EnregistrementVaccinationFragment.kt
git commit -m "feat(vaccination): add enregistrement vaccination form with confirmation"

git add GestionFlaconsFragment.kt
git commit -m "feat(flacons): add flacon tracking with forced opening scenario B"

git add GestionPresencesFragment.kt
git commit -m "feat(presences): add presence management with 15min grace timer"

git add res/layout/
git commit -m "feat(ui): add semaine2 layouts - vaccination, flacons, presences"
```

---

## 🔗 Intégration dans MainInfirmierActivity

Ajoutez les navigations dans votre BottomNav ou Dashboard :

```kotlin
// Dans DashboardFragment ou dans MainInfirmierActivity
// Navigation vers les 3 nouveaux écrans :

// 1. Depuis liste RDV → Enregistrement vaccination
val fragment = EnregistrementVaccinationFragment.newInstance(
    nomBebe = "Mohammed A.",
    idBebe = "RDV001"
)
supportFragmentManager.beginTransaction()
    .replace(R.id.fragmentContainer, fragment)
    .addToBackStack(null)
    .commit()

// 2. Gestion flacons
loadFragment(GestionFlaconsFragment())

// 3. Gestion présences
loadFragment(GestionPresencesFragment())
```

---

## ✅ Logique métier implémentée

### EnregistrementVaccinationFragment
- Sélection vaccin via Spinner
- Saisie numéro de lot + fabricant
- Saisie poids + taille du bébé à la visite
- Réactions standardisées via Chips (multi-sélection)
- Champ libre pour autres réactions
- Validation des champs obligatoires
- Dialog de confirmation avant soumission
- TODO : remplacer Toast final par appel API Retrofit

### GestionFlaconsFragment
- Liste des flacons ouverts avec barre de progression
- Indicateur couleur gaspillage (vert / orange / rouge)
- Bouton "Dose utilisée" et "Dose gaspillée" par flacon
- Ouverture normale : vérifie le seuil minimum d'enfants
- Ouverture forcée (Scénario B) : justification textuelle obligatoire
- TODO : remplacer données mock par API

### GestionPresencesFragment
- Liste RDV du jour avec statut (En attente / Présent / Absent)
- Bouton "Présent" → marque immédiatement
- Bouton "Absent" → confirmation obligatoire + notification API
- Bouton "💉 Vacciner" → visible après marquage Présent → ouvre EnregistrementVaccinationFragment
- Chronomètre 15 min (délai de grâce) avec alerte à 2 min restantes
- Marquage absent automatique à l'expiration du délai
- TODO : connecter notifications à l'API Asmae

---

## 🎨 Design
Même palette que Semaine 1 :
- Orange principal : #F5A623
- Fond : #FFF8F0
- Vert succès : #4CAF50
- Rouge danger : #F44336