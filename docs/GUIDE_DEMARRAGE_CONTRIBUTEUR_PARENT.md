# Guide contributeur - Lancer l'application mobile parent

Ce guide explique comment lancer l'application React Native destinée aux parents sur un
émulateur Android ou un téléphone Android physique.

- code React Native : `App.js`, `src/`
- projet Android parent : `android/`
- package Android : `ma.vaccinikids.parent`
- serveur JavaScript de développement : Metro, port `8081`
- API locale : Node.js, port `3000`

L'application parent est différente de l'application native infirmier/admin située dans
le module `app/`.

## 1. Prérequis

Installer :

- Git ;
- Node.js 20 et npm ;
- Docker Desktop ;
- Android Studio, Android SDK, Platform Tools et JDK 17.

Sur macOS, ajouter `adb` au `PATH` :

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

Vérifier :

```bash
node --version
npm --version
docker --version
adb version
JAVA_HOME=$(/usr/libexec/java_home -v 17) java -version
```

Configurer le chemin Android SDK local. Sur macOS :

```bash
printf 'sdk.dir=%s/Library/Android/sdk\n' "$HOME" > android/local.properties
```

Ce fichier est local à chaque machine et ne doit pas être partagé dans Git.

## 2. Cloner et préparer le projet

```bash
git clone https://github.com/hajarhcm9/vaccinkids.git
cd vaccinkids
git switch main
git pull --ff-only
git switch -c prenom/ma-fonctionnalite
npm install
```

Créer la configuration backend :

```bash
cp .env.example .env
```

Dans `.env`, faire correspondre les identifiants PostgreSQL et conserver le port `5433` :

```dotenv
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5433
DB_NAME=vaccinikids
DB_USER=change-me-db-user
DB_PASSWORD=change-me-db-password
POSTGRES_USER=change-me-db-user
POSTGRES_PASSWORD=change-me-db-password
POSTGRES_DB=vaccinikids
REDIS_URL=redis://localhost:6379
```

Préparer la base :

```bash
docker compose up -d postgres redis
npm run migrate
npm run seed:dev
```

## 3. Démarrer le backend

Dans un premier terminal, à la racine du dépôt :

```bash
npm run dev
```

Conserver ce terminal ouvert. Vérifier dans un autre terminal :

```bash
curl http://localhost:3000/health
```

## 4. Lancer sur un téléphone Android physique

Le téléphone et l'ordinateur doivent être sur le même réseau Wi-Fi.

Sur le téléphone :

1. Activer les options développeur.
2. Activer le débogage USB ou sans fil.
3. Autoriser l'ordinateur.

Vérifier la connexion :

```bash
adb devices -l
```

Le téléphone doit apparaître avec l'état `device`.

Trouver l'adresse IP Wi-Fi du Mac :

```bash
ipconfig getifaddr en0
```

Configurer l'application parent avec cette adresse :

```bash
IP_MAC=$(ipconfig getifaddr en0)
MOBILE_ENV=development \
API_BASE_URL="http://$IP_MAC:3000/api" \
npm run mobile:configure
```

Dans un deuxième terminal, démarrer Metro :

```bash
npm run mobile:start
```

Conserver Metro ouvert. Dans un troisième terminal, créer le tunnel Metro, construire,
installer et ouvrir l'application :

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb reverse tcp:8081 tcp:8081

JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./android/gradlew -p android app:installDebug -PreactNativeArchitectures=arm64-v8a

adb shell monkey -p ma.vaccinikids.parent -c android.intent.category.LAUNCHER 1
```

L'API utilise l'adresse Wi-Fi configurée. Metro utilise le tunnel ADB `8081`.

Après un changement de réseau, régénérer la configuration avec la nouvelle IP puis
reconstruire l'application.

## 5. Lancer sur un émulateur Android

Démarrer un appareil virtuel depuis Android Studio, puis vérifier :

```bash
adb devices
```

L'émulateur Android standard accède au backend de l'ordinateur via `10.0.2.2` :

```bash
MOBILE_ENV=development \
API_BASE_URL=http://10.0.2.2:3000/api \
npm run mobile:configure
```

Démarrer Metro dans un terminal :

```bash
npm run mobile:start
```

Puis installer et ouvrir dans un autre terminal :

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
npm run mobile:android
```

