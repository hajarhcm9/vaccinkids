# Release Android parent

La release parent n'accepte plus le keystore debug et active R8.

```bash
export MOBILE_ENV=production
export API_BASE_URL=https://api.example.ma/api
export ANDROID_RELEASE_STORE_FILE=/chemin/hors-git/vaccinikids-parent.jks
export ANDROID_RELEASE_STORE_PASSWORD=...
export ANDROID_RELEASE_KEY_ALIAS=...
export ANDROID_RELEASE_KEY_PASSWORD=...
npm run mobile:configure
JAVA_HOME=$(/usr/libexec/java_home -v 17) ./android/gradlew -p android app:bundleRelease
```

Sauvegarder la clé hors Git dans au moins deux emplacements contrôlés. Les identifiants
L'identité de publication est `ma.vaccinikids.parent` et le nom affiché est `VacciniKids`.
