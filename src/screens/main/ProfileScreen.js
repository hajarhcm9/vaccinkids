import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { AuthContext } from '../../context/AuthContext';
import { preferencesService } from '../../services/preferencesService';

const LANGUAGES = [
  { code: 'fr', label: 'Français', flag: '🇫🇷' },
  { code: 'ar', label: 'العربية', flag: '🇲🇦' },
];

const ProfileScreen = () => {
  const [language, setLanguage] = useState('fr');
  const { signOut } = useContext(AuthContext);

  useEffect(() => {
    preferencesService.getLanguage()
      .then(setLanguage)
      .catch(() => {});
  }, []);

  const handleLanguageChange = async (code) => {
    setLanguage(code);
    await preferencesService.setLanguage(code).catch(() => {});
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déconnexion',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['authToken', 'refreshToken', 'userPhone']);
            signOut();
          },
        },
      ]
    );
  };

  const MenuRow = ({ icon, label, onPress, danger = false }) => (
    <TouchableOpacity style={styles.menuRow} onPress={onPress}>
      <Text style={styles.menuIcon}>{icon}</Text>
      <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      <Text style={styles.menuChevron}>›</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <View style={styles.header}>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarEmoji}>👤</Text>
        </View>
        <Text style={styles.headerName}>Mon Profil</Text>
        <Text style={styles.headerSub}>Centre Es-Salaam · Oujda</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionTitle}>Langue</Text>
        <View style={styles.langCard}>
          {LANGUAGES.map((lang) => (
            <TouchableOpacity
              key={lang.code}
              style={[styles.langBtn, language === lang.code && styles.langBtnActive]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.langLabel, language === lang.code && styles.langLabelActive]}>
                {lang.label}
              </Text>
              {language === lang.code && <Text style={styles.langCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Mon compte</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="👶" label="Gérer mes enfants" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuRow icon="🔔" label="Notifications" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuRow icon="📱" label="Informations personnelles" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>Informations</Text>
        <View style={styles.menuCard}>
          <MenuRow icon="📋" label="Conditions d'utilisation" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuRow icon="🔒" label="Politique de confidentialité" onPress={() => {}} />
          <View style={styles.menuDivider} />
          <MenuRow icon="ℹ️" label="À propos de VacciniKids" onPress={() => {}} />
        </View>

        <View style={styles.menuCard}>
          <MenuRow icon="🚪" label="Se déconnecter" onPress={handleLogout} danger />
        </View>

        <Text style={styles.version}>VacciniKids v1.0.0 · ISPITS Oujda PFE 2025</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingTop: Platform.OS === 'ios' ? 52 : spacing.xl,
    paddingBottom: spacing.xxl,
    paddingHorizontal: spacing.xl,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  avatarEmoji: { fontSize: 34 },
  headerName: {
    fontSize: typography.fontSizes.xl,
    fontWeight: typography.fontWeights.bold,
    color: colors.white,
  },
  headerSub: {
    fontSize: typography.fontSizes.sm,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: spacing.xxxl },
  sectionTitle: {
    fontSize: typography.fontSizes.sm,
    fontWeight: typography.fontWeights.semibold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  langBtnActive: { backgroundColor: colors.primaryLight },
  langFlag: { fontSize: 22 },
  langLabel: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  langLabelActive: {
    color: colors.primary,
    fontWeight: typography.fontWeights.semibold,
  },
  langCheck: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: typography.fontWeights.bold,
  },
  menuCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.sm,
    ...shadows.card,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  menuIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  menuLabel: {
    flex: 1,
    fontSize: typography.fontSizes.md,
    color: colors.textPrimary,
  },
  menuLabelDanger: { color: colors.danger },
  menuChevron: {
    fontSize: 20,
    color: colors.textHint,
    fontWeight: typography.fontWeights.bold,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: spacing.xl + 28,
  },
  version: {
    textAlign: 'center',
    fontSize: typography.fontSizes.xs,
    color: colors.textHint,
    marginTop: spacing.xl,
  },
});

export default ProfileScreen;
