# Etat d'implementation mobile administrateur

## Implemente dans le depot

| Lot | Etat code |
| --- | --- |
| ADM-01 Dashboard/statistiques | KPIs et statistiques API, filtre centre, chargement et erreurs |
| ADM-02 Personnel/centres/vaccins | Creation, modification, activation/desactivation et persistance API |
| ADM-03 Sessions | Creation, modification et cycle de statuts via backend |
| ADM-04 Stock/mouvements | Stock, seuil, motif et historique serveur |
| ADM-05 Exports/audit | Filtres export, ouverture securisee, audit filtre et pagine |
| ADM-06 Nettoyage | Parcours et donnees admin locales fictives retires |

## Protections

- session admin revalidee avec `/auth/me` ;
- captures sensibles bloquees ;
- succes affiche uniquement apres reponse serveur ;
- desactivation centre refusee avec personnel ou sessions actives ;
- ecrans sensibles non exportes par Android.

## Validation automatisee

- contrats Retrofit/DTO critiques couverts ;
- cycle admin vers clinique couvert par un E2E backend strict ;
- stock, mouvement d'ouverture de flacon, vaccination et audit verifies apres ecriture ;
- presentation statistique alimentee uniquement par l'API.
