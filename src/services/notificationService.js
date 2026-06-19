const Notification = require('../models/Notification');

async function sendNotification({
  destinataire_id,
  destinataire_type = 'parent',
  type,
  canal = 'in_app',
  titre,
  message,
  reference_id = null,
  reference_type = null,
}) {
  return Notification.create({
    destinataire_id,
    destinataire_type,
    type,
    canal,
    titre,
    message,
    reference_id,
    reference_type,
  });
}

async function sendRappelRdv(rdv) {
  return sendNotification({
    destinataire_id: rdv.parent_id,
    destinataire_type: 'parent',
    type: 'RAPPEL',
    titre: 'Rappel rendez-vous',
    message: `Rappel : rendez-vous vaccinal prévu demain${rdv.bebe_prenom ? ` pour ${rdv.bebe_prenom}` : ''}.`,
    reference_id: rdv.id,
    reference_type: 'rendez_vous',
  });
}

async function sendRappelSession(sessionId) {
  return sendNotification({
    destinataire_id: sessionId,
    destinataire_type: 'personnel',
    type: 'RAPPEL',
    titre: 'Rappel session',
    message: 'Une session de vaccination est prévue aujourd\'hui.',
    reference_id: sessionId,
    reference_type: 'session',
  });
}

async function sendAlerteStock(centreId, vaccinNom, quantite) {
  return sendNotification({
    destinataire_id: centreId,
    destinataire_type: 'personnel',
    type: 'ALERTE',
    titre: 'Stock bas',
    message: `Stock critique pour ${vaccinNom} : ${quantite} dose(s) restante(s).`,
    reference_type: 'stock',
  });
}

module.exports = {
  sendNotification,
  sendRappelRdv,
  sendRappelSession,
  sendAlerteStock,
};
