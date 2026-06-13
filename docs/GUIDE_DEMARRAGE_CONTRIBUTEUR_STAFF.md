# Guide contributeur - Lancer VacciniKids infirmier/admin

Ce guide permet a une contributrice de cloner le projet, demarrer le backend local et
installer l'application Android native infirmier/admin sur un emulateur ou un telephone.

L'application infirmier et l'application admin sont regroupees dans le meme APK Android :

- module Android : `app/`
- package installe : `ma.vaccinikids.staff`
- backend local : Node.js, PostgreSQL et Redis

## 1. Prerequis

Installer :

- Git ;
- Node.js 20 et npm ;
- Docker Desktop ;
- Android Studio avec Android SDK, Platform Tools et un JDK 17 ;
- sur macOS, Xcode n'est pas requis pour l'application staff Android.

Verifier les outils :

```bash
git --version
node --version
npm --version
docker --version
java -version
```

Sur macOS, ajouter `adb` au `PATH` :

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
adb version
```

Pour conserver ce réglage dans les prochains terminaux :

```bash
echo 'export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"' >> ~/.zshrc
source ~/.zshrc
```

## 2. Cloner le depot et creer une branche

```bash
git clone https://github.com/hajarhcm9/vaccinkids.git
cd vaccinkids
git switch main
git pull --ff-only
git switch -c prenom/ma-fonctionnalite
```

Ne pas développer directement sur `main`. Avant de commencer une nouvelle session :

```bash
git status
git pull --rebase origin main
```

## 3. Configurer le backend local

Creer le fichier local d'environnement :

```bash
cp .env.example .env
```

Pour le développement local, vérifier au minimum ces valeurs dans `.env` :

```dotenv
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5433
DB_NAME=vaccinikids
DB_USER=change-me-db-user
DB_PASSWORD=change-me-db-password

POSTGRES_USER=change-me-db-user
POSTGRES_PASSWORD=change-me-db-password
POSTGRES_DB=vaccinikids

REDIS_URL=redis://localhost:6379
RATE_LIMIT_REQUIRE_REDIS=false
```

Les valeurs `DB_USER`/`DB_PASSWORD` doivent correspondre a
`POSTGRES_USER`/`POSTGRES_PASSWORD`.

Demarrer Docker Desktop, puis PostgreSQL et Redis :

```bash
docker compose up -d postgres redis
docker compose ps
```

Installer les dépendances et préparer la base :

```bash
npm install
npm run migrate
npm run seed:dev
```

`seed:dev` crée uniquement les comptes de développement :

| Role | CIN | Mot de passe |
| --- | --- | --- |
| Admin | `ADMIN01` | `admin123` |
| Infirmier | `INFIRM01` | `infirmier123` |

## 4. Demarrer et verifier l'API

Dans un premier terminal :

```bash
npm run dev
```

Garder ce terminal ouvert. Dans un second terminal :

```bash
curl http://localhost:3000/health
```

La réponse doit contenir :

```json
{"status":"success","message":"VacciniKids API is running"}
```

Tester aussi le compte admin :

```bash
curl -X POST http://localhost:3000/api/auth/personnel/login \
  -H "Content-Type: application/json" \
  -d '{"cin":"ADMIN01","mot_de_passe":"admin123"}'
```

## 5. Lancer sur un emulateur Android

Creer et démarrer un appareil virtuel dans Android Studio :

1. Ouvrir **Tools > Device Manager**.
2. Creer un appareil virtuel avec une image Android recente.
3. Démarrer l'émulateur.

Verifier :

```bash
adb devices
```

Un appareil comme `emulator-5554` doit apparaitre avec l'état `device`.

L'émulateur Android accède au backend du Mac via `10.0.2.2`. Construire, installer et
ouvrir l'application :

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebug

adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p ma.vaccinikids.staff -c android.intent.category.LAUNCHER 1
```

## 6. Lancer sur un telephone Android physique

Le téléphone et l'ordinateur doivent utiliser le meme réseau Wi-Fi.

Sur le téléphone :

