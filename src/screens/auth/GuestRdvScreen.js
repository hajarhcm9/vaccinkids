import React, { useState, useEffect, useRef } from 'react';
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

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatHeure(debut, fin) {
  if (!debut) return '—';
  return fin ? `${debut} – ${fin}` : debut;
}

function dobPartsToIso(dd, mm, yyyy) {
  const d = dd.padStart(2, '0');
  const m = mm.padStart(2, '0');
  return `${d}/${m}/${yyyy}`;
}

function validateDobParts(dd, mm, yyyy) {
  const d = parseInt(dd, 10);
  const m = parseInt(mm, 10);
  const y = parseInt(yyyy, 10);
  if (!dd || !mm || !yyyy || isNaN(d) || isNaN(m) || isNaN(y)) return false;
  if (d < 1 || d > 31 || m < 1 || m > 12) return false;
  const parsed = new Date(y, m - 1, d);
  if (parsed.getFullYear() !== y || parsed.getMonth() !== m - 1 || parsed.getDate() !== d) return false;
  if (parsed > new Date()) return false;
  return true;
}

// ── Date picker (DD / MM / YYYY split) ───────────────────────────────────────

function DatePicker({ dd, mm, yyyy, onChange, error }) {
  const refMm   = useRef(null);
  const refYyyy = useRef(null);

  const handleDD = (v) => {
    const raw = v.replace(/\D/g, '').slice(0, 2);
    onChange(raw, mm, yyyy);
    if (raw.length === 2) refMm.current?.focus();
  };

  const handleMM = (v) => {
    const raw = v.replace(/\D/g, '').slice(0, 2);
    onChange(dd, raw, yyyy);
    if (raw.length === 2) refYyyy.current?.focus();
  };

  const handleYYYY = (v) => {
    const raw = v.replace(/\D/g, '').slice(0, 4);
    onChange(dd, mm, raw);
  };

  const borderColor = error ? Colors.danger : Colors.border;

  return (
    <View style={dpStyles.row}>
      {/* Day */}
      <View style={[dpStyles.box, dpStyles.boxSm, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Jour</Text>
        <TextInput
          style={dpStyles.boxInput}
          placeholder="JJ"
          placeholderTextColor={Colors.textLight}
          value={dd}
          onChangeText={handleDD}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="next"
          onSubmitEditing={() => refMm.current?.focus()}
          selectTextOnFocus
        />
      </View>

      <Text style={dpStyles.sep}>/</Text>

      {/* Month */}
      <View style={[dpStyles.box, dpStyles.boxSm, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Mois</Text>
        <TextInput
          ref={refMm}
          style={dpStyles.boxInput}
          placeholder="MM"
          placeholderTextColor={Colors.textLight}
          value={mm}
          onChangeText={handleMM}
          keyboardType="number-pad"
          maxLength={2}
          returnKeyType="next"
          onSubmitEditing={() => refYyyy.current?.focus()}
          selectTextOnFocus
        />
      </View>

      <Text style={dpStyles.sep}>/</Text>

      {/* Year */}
      <View style={[dpStyles.box, dpStyles.boxLg, { borderColor }]}>
        <Text style={dpStyles.boxLabel}>Année</Text>
        <TextInput
          ref={refYyyy}
          style={dpStyles.boxInput}
          placeholder="AAAA"
          placeholderTextColor={Colors.textLight}
          value={yyyy}
          onChangeText={handleYYYY}
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

// ── Main component ────────────────────────────────────────────────────────────

export default function GuestRdvScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Sessions & centres
  const [sessions,       setSessions]      = useState([]);
  const [loadingSess,    setLoadingSess]    = useState(true);
  const [sessError,      setSessError]      = useState(false);
  const [centres,        setCentres]        = useState([]);
  const [loadingCentres, setLoadingCentres] = useState(false);
  const [selCentre,      setSelCentre]      = useState(null);

  // Parent fields
  const [nomParent, setNomParent] = useState('');
  const [telephone, setTelephone] = useState('');

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

  // Race-condition guard for concurrent loadSessions calls
  const loadReqRef = useRef(0);

  // Keyboard refs
  const refTel    = useRef(null);
  const refPrenom = useRef(null);
  const refNom    = useRef(null);

  // ── Sessions loading ──────────────────────────────────────────────────────

  const loadSessions = (newborn, centreId) => {
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
  };

  useEffect(() => { loadSessions(false, null); }, []);

  const handleNewbornToggle = (val) => {
    setIsNewborn(val);
    setSelCentre(null);
    setSelSession(null);
    setSessions([]);
    setSessError(false);
    setErrors({});
    if (!val) {
      loadSessions(false, null);
    } else if (centres.length === 0) {
      setLoadingCentres(true);
      authService.listPublicCentres()
        .then((d) => {
          const list = Array.isArray(d) ? d : [];
          setCentres(list);
          // Auto-select when only one centre exists
          if (list.length === 1) {
            setSelCentre(list[0]);
            loadSessions(true, list[0].id);
          }
        })
        .catch(() => {})
        .finally(() => setLoadingCentres(false));
    } else if (centres.length === 1 && !selCentre) {
      // Centres already loaded (toggle was off then on again)
      setSelCentre(centres[0]);
      loadSessions(true, centres[0].id);
    }
  };

  const handleCentreSelect = (centre) => {
    setSelCentre(centre);
    setErrors((e) => ({ ...e, centre: null }));
    loadSessions(true, centre.id);
  };

  // ── Validation ────────────────────────────────────────────────────────────

  const validate = () => {
    const e = {};
    if (!nomParent.trim())
      e.nomParent = 'Votre nom est obligatoire';
    const clean = telephone.replace(/\s/g, '');
    if (!/^(\+212|0)[5-7]\d{8}$/.test(clean))
      e.telephone = 'Numéro invalide (ex : 0612 345 678)';
    if (!isNewborn) {
      if (!prenomBebe.trim())
        e.prenomBebe = "Prénom de l'enfant obligatoire";
      if (!validateDobParts(dobDD, dobMM, dobYYYY))
        e.dobBebe = 'Date de naissance invalide ou dans le futur';
    }
    if (isNewborn && !selCentre)
      e.centre = 'Choisissez un centre de vaccination';
    if (!selSession)
      e.session = 'Choisissez une session';
    return e;
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSubmitting(true);
    try {
      const dobStr = isNewborn ? undefined : dobPartsToIso(dobDD, dobMM, dobYYYY);
      const resp = await authService.createGuestRdv({
        nom_parent:          nomParent.trim(),
        telephone:           normalizePhone(telephone),
        prenom_bebe:         isNewborn ? (prenomBebe.trim() || undefined) : prenomBebe.trim(),
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

  // ── Confirmation screen ───────────────────────────────────────────────────

  if (confirmed) {
    const rdv = confirmed.rdv ?? {};
    const isWaiting = rdv.en_attente === true;
    return (
      <View style={styles.root}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={isWaiting ? Gradients.accent : ['#12A150', '#17C964']}
          style={styles.confirmHeader}
        >
          <View style={styles.confirmIconWrap}>
            <Ionicons
              name={isWaiting ? 'hourglass-outline' : 'checkmark-circle'}
              size={48} color={Colors.white}
            />
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
            <InfoRow icon="person-outline"   label="Enfant"
              value={[rdv.bebe_prenom, rdv.bebe_nom].filter(Boolean).join(' ') || '—'}
            />
            {rdv.bebe_numero_centre != null && (
              <InfoRow
                icon="barcode-outline"
                label="N° au centre  (à utiliser pour se connecter)"
                value={`#${rdv.bebe_numero_centre}`}
                highlight
              />
            )}
            {rdv.bebe_id != null && (
              <InfoRow icon="finger-print-outline" label="ID global de l'enfant" value={`${rdv.bebe_id}`} />
            )}
            <InfoRow icon="calendar-outline" label="Date"   value={formatDate(rdv.date_session)} />
            <InfoRow icon="time-outline"     label="Heure"  value={formatHeure(rdv.heure_debut, rdv.heure_fin)} />
            <InfoRow icon="location-outline" label="Centre" value={rdv.centre_nom} />
            {rdv.id && (
              <InfoRow icon="receipt-outline" label="Réf. RDV" value={`#${rdv.id}`} />
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
            <Ionicons name="information-circle-outline" size={20} color={Colors.primary} />
            <Text style={styles.noteText}>
              Gardez votre numéro de référence.{'\n'}
              Le centre vous contactera au{' '}
              <Text style={{ fontWeight: '800' }}>{normalizePhone(telephone)}</Text> pour confirmation.
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

  // ── Form ──────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={Gradients.brandWide}
        style={[styles.header, { paddingTop: insets.top + Spacing.lg }]}
      >
        <View style={styles.navRow}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle}>RDV sans compte</Text>
          <View style={{ width: 38 }} />
        </View>
        <Text style={styles.headerSub}>Aucun compte nécessaire — remplissez le formulaire</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {/* "always" ensures session taps register even when keyboard is mounted */}
        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="always">

          {/* ── Informations parent ─────────────────────────────────── */}
          <SectionHeader icon="person-outline" title="Vos informations" />

          <Field label="Votre nom complet *" error={errors.nomParent}>
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

          <Field label="Numéro de téléphone *" error={errors.telephone}>
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
                onSubmitEditing={() => refPrenom.current?.focus()}
              />
            </View>
          </Field>

          {/* ── Informations enfant ─────────────────────────────────── */}
          <SectionHeader icon="people-outline" title="Informations de l'enfant" />

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
                Date d'aujourd'hui enregistrée automatiquement. Le prénom peut être complété plus tard.
              </Text>
            </View>
          )}

          {/* Champs enfant non-newborn */}
          {!isNewborn && (
            <>
              <Field label="Prénom de l'enfant *" error={errors.prenomBebe}>
                <TextInput
                  ref={refPrenom}
                  style={[styles.input, errors.prenomBebe && styles.inputError]}
                  placeholder="Prénom"
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

              {/* Date de naissance — split fields */}
              <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>Date de naissance *</Text>
                <DatePicker
                  dd={dobDD} mm={dobMM} yyyy={dobYYYY}
                  onChange={(d, m, y) => {
                    setDobDD(d); setDobMM(m); setDobYYYY(y);
                    setErrors((e) => ({ ...e, dobBebe: null }));
                  }}
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

          {/* Prénom facultatif pour newborn */}
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
                  <Text style={[styles.sexeText, sexeBebe === k && { color, fontWeight: '700' }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </Field>

          {/* ── Sélection centre (newborn uniquement) ───────────────── */}
          {isNewborn && (
            <>
              <SectionHeader icon="location-outline" title="Centre de vaccination" />
              {errors.centre && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{errors.centre}</Text>
                </View>
              )}
              {loadingCentres ? (
                <ActivityIndicator color={Colors.primary} style={{ marginBottom: Spacing.md }} />
              ) : centres.length === 0 ? (
                <Text style={styles.noSessText}>Aucun centre disponible pour le moment.</Text>
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
                          <Text style={[styles.centreName, active && { color: Colors.primary }]}>
                            {c.nom}
                          </Text>
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

          {/* ── Sélection session ────────────────────────────────────── */}
          {(!isNewborn || selCentre) && (
            <>
              <SectionHeader
                icon="calendar-outline"
                title={isNewborn ? `Sessions — ${selCentre?.nom}` : 'Choisir une session'}
              />
              {errors.session && (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={13} color={Colors.danger} />
                  <Text style={styles.errorText}>{errors.session}</Text>
                </View>
              )}
              {loadingSess ? (
                <ActivityIndicator color={Colors.primary} style={{ marginVertical: Spacing.lg }} />
              ) : sessError ? (
                <View style={styles.noSessions}>
                  <Ionicons name="wifi-outline" size={32} color={Colors.danger} />
                  <Text style={styles.noSessText}>
                    Impossible de charger les sessions. Vérifiez votre connexion.
                  </Text>
                  <TouchableOpacity
                    style={styles.retryBtn}
                    onPress={() => loadSessions(isNewborn, selCentre?.id ?? null)}
                  >
                    <Text style={styles.retryText}>Réessayer</Text>
                  </TouchableOpacity>
                </View>
              ) : sessions.length === 0 ? (
                <View style={styles.noSessions}>
                  <Ionicons name="calendar-outline" size={32} color={Colors.textLight} />
                  <Text style={styles.noSessText}>
                    {isNewborn
                      ? 'Aucune session disponible pour ce centre.\nContactez le centre directement.'
                      : 'Aucune session disponible pour le moment.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.sessionList}>
                  {sessions.map((s) => {
                    const selected = selSession?.id === s.id;
                    const isFull   = (s.places_restantes ?? 1) <= 0;
                    return (
                      <TouchableOpacity
                        key={String(s.id)}
                        style={[
                          styles.sessionRow,
                          selected && styles.sessionRowActive,
                          isFull  && styles.sessionRowFull,
                        ]}
                        onPress={() => {
                          setSelSession(s);
                          setErrors((e) => ({ ...e, session: null }));
                        }}
                        activeOpacity={0.75}
                      >
                        {/* Left: selected indicator */}
                        <View style={[styles.selDot, selected && styles.selDotActive]}>
                          {selected && <View style={styles.selDotInner} />}
                        </View>

                        <View style={styles.sessionLeft}>
                          <Text style={[styles.sessionVaccin, selected && { color: Colors.primary }]}>
                            {s.vaccin_nom}
                          </Text>
                          {!isNewborn && (
                            <Text style={styles.sessionCentre}>{s.centre_nom}</Text>
                          )}
                          <Text style={styles.sessionMeta}>
                            {formatDate(s.date_session)}
                          </Text>
                          <Text style={styles.sessionMeta}>
                            {formatHeure(s.heure_debut, s.heure_fin)}
                          </Text>
                        </View>

                        <View style={styles.sessionRight}>
                          {isFull ? (
                            <View style={styles.badgeFull}>
                              <Text style={styles.badgeFullText}>Liste d'attente</Text>
                            </View>
                          ) : (
                            <View style={styles.badgePlaces}>
                              <Text style={styles.badgePlacesNum}>{s.places_restantes}</Text>
                              <Text style={styles.badgePlacesLbl}>place{s.places_restantes > 1 ? 's' : ''}</Text>
                            </View>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {/* ── Bouton soumettre ─────────────────────────────────────── */}
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
                        {selSession && (selSession.places_restantes ?? 1) <= 0
                          ? "Rejoindre la liste d'attente"
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

// ── Sub-components ────────────────────────────────────────────────────────────

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

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:    { paddingBottom: Spacing.xl },
  navRow:    { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm },
  navBtn:    { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle:  { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '700', color: Colors.white },
  headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.70)', textAlign: 'center', paddingBottom: Spacing.sm },

  formScroll: { padding: Spacing.lg, paddingBottom: Spacing['4xl'] },

  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: Spacing.xl, marginBottom: Spacing.md },
  sectionTitle:  { fontSize: 13, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.8 },

  fieldWrap:  { marginBottom: Spacing.sm },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input:      { backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 12, fontSize: 15, color: Colors.text },
  inputError: { borderColor: Colors.danger },

  phoneRow:      { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, overflow: 'hidden' },
  phoneRowError: { borderColor: Colors.danger },
  countryBadge:  { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 12 },
  countryFlag:   { fontSize: 18 },
  countryCode:   { fontSize: 15, fontWeight: '700', color: Colors.text },
  phoneDivider:  { width: 1, height: 26, backgroundColor: Colors.border },
  phoneInput:    { flex: 1, paddingHorizontal: 12, paddingVertical: 12, fontSize: 15, color: Colors.text },

  sexeRow:  { flexDirection: 'row', gap: Spacing.md },
  sexeChip: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: Radii.md, backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border },
  sexeText: { fontSize: 14, fontWeight: '600', color: Colors.textSecondary },

  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4, marginBottom: 4 },
  errorText: { fontSize: 12, color: Colors.danger, fontWeight: '500' },

  newbornToggle:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing.base, marginBottom: Spacing.sm },
  newbornToggleActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  newbornLeft:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  newbornEmoji:        { fontSize: 26 },
  newbornLabel:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  newbornSub:          { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  newbornNote:         { flexDirection: 'row', alignItems: 'flex-start', gap: 6, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.md },
  newbornNoteText:     { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  centreList:        { gap: Spacing.sm, marginBottom: Spacing.md },
  centreRow:         { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border, ...Elevation.sm },
  centreRowActive:   { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreRadio:       { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  centreRadioActive: { borderColor: Colors.primary },
  centreRadioDot:    { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreName:        { fontSize: 14, fontWeight: '700', color: Colors.text },
  centreAddr:        { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  noSessions:  { alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing['2xl'] },
  noSessText:  { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  retryBtn:    { marginTop: Spacing.sm, paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, backgroundColor: Colors.primary, borderRadius: Radii.pill },
  retryText:   { color: Colors.white, fontWeight: '700', fontSize: 14 },

  sessionList:      { gap: Spacing.sm, marginBottom: Spacing.lg },
  sessionRow:       { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, backgroundColor: Colors.surface, borderRadius: Radii.lg, borderWidth: 2, borderColor: 'transparent', ...Elevation.sm },
  sessionRowActive: { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  sessionRowFull:   { opacity: 0.8 },
  selDot:           { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', marginRight: Spacing.sm, flexShrink: 0 },
  selDotActive:     { borderColor: Colors.primary },
  selDotInner:      { width: 11, height: 11, borderRadius: 6, backgroundColor: Colors.primary },
  sessionLeft:      { flex: 1, gap: 3 },
  sessionVaccin:    { fontSize: 14, fontWeight: '700', color: Colors.text },
  sessionCentre:    { fontSize: 12, color: Colors.textSecondary, fontWeight: '600' },
  sessionMeta:      { fontSize: 12, color: Colors.textLight },
  sessionRight:     { marginLeft: Spacing.sm, alignItems: 'flex-end' },
  badgePlaces:      { alignItems: 'center', backgroundColor: Colors.successBg, borderRadius: Radii.md, paddingHorizontal: 10, paddingVertical: 4 },
  badgePlacesNum:   { fontSize: 18, fontWeight: '800', color: Colors.success, lineHeight: 22 },
  badgePlacesLbl:   { fontSize: 10, fontWeight: '600', color: Colors.success },
  badgeFull:        { backgroundColor: Colors.accentLight, borderRadius: Radii.md, paddingHorizontal: 8, paddingVertical: 5 },
  badgeFullText:    { fontSize: 11, fontWeight: '700', color: Colors.accent },

  submitBtn:  { borderRadius: Radii.xl, overflow: 'hidden', marginTop: Spacing.lg },
  submitGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  submitText: { fontSize: 16, fontWeight: '700', color: Colors.white },

  // Confirmation
  confirmHeader:   { paddingTop: 60, paddingBottom: Spacing['3xl'], alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.xl },
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
  infoRowHighlight:   { backgroundColor: Colors.primaryTint, borderRadius: Radii.md, borderBottomWidth: 0, paddingHorizontal: Spacing.sm, marginHorizontal: -Spacing.sm },
  infoIcon:           { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoIconHighlight:  { backgroundColor: Colors.primary },
  infoLabel:          { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoLabelHighlight: { color: Colors.primary, fontWeight: '700' },
  infoValue:          { fontSize: 14, fontWeight: '700', color: Colors.text },
  infoValueHighlight: { fontSize: 20, fontWeight: '800', color: Colors.primary },

  loginCta:     { borderRadius: Radii.xl, overflow: 'hidden', ...Elevation.sm },
  loginCtaGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md, paddingVertical: Spacing.lg },
  loginCtaText: { fontSize: 15, fontWeight: '700', color: Colors.white },
  skipLink:     { alignItems: 'center', paddingVertical: Spacing.md },
  skipText:     { fontSize: 13, color: Colors.textSecondary },
});
