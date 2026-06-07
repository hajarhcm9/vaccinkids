# Registre conformite et donnees de sante

**Statut :** a valider avant pilote reel
**Proprietaires :** responsable produit et responsable conformite

Ce registre transforme les exigences COMP-01 a COMP-04 en decisions tracables. Une case
vide ou une decision non signee bloque le passage en production.

## Traitements et finalites

| Traitement | Donnees minimales | Finalite | Personnes | Base legale a valider | Responsable |
| --- | --- | --- | --- | --- | --- |
| Authentification parent | Telephone, identifiant, traces de securite | Acces securise | Parents | A valider | Produit |
| Gestion enfant | Identite enfant, lien parent | Suivi vaccinal | Parents/enfants | A valider | Produit |
| Rendez-vous et file | Centre, session, statut, position | Organisation vaccination | Parents/enfants | A valider | Operations |
| Acte vaccinal | Vaccin, lot, mesures, reactions, personnel | Continuite et preuve de soin | Enfants | A valider | Clinique |
| Notifications | Destinataire, categorie, statut | Information operationnelle | Parents/staff | A valider | Produit |
| Audit et securite | Acteur, role, ressource, resultat, IP bornee | Securite et preuve | Tous utilisateurs | A valider | Securite |
| Exports | Sous-ensemble autorise selon filtre | Pilotage autorise | Selon export | A valider | Produit |

Les champs libres ne doivent jamais servir a collecter des donnees sans finalite
documentee. Toute nouvelle donnee exige une mise a jour de ce registre.

## Droits des personnes

| Droit | Canal officiel | Verification identite | Delai approuve | Responsable | Procedure testee |
| --- | --- | --- | --- | --- | --- |
| Information/consentement | A definir | N/A | Avant collecte | Conformite | Non |
| Acces | A definir | A definir | A valider | Support/conformite | Non |
| Rectification | A definir | A definir | A valider | Support/clinique | Non |
| Opposition | A definir | A definir | A valider | Conformite | Non |
| Suppression | A definir | A definir | A valider selon obligations cliniques | Conformite | Non |
| Reclamation | A definir | A definir | A valider | Conformite | Non |

Chaque demande recoit un identifiant, une date, une decision motivee et une preuve de
cloture. Les reponses ne sont jamais envoyees avant verification de l'identite.

## Sous-traitants, hebergement et transferts

| Fournisseur | Service/pays | Donnees traitees | Transfert | Contrat/DPA | Mesures | Decision |
| --- | --- | --- | --- | --- | --- | --- |
| Hebergeur API/DB | A renseigner | Donnees applicatives | A renseigner | A fournir | Chiffrement, isolation, sauvegarde | Non valide |
| SMS/OTP | A renseigner | Telephone, message minimal | A renseigner | A fournir | Retention minimale, pas de contenu clinique | Non valide |
| Push | Firebase/APNs, a confirmer | Token appareil, message minimal | A renseigner | A fournir | Pas de contenu clinique sensible | Non valide |
| Email | A renseigner | Email, message minimal | A renseigner | A fournir | TLS, retention minimale | Non valide |
| Audit/SIEM | A renseigner | Evenements pseudonymises | A renseigner | A fournir | Append-only, acces lecture seule | Non valide |
| Sauvegardes | A renseigner | Copie chiffree DB | A renseigner | A fournir | Cles separees, retention | Non valide |

## Validation loi 09-08

Le responsable conformite doit documenter avant pilote :

- qualification du responsable de traitement et des sous-traitants ;
- formalites CNDP applicables, notamment aux donnees de sante et transferts ;
- base legale de chaque traitement et preuve d'information/consentement ;
- restrictions de conservation, acces et transfert ;
- exceptions legales qui interdisent une suppression immediate.

Ce document est un support technique et organisationnel, pas un avis juridique.

## Registre des risques residuels

| ID | Risque | Mesure actuelle | Risque residuel | Responsable | Acceptation/date |
| --- | --- | --- | --- | --- | --- |
| R-COMP-01 | Validation juridique non realisee | Production bloquee | Eleve | Conformite |  |
| R-COMP-02 | Sous-traitants non contractuellement valides | Registre obligatoire | Eleve | Produit |  |
| R-COMP-03 | Audit externe non prouve | Configuration production obligatoire | Eleve | Securite |  |
| R-COMP-04 | Pentest non realise | CI securite et revue de menace | Eleve | Securite |  |

## Signatures

| Role | Nom | Decision | Date | Signature/reference |
| --- | --- | --- | --- | --- |
| Responsable produit |  |  |  |  |
| Responsable conformite |  |  |  |  |
| Responsable technique |  |  |  |  |
| Responsable securite |  |  |  |  |
