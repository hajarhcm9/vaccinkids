import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView,
  Platform, StatusBar, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { authService, ApiError } from '../../services';

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalizePhone(p) {
  const c = p.replace(/\s/g, '');
  return c.startsWith('0') ? '+212' + c.slice(1) : c;
}

function formatPhoneDisplay(p) {
  const n = normalizePhone(p);
  if (n.startsWith('+212') && n.length === 13) {
    const d = n.slice(4);
    return `+212 ${d[0]} ${d.slice(1, 3)} ${d.slice(3, 5)} ${d.slice(5, 7)} ${d.slice(7, 9)}`;
  }
  return n;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateShort(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long',
  });
}

function formatHeure(debut, fin) {
  if (!debut) return '—';
  return fin ? `${debut} – ${fin}` : debut;
}

function dobPartsToIso(dd, mm, yyyy) {
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function validateDobParts(dd, mm, yyyy) {
  const d = parseInt(dd, 10), m = parseInt(mm, 10), y = parseInt(yyyy, 10);
  if (!dd || !mm || !yyyy || isNaN(d) || isNaN(m) || isNaN(y)) return false;
  if (d < 1 || d > 31 || m < 1 || m > 12) return false;
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return false;
  return parsed <= new Date();
}

function groupByDate(sessions) {
  const map = {};
  sessions.forEach((s) => {
    const key = s.date_session ? s.date_session.split('T')[0] : 'unknown';
    if (!map[key]) map[key] = [];
    map[key].push(s);
  });
  return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
}

// ── DatePicker ────────────────────────────────────────────────────────────────

function DatePicker({ dd, mm, yyyy, onChange, error }) {
  const refMm   = useRef(null);
  const refYyyy = useRef(null);

  const borderColor = error ? Colors.danger : Colors.border;
  return (
    <View style={dpStyles.row}>
      <View style={[dpStyles.box, dpStyles.boxSm, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Jour</Text>
        <TextInput
          style={dpStyles.boxInput}
          placeholder="JJ"
          placeholderTextColor={Colors.textLight}
          value={dd}
          onChangeText={(v) => {
            const raw = v.replace(/\D/g, '').slice(0, 2);
            onChange(raw, mm, yyyy);
            if (raw.length === 2) refMm.current?.focus();
          }}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="next"
          onSubmitEditing={() => refMm.current?.focus()}
          selectTextOnFocus
        />
      </View>
      <Text style={dpStyles.sep}>/</Text>
      <View style={[dpStyles.box, dpStyles.boxSm, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Mois</Text>
        <TextInput
          ref={refMm}
          style={dpStyles.boxInput}
          placeholder="MM"
          placeholderTextColor={Colors.textLight}
          value={mm}
          onChangeText={(v) => {
            const raw = v.replace(/\D/g, '').slice(0, 2);
            onChange(dd, raw, yyyy);
            if (raw.length === 2) refYyyy.current?.focus();
          }}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="next"
          onSubmitEditing={() => refYyyy.current?.focus()}
          selectTextOnFocus
        />
      </View>
      <Text style={dpStyles.sep}>/</Text>
      <View style={[dpStyles.box, dpStyles.boxLg, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Année</Text>
        <TextInput
          ref={refYyyy}
          style={dpStyles.boxInput}
          placeholder="AAAA"
          placeholderTextColor={Colors.textLight}
          value={yyyy}
          onChangeText={(v) => onChange(dd, mm, v.replace(/\D/g, '').slice(0, 4))}
          keyboardType="number-pad"
          maxLength={4}
          returnKeyType="done"
          selectTextOnFocus
        />
      </View>
    </View>
  );
}

const dpStyles = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'flex-end', gap: 0 },
  sep:      { fontSize: 22, color: Colors.textLight, paddingBottom: 6, marginHorizontal: 4 },
  box:      { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, alignItems: 'center', paddingTop: 6, paddingBottom: 4 },
  boxSm:    { flex: 1 },
  boxLg:    { flex: 2 },
  boxLabel: { fontSize: 10, fontWeight: '700', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  boxInput: { fontSize: 20, fontWeight: '700', color: Colors.text, textAlign: 'center', paddingVertical: 6, width: '100%' },
});

// ── StepIndicator ─────────────────────────────────────────────────────────────

const STEP_LABELS = ['Vous', "L'enfant", 'Session'];

function StepIndicator({ step }) {
  return (
    <View style={siStyles.row}>
      {STEP_LABELS.map((label, i) => {
        const n    = i + 1;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={n}>
            <View style={siStyles.item}>
              <View style={[siStyles.dot, active && siStyles.dotActive, done && siStyles.dotDone]}>
                {done
                  ? <Ionicons name="checkmark" size={12} color={Colors.white} />
                  : <Text style={[siStyles.dotNum, active && siStyles.dotNumActive]}>{n}</Text>
                }
              </View>
              <Text style={[siStyles.label, active && siStyles.labelActive, done && siStyles.labelDone]}>
                {label}
              </Text>
            </View>
            {n < 3 && (
              <View style={[siStyles.line, done && siStyles.lineDone]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const siStyles = StyleSheet.create({
  row:          { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg },
  item:         { alignItems: 'center', gap: 6, width: 64 },
  dot:          { width: 30, height: 30, borderRadius: 15, backgroundColor: 'rgba(255,255,255,0.20)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)', alignItems: 'center', justifyContent: 'center' },
  dotActive:    { backgroundColor: Colors.white, borderColor: Colors.white },
  dotDone:      { backgroundColor: Colors.success, borderColor: Colors.success },
  dotNum:       { fontSize: 13, fontWeight: '800', color: 'rgba(255,255,255,0.65)' },
  dotNumActive: { color: Colors.primary },
  label:        { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.55)', textAlign: 'center' },
  labelActive:  { color: Colors.white, fontWeight: '800' },
  labelDone:    { color: 'rgba(255,255,255,0.75)' },
  line:         { flex: 1, height: 2, backgroundColor: 'rgba(255,255,255,0.20)', marginTop: 14, marginHorizontal: -4 },
  lineDone:     { backgroundColor: Colors.success },
});

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionTitle({ icon, title, sub }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionTitleIcon}>
        <Ionicons name={icon} size={18} color={Colors.primary} />
      </View>
      <View>
        <Text style={styles.sectionTitleText}>{title}</Text>
        {sub ? <Text style={styles.sectionTitleSub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

function Field({ label, helper, error, children }) {
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {helper && !error ? (
        <Text style={styles.fieldHelper}>{helper}</Text>
      ) : null}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

function InfoRow({ icon, label, value, highlight }) {
  return (
    <View style={[styles.infoRow, highlight && styles.infoRowHighlight]}>
      <View style={[styles.infoIcon, highlight && styles.infoIconHighlight]}>
        <Ionicons name={icon} size={16} color={highlight ? Colors.white : Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.infoLabel, highlight && styles.infoLabelHighlight]}>{label}</Text>
        <Text style={[styles.infoValue, highlight && styles.infoValueHighlight]}>{value || '—'}</Text>
      </View>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function GuestRdvScreen({ navigation }) {
  const insets    = useSafeAreaInsets();
  const scrollRef = useRef(null);

  // Wizard step
  const [step, setStep] = useState(1);

  // Sessions & centres
  const [sessions,       setSessions]      = useState([]);
  const [loadingSess,    setLoadingSess]    = useState(false);
  const [sessError,      setSessError]      = useState(false);
  const [centres,        setCentres]        = useState([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [selCentre,      setSelCentre]      = useState(null);

  // Parent fields
  const [nomParent, setNomParent] = useState('');
  const [telephone, setTelephone] = useState('');
  const [cin,       setCin]       = useState('');

  // Child fields
  const [isNewborn,  setIsNewborn]  = useState(false);
  const [prenomBebe, setPrenomBebe] = useState('');
  const [nomBebe,    setNomBebe]    = useState('');
  const [dobDD,      setDobDD]      = useState('');
  const [dobMM,      setDobMM]      = useState('');
  const [dobYYYY,    setDobYYYY]    = useState('');
  const [sexeBebe,   setSexeBebe]   = useState('M');

  // Booking
  const [selSession, setSelSession] = useState(null);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [confirmed,  setConfirmed]  = useState(null);

  // Race-condition guard
  const loadReqRef = useRef(0);

  // Keyboard refs
  const refTel    = useRef(null);
  const refCin    = useRef(null);
  const refPrenom = useRef(null);
  const refNom    = useRef(null);

  // ── Sessions ────────────────────────────────────────────────────────────────

  const loadSessions = useCallback((newborn, centreId) => {
    const reqId = ++loadReqRef.current;
    setLoadingSess(true);
    setSessError(false);
    setSelSession(null);
    authService.listGuestSessions({ newborn, centre_id: centreId })
      .then((data) => {
        if (reqId !== loadReqRef.current) return;
        setSessions(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (reqId !== loadReqRef.current) return;
        setSessions([]);
        setSessError(true);
      })
      .finally(() => {
        if (reqId !== loadReqRef.current) return;
        setLoadingSess(false);
      });
  }, []);

  // Load sessions when entering step 3
  useEffect(() => {
    if (step !== 3) return;
    if (!isNewborn) {
      loadSessions(false, null);
    } else if (selCentre) {
      loadSessions(true, selCentre.id);
    }
  }, [step]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Newborn toggle ───────────────────────────────────────────────────────────

  const handleNewbornToggle = (val) => {
    setIsNewborn(val);
    setSelCentre(null);
    setSelSession(null);
    setSessions([]);
    setSessError(false);
    setErrors((e) => ({ ...e, centre: null, session: null }));
    if (val && centres.length === 0) {
      setLoadingCentres(true);
      authService.listPublicCentres()
        .then((d) => {
          const list = Array.isArray(d) ? d : [];
          setCentres(list);
          if (list.length === 1) setSelCentre(list[0]);
        })
        .catch(() => {})
        .finally(() => setLoadingCentres(false));
    } else if (val && centres.length === 1 && !selCentre) {
      setSelCentre(centres[0]);
    }
  };

  const handleCentreSelect = (centre) => {
    setSelCentre(centre);
    setErrors((e) => ({ ...e, centre: null }));
    loadSessions(true, centre.id);
  };

  // ── Per-step validation ──────────────────────────────────────────────────────

  const validateStep = (n) => {
    const e = {};
    if (n === 1) {
      if (!nomParent.trim()) e.nomParent = 'Votre nom est obligatoire';
      const clean = telephone.replace(/\s/g, '');
      if (!/^(\+212|0)[5-7]\d{8}$/.test(clean)) e.telephone = 'Numéro invalide (ex : 0612 345 678)';
      if (!cin.trim() || cin.trim().length < 3) e.cin = 'CIN invalide';
    }
    if (n === 2) {
      if (!isNewborn) {
        if (!prenomBebe.trim()) e.prenomBebe = "Prénom de l'enfant obligatoire";
        if (!validateDobParts(dobDD, dobMM, dobYYYY)) e.dobBebe = 'Date de naissance invalide ou dans le futur';
      }
    }
    if (n === 3) {
      if (isNewborn && !selCentre) e.centre = 'Choisissez un centre de vaccination';
      if (!selSession) e.session = 'Choisissez une session';
    }
    return e;
  };

  const handleNext = () => {
    const e = validateStep(step);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setStep((s) => s + 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  // ── Submit ───────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const e = validateStep(3);
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const dobStr = isNewborn ? undefined : dobPartsToIso(dobDD, dobMM, dobYYYY);
      const resp = await authService.createGuestRdv({
        nom_parent:          nomParent.trim(),
        telephone:           normalizePhone(telephone),
        cin:                 cin.trim().toUpperCase(),
        prenom_bebe:         prenomBebe.trim() || undefined,
        nom_bebe:            isNewborn ? undefined : (nomBebe.trim() || undefined),
        date_naissance_bebe: dobStr,
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

  // ── Confirmation ─────────────────────────────────────────────────────────────

  if (confirmed) {
    const rdv       = confirmed.rdv ?? {};
    const isWaiting = rdv.en_attente === true;
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={isWaiting ? Gradients.accent : ['#12A150', '#17C964']}
          style={[styles.confirmHeader, { paddingTop: insets.top + Spacing.xl }]}
        >
          <View style={styles.confirmIconWrap}>
            <Ionicons name={isWaiting ? 'hourglass-outline' : 'checkmark-circle'} size={48} color={Colors.white} />
          </View>
          <Text style={styles.confirmTitle}>
            {isWaiting ? "Liste d'attente" : 'Rendez-vous confirmé !'}
          </Text>
          <Text style={styles.confirmSub}>{confirmed.message}</Text>
        </LinearGradient>

        <ScrollView contentContainerStyle={styles.confirmBody}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Détails du rendez-vous</Text>
            <InfoRow icon="medkit-outline"   label="Vaccin"  value={rdv.vaccin_nom} />
            <InfoRow
              icon="person-outline"
              label="Enfant"
              value={[rdv.bebe_prenom, rdv.bebe_nom].filter(Boolean).join(' ') || '—'}
            />
            {rdv.bebe_numero_centre != null && (
              <InfoRow
                icon="card-outline"
                label="Numéro de dossier — à conserver"
                value={`#${rdv.bebe_numero_centre}`}
                highlight
              />
            )}
            <InfoRow icon="calendar-outline" label="Date"   value={formatDate(rdv.date_session)} />
            <InfoRow icon="time-outline"     label="Heure"  value={formatHeure(rdv.heure_debut, rdv.heure_fin)} />
            <InfoRow icon="location-outline" label="Centre" value={rdv.centre_nom} />
            {rdv.id && (
              <InfoRow icon="receipt-outline" label="Référence" value={`RDV-${rdv.id}`} />
            )}
          </View>

          {isWaiting && (
            <View style={[styles.card, styles.waitCard]}>
              <Ionicons name="hourglass-outline" size={18} color={Colors.accent} />
              <Text style={styles.waitText}>
                Vous êtes en liste d'attente. Le centre vous contactera si une place se libère.
              </Text>
            </View>
          )}

          <View style={[styles.card, styles.noteCard]}>
            <Ionicons name="call-outline" size={20} color={Colors.primary} />
            <Text style={styles.noteText}>
              Le centre vous contactera au{' '}
              <Text style={{ fontWeight: '800' }}>{formatPhoneDisplay(telephone)}</Text>
              {' '}pour confirmation.
            </Text>
          </View>

          <TouchableOpacity
            style={styles.loginCta}
            onPress={() => navigation.replace('Login', {
              prefillNumero: rdv.bebe_numero_centre,
              prefillCin:    cin.trim().toUpperCase(),
            })}
          >
            <LinearGradient colors={Gradients.brand} style={styles.loginCtaGrad}>
              <Ionicons name="person-add-outline" size={18} color={Colors.white} />
              <Text style={styles.loginCtaText}>Créer un compte pour suivre les vaccins</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.anotherBtn}
            onPress={() => {
              setConfirmed(null);
              setStep(1);
              setNomParent(''); setTelephone(''); setCin('');
              setPrenomBebe(''); setNomBebe('');
              setDobDD(''); setDobMM(''); setDobYYYY('');
              setSexeBebe('M'); setIsNewborn(false);
              setSelSession(null); setSelCentre(null);
              setSessions([]); setErrors({});
            }}
          >
            <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
            <Text style={styles.anotherBtnText}>Réserver pour un autre enfant</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.skipLink} onPress={() => navigation.replace('Login')}>
            <Text style={styles.skipText}>Retour à l'accueil</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────────

  const isBtnDisabled = step === 3 && (submitting || !selSession || (isNewborn && !selCentre));
  const grouped = groupByDate(sessions);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient
        colors={Gradients.brandWide}
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => step > 1 ? handleBack() : navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <View style={{ flex: 1, alignItems: 'center' }}>
            <Text style={styles.navTitle}>RDV sans compte</Text>
            <Text style={styles.navSub}>Vaccination · Maroc</Text>
          </View>
          <View style={{ width: 38 }} />
        </View>
        <StepIndicator step={step} />
      </LinearGradient>

      {/* ── Keyboard + Scroll ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.formScroll}
          keyboardShouldPersistTaps="always"
          showsVerticalScrollIndicator={false}
        >

          {/* ════════════════════════════════════════════════
              STEP 1 — Vos informations
          ════════════════════════════════════════════════ */}
          {step === 1 && (
            <>
              <SectionTitle
                icon="person-circle-outline"
                title="Vos informations"
                sub="En tant que parent ou tuteur légal"
              />

              <Field label="Nom complet *" error={errors.nomParent}>
                <TextInput
                  style={[styles.input, errors.nomParent && styles.inputError]}
                  placeholder="Nom et prénom"
                  placeholderTextColor={Colors.textLight}
                  value={nomParent}
                  onChangeText={(v) => { setNomParent(v); setErrors((e) => ({ ...e, nomParent: null })); }}
                  autoCapitalize="words"
                  returnKeyType="next"
                  onSubmitEditing={() => refTel.current?.focus()}
                />
              </Field>

              <Field label="Téléphone *" error={errors.telephone}>
                <View style={[styles.phoneRow, errors.telephone && styles.phoneRowError]}>
                  <View style={styles.countryBadge}>
                    <Text style={styles.countryFlag}>🇲🇦</Text>
                    <Text style={styles.countryCode}>+212</Text>
                  </View>
                  <View style={styles.phoneDivider} />
                  <TextInput
                    ref={refTel}
                    style={styles.phoneInput}
                    placeholder="06 12 34 56 78"
                    placeholderTextColor={Colors.textLight}
                    value={telephone}
                    onChangeText={(v) => { setTelephone(v); setErrors((e) => ({ ...e, telephone: null })); }}
                    keyboardType="phone-pad"
                    maxLength={14}
                    returnKeyType="next"
                    onSubmitEditing={() => refCin.current?.focus()}
                  />
                </View>
              </Field>

              <Field
                label="Numéro CIN *"
                helper="Votre CIN servira à créer votre compte et à accéder au carnet de vaccination de votre enfant."
                error={errors.cin}
              >
                <TextInput
                  ref={refCin}
                  style={[styles.input, errors.cin && styles.inputError]}
                  placeholder="Ex : AB123456"
                  placeholderTextColor={Colors.textLight}
                  value={cin}
                  onChangeText={(v) => { setCin(v.toUpperCase()); setErrors((e) => ({ ...e, cin: null })); }}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={12}
                  returnKeyType="done"
                />
              </Field>
            </>
          )}

          {/* ════════════════════════════════════════════════
              STEP 2 — L'enfant
          ════════════════════════════════════════════════ */}
          {step === 2 && (
            <>
              <SectionTitle
                icon="happy-outline"
                title="Votre enfant"
                sub="Informations nécessaires pour le dossier vaccinal"
              />

              {/* Nouveau-né toggle */}
              <TouchableOpacity
                style={[styles.newbornToggle, isNewborn && styles.newbornToggleActive]}
                onPress={() => handleNewbornToggle(!isNewborn)}
                activeOpacity={0.85}
              >
                <View style={styles.newbornLeft}>
                  <Text style={styles.newbornEmoji}>👶</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.newbornLabel, isNewborn && { color: Colors.primary }]}>
                      Mon bébé vient de naître
                    </Text>
                    <Text style={styles.newbornSub}>
                      Moins de 48h — premiers vaccins (BCG, Hépatite B)
                    </Text>
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
                    Date d'aujourd'hui enregistrée automatiquement. Vous pourrez compléter le profil après la naissance.
                  </Text>
                </View>
              )}

              {/* Champs enfant (non nouveau-né) */}
              {!isNewborn && (
                <>
                  <Field label="Prénom *" error={errors.prenomBebe}>
                    <TextInput
                      ref={refPrenom}
                      style={[styles.input, errors.prenomBebe && styles.inputError]}
                      placeholder="Prénom de l'enfant"
                      placeholderTextColor={Colors.textLight}
                      value={prenomBebe}
                      onChangeText={(v) => { setPrenomBebe(v); setErrors((e) => ({ ...e, prenomBebe: null })); }}
                      autoCapitalize="words"
                      returnKeyType="next"
                      onSubmitEditing={() => refNom.current?.focus()}
                    />
                  </Field>
                  <Field label="Nom de famille (facultatif)">
                    <TextInput
                      ref={refNom}
                      style={styles.input}
                      placeholder="Nom de famille"
                      placeholderTextColor={Colors.textLight}
                      value={nomBebe}
                      onChangeText={setNomBebe}
                      autoCapitalize="words"
                      returnKeyType="done"
                    />
                  </Field>
                  <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>Date de naissance *</Text>
                    <DatePicker
                      dd={dobDD} mm={dobMM} yyyy={dobYYYY}
                      onChange={(d, m, y) => { setDobDD(d); setDobMM(m); setDobYYYY(y); setErrors((e) => ({ ...e, dobBebe: null })); }}
                      error={errors.dobBebe}
                    />
                    {errors.dobBebe && (
                      <View style={styles.errorRow}>
                        <Ionicons name="alert-circle-outline" size={12} color={Colors.danger} />
                        <Text style={styles.errorText}>{errors.dobBebe}</Text>
                      </View>
                    )}
                  </View>
                </>
              )}

              {/* Prénom facultatif nouveau-né */}
              {isNewborn && (
                <Field label="Prénom (facultatif — si déjà choisi)">
                  <TextInput
                    ref={refPrenom}
                    style={styles.input}
                    placeholder="Facultatif"
                    placeholderTextColor={Colors.textLight}
                    value={prenomBebe}
                    onChangeText={setPrenomBebe}
                    autoCapitalize="words"
                    returnKeyType="done"
                  />
                </Field>
              )}

              <Field label="Sexe">
                <View style={styles.sexeRow}>
                  {[
                    { k: 'M', label: '♂  Garçon', color: Colors.primary },
                    { k: 'F', label: '♀  Fille',  color: Colors.danger  },
                  ].map(({ k, label, color }) => (
                    <TouchableOpacity
                      key={k}
                      style={[styles.sexeChip, sexeBebe === k && { backgroundColor: color + '18', borderColor: color }]}
                      onPress={() => setSexeBebe(k)}
                    >
                      <Text style={[styles.sexeText, sexeBebe === k && { color, fontWeight: '800' }]}>
                        {label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </Field>
            </>
          )}

          {/* ════════════════════════════════════════════════
              STEP 3 — Session
          ════════════════════════════════════════════════ */}
          {step === 3 && (
            <>
              {/* Centre selector (newborn only) */}
              {isNewborn && (
                <>
                  <SectionTitle
                    icon="location-outline"
                    title="Centre de vaccination"
                    sub="Choisissez le centre le plus proche"
                  />
                  {errors.centre && (
                    <View style={[styles.errorRow, { marginBottom: Spacing.sm }]}>
                      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                      <Text style={styles.errorText}>{errors.centre}</Text>
                    </View>
                  )}
                  {loadingCentres ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.lg }} />
                  ) : centres.length === 0 ? (
                    <Text style={styles.emptyText}>Aucun centre disponible pour le moment.</Text>
                  ) : (
                    <View style={styles.centreList}>
                      {centres.map((c) => {
                        const active = selCentre?.id === c.id;
                        return (
                          <TouchableOpacity
                            key={String(c.id)}
                            style={[styles.centreRow, active && styles.centreRowActive]}
                            onPress={() => handleCentreSelect(c)}
                            activeOpacity={0.75}
                          >
                            <View style={[styles.centreRadio, active && styles.centreRadioActive]}>
                              {active && <View style={styles.centreRadioDot} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.centreName, active && { color: Colors.primary }]}>{c.nom}</Text>
                              {c.adresse ? <Text style={styles.centreAddr}>{c.adresse}</Text> : null}
                            </View>
                            {active && <Ionicons name="checkmark-circle" size={18} color={Colors.primary} />}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </>
              )}

              {/* Sessions */}
              {(!isNewborn || selCentre) && (
                <>
                  <SectionTitle
                    icon="calendar-outline"
                    title={isNewborn ? `Sessions — ${selCentre?.nom}` : 'Choisir une session'}
                    sub="Sélectionnez la date qui vous convient"
                  />
                  {errors.session && (
                    <View style={[styles.errorRow, { marginBottom: Spacing.sm }]}>
                      <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                      <Text style={styles.errorText}>{errors.session}</Text>
                    </View>
                  )}

                  {loadingSess ? (
                    <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.xl }} />
                  ) : sessError ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="wifi-outline" size={36} color={Colors.danger} />
                      <Text style={styles.emptyStateTitle}>Connexion impossible</Text>
                      <Text style={styles.emptyText}>Vérifiez votre connexion et réessayez.</Text>
                      <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={() => loadSessions(isNewborn, selCentre?.id ?? null)}
                      >
                        <Text style={styles.retryText}>Réessayer</Text>
                      </TouchableOpacity>
                    </View>
                  ) : sessions.length === 0 ? (
                    <View style={styles.emptyState}>
                      <Ionicons name="calendar-outline" size={36} color={Colors.textLight} />
                      <Text style={styles.emptyStateTitle}>Aucune session disponible</Text>
                      <Text style={styles.emptyText}>
                        {isNewborn
                          ? 'Contactez directement le centre pour prendre rendez-vous.'
                          : 'Aucune session ouverte pour le moment. Réessayez plus tard.'}
                      </Text>
                    </View>
                  ) : (
                    <View style={styles.sessionList}>
                      {grouped.map(([dateKey, items]) => (
                        <View key={dateKey}>
                          {/* Date group header */}
                          <View style={styles.dateGroupHeader}>
                            <View style={styles.dateGroupLine} />
                            <Text style={styles.dateGroupLabel}>{formatDateShort(dateKey)}</Text>
                            <View style={styles.dateGroupLine} />
                          </View>

                          {items.map((s) => {
                            const selected = selSession?.id === s.id;
                            const isFull   = (s.places_restantes ?? 1) <= 0;
                            const placesLow = !isFull && s.places_restantes <= 3;
                            return (
                              <TouchableOpacity
                                key={String(s.id)}
                                style={[
                                  styles.sessionRow,
                                  selected && styles.sessionRowActive,
                                ]}
                                onPress={() => {
                                  setSelSession(s);
                                  setErrors((e) => ({ ...e, session: null }));
                                }}
                                activeOpacity={0.75}
                              >
                                <View style={[styles.selDot, selected && styles.selDotActive]}>
                                  {selected && <View style={styles.selDotInner} />}
                                </View>

                                <View style={styles.sessionLeft}>
                                  <Text style={[styles.sessionVaccin, selected && { color: Colors.primary }]}>
                                    {s.vaccin_nom}
                                  </Text>
                                  {!isNewborn && s.centre_nom ? (
                                    <Text style={styles.sessionCentre}>{s.centre_nom}</Text>
                                  ) : null}
                                  <View style={styles.sessionMeta}>
                                    <Ionicons name="time-outline" size={12} color={Colors.textLight} />
                                    <Text style={styles.sessionMetaText}>
                                      {formatHeure(s.heure_debut, s.heure_fin)}
                                    </Text>
                                  </View>
                                </View>

                                <View style={styles.sessionRight}>
                                  {isFull ? (
                                    <View style={styles.badgeFull}>
                                      <Text style={styles.badgeFullText}>Liste{'\n'}d'attente</Text>
                                    </View>
                                  ) : (
                                    <View style={[styles.badgePlaces, placesLow && styles.badgePlacesLow]}>
                                      <Text style={[styles.badgePlacesNum, placesLow && { color: Colors.warning }]}>
                                        {s.places_restantes}
                                      </Text>
                                      <Text style={[styles.badgePlacesLbl, placesLow && { color: Colors.warning }]}>
                                        place{s.places_restantes > 1 ? 's' : ''}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ))}
                    </View>
                  )}
                </>
              )}
            </>
          )}

          {/* ── Navigation buttons ── */}
          <View style={styles.navButtons}>
            {step > 1 && (
              <TouchableOpacity style={styles.backBtn} onPress={handleBack} activeOpacity={0.8}>
                <Ionicons name="arrow-back" size={18} color={Colors.textSecondary} />
                <Text style={styles.backBtnText}>Retour</Text>
              </TouchableOpacity>
            )}

            {step < 3 ? (
              <TouchableOpacity
                style={[styles.nextBtn, step === 1 && { flex: 1 }]}
                onPress={handleNext}
                activeOpacity={0.88}
              >
                <LinearGradient colors={Gradients.brand} style={styles.nextBtnGrad}>
                  <Text style={styles.nextBtnText}>Suivant</Text>
                  <Ionicons name="arrow-forward" size={18} color={Colors.white} />
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextBtn, { opacity: isBtnDisabled ? 0.5 : 1 }]}
                onPress={handleSubmit}
                disabled={isBtnDisabled}
                activeOpacity={0.88}
              >
                <LinearGradient colors={Gradients.brand} style={styles.nextBtnGrad}>
                  {submitting ? (
                    <ActivityIndicator color={Colors.white} size="small" />
                  ) : (
                    <>
                      <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                      <Text style={styles.nextBtnText}>
                        {selSession && (selSession.places_restantes ?? 1) <= 0
                          ? "Rejoindre la liste d'attente"
                          : 'Confirmer le rendez-vous'}
                      </Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:   { paddingBottom: Spacing.sm },
  navRow:   { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  navBtn:   { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontSize: 16, fontWeight: '800', color: Colors.white },
  navSub:   { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 1 },

  formScroll: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  // Section title
  sectionTitle:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.xl, padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], ...Elevation.sm },
  sectionTitleIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  sectionTitleText: { fontSize: 17, fontWeight: '800', color: Colors.text, marginBottom: 2 },
  sectionTitleSub:  { fontSize: 12, color: Colors.textSecondary },

  // Fields
  fieldWrap:   { marginBottom: Spacing.lg },
  fieldLabel:  { fontSize: 13, fontWeight: '700', color: Colors.text, marginBottom: 7 },
  fieldHelper: { fontSize: 12, color: Colors.textSecondary, lineHeight: 17, marginTop: 6, paddingLeft: 2 },
  input:       { backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.lg, paddingVertical: 14, fontSize: 15, color: Colors.text },
  inputError:  { borderColor: Colors.danger },

  phoneRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  phoneRowError: { borderColor: Colors.danger },
  countryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 14 },
  countryFlag:   { fontSize: 18 },
  countryCode:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneDivider:  { width: 1, height: 26, backgroundColor: Colors.border },
  phoneInput:    { flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 15, color: Colors.text },

  sexeRow:  { flexDirection: 'row', gap: Spacing.md },
  sexeChip: { flex: 1, paddingVertical: 14, alignItems: 'center', borderRadius: Radii.xl, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  sexeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 5 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1 },

  // Newborn
  newbornToggle:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radii['2xl'], borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.lg, marginBottom: Spacing.md },
  newbornToggleActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  newbornLeft:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flex: 1 },
  newbornEmoji:        { fontSize: 26 },
  newbornLabel:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  newbornSub:          { fontSize: 11, color: Colors.textSecondary, marginTop: 3, lineHeight: 16 },
  newbornNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryTint, borderRadius: Radii.xl, padding: Spacing.md, marginBottom: Spacing.lg },
  newbornNoteText:     { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  // Centre
  centreList:        { gap: Spacing.sm, marginBottom: Spacing.xl },
  centreRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], borderWidth: 1.5, borderColor: Colors.border },
  centreRowActive:   { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:       { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  centreRadioActive: { borderColor: Colors.primary },
  centreRadioDot:    { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  centreName:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  centreAddr:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  // Sessions
  sessionList: { gap: 0, marginBottom: Spacing.lg },

  dateGroupHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginVertical: Spacing.lg },
  dateGroupLine:   { flex: 1, height: 1, backgroundColor: Colors.border },
  dateGroupLabel:  { fontSize: 12, fontWeight: '800', color: Colors.textSecondary, textTransform: 'capitalize' },

  sessionRow:       { flexDirection: 'row', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], borderWidth: 1.5, borderColor: 'transparent', marginBottom: Spacing.sm, ...Elevation.sm },
  sessionRowActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  selDot:           { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.md, flexShrink: 0 },
  selDotActive:     { borderColor: Colors.primary },
  selDotInner:      { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  sessionLeft:      { flex: 1, gap: 4 },
  sessionVaccin:    { fontSize: 15, fontWeight: '700', color: Colors.text },
  sessionCentre:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sessionMeta:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionMetaText:  { fontSize: 12, color: Colors.textLight },
  sessionRight:     { marginLeft: Spacing.md, alignItems: 'flex-end' },
  badgePlaces:      { alignItems: 'center', backgroundColor: Colors.successBg, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 5, minWidth: 46 },
  badgePlacesLow:   { backgroundColor: Colors.warningBg },
  badgePlacesNum:   { fontSize: 18, fontWeight: '800', color: Colors.success, lineHeight: 22 },
  badgePlacesLbl:   { fontSize: 9, fontWeight: '700', color: Colors.success },
  badgeFull:        { backgroundColor: Colors.accentLight, borderRadius: Radii.md, paddingHorizontal: 8, paddingVertical: 5, alignItems: 'center' },
  badgeFullText:    { fontSize: 10, fontWeight: '700', color: Colors.accent, textAlign: 'center', lineHeight: 14 },

  // Empty states
  emptyState:      { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['3xl'], paddingHorizontal: Spacing.xl },
  emptyStateTitle: { fontSize: 16, fontWeight: '800', color: Colors.text },
  emptyText:       { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  retryBtn:        { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: Radii.pill },
  retryText:       { color: Colors.white, fontWeight: '700', fontSize: 14 },

  // Nav buttons
  navButtons: { flexDirection: 'row', gap: Spacing.md, marginTop: Spacing.xl },
  backBtn:    { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: Spacing.lg, paddingVertical: 14, backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.border },
  backBtnText:{ fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  nextBtn:    { flex: 1, borderRadius: Radii.xl, overflow: 'hidden' },
  nextBtnGrad:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16 },
  nextBtnText:{ fontSize: 16, fontWeight: '800', color: Colors.white },

  // Confirmation
  confirmHeader:   { paddingBottom: Spacing['3xl'], alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
  confirmIconWrap: { width: 90, height: 90, borderRadius: 45, backgroundColor: Colors.glass, alignItems: 'center', justifyContent: 'center' },
  confirmTitle:    { fontSize: 26, fontWeight: '800', color: Colors.white, textAlign: 'center' },
  confirmSub:      { fontSize: 14, color: 'rgba(255,255,255,0.80)', textAlign: 'center', lineHeight: 20 },
  confirmBody:     { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardLabel: { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.md },
  waitCard:  { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', backgroundColor: Colors.accentLight },
  waitText:  { flex: 1, fontSize: 13, color: Colors.accent, lineHeight: 19, fontWeight: '500' },
  noteCard:  { flexDirection: 'row', gap: Spacing.md, alignItems: 'flex-start', backgroundColor: Colors.primaryTint },
  noteText:  { flex: 1, fontSize: 13, color: Colors.primary, lineHeight: 20 },

  infoRow:            { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoRowHighlight:   { backgroundColor: Colors.primaryTint, borderRadius: Radii.md, borderBottomWidth: 0, paddingHorizontal: Spacing.sm, marginHorizontal: -Spacing.sm, marginVertical: 4 },
  infoIcon:           { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoIconHighlight:  { backgroundColor: Colors.primary },
  infoLabel:          { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoLabelHighlight: { color: Colors.primary, fontWeight: '700' },
  infoValue:          { fontSize: 14, fontWeight: '700', color: Colors.text },
  infoValueHighlight: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  loginCta:     { borderRadius: Radii.xl, overflow: 'hidden', ...Elevation.sm },
  loginCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  loginCtaText: { fontSize: 15, fontWeight: '700', color: Colors.white },

  anotherBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.primary + '50', paddingVertical: 14 },
  anotherBtnText: { fontSize: 14, fontWeight: '700', color: Colors.primary },

  skipLink: { alignItems: 'center', paddingVertical: Spacing.md },
  skipText: { fontSize: 13, color: Colors.textSecondary },
});
