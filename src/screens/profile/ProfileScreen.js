import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/ui/AppButton';
import { Colors, Gradients, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { logout, user } = useContext(AuthContext);
  const [image, setImage] = useState(null);

  const userData = user || { prenom: 'Invité', nom: '', telephone: 'Non renseigné', email: 'Non renseigné', cin: '—' };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie dans les réglages.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) setImage(result.assets[0].uri);
  };

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Voulez-vous vraiment vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: logout },
      ],
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <LinearGradient colors={Gradients.brand} style={styles.header}>
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </LinearGradient>

      <View style={styles.content}>
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage} accessibilityRole="button" accessibilityLabel="Changer la photo de profil">
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={50} color={Colors.textLight} />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={14} color={Colors.surface} />
          </View>
        </TouchableOpacity>

        <Text style={styles.userName}>{userData.prenom} {userData.nom}</Text>
        <View style={styles.roleBadge}>
          <Ionicons name="shield-checkmark-outline" size={12} color={Colors.primary} />
          <Text style={styles.roleText}>Parent / Tuteur</Text>
        </View>

        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={22} color={Colors.primary} />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Enfants</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={22} color={Colors.accent} />
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>RDV à venir</Text>
          </View>
        </View>

        <Text style={styles.cardTitle}>Informations personnelles</Text>
        <View style={styles.infoCard}>
          <InfoRow icon="card-outline" label="CIN" value={userData.cin || '—'} />
          <View style={styles.infoDivider} />
          <InfoRow icon="call-outline" label="Téléphone" value={userData.telephone} />
          <View style={styles.infoDivider} />
          <InfoRow icon="mail-outline" label="Adresse email" value={userData.email} />
        </View>

        <Text style={styles.cardTitle}>Réglages</Text>
        <View style={styles.infoCard}>
          <ActionRow icon="create-outline" label="Modifier mes informations" onPress={() => {}} />
          <View style={styles.infoDivider} />
          <ActionRow icon="notifications-outline" label="Notifications" onPress={() => {}} />
          <View style={styles.infoDivider} />
          <ActionRow icon="language-outline" label="Langue" value="Français" onPress={() => {}} />
          <View style={styles.infoDivider} />
          <ActionRow icon="lock-closed-outline" label="Confidentialité & sécurité" onPress={() => {}} />
          <View style={styles.infoDivider} />
          <ActionRow icon="help-circle-outline" label="Aide & support" onPress={() => {}} />
        </View>

        <AppButton
          title="Se déconnecter"
          onPress={handleLogout}
          variant="danger"
          icon="log-out-outline"
          iconPosition="right"
          style={{ marginTop: Spacing.xl }}
        />
      </View>
    </ScrollView>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View style={styles.infoTextContainer}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function ActionRow({ icon, label, value, onPress }) {
  return (
    <TouchableOpacity style={styles.infoRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.infoIconContainer}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <Text style={styles.actionLabel}>{label}</Text>
      {value && <Text style={styles.actionValue}>{value}</Text>}
      <Ionicons name="chevron-forward" size={16} color={Colors.textLight} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { height: 110, justifyContent: 'center', alignItems: 'center', borderBottomLeftRadius: Radii.header, borderBottomRightRadius: Radii.header },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.surface, marginTop: 30 },
  content: { alignItems: 'center', paddingHorizontal: Spacing.lg, marginTop: -50, paddingBottom: Spacing['4xl'] },
  avatarContainer: { marginBottom: Spacing.md, position: 'relative' },
  avatarPlaceholder: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: Colors.surface, ...Elevation.md },
  avatarImage: { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: Colors.surface, ...Elevation.md },
  cameraBadge: { position: 'absolute', bottom: 4, right: 4, backgroundColor: Colors.primary, width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: Colors.surface },
  userName: { ...Typography.title, marginBottom: 6 },
  roleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primaryTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill, marginBottom: Spacing.lg },
  roleText: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 0.5 },
  statsContainer: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', marginBottom: Spacing.xl, gap: Spacing.md },
  statCard: { flex: 1, backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.base, alignItems: 'center', ...Elevation.sm },
  statNumber: { fontSize: 26, fontWeight: '800', color: Colors.text, marginVertical: 4 },
  statLabel: { fontSize: 12, color: Colors.textSecondary, fontWeight: '500' },
  cardTitle: { ...Typography.subtitle, alignSelf: 'flex-start', marginLeft: 4, marginBottom: Spacing.md, marginTop: Spacing.sm },
  infoCard: { width: '100%', backgroundColor: Colors.surface, borderRadius: Radii.xl, padding: Spacing.base, marginBottom: Spacing.lg, ...Elevation.sm },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  infoIconContainer: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' },
  infoValue: { fontSize: 14, color: Colors.text, fontWeight: '600' },
  infoDivider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.md, marginLeft: 52 },
  actionLabel: { flex: 1, fontSize: 14, color: Colors.text, fontWeight: '500' },
  actionValue: { fontSize: 12, color: Colors.textSecondary, marginRight: 6 },
});