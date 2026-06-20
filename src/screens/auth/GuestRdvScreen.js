import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StatusBar, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';

function normalizePhone(p) {
  const c = p.replace(/\s/g, '');
  return c.startsWith('0') ? '+212' + c.slice(1) : c;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function GuestRdvScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const [sessions,      setSessions]      = useState([]);
  const [loadingSess,   setLoadingSess]   = useState(true);
  const [centres,       setCentres]       = useState([]);
  const [loadingCentres,setLoadingCentres]= useState(false);
  const [selCentre,     setSelCentre]     = useState(null);

  const [nomParent,   setNomParent]   = useState('');
  const [telephone,   setTelephone]   = useState('');
  const [prenomBebe,  setPrenomBebe]  = useState('');
  const [dobBebe,     setDobBebe]     = useState('');
  const [sexeBebe,    setSexeBebe]    = useState('M');
  const [isNewborn,   setIsNewborn]   = useState(false);
  const [selSession,  setSelSession]  = useState(null);
  const [errors,      setErrors]      = useState({});
  const [submitting,  setSubmitting]  = useState(false);

  const [confirmed,   setConfirmed]   = useState(null);

  const loadSessions = (newborn, centreId) => {
    setLoadingSess(true);
    setSelSession(null);
    authService.listGuestSessions({ newborn, centre_id: centreId })
      .then((data) => setSessions(Array.isArray(data) ? data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoadingSess(false));
  };

  // Initial load — all sessions, no newborn filter, no centre filter
  useEffect(() => { loadSessions(false, null); }, []);

  const handleNewbornToggle = (val) => {
    setIsNewborn(val);
    setSelCentre(null);
    setSessions([]);
    setLoadingSess(false);
    if (!val) {
      // Returning to normal mode: reload all sessions
      loadSessions(false, null);
    } else if (centres.length === 0) {
      // Load centres list once
      setLoadingCentres(true);
      authService.listPublicCentres()
        .then((data) => setCentres(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingCentres(false));
    }
  };

  const handleCentreSelect = (centre) => {
    setSelCentre(centre);
    loadSessions(true, centre.id);
  };

  const validate = () => {
    const e = {};
    if (!nomParent.trim()) e.nomParent = 'Nom obligatoire';
    const clean = telephone.replace(/\s/g, '');
    if (!/^(\+212|0)[5-7]\d{8}$/.test(clean)) e.telephone = 'Numéro invalide (ex : 0612 345 678)';
    if (!isNewborn && !prenomBebe.trim()) e.prenomBebe = 'Prénom de l\'enfant obligatoire';
    if (!isNewborn && !/^\d{2}\/\d{2}\/\d{4}$/.test(dobBebe.trim())) e.dobBebe = 'Date invalide — format JJ/MM/AAAA';
    if (!selSession) e.session = 'Choisissez une session';
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const resp = await authService.createGuestRdv({
        nom_parent:          nomParent.trim(),
        telephone:           normalizePhone(telephone),
        prenom_bebe:         isNewborn ? (prenomBebe.trim() || undefined) : prenomBebe.trim(),
        date_naissance_bebe: isNewborn ? undefined : dobBebe.trim(),
        sexe_bebe:           sexeBebe,
        session_id:          selSession.id,
        is_newborn:          isNewborn,
      });
      setConfirmed(resp);
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Erreur inattendue. Réessayez.';
      Alert.alert('Erreur', msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Confirmation screen ──────────────────────────────────────────────────
  if (confirmed) {
    const rdv = confirmed.rdv;
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={rdv.en_attente ? Gradients.accent : ['#12A150','#17C964']} style={styles.confirmHeader}>
          <View style={styles.confirmIconWrap}>
            <Ionicons name={rdv.en_attente ? 'hourglass-outline' : 'checkmark-circle'} size={48} color={Colors.white} />
          </View>
          <Text style={styles.confirmTitle}>
            {rdv.en_attente ? 'Liste d\'attente' : 'Rendez-vous confirmé !'}
          </Text>
          <Text style={styles.confirmSub}>{confirmed.message}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.confirmBody}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Détails du rendez-vous</Text>
            <InfoRow icon="medkit-outline"    label="Vaccin"  value={rdv.vaccin_nom} />
            <InfoRow icon="person-outline"    label="Enfant"  value={rdv.bebe_prenom} />
            <InfoRow icon="calendar-outline"  label="Date"    value={formatDate(rdv.date_session)} />
            <InfoRow icon="time-outline"      label="Heure"   value={rdv.heure_debut} />
            <InfoRow icon="location-outline"  label="Centre"  value={rdv.centre_nom} />
          </View>

          <View style={[styles.card, styles.noteCard]}>
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.noteText}>
              Gardez ce numéro de RDV : <Text style={{ fontWeight: '800' }}>#{rdv.id}</Text>{'\n'}
              Le centre vous contactera pour confirmation.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loginCta}
            onPress={() => navigation.replace('Login', { prefillPhone: telephone })}
          >
            <LinearGradient colors={Gradients.brand} style={styles.loginCtaGrad}>
              <Ionicons name="person-add-outline" size={18} color={Colors.white} />
              <Text style={styles.loginCtaText}>Créer un compte pour suivre vos RDV</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipLink} onPress={() => navigation.replace('Login')}>
            <Text style={styles.skipText}>Non merci, retour à l'accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Form ─────────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}>
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>RDV sans compte</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.headerSub}>Remplissez le formulaire ci-dessous</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">

          {/* Parent info */}
          <SectionHeader icon="person-outline" title="Vos informations" />
          <Field label="Votre nom complet *" error={errors.nomParent}>
            <TextInput
              style={[styles.input, errors.nomParent && styles.inputError]}
              placeholder="Nom et prénom"
              placeholderTextColor={Colors.textLight}
              value={nomParent}
              onChangeText={(v) => { setNomParent(v); setErrors((e) => ({ ...e, nomParent: null })); }}
              autoCapitalize="words"
            />
          </Field>
          <Field label="Numéro de téléphone *" error={errors.telephone}>
            <View style={[styles.phoneRow, errors.telephone && styles.inputError]}>
              <View style={styles.countryBadge}>
                <Text style={styles.countryFlag}>🇲🇦</Text>
                <Text style={styles.countryCode}>+212</Text>
              </View>
              <View style={styles.phoneDivider} />
              <TextInput
                style={styles.phoneInput}
                placeholder="06 12 34 56 78"
                placeholderTextColor={Colors.textLight}
                value={telephone}
                onChangeText={(v) => { setTelephone(v); setErrors((e) => ({ ...e, telephone: null })); }}
                keyboardType="phone-pad"
                maxLength={14}
              />
            </View>
          </Field>

          {/* Child info */}
          <SectionHeader icon="people-outline" title="Informations de l'enfant" />

          {/* Newborn toggle */}
          <TouchableOpacity
            style={[styles.newbornToggle, isNewborn && styles.newbornToggleActive]}
            onPress={() => handleNewbornToggle(!isNewborn)}
            activeOpacity={0.8}
          >
            <View style={styles.newbornLeft}>
              <Text style={styles.newbornEmoji}>👶</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.newbornLabel, isNewborn && { color: Colors.primary }]}>
                  Mon bébé vient de naître
                </Text>
                <Text style={styles.newbornSub}>Moins de 48h — premiers vaccins (BCG, Hépatite B)</Text>
              </View>
            </View>
            <Switch
              value={isNewborn}
              onValueChange={handleNewbornToggle}
              trackColor={{ false: Colors.border, true: Colors.primary + '60' }}
              thumbColor={isNewborn ? Colors.primary : Colors.textLight}
            />
          </TouchableOpacity>

          {isNewborn && (
            <View style={styles.newbornNote}>
              <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
              <Text style={styles.newbornNoteText}>
                Date d'aujourd'hui enregistrée automatiquement. Le prénom peut être ajouté plus tard.
              </Text>
            </View>
          )}

          {!isNewborn && (
            <>
              <Field label="Prénom de l'enfant *" error={errors.prenomBebe}>
                <TextInput
                  style={[styles.input, errors.prenomBebe && styles.inputError]}
                  placeholder="Prénom"
                  placeholderTextColor={Colors.textLight}
                  value={prenomBebe}
                  onChangeText={(v) => { setPrenomBebe(v); setErrors((e) => ({ ...e, prenomBebe: null })); }}
                  autoCapitalize="words"
                />
              </Field>
              <Field label="Date de naissance *" error={errors.dobBebe}>
                <TextInput
                  style={[styles.input, errors.dobBebe && styles.inputError]}
                  placeholder="JJ/MM/AAAA"
                  placeholderTextColor={Colors.textLight}
                  value={dobBebe}
                  onChangeText={(v) => { setDobBebe(v); setErrors((e) => ({ ...e, dobBebe: null })); }}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                />
              </Field>
            </>
          )}

          {isNewborn && (
            <Field label="Prénom (facultatif — si déjà choisi)">
              <TextInput
                style={styles.input}
                placeholder="Facultatif"
                placeholderTextColor={Colors.textLight}
                value={prenomBebe}
                onChangeText={setPrenomBebe}
                autoCapitalize="words"
              />
            </Field>
          )}

          <Field label="Sexe">
            <View style={styles.sexeRow}>
              {[{ k: 'M', label: '♂  Garçon', color: Colors.primary }, { k: 'F', label: '♀  Fille', color: Colors.danger }].map(({ k, label, color }) => (
                <TouchableOpacity
                  key={k}
                  style={[styles.sexeChip, sexeBebe === k && { backgroundColor: color + '18', borderColor: color }]}
                  onPress={() => setSexeBebe(k)}
                >
                  <Text style={[styles.sexeText, sexeBebe === k && { color, fontWeight: '700' }]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          {/* Centre picker — only for newborns (no pre-assigned centre) */}
          {isNewborn && (
            <>
              <SectionHeader icon="location-outline" title="Centre de vaccination" />
              {loadingCentres ? (
                <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.md }} />
              ) : (
                <View style={styles.centreList}>
                  {centres.map((c) => {
                    const active = selCentre?.id === c.id;
                    return (
                      <TouchableOpacity
                        key={String(c.id)}
                        style={[styles.centreRow, active && styles.centreRowActive]}
                        onPress={() => handleCentreSelect(c)}
                        activeOpacity={0.8}
                      >
                        <View style={[styles.centreRadio, active && styles.centreRadioActive]}>
                          {active && <View style={styles.centreRadioDot} />}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.centreName, active && { color: Colors.primary }]}>{c.nom}</Text>
                          {c.adresse ? <Text style={styles.centreAddr}>{c.adresse}</Text> : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* Session picker — visible always (non-newborn) or after centre selected (newborn) */}
          {(!isNewborn || selCentre) && (
            <>
              <SectionHeader
                icon="calendar-outline"
                title={isNewborn ? `Sessions BCG & Hépatite B — ${selCentre?.nom}` : 'Choisir une session'}
              />
              {errors.session && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{errors.session}</Text>
                </View>
              )}
              {loadingSess ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
              ) : sessions.length === 0 ? (
                <View style={styles.noSessions}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.textLight} />
                  <Text style={styles.noSessionsText}>
                    {isNewborn
                      ? 'Aucune session BCG / Hépatite B disponible.\nContactez le centre directement.'
                      : 'Aucune session disponible pour le moment.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.sessionList}>
                  {sessions.map((s) => {
                    const selected = selSession?.id === s.id;
                    const isFull   = s.places_restantes <= 0;
                    return (
                      <TouchableOpacity
                        key={String(s.id)}
                        style={[styles.sessionRow, selected && styles.sessionRowActive]}
                        onPress={() => { setSelSession(s); setErrors((e) => ({ ...e, session: null })); }}
                        activeOpacity={0.8}
                      >
                        <View style={styles.sessionLeft}>
                          <Text style={styles.sessionVaccin}>{s.vaccin_nom}</Text>
                          <Text style={styles.sessionCentre}>{s.centre_nom}</Text>
                          <Text style={styles.sessionMeta}>{formatDate(s.date_session)} · {s.heure_debut} – {s.heure_fin}</Text>
                        </View>
                        <View style={styles.sessionRight}>
                          {isFull
                            ? <Text style={styles.sessionFull}>Liste d'attente</Text>
                            : <Text style={styles.sessionPlaces}>{s.places_restantes} place{s.places_restantes > 1 ? 's' : ''}</Text>
                          }
                          {selected && <Ionicons name="checkmark-circle" size={20} color={Colors.primary} style={{ marginTop: 4 }} />}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {(!isNewborn || selCentre) && (
            <TouchableOpacity
              style={[styles.submitBtn, (submitting || !selSession) && { opacity: 0.55 }]}
              onPress={handleSubmit}
              disabled={submitting || !selSession}
              activeOpacity={0.88}
            >
              <LinearGradient colors={Gradients.brand} style={styles.submitGrad}>
                {submitting
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                      <Text style={styles.submitText}>
                        {selSession && selSession.places_restantes <= 0
                          ? 'Rejoindre la liste d\'attente'
                          : 'Confirmer le rendez-vous'}
                      </Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function SectionHeader({ icon, title }) {
  return (
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={16} color={Colors.primary} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function Field({ label, error, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {error && (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}><Ionicons name={icon} size={16} color={Colors.primary} /></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1, backgroundColor: Colors.background },

  header:    { paddingBottom: Spacing.xl },
  navRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  navBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', paddingBottom: Spacing.sm },

  formScroll: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },

  fieldWrap:   { marginBottom: Spacing.sm },
  fieldLabel:  { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:       { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: 15, color: Colors.text },
  inputError:  { borderColor: Colors.danger },

  phoneRow:     { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  countryBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12 },
  countryFlag:  { fontSize: 18 },
  countryCode:  { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneDivider: { width: 1, height: 26, backgroundColor: Colors.border },
  phoneInput:   { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: Colors.text },

  sexeRow:    { flexDirection: 'row', gap: Spacing.md },
  sexeChip:   { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  sexeText:   { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  errorRow:   { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  errorText:  { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  newbornToggle:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.base, marginBottom: Spacing.sm },
  newbornToggleActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  newbornLeft:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  newbornEmoji:        { fontSize: 26 },
  newbornLabel:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  newbornSub:          { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  newbornNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  newbornNoteText:     { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  centreList:      { gap: Spacing.sm, marginBottom: Spacing.md },
  centreRow:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, ...Elevation.sm },
  centreRowActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:     { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  centreRadioActive:{ borderColor: Colors.primary },
  centreRadioDot:  { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreName:      { fontSize: 14, fontWeight: '700', color: Colors.text },
  centreAddr:      { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  noSessions:     { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['2xl'] },
  noSessionsText: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },

  sessionList:     { gap: Spacing.sm, marginBottom: Spacing.lg },
  sessionRow:      { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: 'transparent', ...Elevation.sm },
  sessionRowActive:{ backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  sessionLeft:     { flex: 1, gap: 3 },
  sessionVaccin:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  sessionCentre:   { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sessionMeta:     { fontSize: 11, color: Colors.textLight },
  sessionRight:    { alignItems: 'flex-end', marginLeft: Spacing.sm },
  sessionPlaces:   { fontSize: 12, fontWeight: '700', color: Colors.success },
  sessionFull:     { fontSize: 11, fontWeight: '700', color: Colors.accent },

  submitBtn:  { borderRadius: Radii.xl, overflow: 'hidden', marginTop: Spacing.lg },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  // Confirmation screen
  confirmHeader:  { paddingTop: 60, paddingBottom: Spacing['3xl'], alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  confirmIconWrap:{ width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.glass, alignItems: 'center', justifyContent: 'center' },
  confirmTitle:   { fontSize: 26, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  confirmSub:     { fontSize: 14, color: 'rgba(255,255,255,0.80)', textAlign: 'center', lineHeight: 20 },

  confirmBody:  { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  card:         { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardLabel:    { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.md },
  noteCard:     { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', backgroundColor: Colors.primaryTint, borderRadius: Radii.xl },
  noteText:     { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 20 },

  infoRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:     { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel:    { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue:    { fontSize: 14, fontWeight: '700', color: Colors.text },

  loginCta:     { borderRadius: Radii.xl, overflow: 'hidden', ...Elevation.sm },
  loginCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  loginCtaText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  skipLink:     { alignItems: 'center', paddingVertical: Spacing.md },
  skipText:     { fontSize: 13, color: Colors.textSecondary },
});
