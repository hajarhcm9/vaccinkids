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

async function sendSessionConfirmee(sessionId, { pool }) {
  // Notify all parents with an active RDV in the session
  const { rows } = await pool.query(
    `SELECT rdv.parent_id, rdv.id AS rdv_id,
            b.prenom AS bebe_prenom,
            v.nom AS vaccin_nom,
            s.date_session, c.nom AS centre_nom
     FROM rendez_vous rdv
     JOIN bebe b    ON b.id = rdv.bebe_id
     JOIN session s ON s.id = rdv.session_id
     JOIN vaccin v  ON v.id = s.vaccin_id
     JOIN centre c  ON c.id = s.centre_id
     WHERE rdv.session_id = $1
       AND rdv.statut NOT IN ('ANNULE', 'EN_LISTE_ATTENTE')`,
    [sessionId],
  );

  const date = rows[0]?.date_session
    ? new Date(rows[0].date_session).toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
    : '';

  return Promise.all(
    rows.map((r) =>
      sendNotification({
        destinataire_id:   r.parent_id,
        destinataire_type: 'parent',
        type:              'CONFIRMATION',
        titre:             '🎉 Séance confirmée !',
        message:           `La séance ${r.vaccin_nom} du ${date} au ${r.centre_nom} est confirmée${r.bebe_prenom ? ` pour ${r.bebe_prenom}` : ''}.`,
        reference_id:      r.rdv_id,
        reference_type:    'rendez_vous',
      }),
    ),
  );
}

module.exports = {
  sendNotification,
  sendRappelRdv,
  sendRappelSession,
  sendAlerteStock,
  sendSessionConfirmee,
};