1. Activer les options développeur.
2. Activer le débogage USB ou le débogage sans fil.
3. Autoriser l'ordinateur lorsque Android affiche la confirmation.

Verifier la connexion :

```bash
adb devices -l
```

Le téléphone doit apparaitre avec l'état `device`, et non `unauthorized` ou `offline`.

Trouver l'adresse IP locale de l'ordinateur.

Sur macOS :

```bash
ipconfig getifaddr en0
```

Exemple de résultat : `192.168.1.4`.

Construire l'APK avec cette adresse, en conservant `/api` :

```bash
STAFF_API_BASE_URL=http://192.168.1.4:3000/api \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebug
```

Installer et ouvrir :

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p ma.vaccinikids.staff -c android.intent.category.LAUNCHER 1
```

Si le terminal n'est pas positionné à la racine du dépôt, utiliser le chemin absolu :

```bash
adb install -r /chemin/vers/vaccinkids/app/build/outputs/apk/debug/app-debug.apk
```

L'adresse IP Wi-Fi peut changer après un redémarrage ou un changement de réseau. Dans ce
cas, reconstruire l'APK avec la nouvelle valeur `STAFF_API_BASE_URL`.

## 7. Choisir l'interface

Au démarrage, l'application affiche le choix du parcours.

- Choisir **Admin** et utiliser `ADMIN01` / `admin123`.
- Choisir **Infirmier** et utiliser `INFIRM01` / `infirmier123`.

Le backend doit rester actif pendant l'utilisation de l'application.

## 8. Commandes quotidiennes

Demarrer l'environnement :

```bash
docker compose up -d postgres redis
npm run dev
```

Reconstruire et réinstaller l'application staff sur téléphone physique :

```bash
IP_MAC=$(ipconfig getifaddr en0)
STAFF_API_BASE_URL="http://$IP_MAC:3000/api" \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleDebug

adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p ma.vaccinikids.staff -c android.intent.category.LAUNCHER 1
```

Executer les tests staff :

```bash
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:testDebugUnitTest :app:lintDebug
```

Arreter l'environnement :

```bash
docker compose down
```

## 9. Depannage

### Docker daemon is not running

Ouvrir Docker Desktop, attendre son démarrage complet, puis :

```bash
docker compose up -d postgres redis
```

### `connect ECONNREFUSED 127.0.0.1:5433`

PostgreSQL n'est pas démarré ou son port ne correspond pas à `.env` :

```bash
docker compose ps
docker compose logs postgres
```

### `adb: command not found`

```bash
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"
```

### `adb: no devices/emulators found`

- démarrer un émulateur, ou connecter/autoriser le téléphone ;
- vérifier le débogage USB/sans fil ;
- relancer ADB :

```bash
adb kill-server
adb start-server
adb devices -l
```

### `failed to stat ... app-debug.apk`

Le terminal n'est pas à la racine du dépôt, ou l'APK n'a pas encore été construit :

```bash
pwd
ls app/build/outputs/apk/debug/app-debug.apk
```

Puis relancer `./gradlew :app:assembleDebug`.

### `No activities found to run`

L'application n'est pas installée. Exécuter d'abord :

```bash
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### L'application ne se connecte pas au backend

Verifier :

```bash
curl http://localhost:3000/health
adb devices -l
```

Pour un téléphone physique :

- utiliser l'IP Wi-Fi de l'ordinateur, jamais `10.0.2.2` ;
- vérifier que téléphone et ordinateur sont sur le meme réseau ;
- autoriser Node.js sur le pare-feu de l'ordinateur ;
- reconstruire l'APK après tout changement de `STAFF_API_BASE_URL`.

Pour un émulateur Android standard, utiliser `http://10.0.2.2:3000/api`.

## 10. Partager une contribution

Avant de pousser :

```bash
git status
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:testDebugUnitTest :app:lintDebug
git add <fichiers>
git commit -m "Description concise du changement"
git push -u origin prenom/ma-fonctionnalite
```

Créer ensuite une Pull Request vers `main` et attendre la réussite des workflows GitHub
`CI` et `Security`.

