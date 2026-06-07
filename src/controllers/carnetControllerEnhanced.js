const Bebe = require('../models/Bebe');
const Croissance = require('../models/Croissance');
const Vaccination = require('../models/Vaccination');
const RendezVous = require('../models/RendezVous');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/responseHandler');
const authorization = require('../services/resourceAuthorizationService');

const CarnetEnhancedController = {
  getComplete: catchAsync(async (req, res, next) => {
    const bebeId = req.params.id;

    await authorization.assertBebeAccess(req.user, bebeId);
    const bebe = await Bebe.findById(bebeId);

    const [vaccinations, croissance, delayedVaccines, upcomingRdvs] = await Promise.all([
      Vaccination.findByBebe(bebeId),
      Croissance.findByBebe(bebeId),
      Bebe.getDelayedVaccines(bebeId),
      RendezVous.findByParent(bebe.parent_id),
    ]);

    const babyUpcoming = upcomingRdvs.filter(
      (r) =>
        r.bebe_id === parseInt(bebeId, 10) && !['ANNULE', 'PRESENT', 'ABSENT'].includes(r.statut),
    );

    const latestCroissance = croissance.length > 0 ? croissance[croissance.length - 1] : null;

    return success(res, 200, 'Complete health record retrieved', {
      bebe: {
        id: bebe.id,
        prenom: bebe.prenom,
        nom: bebe.nom,
        date_naissance: bebe.date_naissance,
        sexe: bebe.sexe,
        code_qr: bebe.code_qr,
        age_jours: Math.floor((Date.now() - new Date(bebe.date_naissance)) / (1000 * 60 * 60 * 24)),
      },
      stats: {
        vaccines_done: vaccinations.length,
        vaccines_delayed: delayedVaccines.length,
        has_growth_data: croissance.length > 0,
      },
      latest_growth: latestCroissance,
      vaccinations,
      croissance,
      delayed_vaccines: delayedVaccines,
      upcoming_appointments: babyUpcoming,
    });
  }),
};

module.exports = CarnetEnhancedController;
