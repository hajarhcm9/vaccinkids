import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, StatusBar, ActivityIndicator,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert, Share,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { enfantService } from '../../services';

function getAge(dob) {
  if (!dob) return '';
  const birth = new Date(dob.includes('/') ? dob.split('/').reverse().join('-') : dob);
  const now   = new Date();
  const years  = now.getFullYear() - birth.getFullYear();
  const months = (now.getFullYear() * 12 + now.getMonth()) - (birth.getFullYear() * 12 + birth.getMonth());
  if (years >= 1) return `${years} an${years > 1 ? 's' : ''}`;
  if (months === 0) return 'Nouveau-né';
  return `${months} mois`;
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function fmtDateShort(iso) {
  if (!iso) return '—';
  const [y, m, d] = (iso.split('T')[0]).split('-');
  return `${d}/${m}/${y}`;
}

function coverageColor(pct) {
  if (pct >= 80) return Colors.success;
  if (pct >= 50) return Colors.accent;
  return Colors.danger;
}

function parseDDMMYYYY(str) {
  if (!str || str.length !== 10) return null;
  const [dd, mm, yyyy] = str.split('/');
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(`${yyyy}-${mm}-${dd}`);
  return isNaN(d) ? null : `${yyyy}-${mm}-${dd}`;
}

export default function EnfantDetailScreen({ route, navigation }) {
  const { enfant: initial } = route.params;
  const insets = useSafeAreaInsets();

  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  // QR modal state
  const [showQr, setShowQr] = useState(false);

  // Complete-profile modal state
  const [showModal,  setShowModal]  = useState(false);
  const [editPrenom, setEditPrenom] = useState('');
  const [editNom,    setEditNom]    = useState('');
  const [editDate,   setEditDate]   = useState('');
  const [editSexe,   setEditSexe]   = useState('M');
  const [saving,     setSaving]     = useState(false);
  const [fieldErr,   setFieldErr]   = useState('');

  const load = useCallback(async () => {
    try {
      const resp = await enfantService.getEnfantComplete(initial.id);
      setData(resp);
    } catch {
      setData({ bebe: initial, stats: {}, vaccinations: [], delayed_vaccines: [], upcoming_appointments: [] });
    } finally {
      setLoading(false);
    }
  }, [initial.id]);

  useEffect(() => { load(); }, [load]);

  const bebe    = data?.bebe   || initial;
  const stats   = data?.stats  || {};
  const delayed = data?.delayed_vaccines || [];
  const nextRdvs = (data?.upcoming_appointments || [])
    .filter((r) => !['ANNULE', 'PRESENT', 'ABSENT'].includes(r.statut))
    .sort((a, b) => new Date(a.date_session) - new Date(b.date_session));
  const nextRdv  = nextRdvs[0] || null;
  const lastVacc = (data?.vaccinations || []).slice(-1)[0] || null;

  const vaccinsDone   = stats.vaccines_done    ?? initial.vaccins_faits   ?? 0;
  const vaccinsTotal  = initial.vaccins_total  ?? 0;
  const vaccinsRetard = stats.vaccines_delayed ?? delayed.length ?? 0;
  const pct      = vaccinsTotal > 0 ? Math.round((vaccinsDone / vaccinsTotal) * 100) : 0;
  const barColor = coverageColor(pct);

  const isF = bebe.sexe === 'F';
  const avatarGradient = isF ? ['#EC4899', '#F43F5E'] : ['#6366F1', '#3B82F6'];
  const initials = `${bebe.prenom?.[0] || '?'}${bebe.nom?.[0] || ''}`.toUpperCase();
  const isNewborn = bebe.is_newborn === true || bebe.is_newborn === 1;

  const openModal = () => {
    setEditPrenom(bebe.prenom || '');
    setEditNom(bebe.nom || '');
    setEditDate(fmtDateShort(bebe.date_naissance));
    setEditSexe(bebe.sexe || 'M');
    setFieldErr('');
    setShowModal(true);
  };

  const handleAutoDate = (v) => {
    const digits = v.replace(/\D/g, '').slice(0, 8);
    let formatted = digits;
    if (digits.length > 2) formatted = digits.slice(0, 2) + '/' + digits.slice(2);
    if (digits.length > 4) formatted = formatted.slice(0, 5) + '/' + digits.slice(4);
    setEditDate(formatted);
    setFieldErr('');
  };

  const handleSave = async () => {
    if (!editPrenom.trim()) { setFieldErr('Le prénom est obligatoire.'); return; }
    if (!editNom.trim())    { setFieldErr('Le nom est obligatoire.'); return; }
    const isoDate = parseDDMMYYYY(editDate);
    if (!isoDate)           { setFieldErr('Date invalide — format JJ/MM/AAAA.'); return; }

    setSaving(true);
    try {
      await enfantService.updateEnfant(initial.id, {
        prenom:         editPrenom.trim(),
        nom:            editNom.trim(),
        date_naissance: isoDate,
        sexe:           editSexe,
      });
      setShowModal(false);
      await load(); // refresh all data
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder les informations.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Header ── */}
      <LinearGradient colors={Gradients.brandWide} style={styles.header}>
        <View style={styles.decCircle} />

        <View style={[styles.navRow, { paddingTop: insets.top + Spacing.sm }]}>
          <TouchableOpacity style={styles.navBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={20} color={Colors.white} />
          </TouchableOpacity>
          <Text style={styles.navTitle} numberOfLines={1}>
            {isNewborn ? 'Nouveau-né' : `${bebe.prenom} ${bebe.nom}`}
          </Text>
          {isNewborn ? (
            <TouchableOpacity style={styles.navBtn} onPress={openModal}>
              <Ionicons name="create-outline" size={20} color={Colors.white} />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 38 }} />
          )}
        </View>

        <View style={styles.avatarSection}>
          <LinearGradient colors={avatarGradient} style={styles.avatar}>
            {isNewborn
              ? <Ionicons name="happy-outline" size={36} color={Colors.white} />
              : <Text style={styles.avatarText}>{initials}</Text>
            }
          </LinearGradient>

          <View style={styles.pillRow}>
            <View style={styles.pill}>
              <Ionicons name="sparkles-outline" size={11} color="rgba(255,255,255,0.75)" />
              <Text style={styles.pillText}>{getAge(bebe.date_naissance)}</Text>
            </View>
            <View style={styles.pill}>
              <Ionicons name={isF ? 'female' : 'male'} size={11} color="rgba(255,255,255,0.75)" />
              <Text style={styles.pillText}>{isF ? 'Fille' : 'Garçon'}</Text>
            </View>
            {bebe.numero_centre != null && (
              <View style={styles.pill}>
                <Ionicons name="card-outline" size={11} color="rgba(255,255,255,0.75)" />
                <Text style={styles.pillText}>N° {bebe.numero_centre}</Text>
              </View>
            )}
          </View>
        </View>

        {/* ── Quick actions ── */}
        <View style={styles.actionsRow}>
          {!isNewborn && (
            <TouchableOpacity
              style={styles.actionBtn}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Calendrier', { enfantId: bebe.id })}
            >
              <Ionicons name="calendar-outline" size={16} color={Colors.white} />
              <Text style={styles.actionBtnText}>Calendrier</Text>
            </TouchableOpacity>
          )}
          {!isNewborn && bebe.code_qr && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.actionBtnQr]}
              activeOpacity={0.8}
              onPress={() => setShowQr(true)}
            >
              <Ionicons name="qr-code-outline" size={16} color={Colors.white} />
              <Text style={styles.actionBtnText}>Carte QR</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.actionBtn, !isNewborn && styles.actionBtnPrimary]}
            activeOpacity={0.8}
            onPress={isNewborn ? openModal : () => navigation.navigate('RDV')}
          >
            <Ionicons name={isNewborn ? 'create-outline' : 'add-circle-outline'} size={16} color={Colors.white} />
            <Text style={styles.actionBtnText}>{isNewborn ? 'Compléter le profil' : 'Prendre RDV'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {loading ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={Colors.primary} size="large" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

          {/* ── Bannière nouveau-né ── */}
          {isNewborn && (
            <TouchableOpacity style={styles.newbornBanner} activeOpacity={0.88} onPress={openModal}>
              <View style={styles.newbornBannerIcon}>
                <Ionicons name="information-circle" size={22} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.newbornBannerTitle}>Complétez le profil</Text>
                <Text style={styles.newbornBannerSub}>
                  Ajoutez le prénom, le nom et la date de naissance de votre enfant.
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.primary} />
            </TouchableOpacity>
          )}

          {/* ── Alerte vaccins en retard ── */}
          {vaccinsRetard > 0 && (
            <View style={styles.alertCard}>
              <View style={styles.alertIconWrap}>
                <Ionicons name="alert-circle" size={22} color={Colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>
                  {vaccinsRetard} vaccin{vaccinsRetard > 1 ? 's' : ''} en retard
                </Text>
                {delayed.slice(0, 2).map((v, i) => (
                  <Text key={i} style={styles.alertItem}>• {v.nom || v.vaccin_nom || v.name}</Text>
                ))}
                {delayed.length > 2 && (
                  <Text style={styles.alertMore}>+ {delayed.length - 2} autre{delayed.length - 2 > 1 ? 's' : ''}</Text>
                )}
                <Text style={styles.alertCta}>Contactez votre centre de santé</Text>
              </View>
            </View>
          )}

          {/* ── Prochain RDV ── */}
          {!isNewborn && (nextRdv ? (
            <TouchableOpacity style={styles.rdvCard} activeOpacity={0.88} onPress={() => navigation.navigate('RDV')}>
              <LinearGradient colors={Gradients.brand} style={styles.rdvIconBg}>
                <Ionicons name="medkit" size={20} color={Colors.white} />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={styles.rdvTagLabel}>Prochain rendez-vous</Text>
                <Text style={styles.rdvVaccin}>{nextRdv.vaccin_nom || '—'}</Text>
                <Text style={styles.rdvDate}>
                  {fmtDate(nextRdv.date_session)}{nextRdv.heure_debut ? `  ·  ${nextRdv.heure_debut}` : ''}
                </Text>
                {nextRdv.centre_nom ? <Text style={styles.rdvCentre}>{nextRdv.centre_nom}</Text> : null}
              </View>
              <View style={[styles.rdvStatusBadge, nextRdv.statut === 'EN_LISTE_ATTENTE' && { backgroundColor: Colors.accentLight }]}>
                <Text style={[styles.rdvStatusText, nextRdv.statut === 'EN_LISTE_ATTENTE' && { color: Colors.accentDark }]}>
                  {nextRdv.statut === 'EN_LISTE_ATTENTE' ? "Liste d'attente" : 'Confirmé'}
                </Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.rdvEmptyCard} activeOpacity={0.85} onPress={() => navigation.navigate('RDV')}>
              <Ionicons name="calendar-outline" size={20} color={Colors.textLight} />
              <Text style={styles.rdvEmptyText}>Aucun RDV à venir</Text>
              <Text style={styles.rdvEmptyCta}>Prendre rendez-vous →</Text>
            </TouchableOpacity>
          ))}

          {/* ── Couverture vaccinale ── */}
          {vaccinsTotal > 0 && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Couverture vaccinale</Text>
              <View style={styles.coverageRow}>
                <View style={{ flex: 1 }}>
                  <View style={styles.statsStrip}>
                    <CovStat num={vaccinsDone}              color={Colors.success}        label="Faits" />
                    <View style={styles.statDiv} />
                    <CovStat num={vaccinsRetard}             color={Colors.danger}         label="Retard" />
                    <View style={styles.statDiv} />
                    <CovStat num={vaccinsTotal - vaccinsDone} color={Colors.textSecondary} label="Restants" />
                  </View>
                </View>
                <View style={styles.ringWrap}>
                  <View style={[styles.ring, { borderColor: barColor }]}>
                    <Text style={[styles.ringPct, { color: barColor }]}>{pct}%</Text>
                    <Text style={styles.ringLbl}>complet</Text>
                  </View>
                </View>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%`, backgroundColor: barColor }]} />
              </View>
            </View>
          )}

          {/* ── Dernière vaccination ── */}
          {lastVacc && (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Dernière vaccination</Text>
              <View style={styles.lastVaccRow}>
                <View style={styles.lastVaccIcon}>
                  <Ionicons name="checkmark-circle" size={22} color={Colors.success} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.lastVaccNom}>{lastVacc.vaccin_nom || lastVacc.nom || '—'}</Text>
                  <Text style={styles.lastVaccDate}>
                    {lastVacc.date_vaccination ? fmtDate(lastVacc.date_vaccination) : '—'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Informations ── */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Informations</Text>
            <InfoRow icon="calendar-outline" label="Date de naissance" value={fmtDateShort(bebe.date_naissance)} />
            <InfoRow icon="body-outline"     label="Sexe"              value={isF ? '♀ Fille' : '♂ Garçon'} />
            {bebe.numero_centre != null && (
              <InfoRow icon="card-outline" label="Numéro au centre" value={String(bebe.numero_centre)} />
            )}
          </View>
        </ScrollView>
      )}

      {/* ── Modal : QR Code ── */}
      <Modal visible={showQr} animationType="fade" transparent onRequestClose={() => setShowQr(false)}>
        <View style={styles.qrOverlay}>
          <View style={styles.qrSheet}>
            {/* Header */}
            <View style={styles.qrHeader}>
              <View>
                <Text style={styles.qrTitle}>Carte de santé</Text>
                <Text style={styles.qrSub}>
                  {isF ? 'Elle' : 'Il'} s'appelle{' '}
                  <Text style={{ fontWeight: '800', color: Colors.primary }}>
                    {bebe.prenom} {bebe.nom}
                  </Text>
                </Text>
              </View>
              <TouchableOpacity style={styles.qrCloseBtn} onPress={() => setShowQr(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Age + pills */}
            <View style={styles.qrPillRow}>
              <View style={styles.qrPill}>
                <Ionicons name="sparkles-outline" size={11} color={Colors.primary} />
                <Text style={styles.qrPillText}>{getAge(bebe.date_naissance)}</Text>
              </View>
              <View style={styles.qrPill}>
                <Ionicons name={isF ? 'female' : 'male'} size={11} color={Colors.primary} />
                <Text style={styles.qrPillText}>{isF ? 'Fille' : 'Garçon'}</Text>
              </View>
              {bebe.numero_centre != null && (
                <View style={styles.qrPill}>
                  <Ionicons name="card-outline" size={11} color={Colors.primary} />
                  <Text style={styles.qrPillText}>N° {bebe.numero_centre}</Text>
                </View>
              )}
            </View>

            {/* QR Code */}
            <View style={styles.qrCodeWrap}>
              <View style={styles.qrCodeCard}>
                {bebe.code_qr ? (
                  <QRCode
                    value={bebe.code_qr}
                    size={220}
                    color="#003D46"
                    backgroundColor="white"
                    ecl="M"
                  />
                ) : (
                  <View style={styles.qrPlaceholder}>
                    <Ionicons name="qr-code-outline" size={60} color={Colors.border} />
                    <Text style={styles.qrPlaceholderText}>QR non disponible</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Instruction for infirmier */}
            <View style={styles.qrInstructionRow}>
              <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
              <Text style={styles.qrInstruction}>
                Présentez ce code à l'infirmier(ère) pour enregistrer la vaccination
              </Text>
            </View>

            {/* Close button */}
            <TouchableOpacity
              style={styles.qrDoneBtn}
              activeOpacity={0.85}
              onPress={() => setShowQr(false)}
            >
              <LinearGradient colors={Gradients.brand} style={styles.qrDoneBtnGrad}>
                <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                <Text style={styles.qrDoneBtnText}>Fermer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal : Compléter le profil ── */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={() => setShowModal(false)}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Compléter le profil</Text>
                <Text style={styles.modalSub}>Enregistrez les informations de votre enfant</Text>
              </View>
              <TouchableOpacity style={styles.modalClose} onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={20} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Prénom *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : Youssef"
                placeholderTextColor={Colors.textLight}
                value={editPrenom}
                onChangeText={(v) => { setEditPrenom(v); setFieldErr(''); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Nom de famille *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="Ex : Alaoui"
                placeholderTextColor={Colors.textLight}
                value={editNom}
                onChangeText={(v) => { setEditNom(v); setFieldErr(''); }}
                autoCapitalize="words"
                returnKeyType="next"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Date de naissance *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="JJ/MM/AAAA"
                placeholderTextColor={Colors.textLight}
                value={editDate}
                onChangeText={handleAutoDate}
                keyboardType="number-pad"
                maxLength={10}
                returnKeyType="done"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Sexe *</Text>
              <View style={styles.sexeRow}>
                {[{ label: '♂ Garçon', value: 'M' }, { label: '♀ Fille', value: 'F' }].map(({ label, value }) => (
                  <TouchableOpacity
                    key={value}
                    style={[styles.sexeBtn, editSexe === value && styles.sexeBtnActive]}
                    onPress={() => setEditSexe(value)}
                    activeOpacity={0.8}
                  >
                    <Text style={[styles.sexeBtnText, editSexe === value && styles.sexeBtnTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {fieldErr ? (
              <View style={styles.fieldErrWrap}>
                <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.fieldErr}>{fieldErr}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.saveBtn, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
              activeOpacity={0.85}
            >
              <LinearGradient colors={Gradients.brand} style={styles.saveBtnGrad}>
                {saving
                  ? <ActivityIndicator color={Colors.white} size="small" />
                  : <>
                      <Ionicons name="checkmark-circle" size={18} color={Colors.white} />
                      <Text style={styles.saveBtnText}>Enregistrer</Text>
                    </>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function CovStat({ num, color, label }) {
  return (
    <View style={styles.covStat}>
      <Text style={[styles.covStatNum, { color }]}>{num}</Text>
      <Text style={styles.covStatLbl}>{label}</Text>
    </View>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={Colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoLabel}>{label}</Text>
        <Text style={styles.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:    { paddingBottom: Spacing.xl, position: 'relative', overflow: 'hidden' },
  decCircle: { position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: Colors.glass, top: -70, right: -50 },

  navRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  navBtn:  { width: 38, height: 38, borderRadius: 19, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  navTitle:{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', color: Colors.white },

  avatarSection: { alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.lg },
  avatar:        { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.35)' },
  avatarText:    { fontSize: 30, fontWeight: '800', color: Colors.white },

  pillRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 },
  pill:    { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.pill },
  pillText:{ fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.90)' },

  actionsRow:      { flexDirection: 'row', gap: Spacing.sm, paddingHorizontal: Spacing.lg },
  actionBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.xl, paddingVertical: 12 },
  actionBtnPrimary:{ backgroundColor: 'rgba(255,255,255,0.22)', borderColor: Colors.white },
  actionBtnText:   { fontSize: 14, fontWeight: '700', color: Colors.white },

  loaderWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: Spacing.lg, gap: Spacing.md, paddingBottom: Spacing['4xl'] },

  // Newborn banner
  newbornBanner:     { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.primaryTint, borderRadius: Radii['2xl'], padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.primary + '30' },
  newbornBannerIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary + '18', alignItems: 'center', justifyContent: 'center' },
  newbornBannerTitle:{ fontSize: 15, fontWeight: '800', color: Colors.primary, marginBottom: 3 },
  newbornBannerSub:  { fontSize: 12, color: Colors.textSecondary, lineHeight: 17 },

  // Alert
  alertCard:     { flexDirection: 'row', gap: Spacing.md, backgroundColor: Colors.dangerBg, borderRadius: Radii['2xl'], padding: Spacing.lg, borderWidth: 1.5, borderColor: Colors.danger + '40' },
  alertIconWrap: { paddingTop: 2 },
  alertTitle:    { fontSize: 15, fontWeight: '800', color: Colors.danger, marginBottom: 6 },
  alertItem:     { fontSize: 13, color: Colors.danger, fontWeight: '600', marginBottom: 2 },
  alertMore:     { fontSize: 12, color: Colors.danger + 'AA', marginBottom: 4 },
  alertCta:      { fontSize: 12, color: Colors.dangerDark, fontWeight: '700', marginTop: 4 },

  // RDV
  rdvCard:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card, borderLeftWidth: 4, borderLeftColor: Colors.primary },
  rdvIconBg:     { width: 46, height: 46, borderRadius: Radii.lg, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  rdvTagLabel:   { fontSize: 10, fontWeight: '800', color: Colors.primary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 3 },
  rdvVaccin:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  rdvDate:       { fontSize: 12, color: Colors.textSecondary, marginBottom: 2 },
  rdvCentre:     { fontSize: 11, color: Colors.textLight },
  rdvStatusBadge:{ backgroundColor: Colors.primaryTint, paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.pill },
  rdvStatusText: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  rdvEmptyCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card, borderStyle: 'dashed', borderWidth: 1.5, borderColor: Colors.border },
  rdvEmptyText: { flex: 1, fontSize: 14, color: Colors.textSecondary, fontWeight: '600' },
  rdvEmptyCta:  { fontSize: 13, fontWeight: '700', color: Colors.primary },

  // Coverage
  card:      { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], padding: Spacing.lg, ...Elevation.card },
  cardTitle: { fontSize: 11, fontWeight: '800', color: Colors.textLight, textTransform: 'uppercase', letterSpacing: 1.2, marginBottom: Spacing.md },

  coverageRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.md },
  statsStrip:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  covStat:      { alignItems: 'center', minWidth: 50 },
  covStatNum:   { fontSize: 24, fontWeight: '800' },
  covStatLbl:   { fontSize: 10, fontWeight: '700', color: Colors.textLight, marginTop: 2 },
  statDiv:      { width: 1, height: 36, backgroundColor: Colors.border },

  ringWrap: { marginLeft: 'auto', paddingLeft: Spacing.md },
  ring:     { width: 68, height: 68, borderRadius: 34, borderWidth: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  ringPct:  { fontSize: 16, fontWeight: '800' },
  ringLbl:  { fontSize: 9, fontWeight: '700', color: Colors.textLight },

  progressTrack: { height: 8, backgroundColor: Colors.border, borderRadius: Radii.pill, overflow: 'hidden' },
  progressFill:  { height: 8, borderRadius: Radii.pill },

  // Last vacc
  lastVaccRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  lastVaccIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.successBg, alignItems: 'center', justifyContent: 'center' },
  lastVaccNom:  { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  lastVaccDate: { fontSize: 12, color: Colors.textSecondary },

  // Info rows
  infoRow:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoIcon:  { width: 34, height: 34, borderRadius: Radii.sm, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center' },
  infoLabel: { fontSize: 11, color: Colors.textLight, fontWeight: '600', marginBottom: 2 },
  infoValue: { fontSize: 15, fontWeight: '700', color: Colors.text },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  modalSheet:   { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  modalHandle:  { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.border, alignSelf: 'center', marginBottom: Spacing.lg },
  modalHeader:  { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.xl },
  modalTitle:   { fontSize: 20, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  modalSub:     { fontSize: 13, color: Colors.textSecondary },
  modalClose:   { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  formGroup: { marginBottom: Spacing.lg },
  formLabel: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  formInput: { height: 50, backgroundColor: Colors.background, borderRadius: Radii.xl, paddingHorizontal: Spacing.lg, fontSize: 16, color: Colors.text, borderWidth: 1.5, borderColor: Colors.border },

  sexeRow:         { flexDirection: 'row', gap: Spacing.sm },
  sexeBtn:         { flex: 1, height: 48, borderRadius: Radii.xl, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  sexeBtnActive:   { borderColor: Colors.primary, backgroundColor: Colors.primaryTint },
  sexeBtnText:     { fontSize: 15, fontWeight: '700', color: Colors.textSecondary },
  sexeBtnTextActive:{ color: Colors.primary },

  fieldErrWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  fieldErr:     { fontSize: 13, color: Colors.danger, fontWeight: '600' },

  saveBtn:     { marginTop: Spacing.sm },
  saveBtnGrad: { height: 54, borderRadius: Radii.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  saveBtnText: { fontSize: 16, fontWeight: '800', color: Colors.white },

  // Action button variant for QR
  actionBtnQr: { backgroundColor: 'rgba(255,255,255,0.18)', borderColor: 'rgba(255,255,255,0.5)', borderWidth: 1 },

  // QR Modal
  qrOverlay:      { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  qrSheet:        { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], padding: Spacing.xl, paddingBottom: Spacing['4xl'] },
  qrHeader:       { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: Spacing.md },
  qrTitle:        { fontSize: 22, fontWeight: '800', color: Colors.text, marginBottom: 3 },
  qrSub:          { fontSize: 14, color: Colors.textSecondary },
  qrCloseBtn:     { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' },

  qrPillRow:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.xl },
  qrPill:         { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primaryTint, paddingHorizontal: 12, paddingVertical: 5, borderRadius: Radii.pill },
  qrPillText:     { fontSize: 12, fontWeight: '700', color: Colors.primary },

  qrCodeWrap:     { alignItems: 'center', marginBottom: Spacing.xl },
  qrCodeCard:     { padding: 20, backgroundColor: Colors.white, borderRadius: Radii['2xl'], ...Elevation.card, borderWidth: 1, borderColor: Colors.border },
  qrPlaceholder:  { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', gap: 12 },
  qrPlaceholderText: { fontSize: 14, color: Colors.textLight, fontWeight: '600' },

  qrInstructionRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryTint, borderRadius: Radii.xl, padding: Spacing.md, marginBottom: Spacing.xl },
  qrInstruction:    { flex: 1, fontSize: 13, color: Colors.primary, fontWeight: '600', lineHeight: 19 },

  qrDoneBtn:      { },
  qrDoneBtnGrad:  { height: 54, borderRadius: Radii.xl, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  qrDoneBtnText:  { fontSize: 16, fontWeight: '800', color: Colors.white },
});
