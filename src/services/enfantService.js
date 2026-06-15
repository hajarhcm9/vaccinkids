import api from './api';

export const enfantService = {
  getEnfants: async () => {
    try {
      const response = await api.get('/enfants');
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement des enfants');
    }
  },

  addEnfant: async (enfantData) => {
    try {
      const response = await api.post('/enfants', enfantData);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors de l\'ajout de l\'enfant');
    }
  },
};