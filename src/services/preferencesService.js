import AsyncStorage from '@react-native-async-storage/async-storage';

const LANGUAGE_KEY = 'appLanguage';
const SUPPORTED_LANGUAGES = ['fr', 'ar'];
const DEFAULT_LANGUAGE = 'fr';

const normalizeLanguage = (language) =>
  SUPPORTED_LANGUAGES.includes(language) ? language : DEFAULT_LANGUAGE;

export const preferencesService = {
  async getLanguage() {
    const language = await AsyncStorage.getItem(LANGUAGE_KEY);
    return normalizeLanguage(language);
  },

  async setLanguage(language) {
    const nextLanguage = normalizeLanguage(language);
    await AsyncStorage.setItem(LANGUAGE_KEY, nextLanguage);
    return nextLanguage;
  },
};
