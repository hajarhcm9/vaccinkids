# Probleme connu - URL API incorrecte sur appareil physique

**Date observee :** 14 juin 2026  
**Application concernee :** Android staff/admin/infirmier  
**Statut :** Corrige dans le code, recette appareil a maintenir

## Symptome

Apres reconstruction et installation de l'APK debug sur un telephone physique, la
connexion staff echoue apres environ 30 secondes avec :

```text
failed to connect to /10.0.2.2 (port 3000) from /192.168.1.2 (...) after 30000ms
```

## Cause

`app/build.gradle.kts` utilise `http://10.0.2.2:3000/api/` comme valeur debug par
defaut. Cette adresse fonctionne uniquement depuis un emulateur Android.

Lorsqu'un APK est reconstruit sans definir `STAFF_API_BASE_URL`, il remplace l'APK
precedemment configure pour le telephone physique. Le telephone tente alors de
contacter `10.0.2.2` au lieu de l'adresse LAN du Mac.

## Impact

- Login Admin et Infirmier impossible sur appareil physique.
- Timeout de 30 secondes donnant l'impression que l'application est bloquee.
- Recette visuelle et fonctionnelle interrompue.
- Risque de faux diagnostic backend ou reseau.

## Reproduction

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew :app:assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

L'APK genere utilise alors l'adresse debug par defaut `10.0.2.2`.

## Contournement actuel

Pour un telephone physique connecte au meme Wi-Fi que le Mac :

```bash
MAC_IP=$(ipconfig getifaddr en0)
STAFF_API_BASE_URL="http://$MAC_IP:3000/api" \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebug

adb install -r app/build/outputs/apk/debug/app-debug.apk
```

Verifier egalement que le backend ecoute sur le reseau local et que le telephone
peut joindre le Mac.

## Correction durable implementee

- Variantes explicites `debugEmulator` et `debugDevice`.
- `debugDevice` echoue immediatement si `STAFF_API_BASE_URL` est absente.
- Ecran diagnostic disponible par appui long sur l'acces Infirmier dans un build debug.
- L'ecran diagnostic affiche la variante et l'URL API actives.

## Commandes valides

Emulateur :

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./gradlew :app:assembleDebugEmulator
```

Telephone physique :

```bash
STAFF_API_BASE_URL="http://$(ipconfig getifaddr en0):3000/api" \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebugDevice

adb install -r app/build/outputs/apk/debugDevice/app-debugDevice.apk
```

## Actions restantes

- Ajouter une commande projet courte, par exemple `npm run staff:device`.
- Afficher l'URL cible dans les erreurs reseau debug.
- Ajouter les variantes a la CI Android.
- Maintenir ce scenario dans la recette contributeur.

## Critere de cloture

Un contributeur peut construire et installer l'application sur emulateur ou telephone
physique avec une commande explicite, sans risque silencieux d'utiliser la mauvaise URL.
