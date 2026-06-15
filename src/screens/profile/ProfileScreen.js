import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import AppButton from '../../components/ui/AppButton';
import { Colors } from '../../constants/theme';
import { AuthContext } from '../../context/AuthContext';

export default function ProfileScreen() {
  const { logout, user } = useContext(AuthContext);
  const [image, setImage] = useState(null);

  // Récupération des données ou valeurs par défaut (avec l'email en plus)
  const userData = user || { prenom: 'Invité', nom: '', telephone: 'Non renseigné', email: 'Non renseigné' };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à votre galerie.');
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* En-tête bleu dégradé */}
      <LinearGradient
        colors={['#2C5FBF', '#4A90E2']}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>Mon Profil</Text>
      </LinearGradient>

      <View style={styles.contentContainer}>
        {/* Photo de profil */}
        <TouchableOpacity style={styles.avatarContainer} onPress={pickImage}>
          {image ? (
            <Image source={{ uri: image }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Ionicons name="person" size={60} color={Colors.textLight} />
            </View>
          )}
          <View style={styles.cameraBadge}>
            <Ionicons name="camera" size={16} color={Colors.surface} />
          </View>
        </TouchableOpacity>

        {/* Nom de l'utilisateur */}
        <Text style={styles.userName}>{userData.prenom} {userData.nom}</Text>
        <Text style={styles.userRole}>Parent / Tuteur</Text>

        {/* Carte Informations Personnelles */}
        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Informations personnelles</Text>

          {/* Téléphone */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="call-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Numéro de téléphone</Text>
              <Text style={styles.infoValue}>{userData.telephone}</Text>
            </View>
          </View>

          <View style={styles.infoDivider} />

          {/* Email */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="mail-outline" size={20} color={Colors.primary} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoLabel}>Adresse email</Text>
              <Text style={styles.infoValue}>{userData.email}</Text>
            </View>
          </View>
        </View>

        {/* Carte Statistiques rapides */}
        <View style={styles.statsContainer}>
          <View style={styles.statCard}>
            <Ionicons name="people" size={24} color={Colors.primary} />
            <Text style={styles.statNumber}>2</Text>
            <Text style={styles.statLabel}>Enfants</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="calendar" size={24} color={Colors.success} />
            <Text style={styles.statNumber}>1</Text>
            <Text style={styles.statLabel}>RDV à venir</Text>
          </View>
        </View>

        {/* Bouton Déconnexion */}
        <View style={styles.logoutContainer}>
          <AppButton
            title="Se déconnecter"
            onPress={logout}
            color={Colors.danger}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: Colors.surface, marginTop: 30 },

  // Content
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: -50
  },

  // Avatar
  avatarContainer: {
    marginBottom: 15,
    position: 'relative'
  },
  avatarPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: 60,
    backgroundColor: Colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarImage: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 4,
    borderColor: Colors.surface,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    backgroundColor: Colors.primary,
    width: 34,
    height: 34,
    borderRadius: 17,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.surface
  },

  // User Identity
  userName: { fontSize: 24, fontWeight: 'bold', color: Colors.text },
  userRole: { fontSize: 15, color: Colors.textSecondary, marginBottom: 25 },

  // Info Card
  infoCard: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  cardTitle: { fontSize: 16, fontWeight: 'bold', color: Colors.text, marginBottom: 15 },
  infoRow: { flexDirection: 'row', alignItems: 'center' },
  infoIconContainer: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center',
    marginRight: 15
  },
  infoTextContainer: { flex: 1 },
  infoLabel: { fontSize: 12, color: Colors.textLight, marginBottom: 2 },
  infoValue: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  infoDivider: { height: 1, backgroundColor: Colors.background, marginVertical: 15 },

  // Stats
  statsContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    marginBottom: 30
  },
  statCard: {
    backgroundColor: Colors.surface,
    width: '48%',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  statNumber: { fontSize: 28, fontWeight: 'bold', color: Colors.text, marginVertical: 5 },
  statLabel: { fontSize: 13, color: Colors.textSecondary },

  // Logout
  logoutContainer: {
    width: '100%',
    marginBottom: 40
  }
});