## 6. Utiliser l'application parent en développement

Le parcours parent utilise une authentification OTP.

En environnement de développement, l'envoi SMS utilise le fournisseur stub si aucun
fournisseur réel n'est configuré. L'API retourne alors `devOtp` uniquement en développement.
Pour récupérer un code de test :

```bash
curl -X POST http://localhost:3000/api/auth/parent/send-otp \
  -H "Content-Type: application/json" \
  -d '{"telephone":"+212600000001"}'
```

Utiliser la valeur `data.devOtp` retournée dans l'écran de vérification. Ne jamais activer
ce comportement en staging ou production, ni l'utiliser avec des données réelles.

Pour utiliser l'application :

1. saisir un numéro parent ;
2. demander le code OTP ;
3. vérifier le code ;
4. ajouter ou consulter les enfants ;
5. consulter les sessions et rendez-vous.

Backend et Metro doivent rester ouverts pendant l'utilisation du build debug.

## 7. Redémarrage quotidien rapide

Terminal 1 :

```bash
docker compose up -d postgres redis
npm run dev
```

Terminal 2 :

```bash
npm run mobile:start
```

Terminal 3 :

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb reverse tcp:8081 tcp:8081
adb shell monkey -p ma.vaccinikids.parent -c android.intent.category.LAUNCHER 1
```

Une reconstruction n'est nécessaire que si les dépendances natives ou la configuration
API changent. Pour les changements JavaScript, Metro recharge l'application.

## 8. Dépannage

### Ecran rouge ou impossible de charger le bundle JavaScript

Metro n'est pas accessible :

```bash
npm run mobile:start
adb reverse tcp:8081 tcp:8081
```

Puis fermer et rouvrir l'application.

### `adb: no devices/emulators found`

```bash
adb kill-server
adb start-server
adb devices -l
```

Autoriser ensuite l'ordinateur sur le téléphone.

### L'application ne contacte pas l'API

Vérifier :

```bash
curl http://localhost:3000/health
ipconfig getifaddr en0
```

Pour un téléphone physique, reconstruire après avoir injecté l'IP Wi-Fi du Mac :

```bash
IP_MAC=$(ipconfig getifaddr en0)
MOBILE_ENV=development API_BASE_URL="http://$IP_MAC:3000/api" npm run mobile:configure
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./android/gradlew -p android app:installDebug -PreactNativeArchitectures=arm64-v8a
```

Pour un émulateur Android standard, utiliser `http://10.0.2.2:3000/api`.

### `connect ECONNREFUSED 127.0.0.1:5433`

```bash
docker compose up -d postgres redis
docker compose ps
```

### Nettoyer un build Android bloqué

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./android/gradlew -p android clean
```

Puis reconstruire.

## 9. Lancer une version réellement distribuable

Le build debug décrit ci-dessus est réel sur appareil, mais dépend de Metro et d'une API
locale. Une version de recette ou production doit utiliser :

- une API HTTPS accessible publiquement ;
- un fournisseur OTP réel ;
- FCM configuré ;
- un keystore release conservé hors Git ;
- une configuration `MOBILE_ENV=staging` ou `production`.

Exemple de build release signé :

```bash
export MOBILE_ENV=production
export API_BASE_URL=https://api.example.ma/api
export ANDROID_RELEASE_STORE_FILE=/chemin/hors-git/vaccinikids-parent.jks
export ANDROID_RELEASE_STORE_PASSWORD=...
export ANDROID_RELEASE_KEY_ALIAS=...
export ANDROID_RELEASE_KEY_PASSWORD=...

npm run mobile:configure
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./android/gradlew -p android app:bundleRelease
```

Le fichier AAB est généré dans :

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Ne jamais partager le keystore ou ses mots de passe dans Git, une discussion ou un ticket.

## 10. Partager une contribution

Avant de pousser :

```bash
git status
npm run lint
npm test -- --runInBand
git add <fichiers>
git commit -m "Description concise du changement"
git push -u origin prenom/ma-fonctionnalite
```

Créer une Pull Request vers `main` et attendre les workflows `CI` et `Security`.
