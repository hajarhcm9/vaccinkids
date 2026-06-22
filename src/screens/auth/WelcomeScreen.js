import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Animated, StatusBar, Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: W } = Dimensions.get('window');

// ── Brand palette (richer than the app defaults for the welcome screen) ────────
const BG_TOP    = '#020B2E';
const BG_MID    = '#061E6F';
const BG_BOT    = '#0A3BAD';
const GLOW      = 'rgba(99,130,255,0.18)';
const GLOW2     = 'rgba(99,130,255,0.10)';
const CIRCLE_A  = ['#4F7CFF', '#1E4FE8'];
const CIRCLE_B  = ['#6D9FFF', '#4060F0'];
const WHITE     = '#FFFFFF';
const WHITE70   = 'rgba(255,255,255,0.70)';
const WHITE40   = 'rgba(255,255,255,0.40)';
const WHITE15   = 'rgba(255,255,255,0.15)';
const WHITE08   = 'rgba(255,255,255,0.08)';

// ── Floating bubble ────────────────────────────────────────────────────────────
function Bubble({ icon, size = 36, style, iconSize = 18, delay = 0 }) {
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, { toValue: -8, duration: 1800 + delay, useNativeDriver: true, delay }),
        Animated.timing(floatAnim, { toValue:  0, duration: 1800 + delay, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View style={[s.bubble, { width: size, height: size, borderRadius: size / 2 }, style, { transform: [{ translateY: floatAnim }] }]}>
      <Ionicons name={icon} size={iconSize} color={WHITE} />
    </Animated.View>
  );
}

