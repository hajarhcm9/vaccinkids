import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors, Radii, Spacing, Elevation, Typography } from '../../constants/theme';
import { enfantService } from '../../services';

const EnfantSchema = Yup.object().shape({
  nom: Yup.string().required('Le nom est obligatoire'),
  prenom: Yup.string().required('Le prénom est obligatoire'),
  date_naissance: Yup.string().required('La date de naissance est obligatoire'),
  sexe: Yup.string().oneOf(['M', 'F'], 'Choisissez M ou F').required('Le sexe est obligatoire'),
});

const MOCK_ENFANTS = [
  { id: '1', nom: 'Dupont', prenom: 'Asmae', date_naissance: '12/05/2023', sexe: 'F' },
  { id: '2', nom: 'Dupont', prenom: 'Salma', date_naissance: '25/08/2021', sexe: 'M' },
];

function AddEnfantModal({ visible, onClose, onAdd }) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Ajouter un enfant</Text>
          <Text style={styles.modalSubtitle}>
            Renseignez les informations de votre enfant pour suivre son calendrier vaccinal.
          </Text>
          <Formik
            initialValues={{ nom: '', prenom: '', date_naissance: '', sexe: 'F' }}
            validationSchema={EnfantSchema}
            onSubmit={(values) => { onAdd(values); }}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
              <>
                <AppInput label="Nom *" placeholder="Nom de l'enfant" value={values.nom} onChangeText={handleChange('nom')} onBlur={handleBlur('nom')} error={errors.nom} touched={touched.nom} />
                <AppInput label="Prénom *" placeholder="Prénom de l'enfant" value={values.prenom} onChangeText={handleChange('prenom')} onBlur={handleBlur('prenom')} error={errors.prenom} touched={touched.prenom} />
                <AppInput label="Date de naissance *" placeholder="JJ / MM / AAAA" value={values.date_naissance} onChangeText={handleChange('date_naissance')} onBlur={handleBlur('date_naissance')} error={errors.date_naissance} touched={touched.date_naissance} icon="calendar-outline" keyboardType="numeric" helper="Format : JJ/MM/AAAA" />
                <Text style={styles.fieldLabel}>Sexe *</Text>
                <View style={styles.sexeContainer}>
                  <TouchableOpacity style={[styles.sexeButton, values.sexe === 'F' && styles.sexeActiveF]} onPress={() => setFieldValue('sexe', 'F')}>
                    <Ionicons name="female" size={16} color={values.sexe === 'F' ? Colors.surface : Colors.textSecondary} />
                    <Text style={[styles.sexeText, values.sexe === 'F' && styles.sexeTextActive]}>Fille</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.sexeButton, values.sexe === 'M' && styles.sexeActiveM]} onPress={() => setFieldValue('sexe', 'M')}>
                    <Ionicons name="male" size={16} color={values.sexe === 'M' ? Colors.surface : Colors.textSecondary} />
                    <Text style={[styles.sexeText, values.sexe === 'M' && styles.sexeTextActive]}>Garçon</Text>
                  </TouchableOpacity>
                </View>
                <View style={styles.buttonRow}>
                  <AppButton title="Annuler" onPress={onClose} variant="ghost" fullWidth={false} style={{ flex: 1 }} />
                  <View style={{ width: Spacing.sm }} />
                  <AppButton title="Ajouter" onPress={handleSubmit} icon="checkmark" iconPosition="right" fullWidth={false} style={{ flex: 1 }} />
                </View>
              </>
            )}
          </Formik>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function EnfantsScreen() {
  const [modalVisible, setModalVisible] = useState(false);
  const [enfants, setEnfants] = useState(MOCK_ENFANTS);

  const loadEnfants = React.useCallback(async () => {
    try {
      const data = await enfantService.listEnfants();
      if (Array.isArray(data) && data.length > 0) setEnfants(data);
    } catch (e) {}
  }, []);
  React.useEffect(() => { loadEnfants(); }, [loadEnfants]);

  const handleAdd = async (values) => {
    try {
      const created = await enfantService.addEnfant(values);
      setEnfants([...enfants, created || { id: Date.now().toString(), ...values }]);
    } catch (e) {
      setEnfants([...enfants, { id: Date.now().toString(), ...values }]);
    }
    setModalVisible(false);
  };

  const renderEnfant = ({ item }) => (
    <View style={styles.card}>
      <View style={[styles.avatar, item.sexe === 'F' ? styles.avatarF : styles.avatarM]}>
        <Text style={styles.avatarText}>{item.prenom[0]}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.name}>{item.prenom} {item.nom}</Text>
        <Text style={styles.details}>Né(e) le : {item.date_naissance}</Text>
        <View style={styles.codeRow}>
          <Ionicons name="link-outline" size={11} color={Colors.primary} />
          <Text style={styles.linkText}>Code centre : •••••••{item.id === '1' ? '12' : '45'}</Text>
        </View>
      </View>
      <View style={[styles.badge, item.sexe === 'F' ? styles.badgeF : styles.badgeM]}>
        <Ionicons name={item.sexe === 'F' ? 'female' : 'male'} size={11} color={item.sexe === 'F' ? '#A14D6B' : '#1B6E4D'} />
        <Text style={[styles.badgeText, { color: item.sexe === 'F' ? '#A14D6B' : '#1B6E4D' }]}>
          {item.sexe === 'F' ? 'Fille' : 'Garçon'}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={enfants}
        keyExtractor={(item) => item.id}
        renderItem={renderEnfant}
        contentContainerStyle={{ padding: Spacing.lg, paddingBottom: 100 }}
        ListHeaderComponent={<Text style={styles.headerTitle}>Mes enfants</Text>}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={Colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>Aucun enfant lié</Text>
            <Text style={styles.emptyMessage}>Ajoutez votre enfant pour suivre son calendrier vaccinal.</Text>
          </View>
        }
      />
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)} accessibilityRole="button" accessibilityLabel="Ajouter un enfant">
        <Ionicons name="add" size={28} color={Colors.surface} />
      </TouchableOpacity>
      <AddEnfantModal visible={modalVisible} onClose={() => setModalVisible(false)} onAdd={handleAdd} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerTitle: { ...Typography.title, marginBottom: Spacing.lg },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: Spacing.base, borderRadius: Radii.lg, marginBottom: Spacing.md, ...Elevation.sm },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.base },
  avatarF: { backgroundColor: '#FFE0EB' },
  avatarM: { backgroundColor: Colors.primaryTint },
  avatarText: { fontSize: 18, fontWeight: '700', color: Colors.text },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.text },
  details: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  linkText: { fontSize: 11, color: Colors.primary, fontWeight: '600' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill },
  badgeF: { backgroundColor: '#FFE0EB' },
  badgeM: { backgroundColor: Colors.primaryTint },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { alignItems: 'center', paddingVertical: Spacing['4xl'] },
  emptyIcon: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.base },
  emptyTitle: { ...Typography.subtitle, marginBottom: 8 },
  emptyMessage: { ...Typography.body, textAlign: 'center', maxWidth: 280 },
  fab: { position: 'absolute', right: Spacing.lg, bottom: Spacing.xl, width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', ...Elevation.md },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['2xl'], borderTopRightRadius: Radii['2xl'], padding: Spacing.xl, paddingBottom: Spacing['2xl'] },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.md },
  modalTitle: { ...Typography.title, textAlign: 'center', marginBottom: 6 },
  modalSubtitle: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.lg, lineHeight: 18 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 4, paddingHorizontal: 4 },
  sexeContainer: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.lg },
  sexeButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: Radii.sm, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  sexeActiveF: { backgroundColor: '#E84A8A', borderColor: '#E84A8A' },
  sexeActiveM: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  sexeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },
  sexeTextActive: { color: Colors.surface, fontWeight: '700' },
  buttonRow: { flexDirection: 'row', alignItems: 'center', marginTop: Spacing.sm },
});