import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Formik } from 'formik';
import * as Yup from 'yup';
import AppButton from '../../components/ui/AppButton';
import AppInput from '../../components/ui/AppInput';
import { Colors } from '../../constants/theme';

const EnfantSchema = Yup.object().shape({
  nom: Yup.string().required('Le nom est obligatoire'),
  prenom: Yup.string().required('Le prénom est obligatoire'),
  date_naissance: Yup.string()
    .matches(/^\d{4}-\d{2}-\d{2}$/, 'Format: AAAA-MM-JJ')
    .required('La date de naissance est obligatoire'),
  sexe: Yup.string().oneOf(['M', 'F'], 'Choisissez M ou F').required('Le sexe est obligatoire'),
});

export default function AddEnfantModal({ visible, onClose, onAdd }) {
  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Ajouter un enfant</Text>

          <Formik
            initialValues={{ nom: '', prenom: '', date_naissance: '', sexe: 'M' }}
            validationSchema={EnfantSchema}
            onSubmit={(values) => onAdd(values)}
          >
            {({ handleChange, handleBlur, handleSubmit, values, errors, touched, setFieldValue }) => (
              <>
                <AppInput placeholder="Nom" value={values.nom} onChangeText={handleChange('nom')} onBlur={handleBlur('nom')} />
                {touched.nom && errors.nom && <Text style={styles.error}>{errors.nom}</Text>}

                <AppInput placeholder="Prénom" value={values.prenom} onChangeText={handleChange('prenom')} onBlur={handleBlur('prenom')} />
                {touched.prenom && errors.prenom && <Text style={styles.error}>{errors.prenom}</Text>}

                <AppInput placeholder="Date de naissance (AAAA-MM-JJ)" value={values.date_naissance} onChangeText={handleChange('date_naissance')} onBlur={handleBlur('date_naissance')} keyboardType="numeric" />
                {touched.date_naissance && errors.date_naissance && <Text style={styles.error}>{errors.date_naissance}</Text>}

                <View style={styles.sexeContainer}>
                  <TouchableOpacity
                    style={[styles.sexeButton, values.sexe === 'M' && styles.sexeActiveM]}
                    onPress={() => setFieldValue('sexe', 'M')}
                  >
                    <Text style={values.sexe === 'M' ? styles.sexeTextActive : styles.sexeText}>Garçon</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.sexeButton, values.sexe === 'F' && styles.sexeActiveF]}
                    onPress={() => setFieldValue('sexe', 'F')}
                  >
                    <Text style={values.sexe === 'F' ? styles.sexeTextActive : styles.sexeText}>Fille</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.buttonRow}>
                  <AppButton title="Annuler" onPress={onClose} color={Colors.textLight} />
                  <View style={{ width: 10 }} />
                  <AppButton title="Ajouter" onPress={handleSubmit} />
                </View>
              </>
            )}
          </Formik>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: 'bold', color: Colors.primary, marginBottom: 20, textAlign: 'center' },
  error: { color: Colors.danger, fontSize: 12, marginBottom: 8, marginLeft: 4 },
  sexeContainer: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  sexeButton: { paddingVertical: 10, paddingHorizontal: 30, borderRadius: 20, borderWidth: 1, borderColor: '#ccc' },
  sexeActiveM: { backgroundColor: '#E0F0FF', borderColor: Colors.secondary },
  sexeActiveF: { backgroundColor: '#FFE0EB', borderColor: Colors.danger },
  sexeText: { color: Colors.textLight },
  sexeTextActive: { fontWeight: 'bold', color: Colors.text },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }
});