// ── Feature chip ──────────────────────────────────────────────────────────────
function Feature({ icon, label }) {
  return (
    <View style={s.featureChip}>
      <Ionicons name={icon} size={15} color="#7BA7FF" />
      <Text style={s.featureLabel}>{label}</Text>
    </View>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Animation refs
  const illus   = useRef(new Animated.Value(0)).current;
  const content = useRef(new Animated.Value(0)).current;
  const actions = useRef(new Animated.Value(0)).current;
  const illusY  = useRef(new Animated.Value(30)).current;
  const contentY= useRef(new Animated.Value(40)).current;
  const actionsY= useRef(new Animated.Value(40)).current;
  const pulse   = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Entrance sequence
    Animated.sequence([
      Animated.delay(100),
      Animated.parallel([
        Animated.timing(illus,    { toValue: 1, duration: 600, useNativeDriver: true }),
        Animated.timing(illusY,   { toValue: 0, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(content,  { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(contentY, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(actions,  { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(actionsY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start();

    // Pulse loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1.00, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" />

      {/* ── Gradient background ── */}
      <LinearGradient colors={[BG_TOP, BG_MID, BG_BOT]} style={StyleSheet.absoluteFillObject} />

      {/* ── Decorative blobs ── */}
      <View style={s.blob1} />
      <View style={s.blob2} />
      <View style={s.blob3} />

      {/* ── Illustration ── */}
      <Animated.View style={[s.illustrationWrap, { opacity: illus, transform: [{ translateY: illusY }] }]}>

        {/* Pulsing outer glow rings */}
        <Animated.View style={[s.glowRing, s.glowRing3, { transform: [{ scale: pulse }] }]} />
        <Animated.View style={[s.glowRing, s.glowRing2, { transform: [{ scale: pulse }] }]} />
        <View style={s.glowRing1} />

        {/* Central gradient circle */}
        <LinearGradient colors={CIRCLE_A} style={s.mainCircle}>
          <LinearGradient colors={CIRCLE_B} style={s.innerCircle}>
            {/* Shield icon */}
            <View style={s.shieldWrap}>
              <Ionicons name="shield-checkmark" size={52} color={WHITE} />
              {/* Heartbeat line overlay */}
              <View style={s.heartLine}>
                <View style={[s.hSeg, { width: 8 }]} />
                <View style={[s.hSeg, s.hUp,   { width: 6 }]} />
                <View style={[s.hSeg, s.hDown,  { width: 6 }]} />
                <View style={[s.hSeg, s.hUp,    { width: 4 }]} />
                <View style={[s.hSeg, { width: 8 }]} />
              </View>
            </View>
          </LinearGradient>
        </LinearGradient>

        {/* Floating bubbles */}
        <Bubble icon="calendar-outline"   size={44} iconSize={20} delay={0}   style={s.bubbleCalendar} />
        <Bubble icon="medkit-outline"     size={40} iconSize={18} delay={200} style={s.bubbleMedkit} />
        <Bubble icon="heart-outline"      size={36} iconSize={16} delay={400} style={s.bubbleHeart} />
        <Bubble icon="notifications-outline" size={34} iconSize={14} delay={100} style={s.bubbleNotif} />

        {/* Orbit dots */}
        <View style={[s.orbitDot, { top: 18, right: 56 }]} />
        <View style={[s.orbitDot, s.orbitDotSm, { bottom: 28, left: 48 }]} />
        <View style={[s.orbitDot, s.orbitDotLg, { top: 50, left: 20 }]} />
      </Animated.View>

      {/* ── Text content ── */}
      <Animated.View style={[s.textWrap, { opacity: content, transform: [{ translateY: contentY }] }]}>
        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoDot} />
          <Text style={s.logoText}>Vacci<Text style={s.logoAccent}>Kids</Text></Text>
          <View style={s.logoDot} />
        </View>
        <Text style={s.logoTag}>Maroc · Vaccination infantile</Text>

        {/* Tagline */}
        <Text style={s.tagline}>
          Suivez, planifiez et protégez{'\n'}la santé de vos enfants.
        </Text>

        {/* Feature row */}
        <View style={s.featureRow}>
          <Feature icon="shield-checkmark-outline" label="Protection" />
          <View style={s.featureSep} />
          <Feature icon="calendar-outline"         label="Rappels" />
          <View style={s.featureSep} />
          <Feature icon="stats-chart-outline"      label="Suivi complet" />
        </View>
      </Animated.View>

      {/* ── Actions ── */}
      <Animated.View style={[s.actionsWrap, { opacity: actions, transform: [{ translateY: actionsY }], paddingBottom: insets.bottom + 24 }]}>

        {/* Primary CTA */}
        <TouchableOpacity
          style={s.btnPrimary}
          activeOpacity={0.9}
          onPress={() => navigation.navigate('Register')}
        >
          <LinearGradient colors={['#5B8FFF', '#2256E8']} style={s.btnPrimaryGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
            <Ionicons name="person-add-outline" size={19} color={WHITE} />
            <Text style={s.btnPrimaryText}>Créer un compte</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Secondary CTA */}
        <TouchableOpacity
          style={s.btnSecondary}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={s.btnSecondaryText}>Se connecter</Text>
        </TouchableOpacity>

        {/* Divider */}
        <View style={s.dividerRow}>
          <View style={s.dividerLine} />
          <Text style={s.dividerText}>ou</Text>
          <View style={s.dividerLine} />
        </View>

        {/* Guest link */}
        <TouchableOpacity
          style={s.guestLink}
          activeOpacity={0.75}
          onPress={() => navigation.navigate('GuestRdv')}
        >
          <Ionicons name="calendar-outline" size={16} color={WHITE70} />
          <Text style={s.guestLinkText}>Prendre un RDV sans compte</Text>
          <Ionicons name="arrow-forward" size={14} color={WHITE40} />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const MAIN_CIRCLE = 130;
const INNER_CIRCLE = 100;

const s = StyleSheet.create({
  root: { flex: 1 },

  // Blobs
  blob1: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(59,100,255,0.18)', top: -120, right: -100 },
  blob2: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(59,100,255,0.12)', bottom: 80,  left: -80 },
  blob3: { position: 'absolute', width: 140, height: 140, borderRadius: 70,  backgroundColor: 'rgba(99,130,255,0.08)', top: '40%',  right: -40 },

  // Illustration
  illustrationWrap: { alignItems: 'center', justifyContent: 'center', marginTop: 80, marginBottom: 10, height: 280 },

  glowRing:  { position: 'absolute', borderRadius: 1000 },
  glowRing3: { width: 280, height: 280, backgroundColor: GLOW2 },
  glowRing2: { width: 220, height: 220, backgroundColor: GLOW },
  glowRing1: { position: 'absolute', width: 165, height: 165, borderRadius: 83, backgroundColor: 'rgba(99,130,255,0.28)' },

  mainCircle:  { width: MAIN_CIRCLE, height: MAIN_CIRCLE, borderRadius: MAIN_CIRCLE / 2, alignItems: 'center', justifyContent: 'center', elevation: 20, shadowColor: '#3B64FF', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.6, shadowRadius: 20 },
  innerCircle: { width: INNER_CIRCLE, height: INNER_CIRCLE, borderRadius: INNER_CIRCLE / 2, alignItems: 'center', justifyContent: 'center' },

  shieldWrap: { alignItems: 'center', justifyContent: 'center' },
  heartLine:  { flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: -2 },
  hSeg:       { height: 2, backgroundColor: 'rgba(255,255,255,0.55)', marginHorizontal: 1 },
  hUp:        { height: 8, width: 2, marginHorizontal: 1, backgroundColor: 'rgba(255,255,255,0.55)' },
  hDown:      { height: 12, width: 2, marginHorizontal: 1, backgroundColor: 'rgba(255,255,255,0.55)' },

  // Bubbles
  bubble:          { position: 'absolute', backgroundColor: WHITE15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  bubbleCalendar:  { top: 10,  left:  W / 2 - 175 },
  bubbleMedkit:    { top: 30,  right: W / 2 - 175 },
  bubbleHeart:     { bottom: 40, left: W / 2 - 155 },
  bubbleNotif:     { bottom: 20, right: W / 2 - 165 },

  // Orbit dots
  orbitDot:   { position: 'absolute', width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.40)' },
  orbitDotSm: { width: 5, height: 5, borderRadius: 3 },
  orbitDotLg: { width: 11, height: 11, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.25)' },

  // Text
  textWrap: { alignItems: 'center', paddingHorizontal: 32, gap: 14 },

  logoRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoDot:   { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.35)' },
  logoText:  { fontSize: 36, fontWeight: '900', color: WHITE, letterSpacing: -0.5 },
  logoAccent:{ color: '#7BAAFF' },
  logoTag:   { fontSize: 11, fontWeight: '700', color: WHITE40, textTransform: 'uppercase', letterSpacing: 2.5, marginTop: -8 },

  tagline: { fontSize: 17, color: WHITE70, textAlign: 'center', lineHeight: 26, fontWeight: '500' },

  featureRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: WHITE08, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', width: '100%', justifyContent: 'center', gap: 0, marginTop: 4 },
  featureChip:{ flex: 1, flexDirection: 'column', alignItems: 'center', gap: 5 },
  featureLabel:{ fontSize: 11, fontWeight: '700', color: WHITE70, textAlign: 'center' },
  featureSep: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Actions
  actionsWrap:  { paddingHorizontal: 28, gap: 12, marginTop: 'auto' },

  btnPrimary:     { borderRadius: 18, overflow: 'hidden', elevation: 8, shadowColor: '#2256E8', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.5, shadowRadius: 14 },
  btnPrimaryGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 17 },
  btnPrimaryText: { fontSize: 17, fontWeight: '800', color: WHITE, letterSpacing: 0.2 },

  btnSecondary:     { borderRadius: 18, borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.30)', paddingVertical: 15, alignItems: 'center', backgroundColor: WHITE08 },
  btnSecondaryText: { fontSize: 16, fontWeight: '700', color: WHITE, letterSpacing: 0.1 },

  dividerRow:  { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.12)' },
  dividerText: { fontSize: 12, color: WHITE40, fontWeight: '600' },

  guestLink:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  guestLinkText: { fontSize: 14, color: WHITE70, fontWeight: '600' },
});
