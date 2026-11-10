import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { MapPin, ChevronDown, Bell, Zap, Calendar } from 'lucide-react-native';
import { useUserLocation } from '../../hooks/useUserLocation';

interface HomeHeroSectionProps {
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  onInstantBookPress?: () => void;
  onSchedulePress?: () => void;
}

export function HomeHeroSection({
  onLocationPress,
  onNotificationPress,
  onInstantBookPress,
  onSchedulePress,
}: HomeHeroSectionProps) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const { address } = useUserLocation();
  const [activeActionDot, setActiveActionDot] = useState(0);

  const areaTitle = address?.area || address?.city || 'Sector 55';
  const fullAddress =
    address?.formattedAddress ||
    (address?.area && address?.city
      ? `${address.area}, ${address.city}${address.pincode ? ` - ${address.pincode}` : ''}`
      : 'Sector 55, Gurugram, Haryana, India');

  const handleLocation = () => {
    if (onLocationPress) onLocationPress();
    else router.push('/location/select');
  };

  const handleNotification = () => {
    if (onNotificationPress) onNotificationPress();
    else router.push('/(tabs)/notifications');
  };

  const handleInstant = () => {
    setActiveActionDot(0);
    if (onInstantBookPress) onInstantBookPress();
    else router.push({ pathname: '/booking/date-time', params: { bookingType: 'INSTANT' } });
  };

  const handleSchedule = () => {
    setActiveActionDot(1);
    if (onSchedulePress) onSchedulePress();
    else router.push({ pathname: '/booking/date-time', params: { bookingType: 'SCHEDULED' } });
  };

  // Card width = half screen minus horizontal padding and gap
  const cardWidth = Math.floor((screenWidth - 32 - 10) / 2);

  return (
    <LinearGradient
      colors={['#0047DD', '#0062F5', '#1877F2']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, { paddingTop: Math.max(insets.top, 20) + 6 }]}
    >
      {/* ── 1. TOP BAR: Location + Earn + Bell ── */}
      <View style={styles.topBar}>
        {/* Location */}
        <Pressable
          style={styles.locationRow}
          onPress={handleLocation}
          accessibilityRole="button"
          accessibilityLabel={`Selected location: ${areaTitle}`}
        >
          <MapPin size={20} color="#FFFFFF" fill="#FFFFFF" />
          <View style={styles.locationTextCol}>
            <View style={styles.locationTitleRow}>
              <Text style={styles.locationTitle} numberOfLines={1}>
                {areaTitle}
              </Text>
              <ChevronDown size={15} color="#FFFFFF" style={{ marginLeft: 2 }} />
            </View>
            <Text style={styles.locationSub} numberOfLines={1}>
              {fullAddress}
            </Text>
          </View>
        </Pressable>

        {/* Right: Earn ₹200 + Bell */}
        <View style={styles.rightActions}>
          {/* Earn ₹200 pill */}
          <Pressable
            style={styles.earnPill}
            onPress={() => router.push('/profile/wallet')}
            accessibilityRole="button"
            accessibilityLabel="Earn ₹200"
          >
            {/* Gold coin stack */}
            <View style={styles.coinStack}>
              <View style={styles.coinB} />
              <View style={styles.coinF}>
                <Text style={styles.coinText}>₹</Text>
              </View>
            </View>
            <View>
              <Text style={styles.earnLabel}>Earn</Text>
              <Text style={styles.earnAmount}>₹200</Text>
            </View>
          </Pressable>

          {/* Bell */}
          <Pressable
            style={styles.bellBtn}
            onPress={handleNotification}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Bell size={20} color="#FFFFFF" strokeWidth={2.2} />
            <View style={styles.bellBadge}>
              <Text style={styles.bellBadgeText}>1</Text>
            </View>
          </Pressable>
        </View>
      </View>

      {/* ── 2. HERO CONTENT: Headline + Cleaner Image ── */}
      <View style={styles.heroRow}>
        {/* Left: Brand + Headline */}
        <View style={styles.heroLeft}>
          {/* HomeEase brand row */}
          <View style={styles.brandRow}>
            <Ionicons name="home" size={15} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.brandName}>HomeEase</Text>
          </View>

          {/* Headline: "One professional, 16+ home cleaning services" */}
          <View style={styles.headlineBlock}>
            <Text style={styles.headlineLine}>One professional,</Text>
            <Text style={styles.headlineLine}>
              <Text style={styles.highlight}>16+</Text>
              <Text style={styles.headlineLine}> home cleaning</Text>
            </Text>
            <Text style={styles.headlineLine}>services</Text>
            {/* Golden swoosh underline */}
            <View style={styles.swoosh} />
          </View>
        </View>

        {/* Right: Cleaner woman illustration */}
        <View style={styles.heroImageWrap}>
          <Image
            source={require('../../../assets/images/hero_cleaner.png')}
            style={styles.heroImage}
            contentFit="contain"
            transition={200}
          />
        </View>
      </View>

      {/* ── 3. QUICK ACTION CARDS ── */}
      <View style={styles.cardsRow}>
        {/* Left: Book Instant Service */}
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { width: cardWidth },
            pressed && styles.cardPressed,
          ]}
          onPress={handleInstant}
          accessibilityRole="button"
          accessibilityLabel="Book Instant Service in 10 minutes"
        >
          {/* Left text column */}
          <View style={styles.cardLeftCol}>
            <Zap size={26} color="#0052FF" strokeWidth={2.3} />
            <Text style={styles.cardTitle}>{'Book Instant\nService'}</Text>
            <View style={styles.instantPill}>
              <Text style={styles.pillEmoji}>⚡</Text>
              <Text style={styles.pillText}>10 mins</Text>
            </View>
          </View>

          {/* Right: Stopwatch graphic */}
          <View style={styles.stopwatchWrap}>
            {/* Plunger top */}
            <View style={styles.plunger} />
            {/* Circle dial */}
            <View style={styles.watchCircle}>
              <Text style={styles.watchNum}>10</Text>
              <Text style={styles.watchSub}>mins</Text>
            </View>
            {/* Tick marks */}
            <View style={[styles.tick, { top: 4, left: '50%', marginLeft: -1 }]} />
            <View style={[styles.tick, { bottom: 4, left: '50%', marginLeft: -1 }]} />
          </View>
        </Pressable>

        {/* Right: Schedule for Later */}
        <Pressable
          style={({ pressed }) => [
            styles.card,
            { width: cardWidth },
            pressed && styles.cardPressed,
          ]}
          onPress={handleSchedule}
          accessibilityRole="button"
          accessibilityLabel="Schedule for Later"
        >
          {/* Left text column */}
          <View style={styles.cardLeftCol}>
            <Calendar size={26} color="#0052FF" strokeWidth={2.3} />
            <Text style={styles.cardTitle}>{'Schedule for\nLater'}</Text>
            <View style={styles.schedulePill}>
              <Text style={styles.schedulePillText}>Today, 2 pm</Text>
            </View>
          </View>

          {/* Right: Calendar + Clock graphic */}
          <View style={styles.calWrap}>
            {/* Calendar card */}
            <View style={styles.calCard}>
              <View style={styles.calHeader} />
              <View style={styles.calBody}>
                <View style={styles.calDotRow}>
                  <View style={styles.calDot} />
                  <View style={styles.calDot} />
                  <View style={styles.calDot} />
                </View>
                <View style={styles.calDotRow}>
                  <View style={styles.calDot} />
                  <View style={[styles.calDot, styles.calDotHighlight]} />
                  <View style={styles.calDot} />
                </View>
              </View>
            </View>
            {/* Clock overlay */}
            <View style={styles.clockBadge}>
              <Ionicons name="time" size={16} color="#0052FF" />
            </View>
          </View>
        </Pressable>
      </View>

      {/* ── 4. PAGINATION DOTS ── */}
      <View style={styles.dotsRow}>
        <View style={[styles.dot, activeActionDot === 0 && styles.dotActive]} />
        <View style={[styles.dot, activeActionDot === 1 && styles.dotActive]} />
        <View style={[styles.dot, activeActionDot === 2 && styles.dotActive]} />
      </View>
    </LinearGradient>
  );
}

