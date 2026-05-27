import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api';
const BABIES_KEY = 'mock_babies';

export const babyService = {
  /**
   * Ajoute un nouveau bébé pour le parent connecté
   * @param {Object} babyData - { firstName, lastName, birthDate, gender, photoUri? }
   * @returns {Promise<{ success: boolean, baby: Object }>}
   */
  addBaby: async (babyData) => {
    try {
      // TODO: Remplacer par appel API réel
      // const token = await AsyncStorage.getItem('authToken');
      // const response = await fetch(`${API_BASE_URL}/babies`, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'Authorization': `Bearer ${token}`,
      //   },
      //   body: JSON.stringify(babyData),
      // });
      // return await response.json();

      // MOCK
      await new Promise((r) => setTimeout(r, 900));

      const stored = await AsyncStorage.getItem(BABIES_KEY);
      const babies = stored ? JSON.parse(stored) : [];

      const newBaby = {
        id: `baby_${Date.now()}`,
        ...babyData,
        createdAt: new Date().toISOString(),
      };

      babies.push(newBaby);
      await AsyncStorage.setItem(BABIES_KEY, JSON.stringify(babies));

      console.log('[DEV] Bébé ajouté:', newBaby);
      return { success: true, baby: newBaby };
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
      // TODO: Remplacer par appel API réel
      // const token = await AsyncStorage.getItem('authToken');
      // const response = await fetch(`${API_BASE_URL}/babies`, {
      //   headers: { 'Authorization': `Bearer ${token}` },
      // });
      // const data = await response.json();
      // return data.babies;

      // MOCK
      await new Promise((r) => setTimeout(r, 500));
      const stored = await AsyncStorage.getItem(BABIES_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('getBabies error:', error);
      return [];
    }
  },
};