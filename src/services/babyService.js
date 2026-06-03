import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BABIES_KEY = 'cached_babies';

async function parseApiResponse(response) {
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.status === 'error') {
    throw new Error(data.message || 'Erreur serveur');
  }
  return data;
}

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

async function getAuthToken() {
  const token = await AsyncStorage.getItem('authToken');
  if (!token) throw new Error('Session expirée. Reconnectez-vous.');
  return token;
}

async function cacheBabies(babies) {
  await AsyncStorage.setItem(BABIES_KEY, JSON.stringify(babies));
}

export const babyService = {
  /**
   * Ajoute un nouveau bébé pour le parent connecté
   * @param {Object} babyData - { firstName, lastName, birthDate, gender, photoUri? }
   * @returns {Promise<{ success: boolean, baby: Object }>}
   */
  addBaby: async (babyData) => {
    try {
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/carnet/bebe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(toApiBaby(babyData)),
      });
      const data = await parseApiResponse(response);
      const baby = fromApiBaby(data.data);
      const stored = await AsyncStorage.getItem(BABIES_KEY);
      const babies = stored ? JSON.parse(stored) : [];
      await cacheBabies([baby, ...babies.filter((item) => item.id !== baby.id)]);
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
      const token = await getAuthToken();
      const response = await fetch(`${API_BASE_URL}/carnet/bebes`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await parseApiResponse(response);
      const babies = (data.data || []).map(fromApiBaby);
      await cacheBabies(babies);
      return babies;
    } catch (error) {
      console.error('getBabies error:', error);
      const stored = await AsyncStorage.getItem(BABIES_KEY);
      return stored ? JSON.parse(stored) : [];
    }
  },
};
