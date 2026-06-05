import { httpClient } from './httpClient';

function toApiBaby(babyData) {
  return {
    prenom: babyData.firstName,
    nom: babyData.lastName,
    date_naissance: babyData.birthDate,
    sexe: babyData.gender === 'female' ? 'F' : 'M',
  };
}

function fromApiBaby(baby) {
  return {
    id: baby.id,
    firstName: baby.prenom,
    lastName: baby.nom,
    birthDate: baby.date_naissance,
    gender: baby.sexe === 'F' ? 'female' : 'male',
    qrCode: baby.qr_code,
    createdAt: baby.created_at,
    raw: baby,
  };
}

export const babyService = {
  /**
   * Ajoute un nouveau bébé pour le parent connecté
   * @param {Object} babyData - { firstName, lastName, birthDate, gender, photoUri? }
   * @returns {Promise<{ success: boolean, baby: Object }>}
   */
  addBaby: async (babyData) => {
    try {
      const data = await httpClient.request('/carnet/bebe', {
        method: 'POST',
        body: JSON.stringify(toApiBaby(babyData)),
      });
      const baby = fromApiBaby(data.data);
      return { success: true, baby };
    } catch (error) {
      console.error('addBaby error:', error);
      throw new Error("Impossible d'ajouter le bébé. Réessayez.");
    }
  },

  /**
   * Récupère la liste des bébés du parent connecté
   * @returns {Promise<Array>}
   */
  getBabies: async () => {
    try {
      const data = await httpClient.request('/carnet/bebes');
      const babies = (data.data || []).map(fromApiBaby);
      return babies;
    } catch (error) {
      console.error('getBabies error:', error);
      throw error;
    }
  },
};
