# Recette et exploitation web admin / kiosk

## Activation production

Les deux surfaces sont desactivees par defaut en production :

- `WEB_ADMIN_ENABLED=false`
- `WAITING_ROOM_ENABLED=false`

Une surface ne peut etre activee qu'apres recette HTTPS et decision go/no-go. Les API de
session web admin et de lecture kiosk sont egalement indisponibles lorsque leur surface est
desactivee.

## Recette web admin

1. Verifier HTTPS, HSTS, CSP, `frame-ancestors 'none'` et absence de contenu mixte.
2. Confirmer que le refresh token existe uniquement dans le cookie `HttpOnly`,
   `Secure`, `SameSite=Strict`.
3. Confirmer que le token d'acces et le token CSRF restent uniquement en memoire.
4. Tester mauvais CSRF, XSS, fixation/rejeu de session, rotation refresh et droits non-admin.
5. Verifier que logout revoque le refresh serveur et efface les cookies.
6. Tester expiration selon `WEB_ADMIN_SESSION_DAYS`.
7. Desactiver `WEB_ADMIN_ENABLED` immediatement si la recette echoue.

## Provisionnement kiosk

1. L'admin cree une identite liee a un centre via `POST /api/kiosks`.
2. Le secret retourne une seule fois est remis par un canal approuve.
3. Le kiosk appelle uniquement `POST /api/kiosks/login`, puis
   `GET /api/file-attente/kiosk`.
4. Le token expire selon `KIOSK_TOKEN_MINUTES` et ne contient que l'identite kiosk,
   le centre, la version et le scope implicite lecture seule.
5. L'affichage ne recoit que `numero_attente` et `statut`, sans nom, telephone, rendez-vous
   ou donnee medicale.

## Kiosk compromis ou remplace

1. Revoquer immediatement via `POST /api/kiosks/:id/revoke`.
2. Verifier que l'ancien token et le secret sont refuses.
3. Preserver les evenements d'audit et identifier la periode exposee.
4. Creer une nouvelle identite ou tourner le secret selon le scenario.
5. Reconfigurer physiquement l'ecran et confirmer son centre.
6. Documenter l'incident et desactiver `WAITING_ROOM_ENABLED` si le perimetre est incertain.
