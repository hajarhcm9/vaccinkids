# Probleme connu - URL API incorrecte sur appareil physique

**Date observee :** 14 juin 2026  
**Date resolue :** 19 juin 2026  
**Application concernee :** Android staff/admin/infirmier  
**Statut :** Resolu

## Symptome initial

Apres reconstruction et installation de l'APK debug sur un telephone physique, la
connexion staff echouait apres environ 30 secondes avec :

```text
failed to connect to /10.0.2.2 (port 3000) from /192.168.1.2 (...) after 30000ms
```

## Cause

`app/build.gradle.kts` utilisait `http://10.0.2.2:3000/api/` comme valeur debug par
defaut. Cette adresse fonctionne uniquement depuis un emulateur Android.

## Resolution implementee

Deux variantes de build distinctes ont ete introduites dans `app/build.gradle.kts` :

| Variante | URL par defaut | Utilisation |
| --- | --- | --- |
| `debugEmulator` | `http://10.0.2.2:3000/api/` | Emulateur Android uniquement |
| `debugDevice` | Exige `STAFF_API_BASE_URL` | Telephone physique ; echec de build si absent |

La variante `debugDevice` refuse de compiler si `STAFF_API_BASE_URL` n'est pas definie,
ce qui elimine le risque silencieux d'installer un APK telephone avec l'adresse emulateur.

Un ecran de diagnostic (`ApiDiagnosticsActivity`) affiche `BuildConfig.API_BASE_URL` et
`BuildConfig.BUILD_TYPE` en mode debug, accessible depuis l'ecran de bienvenue.

Des messages d'erreur reseau comprehensibles ont ete ajoutes dans `BaseLoginActivity` :
- `error_network_unreachable` — quand le serveur est injoignable
- `error_network_timeout` — quand la connexion expire

## Utilisation correcte

Voir la section 5-6 de `GUIDE_DEMARRAGE_CONTRIBUTEUR_STAFF.md` pour les commandes
de build et d'installation.

```bash
# Emulateur
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew :app:assembleDebugEmulator

# Telephone physique
IP_MAC=$(ipconfig getifaddr en0)
STAFF_API_BASE_URL="http://$IP_MAC:3000/api" \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebugDevice
```

## Critere de cloture (atteint)

Un contributeur peut construire et installer l'application sur emulateur ou telephone
physique avec une commande explicite, sans risque silencieux d'utiliser la mauvaise URL.
