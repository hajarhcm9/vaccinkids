# Release Android personnel

La release personnel désactive les sauvegardes, active R8, refuse le trafic HTTP et exige
une URL API HTTPS :

```bash
STAFF_API_BASE_URL=https://api.example.ma/api/ \
JAVA_HOME=$(/usr/libexec/java_home -v 17) \
./gradlew :app:assembleRelease
```

Installer et tester l'APK sur appareil physique, notamment login, scan QR, vaccination,
stock et synchronisation hors ligne. Le package de publication est
`ma.vaccinikids.staff`. Les parcours infirmier et admin restent regroupés dans une seule
application staff pour le pilote. La signature release doit être fournie par les variables
`STAFF_ANDROID_RELEASE_*` et le keystore doit rester hors du dépôt.
