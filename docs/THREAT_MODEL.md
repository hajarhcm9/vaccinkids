# Revue de menace VacciniKids

**Methode :** actifs, frontieres de confiance, scenarios et controles
**Statut :** revue interne initiale, pentest externe obligatoire avant pilote reel

## Actifs critiques

- identites parent, enfant, personnel et administrateur ;
- dossiers vaccinaux, croissance, rendez-vous et reactions ;
- tokens de session, QR, secrets, cles de chiffrement et sauvegardes ;
- stock, flacons, file d'attente et actes cliniques ;
- audit append-only et exports.

## Frontieres de confiance

1. Applications parent/staff vers API publique HTTPS.
2. Web admin et kiosk vers API avec scopes distincts.
3. API vers PostgreSQL, Redis, fournisseurs et audit externe.
4. CI/CD vers registres, secrets et environnements.
5. Operateurs/support vers consoles, sauvegardes et journaux.

## Scenarios prioritaires

| ID | Scenario | Impact | Controles presents | Validation restante |
| --- | --- | --- | --- | --- |
| TM-01 | Acces horizontal a un enfant/centre | Critique | RBAC et autorisation ressource/centre, tests negatifs | Pentest |
| TM-02 | Double vaccination ou double appel file | Critique | Transactions, verrous, idempotence, tests concurrence | Charge staging |
| TM-03 | Vol/rejeu refresh token ou QR | Eleve | Rotation/revocation, QR borne, audit | Tests appareil/pentest |
| TM-04 | Appareil perdu | Eleve | Keystore/Keychain, purge logout, pas de cache clinique staff | MDM/procedure |
| TM-05 | Compromission admin | Critique | Rate limit, RBAC, audit, bootstrap controle | MFA/pentest |
| TM-06 | Injection/XSS/CSRF | Eleve | Validation, Helmet/CSP, cookies HttpOnly/CSRF web | Pentest |
| TM-07 | Export excessif ou vole | Critique | Autorisation, audit, taille/expiration | Stockage chiffre reel |
| TM-08 | Fuite logs/notifications | Eleve | Redaction et messages minimaux | Revue fournisseurs |
| TM-09 | Alteration/suppression audit | Eleve | Append-only DB, export externe requis | SIEM/WORM reel |
| TM-10 | Secret CI/runtime compromis | Critique | Scans secrets, variables d'environnement | Gestionnaire/rotation |
| TM-11 | Sauvegarde perdue ou corrompue | Critique | Script chiffre et runbook restauration | Exercice signe |
| TM-12 | Panne DB/Redis/fournisseur | Eleve | Health, metriques, retry borne, runbooks | Test de resilience |
| TM-13 | Kiosk depasse son centre | Eleve | Identite/scopes lecture seule par centre | Pentest |
| TM-14 | Dependance/image compromise | Eleve | Audit npm, Dependabot, CodeQL, Trivy, Gitleaks | Revue periodique |

## Plan de pentest

Le prestataire doit tester API, applications mobiles, web admin, kiosk et configuration
exposee. Le perimetre inclut au minimum authentification, autorisations horizontales et
verticales, concurrence clinique, fichiers/exports, cookies/CSRF/CSP, QR, rate limiting,
secrets, erreurs et donnees residuelles sur appareils.

Conditions de sortie :

- aucun constat critique ou eleve ouvert ;
- chaque constat moyen/faible possede responsable, echeance et decision ;
- retest des corrections ;
- rapport et risques residuels references dans le registre conformite.
