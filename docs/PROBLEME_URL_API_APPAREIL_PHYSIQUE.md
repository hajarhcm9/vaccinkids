# Probleme connu - URL API incorrecte sur appareil physique

**Date observee :** 14 juin 2026  
**Application concernee :** Android staff/admin/infirmier  
**Statut :** A corriger durablement

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

## Correction durable a faire

- Ajouter des variantes explicites `debugEmulator` et `debugDevice`, ou une
  configuration d'environnement versionnee sans secret.
- Afficher l'URL API active dans un ecran diagnostic disponible uniquement en debug.
- Faire echouer la commande de build appareil si `STAFF_API_BASE_URL` est absente.
- Ajouter une commande projet unique, par exemple `npm run staff:device`.
- Reduire le timeout de connexion debug et afficher une erreur indiquant l'URL cible.
- Ajouter ce scenario a la recette contributeur et a la CI de build debug.

## Critere de cloture

Un contributeur peut construire et installer l'application sur emulateur ou telephone
physique avec une commande explicite, sans risque silencieux d'utiliser la mauvaise URL.
