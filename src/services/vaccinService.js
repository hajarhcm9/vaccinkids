import api from './api';

export const vaccinService = {
  getCalendrier: async (enfantId) => {
    try {
      const response = await api.get(`/vaccins/calendrier/${enfantId}`);
      return response.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Erreur lors du chargement du calendrier');
    }
  },
};