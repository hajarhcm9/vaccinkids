import React, { useState, useCallback, useEffect, useContext } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal,
  ScrollView, StatusBar, Alert, RefreshControl, ActivityIndicator, TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Gradients, Radii, Spacing, Elevation } from '../../constants/theme';
import { rdvService, enfantService, authService } from '../../services';
import { AuthContext } from '../../context/AuthContext';

const SEGMENTS = [
  { key: 'A_VENIR', label: 'À venir',   icon: 'time-outline',             color: Colors.primary  },
  { key: 'FAIT',    label: 'Effectués', icon: 'checkmark-circle-outline', color: Colors.success  },
  { key: 'ANNULE',  label: 'Annulés',   icon: 'close-circle-outline',     color: Colors.danger   },
];

const STATUS_META = {
  EN_ATTENTE:       { color: Colors.primary,  bg: Colors.primaryTint, icon: 'time-outline',      label: 'En attente'     },
  EN_LISTE_ATTENTE: { color: Colors.accent,   bg: Colors.accentLight, icon: 'hourglass-outline', label: 'Liste d\'attente' },
  CONFIRME:         { color: Colors.info,     bg: Colors.infoBg,      icon: 'checkmark-circle',  label: 'Confirmé'       },
  PRESENT:          { color: Colors.success,  bg: Colors.successBg,   icon: 'checkmark-circle',  label: 'Effectué'       },
  ABSENT:           { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Absent'         },
  ANNULE:           { color: Colors.danger,   bg: Colors.dangerBg,    icon: 'close-circle',      label: 'Annulé'         },
};

const UPCOMING_STATUTS = ['EN_ATTENTE', 'CONFIRME', 'EN_LISTE_ATTENTE'];
const DONE_STATUTS     = ['PRESENT', 'ABSENT'];

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function RdvScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user, updateUser } = useContext(AuthContext);
  const [segment,     setSegment]    = useState('A_VENIR');
  const [allRdvs,     setAllRdvs]    = useState([]);
  const [enfantsList,    setEnfantsList]   = useState([]);
  const [vaccins,        setVaccins]       = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [refreshing,     setRefreshing]    = useState(false);

  // Booking modal — steps: 'centre' (if no centre yet) | 'pick' | 'results' | 'propose'
  const [showModal,      setShowModal]     = useState(false);
  const [bookStep,       setBookStep]      = useState('pick');
  const [centres,        setCentres]       = useState([]);
  const [selCentreModal, setSelCentreModal]= useState(null);
  const [savingCentre,   setSavingCentre]  = useState(false);
  const [selEnfant,      setSelEnfant]     = useState(null);
  const [selVaccin,      setSelVaccin]     = useState(null);
  const [matchedSess,    setMatchedSess]   = useState([]);
  const [loadingMatch,   setLoadingMatch]  = useState(false);
  const [selSession,     setSelSession]    = useState(null);
  const [confirming,     setConfirming]    = useState(false);

  // Propose sub-flow (step 'propose')
  const [propDate,       setPropDate]      = useState('');
  const [propHeure,      setPropHeure]     = useState('');
  const [propError,      setPropError]     = useState('');

  const _now = new Date();
  const rdvsBySegment = {
    A_VENIR: allRdvs.filter((r) =>
      UPCOMING_STATUTS.includes(r.statut) &&
      (!r.date_session || new Date(r.date_session) >= _now)
    ),
    FAIT:    allRdvs.filter((r) => DONE_STATUTS.includes(r.statut)),
    ANNULE:  allRdvs.filter((r) => r.statut === 'ANNULE'),
  };

  const loadData = useCallback(async () => {
    try {
      const [rdvData, enfantData, vaccinData] = await Promise.all([
        rdvService.listRdv().catch(() => []),
        enfantService.listEnfants().catch(() => []),
        rdvService.listVaccins().catch(() => []),
      ]);
      setAllRdvs(rdvData || []);
      setEnfantsList(enfantData || []);
      setVaccins((vaccinData || []).filter((v) => v.est_actif !== false));
    } catch (e) {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData().finally(() => setLoading(false));
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const resetModal = () => {
    setBookStep(user?.centre_id ? 'pick' : 'centre');
    setSelEnfant(null); setSelVaccin(null);
    setMatchedSess([]); setSelSession(null);
    setPropDate(''); setPropHeure(''); setPropError('');
    setSelCentreModal(null);
  };

  const openBookingModal = () => {
    if (!user?.centre_id && centres.length === 0) {
      authService.listPublicCentres()
        .then((data) => setCentres(Array.isArray(data) ? data : []))
        .catch(() => {});
    }
    setBookStep(user?.centre_id ? 'pick' : 'centre');
    setShowModal(true);
  };

  const handleSaveCentre = async () => {
    if (!selCentreModal) return;
    setSavingCentre(true);
    try {
      await authService.updateProfile({ centre_id: selCentreModal.id });
      await updateUser({ centre_id: selCentreModal.id, centre_nom: selCentreModal.nom });
      setBookStep('pick');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de sauvegarder le centre.');
    } finally {
      setSavingCentre(false);
    }
  };

  const handleSearchSessions = async () => {
    if (!selEnfant || !selVaccin) return;
    setLoadingMatch(true);
    try {
      const data = await rdvService.smartMatchSessions(selVaccin.id, selEnfant.id);
      setMatchedSess(Array.isArray(data) ? data : []);
    } catch {
      setMatchedSess([]);
    } finally {
      setLoadingMatch(false);
      setBookStep('results');
    }
  };

  const handlePropose = async () => {
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(propDate)) { setPropError('Date invalide (JJ/MM/AAAA)'); return; }
    if (!/^\d{2}:\d{2}$/.test(propHeure)) { setPropError('Heure invalide (HH:MM)'); return; }
    setPropError('');
    setConfirming(true);
    try {
      const [dd, mm, yyyy] = propDate.split('/');
      await rdvService.proposeSession({
        vaccin_id:    selVaccin.id,
        date_session: `${yyyy}-${mm}-${dd}`,
        heure_debut:  propHeure,
        bebe_id:      selEnfant.id,
      });
      Alert.alert(
        'Séance proposée !',
        `La séance ${selVaccin.nom} sera confirmée une fois que ${selVaccin.doses_par_flacon ?? 'N'} participants auront réservé.\nVous recevrez une notification.`,
      );
      resetModal(); setShowModal(false);
      loadData();
    } catch (e) {
      setPropError(e?.message || 'Erreur inattendue');
    } finally {
      setConfirming(false);
    }
  };

  const handleCancel = (item) => {
    Alert.alert(
      'Annuler ce rendez-vous',
      `Annuler le RDV de ${item.bebe_prenom || '—'} pour ${item.vaccin_nom || '—'} ?`,
      [
        { text: 'Non', style: 'cancel' },
        {
          text: 'Oui, annuler', style: 'destructive',
          onPress: async () => {
            try {
              await rdvService.cancelRdv(item.id);
              setAllRdvs((prev) =>
                prev.map((r) => r.id === item.id ? { ...r, statut: 'ANNULE' } : r)
              );
              setSegment('ANNULE');
            } catch (e) {
              Alert.alert('Erreur', 'Impossible d\'annuler ce rendez-vous.');
            }
          },
        },
      ]
    );
  };

  const handleBook = async () => {
    if (!selEnfant || !selSession) return;
    setConfirming(true);
    try {
      const available = selSession.max_inscriptions - (selSession.inscrits || 0);
      const isFull = available <= 0;
      const resp = isFull
        ? await rdvService.joinWaitlist(selSession.id, selEnfant.id)
        : await rdvService.inscribeSession(selSession.id, selEnfant.id);

      setShowModal(false); resetModal(); setSegment('A_VENIR');
      loadData();
      if (isFull) Alert.alert('Liste d\'attente', 'La session est complète. Vous avez été ajouté à la liste d\'attente.');
    } catch (e) {
      Alert.alert('Erreur', e?.message || 'Impossible de prendre ce rendez-vous. Réessayez.');
    } finally {
      setConfirming(false);
    }
  };

  const currentList = rdvsBySegment[segment] || [];

  const renderCard = ({ item }) => {
    const m = STATUS_META[item.statut] || STATUS_META.EN_ATTENTE;
    const canCancel = UPCOMING_STATUTS.includes(item.statut);
    return (
      <View style={styles.card}>
        <View style={[styles.cardAccent, { backgroundColor: m.color }]} />
        <View style={styles.cardBody}>
          <View style={styles.cardTop}>
            <View style={[styles.iconWrap, { backgroundColor: m.bg }]}>
              <Ionicons name="medkit" size={20} color={m.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.vaccinNom}>{item.vaccin_nom || '—'}</Text>
              <Text style={styles.enfantLabel}>Pour {item.bebe_prenom || item.bebe_nom || '—'}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: m.bg }]}>
              <Ionicons name={m.icon} size={11} color={m.color} />
              <Text style={[styles.badgeText, { color: m.color }]}>{m.label}</Text>
            </View>
          </View>

          <View style={styles.cardMeta}>
            <MetaItem icon="calendar-outline" value={formatDate(item.date_session)} />
            <MetaItem icon="time-outline"     value={item.heure_debut || '—'} />
            <MetaItem icon="location-outline" value={item.centre_nom || '—'} />
          </View>

          {canCancel && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.detailBtn}
                onPress={() => navigation.navigate('RdvDetail', { rdvId: item.id, rdv: item })}
              >
                <Text style={styles.detailBtnText}>Voir détails</Text>
                <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => handleCancel(item)}>
                <Ionicons name="close-circle-outline" size={14} color={Colors.danger} />
                <Text style={styles.cancelBtnText}>Annuler</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIcon}><Text style={{ fontSize: 36 }}>📅</Text></View>
      <Text style={styles.emptyTitle}>Aucun rendez-vous</Text>
      <Text style={styles.emptyBody}>
        {segment === 'A_VENIR' ? 'Prenez votre premier rendez-vous via le bouton +' : 'L\'historique apparaîtra ici.'}
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={Gradients.brandWide} style={[styles.header, { paddingTop: insets.top + Spacing.xl }]}>
        <View style={styles.decCircle} />
        <Text style={styles.headerSub}>Suivi médical</Text>
        <Text style={styles.headerTitle}>Mes rendez-vous</Text>

        <View style={styles.segmentBar}>
          {SEGMENTS.map((s) => {
            const active = segment === s.key;
            const count  = (rdvsBySegment[s.key] || []).length;
            return (
              <TouchableOpacity
                key={s.key}
                style={[styles.segBtn, active && styles.segBtnActive]}
                onPress={() => setSegment(s.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.segLabel, active && { color: Colors.text }]}>{s.label}</Text>
                {count > 0 && (
                  <View style={[styles.segCount, { backgroundColor: active ? s.color : Colors.glass }]}>
                    <Text style={[styles.segCountText, { color: active ? Colors.white : 'rgba(255,255,255,0.7)' }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator style={{ marginTop: Spacing['3xl'] }} color={Colors.primary} size="large" />
      ) : (
        <FlatList
          data={currentList}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[styles.list, !currentList.length && { flexGrow: 1 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}
              colors={[Colors.primary]} tintColor={Colors.primary} />
          }
        />
      )}

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        onPress={openBookingModal}
        activeOpacity={0.88}
      >
        <LinearGradient colors={Gradients.brand} style={styles.fabGradient}>
          <Ionicons name="add" size={28} color={Colors.white} />
        </LinearGradient>
      </TouchableOpacity>

      {/* ── Book RDV Modal ── */}
      <Modal visible={showModal} transparent animationType="slide" onRequestClose={() => setShowModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <View style={styles.modalHeader}>
              {bookStep === 'results' || bookStep === 'propose' ? (
                <TouchableOpacity
                  onPress={() => setBookStep(bookStep === 'propose' ? 'results' : 'pick')}
                  style={styles.modalBackBtn}>
                  <Ionicons name="arrow-back" size={20} color={Colors.textSecondary} />
                </TouchableOpacity>
              ) : <View style={{ width: 32 }} />}
              <Text style={styles.modalTitle}>
                {bookStep === 'centre'  ? 'Votre centre'          :
                 bookStep === 'pick'    ? 'Nouveau rendez-vous'   :
                 bookStep === 'results' ? 'Séances disponibles'   :
                                         'Proposer une séance'}
              </Text>
              <TouchableOpacity onPress={() => { resetModal(); setShowModal(false); }} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={22} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

              {/* ── STEP 0 : choose centre (only if not yet assigned) ── */}
              {bookStep === 'centre' && (
                <>
                  <View style={styles.centreStepNote}>
                    <Ionicons name="information-circle-outline" size={16} color={Colors.primary} />
                    <Text style={styles.centreStepNoteText}>
                      Choisissez votre centre de vaccination. Ce choix est définitif et s'applique à tous vos enfants.
                    </Text>
                  </View>
                  <View style={styles.centreModalList}>
                    {centres.map((c) => {
                      const active = selCentreModal?.id === c.id;
                      return (
                        <TouchableOpacity key={String(c.id)}
                          style={[styles.centreModalRow, active && styles.centreModalRowActive]}
                          onPress={() => setSelCentreModal(c)} activeOpacity={0.8}>
                          <View style={[styles.centreModalRadio, active && styles.centreModalRadioActive]}>
                            {active && <View style={styles.centreModalRadioDot} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.centreModalName, active && { color: Colors.primary }]}>{c.nom}</Text>
                            {c.adresse ? <Text style={styles.centreModalAddr}>{c.adresse}</Text> : null}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={[styles.confirmBtn, (!selCentreModal || savingCentre) && { opacity: 0.55 }]}
                    onPress={handleSaveCentre} disabled={!selCentreModal || savingCentre} activeOpacity={0.88}>
                    <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {savingCentre
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <>
                            <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                            <Text style={styles.confirmBtnText}>Confirmer ce centre</Text>
                          </>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* ── STEP 1 : pick baby + vaccine ── */}
              {bookStep === 'pick' && (
                <>
                  <PickerSection label="Enfant" icon="person-outline" color={Colors.primary}>
                    {enfantsList.length === 0
                      ? <Text style={styles.noDataText}>Aucun enfant enregistré.</Text>
                      : <View style={styles.chipRow}>
                          {enfantsList.map((e) => (
                            <TouchableOpacity key={String(e.id)}
                              style={[styles.chip, selEnfant?.id === e.id && styles.chipActive]}
                              onPress={() => setSelEnfant(e)}>
                              <Text style={[styles.chipText, selEnfant?.id === e.id && styles.chipTextActive]}>
                                {e.prenom}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                    }
                  </PickerSection>

                  <PickerSection label="Vaccin" icon="medkit-outline" color="#7C3AED">
                    <View style={styles.chipRow}>
                      {vaccins.map((v) => (
                        <TouchableOpacity key={String(v.id)}
                          style={[styles.chip, selVaccin?.id === v.id && styles.chipActive]}
                          onPress={() => setSelVaccin(v)}>
                          <Text style={[styles.chipText, selVaccin?.id === v.id && styles.chipTextActive]}>
                            {v.nom}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                    {selVaccin && (
                      <Text style={styles.vaccinDoseHint}>
                        {selVaccin.doses_par_flacon ?? '—'} doses par flacon
                      </Text>
                    )}
                  </PickerSection>

                  <TouchableOpacity
                    style={[styles.confirmBtn, (!selEnfant || !selVaccin || loadingMatch) && { opacity: 0.55 }]}
                    onPress={handleSearchSessions}
                    disabled={!selEnfant || !selVaccin || loadingMatch}
                    activeOpacity={0.88}
                  >
                    <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {loadingMatch
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <>
                            <Ionicons name="search-outline" size={20} color={Colors.white} />
                            <Text style={styles.confirmBtnText}>Rechercher une séance</Text>
                          </>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

              {/* ── STEP 2 : smart-matched sessions ── */}
              {bookStep === 'results' && (
                <>
                  {matchedSess.length === 0 ? (
                    <View style={styles.noMatchWrap}>
                      <Ionicons name="calendar-outline" size={40} color={Colors.textLight} />
                      <Text style={styles.noMatchTitle}>Aucune séance disponible</Text>
                      <Text style={styles.noMatchSub}>
                        Il n'y a pas encore de séance {selVaccin?.nom} dans votre centre.
                      </Text>
                      <TouchableOpacity style={styles.proposeLink} onPress={() => setBookStep('propose')}>
                        <Ionicons name="add-circle-outline" size={15} color={Colors.primary} />
                        <Text style={styles.proposeLinkText}>Proposer une nouvelle séance</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <View style={styles.sessionList}>
                        {matchedSess.map((s) => {
                          const inscrits  = s.inscrits || 0;
                          const max       = s.max_inscriptions;
                          const available = max - inscrits;
                          const isFull    = available <= 0;
                          const fillPct   = Math.min(inscrits / max, 1);
                          const isForming = s.statut === 'EN_FORMATION' || s.statut === 'PLANIFIEE';
                          const selected  = selSession?.id === s.id;
                          const fillColor = fillPct >= 0.8 ? Colors.accent : fillPct >= 0.5 ? Colors.info : Colors.success;

                          return (
                            <TouchableOpacity key={String(s.id)}
                              style={[styles.sessionRow, selected && styles.sessionRowActive]}
                              onPress={() => setSelSession(s)} activeOpacity={0.8}>
                              <View style={{ flex: 1, gap: 6 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={styles.sessionVaccin}>{s.vaccin_nom}</Text>
                                  {isForming && (
                                    <View style={styles.formingBadge}>
                                      <Text style={styles.formingBadgeText}>En formation</Text>
                                    </View>
                                  )}
                                  {isFull && !isForming && (
                                    <View style={[styles.formingBadge, { backgroundColor: Colors.successBg }]}>
                                      <Text style={[styles.formingBadgeText, { color: Colors.success }]}>Confirmée</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={styles.sessionMeta}>
                                  {formatDate(s.date_session)}  ·  {s.heure_debut}
                                </Text>
                                {/* Fill bar */}
                                <View style={styles.fillBarBg}>
                                  <View style={[styles.fillBarFill, { width: `${fillPct * 100}%`, backgroundColor: fillColor }]} />
                                </View>
                                <Text style={[styles.fillLabel, { color: fillColor }]}>
                                  {isFull
                                    ? 'Complet — liste d\'attente possible'
                                    : `${inscrits} / ${max} places réservées`}
                                </Text>
                              </View>
                              {selected && (
                                <Ionicons name="checkmark-circle" size={22} color={Colors.primary} style={{ marginLeft: 8 }} />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <TouchableOpacity style={styles.proposeLink} onPress={() => setBookStep('propose')}>
                        <Ionicons name="add-circle-outline" size={14} color={Colors.textSecondary} />
                        <Text style={[styles.proposeLinkText, { color: Colors.textSecondary }]}>
                          Ces dates ne me conviennent pas → Proposer une séance
                        </Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.confirmBtn, (confirming || !selSession) && { opacity: 0.55 }]}
                        onPress={handleBook} disabled={confirming || !selSession} activeOpacity={0.88}>
                        <LinearGradient colors={Gradients.brand} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                          {confirming
                            ? <ActivityIndicator color={Colors.white} size="small" />
                            : <>
                                <Ionicons name="checkmark-circle-outline" size={20} color={Colors.white} />
                                <Text style={styles.confirmBtnText}>
                                  {selSession && (selSession.max_inscriptions - (selSession.inscrits || 0)) <= 0
                                    ? 'Rejoindre la liste d\'attente'
                                    : 'Confirmer le rendez-vous'}
                                </Text>
                              </>
                          }
                        </LinearGradient>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* ── STEP 3 : propose new session ── */}
              {bookStep === 'propose' && (
                <>
                  {!!propError && (
                    <View style={styles.proposeError}>
                      <Ionicons name="alert-circle-outline" size={14} color={Colors.danger} />
                      <Text style={styles.proposeErrorText}>{propError}</Text>
                    </View>
                  )}

                  <PickerSection label="Date souhaitée" icon="calendar-outline" color={Colors.success}>
                    <TextInput style={styles.proposeInput} placeholder="JJ/MM/AAAA"
                      placeholderTextColor={Colors.textLight} value={propDate}
                      onChangeText={setPropDate} keyboardType="numbers-and-punctuation" maxLength={10} />
                  </PickerSection>

                  <PickerSection label="Heure" icon="time-outline" color={Colors.accent}>
                    <TextInput style={styles.proposeInput} placeholder="08:30"
                      placeholderTextColor={Colors.textLight} value={propHeure}
                      onChangeText={setPropHeure} keyboardType="numbers-and-punctuation" maxLength={5} />
                  </PickerSection>

                  <View style={styles.proposeInfoBox}>
                    <Ionicons name="information-circle-outline" size={15} color={Colors.primary} />
                    <Text style={styles.proposeInfoText}>
                      La séance {selVaccin?.nom} sera confirmée une fois {selVaccin?.doses_par_flacon ?? 'N'} participants réunis. Vous recevrez une notification.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.confirmBtn, confirming && { opacity: 0.55 }]}
                    onPress={handlePropose} disabled={confirming} activeOpacity={0.88}>
                    <LinearGradient colors={['#7C3AED', '#5B21B6']} style={styles.confirmGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                      {confirming
                        ? <ActivityIndicator color={Colors.white} size="small" />
                        : <>
                            <Ionicons name="add-circle-outline" size={20} color={Colors.white} />
                            <Text style={styles.confirmBtnText}>Proposer cette séance</Text>
                          </>
                      }
                    </LinearGradient>
                  </TouchableOpacity>
                </>
              )}

            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function MetaItem({ icon, value }) {
  return (
    <View style={styles.metaItem}>
      <Ionicons name={icon} size={12} color={Colors.textLight} />
      <Text style={styles.metaText}>{value}</Text>
    </View>
  );
}

function PickerSection({ label, icon, color, children }) {
  return (
    <View style={styles.pickerSection}>
      <View style={styles.pickerLabel}>
        <View style={[styles.pickerIconWrap, { backgroundColor: color + '18' }]}>
          <Ionicons name={icon} size={15} color={color} />
        </View>
        <Text style={styles.pickerLabelText}>{label}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header:        { paddingHorizontal: Spacing.xl, paddingBottom: Spacing.lg, position: 'relative', overflow: 'hidden' },
  decCircle:     { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: Colors.glass, top: -60, right: -40 },
  headerSub:     { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  headerTitle:   { fontSize: 30, fontWeight: '800', color: Colors.white, letterSpacing: -0.5, marginBottom: Spacing.lg },

  segmentBar:    { flexDirection: 'row', backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: Radii.xl, padding: 4 },
  segBtn:        { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: Radii.lg, gap: 5 },
  segBtnActive:  { backgroundColor: Colors.white },
  segLabel:      { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.70)' },
  segCount:      { minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  segCountText:  { fontSize: 10, fontWeight: '800' },

  list:          { padding: Spacing.lg, gap: Spacing.md },

  card:          { backgroundColor: Colors.surface, borderRadius: Radii['2xl'], flexDirection: 'row', overflow: 'hidden', ...Elevation.card },
  cardAccent:    { width: 5 },
  cardBody:      { flex: 1, padding: Spacing.base, gap: Spacing.sm },
  cardTop:       { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  iconWrap:      { width: 44, height: 44, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center' },
  vaccinNom:     { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 2 },
  enfantLabel:   { fontSize: 12, color: Colors.textSecondary },
  badge:         { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 7, paddingVertical: 4, borderRadius: Radii.pill },
  badgeText:     { fontSize: 10, fontWeight: '700' },

  cardMeta:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.md },
  metaItem:      { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText:      { fontSize: 12, color: Colors.textSecondary },

  cardActions:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Spacing.sm, borderTopWidth: 1, borderTopColor: Colors.border },
  detailBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  detailBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  cancelBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: Colors.danger },

  emptyWrap:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: Spacing['3xl'], paddingHorizontal: Spacing['2xl'] },
  emptyIcon:     { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.primaryTint, alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.lg },
  emptyTitle:    { fontSize: 18, fontWeight: '700', color: Colors.text, marginBottom: 8, textAlign: 'center' },
  emptyBody:     { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  fab:           { position: 'absolute', bottom: 28, right: 24, borderRadius: 32, overflow: 'hidden', ...Elevation.xl },
  fabGradient:   { width: 60, height: 60, alignItems: 'center', justifyContent: 'center' },

  // Modal
  modalOverlay:   { flex: 1, backgroundColor: Colors.overlay, justifyContent: 'flex-end' },
  modalSheet:     { backgroundColor: Colors.surface, borderTopLeftRadius: Radii['3xl'], borderTopRightRadius: Radii['3xl'], paddingHorizontal: Spacing.xl, paddingBottom: Spacing['3xl'], maxHeight: '92%' },
  modalHandle:    { width: 44, height: 5, borderRadius: 3, backgroundColor: Colors.border, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.sm },
  modalHeader:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.md, marginBottom: Spacing.sm },
  modalTitle:     { fontSize: 20, fontWeight: '800', color: Colors.text },
  modalCloseBtn:  { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  modalBackBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  noDataText:    { fontSize: 13, color: Colors.textSecondary, fontStyle: 'italic', paddingVertical: Spacing.sm },

  pickerSection:    { marginBottom: Spacing.lg },
  pickerLabel:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.md },
  pickerIconWrap:   { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pickerLabelText:  { fontSize: 14, fontWeight: '700', color: Colors.text },

  chipRow:       { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip:          { paddingHorizontal: Spacing.base, paddingVertical: 8, borderRadius: Radii.pill, backgroundColor: Colors.surfaceMuted, borderWidth: 1.5, borderColor: Colors.border },
  chipActive:    { backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  chipText:      { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  chipTextActive:{ color: Colors.primary, fontWeight: '700' },

  sessionList:     { gap: Spacing.sm },
  sessionRow:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, backgroundColor: Colors.surfaceMuted, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: 'transparent' },
  fillBarBg:       { height: 6, backgroundColor: Colors.border, borderRadius: 3, overflow: 'hidden' },
  fillBarFill:     { height: 6, borderRadius: 3 },
  fillLabel:       { fontSize: 11, fontWeight: '600' },
  noMatchWrap:     { alignItems: 'center', paddingVertical: Spacing['2xl'], gap: Spacing.md },
  noMatchTitle:    { fontSize: 16, fontWeight: '700', color: Colors.text, marginTop: Spacing.sm },
  noMatchSub:      { fontSize: 13, color: Colors.textSecondary, textAlign: 'center', lineHeight: 19 },
  sessionRowActive:{ backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  sessionVaccin:   { fontSize: 14, fontWeight: '700', color: Colors.text },
  sessionMeta:     { fontSize: 11, color: Colors.textLight },
  sessionPlaces:   { fontSize: 12, fontWeight: '700', color: Colors.success },
  sessionFull:     { fontSize: 11, fontWeight: '700', color: Colors.accent },
  formingBadge:    { backgroundColor: Colors.accentLight, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 1 },
  formingBadgeText:{ fontSize: 9, fontWeight: '700', color: Colors.accent },
  proposeLink:     { flexDirection: 'row', alignItems: 'center', gap: 5, paddingTop: Spacing.sm },
  proposeLinkText: { fontSize: 13, color: Colors.primary, fontWeight: '600' },
  modeTabs:        { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: Colors.border, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  modeTab:         { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: Spacing.sm },
  modeTabActive:   { borderBottomWidth: 2, borderBottomColor: Colors.primary },
  modeTabText:     { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  proposeError:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.dangerBg, borderRadius: Radii.md, padding: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  proposeErrorText:{ fontSize: 12, color: Colors.danger, fontWeight: '500', flex: 1 },
  proposeInput:    { backgroundColor: Colors.background, borderRadius: Radii.md, borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: Spacing.base, paddingVertical: 11, fontSize: 15, color: Colors.text },
  vaccinDoseHint:  { fontSize: 11, color: Colors.textSecondary, marginTop: 6, fontStyle: 'italic' },
  proposeInfoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 7, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm, marginHorizontal: Spacing.lg, marginBottom: Spacing.md },
  proposeInfoText: { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },

  centreStepNote:      { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: Colors.primaryTint, borderRadius: Radii.md, padding: Spacing.sm, marginBottom: Spacing.lg },
  centreStepNoteText:  { flex: 1, fontSize: 12, color: Colors.primary, lineHeight: 17 },
  centreModalList:     { gap: Spacing.sm, marginBottom: Spacing.md },
  centreModalRow:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, backgroundColor: Colors.surfaceMuted, borderRadius: Radii.lg, borderWidth: 1.5, borderColor: Colors.border },
  centreModalRowActive:{ backgroundColor: Colors.primaryTint, borderColor: Colors.primary },
  centreModalRadio:    { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  centreModalRadioActive:{ borderColor: Colors.primary },
  centreModalRadioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  centreModalName:     { fontSize: 14, fontWeight: '700', color: Colors.text },
  centreModalAddr:     { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  confirmBtn:     { marginTop: Spacing.lg, borderRadius: Radii.xl, overflow: 'hidden' },
  confirmGrad:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, paddingVertical: Spacing.lg },
  confirmBtnText: { fontSize: 16, fontWeight: '700', color: Colors.white },
});