const CARD_H = 108;

const styles = StyleSheet.create({
  container: {
    paddingBottom: 16,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },

  /* ── TOP BAR ── */
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
    gap: 5,
  },
  locationTextCol: { flex: 1 },
  locationTitleRow: { flexDirection: 'row', alignItems: 'center' },
  locationTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  locationSub: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '500',
    marginTop: 1,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  earnPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  coinStack: {
    width: 22,
    height: 20,
    position: 'relative',
  },
  coinB: {
    position: 'absolute',
    left: 0,
    top: 4,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F59E0B',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  coinF: {
    position: 'absolute',
    left: 7,
    top: 0,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    backgroundColor: '#FBBF24',
    borderWidth: 1,
    borderColor: '#FEF9C3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  coinText: { fontSize: 8, fontWeight: '900', color: '#92400E' },
  earnLabel: { fontSize: 9, fontWeight: '600', color: '#FFFFFF', lineHeight: 10 },
  earnAmount: { fontSize: 12, fontWeight: '800', color: '#FFFFFF', lineHeight: 14 },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.20)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellBadge: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 13,
    height: 13,
    borderRadius: 6.5,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.2,
    borderColor: '#0047DD',
  },
  bellBadgeText: { fontSize: 7.5, fontWeight: '900', color: '#FFFFFF' },

  /* ── HERO CONTENT ── */
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 10,
    minHeight: 148,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 8,
    zIndex: 2,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.1,
  },
  headlineBlock: {
    position: 'relative',
  },
  headlineLine: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 28,
    letterSpacing: -0.4,
  },
  highlight: {
    color: '#FACC15',
    fontWeight: '900',
    fontSize: 22,
  },
  swoosh: {
    marginTop: 5,
    width: 76,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FACC15',
  },
  heroImageWrap: {
    position: 'absolute',
    right: 0,
    top: -16,
    width: 170,
    height: 160,
    zIndex: 1,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },

  /* ── ACTION CARDS ── */
  cardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 10,
    marginTop: 4,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: CARD_H,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.10,
    shadowRadius: 6,
  },
  cardPressed: {
    opacity: 0.93,
    transform: [{ scale: 0.98 }],
  },
  cardLeftCol: {
    flex: 1,
    justifyContent: 'space-between',
    height: '100%',
    paddingRight: 6,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 17,
    letterSpacing: -0.2,
    marginTop: 4,
  },
  instantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    gap: 3,
    marginTop: 'auto',
  },
  pillEmoji: { fontSize: 10 },
  pillText: { fontSize: 10.5, fontWeight: '800', color: '#0052FF' },
  schedulePill: {
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 3,
    alignSelf: 'flex-start',
    marginTop: 'auto',
  },
  schedulePillText: { fontSize: 10.5, fontWeight: '800', color: '#0052FF' },

  /* Stopwatch graphic */
  stopwatchWrap: {
    width: 50,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  plunger: {
    position: 'absolute',
    top: 2,
    width: 10,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#0052FF',
    zIndex: 2,
  },
  watchCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EFF6FF',
    borderWidth: 3,
    borderColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  watchNum: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 15,
  },
  watchSub: {
    fontSize: 8,
    fontWeight: '700',
    color: '#0052FF',
    lineHeight: 9,
  },
  tick: {
    position: 'absolute',
    width: 2,
    height: 5,
    backgroundColor: '#0052FF',
    borderRadius: 1,
  },

  /* Calendar graphic */
  calWrap: {
    width: 50,
    height: 54,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calCard: {
    width: 42,
    height: 40,
    borderRadius: 7,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0052FF',
    overflow: 'hidden',
  },
  calHeader: {
    height: 9,
    backgroundColor: '#0052FF',
    width: '100%',
  },
  calBody: {
    flex: 1,
    paddingHorizontal: 4,
    paddingTop: 3,
    gap: 3,
  },
  calDotRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  calDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#CBD5E1',
  },
  calDotHighlight: {
    backgroundColor: '#0052FF',
  },
  clockBadge: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#0052FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },

  /* ── PAGINATION DOTS ── */
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.40)',
  },
  dotActive: {
    width: 18,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
});
